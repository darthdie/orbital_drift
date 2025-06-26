import { createResource, Resource, trackTotal } from "features/resources/resource";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import solarLayer from '../solar';
import { computed, ComputedRef, unref, watch } from "vue";
import { createSequentialModifier, createAdditiveModifier, createMultiplicativeModifier, createExponentialModifier, MultiplicativeModifierOptions, ExponentialModifierOptions, Modifier, createModifierSection, ModifierSectionOptions } from "game/modifiers";
import { render, renderRow } from "util/vue";
import { createRepeatable, Repeatable, RepeatableOptions } from "features/clickables/repeatable";
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
        description: "Increase time speed in this layer by x1.5"
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
        description: "Raise last reset time gain based on time until collision",
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
        cost: Decimal.fromNumber(2000)
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
        cost: Decimal.fromNumber(5000)
      })),
      display: {
        title: "Killin' Time",
        description: "For every 1000 seconds of last reset time, gain +0.1 base dust gain",
        effectDisplay: (): string => `+${format(killingTimeModifier.apply(0))}`
      }
    })),

    accelerationUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(10000)
      })),
      display: {
        title: 'Acceleration',
        description: "Increase collision time rate based on time since last reset",
        effectDisplay: (): string => `x${format(accelerationModifier.apply(1))}`,
      }
    })),

  }

  const repeatables = {
    baseDustTime: createRepeatable(() => ({
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
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.dustPiles.amount).pow_base(2.5).times(75)
      })),
      display: {
        title: "Dust Piles",
        description: "Raise dust gain to ^1.1",
        effectDisplay: () => `^${format(dustPilesEffect.value)}`
      },
      visibility: () => mercury.achievements.first.earned.value
    }))
  };

  const accumulatingDustModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: basicUpgrades.acummulatingDust.bought,
      multiplier: () => Decimal.add(mercurialDust.value, 1).log10().sqrt().clampMin(1),
      description: "Accumulating Dust"
    }))
  ]);

  const seasonedDustModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: basicUpgrades.totalUpgrade.bought,
      addend: () => new Decimal(totalTimeSinceReset.value).log10().sqrt().clampMin(1),
      description: "Seasoned Dust"
    }))
  ]);

  const baseDustAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => repeatables.baseDustTime.amount.value,
      description: "Align the Stars"
    }))
  ]);

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: basicUpgrades.messengerGodUpgrade.bought,
      description: "Messenger God"
    })),
  ]);

  const slippingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: basicUpgrades.slippingTimeUpgrade.bought,
      multiplier: () => Decimal.add(timeSinceReset.value, 1).log10().pow(0.6).clampMin(1).clampMax(3),
      description: "Slippery Time"
    }))
  ]);

  const collisionCourseEffect = computed((): Decimal => {
    if (basicUpgrades.collisionCourse.bought.value) {
      return Decimal.subtract(7603200, mercury.collisionTime.value).add(1).log10().sqrt().pow(0.3).clampMin(1);
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
    // // *
    mercury.firstMilestoneModifier,
    slippingTimeModifier,
    baseTimeRateModifier,
    // ^
    collisionCourseModifier,
  ]);

  const chunkUnlockUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(1000)
    })),
    display: {
      title: "Chunks",
      description: "Unlock Mercurial Chunks"
    }
  }));

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
      addend: () => Decimal.divide(timeSinceReset.value, 1000).times(0.1)
    }))
  ]);

  const dustPowerGainModifier = createSequentialModifier(() => [
    baseDustGainModifier,
    killingTimeModifier,
    dustMultiplierModifier,
    accumulatingDustModifier,
    dustPilesModifier,
  ]);

  const conversion = createCumulativeConversion(() => {
    return {
      formula: x => {
        return dustPowerGainModifier.getFormula(x.div(2).pow(0.3)) as InvertibleIntegralFormula;
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
        timeSinceReset.value = 0;
        mercury.collisionTime.value = mercury.collisionTime.defaultValue;
      }
    }
  });

  const accelerationModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => basicUpgrades.accelerationUpgrade.bought.value,
      // x: TSLR
      multiplier: () => Decimal.add(timeSinceReset.value, 1).sqrt().pow(0.25).clampMin(1).clampMax(5)
    }))
  ]);

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => noPersist([
      basicUpgrades,
      repeatables,
    ]),
    onReset: () => {
      mercurialDust.value = mercurialDust.defaultValue;
      totalMercurialDust.value = Decimal.dZero;
      timeSinceReset.value = timeSinceReset.defaultValue;
      totalTimeSinceReset.value = Decimal.dZero;

      if (mercury.achievements.second.earned.value) {
        console.log('reset', { count: mercury.completedAchievementsCount.value })
        Object.values(basicUpgrades)
          .slice(0, mercury.completedAchievementsCount.value)
          .forEach(u => u.bought.value = true);
      }
    }
  }));

  watch(mercury.completedAchievementsCount, count => {
    if (!mercury.achievements.second.earned.value) {
      return;
    }

     console.log('update', { count: count })

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

  const enablePassiveGeneration: ComputedRef<boolean> = computed<boolean>(() => chunksLayer.upgrades.grindingChunks.bought.value);
  const passiveGenerationPerSecond: ComputedRef<Decimal> = computed(() => {
    return Decimal.times(0.05, unref(conversion.actualGain));
  });

  setupPassiveGeneration(
    baseLayer,
    conversion,
    () => enablePassiveGeneration.value ? 0.05 : 0,
  );

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    const totalDiff = Decimal.times(timeSinceLastResetGainModifier.apply(1), diff);
    timeSinceReset.value = Decimal.add(timeSinceReset.value, totalDiff);
  });

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
    chunkUnlockUpgrade,
    slippingTimeModifier,
    repeatables,
    basicUpgrades,
    totalTimeModifier: seasonedDustModifier,
    accelerationModifier,
    collisionCourseEffect,
    collisionCourseModifier,
    reset,
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
          {chunkArray(Object.values(repeatables), 4).map(group => renderRow.apply(null, group))}
        </Column>
        <Spacer />
        <Column>
          {chunkArray(Object.values(basicUpgrades), 4).map(group => renderRow.apply(null, group))}
        </Column>
        <Spacer/>
        <Column>
          {render(chunkUnlockUpgrade)}
        </Column>
      </>
    ),
    treeNode,
  };
});

export default layer;