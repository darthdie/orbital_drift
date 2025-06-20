import Spacer from "components/layout/Spacer.vue";
import { createLayerTreeNode } from "data/common";
import { createUpgrade } from "features/clickables/upgrade";
import { createReset } from "features/reset";
import { createResource, trackBest, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { createCostRequirement } from "game/requirements";
import { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render } from "util/vue";
import { unref } from "vue";

const id = "S";
const layer = createLayer(id, baseLayer => {
  const name = "Solar";
  const color = "#FFCC33";

  const energy = createResource<DecimalSource>(1, "solar energy");
  const best = trackBest(energy);
  const total = trackTotal(energy);

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
  }));

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset
  }));

  
  const mercuryUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(energy),
      cost: 1
    })),
    display: {
      description: (): string => mercuryUpgrade.bought.value ? "Mercury Unlocked" : "Unlock Mercury"
    }
  }));
    
  return {
    name,
    energy,
    best,
    total,
    color,
    mercuryUpgrade,
    display: () => (
      <>
        <h2>You have {format(energy.value)} solar energy</h2>
        <h4>You have made a total of {format(best.value)}</h4>
        <Spacer/>
        {render(mercuryUpgrade)}
      </>
    ),
    treeNode,
  };
});

export default layer;