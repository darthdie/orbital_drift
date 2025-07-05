import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { chunkArray, createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion, createIndependentConversion, setupPassiveGeneration } from "features/conversion";
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
import { createLazyProxy } from "util/proxies";
import acceleratorsLayer from './accelerators';
import solarLayer from '../solar';

const id = "Mc";
const layer = createLayer(id, baseLayer => {
  const name = "Mercury Chunks";
  const color = "#68696d";

  const chunks = createResource(0, "mercurial chunks");
  const totalChunks = trackTotal(chunks);

  const conversion = createIndependentConversion(() => {
    const computedLovingChunks = computed(() => {
      return Decimal.clampMin(lovingChunksModifier.apply(0), 1);
    });

    return {
      formula: x => x
        .mul(computedLovingChunks)
        .mul(acceleratorsLayer.chunkAccelerator.chunkCostDivisionEffect)
        .mul(fuckingChunksEffect)
        // .mul(solarLayer.mercuryRetainedSpeedModifer.apply(1))
        .div(1000) // starting cost
        // .div()
        .step(1, f => f.div(30))
        .step(5, f => f.div(2))
        .step(10, f => f.sqrt().div(1000).div(totalChunks).pow(0.1))
        .step(30, f => f.sqrt()),
      baseResource: dustLayer.mercurialDust,
      currentGain: computed((): Decimal => {
        return Decimal.floor(conversion.formula.evaluate(dustLayer.totalMercurialDust.value))
          // .max(chunks.value)
          .max(totalChunks.value)
          .min(Decimal.add(totalChunks.value, 1))
          // .min(Decimal.add(chunks.value, 1));
      }),
      actualGain: computed((): Decimal => {
        return Decimal.sub(
          conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
          // chunks.value
          totalChunks.value
        ).floor().max(0).min(1);
      }),
      gainResource: noPersist(chunks),
      spend: () => { },
    };
  });

  const autoChunker = createLazyProxy((_) => {
    watch(dustLayer.mercurialDust, () => {
      if (!upgrades.autoChunks.bought.value) {
        return;
      }

      conversion.convert();
    });

    return {};
  });

  const chuckingChunksModifier = createSequentialModifier(() => [
    createAdditiveModifier((): AdditiveModifierOptions => ({
      enabled: upgrades.chuckingChunks.bought,
      addend: () => totalChunks.value,
      description: "Chuckin' Chunks"
    }))
  ]);

  const lovingChunksModifier = createSequentialModifier(() => [
    createAdditiveModifier((): AdditiveModifierOptions => ({
      enabled: upgrades.lovingChunks.bought,
      addend: () => Decimal.add(dustLayer.mercurialDust.value, 1).log10().pow(0.2),
      description: "Lovin' Chunks"
    }))
  ]);

  const collidingChunksEffect = computed(() => {
    if (upgrades.collidingChunks.bought.value) {
      return Decimal.add(totalChunks.value, 1).log10().sqrt().clampMin(1);
    }

    return Decimal.dOne;
  });

  const fuckingChunksEffect = computed((): Decimal => {
    if (upgrades.fuckingChunks.bought.value) {
      return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1).log10().cbrt().clampMin(1);
    }

    return Decimal.dOne;
  });

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
        title: "Lovin' Chunks",
        description: "Reduce chunk cost based on dust",
        effectDisplay: () => `+${format(lovingChunksModifier.apply(0))}`
      }
    })),

    autoChunks: createUpgrade(() => ({
      visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(35)
      })),
      display: {
        title: "Autoin' Chunks",
        description: "Automatically reset for chunks, and they reset nothing."
      }
    })),

    collidingChunks: createUpgrade(() => ({
      visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(55)
      })),
      display: {
        title: "Collidin' Chunks",
        description: "Raise collision time rate based on chunks",
        effectDisplay: () => `^${format(collidingChunksEffect.value)}`
      }
    })),

    fuckingChunks: createUpgrade(() => ({
      visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(90)
      })),
      display: {
        title: "Fuckin' Chunks",
        description: "Reduce chunk cost based on collision time rate",
        effectDisplay: () => `÷${format(fuckingChunksEffect.value)}`
      }
    })),
  };

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset,
    display: "C",
    classes: { "small": true }
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

  const fullReset = () => {
    createReset(() => ({ thingsToReset: () => [layer]})).reset();
    chunks.value = 0;
    totalChunks.value = 0;
  };

  return {
    id,
    name,
    color,
    // reset,
    fullReset,
    resetButton,
    chunks,
    totalChunks,
    conversion,
    upgrades,
    chuckingChunksModifier,
    treeNode,
    collidingChunksEffect,
    autoChunker,
    display: () => (<>
      <h2>You have {format(chunks.value)} mercurial chunks</h2>
      <h4>You have condensed a total of {format(totalChunks.value)}</h4>
      <h6>You have gathered a total of {format(dustLayer.totalMercurialDust.value)}</h6>
      <Spacer />
      {render(resetButton)}
      <Spacer />
      <h3>Upgrades</h3>
      <Spacer />
      <Column>
        {chunkArray(Object.values(upgrades), 4).map(group => renderRow.apply(null, group))}
      </Column>
    </>)
  };
});

export default layer;