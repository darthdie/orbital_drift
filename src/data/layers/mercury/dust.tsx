import { createResource, Resource, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import solarLayer from '../solar';
import { computed } from "vue";
import { createSequentialModifier, createAdditiveModifier, createMultiplicativeModifier, createExponentialModifier, MultiplicativeModifierOptions } from "game/modifiers";
import { render, renderRow } from "util/vue";
import { createRepeatable, Repeatable, RepeatableOptions } from "features/clickables/repeatable";
import Formula from "game/formulas/formulas";
import { createCostRequirement, CostRequirementOptions, createVisibilityRequirement, Requirements } from "game/requirements";
import { createUpgrade, setupAutoPurchase } from "features/clickables/upgrade";
import { format } from "util/break_eternity";
import { createCumulativeConversion } from "features/conversion";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createReset } from "features/reset";
import mercury from '../mercury';
import { main } from "data/projEntry";
import Column from "components/layout/Column.vue";
import Spacer from "components/layout/Spacer.vue";

function chunkArray<T>(arr: T[], size: number) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

// TODO:
// Increase base chunk cost
// Add more upgrades, make it more meaningful or some shit

const id = "Md";
const layer = createLayer(id, baseLayer => {
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
        description: "Multiply time in this layer based on time until collision",
        effectDisplay: (): string => `x${format(collisionCourseModifier.apply(1))}`
      }
    })),

    acummulatingDust: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1000)
      })),
      display: {
        title: 'Accumulating Dust',
        description: "Multiply dust gain based on unspent dust",
        effectDisplay: (): string => `0`
      }
    })),

    totalUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1000)
      })),
      display: {
        title: "???",
        description: "Increases base time speed by total time since last reset.",
        effectDisplay: (): string => `+${format(totalTimeModifier.apply(0))}`
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
        effectDisplay: (): string => `x${accelerationModifier.apply(1)}`,
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
        description: "Increase the base dust timer by +1/s per level",
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
        description: "Increase base dust gain by +1 per level",
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
        description: "Multiply dust gain by x1.1 per level",
        effectDisplay: () => {
          const c: any = dustMultiplierModifier.apply(1);
          return `x${format(c, 1)}`;
        }
      }
    })),

    dustPowerMultiplier: createRepeatable((): RepeatableOptions => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(mercurialDust),
        cost: Formula.variable(repeatables.dustPowerMultiplier.amount).pow_base(2.5).times(75)
      })),
      display: {
        title: "Dust Piles",
        description: "Raise dust gain by 1.1 per level",
        effectDisplay: () => `^${format(dustPowerEffect.value)}`
      },
      visibility: () => mercury.achievements.first.earned.value
    }))
  };

  const collisionCourseModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: basicUpgrades.collisionCourse.bought,
      multiplier: () => Decimal.subtract(mercury.maxCollisionTime, mercury.collisionTime.value).add(1).log10().sqrt().clampMin(1)
    })),
  ]);

  const totalTimeModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: basicUpgrades.totalUpgrade.bought,
      addend: () => totalTimeSinceReset.value
    }))
  ]);

  const baseDustAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => repeatables.baseDustTime.amount.value
    }))
  ]);

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: basicUpgrades.messengerGodUpgrade.bought
    })),
  ]);

  const slippingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: basicUpgrades.slippingTimeUpgrade.bought,
      multiplier: () => Decimal.add(timeSinceReset.value, 1).log10().pow(0.6).clampMin(1)
    }))
  ])

  const baseTimeSinceResetGain = computed(
    () => Decimal.dOne
      .add(baseDustAmountModifier.apply(0))
      .add(totalTimeModifier.apply(0))
      .times(collisionCourseModifier.apply(1))
      .times(baseTimeRateModifier.apply(1))
      .times(slippingTimeModifier.apply(1))
  );

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
      multiplier: () => Decimal.dOne.add(Decimal.times(0.1, repeatables.dustMultiplier.amount.value)),
      enabled: () => Decimal.gt(repeatables.dustMultiplier.amount.value, 0)
    }))
  ]);

  const dustPowerEffect = computed((): Decimal => Decimal.dOne.add(Decimal.times(0.1, repeatables.dustPowerMultiplier.amount.value)));

  const conversion = createCumulativeConversion(() => {
    const addend = computed(() => baseDustGainModifier.apply(0))
    const multiplier = computed(() => Decimal.clampMin(dustMultiplierModifier.apply(1), 1));
    const exponent = computed((): Decimal => dustPowerEffect.value);

    return {
      formula: x => x.div(2).pow(0.3).add(addend).times(multiplier).pow(exponent),
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
      multiplier: () => Decimal.add(timeSinceReset.value, 1).sqrt().pow(0.25).clampMin(1)
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
        Object.values(basicUpgrades)
          .slice(0, mercury.completedAchievementsCount.value)
          .forEach(u => u.bought.value = true);
      }
    }
  }));

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

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    timeSinceReset.value = Decimal.add(
      timeSinceReset.value,
      Decimal.times(
        baseTimeSinceResetGain.value,
        diff
      )
    );
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
    totalTimeModifier,
    accelerationModifier,
    reset,
    display: () => (
      <>
        <h2>{format(mercurialDust.value)} mercurial dust</h2>
        <h5>It has been {format(timeSinceReset.value)} seconds since the last reset.</h5>
        <h6>A second is worth {format(baseTimeSinceResetGain.value)} real seconds</h6>

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