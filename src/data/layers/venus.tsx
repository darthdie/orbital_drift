/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource, displayResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render, renderGroupedObjects, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton, ResetButtonOptions } from "../common";
import { computed, unref } from "vue";
import Decimal, { format } from "util/bignum";
import { noPersist } from "game/persistence";
import { createAdditiveModifier, createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import dustTab from './mercury/dust';
import chunksTab from './mercury/chunks';
import { Conversion, createCumulativeConversion } from "features/conversion";
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
  const pressureTimerMax = computed(() => 15);
  const pressureChance = computed(() =>
    Decimal.add(10, pressureChanceBuyableEffect.apply(0))
  );
  const pressureGainMultiplier = computed(() =>
    Decimal.times(1.3, pressureMultBuyableEffect.value)
  );
  const pressureMax = computed(() =>
    Decimal.fromNumber(1e25).div(pressureIntervalBuyableEffect.value)
  )

  const magma = createResource<DecimalSource>(0, "Magma");

  const lava = createResource<DecimalSource>(0, "Lava");

  //   return Decimal.sub(
  //   1,
  //   Decimal.div(Decimal.ln(collisionTimeGainComputed.value), Decimal.ln(maxCollisionTime))
  // )

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
    progress: () => 0
  }));

  const lavaBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => 0
  }));

  baseLayer.on("update", diff => {
    pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

    if (pressureTimer.value.gte(pressureTimerMax.value)) {
      pressureTimer.value = 0;

      const value = Math.random() * 100;
      console.log({ value: value, chance: pressureChance.value })
      if (Decimal.gte(pressureChance.value, value)) {
        pressure.value = Decimal.multiply(Decimal.clampMin(pressure.value, 1), pressureGainMultiplier.value).clampMax(1.79e308);
      }
    }
  });

  const pressureChanceBuyableEffect = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: () => Decimal.gt(pressureBuyables.pressureChance.amount.value, 0),
      addend: () => Decimal.div(pressureBuyables.pressureChance.amount.value, 2)
    }))
  ]);

  // const pressureIntervalBuyableEffect =createSequentialModifier(() => [
  //   createAdditiveModifier(() => ({
  //     enabled: () => Decimal.gt(pressureBuyables.pressureInterval.amount.value, 0),
  //     // 1 - (.01 * X)
  //     addend: () => Decimal.sub(1, Decimal.times(.01, pressureBuyables.pressureInterval.amount.value))
  //   }))
  // ]);

  // effect(x) { return getBuyableAmount(this.layer, this.id).mul(0.075).add(1) },

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
        cost: Formula.variable(pressureBuyables.pressureChance.amount.value).pow_base(1.4).times(3)
      })),
      display: {
        title: "What're the odds?",
        description: "Increase the chance for pressure to build",
        effectDisplay: (): string => `+${pressureChanceBuyableEffect.apply(0)}%`
      }
    })),

    pressureMult: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureMult.amount.value).pow_base(1.6).times(5)
      })),
      display: {
        title: "UNDER PRESSURE",
        description: "Multiply the amount Pressure builds",
        effectDisplay: (): string => `x${pressureMultBuyableEffect.value}`
      }
    })),

    pressureInterval: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureInterval.amount.value).pow_base(1.9).times(8)
      })),
      display: {
        title: "Anxiety Inducing",
        description: "Divide the pressure interval",
        effectDisplay: (): string => `÷${pressureIntervalBuyableEffect.value}`
      }
    })),
  };

  const conversion = createCumulativeConversion(() => ({
    formula: x => x.log2(),
    baseResource: pressure,
    gainResource: lava,
    onConvert: () => pressure.value = 1,
    // currentGain: computed((): Decimal => {
    //   return Decimal.fromValue(conversion.formula.evaluate(pressure.value));
    // })
  }));

  const convertPressureButton = createClickable(() => ({
    display: ((): JSX.Element => (
      <span>
        Reset Pressure for{" "}
        <b>
          {displayResource(
            conversion.gainResource,
            Decimal.max(unref(conversion.actualGain), 1)
          )}
        </b>{" "}
        {conversion.gainResource.displayName}
      </span>
    )),
    onClick: () => {
      if (convertPressureButton.canClick === false) {
        return;
      }
      conversion.convert();
    },
    canClick: computed(() => Decimal.gte(unref(conversion.actualGain), 1))
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

  //   const tabs = createTabFamily({
  //     dust: () => ({
  //       display: "Dust",
  //       tab: createTab(() => ({
  //         display: dustTab.display
  //       }))
  //     }),
  //     chunks: () => ({
  //       visibility: dustTab.unlocks.chunks.bought,
  //       display: () => (<>Chunks {chunksTab.showExclamation.value ? "!" : null}</>),
  //       tab: createTab(() => ({
  //         display: chunksTab.display
  //       }))
  //     }),
  //     accelerators: () => ({
  //       visibility: dustTab.unlocks.accelerators.bought,
  //       display: () => (<>Accelerators {accelerators.showExclamation.value ? "!" : null }</>),
  //       tab: createTab(() => ({ display: accelerators.display }))
  //     }),
  //     milestones: () => {
  //       return {
  //         visibility: dustTab.unlocks.chunks.bought,
  //         display: "Milestones",
  //         tab: createTab(() => ({
  //           display: milestones.display
  //         }))
  //       };
  //     }
  //   })

  //   const regularDisplay = computed(() => (<>
  //     {Decimal.lt(collisionTime.value, 86400) ? (
  //       <h2>{format(Decimal.div(collisionTime.value, 3600))} hours until collision</h2>
  //     ) : (
  //       <h2>{format(Decimal.div(collisionTime.value, 86400))} days until collision</h2>
  //     )}

  //     <h4>-{format(collisionTimeGainComputed.value)}/s</h4>
  //     {render(collisionTimeProgressBar)}
  //     <Spacer />
  //     {render(tabs)}
  //   </>));

  //   const solarResetButton = createClickable(() => ({
  //     display: {
  //       title: "Mercury has collided with the Sun.",
  //       description: "Reset for 1 Solar Energy."
  //     },
  //     onClick: () => {
  //       solarLayer.energy.value = Decimal.add(solarLayer.energy.value, 1);
  //       accelerators.fullReset();
  //       milestones.fullReset();
  //       chunksTab.fullReset();
  //       dustTab.fullReset();
  //       reset.reset();
  //       collisionTime.value = maxCollisionTime;
  //     }
  //   }));

  //   const collidedDisplay = computed(() => (<>
  //     <div style="height: 100%; display: flex;">
  //       {render(solarResetButton)}
  //     </div>
  //   </>));

  //   const renderDisplay = () => {
  //     return hasCollidedComputed.value ? collidedDisplay.value : regularDisplay.value;
  //   };

  return {
    name,
    color,
    magma,
    lava,
    planetMass,
    pressure,
    pressureTimer,
    treeNode,
    pressureBuyables,
    // collisionTime,
    // maxCollisionTime,
    // tabs,
    // collisionTimeGainComputed,
    display: () => <>
      <h1>{displayResource(planetMass)} Planet Mass</h1>
      <h4>0% Until ?? Mass</h4>
      <Spacer />
      <Spacer />

      {renderRow(
        <>
          <div>
            <h2>{format(magma.value)} Magma</h2>
            {render(magmaBar)}
          </div>
        </>,
        <Spacer width="20px"/>,
        <div>-&gt;</div>,
        <Spacer width="20px"/>,
        <>
          <div>
            <h2>{format(lava.value)} Lava</h2>
            {render(lavaBar)}
          </div>
        </>
      )}

      <Spacer />
      <Spacer />

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
      <Spacer />

      {renderGroupedObjects(Object.values(pressureBuyables), 3)}
    </>,
  };
});

export default layer;
