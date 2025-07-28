import Column from "components/layout/Column.vue";
import Spacer from "components/layout/Spacer.vue";
import { Bar, createBar } from "features/bars/bar";
import {
    createRepeatable,
    Repeatable,
    RepeatableOptions,
    setupAutoPurchaseRepeatable
} from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import {
    CostRequirementOptions,
    createCostRequirement,
    displayRequirements
} from "game/requirements";
import { Direction } from "util/common";
import { render, Renderable, renderGroupedObjects } from "util/vue";
import dustLayer from "./dust";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { createResource, Resource } from "features/resources/resource";
import { format } from "util/bignum";
import Formula from "game/formulas/formulas";
import { computed, ComputedRef, unref } from "vue";
import {
    createMultiplicativeModifier,
    createSequentialModifier,
    MultiplicativeModifierOptions
} from "game/modifiers";
import { createTabFamily, TabFamilyOptions } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
import chunksLayer from "./chunks";
import mercuryLayer from "../mercury";
import { createLazyProxy } from "util/proxies";
import { createReset } from "features/reset";
import solarLayer from "../solar";
import milestonesLayer from "./milestones";
import { JSX } from "vue/jsx-runtime";
import "./accelerators.css";
// import { MaybeGetter } from "util/computed";

// function createUpgrade<T extends UpgradeOptions>(optionsFunc: () => T) {
//     return createLazyProxy(() => {
//         const { display: _display, ...props } = optionsFunc();

//         let display;
//         if (typeof _display === "object" && !isJSXElement(_display)) {
//             const { title, description, effectDisplay } = _display;

//             display = () => (
//                 <span>
//                     {title != null ? (
//                         <div>
//                             {render(title, el => (
//                                 <h3>{el}</h3>
//                             ))}
//                         </div>
//                     ) : null}
//                     {render(description, el => (
//                         <div>{el}</div>
//                     ))}
//                     {effectDisplay != null ? <div>Currently: {render(effectDisplay)}</div> : null}
//                     {bought.value ? null : (
//                         <>
//                             <br />
//                             {displayRequirements(requirements)}
//                         </>
//                     )}
//                 </span>
//             );
//         } else if (_display != null) {
//             display = _display;
//         }

//         // let display:
//         //     | MaybeGetter<Renderable>
//         //     | {
//         //           /** A header to appear at the top of the display. */
//         //           title?: MaybeGetter<Renderable>;
//         //           /** The main text that appears in the display. */
//         //           description: MaybeGetter<Renderable>;
//         //           /** A description of the current effect of the achievement. Useful when the effect changes dynamically. */
//         //           effectDisplay?: MaybeGetter<Renderable>;
//         //       };
//         // if (isRef(_display)) {
//         //     display = _display;
//         // } else if (_display !== undefined) {
//         //     display = () => (
//         //     <>
//         //         <div class="upgrade-content">
//         //             <h3 class="title">{_display.title}</h3>
//         //             <hr class="title-divider" />
//         //             <div class="description">
//         //                 Decrease timer interval based on Dust Accelerons
//         //             </div>
//         //             <div class="effect">
//         //                 Currently: ÷
//         //                 {format(chunkAccelerator.dustAcceleratorIntervalEffect.value)}
//         //             </div>
//         //         </div>
//         //     </>
//         // );
//         // }

//         return createUpgradeReal(() => ({
//             ...props,
//             display
//         }));
//     });
// }

