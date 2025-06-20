import { createLayerTreeNode } from "data/common";
import { createReset } from "features/reset";
import { createLayer } from "game/layers";

const id = "S";
const layer = createLayer(id, baseLayer => {
  const name = "Solar";
  const color = "#FFCC33";

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
  }));

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset
  }));
    
  return {
    name,
    display: () => (
      <>
        <h2>You have 0</h2>
      </>
    ),
    treeNode,
  };
});

export default layer;