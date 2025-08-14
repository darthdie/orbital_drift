import { format } from "util/break_eternity";
import { createResource, trackBest } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { render, renderGroupedObjects } from "util/vue";
import { createLayer } from "game/layers";
import "./pressure.css";
import lavaLayer from "./lava";
import { createUpgrade } from "features/clickables/upgrade";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import silicateLayer from "./silicate";
import { createReset } from "features/reset";
import tephraLayer from "./tephra";
import Section from "data/components/Section.vue";
import { createRepeatable, RepeatableOptions } from "features/clickables/repeatable";
import venusLayer from "../venus";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");
    const bestPressure = trackBest(pressure);

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        (): DecimalSource =>
            Formula.variable(15)
                .sub(volcanoesForDummiesIntervalEffect)
                .times(pressureDampeningIntervalEffect.value)
                .div(silicateLayer.mafic.effect.value)
                .div(tephraLayer.greenIsNotACreativeColorEffect.value)
                .div(anxietyInducingEffect.value)
                .evaluate()
    );

    const truePressureChance = computed(
        (): Decimal =>
            Decimal.add(10, silicateLayer.felsic.effect.value)
                .add(whatreTheOddsEffect.value)
                .add(volcanoesForDummiesChanceEffect.value)
                .times(tephraLayer.gamblingManEffect.value)
    );

    const pressureChance = computed((): Decimal => truePressureChance.value.clampMax(100));
    const pressureChanceMaxed = computed(() => Decimal.gte(pressureChance.value, 100));
    const pressureGainMultiplier = computed(
        (): Decimal =>
            Decimal.add(1.3, volcanoesForDummiesMultEffect.value)
                .add(imFineEffect.value)
                .times(silicateLayer.intermediate.effect.value)
                .times(tephraLayer.blobTheBuilderEffect.value)
                .times(popGoesTheWeaselEffect.value)
    );

    const iveGotToBreakFreeEffect = computed(() => {
        if (tephraUpgrades.iveGotToBreakFree.bought.value) {
            return Decimal.times(pressureChance.value, 0.1).add(1);
        }

        return Decimal.dOne;
    });

    // const pressureDampeningIntervalFormula = Formula.if(
    //     () => pressure.value,
    //     () => Decimal.lt(pressure.value, 1e25),
    //     f => f.min(1),
    //     // Increase interval for every OOM past 1e25
    //     f => {
    //         console.log(f.evaluate())
    //         return f.log10().sub(24).cbrt().div(iveGotToBreakFreeEffect).clampMin(1);
    //     }
    // );

    // const pressureDampeningIntervalFormula = Formula.variable(pressure)
    //     .if(
    //         () => Decimal.lt(pressure.value, 1e25),
    //         f => f.min(1),
    //     )
    //     // Increase interval for every OOM past 1e25
    //     .log10().sub(24).cbrt().div(iveGotToBreakFreeEffect).clampMin(1);

    const pressureDampeningIntervalEffect = computed(() => {
        if (Decimal.gte(pressure.value, 1e25)) {
            return Decimal.log10(pressure.value)
                .sub(24)
                .cbrt()
                .div(iveGotToBreakFreeEffect.value)
                .clampMin(1);
        }

        return Decimal.dOne;
    });

    const isPressureIntervalDampened = computed(() => Decimal.gt(pressure.value, 1e25));

    const pressureMax = computed((): DecimalSource => {
        const pow = Decimal.pow(2, lavaLayer.eruptions.value);
        return Decimal.fromNumber(1e25).pow(pow).pow(tephraLayer.youreGonnaMakeMeBlowEffect.value);
    });
    const pressureCapped = computed(() => Decimal.gte(pressure.value, pressureMax.value));

    const unlocked = computed((): boolean => venusLayer.unlocked.value);

    const pressureBar = createBar(() => ({
        direction: Direction.Right,
        height: 24,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        },
        display: () => (
            <span class="text-shadow-lg text-venus-500">
                {format(pressure.value)}/{format(pressureMax.value)}
            </span>
        ),
        progress: () => Decimal.div(Decimal.ln(pressure.value), Decimal.ln(pressureMax.value))
    }));

    const pressureTimerBar = createBar(() => ({
        direction: Direction.Right,
        height: 24,
        width: "100%",
        progress: () => Decimal.div(pressureTimer.value, pressureTimerMax.value),
        display: () => (
            <span class="text-shadow-lg text-venus-500">
                {format(Decimal.sub(pressureTimerMax.value, pressureTimer.value))}
            </span>
        ),
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        }
    }));

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        tickPressure(diff);
    });

    function tickPressure(diff: number) {
        if (pressureCapped.value) {
            pressureTimer.value = Decimal.dZero;
            return;
        }

        pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

        if (pressureTimer.value.lt(pressureTimerMax.value)) {
            return;
        }

        pressureTimer.value = 0;

        const rng = random();
        if (Decimal.gte(pressureChance.value, rng)) {
            let buildAmount = pressureGainMultiplier.value;

            if (Decimal.gt(lavaLayer.lavaEffect.value, 0)) {
                if (Decimal.gte(lavaLayer.lavaEffect.value, random())) {
                    buildAmount = buildAmount.times(lavaLayer.lavaEffectBuildAmount.value);
                    console.log("KICK");
                }
            }

            pressure.value = Decimal.multiply(
                Decimal.clampMin(pressure.value, 1),
                buildAmount
            ).clampMax(pressureMax.value);
        }
    }

    const lavaFlowffect = computed(() => {
        if (upgrades.lavaFlow.bought.value) {
            const growthCurve = 0.3;

            return (
                Formula.variable(pressure.value)
                    .add(1)
                    //
                    //
                    .log10()
                    .pow(growthCurve)
                    .times(underPressureEffect.value)
                    .times(redHotEffect.value)
                    .step(3, f => f.pow(0.5))
                    .clampMin(1)
                    .evaluate()
            );
        }

        return Decimal.dOne;
    });

    const underPressureEffect = computed(() => {
        if (upgrades.underPressure.bought.value) {
            return Decimal.times(pressureGainMultiplier.value, 0.1).add(1);
        }

        return Decimal.dOne;
    });

    const redHotEffect = computed(() => {
        if (upgrades.redHot.bought.value) {
            return Decimal.log(pressure.value, 1e15).sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const upgrades = {
        effusiveEruption: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 5
            })),
            display: {
                title: "Effusive Eruption",
                description: "Unlock Lava & Passive Lava gain.",
                effectDisplay: () => `${format(lavaLayer.passiveLavaGain.value)}/s`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        lavaFlow: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 100
            })),
            display: {
                title: "Lava Flow",
                description: "Increase Effusive Eruption based on Pressure.",
                effectDisplay: () => `x${format(lavaFlowffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        underPressure: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e6
            })),
            display: {
                title: "Under Pressure",
                description: "Increase the effect of 'Lava Flow' based on Build Mult.",
                effectDisplay: () => `x${format(underPressureEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        redHot: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e15
            })),
            display: {
                title: "Red Hot",
                description:
                    "Increase the effect of 'Lava Flow' based on Pressure (>1e15) at a reduced rate.",
                effectDisplay: () => `x${format(redHotEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const whatreTheOddsEffect = computed(() => {
        if (Decimal.gt(tephraBuyables.whatreTheOdds.amount.value, 0)) {
            return Decimal.times(0.25, tephraBuyables.whatreTheOdds.amount.value);
        }

        return Decimal.dZero;
    });

    const imFineEffect = computed(() => {
        if (Decimal.gt(tephraBuyables.imFine.amount.value, 0)) {
            return Decimal.times(0.25, tephraBuyables.imFine.amount.value);
        }

        return Decimal.dZero;
    });

    const anxietyInducingEffect = computed(() => {
        if (Decimal.gt(tephraBuyables.anxietyInducing.amount.value, 0)) {
            return Decimal.times(0.01, tephraBuyables.anxietyInducing.amount.value).add(1);
        }

        return Decimal.dOne;
    });

    const tephraBuyables = {
        whatreTheOdds: createRepeatable(
            (): RepeatableOptions => ({
                visibility: tephraLayer.upgrades.shinyRocks.bought,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: pressure,
                        // 100 is the starting cost, increase by an OOM every level
                        cost: Formula.variable(100).times(
                            Formula.pow(100, tephraBuyables.whatreTheOdds.amount)
                        )
                    })
                ),
                display: {
                    title: "What're The Odds?",
                    description: "Increase base Pressure Build Chance by +0.25% per level.",
                    effectDisplay: (): string => `+${format(whatreTheOddsEffect.value)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),
        imFine: createRepeatable(
            (): RepeatableOptions => ({
                visibility: tephraLayer.upgrades.shinyRocks.bought,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: pressure,
                        cost: Formula.variable(1e4).times(
                            Formula.pow(1000, tephraBuyables.whatreTheOdds.amount)
                        )
                    })
                ),
                display: {
                    title: "I'M FINE",
                    description: "Increase base Pressure Build Mult by +0.25 per level.",
                    effectDisplay: (): string => `+${format(imFineEffect.value)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),
        anxietyInducing: createRepeatable(
            (): RepeatableOptions => ({
                visibility: tephraLayer.upgrades.shinyRocks.bought,
                requirements: createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: pressure,
                        cost: Formula.variable(1e7).times(
                            Formula.pow(10000, tephraBuyables.whatreTheOdds.amount)
                        )
                    })
                ),
                display: {
                    title: "anxiety inducING",
                    description: "Divide Pressure Interval by +0.01 per level.",
                    effectDisplay: (): string => `÷${format(anxietyInducingEffect.value)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        )
    };

    const volcanoesForDummiesChanceEffect = computed(() =>
        Decimal.fromNumber(tephraUpgrades.volcanoesForDummies.bought.value ? 5 : 0)
    );

    const volcanoesForDummiesMultEffect = computed(() =>
        Decimal.fromNumber(tephraUpgrades.volcanoesForDummies.bought.value ? 0.5 : 0)
    );

    const volcanoesForDummiesIntervalEffect = computed(() =>
        Decimal.fromNumber(tephraUpgrades.volcanoesForDummies.bought.value ? 0.5 : 0)
    );

    const popGoesTheWeaselEffect = computed(() => {
        if (
            tephraUpgrades.popGoesTheWeasel.bought.value &&
            Decimal.gt(pressureTimerMax.value, 15)
        ) {
            return Decimal.sub(pressureTimerMax.value, 15).times(0.02).add(1);
        }

        return Decimal.dOne;
    });

    const snowballsChanceInLavaEffect = computed(() => {
        if (tephraUpgrades.snowballsChanceInLava.bought.value) {
            return Decimal.sub(1, Decimal.log10(pressureChance.value).times(0.1));
        }

        return Decimal.dOne;
    });

    // Probably softcap?
    // Uncap pressure chance, and each /100% has a chance to proc?
    // Chance past 100 boosts...interval or mult?
    const tephraUpgrades = {
        volcanoesForDummies: createUpgrade(() => ({
            visibility: tephraLayer.upgrades.secretsLongBuried.bought,
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 15
            })),
            display: {
                title: "Volcanoes 4 Dummies",
                description:
                    "Add +5% to base Chance, +0.5x to base Build Mult, and -0.5s to base Interval."
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        popGoesTheWeasel: createUpgrade(() => ({
            visibility: tephraLayer.upgrades.secretsLongBuried.bought,
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e30 // Reachable after first eruption
            })),
            display: {
                title: "POP Goes the Weasel",
                description: "Increase Build Mult based on Interval when it's >15s.",
                effectDisplay: () => `x${format(popGoesTheWeaselEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        iveGotToBreakFree: createUpgrade(() => ({
            visibility: tephraLayer.upgrades.secretsLongBuried.bought,
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e75 // Reachable after 2nd eruption
            })),
            display: {
                title: "I'VE GOT TO BREAK FREE",
                description: "Decrease Pressure Dampening based on Build Mult.",
                effectDisplay: () => `${format(iveGotToBreakFreeEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        snowballsChanceInLava: createUpgrade(() => ({
            visibility: tephraLayer.upgrades.secretsLongBuried.bought,
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e150 // reachable 3rd eruption
            })),
            display: {
                title: "A Snowball's Chance In Lava",
                description: "Decrease Pressure Dampening based on Build Chance.",
                effectDisplay: () => `^${format(snowballsChanceInLavaEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const eruptionPressureDivisor = 0.6;
    const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1));

    const showNotification = computed(() => {
        return unlocked.value && Object.values(upgrades).some(u => u.canPurchase.value);
    });

    const explosiveEruptionReset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [pressureLayer]
    }));

    return {
        pressure,
        bestPressure,
        pressureTimer,
        eruptionPenalityDisplay,
        pressureBar,
        pressureTimerMax,
        pressureChance,
        pressureGainMultiplier,
        pressureTimerBar,
        pressureMax,
        lavaFlowffect,
        pressureCapped,
        upgrades,
        showNotification,
        explosiveEruptionReset,
        tephraUpgrades,
        tephraBuyables,
        display: () => (
            <>
                <div id="pressure-tab">
                    <Section header="Volcano">
                        <div class="w-[312px] mb-2">
                            <div
                                data-augmented-ui="border tl-clip-y tr-round-inset"
                                class="border-(--outline)"
                            >
                                <div class="p-4">
                                    <h3>{pressure.displayName}</h3>
                                    <h6 class="font-semibold">
                                        {format(pressureChance.value)}%
                                        {pressureChanceMaxed.value ? " (capped)" : null} Chance for
                                        Pressure to Build by x{format(pressureGainMultiplier.value)}{" "}
                                        every {format(pressureTimerMax.value)} seconds.
                                    </h6>
                                </div>
                            </div>

                            <div
                                data-augmented-ui="border bl-clip"
                                class="border-(--outline)"
                                id="pressure-timer-bar"
                            >
                                {render(pressureTimerBar)}
                            </div>

                            <div data-augmented-ui="border br-clip" class="border-(--outline)">
                                {render(pressureBar)}
                            </div>
                        </div>

                        {isPressureIntervalDampened.value ? (
                            <h5 class="text-red-400 font-semibold">
                                Due to Dampening, Pressure Interval is being multiplied by x
                                {format(pressureDampeningIntervalEffect.value)}
                            </h5>
                        ) : null}
                    </Section>

                    {tephraLayer.upgrades.shinyRocks.bought.value ? (
                        <Section header="Buyables">
                            {renderGroupedObjects(tephraBuyables, 4)}
                        </Section>
                    ) : null}

                    <Section header="Upgrades">
                        {renderGroupedObjects(upgrades, 4)}
                        {tephraLayer.upgrades.secretsLongBuried.bought.value
                            ? renderGroupedObjects(tephraUpgrades, 4)
                            : null}
                    </Section>
                </div>
            </>
        )
    };
});

export default pressureLayer;