const id = "Ma";
const layer = createLayer(id, (baseLayer: BaseLayer) => {
    const name = "Mercury";
    const color = "#8c8c94";

    const unlocked = computed(() => dustLayer.unlocks.accelerators.bought.value);

    const sharedBarSettings = {
        direction: Direction.Right,
        height: 14,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline-lighter)"
        }
    };

    const dustAccelerator = {
        timer: createResource<DecimalSource>(0),
        resource: createResource<DecimalSource>(0, "Dust Accelerons"),

        gainComputed: computed((): Decimal => {
            return Decimal.add(1, dustAccelerator.boostGainEffect.value)
                .times(dustAccelerator.dustAcceleratorGainModifier.apply(1))
                .times(chunkAccelerator.dustAcceleratorModifierEffect.value)
                .times(dustAccelerator.dustyJeansEffect.value)
                .times(solarLayer.mercuryTreeEffects.eightyEight.value);
        }),

        bar: createBar(() => ({
            ...sharedBarSettings,
            progress: (): Decimal => {
                if (Decimal.lte(dustAccelerator.timerMax.value, 0.1)) {
                    return Decimal.fromNumber(100);
                }

                return Decimal.div(dustAccelerator.timer.value, dustAccelerator.timerMax.value);
            }
        })),

        intervalBuyable: createRepeatable(() => ({
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(dustLayer.mercurialDust),
                    cost: () =>
                        Formula.variable(dustAccelerator.intervalBuyable.amount.value)
                            .pow_base(7)
                            .times(1e10)
                            .evaluate(),
                    requiresPay: false
                })
            ),
            clickableStyle: {
                minHeight: "0",
                width: "100%",
                margin: "0",
                padding: "0",
                border: "0"
            },
            display: () => (
                <>
                    <div>
                        <div style="padding: 6px 0 0 28px; text-align: left;">
                            <h2>Decrease timer interval</h2>
                        </div>
                        <hr color="var(--outline-lighter)" style="height: 2px;" />
                        <div style="padding-bottom: 12px;">
                            <h4>
                                You have {format(dustLayer.mercurialDust.value)}{" "}
                                {dustLayer.mercurialDust.displayName}.
                            </h4>
                            <hr color="var(--outline-lighter)" style="height: 2px;" />

                            <div style="padding-left: 24px; display: flex;">
                                <span>Currently: ÷{format(dustAccelerator.timerMax.value)}</span>
                                <div style="border-left: 2px solid var(--outline-lighter); height: 12px"></div>
                                <span>
                                    {displayRequirements(
                                        dustAccelerator.intervalBuyable.requirements,
                                        unref(dustAccelerator.intervalBuyable.amountToIncrease)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ),
            clickableDataAttributes: {
                "augmented-ui": "border tl-scoop-y"
            }
        })),

        timerMax: computed((): Decimal => {
            return Decimal.div(120, dustAccelerator.dustAcceleratorTimerMaxEffect.value)
                .div(dustAccelerator.acceleratingTheAcceleratorEffect.value)
                .div(timeAccelerator.levelTwoTimeRaiseEffect.value)
                .div(solarLayer.mercuryTreeEffects.likeThatBlueGuy.value);
        }),

        timerTickSpeedDisplay: computed((): Decimal => {
            return Decimal.fromValue(dustAccelerator.timerMax.value).div(
                solarLayer.mercuryTreeEffects.solarSpeed.value
            );
        }),

        isAtLeastLevelOne: computed((): boolean =>
            Decimal.gte(dustAccelerator.acceleratorLevel.value, 1)
        ),
        isAtLeastLevelTwo: computed((): boolean =>
            Decimal.gte(dustAccelerator.acceleratorLevel.value, 2)
        ),
        isAtLeastLevelThree: computed((): boolean =>
            Decimal.gte(dustAccelerator.acceleratorLevel.value, 3)
        ),

        acceleratorLevel: computed((): DecimalSource => {
            return dustAccelerator.levelBuyable.amount.value;
        }),

        bonusLevels: (minLevelRequired: number): Decimal => {
            if (Decimal.lt(dustAccelerator.acceleratorLevel.value, minLevelRequired)) {
                return Decimal.dZero;
            }

            return Decimal.sub(
                dustAccelerator.acceleratorLevel.value,
                Decimal.sub(minLevelRequired, 1)
            )
                .add(1)
                .clampMin(1);
        },

        dustGainMultiplierModifier: createSequentialModifier(() => [
            createMultiplicativeModifier(
                (): MultiplicativeModifierOptions => ({
                    enabled: () => Decimal.gt(dustAccelerator.resource.value, 0),
                    multiplier: () => {
                        const mult = dustAccelerator.bonusLevels(1).clampMin(1);

                        return Decimal.add(dustAccelerator.resource.value, 1)
                            .pow(0.25)
                            .mul(mult)
                            .mul(dustAccelerator.boostBuffEffect.value)
                            .clampMin(1);
                    },
                    description: "Dust Accelerons"
                })
            )
        ]),

        dustAcceleratorGainModifier: createSequentialModifier(() => [
            createMultiplicativeModifier(
                (): MultiplicativeModifierOptions => ({
                    enabled: () =>
                        dustAccelerator.isAtLeastLevelOne.value &&
                        Decimal.gt(dustAccelerator.resource.value, 0),
                    multiplier: () => {
                        const mult = dustAccelerator.bonusLevels(2).clampMin(1);
                        return Decimal.add(dustAccelerator.resource.value, 1)
                            .pow(0.2)
                            .times(mult)
                            .mul(dustAccelerator.boostBuffEffect.value)
                            .clampMin(1);
                    }
                })
            )
        ]),

        dustAcceleratorDustRaiseEffect: computed((): Decimal => {
            if (dustAccelerator.isAtLeastLevelTwo.value) {
                const extraLevels = dustAccelerator.bonusLevels(3).times(0.1);
                const pow = Decimal.add(0.1, extraLevels);
                return Decimal.add(dustAccelerator.resource.value, 1)
                    .slog()
                    .pow(pow)
                    .mul(dustAccelerator.boostBuffEffect.value)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        dustBuyableCapEffect: computed((): Decimal => {
            if (dustAccelerator.isAtLeastLevelThree.value) {
                return Decimal.add(dustAccelerator.resource.value, 1)
                    .log2()
                    .sqrt()
                    .floor()
                    .clampMin(1);
            }

            return Decimal.dZero;
        }),

        dustAcceleratorsGainComputed: computed((): Decimal => {
            return Decimal.times(1, dustAccelerator.dustAcceleratorGainModifier.apply(1));
        }),

        acceleratingTheAcceleratorEffect: computed((): Decimal => {
            if (dustAccelerator.upgrades.second.bought.value) {
                return Decimal.fromValue(
                    Formula.variable(Decimal.add(dustAccelerator.resource.value, 1))
                        .mul(0.004)
                        .add(1)
                        .step(2, f => f.pow(0.1))
                        .step(5, f => f.div(10))
                        .evaluate()
                );
            }

            return Decimal.dOne;
        }),

        dustAcceleratorTimerMaxEffect: computed((): Decimal => {
            if (Decimal.gt(dustAccelerator.intervalBuyable.amount.value, 0)) {
                return Decimal.mul(dustAccelerator.intervalBuyable.amount.value, 0.025)
                    .add(1)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        levelBuyable: createRepeatable(() => ({
            limit: 3,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    requiresPay: false,
                    resource: noPersist(dustAccelerator.resource),
                    cost: Formula.variable(dustAccelerator.levelBuyable.amount)
                        .pow_base(5)
                        .times(100)
                })
            ),
            display: {
                showAmount: false,
                title: "Upgrade",
                description:
                    "Reset Dust Accelerons to unlock a new effect and buff previous effects.",
                effectDisplay: (): JSX.Element => dustAccelerator.levelEffectsDisplay()
            },
            onClick: () => {
                dustAccelerator.resource.value = 0;
            },
            classes: { "level-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-2-clip-x"
            }
        })),

        boostBuyable: createRepeatable(
            (): RepeatableOptions => ({
                visibility: dustAccelerator.isAtLeastLevelThree,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        requiresPay: false,
                        resource: noPersist(dustAccelerator.resource),
                        cost: () => {
                            const buyableLevel = Decimal.fromValue(
                                dustAccelerator.boostBuyable.amount.value
                            );

                            return buyableLevel
                                .pow_base(Decimal.times(100, buyableLevel.add(1).pow(1.05)))
                                .times(1e8);
                        }
                    })
                ),
                display: {
                    showAmount: false,
                    title: "Boost",
                    description:
                        "Reset Accelerons to gain a x1.25 boost to Level 1-3 effects and +100 base Acceleron gain.",
                    effectDisplay: (): Renderable => (
                        <>
                            <br />+{format(dustAccelerator.boostGainEffect.value)} Acceleron Gain
                            <br />x{format(dustAccelerator.boostBuffEffect.value)} Effects
                        </>
                    )
                },
                classes: { "boost-repeatable": true },
                onClick: () => {
                    dustAccelerator.resource.value = 0;
                },
                clickableDataAttributes: {
                    "augmented-ui": "border tl-2-clip-x"
                }
            })
        ),

        boostGainEffect: computed((): DecimalSource => {
            if (Decimal.gt(dustAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(100, dustAccelerator.boostBuyable.amount.value).clampMin(1);
            }

            return Decimal.dZero;
        }),

        boostBuffEffect: computed((): DecimalSource => {
            if (Decimal.gt(dustAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(0.25, dustAccelerator.boostBuyable.amount.value)
                    .add(1)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        dustyJeansEffect: computed((): Decimal => {
            if (dustAccelerator.upgrades.dustyJeans.bought.value) {
                // Formula.variable(dustAccelerator.resource.value).add(1).log2().step(30, f => f.sqrt()).evaluate();
                return Decimal.add(dustAccelerator.resource.value, 1).log2().clampMin(1);
            }

            return Decimal.dOne;
        }),

        upgrades: {
            second: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(dustAccelerator.resource),
                        cost: Decimal.fromNumber(25)
                    })
                ),
                display: {
                    title: "Accelerating the Accelerator",
                    description: "Decrease timer interval based on accelerons",
                    effectDisplay: (): string =>
                        `÷${format(dustAccelerator.acceleratingTheAcceleratorEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            chunksUnlock: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(dustAccelerator.resource),
                        cost: Decimal.fromNumber(125)
                    })
                ),
                display: {
                    title: "je ne sais chunks",
                    description: "Unlock Chunk Accelerons"
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            first: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(dustAccelerator.resource),
                        cost: Decimal.fromNumber(150)
                    })
                ),
                display: {
                    title: "Speed Dust",
                    description: "Unlock more Dust upgrades"
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            dustyJeans: createUpgrade(
                (): UpgradeOptions => ({
                    visibility: dustAccelerator.isAtLeastLevelThree,
                    requirements: createCostRequirement(
                        (): CostRequirementOptions => ({
                            resource: dustAccelerator.resource,
                            cost: Decimal.fromNumber(2.5e6) // ??
                        })
                    ),
                    display: {
                        title: "Dusty Jeans",
                        description: "Boost Dust Acceleron gain based on Dust Accelerons.",
                        effectDisplay: (): string =>
                            `x${format(dustAccelerator.dustyJeansEffect.value)}`
                    },
                    classes: { "sd-upgrade": true },
                    clickableDataAttributes: {
                        "augmented-ui": "border tr-clip"
                    }
                })
            )
        },

        tick: (diff: number) => {
            if (!dustLayer.unlocks.accelerators.bought.value) {
                return;
            }

            dustAccelerator.timer.value = Decimal.add(
                dustAccelerator.timer.value,
                Decimal.dOne.times(solarLayer.mercuryTreeEffects.solarSpeed.value).times(diff)
            );

            if (Decimal.gte(dustAccelerator.timer.value, dustAccelerator.timerMax.value)) {
                dustAccelerator.timer.value = 0;
                dustAccelerator.resource.value = Decimal.add(
                    dustAccelerator.resource.value,
                    dustAccelerator.gainComputed.value
                );
            }
        },

        levelEffectsDisplay: () => {
            const effects = [
                <p>x{format(dustAccelerator.dustGainMultiplierModifier.apply(1))} Dust gain</p>
            ];

            if (dustAccelerator.isAtLeastLevelOne.value) {
                effects.push(
                    <p>
                        x{format(dustAccelerator.dustAcceleratorGainModifier.apply(1))} Accelerons
                        gain
                    </p>
                );
            }

            if (dustAccelerator.isAtLeastLevelTwo.value) {
                effects.push(
                    <p>^{format(dustAccelerator.dustAcceleratorDustRaiseEffect.value)} Dust gain</p>
                );
            }

            if (dustAccelerator.isAtLeastLevelThree.value) {
                effects.push(
                    <p>+{format(dustAccelerator.dustBuyableCapEffect.value)} Dust buyable caps</p>
                );
            }

            return <>{effects}</>;
        }
    };

    const chunkAccelerator = {
        timer: createResource<DecimalSource>(0),
        resource: createResource<DecimalSource>(0, "Chunk Accelerons"),

        gainComputed: computed((): Decimal => {
            return Decimal.add(1, chunkAccelerator.boostGainEffect.value)
                .times(chunkAccelerator.acceleratorGainModifier.apply(1))
                .times(timeAccelerator.chunkAcceleronGainModifier.apply(1))
                .times(solarLayer.mercuryTreeEffects.eightyEight.value);
        }),

        bar: createBar(() => ({
            ...sharedBarSettings,
            progress: (): Decimal => {
                if (Decimal.lte(chunkAccelerator.timerMax.value, 0.1)) {
                    return Decimal.fromNumber(100);
                }

                return Decimal.div(chunkAccelerator.timer.value, chunkAccelerator.timerMax.value);
            }
        })),

        intervalBuyable: createRepeatable(() => ({
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    resource: noPersist(chunksLayer.chunks),
                    cost: () =>
                        Formula.variable(chunkAccelerator.intervalBuyable.amount.value)
                            .pow_base(1.1)
                            .times(18)
                            .floor()
                            .evaluate(),
                    requiresPay: false
                })
            ),
            clickableStyle: {
                minHeight: "0",
                width: "100%",
                margin: "0",
                padding: "0",
                border: "0"
            },
            display: () => (
                <>
                    <div>
                        <div style="padding: 6px 0 0 28px; text-align: left;">
                            <h2>Decrease timer interval</h2>
                        </div>
                        <hr color="var(--outline-lighter)" style="height: 2px;" />
                        <div style="padding-bottom: 12px;">
                            <h4>You have {format(chunksLayer.chunks.value)} mercurial chunks.</h4>
                            <hr color="var(--outline-lighter)" style="height: 2px;" />

                            <div style="padding-left: 24px; display: flex;">
                                <span>
                                    Currently: ÷
                                    {format(chunkAccelerator.intervalBuyableEffect.value)}
                                </span>
                                <div style="border-left: 2px solid var(--outline-lighter); height: 12px"></div>
                                <span>
                                    {displayRequirements(
                                        chunkAccelerator.intervalBuyable.requirements,
                                        unref(chunkAccelerator.intervalBuyable.amountToIncrease)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ),
            clickableDataAttributes: {
                "augmented-ui": "border tl-scoop-y"
            }
        })),

        timerMax: computed((): Decimal => {
            return Decimal.fromNumber(120)
                .div(chunkAccelerator.intervalBuyableEffect.value)
                .div(chunkAccelerator.dustAcceleratorIntervalEffect.value)
                .div(timeAccelerator.levelTwoTimeRaiseEffect.value)
                .div(milestonesLayer.fiftyMilestoneEffect.value)
                .div(solarLayer.mercuryTreeEffects.likeThatBlueGuy.value);
        }),

        timerTickSpeedDisplay: computed((): Decimal => {
            return Decimal.fromValue(chunkAccelerator.timerMax.value).div(
                solarLayer.mercuryTreeEffects.solarSpeed.value
            );
        }),

        dustAcceleratorIntervalEffect: computed(() => {
            if (chunkAccelerator.upgrades.chunksMeetDust.bought.value) {
                return Decimal.add(dustAccelerator.resource.value, 1).pow(0.12).sqrt().clampMin(1);
            }

            return Decimal.dOne;
        }),

        intervalBuyableEffect: computed((): Decimal => {
            if (Decimal.gt(chunkAccelerator.intervalBuyable.amount.value, 0)) {
                return Decimal.mul(chunkAccelerator.intervalBuyable.amount.value, 0.03)
                    .add(1)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        levelBuyable: createRepeatable(() => ({
            limit: 3,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    requiresPay: false,
                    resource: noPersist(chunkAccelerator.resource),
                    cost: Formula.variable(chunkAccelerator.levelBuyable.amount)
                        .pow_base(3)
                        .times(30)
                })
            ),
            display: {
                showAmount: false,
                title: "Upgrade",
                description:
                    "Reset Chunk Accelerons to unlock a new effect and buff previous effects.",
                effectDisplay: (): JSX.Element => chunkAccelerator.levelEffectsDisplay()
            },
            onClick: () => {
                chunkAccelerator.resource.value = 0;
            },
            classes: { "level-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-2-clip-x bl-clip"
            }
        })),

        boostBuyable: createRepeatable(
            (): RepeatableOptions => ({
                visibility: dustAccelerator.isAtLeastLevelThree,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        requiresPay: false,
                        resource: chunkAccelerator.resource,
                        cost: () => {
                            const buyableLevel = Decimal.fromValue(
                                chunkAccelerator.boostBuyable.amount.value
                            );

                            return buyableLevel
                                .pow_base(Decimal.times(100, buyableLevel.add(1).pow(1.05)))
                                .times(1e10);
                        }
                    })
                ),
                display: {
                    showAmount: false,
                    title: "Boost",
                    description:
                        "Reset Accelerons to gain a x1.25 boost to Level 1-3 effects and +100 base Acceleron gain.",
                    effectDisplay: (): Renderable => (
                        <>
                            <br />+{format(chunkAccelerator.boostGainEffect.value)} Acceleron Gain
                            <br />x{format(chunkAccelerator.boostBuffEffect.value)} Effects
                        </>
                    )
                },
                onClick: () => {
                    chunkAccelerator.resource.value = 0;
                },
                classes: { "boost-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tl-2-clip-x"
                }
            })
        ),

        boostGainEffect: computed((): DecimalSource => {
            if (Decimal.gt(chunkAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(100, chunkAccelerator.boostBuyable.amount.value).clampMin(1);
            }

            return Decimal.dZero;
        }),

        boostBuffEffect: computed((): DecimalSource => {
            if (Decimal.gt(chunkAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(0.25, chunkAccelerator.boostBuyable.amount.value)
                    .add(1)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        pebbleSmasherEffect: computed((): DecimalSource => {
            if (chunkAccelerator.upgrades.pebbleSmasher.bought.value) {
                return Decimal.add(chunkAccelerator.gainComputed.value, 1)
                    .pow(0.1)
                    .sqrt()
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        upgrades: {
            chunksMeetDust: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(chunkAccelerator.resource),
                        cost: Decimal.fromNumber(25)
                    })
                ),
                display: {
                    title: "Chunks, meet Dust",
                    description: "Decrease timer interval based on Dust Accelerons",
                    effectDisplay: (): string =>
                        `÷${format(chunkAccelerator.dustAcceleratorIntervalEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            moreChunkUpgrades: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(chunkAccelerator.resource),
                        cost: Decimal.fromNumber(100)
                    })
                ),
                display: {
                    title: "Speed Chunks",
                    description: "Unlock more Chunk upgrades. (Starting at 35 Chunks)"
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            timeUnlock: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(chunkAccelerator.resource),
                        cost: Decimal.fromNumber(150)
                    })
                ),
                display: {
                    title: "Time go brrr",
                    description: "Unlock Time Accelerons"
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),

            pebbleSmasher: createUpgrade(
                (): UpgradeOptions => ({
                    visibility: chunkAccelerator.isAtLeastLevelThree,
                    requirements: createCostRequirement(() => ({
                        resource: chunkAccelerator.resource,
                        cost: Decimal.fromNumber(1e5)
                    })),
                    display: {
                        title: "Pebble Smasher",
                        description: "Divide chunk cost based on Chunk Acceleron gain",
                        effectDisplay: (): string =>
                            `÷${format(chunkAccelerator.pebbleSmasherEffect.value)}`
                    },
                    classes: { "sd-upgrade": true },
                    clickableDataAttributes: {
                        "augmented-ui": "border tr-clip"
                    }
                })
            )
        },

        isAtLeastLevelOne: computed((): boolean =>
            Decimal.gte(chunkAccelerator.acceleratorLevel.value, 1)
        ),
        isAtLeastLevelTwo: computed((): boolean =>
            Decimal.gte(chunkAccelerator.acceleratorLevel.value, 2)
        ),
        isAtLeastLevelThree: computed((): boolean =>
            Decimal.gte(chunkAccelerator.acceleratorLevel.value, 3)
        ),

        acceleratorLevel: computed((): DecimalSource => chunkAccelerator.levelBuyable.amount.value),

        bonusLevels: (minLevelRequired: number): Decimal => {
            if (Decimal.lt(chunkAccelerator.acceleratorLevel.value, minLevelRequired)) {
                return Decimal.dZero;
            }

            return Decimal.sub(
                chunkAccelerator.acceleratorLevel.value,
                Decimal.sub(minLevelRequired, 1)
            )
                .add(1)
                .clampMin(1);
        },

        dustAcceleratorModifierEffect: computed((): Decimal => {
            if (Decimal.lt(chunkAccelerator.resource.value, 1)) {
                return Decimal.dOne;
            }

            const extraLevels = chunkAccelerator.bonusLevels(1).clampMin(1);
            return Decimal.add(chunkAccelerator.resource.value, 2)
                .log2()
                .times(extraLevels)
                .pow(chunkAccelerator.levelThreeRaiseEffect.value)
                .times(chunkAccelerator.boostBuffEffect.value)
                .clampMin(1);
        }),

        chunkCostDivisionEffect: computed((): Decimal => {
            if (
                chunkAccelerator.isAtLeastLevelTwo.value &&
                Decimal.gt(chunkAccelerator.resource.value, 0)
            ) {
                const extraLevels = chunkAccelerator.bonusLevels(3).clampMin(1);
                return Decimal.add(chunkAccelerator.resource.value, 1)
                    .pow(0.3)
                    .cbrt()
                    .times(extraLevels)
                    .pow(chunkAccelerator.levelThreeRaiseEffect.value)
                    .times(chunkAccelerator.boostBuffEffect.value)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        acceleratorGainModifier: createSequentialModifier(() => [
            createMultiplicativeModifier(
                (): MultiplicativeModifierOptions => ({
                    enabled: () => chunkAccelerator.isAtLeastLevelOne.value,
                    multiplier: () => {
                        if (Decimal.lt(chunkAccelerator.resource.value, 1)) {
                            return Decimal.dOne;
                        }

                        const extraLevels = chunkAccelerator.bonusLevels(2).clampMin(1);
                        return Decimal.add(chunkAccelerator.resource.value, 1)
                            .pow(0.2)
                            .times(extraLevels)
                            .pow(chunkAccelerator.levelThreeRaiseEffect.value)
                            .times(chunkAccelerator.boostBuffEffect.value)
                            .clampMin(1);
                    }
                })
            )
        ]),

        levelThreeRaiseEffect: computed((): DecimalSource => {
            if (chunkAccelerator.isAtLeastLevelThree.value) {
                return Formula.variable(chunkAccelerator.resource.value)
                    .add(10)
                    .log10()
                    .pow(0.5)
                    .sqrt()
                    .step(2, f => f.sqrt())
                    .clampMin(1)
                    .evaluate();
            }

            return Decimal.dOne;
        }),

        levelEffectsDisplay: () => {
            const effects = [
                <p>
                    x{format(chunkAccelerator.dustAcceleratorModifierEffect.value)} Dust Acceleron
                    gain
                </p>
            ];

            if (chunkAccelerator.isAtLeastLevelOne.value) {
                effects.push(
                    <p>
                        x{format(chunkAccelerator.acceleratorGainModifier.apply(1))} Chunk Acceleron
                        gain
                    </p>
                );
            }

            if (chunkAccelerator.isAtLeastLevelTwo.value) {
                effects.push(
                    <p>Chunk cost ÷{format(chunkAccelerator.chunkCostDivisionEffect.value)}</p>
                );
            }

            if (chunkAccelerator.isAtLeastLevelThree.value) {
                effects.push(
                    <p>Above effects ^{format(chunkAccelerator.levelThreeRaiseEffect.value)}</p>
                );
            }

            return <>{effects}</>;
        },

        unlocked: computed(() => dustAccelerator.upgrades.chunksUnlock.bought.value),

        tick: (diff: number) => {
            if (!unlocked.value) {
                return;
            }

            chunkAccelerator.timer.value = Decimal.add(
                chunkAccelerator.timer.value,
                Decimal.dOne.times(solarLayer.mercuryTreeEffects.solarSpeed.value).times(diff)
            );

            if (Decimal.gte(chunkAccelerator.timer.value, chunkAccelerator.timerMax.value)) {
                chunkAccelerator.timer.value = 0;
                chunkAccelerator.resource.value = Decimal.add(
                    chunkAccelerator.resource.value,
                    chunkAccelerator.gainComputed.value
                );
            }
        }
    };

    const timeAccelerator = {
        timer: createResource<DecimalSource>(0),
        resource: createResource<DecimalSource>(0, "time Accelerons"),

        gainComputed: computed((): Decimal => {
            return Decimal.add(1, timeAccelerator.boostGainEffect.value)
                .times(timeAccelerator.finalCountdownEffect.value)
                .times(chunksLayer.speedingChunksEffect.value)
                .times(solarLayer.mercuryTreeEffects.eightyEight.value);
        }),

        bar: createBar(() => ({
            ...sharedBarSettings,
            progress: (): Decimal => {
                if (Decimal.lte(timeAccelerator.timerMax.value, 0.1)) {
                    return Decimal.fromNumber(100);
                }
                return Decimal.div(timeAccelerator.timer.value, timeAccelerator.timerMax.value);
            }
        })),

        bonusLevels: (minLevelRequired: number): Decimal => {
            if (Decimal.lt(timeAccelerator.acceleratorLevel.value, minLevelRequired)) {
                return Decimal.dZero;
            }

            return Decimal.sub(
                timeAccelerator.acceleratorLevel.value,
                Decimal.sub(minLevelRequired, 1)
            )
                .add(1)
                .clampMin(1);
        },

        acceleronTimerDivisionModifier: computed((): Decimal => {
            if (Decimal.lt(timeAccelerator.resource.value, 1)) {
                return Decimal.dOne;
            }

            const extraLevels = timeAccelerator.bonusLevels(1).times(25);
            return Decimal.add(timeAccelerator.resource.value, 10)
                .add(extraLevels)
                .log10()
                .sqrt()
                .pow(timeAccelerator.levelThreeRaiseEffect.value)
                .times(timeAccelerator.boostBuffEffect.value)
                .clampMin(1);
        }),

        timerMax: computed((): Decimal => {
            return Decimal.fromNumber(120)
                .div(timeAccelerator.acceleronTimerDivisionModifier.value)
                .div(timeAccelerator.doomsdayClockEffect.value)
                .div(timeAccelerator.levelTwoTimeRaiseEffect.value)
                .div(solarLayer.mercuryTreeEffects.likeThatBlueGuy.value);
        }),

        timerTickSpeedDisplay: computed((): Decimal => {
            return Decimal.fromValue(timeAccelerator.timerMax.value).div(
                solarLayer.mercuryTreeEffects.solarSpeed.value
            );
        }),

        levelBuyable: createRepeatable(() => ({
            limit: 3,
            requirements: createCostRequirement(
                (): CostRequirementOptions => ({
                    requiresPay: false,
                    resource: noPersist(timeAccelerator.resource),
                    cost: Formula.variable(timeAccelerator.levelBuyable.amount)
                        .pow_base(5)
                        .times(25)
                })
            ),
            display: {
                showAmount: false,
                title: "Upgrade",
                description:
                    "Reset Time Accelerons to unlock a new effect and buff previous effects.",
                effectDisplay: (): JSX.Element => timeAccelerator.levelEffectsDisplay()
            },
            onClick: () => {
                timeAccelerator.resource.value = 0;
            },
            classes: { "level-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-2-clip-x"
            }
        })),

        boostBuyable: createRepeatable(
            (): RepeatableOptions => ({
                visibility: timeAccelerator.isAtLeastLevelThree,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        requiresPay: false,
                        resource: timeAccelerator.resource,
                        cost: () => {
                            const buyableLevel = Decimal.fromValue(
                                timeAccelerator.boostBuyable.amount.value
                            );

                            return buyableLevel
                                .pow_base(Decimal.times(100, buyableLevel.add(1).pow(1.05)))
                                .times(1e4);
                        }
                    })
                ),
                display: {
                    showAmount: false,
                    title: "Boost",
                    description:
                        "Reset Accelerons to gain a x1.25 boost to Level 1-3 effects and +100 base Acceleron gain.",
                    effectDisplay: (): Renderable => (
                        <>
                            <br />+{format(timeAccelerator.boostGainEffect.value)} Acceleron Gain
                            <br />x{format(chunkAccelerator.boostBuffEffect.value)} Effects
                        </>
                    )
                },
                onClick: () => {
                    timeAccelerator.resource.value = 0;
                },
                classes: { "boost-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tl-2-clip-x"
                }
            })
        ),

        boostGainEffect: computed((): DecimalSource => {
            if (Decimal.gt(timeAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(100, timeAccelerator.boostBuyable.amount.value).clampMin(1);
            }

            return Decimal.dZero;
        }),

        boostBuffEffect: computed((): DecimalSource => {
            if (Decimal.gt(timeAccelerator.boostBuyable.amount.value, 0)) {
                return Decimal.times(0.25, timeAccelerator.boostBuyable.amount.value)
                    .add(1)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        upgrades: {
            autoVonDoom: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(timeAccelerator.resource),
                        cost: Decimal.fromNumber(10)
                    })
                ),
                display: {
                    title: "Auto Von Doom",
                    description: "Automate Accelerator interval buyables."
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),
            doomsDayClock: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(timeAccelerator.resource),
                        cost: Decimal.fromNumber(25)
                    })
                ),
                display: {
                    title: "Doomsday Clock",
                    description: "Reduce interval based on Collision Time.",
                    effectDisplay: (): string =>
                        `÷${format(timeAccelerator.doomsdayClockEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),
            finalCountdown: createUpgrade(() => ({
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: noPersist(timeAccelerator.resource),
                        cost: Decimal.fromNumber(100)
                    })
                ),
                display: {
                    title: "Final Countdown",
                    description: "Multiply Time Acceleron gain based on Collision Time.",
                    effectDisplay: (): string =>
                        `x${format(timeAccelerator.finalCountdownEffect.value)}`
                },
                classes: { "sd-upgrade": true },
                clickableDataAttributes: {
                    "augmented-ui": "border tr-clip"
                }
            })),
            bringItHome: createUpgrade(
                (): UpgradeOptions => ({
                    visibility: timeAccelerator.isAtLeastLevelThree,
                    requirements: createCostRequirement(
                        (): CostRequirementOptions => ({
                            resource: noPersist(timeAccelerator.resource),
                            cost: Decimal.fromNumber(500)
                        })
                    ),
                    display: {
                        title: "Bring It Home",
                        description: "Improve the Level 3 effect based on Time Accelerons.",
                        effectDisplay: (): string =>
                            `x${format(timeAccelerator.bringItHomeEffect.value)}`
                    },
                    classes: { "sd-upgrade": true },
                    clickableDataAttributes: {
                        "augmented-ui": "border tr-clip"
                    }
                })
            )
        },

        doomsdayClockEffect: computed((): Decimal => {
            if (timeAccelerator.upgrades.doomsDayClock.bought.value) {
                return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1)
                    .log10()
                    .cbrt()
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        finalCountdownEffect: computed((): Decimal => {
            if (timeAccelerator.upgrades.finalCountdown.bought.value) {
                return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1)
                    .log(8)
                    .sqrt()
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        bringItHomeEffect: computed((): Decimal => {
            if (timeAccelerator.upgrades.bringItHome.bought.value) {
                // return Decimal.dOne;
                return Decimal.add(timeAccelerator.resource.value, 1).pow(0.15).sqrt().clampMin(1);
            }

            return Decimal.dOne;
        }),

        isAtLeastLevelOne: computed((): boolean =>
            Decimal.gte(timeAccelerator.acceleratorLevel.value, 1)
        ),
        isAtLeastLevelTwo: computed((): boolean =>
            Decimal.gte(timeAccelerator.acceleratorLevel.value, 2)
        ),
        isAtLeastLevelThree: computed((): boolean =>
            Decimal.gte(timeAccelerator.acceleratorLevel.value, 3)
        ),

        acceleratorLevel: computed((): DecimalSource => timeAccelerator.levelBuyable.amount.value),

        chunkAcceleratorModifierEffect: computed((): Decimal => {
            return Decimal.add(chunkAccelerator.resource.value, 1).log2().clampMin(1);
        }),

        chunkAcceleronGainModifier: createSequentialModifier(() => [
            createMultiplicativeModifier(
                (): MultiplicativeModifierOptions => ({
                    enabled: () =>
                        timeAccelerator.isAtLeastLevelOne.value &&
                        Decimal.gt(timeAccelerator.resource.value, 0),
                    multiplier: () => {
                        const extraLevels = timeAccelerator.bonusLevels(2).clampMin(1);
                        return Decimal.add(timeAccelerator.resource.value, 2)
                            .log2()
                            .sqrt()
                            .times(extraLevels)
                            .pow(timeAccelerator.levelThreeRaiseEffect.value)
                            .times(timeAccelerator.boostBuffEffect.value)
                            .clampMin(1);
                    }
                })
            )
        ]),

        levelTwoTimeRaiseEffect: computed((): Decimal => {
            if (timeAccelerator.isAtLeastLevelTwo.value) {
                const extraLevels = timeAccelerator.bonusLevels(3).times(0.1);
                const power = Decimal.add(0.25, extraLevels);
                return Decimal.add(timeAccelerator.resource.value, 10)
                    .log10()
                    .pow(power)
                    .cbrt()
                    .pow(timeAccelerator.levelThreeRaiseEffect.value)
                    .times(timeAccelerator.boostBuffEffect.value)
                    .clampMin(1);
            }

            return Decimal.dOne;
        }),

        levelThreeRaiseEffect: computed((): DecimalSource => {
            if (
                timeAccelerator.isAtLeastLevelThree.value &&
                Decimal.gt(timeAccelerator.resource.value, 0)
            ) {
                return Formula.variable(timeAccelerator.resource.value)
                    .add(10)
                    .log10()
                    .pow(0.1)
                    .sqrt()
                    .add(timeAccelerator.bringItHomeEffect.value)
                    .step(2, f => f.sqrt())
                    .clampMin(1)
                    .evaluate();
                // return Decimal.add(timeAccelerator.resource.value, 10)
                //         .log10()
                //         .pow(0.1)
                //         .sqrt()
                //         .add(timeAccelerator.bringItHomeEffect.value)
                //         .clampMin(1);
            }

            return Decimal.dOne;
        }),

        levelEffectsDisplay: () => {
            const effects = [
                <p>
                    Timer interval ÷{format(timeAccelerator.acceleronTimerDivisionModifier.value)}
                </p>
            ];

            if (timeAccelerator.isAtLeastLevelOne.value) {
                effects.push(
                    <p>
                        x{format(timeAccelerator.chunkAcceleronGainModifier.apply(1))} Chunk
                        Acceleron gain
                    </p>
                );
            }

            if (timeAccelerator.isAtLeastLevelTwo.value) {
                effects.push(
                    <p>Time speed ^{format(timeAccelerator.levelTwoTimeRaiseEffect.value)}</p>
                );
            }

            if (timeAccelerator.isAtLeastLevelThree.value) {
                effects.push(
                    <p>Above effects ^{format(timeAccelerator.levelThreeRaiseEffect.value)}</p>
                );
            }

            return <>{effects}</>;
        },

        unlocked: computed(() => chunkAccelerator.upgrades.timeUnlock.bought.value),

        tick: (diff: number) => {
            if (!unlocked.value) {
                return;
            }

            timeAccelerator.timer.value = Decimal.add(
                timeAccelerator.timer.value,
                Decimal.dOne.times(solarLayer.mercuryTreeEffects.solarSpeed.value).times(diff)
            );

            if (Decimal.gte(timeAccelerator.timer.value, timeAccelerator.timerMax.value)) {
                timeAccelerator.timer.value = 0;
                timeAccelerator.resource.value = Decimal.add(
                    timeAccelerator.resource.value,
                    timeAccelerator.gainComputed.value
                );
            }
        }
    };

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value || mercuryLayer.hasCollidedComputed.value) {
            return;
        }

        dustAccelerator.tick(diff);
        chunkAccelerator.tick(diff);
        timeAccelerator.tick(diff);
    });

    const autoIntervalBuyers = createLazyProxy(() => {
        setupAutoPurchaseRepeatable(layer, timeAccelerator.upgrades.autoVonDoom.bought, [
            dustAccelerator.intervalBuyable,
            chunkAccelerator.intervalBuyable
        ]);

        return {};
    });

    const showDustNotification = computed(
        () =>
            (dustAccelerator.intervalBuyable.canClick.value &&
                !timeAccelerator.upgrades.autoVonDoom.bought.value) ||
            Object.values(dustAccelerator.upgrades).some(u => u.canPurchase.value) ||
            dustAccelerator.levelBuyable.canClick.value ||
            dustAccelerator.boostBuyable.canClick.value
    );
    const showChunkNotification = computed(() => {
        if (!chunkAccelerator.unlocked.value) {
            return false;
        }

        return (
            (chunkAccelerator.intervalBuyable.canClick.value &&
                !timeAccelerator.upgrades.autoVonDoom.bought.value) ||
            Object.values(chunkAccelerator.upgrades).some(u => u.canPurchase.value) ||
            chunkAccelerator.levelBuyable.canClick.value ||
            chunkAccelerator.boostBuyable.canClick.value
        );
    });
    const showTimeNotification = computed(() => {
        if (!timeAccelerator.unlocked.value) {
            return false;
        }

        return (
            Object.values(timeAccelerator.upgrades).some(u => u.canPurchase.value) ||
            timeAccelerator.levelBuyable.canClick.value ||
            timeAccelerator.boostBuyable.canClick.value
        );
    });

    const showNotification = computed(() => {
        return (
            showDustNotification.value || showChunkNotification.value || showTimeNotification.value
        );
    });

    const renderAcceleratorDisplay = (accelerator: {
        levelEffectsDisplay: () => JSX.Element;
        levelBuyable: Repeatable;
        boostBuyable: Repeatable;
        intervalBuyable?: Repeatable;
        resource: Resource;
        timerTickSpeedDisplay: ComputedRef<DecimalSource>;
        gainComputed: ComputedRef<DecimalSource>;
        bar: Bar;
    }) => {
        return (
            <div style="width: 440px;">
                <div>
                    <div data-augmented-ui="border tl-clip br-clip" style="padding: 12px 24px;">
                        <h2>
                            {format(accelerator.resource.value)} {accelerator.resource.displayName}
                        </h2>

                        <h6>
                            You are gaining {format(accelerator.gainComputed.value)} every{" "}
                            {format(accelerator.timerTickSpeedDisplay.value)} seconds.
                        </h6>
                    </div>
                    <div data-augmented-ui="border tr-clip" style="border-color: var(--outline);">
                        {render(accelerator.bar)}
                    </div>

                    {accelerator.intervalBuyable ? render(accelerator.intervalBuyable) : null}

                    <div class="accelerator-container" data-augmented-ui="border r-rect">
                        <div style="padding: 6px;">
                            <h4 style="padding-bottom: 8px;">Accelerator</h4>
                            <hr
                                color="var(--outline-lighter)"
                                style="height: 2px; width: 32px; margin: auto;"
                            />
                            <code>
                                Level {Decimal.add(accelerator.levelBuyable.amount.value, 1)}/4
                            </code>
                        </div>

                        {/* <hr />

                        <div style="padding: 0 12px 12px 12px;">
                            {render(accelerator.levelEffectsDisplay)}
                        </div> */}
                    </div>
                </div>
                <div class="flex justify-center">
                    <div class="flex">
                        {render(accelerator.levelBuyable)}
                        {render(accelerator.boostBuyable)}
                    </div>
                </div>
            </div>
        );
    };

    const tabs = createTabFamily<TabFamilyOptions>(
        {
            dust: () => ({
                display: () => <>Dust {showDustNotification.value ? "!" : null}</>,
                tab: createTab(() => ({
                    display: () => (
                        <>
                            {renderAcceleratorDisplay(dustAccelerator)}
                            <Spacer />

                            <div style="margin-bottom: 4px;">
                                <h3>Upgrades</h3>
                            </div>
                            <hr class="section-divider" />
                            <Column>
                                {renderGroupedObjects(
                                    dustAccelerator.upgrades,
                                    4,
                                    "gap: 8px; margin-bottom: 8px;"
                                )}
                            </Column>
                        </>
                    )
                }))
            }),
            chunks: () => ({
                display: () => <>Chunks {showChunkNotification.value ? "!" : null}</>,
                visibility: dustAccelerator.upgrades.chunksUnlock.bought,
                tab: createTab(() => ({
                    display: () => (
                        <>
                            {renderAcceleratorDisplay(chunkAccelerator)}
                            <Spacer />

                            <div style="margin-bottom: 4px;">
                                <h3>Upgrades</h3>
                            </div>
                            <hr class="section-divider" />
                            <Column>
                                {renderGroupedObjects(
                                    chunkAccelerator.upgrades,
                                    4,
                                    "gap: 8px; margin-bottom: 8px;"
                                )}
                            </Column>
                        </>
                    )
                }))
            }),
            time: () => ({
                display: () => <>Time {showTimeNotification.value ? "!" : null}</>,
                visibility: chunkAccelerator.upgrades.timeUnlock.bought,
                tab: createTab(() => ({
                    display: () => (
                        <>
                            {renderAcceleratorDisplay(timeAccelerator)}
                            <Spacer />

                            <div style="margin-bottom: 4px;">
                                <h3>Upgrades</h3>
                            </div>
                            <hr class="section-divider" />
                            <Column>
                                {renderGroupedObjects(
                                    timeAccelerator.upgrades,
                                    4,
                                    "gap: 8px; margin-bottom: 8px;"
                                )}
                            </Column>
                        </>
                    )
                }))
            })
        },
        () => ({
            floating: true,
            buttonStyle: {
                border: "none",
                borderBottom: `4px solid var(--outline)`
            },
            buttonActiveStyle: {
                borderColor: "var(--layer-color)"
            }
        })
    );

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer],
        onReset: () => {}
    }));

    const fullReset = () => {
        reset.reset();
        // dustAccelerator.resource.value = 0;
        // chunkAccelerator.resource.value = 0;
        // timeAccelerator.resource.value = 0;
    };

    return {
        id,
        name,
        color,
        dustAccelerator,
        chunkAccelerator,
        timeAccelerator,
        tabs,
        autoIntervalBuyers,
        showNotification,
        fullReset,
        display: () => <>{render(tabs)}</>
    };
});

export default layer;
