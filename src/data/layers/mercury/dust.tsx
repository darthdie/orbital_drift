import { createResource, Resource, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import solarLayer from '../solar';
import { computed } from "vue";
import { createSequentialModifier, createAdditiveModifier, createMultiplicativeModifier } from "game/modifiers";
import { render, renderRow } from "util/vue";
import { createRepeatable } from "features/clickables/repeatable";
import Formula from "game/formulas/formulas";
import { createCostRequirement, CostRequirementOptions } from "game/requirements";
import { createUpgrade } from "features/clickables/upgrade";
import { format } from "util/break_eternity";
import { createCumulativeConversion } from "features/conversion";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createReset } from "features/reset";
import mercury from '../mercury';
import { main } from "data/projEntry";
import Column from "components/layout/Column.vue";
import Spacer from "components/layout/Spacer.vue";

const id = "Md";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury";
  const color = "#b1adad";

  const mercurialDust = createResource(0, "mercurial dust", 2);
  const totalMercurialDust = trackTotal(mercurialDust);

  const timeSinceReset = createResource<DecimalSource>(0);
  const totalTimeSinceReset = trackTotal(timeSinceReset);

  const unlocked = noPersist(solarLayer.mercuryUpgrade.bought);

  // const createBasicCost = (resource: Resource, cost: Decimal) => {
  //   return createCostRequirement((): CostRequirementOptions => ({
  //     resource: noPersist(resource),
  //     cost: cost
  //   }));
  // }

  const basicUpgrades = {
    totalUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(500)
      })),
      display: {
        title: "???",
        description: "Increases base time speed by total time since last reset.",
        effectDisplay: (): string => `+${format(totalTimeModifier.apply(0))}`
      }
    })),
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
    accelerationUpgrade: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(mercurialDust),
        cost: Decimal.fromNumber(1000)
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
        cost: Formula.variable(repeatables.baseDustGain.amount).pow_base(1.8).times(20)
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
      cost: Formula.variable(repeatables.dustMultiplier.amount).pow_base(1.5).times(30)
    })),
    display: {
      title: "Enriched Dust",
      description: "Multiply dust gain by x1.2 per level",
      effectDisplay: () => {
        const c: any = dustMultiplierModifier.apply(1);
        return `x${format(c, 1)}`;
      }
    }
  })),
  };

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
      .times(baseTimeRateModifier.apply(1))
      .times(slippingTimeModifier.apply(1))
  );

  const chunkUnlockUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(250)
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
      multiplier: () => Decimal.dOne.add(Decimal.times(0.2, repeatables.dustMultiplier.amount.value)),
      enabled: () => Decimal.gt(repeatables.dustMultiplier.amount.value, 0)
    }))
  ]);

  const conversion = createCumulativeConversion(() => {
    const addend = computed(() => baseDustGainModifier.apply(0))
    const multiplier = computed(() => Decimal.clampMin(dustMultiplierModifier.apply(1), 1));

    return {
      formula: x => x.div(2).pow(0.3).add(addend).times(multiplier),
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
    classes: {"small": true},
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
          {renderRow(
            repeatables.baseDustTime,
            repeatables.baseDustGain,
            repeatables.dustMultiplier,
          )}
        </Column>
        <Spacer />
        <Column>
          {renderRow(
            basicUpgrades.messengerGodUpgrade,
            basicUpgrades.slippingTimeUpgrade,
            chunkUnlockUpgrade,
          )}
          {renderRow(
            basicUpgrades.totalUpgrade,
            basicUpgrades.accelerationUpgrade
          )}
        </Column>
      </>
    ),
    treeNode,
  };
});

export default layer;