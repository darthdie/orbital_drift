import { createReset } from "features/reset";
import { createLayer } from "game/layers";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createIndependentConversion } from "features/conversion";
import dustLayer from "./dust";
import { createResource, displayResource, trackBest } from "features/resources/resource";
import { noPersist } from "game/persistence";
import { computed, unref, watch } from "vue";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderGroupedObjects } from "util/vue";
import Spacer from "components/layout/Spacer.vue";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
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
import "./chunks.css";
import Section from "data/components/Section.vue";
import milestonesLayer from "./milestones";

const id = "Mc";
const layer = createLayer(id, () => {
    const name = "Mercury Chunks";
    const color = "#68696d";

    const chunks = createResource<DecimalSource>(0, "Mercurial Chunks");
    const bestChunks = trackBest(chunks);

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
            const scalingFactor = upgrades.dirtCheap.bought.value ? 1.4 : 1.45;
            return Decimal.times(1, Decimal.pow(1.2, Decimal.pow(level, scalingFactor)));
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

    const chuckingChunksEffect = computed((): DecimalSource => {
        if (upgrades.chuckingChunks.bought.value) {
            return Decimal.times(bestChunks.value, 2).pow(throwingHarderEffect.value).clampMin(1);
        }

        return Decimal.dZero;
    });

    const lovingChunksModifier = createSequentialModifier(() => [
        createAdditiveModifier(
            (): AdditiveModifierOptions => ({
                enabled: upgrades.lovingChunks.bought,
                addend: () =>
                    Decimal.add(dustLayer.mercurialDust.value, 1)
                        .log10()
                        .pow(0.4)
                        .times(marryingChunksEffect.value)
                        .clampMin(1),
                description: "Lovin' Chunks"
            })
        )
    ]);

    const collidingChunksEffect = computed(() => {
        if (upgrades.collidingChunks.bought.value) {
            return Decimal.add(bestChunks.value, 1).log(8).sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const fuckingChunksEffect = computed((): Decimal => {
        if (upgrades.splinteringChunks.bought.value) {
            return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1)
                .log2()
                .sqrt()
                .clampMin(1);
        }

        return Decimal.dOne;
    });

    const cheapingChunksEffect = computed((): Decimal => {
        if (upgrades.cheapingChunks.bought.value) {
            return Decimal.fromValue(bestChunks.value);
        }

        return Decimal.dOne;
    });

    const speedingChunksEffect = computed((): Decimal => {
        if (upgrades.speedingChunks.bought.value) {
            return Decimal.log2(bestChunks.value).clampMin(1);
        }

        return Decimal.dOne;
    });

    const dustingChunksEffect = computed((): DecimalSource => {
        if (upgrades.dustingChunks.bought.value) {
            return bestChunks.value;
        }

        return Decimal.dOne;
    });

    const throwingHarderEffect = computed((): DecimalSource => {
        if (upgrades.throwingHarder.bought.value) {
            return Decimal.log2(bestChunks.value).sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const marryingChunksEffect = computed(() => {
        if (upgrades.marryingChunks.bought.value) {
            return Decimal.pow(bestChunks.value, 1.25).clampMin(1);
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
                description: "Increase base Dust Time by double your best Chunks.",
                effectDisplay: () => `+${format(chuckingChunksEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        grindingChunks: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(chunks),
                cost: Decimal.fromNumber(3)
            })),
            display: {
                title: "Grindin' Chunks",
                description: "Gain Dust per second equal to your best Chunks.",
                effectDisplay: () =>
                    `${format(Decimal.times(dustLayer.passiveGenerationPerSecondEffect.value, 100))}%/s`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        lovingChunks: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(chunks),
                cost: Decimal.fromNumber(3)
            })),
            display: {
                title: "Lovin' Chunks",
                description: "Reduce Chunk cost based on Dust.",
                effectDisplay: () => `÷${format(lovingChunksModifier.apply(0))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
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
                description: "Automatically reset for Chunks, and they reset nothing."
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
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
                description: "Raise Collision Time rate based on Chunks.",
                effectDisplay: () => `^${format(collidingChunksEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
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
                description: "Reduce Chunk cost based on Collision Time rate.",
                effectDisplay: () => `÷${format(fuckingChunksEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        cheapingChunks: createUpgrade(() => ({
            visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
            requirements: createCostRequirement(() => ({
                resource: chunks,
                cost: 75
            })),
            display: {
                title: "Cheapin' Chunks",
                description: "Reduce Chunk cost by best Chunks.",
                effectDisplay: () => `÷${format(cheapingChunksEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        speedingChunks: createUpgrade(() => ({
            visibility: acceleratorsLayer.chunkAccelerator.upgrades.moreChunkUpgrades.bought,
            requirements: createCostRequirement(() => ({
                resource: chunks,
                cost: 90
            })),
            display: {
                title: "Speedin' Chunks",
                description: "Boost Time Acceleron gain based on best Chunks.",
                effectDisplay: () => `x${format(speedingChunksEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        dustingChunks: createUpgrade(
            (): UpgradeOptions => ({
                visibility: upgrades.speedingChunks.bought,
                requirements: createCostRequirement(() => ({
                    resource: chunks,
                    cost: 100
                })),
                display: {
                    title: "Dustin' Chunks",
                    description: "Multiply Dust gain by best Chunks.",
                    effectDisplay: () => `x${format(dustingChunksEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        dirtCheap: createUpgrade(
            (): UpgradeOptions => ({
                visibility: upgrades.speedingChunks.bought,
                requirements: createCostRequirement(() => ({
                    resource: chunks,
                    cost: 105
                })),
                display: {
                    title: "Dirt Cheap",
                    description: "Reduce the cost scaling of Chunks."
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        throwingHarder: createUpgrade(
            (): UpgradeOptions => ({
                visibility: upgrades.speedingChunks.bought,
                requirements: createCostRequirement(() => ({
                    resource: chunks,
                    cost: 120
                })),
                display: {
                    title: "Throwin' Harder",
                    description: `Raise 'Chuckin' Chunks' effect based on best Chunks.`,
                    effectDisplay: () => `^${format(throwingHarderEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        marryingChunks: createUpgrade(
            (): UpgradeOptions => ({
                visibility: upgrades.speedingChunks.bought,
                requirements: createCostRequirement(() => ({
                    resource: chunks,
                    cost: 150
                })),
                display: {
                    title: "Marryin' Chunks",
                    description: `Multiply 'Lovin' Chunks' effect based on best Chunks at an increase rate.`,
                    effectDisplay: () => `x${format(marryingChunksEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        )
    };

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset,
        display: "C",
        classes: { small: true }
    }));

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [] // dustLayer, mercuryLayer
    }));

    const resetButton = createResetButton(() => ({
        classes: { "chunk-reset-button": true },
        conversion,
        treeNode,
        display: () => (
            <>
                <span>
                    Condense your Dust & Time
                    <br />
                    <h3 style="font-weight: 600">
                        Gain{" "}
                        {displayResource(
                            conversion.gainResource,
                            Decimal.max(
                                unref(conversion.actualGain),
                                unref(resetButton.minimumGain)
                            )
                        )}{" "}
                        {conversion.gainResource.displayName}
                    </h3>
                    <div>
                        <br />
                        Req:{" "}
                        {displayResource(
                            conversion.baseResource,
                            Decimal.gte(unref(conversion.actualGain), 1)
                                ? unref(conversion.currentAt)
                                : unref(conversion.nextAt)
                        )}{" "}
                        {conversion.baseResource.displayName}
                    </div>
                </span>
            </>
        ),
        dataAttributes: {
            "augmented-ui": "border br-round-inset tl-clip"
        },
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
        }
    };

    watch(solarLayer.mercuryTreeUpgrades.secretChunkStash.bought, bought => {
        if (!bought) {
            return;
        }

        chunks.value = Decimal.max(chunks.value, 3);
        dustLayer.unlocks.chunks.bought.value = true;
    });

    const showNotification = computed(() => {
        return (
            (Decimal.gte(unref(conversion.actualGain), 1) && !upgrades.autoChunks.bought.value) ||
            Object.values(upgrades).some(u => u.canPurchase.value)
        );
    });

    return {
        id,
        name,
        color,
        fullReset,
        resetButton,
        chunks,
        // totalChunks,
        bestChunks,
        conversion,
        upgrades,
        chuckingChunksEffect,
        treeNode,
        collidingChunksEffect,
        autoChunker,
        showNotification,
        speedingChunksEffect,
        dustingChunksEffect,
        display: () => (
            <>
                <div id="chunks-layer">
                    <h2>
                        You have {format(chunks.value)} {chunks.displayName}
                    </h2>
                    <h4>Your best condensed Chunks is {format(bestChunks.value)}.</h4>
                    <h6>
                        You have gathered a total of {format(dustLayer.totalMercurialDust.value)}
                    </h6>
                    <Spacer />

                    {render(resetButton)}
                    <Spacer />

                    {milestonesLayer.milestones.three.earned.value ? (
                        <Section header="Upgrades">{renderGroupedObjects(upgrades, 4)}</Section>
                    ) : null}
                </div>
            </>
        )
    };
});

export default layer;
