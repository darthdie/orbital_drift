import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { main } from "data/projEntry";
import { chunkArray, createLayerTreeNode, createResetButton } from "data/common";
import { createCumulativeConversion, createIndependentConversion, setupPassiveGeneration } from "features/conversion";
import dustLayer from './dust';
import { createResource, trackTotal } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed, unref, watch } from "vue";
import Decimal, { DecimalSource } from "lib/break_eternity";
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

  const chunks = createResource<DecimalSource>(0, "mercurial chunks");
  const totalChunks = trackTotal(chunks);

  const conversion = createIndependentConversion(() => {
    const computedLovingChunks = computed(() => {
      return Decimal.clampMin(lovingChunksModifier.apply(0), 1);
    });

    const post10ScalingDivider = computed(() => {
      return Decimal.sub(totalChunks.value, 9).add(1).clampMin(1);
      // return Decimal.fromValue(totalChunks.value).sub(9).add(1).clampMin(1);
    });

    const post20ScalingDivider = computed(() => {
      return Decimal.sub(totalChunks.value, 19).add(10).pow(1.9).clampMin(1);
      // Decimal.fromValue(totalChunks.value).sub(19).times(15).clampMin(1)
      // return Decimal.times(Decimal.sub(Decimal.add(totalChunks.value, 1), 20), 15).clampMin(1)
    });

    const post10000ScalingDivisor = computed(() => {
      return Decimal.sub(totalChunks.value, 99999).pow(0.1).clampMin(1);
    });

    const post1000ScalingDivisor = computed(() => {
      return Decimal.sub(totalChunks.value, 999).times(3).clampMin(1);
    });

    const post30ScalingDivisor = computed(() => {
      return Decimal.sub(totalChunks.value, 29).add(10).pow(1.4).clampMin(1);
    })

    const post35ScalingDivisor = computed(() => {
      return Decimal.sub(totalChunks.value, 34).add(1).pow(1.1).clampMin(1);
    })

    // * 15

    const testDivisor = computed(() => {
      return Decimal.pow(totalChunks.value, Decimal.pow(totalChunks.value, 0.6)).clampMin(1);
    })

    return {
      formula: x => x
        .mul(computedLovingChunks)
        .mul(acceleratorsLayer.chunkAccelerator.chunkCostDivisionEffect)
        .mul(fuckingChunksEffect)
        .mul(cheapingChunksEffect)
        .div(1000) // starting cost
        // .div()
        .step(1, f => f.div(30))
        .step(5, f => f.div(2))
        // .step(10, f => f.cbrt().div(testDivisor)),
        .step(10, f => f.cbrt().div(post10ScalingDivider))
        .step(20, f => f.sqrt().div(post20ScalingDivider))
        .step(30, f => f.sqrt().div(post30ScalingDivisor))
        // .step(35, f => f.sqrt().div(post35ScalingDivisor))
        .step(100, f => f.div(225))
        .step(1000, f => f.sqrt().div(post1000ScalingDivisor)),

        // .step(100000, f => f.div(post10000ScalingDivisor).div(1e1)),
      baseResource: dustLayer.mercurialDust,
      currentGain: computed((): Decimal => {
        return Decimal.floor(conversion.formula.evaluate(dustLayer.totalMercurialDust.value))
          .max(chunks.value)
          .min(Decimal.add(chunks.value, 1))
      }),
      actualGain: computed((): Decimal => {
        // console.log({
        //     actual: Decimal.sub(
        //     conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
        //     chunks.value
        //   ).floor().max(0).min(1).toString(),
        //   potential: Decimal.sub(
        //     conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
        //     totalChunks.value
        //   ).floor().max(0).min(1).toString()
        // })
        return Decimal.sub(
          conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
          chunks.value
        ).floor().max(0).min(1).clampMax(1);
      }),
      gainResource: noPersist(chunks),
      spend: () => { },
      convert: () => {
        chunks.value = Decimal.add(chunks.value, 1);
      }
    };
  });

  const autoChunker = createLazyProxy((_) => {
    watch(dustLayer.mercurialDust, () => {
      if (!upgrades.autoChunks.bought.value || !resetButton.canClick) {
        return;
      }

      if (Decimal.lt(unref(conversion.actualGain), 1)) {
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
    if (upgrades.splinteringChunks.bought.value) {
      return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1).log10().cbrt().clampMin(1);
    }

    return Decimal.dOne;
  });

  const cheapingChunksEffect = computed(() : Decimal => {
    if (upgrades.cheapingChunks.bought.value) {
      return Decimal.sqrt(chunks.value).clampMin(1);
    }

    return Decimal.dOne;
  });

  // const dustingChunksModifer = createSequentialModifier(() => [
  //   createAdditiveModifier((): AdditiveModifierOptions => ({
  //     enabled: upgrades.dustingChunks.bought,
  //     addend: () => Decimal.sqrt(totalChunks.value).clampMin(1)
  //   }))
  // ])

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
        effectDisplay: () => `${format(totalChunks.value)}%/s`
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

    splinteringChunks: createUpgrade(() => ({
      visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(90)
      })),
      display: {
        title: "Splinterin' Chunks",
        description: "Reduce chunk cost based on collision time rate",
        effectDisplay: () => `÷${format(fuckingChunksEffect.value)}`
      }
    })),

    cheapingChunks: createUpgrade(() => ({
      visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
      requirements: createCostRequirement(() => ({
        resource: noPersist(chunks),
        cost: Decimal.fromNumber(135)
      })),
      display: {
        title: "Cheapin' Chunks",
        description: "Reduce Chunk cost based on Chunks",
        effectDisplay: () => `÷${format(cheapingChunksEffect.value)}`
      }
    })),

    // dustingChunks: createUpgrade(() => ({
    //   visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
    //   requirements: createCostRequirement(() => ({
    //     resource: noPersist(chunks),
    //     cost: Decimal.fromNumber(135)
    //   })),
    //   display: {
    //     title: "Dustin' Chunks",
    //     description: "Increase base Dust gain based on Chunks.",
    //     effectDisplay: () => `÷${format(dustingChunksModifer.apply(0))}`
    //   }
    // }))
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
    const chunksGained = solarLayer.mercuryUpgrades.secretChunkStash.bought.value ? 3 : 0;

    chunks.value = chunksGained;
    totalChunks.value = chunksGained;
  };

  watch(solarLayer.mercuryUpgrades.secretChunkStash.bought, bought => {
    if (!bought) {
      return;
    }

    chunks.value = Decimal.max(chunks.value, 3);
  });

  const showExclamation = computed(() => {
    return Decimal.gte(unref(conversion.actualGain), 1) && !upgrades.autoChunks.bought.value;
  });

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
    showExclamation,
    // dustingChunksModifer,
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