/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource, displayResource, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render, renderGroupedObjects, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton, ResetButtonOptions } from "../common";
import { computed, ref, unref } from "vue";
import Decimal, { format } from "util/bignum";
import { noPersist } from "game/persistence";
import { createAdditiveModifier, createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import dustTab from './mercury/dust';
import chunksTab from './mercury/chunks';
import { Conversion, createCumulativeConversion, createIndependentConversion } from "features/conversion";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import milestones from './mercury/milestones';
import accelerators from './mercury/accelerators';
import { ClickableOptions, createClickable } from "features/clickables/clickable";
import { createRepeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import { processGetter } from "util/computed";
import { JSX } from "vue/jsx-runtime";
import Toggle from "components/fields/Toggle.vue";

/*
Pressure -> Molten Lava | Eruption
Eruption -> Magma

Molten Lava is spent on buyables and some upgrades

Pressure when capped creates an eruption

Magma is spent on big upgrades.

Magma is capped by default, but can be spent to increase its capacity.
Once a certain amount is reached, the planet is sucked into the sun.


-----

Eruption converts % of Lava into Magma?



-----


Pressure builds up over time.
Can be sped up via buyables/upgrades.

When Pressure is capped -> eruption?
What does an eruption provide?

Pressure can be converted into Lava.

Lava turns into Magma, also over time.
can be sped up via buyables/upgrades.

Magma is capped, but can be increased.
Magma also contributes to the planet's mass.
Once a certain mass is reached, the planet is destroyed.


*/

const id = "V";
const layer = createLayer(id, baseLayer => {
  const name = "Venus";
  const color = "#f8e2b0";

  //   const unlocked = noPersist(false);

  const planetMass = createResource<DecimalSource>(Decimal.fromNumber(2e256), "Planet Mass");

  const pressure = createResource<DecimalSource>(0, "Pressure");
  const pressureTimer = createResource<DecimalSource>(0);
  const pressureTimerMax = computed(() => Decimal.div(15, pressureIntervalBuyableEffect.value));
  const pressureChance = computed(() =>
    Decimal.add(10, pressureChanceBuyableEffect.apply(0))
  );
  const pressureGainMultiplier = computed(() => Decimal.times(1.3, pressureMultBuyableEffect.value));
  const eruptions = createResource<DecimalSource>(0);
  const pressureMax = computed(() => Decimal.fromNumber(1e25).pow(Decimal.add(eruptions.value, 1)));
  const pressureCapped = computed(() => Decimal.eq(pressure.value, pressureMax.value));

  const magma = createResource<DecimalSource>(0, "Magma");
  const magmaMax = computed(() => Decimal.fromNumber(1e10));

  const lava = createResource<DecimalSource>(0, "Lava");
  const lavaTempMax = createResource<DecimalSource>(0);
  const lavaConversionAmount = computed(() => 0.1);
  const lavaConversionRateSeconds = computed(() => 15);

  const ash = createResource<DecimalSource>(0, "Volcanic Ash");
  const ashTotal = trackTotal(ash);

  const pressureBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => Decimal.div(Decimal.ln(pressure.value), Decimal.ln(pressureMax.value))
  }));

  const pressureTimerBar = createBar(() => ({
    direction: Direction.Right,
    height: 24,
    width: 128,
    progress: () => Decimal.div(pressureTimer.value, pressureTimerMax.value),
    display: () => format(Decimal.sub(pressureTimerMax.value, pressureTimer.value)),
    textStyle: {
      color: '#ad8d54'
    }
  }))

  const magmaBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => Decimal.div(Decimal.ln(magma.value), Decimal.ln(magmaMax.value))
  }));

  const lavaBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => {
      if (Decimal.gt(lavaTempMax.value, 1e10)) {
        return Decimal.div(Decimal.ln(lava.value), Decimal.ln(lavaTempMax.value))
      }

      return Decimal.div(lava.value, lavaTempMax.value);
    }
  }));

  baseLayer.on("update", diff => {
    pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

    if (pressureTimer.value.gte(pressureTimerMax.value)) {
      pressureTimer.value = 0;

      const value = Math.random() * 100;
      // console.log({ value: value, chance: pressureChance.value })
      if (Decimal.gte(pressureChance.value, value)) {
        pressure.value = Decimal.multiply(Decimal.clampMin(pressure.value, 1), pressureGainMultiplier.value).clampMax(pressureMax.value);
      }
    }

    if (lavaConversionEnabled.value) {
      const magmaAmount = Decimal.div(lavaConversionAmount.value, lavaConversionRateSeconds.value).times(diff);
      magma.value = Decimal.min(Decimal.add(magma.value, magmaAmount), magmaMax.value);
      lava.value = Decimal.max(Decimal.sub(lava.value, magmaAmount), Decimal.dZero);
    }
  });

  const pressureChanceBuyableEffect = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: () => Decimal.gt(pressureBuyables.pressureChance.amount.value, 0),
      addend: () => Decimal.div(pressureBuyables.pressureChance.amount.value, 2)
    }))
  ]);

  const pressureIntervalBuyableEffect = computed(() => {
    if (Decimal.lt(pressureBuyables.pressureInterval.amount.value, 1)) {
      return Decimal.dOne;
    }

    return Decimal.add(1, Decimal.times(0.075, pressureBuyables.pressureInterval.amount.value));
  });

  const pressureMultBuyableEffect = computed(() => {
    if (Decimal.lt(pressureBuyables.pressureMult.amount.value, 1)) {
      return Decimal.dOne;
    }

    return Decimal.times(0.1, pressureBuyables.pressureMult.amount.value).add(1);
  });

  const pressureBuyables = {
    pressureChance: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureChance.amount).pow_base(1.4).times(3)
      })),
      display: {
        title: "What're the odds?",
        description: "Increase the chance for pressure to build",
        effectDisplay: (): string => `+${format(pressureChanceBuyableEffect.apply(0))}%`
      }
    })),

    pressureMult: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureMult.amount).pow_base(1.6).times(5)
      })),
      display: {
        title: "UNDER PRESSURE",
        description: "Multiply the amount Pressure builds",
        effectDisplay: (): string => `x${format(pressureMultBuyableEffect.value)}`
      }
    })),

    pressureInterval: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureInterval.amount).pow_base(1.9).times(8)
      })),
      display: {
        title: "Anxiety Inducing",
        description: "Divide the pressure interval",
        effectDisplay: (): string => `÷${format(pressureIntervalBuyableEffect.value)}`
      }
    })),
  };

  const evenFlowEffect = computed(() => {
    if (Decimal.gt(lavaBuyables.evenFlow.amount.value, 0)) {
      return Decimal.times(0.1, lavaBuyables.evenFlow.amount.value).add(1);
    }

    return Decimal.dOne;
  });

  const lavaBuyables = {
    evenFlow: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(magma),
        cost: Formula.variable(lavaBuyables.evenFlow.amount).pow_base(1.5).times(5)
      })),
      display: {
        title: "Even Flow",
        description: "Multiply Lava gain from Pressure.",
        effectDisplay: (): string => `x${format(evenFlowEffect.value)}`
      }
    }))
  };

  const lavaConversion = createCumulativeConversion(() => ({
    formula: x => x.log2().times(evenFlowEffect),
    baseResource: pressure,
    gainResource: lava,
    onConvert: () => {
      pressure.value = 1;
      lavaTempMax.value = lava.value;
    },
  }));

  const ashConversion = createIndependentConversion(() => ({
    gainResource: ash,
    baseResource: pressure,
    formula: x => Formula.variable(Decimal.dZero).if(() => pressureCapped.value, () => Formula.variable(Decimal.dOne)),
    convert: () => ash.value = Decimal.add(ash.value, 1)
  }))

  const convertPressureButton = createClickable(() => ({
    classes: {
      "fit-content": true
    },
    display: ((): JSX.Element => {
      const gainDisplay = (conversion: Conversion) => (<><b>
        {displayResource(conversion.gainResource, Decimal.max(unref(conversion.actualGain), 1))}
      </b>{" "}
        {conversion.gainResource.displayName}</>)

      if (!pressureCapped.value) {
        return (
          <span>
            Reset Pressure for {gainDisplay(lavaConversion)}
          </span>
        );
      }

      return <>
        <span>
          <h3>Eruption!</h3>
          <br />
          Reset Pressure for:<br />
          {gainDisplay(lavaConversion)}<br />
          {gainDisplay(ashConversion)}<br />
          Raise your pressure cap by ^2.
        </span>
      </>
    }),
    onClick: () => {
      if (convertPressureButton.canClick === false) {
        return;
      }

      const eruptionReset = pressureCapped.value;

      lavaConversion.convert();
      if (eruptionReset) {
        ashConversion.convert();
        eruptions.value = Decimal.add(eruptions.value, 1);
      }
    },
    canClick: computed(() => Decimal.gte(unref(lavaConversion.actualGain), 1))
  }));

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer, pressureBuyables]
  }));

  const treeNode = createLayerTreeNode(() => ({
    visibility: true,
    layerID: id,
    color,
    reset
  }));


  const tabs = createTabFamily({
    pressure: () => ({
      display: "Pressure",
      tab: createTab(() => ({
        display: () => (<>
          <h4>Pressure</h4>
          <h4>{format(pressure.value)}/{format(pressureMax.value)}</h4>
          <Spacer height="8px" />

          {render(pressureBar)}
          <Spacer />

          <h6>{format(pressureChance.value)}% chance for pressure to build by x{format(pressureGainMultiplier.value)} every {format(pressureTimerMax.value)} seconds.</h6>
          <Spacer />

          {render(pressureTimerBar)}
          <Spacer />

          {render(convertPressureButton)}
          <Spacer />
          <Spacer />

          <h4>{format(lava.value)} Lava</h4>
          <Spacer/>

          {renderGroupedObjects(Object.values(pressureBuyables), 3)}
        </>)
      }))
    }),
    lava: () => ({
      display: "Lava",
      tab: createTab(() => ({
        display: () => (<>
          {renderRow(
            <>
              <div>
                <h2>{format(lava.value)} Lava</h2>
                {render(lavaBar)}
              </div>
            </>,
            <Spacer width="20px" />,
            <div>-&gt;</div>,
            <Spacer width="20px" />,
            <>
              <div>
                <h2>{format(magma.value)} Magma</h2>
                {render(magmaBar)}
              </div>
            </>
          )}
          <Spacer />

          <h6>1 Lava will convert into {format(lavaConversionAmount.value)} Magma every {format(lavaConversionRateSeconds.value)} seconds.</h6>
          <Spacer />

          <div style="display: flex; justify-content: center;">
            <Toggle
              onUpdate:modelValue={value => (lavaConversionEnabled.value = value)}
              modelValue={lavaConversionEnabled.value}
              title={"Toggle Lava Conversion"}
            />
          </div>
        </>)
      }))
    }),
  });

  const lavaConversionEnabled = ref(false);

  return {
    name,
    color,
    magma,
    lava,
    lavaTempMax,
    planetMass,
    pressure,
    pressureTimer,
    treeNode,
    pressureBuyables,
    ash,
    ashTotal,
    eruptions,
    tabs,
    lavaBuyables,
    display: () => <>
      <h2>{displayResource(planetMass)} Planet Mass</h2>
      <h4>0% Until ?? Mass</h4>
      <Spacer />

      {
        Decimal.gt(ashTotal.value, 0) ? <><h2>{displayResource(ash)} Ash</h2></> : null
      }

      {render(tabs)}

      <Spacer />
    </>,
  };
});

export default layer;
