import { createResource, trackTotal } from "features/resources/resource";
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
  const color = "#8c8c94";

  const mercurialDust = createResource(0, "mercurial dust", 2);
  const totalMercurialDust = trackTotal(mercurialDust);

  const timeSinceReset = createResource<DecimalSource>(0);
  const totalTimeSinceReset = trackTotal(timeSinceReset);

  const unlocked = noPersist(solarLayer.mercuryUpgrade.bought);

  const totalTimeModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      enabled: totalUpgrade.bought,
      addend: () => totalTimeSinceReset.value
    }))
  ]);

  const totalUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(500)
    })),
    display: {
      title: "???",
      description: "Increases base time speed by total time since last reset.",
      effectDisplay: (): string => `+${format(totalTimeModifier.apply(0))}`
    }
  }));

  const baseDustAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => baseDustTimeRepeatable.amount.value
    }))
  ]);

  const baseDustTimeRepeatable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(mercurialDust),
      cost: Formula.variable(baseDustTimeRepeatable.amount).pow_base(1.3).times(10)
    })),
    display: {
      title: "Align the Stars",
      description: "Increase the base dust timer by +1/s per level",
      effectDisplay: () => {
        const c: any = baseDustAmountModifier.apply(0);
        return `+${c}/s`;
      }
    }
  }));

  const messengerGodUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(50)
    })),
    display: {
      title: "The Messenger God",
      description: "Increase time speed in this layer by x1.5"
    }
  }));

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: messengerGodUpgrade.bought
    })),
  ]);

  const slippingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: slippingTimeUpgrade.bought,
      multiplier: () => Decimal.add(timeSinceReset.value, 1).log10().pow(0.6).clampMin(1)
    }))
  ])

  const slippingTimeUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(100)
    })),
    display: {
      title: "Slippery Time",
      description: "Multiplies rate of reset time based on time since last reset.",
      effectDisplay: (): string => `x${format(slippingTimeModifier.apply(1))}`
    }
  }));

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
      enabled: () => Decimal.gt(baseDustGainRepeatable.amount.value, 0),
      addend: () => baseDustGainRepeatable.amount.value
    }))
  ]);

  const baseDustGainRepeatable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(mercurialDust),
      cost: Formula.variable(baseDustGainRepeatable.amount).pow_base(1.8).times(20)
    })),
    display: {
      title: "Salted Dust",
      description: "Increase base dust gain by +1 per level",
      effectDisplay: () => {
        const c: any = baseDustGainModifier.apply(0)
        return `+${format(c)}`;
      }
    }
  }));

  const dustMultiplierModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: () => Decimal.dOne.add(Decimal.times(0.2, dustMultiplierRepeatable.amount.value)),
      enabled: () => Decimal.gt(dustMultiplierRepeatable.amount.value, 0)
    }))
  ]);

  const dustMultiplierRepeatable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(mercurialDust),
      cost: Formula.variable(dustMultiplierRepeatable.amount).pow_base(1.5).times(30)
    })),
    display: {
      title: "Enriched Dust",
      description: "Multiply dust gain by x1.2 per level",
      effectDisplay: () => {
        const c: any = dustMultiplierModifier.apply(1);
        return `x${format(c, 1)}`;
      }
    }
  }));

  const conversion = createCumulativeConversion(() => {
    const multiplier = computed(() => {
      return Decimal.clampMin(baseDustGainModifier.apply(0), 0).times(dustMultiplierModifier.apply(1));
    });

    return {
      formula: x => x.div(2).pow(0.3).times(multiplier),
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
      enabled: () => accelerationUpgrade.bought.value,
      // x: TSLR
      multiplier: () => Decimal.add(timeSinceReset.value, 1).sqrt().pow(0.25).clampMin(1)
    }))
  ]);

  const accelerationUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(1000)
    })),
    display: {
      title: 'Acceleration',
      description: "Increase collision time rate based on time since last reset",
      effectDisplay: (): string => `x${accelerationModifier.apply(1)}`,
    }
  }));

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
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
    reset
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
    baseDustTimeRepeatable,
    baseDustGainRepeatable,
    baseDustGainModifier,
    dustMultiplierModifier,
    dustMultiplierRepeatable,
    messengerGodUpgrade,
    accelerationUpgrade,
    slippingTimeUpgrade,
    chunkUnlockUpgrade,
    slippingTimeModifier,
    totalUpgrade,
    totalTimeModifier,
    accelerationModifier,
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
            baseDustTimeRepeatable,
            baseDustGainRepeatable,
            dustMultiplierRepeatable,
          )}
        </Column>
        <Spacer />
        <Column>
          {renderRow(
            messengerGodUpgrade,
            slippingTimeUpgrade,
            chunkUnlockUpgrade,
          )}
          {renderRow(
            totalUpgrade,
            accelerationUpgrade
          )}
        </Column>
      </>
    ),
    treeNode,
  };
});

export default layer;