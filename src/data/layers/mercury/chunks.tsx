import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { chunkArray, createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion, createIndependentConversion } from "features/conversion";
import dustLayer from './dust';
import { createResource, trackTotal } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed } from "vue";
import Decimal from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderRow } from "util/vue";
import Spacer from "components/layout/Spacer.vue";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import Column from "components/layout/Column.vue";
import { createExponentialModifier, createSequentialModifier, ExponentialModifierOptions } from "game/modifiers";

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
          .step(1, f => f.div(25));
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

  const chuckingChunksModifier = createSequentialModifier(() => [
    createExponentialModifier((): ExponentialModifierOptions => ({
      enabled: upgrades.chuckingChunks.bought,
      exponent: () => Decimal.dOne.add(Decimal.times(0.01, totalChunks.value)),
      supportLowNumbers: true,
    }))
  ]);

  const upgrades = {
    chuckingChunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Chuckin' Chunks",
        description: "Raise collision time based on total chunks",
        effectDisplay: () => `^${format(chuckingChunksModifier.apply(1))}`
      }
    })),

    grindingChunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Grindin' Chunks",
        description: "Gain 5% of dust per second",
        effectDisplay: () => `5%/s`
      }
    })),

    chunkDial: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Chunk Dial",
        description: "Raise dust gain based on total chunks",
        effectDisplay: () => `^.1 per level perhaps?`
      }
    }))
  };

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
    chuckingChunksModifier,
    treeNode,
    display: () => (<>
      <h2>You have {format(chunks.value)} mercurial chunks</h2>
      <h4>You have condensed a total of {format(totalChunks.value)}</h4>
      <h6>You have gathered a total of {format(dustLayer.totalMercurialDust.value)}</h6>
      <Spacer/>
      {render(resetButton)}
      <Spacer/>
      <h3>Upgrades</h3>
      <Spacer/>
      <Column>
        {chunkArray(Object.values(upgrades), 4).map(group => renderRow.apply(null, group))}
      </Column>
    </>)
  };
});

export default layer;