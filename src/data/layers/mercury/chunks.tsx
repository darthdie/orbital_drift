import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion, createIndependentConversion } from "features/conversion";
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

  const conversion = createIndependentConversion(() => {
    return {
      formula: x => {
        return x
          .div(1000)
          .step(1, f => f.div(10));
      },
      baseResource: dustLayer.mercurialDust,
      currentGain: computed((): Decimal => {
        return Decimal.floor(conversion.formula.evaluate(dustLayer.totalMercurialDust.value))
          .max(chunks.value)
          .min(Decimal.add(chunks.value, 1));
      }),
      actualGain: computed((): Decimal => {
        return Decimal.sub(
            conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
            chunks.value
        ).floor().max(0).min(1);
      }),
      gainResource: noPersist(chunks),
      spend: () => {},
    };
  });

  const upgrades = {};

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset,
    display: "C",
    classes: {"small": true}
  }));

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [dustLayer]
  }));

  const resetButton = createResetButton(() => ({
    conversion,
    tree: main.tree,
    treeNode,
    resetDescription: () => `Condense your (total) mercurial dust for `,
    onClick: () => {
      dustLayer.reset.reset();
    }
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
    upgrades,
    treeNode,
    display: () => (<>
      <h2>You have {format(chunks.value)} mercurial chunks</h2>
      <h4>You have condensed a total of {format(totalChunks.value)}</h4>
      <h6>You have gathered a total of {format(dustLayer.totalMercurialDust.value)}</h6>
      <Spacer/>
      {render(resetButton)}
    </>)
  };
});

export default layer;