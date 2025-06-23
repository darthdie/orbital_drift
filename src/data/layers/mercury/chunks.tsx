import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion } from "features/conversion";
import dustLayer from './dust';
import { createResource, trackTotal } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed } from "vue";
import Decimal from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render } from "util/vue";
import Spacer from "components/layout/Spacer.vue";

const id = "Mc";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury Chunks";
  const color = "#68696d";

  const chunks = createResource(0, "mercurial chunks");
  const totalChunks = trackTotal(chunks);

  const conversion = createCumulativeConversion(() => {
    return {
      formula: x => x.div(250),
      baseResource: dustLayer.mercurialDust,
      currentGain: computed((): Decimal => {
        return Decimal.floor(conversion.formula.evaluate(dustLayer.totalMercurialDust.value)).max(0);
      }),
      gainResource: noPersist(chunks),
      roundUpCost: true,
      spend: () => {},
      buyMax: false,
    };
  });

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset
  }));

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [dustLayer]
  }));

  const resetButton = createResetButton(() => ({
    conversion,
    tree: main.tree,
    treeNode,
    showNextAt: false,
    resetDescription: () => `Condense your mercurial dust for `
  }));

  return {
    id,
    name,
    color,
    reset,
    resetButton,
    chunks,
    totalChunks,
    conversion,
    treeNode,
    display: () => (<>
      <h2>You have {format(chunks.value)} mercurial chunks</h2>
      <h4>You have made a total of {format(totalChunks.value)}</h4>
      <Spacer/>
      {render(resetButton)}
    </>)
  };
});

export default layer;