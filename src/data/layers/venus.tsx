/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource, displayResource, Resource, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render, renderGroupedObjects, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { computed, ComputedRef, Ref, ref, unref, watch } from "vue";
import Decimal, { format } from "util/bignum";
import { DefaultValue, noPersist, Persistent, persistent, PersistentState, SkipPersistence } from "game/persistence";
import { createAdditiveModifier, createSequentialModifier } from "game/modifiers";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { Conversion, createCumulativeConversion, createIndependentConversion, setupPassiveGeneration } from "features/conversion";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { createClickable } from "features/clickables/clickable";
import { createRepeatable, Repeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import { JSX } from "vue/jsx-runtime";
import Toggle from "components/fields/Toggle.vue";
import { createUpgrade } from "features/clickables/upgrade";
import Slider from "components/fields/Slider.vue";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import Tooltip from "wrappers/tooltips/Tooltip.vue";
import { createLazyProxy } from "util/proxies";
import "./venus.css";

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

const random = () => Math.random() * 100;

const PRIORITY_VOLCANICS = 0;
const PRIORITY_BALANCED = 1;
const PRIORITY_SPEED = 2;

const id = "V";
const layer = createLayer(id, baseLayer => {
  const name = "Venus";
  const color = "#f8e2b0";

  //   const unlocked = noPersist(false);

  const planetMass = createResource<DecimalSource>(Decimal.fromNumber(2e256), "Planet Mass");

  const pressure = createResource<DecimalSource>(1, "Pressure");
  const pressureTimer = createResource<DecimalSource>(0);
  const eruptionPressureDivisor = 0.6;
  const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1).div(maficEffect.value));
  const pressureTimerMax = computed(() =>
    Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
      .div(pressureIntervalBuyableEffect.value)
      .div(lavaIsFloorEffect.value)
      .div(maficEffect.value)
      .div(hotPotEffect.value)
      .pow(tephraPressureIntervalEffect.value)
  );
  const pressureChance = computed(() =>
    Decimal.add(10, pressureChanceBuyableEffect.apply(0))
      .add(floorIsLavaEffect.value)
      .add(bubblingEffect.value)
      .pow(tephraPressureChanceEffect.value)
  );
  const pressureGainMultiplier = computed(() =>
    Decimal.times(1.3, pressureMultBuyableEffect.value)
      .times(riceCookerEffect.value)
      .pow(tephraPressureGainEffect.value)
  );
  const eruptions = createResource<DecimalSource>(0);
  const pressureMax = computed(() => {
    const pow = Decimal.pow(2, eruptions.value);
    return Decimal.fromNumber(1e25).pow(pow);
  });
  const pressureCapped = computed(() => Decimal.eq(pressure.value, pressureMax.value));

  const volcanics = createResource<DecimalSource>(0, "Volcanics");
  const volcanicsMax = computed(() => Decimal.fromNumber(100).times(Decimal.times(volcanicsCapIncreases.value, 2).clampMin(1)));

  const lava = createResource<DecimalSource>(0, "Lava");
  const lavaTotal = trackTotal(lava);
  const lavaMax = computed(() => Decimal.fromNumber(250).times(Decimal.times(lavaCapIncreases.value, 2).clampMin(1)));
  const lavaConversionPrioritySpeedEffect = computed(() => Decimal.fromNumber(4));
  const lavaConversionPriorityVolcanicsSpeedEffect = computed(() => Decimal.fromNumber(8));
  const lavaConversionPriorityVolcanicsGainEffect = computed(() => Decimal.fromNumber(3));
  const lavaConversionAmount = computed(() => {
    let base = Decimal.fromNumber(0.1).add(buckForYourBangEffect.value);

    if (lavaConversionPriority.value == PRIORITY_VOLCANICS) {
      base = Decimal.times(base, lavaConversionPriorityVolcanicsGainEffect.value);
    }

    return base.pow(tephraVolcanicsGainEffect.value);
  });

  const lavaConversionRateSeconds = computed(() => {
    const base = Decimal.fromNumber(15).div(shorterFuseEffect.value);

    // shorterFuseEffect

    switch (lavaConversionPriority.value) {
      case PRIORITY_VOLCANICS:
        return Decimal.times(base, lavaConversionPriorityVolcanicsSpeedEffect.value);
      case PRIORITY_SPEED:
        return Decimal.div(base, lavaConversionPrioritySpeedEffect.value);
      default:
        return base;
    }
  });

  const lavaConversionLossRateSeconds = computed(() => {
    switch (lavaConversionPriority.value) {
      case PRIORITY_SPEED:
        return Decimal.fromNumber(5);
      case PRIORITY_BALANCED:
        return Decimal.fromNumber(3);
      default:
        return Decimal.dZero;
    }
  });

  /*
    Given:
    Lava of 10

    VOLCANICS:
    Decimal.times(10, 0.3) == 3 over 120 seconds
    TOTAL: 3

    BALANCED:
    Decimal.times(10, 0.1) == 1 over 15 seconds
    TOTAL: 1

    SPEED:
    Decimal.times(10, 0.1) == 1 over 3.75 seconds WITH AN EXTRA LOSS
    TOTAL: 0.56
  */

  const tephra = createResource<DecimalSource>(0, "Tephra");
  const tephraTotal = trackTotal(tephra);

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
    progress: () => {
      if (Decimal.gt(volcanicsMax.value, 1e10)) {
        return Decimal.div(Decimal.ln(Decimal.max(volcanics.value, 1)), Decimal.ln(volcanicsMax.value));
      }

      return Decimal.div(volcanics.value, volcanicsMax.value);
    }
  }));

  const lavaBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => {
      if (Decimal.gt(lavaMax.value, 1e10)) {
        return Decimal.div(Decimal.ln(lava.value), Decimal.ln(lavaMax.value))
      }

      return Decimal.div(lava.value, lavaMax.value);
    }
  }));

  const planetMassBar = createBar(() => ({
    direction: Direction.Right,
    height: 18,
    width: 256,
    progress: () => Decimal.div(Decimal.ln(planetMass.value), Decimal.ln(planetMass[DefaultValue]))
  }));

  const timeSinceLastEruption = persistent<Decimal>(new Decimal(0));;

  const testResourceX = ref<DecimalSource>(10);
  const testResourceY = ref<DecimalSource>(0);

  const testPriority: number = PRIORITY_SPEED;
  let testTimeRate = Decimal.div(15, 4); //3.75
  let testConversionRate = Decimal.fromNumber(0.1); // 1 X -> 0.1 Y
  let testLossRate = 0.05; // 5%
  let testLoss = false;
  const testBaseTime = 15;
  const testBaseConversionRate = 0.1;
  if (testPriority == PRIORITY_VOLCANICS) {
    testTimeRate = Decimal.times(testBaseTime, lavaConversionPriorityVolcanicsSpeedEffect.value);
    testConversionRate = Decimal.times(testBaseConversionRate, lavaConversionPriorityVolcanicsGainEffect.value);;
  } else if (testPriority == PRIORITY_BALANCED) {
    testTimeRate = Decimal.fromNumber(testBaseTime);
    testConversionRate = Decimal.fromNumber(testBaseConversionRate);
  } else {
    testTimeRate = Decimal.div(testBaseTime, lavaConversionPrioritySpeedEffect.value);
    testConversionRate = Decimal.fromNumber(testBaseConversionRate);
    testLoss = true;
  }

  baseLayer.on("preUpdate", diff => {
    timeSinceLastEruption.value = Decimal.add(timeSinceLastEruption.value, diff);

    pressureTicker(diff);

    if (lavaConversionEnabled.value && Decimal.gt(lava.value, 0) && Decimal.lt(volcanics.value, volcanicsMax.value)) {
      const conversionRate = Decimal.div(1, lavaConversionRateSeconds.value);
      const conversionAmount = Decimal.min(lava.value, Decimal.times(conversionRate, diff));
      const producedVolcanics = Decimal.times(conversionAmount, lavaConversionAmount.value);

      volcanics.value = Decimal.add(volcanics.value, producedVolcanics).clampMax(volcanicsMax.value);
      lava.value = Decimal.sub(lava.value, conversionAmount);

      if (Decimal.gt(lavaConversionLossRateSeconds.value, 0)) {
        // %5 -> 0.05
        const lossRate = Decimal.times(lavaConversionLossRateSeconds.value, 0.01);
        lava.value = Decimal.sub(lava.value, Decimal.times(lava.value, lossRate).times(diff));
      }
    }

    if (Decimal.gt(testResourceX.value, 0)) {
      const testDiff = testLoss ? diff : 10;
      const conversionRate = Decimal.div(1, testTimeRate);
      const conversionAmount = Decimal.min(testResourceX.value, Decimal.times(conversionRate, testDiff));
      const producedVolcanics = Decimal.times(conversionAmount, testConversionRate);

      testResourceY.value = Decimal.add(testResourceY.value, producedVolcanics).clampMax(1000);
      testResourceX.value = Decimal.sub(testResourceX.value, conversionAmount);

      if (testLoss) {
        testResourceX.value = Decimal.sub(testResourceX.value, Decimal.times(testResourceX.value, testLossRate).times(testDiff));
      }
    }
  });

  const pressureTicker = (diff: number) => {
    if (pressureCapped.value) {
      pressureTimer.value = Decimal.dZero;
      return;
    }

    pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

    if (pressureTimer.value.lt(pressureTimerMax.value)) {
      return;
    }

    pressureTimer.value = 0;

    if (Decimal.gte(pressureChance.value, random())) {
      let buildAmount = pressureGainMultiplier.value;

      if (pressureUpgrades.extraKick.bought.value) {
        if (Decimal.gte(10, random())) {
          buildAmount = buildAmount.times(5);
          console.log("KICK");
        }
      }

      pressure.value = Decimal.multiply(Decimal.clampMin(pressure.value, 1), buildAmount).clampMax(pressureMax.value);
    }
  };

  const pressureChanceBuyableEffect = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: () => Decimal.gt(pressureBuyables.pressureChance.amount.value, 0),
      addend: () => Decimal.div(pressureBuyables.pressureChance.amount.value, 4).add(luckyCastIron.value).add(sevensEffect.value)
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

    return Decimal.times(0.1, pressureBuyables.pressureMult.amount.value).add(1).times(diamondsEffect.value);
  });

  const pressureBuyables = {
    pressureChance: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureChance.amount).pow_base(1.2).times(3)
      })),
      display: {
        title: "What're the odds?",
        description: "Increase the Pressure Build Chance by 0.25% per level.",
        effectDisplay: (): string => `+${format(pressureChanceBuyableEffect.apply(0))}%`
      }
    })),

    pressureMult: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureMult.amount).pow_base(1.35).times(5)
      })),
      display: {
        title: "UNDER PRESSURE",
        description: "Multiply Pressure Build gain",
        effectDisplay: (): string => `x${format(pressureMultBuyableEffect.value)}`
      }
    })),

    pressureInterval: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Formula.variable(pressureBuyables.pressureInterval.amount).pow_base(1.45).times(8)
      })),
      display: {
        title: "Anxiety Inducing",
        description: "Divide the Pressure Build interval",
        effectDisplay: (): string => `÷${format(pressureIntervalBuyableEffect.value)}`
      }
    })),
  };

  const floorIsLavaEffect = computed(() => {
    if (pressureUpgrades.floorIsLava.bought.value) {
      return Formula.variable(lava.value).pow(0.5).sqrt().clampMin(1).step(2, f => f.sqrt()).evaluate();
      // return Decimal.pow(lava.value, 0.8).sqrt().clampMin(1);
    }

    return Decimal.dOne;
  });

  const lavaIsFloorEffect = computed(() => {
    if (pressureUpgrades.lavaIsFloor.bought.value) {
      return Formula.variable(lava.value).pow(0.5).times(0.05).add(1).step(1.5, f => f.div(15)).clampMin(1).evaluate();
      // return Decimal.pow(lava.value, 0.5).times(0.05).add(1).clampMin(1);
    }

    return Decimal.dOne;
  });

  const boilingPotEffect = computed(() => {
    if (pressureUpgrades.boilingPot.bought.value) {
      return Decimal.add(pressure.value, 10).log10().sqrt().clampMin(1);
    }

    return Decimal.dOne;
  });

  const bubblingEffect = computed(() => {
    if (pressureUpgrades.bubbling.bought.value) {
      return Decimal.log10(timeSinceLastEruption.value).clampMin(1);
    }

    return Decimal.dZero;
  });

  const hotPotEffect = computed(() => {
    if (pressureUpgrades.hotPot.bought.value) {
      return Formula.variable(new Decimal(pressure.value).e).times(0.1).add(1).step(1.5, f => f.div(5)).clampMin(1).evaluate();
      // return Decimal.times(new Decimal(pressure.value).e, 0.1).add(1).clampMin(1);
    }

    return Decimal.dOne;
  })

  const maficEffect = computed(() => {
    if (volcanicsUpgrades.mafic.bought.value) {
      return Decimal.pow(volcanics.value, 0.1).sqrt().clampMin(1);
    }

    return Decimal.dOne;
  });

  const riceCookerEffect = computed((): Decimal => {
    if (pressureUpgrades.riceCooker.bought.value) {
      return Decimal.pow(unref(lavaConversion.currentGain), 0.1).sqrt().clampMin(1);
      // return Decimal.pow(pressureGainMultiplier.value, 0.1).clampMin(1);
    }

    return Decimal.dOne;
  })

  const luckyCastIron = computed(() => pressureUpgrades.luckyCastIron.bought.value ? 7 : 0);

  const diamondsEffect = computed(() => pressureUpgrades.diamonds.bought.value ? Decimal.fromNumber(2) : Decimal.dOne);
  const sevensEffect = computed(() => pressureUpgrades.sevens.bought.value ? Decimal.fromNumber(7.77) : Decimal.dZero);

  // add some pressure cost upgrades
  // add some lava cost upgrades

  // Should these upgrades buff the buyables?
  const pressureUpgrades = {
    bubbling: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(5)
      })),
      display: {
        title: "Bubbling",
        description: "Increase Pressure Build Chance based time since Eruption.",
        effectDisplay: (): string => `+${format(bubblingEffect.value)}%`
      }
    })),

    hotPot: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(15)
      })),
      display: {
        title: "Hot Pot",
        description: "Divide Pressure Build Interval based on OOM of Pressure.",
        effectDisplay: (): string => `/${format(hotPotEffect.value)}`
      }
    })),

    riceCooker: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(50)
      })),
      display: {
        title: "Rice Cooker",
        description: `Multiply Pressure Build Gain based on pending ${lava.displayName}.`,
        effectDisplay: (): string => `x${format(riceCookerEffect.value)}`
      }
    })),

    luckyCastIron: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(250)
      })),
      display: {
        title: "Lucky Cast Iron",
        description: "Add +7% to the base of 'What're the odds?'",
        effectDisplay: (): string => `+${luckyCastIron.value}%`
      }
    })),

    floorIsLava: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Decimal.fromNumber(15)
      })),
      display: {
        title: "Floor is Lava",
        // raise bubbling based on lava? and etc.?
        description: "Increase Pressure Build Chance based on Lava.",
        effectDisplay: (): string => `+${format(floorIsLavaEffect.value)}%`
      }
    })),

    lavaIsFloor: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Decimal.fromNumber(25)
      })),
      display: {
        title: "Lava is Floor",
        description: "Decrease Pressure Interval based on Lava.",
        effectDisplay: (): string => `÷${format(lavaIsFloorEffect.value)}`
      }
    })),

    // pressure cost?
    extraKick: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Decimal.fromNumber(75)
      })),
      display: {
        title: "Lil' Extra Kick",
        description: "10% chance for Pressure to build by an extra x5"
      }
    })),

    boilingPot: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(lava),
        cost: Decimal.fromNumber(125)
      })),
      display: {
        title: "Boiling Pot",
        description: "Increase Pressure Build Chance based on Pressure",
        effectDisplay: (): string => `÷${format(boilingPotEffect.value)}`
      }
    })),

    diamonds: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(1e10)
      })),
      display: {
        title: "Diamonds",
        description: "Multiplies UNDER PRESSURE effect by x2",
        effectDisplay: (): string => `x${diamondsEffect.value}`
      }
    })),

    sevens: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromNumber(1e100)
      })),
      display: {
        title: "777",
        description: "Adds +7.77% to the base of What're the odds?",
        effectDisplay: (): string => `+${sevensEffect.value}%`
      }
    })),

    SSssSssssSSS3: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromMantissaExponent(1, 1000)
      })),
      display: {
        title: "SSssSssssSSS3",
        description: "Does Stuff",
        effectDisplay: (): string => `+${luckyCastIron.value}%`
      }
    })),

    SSssSssssSSS4: createUpgrade(() => ({
      visibility: () => Decimal.gt(lava.value, 0),
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(pressure),
        cost: Decimal.fromMantissaExponent(1, 10000)
      })),
      display: {
        title: "SSssSssssSSS4",
        description: "Does Stuff",
        effectDisplay: (): string => `+${luckyCastIron.value}%`
      }
    })),
  };

  // const evenFlowEffect = computed(() => {
  //   if (Decimal.gt(lavaBuyables.evenFlow.amount.value, 0)) {
  //     return Decimal.times(0.1, lavaBuyables.evenFlow.amount.value).add(1);
  //   }

  //   return Decimal.dOne;
  // });

  // const lavaBuyables = {
  //   evenFlow: createRepeatable(() => ({
  // requirements: createCostRequirement((): CostRequirementOptions => ({
  //   resource: noPersist(magma),
  //   cost: Formula.variable(lavaBuyables.evenFlow.amount).pow_base(1.5).times(5)
  // })),
  // display: {
  //   title: "Even Flow",
  //   description: "Multiply Lava gain from Pressure.",
  //   effectDisplay: (): string => `x${format(evenFlowEffect.value)}`
  // }
  //   }))
  // };

  const buckForYourBangEffect = computed(() => {
    if (Decimal.gt(volcanicsBuyables.buckForYourBang.amount.value, 0)) {
      return Decimal.times(volcanicsBuyables.buckForYourBang.amount.value, 0.1);
    }

    return Decimal.dZero;
  });

  // const buckForYourBangPlusOne = computed(() => Decimal.add(volcanicsBuyables.buckForYourBang.amount.value, 1))
  const shorterFuseEffect = computed(() => {
    if (Decimal.gt(volcanicsBuyables.shorterFuse.amount.value, 0)) {
      return Decimal.times(volcanicsBuyables.shorterFuse.amount.value, 0.1).add(1);
    }

    return Decimal.dOne;
  })

  const volcanicsBuyables = {
    buckForYourBang: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(volcanics),
        cost: Formula
          .variable(volcanicsBuyables.buckForYourBang.amount)
          .add(volcanicsBuyables.buckForYourBang.amount)
          .pow_base(1.4)
          .times(2)
      })),
      display: {
        title: "Buck for your BANG",
        description: "Increase conversion rate by +0.1 per level.",
        effectDisplay: (): string => `x${format(buckForYourBangEffect.value, 1)}`
      }
    })),

    shorterFuse: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(volcanics),
        cost: Formula
          .variable(volcanicsBuyables.shorterFuse.amount)
          .add(volcanicsBuyables.shorterFuse.amount)
          .pow_base(1.4)
          .times(2)
      })),
      display: {
        title: "Shorter Fuse",
        description: "Divide conversion interval by 1+(0.1*level).",
        effectDisplay: (): string => `x${format(shorterFuseEffect.value, 1)}`
      }
    }))
  };

  const residualHeatEffect = computed(() => {
    if (volcanicsUpgrades.residualHeat.bought.value) {
      return Decimal.log2(volcanics.value).sqrt().clampMin(1);
    }

    return Decimal.dZero;
  });

  const undergroundLavaEffect = computed(() => {
    if (volcanicsUpgrades.undergroundLava.bought.value) {
      return Decimal.log10(pressure.value);
    }

    return Decimal.dZero;
  })

  const volcanicsUpgrades = {
    undergroundLava: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(volcanics),
        cost: Decimal.fromNumber(10)
      })),
      display: {
        title: "Underground Lava",
        description: `Keep log10 of ${pressure.displayName} on Explosive Eruptions.`,
        effectDisplay: () => `x${format(undergroundLavaEffect.value)}`
      }
    })),

    residualHeat: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(volcanics),
        cost: Decimal.fromNumber(25)
      })),
      display: {
        title: "Residual Heat",
        description: `Increase base ${lava.displayName} gain based on ${volcanics.displayName}`,
        effectDisplay: () => `+${format(residualHeatEffect.value)}`
      }
    })),

    mafic: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(volcanics),
        cost: Decimal.fromNumber(50)
      })),
      display: {
        title: "Mafic",
        description: `Soften Eruption penalty based on ${volcanics.displayName}`,
        effectDisplay: (): string => `÷${format(maficEffect.value)}`
      }
    })),

    // mafic: createUpgrade(() => ({
    //   requirements: createCostRequirement((): CostRequirementOptions => ({
    //     resource: noPersist(volcanics),
    //     cost: Decimal.fromNumber(100)
    //   })),
    //   display: {
    //     title: "Mafic",
    //     description: `Soften Eruption penalty based on ${volcanics.displayName}`,
    //     effectDisplay: (): string => `÷${format(maficEffect.value)}`
    //   }
    // })),
  };

  const tephraBuyableEffect = (repeatable: Repeatable, powPerLevel = 0.1) => {
    if (Decimal.gt(repeatable.amount.value, 0)) {
      return Decimal.times(repeatable.amount.value, powPerLevel).add(1);
    }

    return Decimal.dOne;
  }

  // const tephaPressureChanceEffect = computed(() => {
  //   if (Decimal.gt(tephraBuyables.pressureChance.amount.value, 0)) {
  //     return Decimal.times(tephraBuyables.pressureChance.amount.value, 0.1).add(1);
  //   }

  //   return Decimal.dOne;
  // })

  const tephraPressureGainEffect = computed(() => tephraBuyableEffect(tephraBuyables.pressureGain));
  const tephraLavaGainEffect = computed(() => tephraBuyableEffect(tephraBuyables.lavaGain));
  const tephraVolcanicsGainEffect = computed(() => tephraBuyableEffect(tephraBuyables.volcanicsGain));
  const tephraPressureChanceEffect = computed(() => tephraBuyableEffect(tephraBuyables.pressureChance, 0.05));
  const tephraPressureIntervalEffect = computed(() => {
    if (Decimal.gt(tephraBuyables.pressureInterval.amount.value, 0)) {
      return Decimal.sub(1, Decimal.times(tephraBuyables.pressureInterval.amount.value, 0.01)).clampMin(0.01);
    }

    return Decimal.dOne;
  });

  // Each should raise a certain thing by ^1.01
  // Cost should probably be amount+1, then increasing post 10?
  const tephaBuyCost = (buyable: Persistent<DecimalSource>) => Formula.variable(buyable).add(1); //.step(10, f => f.pow(1.1));
  const tephraBuyables = {
    // pressureChance: createRepeatable(() => ({
    //   requirements: createCostRequirement((): CostRequirementOptions => ({
    //     resource: noPersist(tephra),
    //     cost: Formula.variable(tephraBuyables.pressureChance.amount).add(1).step(10, f => f.pow(1.1))
    //   })),
    //   display: {
    //     title: "pressure chance",
    //     description: `Raise 'What're the odds?' by 1.1 per level`,
    //     effectDisplay: (): string => `^${format(tephaPressureChanceEffect.value)}%`
    //   }
    // })),

    pressureGain: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: tephaBuyCost(tephraBuyables.pressureGain.amount)
      })),
      display: {
        title: "Rising",
        description: `Raise Pressure Build Gain by 1.1 per level`,
        effectDisplay: (): string => `^${format(tephraPressureGainEffect.value)}`
      }
    })),

    pressureChance: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: tephaBuyCost(tephraBuyables.pressureChance.amount),
      })),
      display: {
        title: "idk",
        description: `Raise Pressure Chance by 1.05 per level`,
        effectDisplay: (): string => `^${format(tephraPressureChanceEffect.value)}`
      }
    })),

    pressureInterval: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: tephaBuyCost(tephraBuyables.pressureInterval.amount),
      })),
      display: {
        title: "idk 2",
        description: `Raise Pressure Interval by ^0.01 per level`,
        effectDisplay: (): string => `^${format(tephraPressureIntervalEffect.value)}`
      }
    })),

    lavaGain: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: tephaBuyCost(tephraBuyables.lavaGain.amount)
      })),
      display: {
        title: "Burning",
        description: `Raise Lava Gain by 1.1 per level`,
        effectDisplay: (): string => `^${format(tephraLavaGainEffect.value)}`
      }
    })),

    volcanicsGain: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: tephaBuyCost(tephraBuyables.volcanicsGain.amount),
      })),
      display: {
        title: "Settling",
        description: `Raise Volcanics Gain by 1.1 per level`,
        effectDisplay: (): string => `^${format(tephraVolcanicsGainEffect.value)}`
      }
    })),
  };

  const lavaGeneraterEffect = computed((): Decimal => {
    if (Decimal.gt(tephraGenerators.lavaGenerator.amount.value, 0)) {
      return Decimal.times(tephraGenerators.lavaGenerator.amount.value, 0.005);
    }

    return Decimal.dZero;
  })

  const tephraGenerators = {
    lavaGenerator: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(tephra),
        cost: Formula.variable(tephraGenerators.lavaGenerator.amount).add(3)
      })),
      display: {
        title: "Effusive Tunnels",
        description: `Gain 0.005% of pending ${lava.displayName}/s`,
        effectDisplay: () => `${lavaGeneraterEffect.value}/s`
      }
    }))
  }

  const lavaConversion = createCumulativeConversion(() => ({
    formula: x => x.log2().add(residualHeatEffect).if(() => pressureCapped.value, f => f.times(1.5)).pow(tephraLavaGainEffect.value).clampMax(lavaMax.value),
    baseResource: pressure,
    gainResource: noPersist(lava),
    onConvert: (amountGained: DecimalSource) => {
      console.log({
        gain: amountGained.toString(),
        lava: lava.value.toString(),
        capped: Decimal.min(lava.value, lavaMax.value).toString()
      })
      pressure.value = 1;
      lava.value = Decimal.min(lava.value, lavaMax.value);
    },
  }));

  const autoLava = createLazyProxy(() => {
    setupPassiveGeneration(
      layer,
      lavaConversion,
      () => pressureCapped.value || Decimal.eq(volcanics.value, volcanicsMax.value) ? 0 : lavaGeneraterEffect.value
    );

    return {};
  });

  const tephraConversion = createIndependentConversion(() => ({
    gainResource: noPersist(tephra),
    baseResource: pressure,
    formula: x => Formula.variable(Decimal.dZero).if(() => pressureCapped.value, () => Formula.variable(Decimal.dOne)),
    convert: () => tephra.value = Decimal.add(tephra.value, 1)
  }));

  const massDestructionAmount = computed(() => {
    return Decimal.sub(0.99, Decimal.times(eruptions.value, 0.01));
  });

  const lavaGainCapped = computed(() => Decimal.eq(unref(lavaConversion.currentGain), lavaMax.value));

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
            <h3>Effusive Eruption</h3><br />
            Reset Pressure for {gainDisplay(lavaConversion)} { lavaGainCapped.value ? "(capped)" : null }
          </span>
        );
      }

      return <>
        <span>
          <h3>Explosive Eruption</h3>
          <br />
          Reset The ENTIRE Pressure Tab for:<br />
          {gainDisplay(lavaConversion)} { lavaGainCapped.value ? "(capped)" : null }<br />
          {gainDisplay(tephraConversion)}<br />
          Destroy ^{format(massDestructionAmount.value)} of the planet's mass.<br />
          Raise Explosive Eruption requirement to ^2.<br />
          Decrease interval by x{format(eruptionPenalityDisplay.value)}.
        </span>
      </>
    }),
    onClick: () => {
      if (convertPressureButton.canClick === false) {
        return;
      }

      if (pressureCapped.value) {
        planetMass.value = Decimal.pow(planetMass.value, massDestructionAmount.value); // must be before eruptions is increased

        const pressureToKeep = undergroundLavaEffect.value;

        lavaConversion.convert();

        tephraConversion.convert();
        eruptions.value = Decimal.add(eruptions.value, 1);

        pressureTabReset.reset();

        if (Decimal.gt(pressureToKeep, 0)) {
          pressure.value = pressureToKeep;
        }
      } else {
        lavaConversion.convert();
      }

      timeSinceLastEruption.value = Decimal.dZero;
    },
    canClick: computed(() => Decimal.gte(unref(lavaConversion.actualGain), 1))
  }));

  const fullReset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer, pressureBuyables, pressureUpgrades, tephraBuyables, volcanicsUpgrades, tephraGenerators],
    onReset: () => {
      pressure.value = pressure[DefaultValue];
      lava.value = lava[DefaultValue];
      lavaTotal.value = Decimal.dZero;
      volcanics.value = volcanics[DefaultValue];
      tephra.value = tephra[DefaultValue];
      tephraTotal.value = Decimal.dZero;
    }
  }));

  const fullResetButton = createClickable(() => ({
    display: "HARD RESET",
    onClick: () => fullReset.reset()
  }))

  const pressureTabReset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [pressureBuyables, pressureUpgrades]
  }))

  const treeNode = createLayerTreeNode(() => ({
    visibility: true,
    layerID: id,
    display: () => <CelestialBodyIcon body={"Venus"} />,
    wrapper: <Tooltip display="Venus" direction={Direction.Left}></Tooltip>,
    color,
    reset: fullReset
  }));

  const lavaConversionEnabled = ref(false);
  const lavaConversionPriority = persistent<number>(1);

  const lavaConversionPriorityEffectsDisplay = computed(() => {
    let effectDisplay = [];
    if (lavaConversionPriority.value == PRIORITY_VOLCANICS) {
      effectDisplay.push((<h6>Conversion is x{format(lavaConversionPriorityVolcanicsSpeedEffect.value)} slower, but you gain x{format(lavaConversionPriorityVolcanicsGainEffect.value)} more {volcanics.displayName}.</h6>));
    } else if (lavaConversionPriority.value == PRIORITY_SPEED) {
      effectDisplay.push((<h6>Conversion is x{lavaConversionPrioritySpeedEffect.value} faster</h6>));
    }

    if (Decimal.gt(lavaConversionLossRateSeconds.value, 0)) {
      effectDisplay.push(<h6>You will lose {format(lavaConversionLossRateSeconds.value)}% of lava per second.</h6>)
    }

    const maxPossibleVolcanics = Decimal.times(lava.value, lavaConversionAmount.value);

    return (<>
      <h6>1 {lava.displayName} will convert into {format(lavaConversionAmount.value)} {volcanics.displayName} every {format(lavaConversionRateSeconds.value)} seconds.</h6>
      <h6>All {lava.displayName} converted would create {format(maxPossibleVolcanics)} {volcanics.displayName}. {lavaConversionPriority.value == PRIORITY_SPEED ? "(Ignoring Loss)" : null}</h6>
      {effectDisplay}
    </>)
  });

  const createResourceDisplay = (resource: Resource, resourceCap: ComputedRef<DecimalSource>, capIncreases: Ref<DecimalSource>) => {
    const increaseCap = createClickable(() => ({
      canClick: () => Decimal.eq(resource.value, resourceCap.value),
      classes: {"squashed-clickable": true, "flex": true},
      display: {
        title: "Increase Cap",
        description: <>
          Reset {resource.displayName} to double cap.
        </>,
      },
      onClick: () => {
        if (unref(increaseCap.canClick) != true) {
          return;
        }

        resource.value = 0;
        capIncreases.value = Decimal.add(capIncreases.value, 1);
      }
    }));

    const bar = createBar(() => ({
      direction: Direction.Right,
      height: 14,
      width: '100%',
      style: {
        overflow: 'hidden',
      },
      borderStyle: {
        borderRadius: '0',
      },
      progress: () => {
        if (Decimal.gt(resourceCap.value, 1e10)) {
          return Decimal.div(Decimal.ln(resource.value), Decimal.ln(resourceCap.value))
        }

        return Decimal.div(resource.value, resourceCap.value);
      }
    }));

    return computed(() => <div class="cappable-resource-container">
      <h3 class="title">{resource.displayName}</h3>
      {render(bar)}
      <div class="resource-display">
        <h4>{format(resource.value)}/{format(resourceCap.value)}</h4>
      </div>
      <div class="increase-cap-action">{render(increaseCap)}</div>
    </div>);
  };

  const lavaCapIncreases = createResource<DecimalSource>(0);
  const volcanicsCapIncreases = createResource<DecimalSource>(0);

  const lavaDisplay = createResourceDisplay(lava, lavaMax, lavaCapIncreases);
  const volcanicsDisplay = createResourceDisplay(volcanics, volcanicsMax, volcanicsCapIncreases);

  const tabs = createTabFamily({
    pressure: () => ({
      display: "Pressure",
      tab: createTab(() => ({
        display: () => (<>
          <h3>{pressure.displayName}</h3>
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

          <h3>{format(lava.value)} {lava.displayName}</h3>
          <Spacer />

          {renderGroupedObjects(Object.values(pressureBuyables), 3)}
          <Spacer />

          {renderGroupedObjects(pressureUpgrades, 4)}
        </>)
      }))
    }),
    volcanics: () => ({
      display: volcanics.displayName,
      visibility: () => Decimal.gt(lavaTotal.value, 0),
      tab: createTab(() => ({
        display: () => (<>
          <div class="flex" style="gap: 12px;">
            {render(lavaDisplay.value)}

            <div>-&gt;</div>

            {render(volcanicsDisplay.value)}
          </div>

          <Spacer />

          <h4>Converter Priority</h4>

          <div class="flex" style="gap: 16px; justify-content: center;">
            <h4 class="mx-0">{volcanics.displayName}</h4>
            <Slider
              min={0}
              max={2}
              onUpdate:modelValue={value => (lavaConversionPriority.value = value)}
              modelValue={lavaConversionPriority.value}
              displayTooltip={false}
            />
            <h4 class="mx-0">Speed</h4>
          </div>

          {/* The checker complains, but it works fine... */}
          {render(lavaConversionPriorityEffectsDisplay as any)}

          <Spacer/>

          <div style="display: flex; justify-content: center;">
            <Toggle
              onUpdate:modelValue={value => (lavaConversionEnabled.value = value)}
              modelValue={lavaConversionEnabled.value}
              title={"Toggle Lava Conversion"}
            />
          </div>

          <Spacer />
          <Spacer />

          {renderGroupedObjects(volcanicsBuyables, 3)}
          <Spacer />

          {renderGroupedObjects(volcanicsUpgrades, 3)}
        </>)
      }))
    }),
    tephra: () => ({
      display: tephra.displayName,
      visibility: () => Decimal.gt(tephraTotal.value, 0),
      tab: createTab(() => ({
        display: () => <>
          <h2>{displayResource(tephra)} {tephra.displayName}</h2>
          <Spacer />

          {renderGroupedObjects(tephraBuyables, 3)}
          <Spacer />

          {renderGroupedObjects(tephraGenerators, 3)}
        </>
      }))
    })
  });

  return {
    name,
    color,
    volcanics,
    volcanicsMax,
    lava,
    lavaTotal,
    planetMass,
    pressure,
    pressureTimer,
    treeNode,
    pressureBuyables,
    pressureUpgrades,
    tephra,
    tephraTotal,
    eruptions,
    tabs,
    fullReset,
    volcanicsUpgrades,
    timeSinceLastEruption,
    lavaConversionPriority,
    tephraBuyables,
    volcanicsBuyables,
    tephraGenerators,
    autoLava,
    lavaCapIncreases,
    volcanicsCapIncreases,
    display: () => <>
      <h2>{displayResource(planetMass)} Planet Mass</h2>
      {render(planetMassBar)}
      <Spacer />

      {render(tabs)}
    </>,
  };
});

export default layer;
