import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { chunkArray, createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion, createIndependentConversion } from "features/conversion";
import dustLayer from './dust';
import { createResource, trackTotal } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed, watch } from "vue";
import Decimal from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderRow } from "util/vue";
import Spacer from "components/layout/Spacer.vue";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import Column from "components/layout/Column.vue";
import { AdditiveModifierOptions, createAdditiveModifier, createExponentialModifier, createSequentialModifier, ExponentialModifierOptions } from "game/modifiers";
import mercuryLayer from '../mercury';

const id = "Mc";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury Chunks";
  const color = "#68696d";

  const chunks = createResource(0, "mercurial chunks");
  const totalChunks = trackTotal(chunks);
  watch(chunks, () => {
    console.log('fuck this goddamn game engine dude', totalChunks.value)
  })

  const conversion = createIndependentConversion(() => {
    const computedLovingChunks = computed(() => {
      return Decimal.clampMin(lovingChunksModifier.apply(0), 1);
    });

    return {
      formula: x => x
          // .sub(lovingChunksModifier.apply(0))
          .mul(computedLovingChunks)
          .div(1000)
          .step(1, f => f.div(25)),
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
    createAdditiveModifier((): AdditiveModifierOptions => ({
      enabled: upgrades.chuckingChunks.bought,
      addend: () => totalChunks.value,
      description: "Chuckin' Chinks"
    }))
  ]);

  const lovingChunksModifier = createSequentialModifier(() => [
    createAdditiveModifier((): AdditiveModifierOptions => ({
      enabled: upgrades.lovingChunks.bought,
      addend: () => Decimal.add(dustLayer.mercurialDust.value, 1).log10().pow(0.2),
      description: "Lovin' Chunks"
    }))
  ])

  const upgrades = {
    chuckingChunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Chuckin' Chunks",
        description: "Increase base reset time by your total chunks",
        effectDisplay: () => `+${format(chuckingChunksModifier.apply(0))}`
      }
    })),

    grindingChunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Grindin' Chunks",
        description: "Gain dust per second equal to your total chunks",
        effectDisplay: () => `${format(totalChunks.value)}/s`
      }
    })),

    lovingChunks: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(3)
      })),
      display: {
        title: "Lovein' Chunks",
        description: "Reduce chunk cost based on dust",
        effectDisplay: () => `+${format(lovingChunksModifier.apply(0))}`
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
    thingsToReset: (): Record<string, unknown>[] => [dustLayer, mercuryLayer]
  }));

  const resetButton = createResetButton(() => ({
    conversion,
    tree: main.tree,
    treeNode,
    resetDescription: () => `Condense your dust & time for `,
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