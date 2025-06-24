/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render } from "util/vue";
import { createLayerTreeNode } from "../common";
import { computed } from "vue";
import Decimal, { format } from "util/bignum";
import { noPersist } from "game/persistence";
import { createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import dustTab from './mercury/dust';
import chunksTab from './mercury/chunks';
import { createAchievement } from "features/achievements/achievement";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";

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

  const collisionTime = createResource<DecimalSource>(7603200);

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: dustTab.basicUpgrades.messengerGodUpgrade.bought
    })),
  ]);

  const tickAmount = computed(
    () => new Decimal(1)
      .times(baseTimeRateModifier.apply(1))
      .times(dustTab.accelerationModifier.apply(1))
  );

  const timeSinceReset = createResource<DecimalSource>(0);
  const totalTimeSinceReset = trackTotal(timeSinceReset);

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    collisionTime.value = Decimal.sub(
      collisionTime.value,
      Decimal.times(
        tickAmount.value,
        diff
      )
    ).clampMin(0);
  });

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
  }));

  const treeNode = createLayerTreeNode(() => ({
    visibility: unlocked,
    layerID: id,
    color,
    reset
  }));

  const completedAchievementsCount = computed(() => Object.values(achievements).filter((a) => a.earned.value).length);

  const achievements = {
    first: createAchievement(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: chunksTab.chunks,
        cost: 1
      })),
      display: {
        requirement: "1 Mercurial Chunk",
        optionsDisplay: "Unlock the `Dust Piles` buyable",
        // ^1.1 per total?
      }
    })),
    second: createAchievement(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: chunksTab.chunks,
        cost: 2
      })),
      display: {
        requirement: "2 Mercurial Chunk",
        optionsDisplay: "Keep 1 Dust upgrade per milestone achieved.",
        effectDisplay: (): string => `${completedAchievementsCount.value} upgrades are kept`
      }
    })),
    three: createAchievement(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: chunksTab.chunks,
        cost: 3
      })),
      display: {
        requirement: "3 Mercurial Chunk",
        optionsDisplay: "Unlocks more upgrades?"
      }
    }))
  }

  const tabs = createTabFamily({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: dustTab.display
      }))
    }),
    chunks: () => ({
      visibility: dustTab.chunkUnlockUpgrade.bought,
      display: "Chunks",
      tab: createTab(() => ({
        display: chunksTab.display
      }))
    }),
    milestones: () => ({
      visibility: dustTab.chunkUnlockUpgrade.bought,
      display: "Milestones",
      tab: createTab(() => ({
        display: (<>
        {Object.values(achievements).map(a => render(a))}
        </>)
      }))
    })
  })

  return {
    name,
    color,
    collisionTime,
    timeSinceReset,
    totalTimeSinceReset,
    tabs,
    achievements,
    completedAchievementsCount,
    display: () => (
      <>
        {Decimal.lt(collisionTime.value, 86400) ? (
          <h2>{format(Decimal.div(collisionTime.value, 3600))} hours until collision</h2>
        ) : (
          <h2>{format(Decimal.div(collisionTime.value, 86400))} days until collision</h2>
        )}

        <h4>-{format(tickAmount.value)}/s</h4>
        <Spacer/>
        {render(tabs)}
      </>
    ),
    treeNode,
  };
});

export default layer;
