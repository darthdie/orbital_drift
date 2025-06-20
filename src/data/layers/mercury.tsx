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

const id = "M";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury";
  const color = "#8c8c94";

  const unlocked = noPersist(solarLayer.mercuryUpgrade.bought);

  const mercurialDust = createResource(0, "mercurial dust", 2);

  const collisionTime = createResource<DecimalSource>(88, "days", 2);

  const baseTickAmountModifier = createSequentialModifier(() => [
    createAdditiveModifier(() => ({
      addend: () => baseCollisionTimeRepeatable.amount.value
    }))
  ]);

  const tickAmount = computed(
    () => new Decimal(1).add(baseTickAmountModifier.apply(0))
  );

  const timeSinceReset = createResource<DecimalSource>(0);

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    timeSinceReset.value = Decimal.add(
      timeSinceReset.value,
      Decimal.times(tickAmount.value, diff)
    );

    collisionTime.value = Decimal.sub(
      collisionTime.value,
      Decimal.times(
        tickAmount.value.div(86400),
        diff
      )
    ).clampMin(0);
  });

  const conversion = createCumulativeConversion(() => ({
    formula: x => x.div(2).pow(0.3),
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

  const baseCollisionTimeRepeatable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(mercurialDust),
      cost: Formula.variable(baseCollisionTimeRepeatable.amount.value).add(1).times(3)
    })),
    display: {
      title: "Align the Stars",
      description: "Increase the base collision timer by 1/s",
      effectDisplay: () => {
        const c: any = baseTickAmountModifier.apply(0);
        return `+${c}/s`;
      }
    }
  }));

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
    baseTickAmountModifier,
    baseCollisionTimeRepeatable,
    display: () => (
      <>
        <h2>{format(collisionTime.value)} days until collision</h2>
        <h4>-{format(tickAmount.value)}/s</h4>
        <Spacer/>
        <Spacer/>
        <h2>{format(mercurialDust.value)} mercurial dust</h2>
        <h4>It has been {format(timeSinceReset.value)} seconds since the last reset.</h4>
        {render(resetButton)}
        <Spacer/>
        <Column>
          {renderRow(
            baseCollisionTimeRepeatable,
          )}
        </Column>
      </>
    ),
    // drift,
    // driftGainMultiplier,
    // driftChance,
    // timer,
    // timerGain,
    // timerMax,
    // instability,
    // timerMaxRepeatable,
    // driftChanceRepeatable,
    // driftMultiplierRepeatable,
    // display: () => (
    //   <>
    //     <h2>You have {format(drift.value)}</h2>
    //     <br></br>
    //     <p>Timer: {format(timer.value)}/{format(timerMax.value)}</p>
    //     <p>Chance: {format(driftChance.value)}%</p>
    //     <p>Multiplier: {format(driftGainMultiplier.value)}</p>
    //     <br />
    //     <br />
    //     <h3>You have {format(instability.value)} instability</h3>
    //     {render(resetButton)}
    //     <br />
    //     <br />
    //     <Column>
    //       {renderRow(
    //         timerMaxRepeatable,
    //         driftChanceRepeatable,
    //         driftMultiplierRepeatable,
    //       )}
    //     </Column>
    //   </>
    // ),
    treeNode,

    // hotkey
  };
});

export default layer;
