import { createResource, trackBest, trackTotal } from "features/resources/resource";
import { branchedResetPropagation, createTree, Tree } from "features/trees/tree";
import type { Layer } from "game/layers";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import player, { Player } from "game/player";
import { format, formatTime, type DecimalSource } from "util/bignum";
import { render } from "util/vue";
import { computed } from "vue";
import mercury from "./layers/mercury";
import mercuryDustTab from './layers/mercury/dust';
import solar from "./layers/solar";
import Node from "components/Node.vue";
import Spacer from "components/layout/Spacer.vue";

/**
 * @hidden
 */
export const main = createLayer("main", layer => {
  const planets = createResource<DecimalSource>(1);
  const best = trackBest(planets);
  const total = trackTotal(planets);

  // Note: Casting as generic tree to avoid recursive type definitions
  const tree = createTree(() => ({
    nodes: noPersist([
      [mercury.treeNode],
      [solar.treeNode],
    ]),
    branches: [
      { startNode: solar.treeNode, endNode: mercury.treeNode }
    ],
    onReset() {
      // planets.value = toRaw(tree.resettingNode.value) === toRaw(prestige.treeNode) ? 0 : 10;
      // best.value = planets.value;
      // total.value = planets.value;
    },
    resetPropagation: branchedResetPropagation
  })) as Tree;

  // Note: layers don't _need_ a reference to everything,
  //  but I'd recommend it over trying to remember what does and doesn't need to be included.
  // Officially all you need are anything with persistency or that you want to access elsewhere
  return {
    name: "Tree",
    links: tree.links,
    display: () => (
      <>
        {player.devSpeed === 0 ? (
            <div>
                Game Paused
                <Node id="paused" />
            </div>
        ) : null}
        {player.devSpeed != null && player.devSpeed !== 0 && player.devSpeed !== 1 ? (
            <div>
                Dev Speed: {format(player.devSpeed)}x
                <Node id="devspeed" />
            </div>
        ) : null}
        {player.offlineTime != null && player.offlineTime !== 0 ? (
            <div>
                Offline Time: {formatTime(player.offlineTime)}
                <Node id="offline" />
            </div>
        ) : null}
        <Spacer />
        {render(tree)}
      </>
    ),
    points: planets,
    best,
    total,
    tree
  };
});

/**
 * Given a player save data object being loaded, return a list of layers that should currently be enabled.
 * If your project does not use dynamic layers, this should just return all layers.
 */
export const getInitialLayers = (
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  player: Partial<Player>
): Array<Layer> => [main, solar, mercury, mercuryDustTab];

/**
 * A computed ref whose value is true whenever the game is over.
 */
export const hasWon = computed(() => {
  return false;
});

/**
 * Given a player save data object being loaded with a different version, update the save data object to match the structure of the current version.
 * @param oldVersion The version of the save being loaded in
 * @param player The save data being loaded in
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export function fixOldSave(
  oldVersion: string | undefined,
  player: Partial<Player>
  // eslint-disable-next-line @typescript-eslint/no-empty-function
): void { }
/* eslint-enable @typescript-eslint/no-unused-vars */
