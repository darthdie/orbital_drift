import { createResource, displayResource, trackTotal } from "features/resources/resource";
import { BaseLayer, createLayer } from "game/layers";
import { DefaultValue, noPersist, Persistent, persistent } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import solarLayer from "../solar";
import { computed, ComputedRef, Ref, unref, watch } from "vue";
import {
    createSequentialModifier,
    createAdditiveModifier,
    createMultiplicativeModifier,
    createExponentialModifier,
    MultiplicativeModifierOptions,
    ExponentialModifierOptions
} from "game/modifiers";
import { render, renderGroupedObjects } from "util/vue";
import { createRepeatable, RepeatableOptions } from "features/clickables/repeatable";
import Formula from "game/formulas/formulas";
import { createCostRequirement, CostRequirementOptions } from "game/requirements";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
import { format } from "util/break_eternity";
import { createCumulativeConversion, setupPassiveGeneration } from "features/conversion";
import { createLayerTreeNode, createResetButton } from "data/common";
import { createReset } from "features/reset";
import mercury from "../mercury";
import Column from "components/layout/Column.vue";
import Spacer from "components/layout/Spacer.vue";
import { InvertibleIntegralFormula } from "game/formulas/types";
import chunksLayer from "./chunks";
import milestonesLayer from "./milestones";
import acceleratorsLayer from "./accelerators";
import { JSX } from "vue/jsx-runtime";
import { createClickable } from "features/clickables/clickable";
import "./dust.css";
import Section from "data/components/Section.vue";

// TODO:
// Increase base chunk cost
// Add more upgrades, make it more meaningful or some shit

