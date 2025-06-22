/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion } from "features/conversion";
import { createReset } from "features/reset";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { computed, unref } from "vue";
import Decimal, { format } from "util/bignum";
import { createRepeatable, Repeatable, RepeatableOptions } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import { noPersist } from "game/persistence";
import { createAdditiveModifier, createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import Column from "components/layout/Column.vue";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createUpgrade } from "features/clickables/upgrade";

/* TODO:
  upgrade/repeatable: seconds increases itself (acceleration)
  rename: "reset time" to something more thematic
  add milestones
  add solar rays

  I need
*/

/*
  Add toggle to enable/disable mercurial dust gain, which enables/disables collision time?
  Then add upgrades that boost based on collision time?
*/

const id = "M";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury";
  const color = "#8c8c94";

  const unlocked = noPersist(solarLayer.mercuryUpgrade.bought);

  const mercurialDust = createResource(0, "mercurial dust", 2);

  const collisionTime = createResource<DecimalSource>(7603200);

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: messengerGodUpgrade.bought
    })),
  ]);

  const baseDustAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => baseDustTimeRepeatable.amount.value
    }))
  ]);

  const tickAmount = computed(
    () => new Decimal(1)
      // .add(baseTickAmountModifier.apply(0))
      .times(baseTimeRateModifier.apply(1))
      .times(accelerationModifier.apply(1))
  );

  const baseTimeSinceResetGain = computed(
    () => Decimal.dOne
        .add(baseDustAmountModifier.apply(0))
        .times(baseTimeRateModifier.apply(1))
        .times(slippingTimeModifier.apply(1))
  )

  const timeSinceReset = createResource<DecimalSource>(0);

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

    collisionTime.value = Decimal.sub(
      collisionTime.value,
      Decimal.times(
        tickAmount.value,
        diff
      )
    ).clampMin(0);
  });

  const conversion = createCumulativeConversion(() => ({
    formula: x => x.div(2).pow(0.3).times(dustMultiplierModifier.apply(1)),
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
      collisionTime.value = collisionTime.defaultValue;
    }
  }));

  const resetButton = createResetButton(() => ({
    conversion,
    tree: main.tree,
    treeNode,
    showNextAt: false,
    resetDescription: () => `Reset both reset time and collision time for `
  }));

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

  const dustMultiplierModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: () => Decimal.dOne.add(Decimal.times(0.1, dustMultiplierRepeatable.amount.value)),
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
      description: "Increase dust gain by x1.1 per level",
      effectDisplay: () => {
        const c: any = dustMultiplierModifier.apply(1);
        return `*${format(c, 1)}`;
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

  const accelerationModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => accelerationUpgrade.bought.value,
      // x: TSLR
      multiplier: () => Decimal.sqrt(timeSinceReset.value).pow(0.25)
    }))
  ]);

  const slippingTimeModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: slippingTimeUpgrade.bought,
      multiplier: () => Decimal.log10(timeSinceReset.value).pow(0.6)
    }))
  ])

  const slippingTimeUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(mercurialDust),
      cost: Decimal.fromNumber(100)
    })),
    display: {
      title: "Slippery Time",
      description: "Increases rate of reset time by itself.",
      effectDisplay: (): string => `x${format(slippingTimeModifier.apply(1))}`
    }
  }))

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
  }))

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
  }));

  const treeNode = createLayerTreeNode(() => ({
    visibility: unlocked,
    layerID: id,
    color,
    reset
  }));

  return {
    name,
    color,
    collisionTime,
    timeSinceReset,
    mercurialDust,
    baseDustAmountModifier,
    baseDustTimeRepeatable,
    dustMultiplierModifier,
    dustMultiplierRepeatable,
    messengerGodUpgrade,
    accelerationUpgrade,
    slippingTimeUpgrade,
    slippingTimeModifier,
    display: () => (
      <>
        {Decimal.lt(collisionTime.value, 86400) ? (
          <h2>{format(Decimal.div(collisionTime.value, 3600))} hours until collision</h2>
        ) : (
          <h2>{format(Decimal.div(collisionTime.value, 86400))} days until collision</h2>
        )}

        <h4>-{format(tickAmount.value)}/s</h4>
        <Spacer/>
        <Spacer/>
        <h2>{format(mercurialDust.value)} mercurial dust</h2>
        <h4>It has been {format(timeSinceReset.value)} seconds since the last reset.</h4>
        <small>A second is worth {format(baseTimeSinceResetGain.value)} real seconds</small>
        <Spacer/>
        {render(resetButton)}
        <Spacer/>
        <Spacer/>
        <Column>
          {renderRow(
            baseDustTimeRepeatable,
            dustMultiplierRepeatable,
          )}
        </Column>
        <Spacer/>
        <Column>
          {renderRow(
            messengerGodUpgrade,
            slippingTimeUpgrade,
            accelerationUpgrade
          )}
        </Column>
      </>
    ),
    treeNode,
  };
});

export default layer;
