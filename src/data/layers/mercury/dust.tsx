import { createResource, Resource, trackTotal } from "features/resources/resource";
import { BaseLayer, createLayer } from "game/layers";
import { DefaultValue, noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import solarLayer from '../solar';
import { computed, ComputedRef, unref, watch } from "vue";
import { createSequentialModifier, createAdditiveModifier, createMultiplicativeModifier, createExponentialModifier, MultiplicativeModifierOptions, ExponentialModifierOptions, Modifier, createModifierSection, ModifierSectionOptions } from "game/modifiers";
import { render, renderGroupedObjects, renderRow, renderStyledRow, VueFeature } from "util/vue";
import { createRepeatable, Repeatable, RepeatableOptions, setupAutoPurchaseRepeatable } from "features/clickables/repeatable";
import Formula from "game/formulas/formulas";
import { createCostRequirement, CostRequirementOptions, createVisibilityRequirement, Requirements } from "game/requirements";
import { createUpgrade, setupAutoPurchase } from "features/clickables/upgrade";
import { format } from "util/break_eternity";
import { createCumulativeConversion, setupPassiveGeneration } from "features/conversion";
import { chunkArray, createLayerTreeNode, createResetButton } from "data/common";
import { createReset } from "features/reset";
import mercury from '../mercury';
import { main } from "data/projEntry";
import Column from "components/layout/Column.vue";
import Spacer from "components/layout/Spacer.vue";
import { InvertibleIntegralFormula } from "game/formulas/types";
import chunksLayer from './chunks';
import milestonesLayer from './milestones';
import acceleratorsLayer from './accelerators';

// TODO:
// Increase base chunk cost
// Add more upgrades, make it more meaningful or some shit

const id = "Md";
const layer = createLayer(id, (baseLayer: BaseLayer) => {
  const name = "Mercury";
  const color = "#b1adad";

  const mercurialDust = createResource(0, "mercurial dust", 2);
  const totalMercurialDust = trackTotal(mercurialDust);

  const timeSinceReset = createResource<DecimalSource>(0);
  const totalTimeSinceReset = trackTotal(timeSinceReset);

  const unlocked = noPersist(solarLayer.mercuryUpgrade.bought);

  const basicUpgrades = {
    messengerGodUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(50)
      })),
      display: {
        title: "The Messenger God",
        description: "Multiply time since last reset rate",
        effectDisplay: (): string => `x${format(messengerGodModifier.apply(1))}`
      }
    })),

    slippingTimeUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(100)
      })),
      display: {
        title: "Slippery Time",
        description: "Multiplies rate of reset time based on time since last reset.",
        effectDisplay: (): string => `x${format(slippingTimeModifier.apply(1))}`
      }
    })),

    collisionCourse: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(250)
      })),
      display: {
        title: "Collision Course",
        description: "Raise last reset time gain based on dust",
        effectDisplay: (): string => `^${format(collisionCourseEffect.value)}`
      }
    })),

    acummulatingDust: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1000)
      })),
      display: {
        title: 'Accumulating Dust',
        description: "Multiply dust gain based on current dust",
        effectDisplay: (): string => `x${format(accumulatingDustModifier.apply(1))}`
      }
    })),

    totalUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(50000)
      })),
      display: {
        title: "Seasoned Dust",
        description: "Increases base time speed by total time since last reset.",
        effectDisplay: (): string => `+${format(seasonedDustModifier.apply(0))}`
      }
    })),

    killingTime: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e8)
      })),
      display: {
        title: "Killin' Time",
        description: "Increase base dust gain based on OOM of last reset time.",
        effectDisplay: (): string => `+${format(killingTimeModifier.apply(0))}`
      }
    })),

    latestUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e15)
      })),
      display: {
        title: "Acceleration",
        description: "Multiply last reset time rate based on collision time rate.",
        effectDisplay: (): string => `x${format(accelerationTwoMultiplierModifier.apply(1))}`,
      }
    })),

    accelerationUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e20)
      })),
      display: {
        title: "Acceleration 2: This time it's personal",
        description: "Multiply time until collision rate based on time since last reset",
        effectDisplay: (): string => `x${format(accelerationModifier.apply(1))}`,
      }
    })),
  };

  const chunkingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: acceleratorUpgrades.chunkingTime.bought,
      multiplier: () => Decimal.add(chunksLayer.totalChunks.value, 1).sqrt().clampMin(1)
    }))
  ]);

  const eyeHateDinosaursModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: acceleratorUpgrades.iHateDinosaurs.bought,
      multiplier: () => Decimal.add(chunksLayer.totalChunks.value, 1).log(2).pow(1.2).clampMin(1)
    }))
  ])

  const fedexManagerModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: acceleratorUpgrades.fedexManager.bought,
      multiplier: () => Decimal.add(chunksLayer.totalChunks.value, 1).log2().clampMin(1)
    }))
  ]);

  const accelerationTwoMultiplierModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: basicUpgrades.latestUpgrade.bought,
      multiplier: () => Decimal.add(mercury.collisionTimeGainComputed.value, 1).log10().cbrt().clampMin(1)
    })),
  ]);

  const dustBunniesModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: acceleratorUpgrades.dustBunnies.bought,
      multiplier: () => Decimal.add(chunksLayer.totalChunks.value, 1).log2().pow(1.1).clampMin(1),
    }))
  ]);

  const acceleratorUpgrades = {
    chunkingTime: createUpgrade(() => ({
      visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e30)
      })),
      display: {
        title: "It's Chunkin' time",
        description: `Multiply "Killin' Time" based on chunks`,
        effectDisplay: () => `*${format(chunkingTimeModifier.apply(1))}`
      }
    })),

    fedexManager: createUpgrade(() => ({
      visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e40)
      })),
      display: {
        title: "FedEx Manager",
        description: `Multiply "The Messenger God" based on chunks`,
        effectDisplay: () => `*${format(fedexManagerModifier.apply(1))}`
      }
    })),

    dustBunnies: createUpgrade(() => ({
      visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e50)
      })),
      display: {
        title: "Dust Bunnies",
        description: `Multiply "Accumulating Dust" based on total chunks`,
        effectDisplay: () => `*${format(dustBunniesModifier.apply(1))}`
      }
    })),

    iHateDinosaurs: createUpgrade(() => ({
      visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e50)
      })),
      display: {
        title: "eyehatedinosaurs",
        description: `Multiply "Acceleration" based on total chunks`,
        effectDisplay: () => `*${format(eyeHateDinosaursModifier.apply(1))}`
      }
    }))
  }

  const buyableCap = computed(() => Decimal.add(30, acceleratorsLayer.dustAccelerator.dustBuyableCapEffect.value));

  const repeatables = {
    baseDustTime: createRepeatable(() => ({
      limit: () => buyableCap.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.baseDustTime.amount).pow_base(1.3).times(10)
      })),
      display: {
        title: "Align the Stars",
        description: "Increase the base dust timer by +1s",
        effectDisplay: () => {
          const c: any = baseDustAmountModifier.apply(0);
          return `+${c}/s`;
        }
      }
    })),

    baseDustGain: createRepeatable(() => ({
      limit: () => buyableCap.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.baseDustGain.amount).pow_base(1.8).times(15)
      })),
      display: {
        title: "Salted Dust",
        description: "Increase base dust gain by 1",
        effectDisplay: () => {
          const c: any = baseDustGainModifier.apply(0)
          return `+${format(c)}`;
        }
      }
    })),

    dustMultiplier: createRepeatable(() => ({
      limit: () => buyableCap.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.dustMultiplier.amount).pow_base(1.3).times(30)
      })),
      display: {
        title: "Enriched Dust",
        description: "Multiply dust gain by x1.1",
        effectDisplay: () => {
          const c: any = dustMultiplierModifier.apply(1);
          return `x${format(c, 1)}`;
        }
      }
    })),

    dustPiles: createRepeatable((): RepeatableOptions => ({
      limit: () => buyableCap.value,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.dustPiles.amount).pow_base(2.5).times(75)
      })),
      display: {
        title: "Dust Piles",
        description: "Raise dust gain to ^1.1",
        effectDisplay: () => `^${format(dustPilesEffect.value)}`
      },
      visibility: () => milestonesLayer.milestones.first.earned.value
    }))
  };

  const accumulatingDustModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: basicUpgrades.acummulatingDust.bought,
      multiplier: (): Decimal => Decimal.add(mercurialDust.value, 10).log10().sqrt().mul(dustBunniesModifier.apply(1)).clampMin(1),
      description: "Accumulating Dust"
    }))
  ]);

  const seasonedDustModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: basicUpgrades.totalUpgrade.bought,
      addend: () => {
        return Decimal.add(totalTimeSinceReset.value, 1).log10().sqrt().clampMin(1);
      },
      description: "Seasoned Dust"
    }))
  ]);

  const baseDustAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => repeatables.baseDustTime.amount.value,
      description: "Align the Stars"
    }))
  ]);

  const messengerGodModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: () => Decimal.fromNumber(1.5).times(fedexManagerModifier.apply(1)),
      enabled: basicUpgrades.messengerGodUpgrade.bought,
      description: "Messenger God"
    })),
  ]);

  const slippingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: basicUpgrades.slippingTimeUpgrade.bought,
      multiplier: () => Decimal.add(timeSinceReset.value, 10).log10().pow(0.6).clampMin(1),
      description: "Slippery Time"
    }))
  ]);

  const collisionCourseEffect = computed((): Decimal => {
    if (basicUpgrades.collisionCourse.bought.value) {
      return Decimal.add(mercurialDust.value, 10).log10().sqrt().pow(0.2).clampMin(1);
    }

    return Decimal.dOne;
  });

  const collisionCourseModifier = createExponentialModifier((): ExponentialModifierOptions => ({
    enabled: basicUpgrades.collisionCourse.bought,
    exponent: () => collisionCourseEffect.value,
    description: "Collision Course"
    // supportLowNumbers: true,
  }));

  const timeSinceLastResetGainModifier = createSequentialModifier(() => [
    // +
    seasonedDustModifier,
    baseDustAmountModifier,
    chunksLayer.chuckingChunksModifier,
    // *
    milestonesLayer.firstMilestoneModifier,
    slippingTimeModifier,
    messengerGodModifier,
    accelerationTwoMultiplierModifier,
    solarLayer.mercuryRetainedSpeedModifer,
    // ^
    collisionCourseModifier,
    createExponentialModifier(() => ({
      exponent: () => milestonesLayer.fourthMilestoneModifier.value
    })),
    createExponentialModifier(() => ({
      exponent: () => acceleratorsLayer.timeAccelerator.levelTwoTimeRaiseEffect.value
    }))
  ]);

  const unlocks = {
    chunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1000)
      })),
      display: {
        title: "Chunks",
        description: "Unlock Mercurial Chunks"
      }
    })),

    accelerators: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1e9)
      })),
      display: {
        title: "Accelerators",
        description: "Unlock Accelerators"
      }
    })),
  };

  const baseDustGainModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: () => Decimal.gt(repeatables.baseDustGain.amount.value, 0),
      addend: () => repeatables.baseDustGain.amount.value
    }))
  ]);


  const dustMultiplierModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: () => Decimal.dOne.add(Decimal.times(0.1, repeatables.dustMultiplier.amount.value)).clampMin(1),
      enabled: () => Decimal.gt(repeatables.dustMultiplier.amount.value, 0)
    }))
  ]);

  const dustPilesEffect = computed((): Decimal => Decimal.dOne.add(Decimal.times(0.1, repeatables.dustPiles.amount.value)).clampMin(1));

  const dustPilesModifier = createSequentialModifier(() => [
    createExponentialModifier(() => ({
      enabled: () => Decimal.gt(repeatables.dustPiles.amount.value, 0),
      exponent: () => dustPilesEffect.value
    }))
  ]);

  const killingTimeModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: basicUpgrades.killingTime.bought,
      // addend: (): Decimal => Decimal.divide(timeSinceReset.value, 1000).times(0.01).times(chunkingTimeModifier.apply(1))
      addend: (): Decimal => Decimal.pow(Decimal.add(timeSinceReset.value, 1).e, 1.5)
      // addend: 0
    }))
  ]);

  const dustPowerGainModifier = createSequentialModifier(() => [
    // +
    baseDustGainModifier,
    killingTimeModifier,
    // *
    dustMultiplierModifier,
    accumulatingDustModifier,
    acceleratorsLayer.dustAccelerator.dustGainMultiplierModifier,
    // solarLayer.mercuryRetainedSpeedModifer,
    // ^
    dustPilesModifier,
    createExponentialModifier(() => ({
      exponent: () => acceleratorsLayer.dustAccelerator.dustAcceleratorDustRaiseEffect.value
    })),
    createExponentialModifier(() => ({
      exponent: () => acceleratorsLayer.timeAccelerator.levelTwoTimeRaiseEffect.value
    }))
  ]);

  const conversion = createCumulativeConversion(() => {
    return {
      formula: x => {
        // const oom = computed(() => Decimal.fromValue(timeSinceReset.value).e);
        return (dustPowerGainModifier.getFormula(x.div(2).pow(0.3)) as InvertibleIntegralFormula)
        .step(1e6, f => f.div(3))
        // .div()
        // .step(100, f => f.sqrt())
        // .step(1000, f => f.sqrt())
        // .step(1000, f => f.div(Formula.variable(oom).div(4)));
      },
      baseResource: timeSinceReset,
      gainResource: mercurialDust,
      currentGain: computed((): Decimal => {
        if (Decimal.lt(timeSinceReset.value, 10)) {
          return Decimal.dZero;
        }

        return Decimal.fromValue(conversion.formula.evaluate(timeSinceReset.value));
      }),
      spend: () => {
        timeSinceReset.value = Decimal.dZero;
        mercury.collisionTime.value = new Decimal(mercury.collisionTime.defaultValue);
      }
    }
  });

  const accelerationModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => basicUpgrades.accelerationUpgrade.bought.value,
      // x: TSLR
      multiplier: () => Decimal.add(timeSinceReset.value, 1).sqrt().pow(0.25).mul(eyeHateDinosaursModifier.apply(1)).clampMin(1)
    }))
  ]);

  const preresetBuyableLevels = {
    baseDustTime: 0,
    baseDustGain: 0,
    dustMultiplier: 0,
    dustPiles: 0
  };

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => {
      if (milestonesLayer.milestones.five.earned.value) {
        Object.keys(preresetBuyableLevels).forEach((buyable) => {
          (preresetBuyableLevels as Record<string, number>)[buyable] = (repeatables as any)[buyable].amount.value;
        });
      }

      return noPersist([
        basicUpgrades,
        repeatables,
      ]);
    },
    onReset: () => {
      mercurialDust.value = mercurialDust[DefaultValue];
      totalMercurialDust.value = Decimal.dZero;
      timeSinceReset.value = timeSinceReset[DefaultValue];
      totalTimeSinceReset.value = Decimal.dZero;
      mercury.collisionTime.value = new Decimal(mercury.collisionTime[DefaultValue]);

      if (milestonesLayer.milestones.five.earned.value) {
        Object.keys(preresetBuyableLevels).forEach((buyable) => {
          (repeatables as any)[buyable].amount.value = Decimal.min(
            (preresetBuyableLevels as Record<string, number>)[buyable],
            chunksLayer.totalChunks.value
          );
        });
      }

      if (milestonesLayer.milestones.second.earned.value) {
        Object.values(basicUpgrades)
          .slice(0, milestonesLayer.completedMilestonesCount.value)
          .forEach(u => u.bought.value = true);
      }
    }
  }));

  const fullReset = () => {
    reset.reset();

    mercurialDust.value = 0;
    totalMercurialDust.value = 0;
    timeSinceReset.value = 0;
    totalTimeSinceReset.value = 0;
  };

  watch(milestonesLayer.completedMilestonesCount, count => {
    if (!milestonesLayer.milestones.second.earned.value) {
      return;
    }

    Object.values(basicUpgrades)
      .slice(0, count)
      .forEach(u => u.bought.value = true);
  });

  const resetButton = createResetButton(() => ({
    conversion,
    tree: main.tree,
    treeNode,
    showNextAt: false,
    resetDescription: () => `Reset both reset time and collision time for `
  }));

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset,
    classes: { "small": true },
    display: "D"
  }));

  const passiveGenerationPerSecondEffect = computed(() => Decimal.mul(chunksLayer.totalChunks.value, 0.01).clampMin(0.01));
  const enablePassiveGeneration: ComputedRef<boolean> = computed<boolean>(() => chunksLayer.upgrades.grindingChunks.bought.value);
  const passiveGenerationPerSecond: ComputedRef<Decimal> = computed(() => {
    return Decimal.times(passiveGenerationPerSecondEffect.value, unref(conversion.actualGain));
  });

  setupPassiveGeneration(
    baseLayer,
    conversion,
    () => enablePassiveGeneration.value ? passiveGenerationPerSecondEffect.value : 0,
  );

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    const totalDiff = Decimal.times(timeSinceLastResetGainModifier.apply(1), diff);
    timeSinceReset.value = Decimal.add(timeSinceReset.value, totalDiff);
  });

  const tableStyles = "gap: 8px; margin-bottom: 8px;";
  return {
    name,
    color,
    timeSinceReset,
    totalTimeSinceReset,
    mercurialDust,
    totalMercurialDust,
    baseDustAmountModifier,
    baseDustGainModifier,
    dustMultiplierModifier,
    unlocks,
    slippingTimeModifier,
    repeatables,
    basicUpgrades,
    acceleratorUpgrades,
    totalTimeModifier: seasonedDustModifier,
    accelerationModifier,
    collisionCourseEffect,
    collisionCourseModifier,
    reset,
    fullReset,
    display: () => (
      <>

        <h2>{format(mercurialDust.value)} mercurial dust</h2>
        {
          enablePassiveGeneration.value
            ? <><h6>Gaining {format(passiveGenerationPerSecond.value)}/s</h6></>
            : null
        }
        <h5>It has been {format(timeSinceReset.value)} seconds since the last reset.</h5>
        <h6>A second is worth {format(timeSinceLastResetGainModifier.apply(1))} real seconds</h6>

        <Spacer />
        {render(resetButton)}
        <Spacer />
        <Spacer />
        <Column>
          {renderGroupedObjects(repeatables, 4, tableStyles)}
        </Column>
        <Spacer />

        <h4>Upgrades</h4>
        <Column>
          {renderGroupedObjects(basicUpgrades, 4, tableStyles)}
        </Column>
        <Column>
          {renderGroupedObjects(acceleratorUpgrades, 4, tableStyles)}
        </Column>
        <Spacer />

        <h4>Unlocks</h4>
        <Column>
          {renderGroupedObjects(unlocks, 4, tableStyles)}
        </Column>
      </>
    ),
    treeNode,
  };
});

export default layer;