const id = "Md";
const layer = createLayer(id, (baseLayer: BaseLayer) => {
    const name = "Mercury";
    const color = "#8c8c94";

    const mercurialDust = createResource(0, "Mercurial Dust", 2);
    const totalMercurialDust = trackTotal(mercurialDust);

    const timeSinceReset = createResource<DecimalSource>(0);
    const totalTimeSinceReset = trackTotal(timeSinceReset);

    const unlocked = noPersist(mercury.unlocked);

    const basicUpgrades = {
        messengerGodUpgrade: createUpgrade(() => ({
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(mercurialDust),
                    cost: Decimal.fromNumber(50)
                })
            ),
            display: {
                title: "The Messenger God",
                description: "Multiply Dust & Collision Time by x1.5.",
                effectDisplay: (): string => `x${format(messengerGodModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        slippingTimeUpgrade: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(mercurialDust),
                cost: Decimal.fromNumber(100)
            })),
            display: {
                title: "Slippery Time",
                description: "Multiplies Dust Time based on Dust Time.",
                effectDisplay: (): string => `x${format(slippingTimeModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        collisionCourse: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(mercurialDust),
                cost: Decimal.fromNumber(250)
            })),
            display: {
                title: "Collision Course",
                description: "Raise Dust & Collision Time based on Dust.",
                effectDisplay: (): string => `^${format(collisionCourseEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        acummulatingDust: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(mercurialDust),
                cost: Decimal.fromNumber(1000)
            })),
            display: {
                title: "Accumulating Dust",
                description: "Multiply Dust gain based on itself.",
                effectDisplay: (): string => `x${format(accumulatingDustModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        totalUpgrade: createUpgrade(
            (): UpgradeOptions => ({
                visibility: basicUpgrades.acummulatingDust.bought,
                requirements: createCostRequirement(() => ({
                    resource: mercurialDust,
                    cost: Decimal.fromNumber(50000)
                })),
                display: {
                    title: "Seasoned Dust",
                    description: "Increases base Dust Time based on Dust Time.",
                    effectDisplay: (): string => `+${format(seasonedDustModifier.apply(0))}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        killingTime: createUpgrade(
            (): UpgradeOptions => ({
                visibility: basicUpgrades.acummulatingDust.bought,
                requirements: createCostRequirement(() => ({
                    resource: mercurialDust,
                    cost: Decimal.fromNumber(1e8)
                })),
                display: {
                    title: "Killin' Time",
                    description: "Increase base Dust gain based on OOM of Dust Time.",
                    effectDisplay: (): string => `+${format(killingTimeModifier.apply(0))}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        acceleration: createUpgrade(
            (): UpgradeOptions => ({
                visibility: basicUpgrades.acummulatingDust.bought,
                requirements: createCostRequirement(() => ({
                    resource: mercurialDust,
                    cost: Decimal.fromNumber(1e15)
                })),
                display: {
                    title: "Acceleration",
                    description: "Dust Time and Dust boost each other.",
                    effectDisplay: (): JSX.Element => (
                        <>
                            <br />
                            Dust Time gain: x{format(accelerationDustTimeEffect.value)}
                            <br />
                            Dust Gain: x{format(accelerationDustGainEffect.value)}
                        </>
                    )
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        ),

        accelerationTwo: createUpgrade(
            (): UpgradeOptions => ({
                visibility: basicUpgrades.acummulatingDust.bought,
                requirements: createCostRequirement(() => ({
                    resource: mercurialDust,
                    cost: 1e20
                })),
                display: {
                    title: "Acceleration 2: This time it's personal",
                    description: "Multiply Collision Time based on Dust Time.",
                    effectDisplay: (): string => `x${format(accelerationTwoEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })
        )
    };

    const chunkingTimeModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: acceleratorUpgrades.chunkingTime.bought,
                multiplier: () => Decimal.add(chunksLayer.bestChunks.value, 1).sqrt().clampMin(1)
            })
        )
    ]);

    const eyeHateDinosaursModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: acceleratorUpgrades.iHateDinosaurs.bought,
                multiplier: () =>
                    Decimal.add(chunksLayer.bestChunks.value, 1).log(2).pow(1.2).clampMin(1)
            })
        )
    ]);

    const fedexManagerModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: acceleratorUpgrades.fedexManager.bought,
                multiplier: () => Decimal.add(chunksLayer.bestChunks.value, 1).log2().clampMin(1)
            })
        )
    ]);

    const accelerationTwoEffect = computed((): DecimalSource => {
        if (basicUpgrades.accelerationTwo.bought.value) {
            return Decimal.add(timeSinceReset.value, 1)
                .log2()
                .sqrt()
                .mul(eyeHateDinosaursModifier.apply(1))
                .clampMin(1);
        }

        return Decimal.dOne;
    });

    const dustBunniesModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: acceleratorUpgrades.dustBunnies.bought,
                multiplier: () =>
                    Decimal.add(chunksLayer.bestChunks.value, 1).log2().pow(1.1).clampMin(1)
            })
        )
    ]);

    const acceleratorUpgrades = {
        chunkingTime: createUpgrade(() => ({
            visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(mercurialDust),
                    cost: Decimal.fromNumber(1e30)
                })
            ),
            display: {
                title: "It's Chunkin' time",
                description: `Multiply "Killin' Time" based on best Chunks.`,
                effectDisplay: () => `x${format(chunkingTimeModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        fedexManager: createUpgrade(() => ({
            visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(mercurialDust),
                    cost: Decimal.fromNumber(1e40)
                })
            ),
            display: {
                title: "FedEx Manager",
                description: `Multiply "The Messenger God" based on best Chunks.`,
                effectDisplay: () => `x${format(fedexManagerModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        dustBunnies: createUpgrade(() => ({
            visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(mercurialDust),
                    cost: Decimal.fromNumber(1e50)
                })
            ),
            display: {
                title: "Dust Bunnies",
                description: `Multiply "Accumulating Dust" based on best Chunks.`,
                effectDisplay: () => `x${format(dustBunniesModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),

        iHateDinosaurs: createUpgrade(() => ({
            visibility: () => acceleratorsLayer.dustAccelerator.upgrades.first.bought.value,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(mercurialDust),
                    cost: Decimal.fromNumber(1e60)
                })
            ),
            display: {
                title: "eyehatedinosaurs",
                description: `Multiply "Acceleration 2" based on best Chunks.`,
                effectDisplay: () => `x${format(eyeHateDinosaursModifier.apply(1))}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const buyableCap = computed(() =>
        Decimal.add(30, acceleratorsLayer.dustAccelerator.dustBuyableCapEffect.value)
    );

    const repeatableBestAmounts = {
        baseDustTime: persistent<DecimalSource>(0),
        baseDustGain: persistent<DecimalSource>(0),
        dustMultiplier: persistent<DecimalSource>(0),
        dustPiles: persistent<DecimalSource>(0)
    };

    const buyMaxRepeatablesButton = createClickable(() => ({
        classes: { "buy-max-button": true },
        display: {
            description: "Buy Max"
        },
        onClick: () => {
            // repeatables.baseDustTime.purchase
            Object.values(repeatables).forEach(repeatable => {
                let maxBuyable = Decimal.sub(buyableCap.value, repeatable.amount.value).toNumber();

                while (maxBuyable > 0 && repeatable.canClick.value) {
                    repeatable.purchase();
                    maxBuyable--;
                }
            });
        },
        dataAttributes: {
            "augmented-ui": "border tl-clip br-clip"
        }
    }));

    const repeatables = {
        baseDustTime: createRepeatable(
            (): RepeatableOptions => ({
                limit: () => buyableCap.value,
                initialAmount: initialAmountFor(repeatableBestAmounts.baseDustTime),
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(mercurialDust),
                        cost: Formula.variable(repeatables.baseDustTime.amount)
                            .pow_base(1.3)
                            .times(10)
                    })
                ),
                display: {
                    title: "Align the Stars",
                    description: "Increase base Dust Time gain by +1",
                    effectDisplay: (): string => `+${format(baseDustAmountModifier.apply(0))}/s`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),

        baseDustGain: createRepeatable(
            (): RepeatableOptions => ({
                limit: () => buyableCap.value,
                initialAmount: initialAmountFor(repeatableBestAmounts.baseDustGain),
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(mercurialDust),
                        cost: Formula.variable(repeatables.baseDustGain.amount)
                            .pow_base(1.8)
                            .times(15)
                    })
                ),
                display: {
                    title: "Salted Dust",
                    description: "Increase base Dust gain by +1",
                    effectDisplay: (): string => `+${format(baseDustGainModifier.apply(0))}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),

        dustMultiplier: createRepeatable(
            (): RepeatableOptions => ({
                limit: () => buyableCap.value,
                initialAmount: initialAmountFor(repeatableBestAmounts.dustMultiplier),
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(mercurialDust),
                        cost: Formula.variable(repeatables.dustMultiplier.amount)
                            .pow_base(1.3)
                            .times(30)
                    })
                ),
                display: {
                    title: "Enriched Dust",
                    description: "Multiply Dust gain by x1.1",
                    effectDisplay: (): string => `x${format(dustMultiplierModifier.apply(1), 1)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),

        dustPiles: createRepeatable(
            (): RepeatableOptions => ({
                limit: () => buyableCap.value,
                initialAmount: initialAmountFor(repeatableBestAmounts.dustPiles),
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(mercurialDust),
                        cost: Formula.variable(repeatables.dustPiles.amount).pow_base(2.5).times(75)
                    })
                ),
                display: {
                    title: "Dust Piles",
                    description: "Raise Dust gain to ^1.1",
                    effectDisplay: () => `^${format(dustPilesEffect.value, 1)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                },
                visibility: () =>
                    milestonesLayer.milestones.first.earned.value ||
                    solarLayer.mercuryTreeUpgrades.youGetAPile.bought.value
            })
        )
    };

    const initialAmountFor = (bestAmount: Ref<DecimalSource>) => {
        return () => {
            if (milestonesLayer.milestones.five.earned.value) {
                return Decimal.min(chunksLayer.bestChunks.value, bestAmount.value);
            }

            if (solarLayer.mercuryTreeUpgrades.youGetAPile.bought.value) {
                return Decimal.dOne;
            }

            return Decimal.dZero;
        };
    };

    const updateBestAmount = (amount: DecimalSource, bestAmount: Persistent<DecimalSource>) => {
        if (Decimal.gt(amount, bestAmount.value)) {
            bestAmount.value = amount;
        }
    };

    watch(repeatables.baseDustGain.amount, amount =>
        updateBestAmount(amount, repeatableBestAmounts.baseDustGain)
    );

    watch(repeatables.baseDustTime.amount, amount =>
        updateBestAmount(amount, repeatableBestAmounts.baseDustTime)
    );

    watch(repeatables.dustMultiplier.amount, amount =>
        updateBestAmount(amount, repeatableBestAmounts.dustMultiplier)
    );

    watch(repeatables.dustPiles.amount, amount =>
        updateBestAmount(amount, repeatableBestAmounts.dustPiles)
    );

    const accumulatingDustModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            enabled: basicUpgrades.acummulatingDust.bought,
            multiplier: (): Decimal =>
                Decimal.add(mercurialDust.value, 10)
                    .log10()
                    .sqrt()
                    .mul(dustBunniesModifier.apply(1))
                    .clampMin(1),
            description: "Accumulating Dust"
        }))
    ]);

    const seasonedDustModifier = createSequentialModifier(() => [
        createAdditiveModifier(() => ({
            enabled: basicUpgrades.totalUpgrade.bought,
            addend: () => {
                return Decimal.add(totalTimeSinceReset.value, 1).log2().sqrt().clampMin(1);
            },
            description: "Seasoned Dust"
        }))
    ]);

    const baseDustAmountModifier = createSequentialModifier(() => [
        createAdditiveModifier(() => ({
            addend: () => repeatables.baseDustTime.amount.value,
            description: "Align the Stars"
        }))
    ]);

    const messengerGodModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            multiplier: () =>
                Decimal.fromNumber(1.5)
                    .times(fedexManagerModifier.apply(1))
                    .times(accelerationTwoEffect.value),
            enabled: basicUpgrades.messengerGodUpgrade.bought,
            description: "Messenger God"
        }))
    ]);

    const slippingTimeModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            enabled: basicUpgrades.slippingTimeUpgrade.bought,
            multiplier: () => Decimal.add(timeSinceReset.value, 10).log10().pow(0.6).clampMin(1),
            description: "Slippery Time"
        }))
    ]);

    const collisionCourseEffect = computed((): Decimal => {
        if (basicUpgrades.collisionCourse.bought.value) {
            return Decimal.add(mercurialDust.value, 10).log10().sqrt().pow(0.2).clampMin(1);
        }

        return Decimal.dOne;
    });

    const collisionCourseModifier = createExponentialModifier(
        (): ExponentialModifierOptions => ({
            enabled: basicUpgrades.collisionCourse.bought,
            exponent: () => collisionCourseEffect.value,
            description: "Collision Course"
            // supportLowNumbers: true,
        })
    );

    const timeSinceLastResetGainModifier = createSequentialModifier(() => [
        // +
        seasonedDustModifier,
        baseDustAmountModifier,
        createAdditiveModifier(() => ({
            addend: chunksLayer.chuckingChunksEffect.value
        })),
        // // // *
        milestonesLayer.firstMilestoneModifier,
        slippingTimeModifier,
        messengerGodModifier,
        // accelerationModifier,
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                multiplier: accelerationDustTimeEffect.value
            })
        ),
        // accelerationTwoMultiplierModifier,
        createMultiplicativeModifier(() => ({
            multiplier: solarLayer.mercuryTreeEffects.solarSpeed
        })),
        // // // ^
        collisionCourseModifier,
        createExponentialModifier(() => ({
            exponent: () => milestonesLayer.fourthMilestoneModifier.value
        })),
        createExponentialModifier(() => ({
            exponent: () => acceleratorsLayer.timeAccelerator.levelTwoTimeRaiseEffect.value
        }))
    ]);

    const unlocks = {
        chunks: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(mercurialDust),
                cost: Decimal.fromNumber(1000)
            })),
            display: {
                title: "Chunks",
                description: "Unlock Mercurial Chunks"
            },
            classes: { "sd-upgrade": true, unlock: true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip bl-clip-y"
            }
        })),

        accelerators: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: noPersist(mercurialDust),
                cost: Decimal.fromNumber(1e9)
            })),
            display: {
                title: "Accelerators",
                description: "Unlock Accelerators"
            },
            classes: { "sd-upgrade": true, unlock: true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip bl-clip-y"
            }
        }))
    };

    const baseDustGainModifier = createSequentialModifier(() => [
        createAdditiveModifier(() => ({
            enabled: () => Decimal.gt(repeatables.baseDustGain.amount.value, 0),
            addend: () => repeatables.baseDustGain.amount.value
        }))
    ]);

    const dustMultiplierModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            multiplier: () =>
                Decimal.dOne
                    .add(Decimal.times(0.1, repeatables.dustMultiplier.amount.value))
                    .clampMin(1),
            enabled: () => Decimal.gt(repeatables.dustMultiplier.amount.value, 0)
        }))
    ]);

    const dustPilesEffect = computed((): Decimal => {
        if (unref(repeatables.dustPiles.visibility) === false) {
            return Decimal.dOne;
        }

        return Decimal.dOne.add(Decimal.times(0.1, repeatables.dustPiles.amount.value)).clampMin(1);
    });

    const dustPilesModifier = createSequentialModifier(() => [
        createExponentialModifier(() => ({
            enabled: () => Decimal.gt(repeatables.dustPiles.amount.value, 0),
            exponent: () => dustPilesEffect.value
        }))
    ]);

    const killingTimeModifier = createSequentialModifier(() => [
        createAdditiveModifier(() => ({
            enabled: basicUpgrades.killingTime.bought,
            // addend: (): Decimal => Decimal.divide(timeSinceReset.value, 1000).times(0.01).times(chunkingTimeModifier.apply(1))
            addend: (): Decimal => Decimal.pow(Decimal.add(timeSinceReset.value, 1).e, 1.5)
            // addend: 0
        }))
    ]);

    const dustPowerGainModifier = createSequentialModifier(() => [
        // +
        baseDustGainModifier,
        killingTimeModifier,
        // *
        dustMultiplierModifier,
        accumulatingDustModifier,
        acceleratorsLayer.dustAccelerator.dustGainMultiplierModifier,
        createMultiplicativeModifier(() => ({
            multiplier: solarLayer.mercuryTreeEffects.solarFriedDust
        })),
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                multiplier: chunksLayer.dustingChunksEffect.value
            })
        ),
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                multiplier: accelerationDustGainEffect.value
            })
        ),
        // ^
        dustPilesModifier,
        createExponentialModifier(() => ({
            exponent: () => acceleratorsLayer.dustAccelerator.dustAcceleratorDustRaiseEffect.value
        })),
        createExponentialModifier(() => ({
            exponent: () => acceleratorsLayer.timeAccelerator.levelTwoTimeRaiseEffect.value
        }))
    ]);

    const conversion = createCumulativeConversion(() => {
        return {
            formula: x => {
                // const oom = computed(() => Decimal.fromValue(timeSinceReset.value).e);
                return (
                    dustPowerGainModifier.getFormula(x.div(2).pow(0.3)) as InvertibleIntegralFormula
                ).step(1e6, f => f.div(3));
                // .div()
                // .step(100, f => f.sqrt())
                // .step(1000, f => f.sqrt())
                // .step(1000, f => f.div(Formula.variable(oom).div(4)));
            },
            baseResource: timeSinceReset,
            gainResource: noPersist(mercurialDust),
            currentGain: computed((): Decimal => {
                if (Decimal.lt(timeSinceReset.value, 10)) {
                    return Decimal.dZero;
                }

                return Decimal.fromValue(conversion.formula.evaluate(timeSinceReset.value));
            }),
            spend: () => {
                timeSinceReset.value = Decimal.dZero;
                mercury.collisionTime.value = new Decimal(mercury.collisionTime.defaultValue);
            }
        };
    });

    const accelerationDustGainEffect = computed(() => {
        if (basicUpgrades.acceleration.bought.value) {
            return Decimal.add(mercurialDust.value, 1).log10().cbrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const accelerationDustTimeEffect = computed(() => {
        if (basicUpgrades.acceleration.bought.value) {
            return Decimal.add(mercurialDust.value, 1).log10().cbrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [
            basicUpgrades,
            repeatables,
            acceleratorUpgrades
        ],
        onReset: () => {
            mercurialDust.value = mercurialDust[DefaultValue];
            totalMercurialDust.value = Decimal.dZero;
            timeSinceReset.value = timeSinceReset[DefaultValue];
            totalTimeSinceReset.value = Decimal.dZero;
            mercury.collisionTime.value = new Decimal(mercury.collisionTime[DefaultValue]);

            applySecondMilestone();
            applyDustyTome();
        }
    }));

    const fullReset = () => {
        createReset(() => ({ thingsToReset: (): Record<string, unknown>[] => [layer] })).reset();

        Object.values(repeatableBestAmounts).forEach(r => (r.value = 0));

        applyDustyTome();
        applyNTropy();
        applyAutoAutoChunks();
    };

    watch(milestonesLayer.completedMilestonesCount, () => applySecondMilestone());
    watch(solarLayer.mercuryTreeUpgrades.dustyTomes.bought, () => applyDustyTome());
    watch(solarLayer.mercuryTreeUpgrades.nTropy.bought, () => applyNTropy());
    watch(solarLayer.mercuryTreeUpgrades.autoAutoChunks.bought, () => applyAutoAutoChunks());

    function applySecondMilestone() {
        if (milestonesLayer.milestones.second.earned.value === false) {
            return;
        }

        const count = milestonesLayer.completedMilestonesCount.value;

        Object.values(basicUpgrades)
            .slice(0, count)
            .forEach(u => (u.bought.value = true));
    }

    function applyDustyTome() {
        if (solarLayer.mercuryTreeUpgrades.dustyTomes.bought.value) {
            basicUpgrades.messengerGodUpgrade.bought.value = true;
            basicUpgrades.slippingTimeUpgrade.bought.value = true;
            basicUpgrades.collisionCourse.bought.value = true;
            basicUpgrades.acummulatingDust.bought.value = true;
        }
    }

    function applyNTropy() {
        if (solarLayer.mercuryTreeUpgrades.nTropy.bought.value) {
            unlocks.accelerators.bought.value = true;
        }
    }

    // Why is this here?
    function applyAutoAutoChunks() {
        if (solarLayer.mercuryTreeUpgrades.autoAutoChunks.bought.value) {
            chunksLayer.upgrades.autoChunks.bought.value = true;
        }
    }

    const resetButton = createResetButton(() => ({
        classes: { "dust-time-reset-button": true },
        conversion,
        treeNode,
        showNextAt: false,
        display: () => (
            <>
                <span>
                    Reset Dust Time & Collision Time
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
                </span>
            </>
        ),
        dataAttributes: {
            "augmented-ui": "border br-round-inset tl-clip"
        }
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset,
        classes: { small: true },
        display: "D"
    }));

    const passiveGenerationPerSecondEffect = computed((): Decimal => {
        if (!enablePassiveGeneration.value) {
            return Decimal.dZero;
        }

        const base = Decimal.fromNumber(
            solarLayer.mercuryTreeUpgrades.snortingDust.bought.value ? 0.05 : 0
        );
        if (chunksLayer.upgrades.grindingChunks.bought.value) {
            return Decimal.mul(chunksLayer.bestChunks.value, 0.01).add(base).clampMin(0.01);
        }

        return base;
    });
    const enablePassiveGeneration: ComputedRef<boolean> = computed<boolean>(() => {
        return (
            chunksLayer.upgrades.grindingChunks.bought.value ||
            solarLayer.mercuryTreeUpgrades.snortingDust.bought.value
        );
    });
    const passiveGenerationPerSecond: ComputedRef<Decimal> = computed(() => {
        return Decimal.times(passiveGenerationPerSecondEffect.value, unref(conversion.actualGain));
    });

    setupPassiveGeneration(baseLayer, conversion, () => passiveGenerationPerSecondEffect.value);

    baseLayer.on("update", diff => {
        if (!unlocked.value || mercury.hasCollidedComputed.value) {
            return;
        }

        const totalDiff = Decimal.times(timeSinceLastResetGainModifier.apply(1), diff);
        timeSinceReset.value = Decimal.add(timeSinceReset.value, totalDiff);
    });

    const showNotification = computed(() => {
        return (
            Object.values(repeatables).some(r => r.canClick.value) ||
            Object.values(basicUpgrades).some(u => u.canPurchase.value) ||
            Object.values(acceleratorUpgrades).some(u => u.canPurchase.value) ||
            Object.values(unlocks).some(u => u.canPurchase.value)
        );
    });

    const tableStyles = "gap: 8px; margin-bottom: 8px;";
    return {
        name,
        color,
        timeSinceReset,
        totalTimeSinceReset,
        mercurialDust,
        totalMercurialDust,
        baseDustAmountModifier,
        baseDustGainModifier,
        dustMultiplierModifier,
        unlocks,
        slippingTimeModifier,
        repeatables,
        basicUpgrades,
        acceleratorUpgrades,
        totalTimeModifier: seasonedDustModifier,
        messengerGodModifier,
        collisionCourseEffect,
        collisionCourseModifier,
        reset,
        passiveGenerationPerSecondEffect,
        showNotification,
        repeatableBestAmounts,
        fullReset,
        display: () => (
            <>
                <div id="dust-layer">
                    <h2>
                        {format(mercurialDust.value)} {mercurialDust.displayName}
                    </h2>
                    {enablePassiveGeneration.value ? (
                        <>
                            <h6>Gaining {format(passiveGenerationPerSecond.value)}/s</h6>
                        </>
                    ) : null}
                    <h5>You have {format(timeSinceReset.value)} Dust Time.</h5>
                    <h6>({format(timeSinceLastResetGainModifier.apply(1))}/s)</h6>

                    <Spacer />
                    {render(resetButton)}
                    <Spacer />
                    <Spacer />
                    {render(buyMaxRepeatablesButton)}
                    <Column>{renderGroupedObjects(repeatables, 4, tableStyles)}</Column>
                    <Spacer />

                    <Section header="Upgrades">
                        <Column>{renderGroupedObjects(basicUpgrades, 4, tableStyles)}</Column>
                        {acceleratorsLayer.dustAccelerator.upgrades.first.bought.value ? (
                            <Column>
                                {renderGroupedObjects(acceleratorUpgrades, 4, tableStyles)}
                            </Column>
                        ) : null}
                    </Section>

                    <Section header="Unlocks">
                        <Column>{renderGroupedObjects(unlocks, 4, tableStyles)}</Column>
                    </Section>
                </div>
            </>
        ),
        treeNode
    };
});

export default layer;
