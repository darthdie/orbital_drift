/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render } from "util/vue";
import { createLayerTreeNode } from "../common";
import { computed, unref } from "vue";
import Decimal, { format } from "util/bignum";
import { noPersist } from "game/persistence";
import { createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import dustTab from './mercury/dust';
import chunksTab from './mercury/chunks';
import { Conversion } from "features/conversion";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import milestones from './mercury/milestones';
import accelerators from './mercury/accelerators';

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

  const maxCollisionTime = Decimal.times(1e88, 84600)
  const collisionTime = createResource<DecimalSource>(maxCollisionTime);


  const collisionTimeProgressBar = createBar(() => ({
    progress: () => Decimal.div(collisionTime.value, maxCollisionTime),
    width: 512,
    height: 10,
    direction: Direction.Right,
    containerStyle: {
      'text-align': 'center'
    }
  }))

  const baseTimeRateModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      multiplier: 1.5,
      enabled: dustTab.basicUpgrades.messengerGodUpgrade.bought,
      description: "Messenger God"
    })),
  ]);

  const collisionTimeGainComputed = computed(
    () => new Decimal(1)
      // .add(chunksTab.chuckingChunksModifier.apply(0))
      .times(baseTimeRateModifier.apply(1))
      .times(dustTab.accelerationModifier.apply(1))
      .times(milestones.firstMilestoneModifier.apply(1))
      // .times(accelerators.timeAccelerator.bringItHomeEffect.value)
      .pow(dustTab.collisionCourseEffect.value)
      .pow(milestones.fourthMilestoneModifier.value)
      .pow(chunksTab.collidingChunksEffect.value)
      // collidingChunksModifier
  );

  baseLayer.on("update", diff => {
    if (!unlocked.value) {
      return;
    }

    collisionTime.value = Decimal.sub(
      collisionTime.value,
      Decimal.times(
        collisionTimeGainComputed.value,
        diff
      )
    ).clampMin(0);
  });

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer],
    onReset: () => {
      console.log('resetting mercury')
    }
  }));

  const treeNode = createLayerTreeNode(() => ({
    visibility: unlocked,
    layerID: id,
    color,
    reset
  }));

  const tabs = createTabFamily({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: dustTab.display
      }))
    }),
    chunks: () => ({
      visibility: dustTab.unlocks.chunks.bought,
      display: () => (<>Chunks {Decimal.gte(unref((chunksTab.conversion as Conversion).actualGain), 1) ? "!" : null}</>),
      tab: createTab(() => ({
        display: chunksTab.display
      }))
    }),
    accelerators: () => ({
      visibility: dustTab.unlocks.accelerators.bought,
      display: "Accelerators",
      tab: createTab(() => ({ display: accelerators.display }))
    }),
    milestones: () => {
      return {
        visibility: dustTab.unlocks.chunks.bought,
        display: "Milestones",
        tab: createTab(() => ({
          display: milestones.display
        }))
      };
    }
  })

  return {
    name,
    color,
    collisionTime,
    maxCollisionTime,
    tabs,
    collisionTimeGainComputed,
    display: () => (
      <>
        {Decimal.lt(collisionTime.value, 86400) ? (
          <h2>{format(Decimal.div(collisionTime.value, 3600))} hours until collision</h2>
        ) : (
          <h2>{format(Decimal.div(collisionTime.value, 86400))} days until collision</h2>
        )}

        <h4>-{format(collisionTimeGainComputed.value)}/s</h4>
        {render(collisionTimeProgressBar)}
        <Spacer/>
        {render(tabs)}
      </>
    ),
    treeNode,
  };
});

export default layer;
