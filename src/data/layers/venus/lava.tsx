import { createBar } from "features/bars/bar";
import { createClickable } from "features/clickables/clickable";
import { Conversion, createCumulativeConversion } from "features/conversion";
import { createResource, displayResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { Direction } from "util/common";
import { computed, unref } from "vue";
import { format } from "util/break_eternity";
import { joinJSX, render, renderGroupedObjects } from "util/vue";
import { JSX } from "vue/jsx-runtime";
import pressureLayer from "./pressure";
import silicateLayer from "./silicate";
import venusLayer from "../venus";
import tephraLayer from "./tephra";
import "./lava.css";
import { calculateLavaEffect } from "./createLavaSubtype";
import { createCostRequirement } from "game/requirements";
import { createUpgrade } from "features/clickables/upgrade";
import { createReset } from "features/reset";
import milestonesLayer from "./milestones";
import Section from "data/components/Section.vue";
import { createRepeatable, RepeatableOptions } from "features/clickables/repeatable";
import Formula from "game/formulas/formulas";

const id = "VL";
const lavaLayer = createLayer(id, baseLayer => {
    const lavaCapIncreases = createResource<DecimalSource>(0);
    const lava = createResource<DecimalSource>(0, "Lava");
    const lavaCap = computed(() =>
        Formula.variable(lavaCapIncreases)
            .pow_base(2)
            .times(250)
            .step(1500, f => f.times(9))
            .evaluate()
    );

    const eruptions = createResource<DecimalSource>(0);

    const lavaMaxHardCap = computed(() => 50);
    const lavaMaxEffect = computed(() =>
        Formula.variable(lavaCapIncreases.value)
            .pow_base(2)
            .times(10)
            .clampMax(lavaMaxHardCap.value)
            .evaluate()
    );
    const lavaEffectHardcapped = computed(() =>
        Decimal.gte(lavaEffect.value, lavaMaxHardCap.value)
    );
    const lavaEffect = computed(() => {
        const exponent = Decimal.sub(0.8, Decimal.times(lavaCapIncreases.value, 0.01));
        return calculateLavaEffect(lava.value, lavaCap.value, 0, lavaMaxEffect.value, exponent);
    });

    const lavaEffectBuildAmount = computed(() => Decimal.add(5, allSevensEffect.value));

    const createLavaResourceDisplay = () => {
        const resource = lava;
        const resourceCap = lavaCap;
        const capIncreases = lavaCapIncreases;
        const increaseCap = createClickable(() => ({
            canClick: () => Decimal.eq(resource.value, resourceCap.value),
            classes: { "squashed-clickable": true, flex: true, "increase-lava-cap": true },
            display: (
                <>
                    <div class="p-2">
                        <h3>Increase Cap</h3>

                        <div>
                            Reset {resource.displayName} to increase cap, max effect, and max
                            Effusive Eruption.
                        </div>
                    </div>
                </>
            ),
            onClick: () => {
                if (unref(increaseCap.canClick) === false) {
                    return;
                }

                resource.value = 0;
                capIncreases.value = Decimal.add(capIncreases.value, 1);
            },
            dataAttributes: {
                "augmented-ui": "border br-round-inset bl-round-inset"
            }
        }));

        const bar = createBar(() => ({
            direction: Direction.Right,
            height: 32,
            width: "100%",
            style: {
                overflow: "hidden"
            },
            borderStyle: {
                borderRadius: "0"
            },
            display: () => (
                <>
                    <h4 class="text-venus-500 text-shadow-lg">
                        {format(resource.value)}/{format(resourceCap.value)}
                    </h4>
                </>
            ),
            progress: () => {
                if (Decimal.gt(resourceCap.value, 1e10)) {
                    return Decimal.div(Decimal.ln(resource.value), Decimal.ln(resourceCap.value));
                }

                return Decimal.div(resource.value, resourceCap.value);
            }
        }));

        return {
            display: computed(() => (
                <>
                    <div
                        class="cappable-resource-container w-full h-full"
                        data-augmented-ui="border tl-2-clip-x"
                        id="lava-display"
                    >
                        <div class="py-2">
                            <h3 class="title">Molten Lava</h3>
                            <h5>Level {Decimal.add(capIncreases.value, 1)}</h5>
                        </div>
                        <div data-augmented-ui="border tl-clip">{render(bar)}</div>
                        <div class="flex flex-col bg-(--raised-background) p-2">
                            <h5>
                                Chance for Pressure to build by an additional x
                                {format(lavaEffectBuildAmount.value)}
                            </h5>
                            <br />
                            <h5 class="font-semibold">
                                {format(lavaEffect.value)}%/{format(lavaMaxEffect.value)}%{" "}
                                {lavaEffectHardcapped.value ? (
                                    <h5 class="font-semibold text-red-400">(capped)</h5>
                                ) : null}
                            </h5>
                        </div>
                    </div>
                    <div class="increase-cap-action">{render(increaseCap)}</div>
                </>
            )),
            increaseCap,
            capIncreases
        };
    };

    const lavaDisplay = createLavaResourceDisplay();

    // Now only used for explosive eruption. Need to double check the conversion rate
    const lavaConversion = createCumulativeConversion(() => ({
        formula: x =>
            x
                .log2()
                // .add(residualHeatEffect)
                // .if(
                //     () => pressureCapped.value,
                //     f => f.times(1.5)
                // )
                // .pow(tephraLavaGainEffect.value)
                .clampMax(lavaCap.value),
        baseResource: pressureLayer.pressure,
        gainResource: noPersist(lava),
        convert: () => {
            lava.value = Decimal.min(lava.value, lavaCap.value);
        }
    }));

    const eruptionGainDisplay = (conversion: Conversion, cap?: DecimalSource) => {
        cap ||= Decimal.dInf;
        const capped = Decimal.gte(unref(conversion.currentGain), cap);
        const willBeCapped = Decimal.gte(
            Decimal.add(unref(conversion.currentGain), conversion.gainResource.value),
            cap
        );
        const gain = willBeCapped
            ? Decimal.sub(cap, conversion.gainResource.value)
            : Decimal.max(unref(conversion.currentGain), 1);

        const cappedDisplay = capped ? "(capped)" : willBeCapped ? "(after cap)" : null;
        return joinJSX(
            [
                <b>{displayResource(conversion.gainResource, gain)}</b>,
                <> </>,
                <>
                    {conversion.gainResource.displayName} {cappedDisplay}
                </>
            ],
            <></>
        );
    };

    const effusiveEruptionButton = createClickable(() => ({
        classes: {
            "lava-reset-button": true
        },
        display: (): JSX.Element => {
            return (
                <span>
                    <h3>Effusive Eruption</h3>
                    <br />
                    Reset Pressure
                    <br />
                    <span class="font-semibold">
                        Gain {eruptionGainDisplay(lavaConversion, lavaCap.value)}
                    </span>
                </span>
            );
        },
        onClick: () => {
            if (effusiveEruptionButton.canClick === false) {
                return;
            }

            lavaConversion.convert();
        },
        canClick: computed(() => Decimal.gte(unref(lavaConversion.actualGain), 1)),
        dataAttributes: {
            "augmented-ui": "border br-round-inset tl-clip bl-2-clip-x tr-clip"
        }
    }));

    const explosiveEruptionReset = createReset(() => ({
        thingsToReset: [],
        onReset: () => {
            eruptions.value = Decimal.add(eruptions.value, 1);
            lava.value = Decimal.min(milestonesLayer.fiveMilestoneEffect.value, lavaCap.value);
        }
    }));

    const explosiveEruptionButton = createClickable(() => ({
        classes: {
            "lava-reset-button": true
        },
        display: (): JSX.Element => {
            return (
                <>
                    <span>
                        <h3>Explosive Eruption</h3>
                        <br />
                        {pressureLayer.pressureCapped.value ? (
                            <>
                                Reset Pressure Tab & Molten/Silicate Lava resources for:
                                <br />
                                <span class="font-semibold">
                                    {eruptionGainDisplay(tephraLayer.tephraConversion)}
                                </span>
                                <br />
                                <span class="font-semibold">
                                    Destroy ^{format(venusLayer.massDestructionAmount.value)} of the
                                    planet's mass
                                </span>
                                <br />
                                <span class="font-semibold">
                                    Raise Explosive Eruption requirement to ^2
                                </span>
                                <br />
                                <span></span>
                            </>
                        ) : (
                            "Requires Pressure to be capped."
                        )}
                    </span>
                </>
            );
        },
        onClick: () => {
            if (unref(explosiveEruptionButton.canClick) === false) {
                return;
            }

            venusLayer.planetMass.value = Decimal.pow(
                venusLayer.planetMass.value,
                venusLayer.massDestructionAmount.value
            );

            lavaConversion.convert();

            tephraLayer.tephraConversion.convert();

            explosiveEruptionReset.reset();
            silicateLayer.explosiveEruptionReset.reset();
            pressureLayer.explosiveEruptionReset.reset();
        },
        canClick: computed(() => pressureLayer.pressureCapped.value),
        dataAttributes: {
            "augmented-ui": "border bl-round-inset br-2-scoop tr-scoop-inset"
        }
    }));

    const unlocked = computed(
        (): boolean =>
            pressureLayer.upgrades.effusiveEruption.bought.value || Decimal.gt(eruptions.value, 0)
    );

    // Add a tephra upgrade to increase this
    const passiveLavaGainCap = computed(() =>
        Decimal.add(lavaDisplay.capIncreases.value, 1).times(0.05)
    );
    const isPassiveLavaGainCapped = computed(() =>
        Decimal.gte(passiveLavaGain.value, passiveLavaGainCap.value)
    );

    const passiveLavaGain = computed((): DecimalSource => {
        if (pressureLayer.upgrades.effusiveEruption.bought.value) {
            return Decimal.fromNumber(0.01)
                .add(milestonesLayer.oneMilestoneEffect.value)
                .times(itsGettingHotInHereEffect.value)
                .times(pressureLayer.lavaFlowffect.value)
                .times(theStreamsAreAliveEffect.value)
                .clampMax(passiveLavaGainCap.value);
        }

        return Decimal.dZero;
    });

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        if (pressureLayer.upgrades.effusiveEruption.bought.value) {
            lava.value = Decimal.add(
                lava.value,
                Decimal.times(passiveLavaGain.value, diff)
            ).clampMax(lavaCap.value);
        }
    });

    // Reduce lava cost for conversion.
    // Reduce conversion time

    const theStreamsAreAliveEffect = computed((): DecimalSource => {
        if (lavaUpgrades.theStreamsAreAlive.bought.value) {
            return Decimal.add(
                silicateLayer.felsic.resource.value,
                silicateLayer.intermediate.resource.value
            )
                .add(silicateLayer.mafic.resource.value)
                .add(2)
                .log2()
                .cbrt()
                .clampMin(1);
        }

        return Decimal.dOne;
    });

    const liveStreamingEffect = computed(() => {
        if (lavaUpgrades.liveStreaming.bought.value) {
            return Decimal.add(lava.value, 10).log10().sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    const lavaUpgrades = {
        silicateLava: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 25
            })),
            display: {
                title: "Silicate Lava",
                description: "Unlock Silicate Lavas"
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        theStreamsAreAlive: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 75
            })),
            display: {
                title: "The Streams Are Alive",
                description: "Increase Effusive Eruption based on sum of Silicate Lavas.",
                effectDisplay: () => `x${format(theStreamsAreAliveEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        liveStreaming: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 500
            })),
            display: {
                title: "Live Streaming",
                description: "Increase Effusive Eruption based on Molten Lava.",
                effectDisplay: () => `x${format(liveStreamingEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const showNotification = computed((): boolean => {
        return (
            unlocked.value &&
            (Object.values(lavaUpgrades).some(u => u.canPurchase.value) ||
                unref(explosiveEruptionButton.canClick) === true ||
                unref(lavaDisplay.increaseCap.canClick) === true)
        );
    });

    // Increase chance cap?
    // Silicate lavas boost each other?
    const tephraUpgrades = {
        // Need 3
        // Improve streams are alive effect
        placeholder1: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 1000
            })),
            display: {
                title: "Placeholder 1",
                description: "Placeholder 1"
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        placeholder2: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 1500
            })),
            display: {
                title: "Placeholder 2",
                description: "Placeholder 2"
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        placeholder3: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: lava,
                cost: 2000
            })),
            display: {
                title: "Placeholder 3",
                description: "Placeholdre 3"
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const itsGettingHotInHereEffect = computed(() => {
        if (Decimal.gt(tephraBuyables.itsGettingHotInHere.amount.value, 0)) {
            return Decimal.times(tephraBuyables.itsGettingHotInHere.amount.value, 0.001);
        }

        return Decimal.dOne;
    });

    const allSevensEffect = computed(() => {
        if (Decimal.gt(tephraBuyables.allSevens.amount.value, 0)) {
            return Decimal.times(tephraBuyables.allSevens.amount.value, 0.777);
        }

        return Decimal.dZero;
    });

    const tephraBuyables = {
        itsGettingHotInHere: createRepeatable(
            (): RepeatableOptions => ({
                visibility: tephraLayer.upgrades.shinyRocks.bought,
                requirements: createCostRequirement(() => ({
                    resource: lava,
                    cost: Formula.variable(tephraBuyables.itsGettingHotInHere.amount)
                        .pow_base(1.5)
                        .times(250)
                })),
                display: {
                    title: "It's Getting Hot In Here",
                    description: "Increase Effusive Eruption by x1.1 per level.",
                    effectDisplay: () => `x${format(itsGettingHotInHereEffect.value)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        ),
        allSevens: createRepeatable(
            (): RepeatableOptions => ({
                visibility: tephraLayer.upgrades.shinyRocks.bought,
                requirements: createCostRequirement(() => ({
                    resource: lava,
                    cost: Formula.variable(tephraBuyables.itsGettingHotInHere.amount)
                        .pow_base(1.5)
                        .times(100)
                })),
                display: {
                    title: "All Sevens",
                    description: "Increase Lava Pressure Build effect by +0.777 per level.",
                    effectDisplay: () => `+${format(allSevensEffect.value)}`
                },
                classes: { "normal-repeatable": true },
                clickableDataAttributes: {
                    "augmented-ui": "border bl-scoop-x"
                }
            })
        )
    };

    return {
        id,
        lava,
        lavaCapIncreases,
        lavaEffect,
        lavaCap,
        eruptions,
        unlocked,
        passiveLavaGain,
        lavaUpgrades,
        showNotification,
        tephraBuyables,
        tephraUpgrades,
        lavaEffectBuildAmount,
        display: () => (
            <>
                <div id="lava-layer">
                    <Section header="Molten Lava">
                        <div class="w-[512px] mb-10 flex flex-col">
                            <div class="flex m-0 flex-1">
                                <div
                                    class="m-0 h-[160px] flex flex-col flex-1"
                                    data-augmented-ui="border br-round-inset tl-clip bl-2-clip-x tr-clip"
                                >
                                    <div>
                                        <h5 class="m-0">Effusive Eruption</h5>
                                        <h5 class="font-semibold m-0">
                                            You are gaining {format(passiveLavaGain.value)}{" "}
                                            {lava.displayName}/s
                                        </h5>
                                        {isPassiveLavaGainCapped.value ? (
                                            <h5 class="font-semibold m-0">(capped)</h5>
                                        ) : null}
                                    </div>
                                </div>
                                <div class="m-0 flex-1">{render(explosiveEruptionButton)}</div>
                            </div>
                            <div class="flex flex-col flex-1 m-0">
                                <div class="flex-1 m-0">{render(lavaDisplay.display.value)}</div>
                            </div>
                        </div>
                    </Section>

                    {tephraLayer.upgrades.shinyRocks.bought.value ? (
                        <Section header="Buyables">
                            {renderGroupedObjects(tephraBuyables, 2)}
                        </Section>
                    ) : null}

                    <Section header="Upgrades">
                        {renderGroupedObjects(lavaUpgrades, 3)}
                        {renderGroupedObjects(tephraUpgrades, 3)}
                    </Section>
                </div>
            </>
        )
    };
});

export default lavaLayer;
