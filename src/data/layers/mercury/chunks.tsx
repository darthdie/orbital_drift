import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createIndependentConversion } from "features/conversion";
import dustLayer from "./dust";
import { createResource, trackTotal } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed, unref, watch } from "vue";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderGroupedObjects } from "util/vue";
import Spacer from "components/layout/Spacer.vue";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import {
    AdditiveModifierOptions,
    createAdditiveModifier,
    createSequentialModifier
} from "game/modifiers";
import mercuryLayer from "../mercury";
import { createLazyProxy } from "util/proxies";
import acceleratorsLayer from "./accelerators";
import solarLayer from "../solar";

const id = "Mc";
const layer = createLayer(id, () => {
    const name = "Mercury Chunks";
    const color = "#68696d";

    const chunks = createResource<DecimalSource>(0, "Mercurial Chunks");
    const totalChunks = trackTotal(chunks);

    const conversion = createIndependentConversion(() => {
        const computedLovingChunks = computed(() => {
            return Decimal.clampMin(lovingChunksModifier.apply(0), 1);
        });

        const post10ScalingDivider = computed(() => {
            if (Decimal.lt(chunks.value, 10)) {
                return Decimal.dOne;
            }

            return Decimal.sub(chunks.value, 9).add(1).clampMin(1);
            // return Decimal.fromValue(totalChunks.value).sub(9).add(1).clampMin(1);
        });

        const post20ScalingDivider = computed(() => {
            if (Decimal.lt(chunks.value, 20)) {
                return Decimal.dOne;
            }

            const level = Decimal.sub(chunks.value, 19);
            return Decimal.times(90, Decimal.pow(1.125, Decimal.pow(level, 1.45)));
        });

        const post1000ScalingDivisor = computed(() => {
            if (Decimal.lt(chunks.value, 1000)) {
                return Decimal.dOne;
            }
            return Decimal.sub(chunks.value, 999).times(3).clampMin(1);
        });

        return {
            formula: x =>
                x
                    .mul(computedLovingChunks)
                    .mul(acceleratorsLayer.chunkAccelerator.chunkCostDivisionEffect)
                    .mul(fuckingChunksEffect)
                    .mul(cheapingChunksEffect)
                    .mul(solarLayer.mercuryTreeEffects.nowIHaveTwo)
                    .mul(acceleratorsLayer.chunkAccelerator.pebbleSmasherEffect)
                    .div(1000) // starting cost
                    .step(1, f => f.div(30))
                    .step(5, f => f.div(2))
                    .step(10, f => f.cbrt().div(post10ScalingDivider))
                    .step(20, f => f.sqrt().div(post20ScalingDivider))
                    .step(29, f => f.sqrt())
                    .step(100, f => f.div(350).pow(0.7))
                    .step(1000, f => f.sqrt().div(post1000ScalingDivisor)),
            baseResource: dustLayer.mercurialDust,
            gainResource: noPersist(chunks),
            currentGain: computed((): Decimal => {
                return Decimal.floor(
                    conversion.formula.evaluate(dustLayer.totalMercurialDust.value)
                )
                    .max(chunks.value)
                    .min(Decimal.add(chunks.value, 1));
            }),
            actualGain: computed((): Decimal => {
                return Decimal.sub(
                    conversion.formula.evaluate(dustLayer.totalMercurialDust.value),
                    chunks.value
                )
                    .floor()
                    .max(0)
                    .min(1)
                    .clampMax(1);
            }),
            spend: () => {},
            convert: () => {
                chunks.value = Decimal.add(chunks.value, 1);
            }
        };
    });

    const autoChunker = createLazyProxy(() => {
        watch(dustLayer.mercurialDust, () => {
            if (!upgrades.autoChunks.bought.value || unref(resetButton.canClick) === false) {
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
        createAdditiveModifier(
            (): AdditiveModifierOptions => ({
                enabled: upgrades.chuckingChunks.bought,
                addend: () => totalChunks.value,
                description: "Chuckin' Chunks"
            })
        )
    ]);

    const lovingChunksModifier = createSequentialModifier(() => [
        createAdditiveModifier(
            (): AdditiveModifierOptions => ({
                enabled: upgrades.lovingChunks.bought,
                addend: () => Decimal.add(dustLayer.mercurialDust.value, 1).log10().pow(0.2),
                description: "Lovin' Chunks"
            })
        )
    ]);

    const collidingChunksEffect = computed(() => {
        if (upgrades.collidingChunks.bought.value) {
            return Decimal.add(totalChunks.value, 1).log10().sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const fuckingChunksEffect = computed((): Decimal => {
        if (upgrades.splinteringChunks.bought.value) {
            return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1)
                .log10()
                .sqrt()
                .clampMin(1);
        }

        return Decimal.dOne;
    });

    const cheapingChunksEffect = computed((): Decimal => {
        if (upgrades.cheapingChunks.bought.value) {
            return Decimal.cbrt(chunks.value).clampMin(1);
        }

        return Decimal.dOne;
    });

    const speedingChunksEffect = computed((): Decimal => {
        if (upgrades.speedingChunks.bought.value) {
            return Decimal.pow(chunks.value, 0.5).log2().clampMin(1);
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
                effectDisplay: () =>
                    `${format(Decimal.times(dustLayer.passiveGenerationPerSecondEffect.value, 100))}%/s`
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
            visibility: (): boolean => {
                return (
                    acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought.value ||
                    upgrades.autoChunks.bought.value
                );
            },
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
                resource: chunks,
                cost: 50
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
                resource: chunks,
                cost: 70
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
                resource: chunks,
                cost: 85
            })),
            display: {
                title: "Cheapin' Chunks",
                description: "Reduce Chunk cost based on Chunks",
                effectDisplay: () => `÷${format(cheapingChunksEffect.value)}`
            }
        })),

        speedingChunks: createUpgrade(() => ({
            visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
            requirements: createCostRequirement(() => ({
                resource: chunks,
                cost: 100
            })),
            display: {
                title: "Speedin' Chunks",
                description: "Boost Time Acceleron gain based on Chunks.",
                effectDisplay: () => `x${format(speedingChunksEffect.value)}`
            }
        }))

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
        classes: { small: true }
    }));

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [dustLayer, mercuryLayer]
    }));

    const resetButton = createResetButton(() => ({
        conversion,
        treeNode,
        resetDescription: () => `Condense your dust & time for `,
        onClick: () => {
            dustLayer.reset.reset();
        }
    }));

    const fullReset = () => {
        createReset(() => ({ thingsToReset: () => [layer] })).reset();
        if (solarLayer.mercuryTreeUpgrades.secretChunkStash.bought.value) {
            const chunksGained = 3;
            dustLayer.unlocks.chunks.bought.value = true;

            chunks.value = chunksGained;
            totalChunks.value = chunksGained;
        }
    };

    watch(solarLayer.mercuryTreeUpgrades.secretChunkStash.bought, bought => {
        if (!bought) {
            return;
        }

        chunks.value = Decimal.max(chunks.value, 3);
        dustLayer.unlocks.chunks.bought.value = true;
    });

    const showExclamation = computed(() => {
        return Decimal.gte(unref(conversion.actualGain), 1) && !upgrades.autoChunks.bought.value;
    });

    const displayGlow = computed(() => {
        return showExclamation.value || Object.values(upgrades).some(u => u.canPurchase.value);
    });

    return {
        id,
        name,
        color,
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
        speedingChunksEffect,
        displayGlow,
        display: () => (
            <>
                <h2>
                    You have {format(chunks.value)} {chunks.displayName}
                </h2>
                <h4>You have condensed a total of {format(totalChunks.value)}</h4>
                <h6>You have gathered a total of {format(dustLayer.totalMercurialDust.value)}</h6>
                <Spacer />
                {render(resetButton)}
                <Spacer />
                <h3>Upgrades</h3>
                <Spacer />
                {renderGroupedObjects(upgrades, 4)}
            </>
        )
    };
});

export default layer;
