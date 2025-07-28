import { format } from "util/break_eternity";
import Spacer from "components/layout/Spacer.vue";
import { createResource, displayResource, Resource } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed, ComputedRef, ref, Ref, unref } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { joinJSX, render } from "util/vue";
import { createLayer } from "game/layers";
import { createClickable } from "features/clickables/clickable";
import Toggle from "components/fields/Toggle.vue";
import Slider from "components/fields/Slider.vue";
import { JSX } from "vue/jsx-runtime";
import { Conversion, createCumulativeConversion, createIndependentConversion } from "features/conversion";
import { noPersist } from "game/persistence";
import Formula from "game/formulas/formulas";
import venusLayer from "../venus";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");

    const lavaCapIncreases = createResource<DecimalSource>(0);
    const lava = createResource<DecimalSource>(0, "Lava");
    const lavaCap = computed(() =>
        Decimal.fromNumber(250).times(Decimal.times(lavaCapIncreases.value, 2).clampMin(1))
    );

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        () => Decimal.fromNumber(15)
        // Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
        //     .div(pressureIntervalBuyableEffect.value)
        //     .div(lavaIsFloorEffect.value)
        //     .div(maficEffect.value)
        //     .div(hotPotEffect.value)
        //     .pow(tephraPressureIntervalEffect.value)
    );
    const pressureChance = computed(
        () => Decimal.fromNumber(10)
        // Decimal.add(10, pressureChanceBuyableEffect.apply(0))
        //     .add(floorIsLavaEffect.value)
        //     .add(bubblingEffect.value)
        //     .pow(tephraPressureChanceEffect.value)
    );
    const pressureGainMultiplier = computed(
        () => Decimal.fromNumber(1.3)
        // Decimal.times(1.3, pressureMultBuyableEffect.value)
        //     .times(riceCookerEffect.value)
        //     .pow(tephraPressureGainEffect.value)
    );
    const eruptions = createResource<DecimalSource>(0);
    const pressureMax = computed(() => {
        const pow = Decimal.pow(2, eruptions.value);
        return Decimal.fromNumber(1e25).pow(pow);
    });
    const pressureCapped = computed(() => Decimal.eq(pressure.value, pressureMax.value));

    const pressureBar = createBar(() => ({
        direction: Direction.Right,
        height: 14,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline-lighter)"
        },
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
            borderColor: "var(--outline-lighter)"
        }
    }));

    const unlocked = computed(() => true);

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value || pressureCapped.value) {
            return;
        }

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
        console.log({rng})
        if (Decimal.gte(pressureChance.value, rng)) {
            const buildAmount = pressureGainMultiplier.value;

            // if (pressureUpgrades.extraKick.bought.value) {
            //     if (Decimal.gte(10, random())) {
            //         buildAmount = buildAmount.times(5);
            //         console.log("KICK");
            //     }
            // }

            pressure.value = Decimal.multiply(
                Decimal.clampMin(pressure.value, 1),
                buildAmount
            ).clampMax(pressureMax.value);
        }
    });

    /*
        Pressure
        -> Lava
        --> Felsic
        ---> Pressure Build %
        --> Intermediate
        ---> Pressure Build X
        --> Mafic
        ---> Pressure Interval

        Ultramafic?
    */

    const felsicLava = createResource<DecimalSource>(0, "Felsic");
    const felsicLavaCapIncreases = createResource<DecimalSource>(0);
    const felsicLavaCap = computed(() =>
        Decimal.fromNumber(50).times(Decimal.times(felsicLavaCapIncreases.value, 2).clampMin(1))
    );
    const felsicMaxEffect = computed(() => {
        // 50 -> Max +5%?
        return Decimal.div(felsicLavaCap.value, 10);
    });
    const felsicEffect = computed(() => {
        // Determine the current % of lava vs cap
        // And return that % of the max effect.
        return Decimal.times(
            felsicMaxEffect.value,
            Decimal.div(felsicLava.value, felsicLavaCap.value)
        );
    });

    const intermediateLava = createResource<DecimalSource>(0, "Intermediate");
    const intermediateLavaCapIncreases = createResource<DecimalSource>(0);
    const intermediateLavaCap = computed(() =>
        Decimal.fromNumber(75).times(
            Decimal.times(intermediateLavaCapIncreases.value, 2).clampMin(1)
        )
    );

    const intermediateMaxEffect = computed(() => {
        return Decimal.div(intermediateLavaCap.value, 10);
    });

    const intermediateEffect = computed(() => {
        return Decimal.times(
            intermediateMaxEffect.value,
            Decimal.div(intermediateLava.value, intermediateLavaCap.value)
        ).clampMin(1);
    });

    const maficLava = createResource<DecimalSource>(0, "Mafic");
    const maficLavaCapIncreases = createResource<DecimalSource>(0);
    const maficLavaCap = computed(() =>
        Decimal.fromNumber(100).times(Decimal.times(maficLavaCapIncreases.value, 2).clampMin(1))
    );

    const maficMaxEffect = computed(() => {
        return Decimal.div(maficLavaCap.value, 66.66);
    });

    const maficEffect = computed(() => {
        return Decimal.times(
            maficMaxEffect.value,
            Decimal.div(maficLava.value, maficLavaCap.value)
        ).clampMin(1);
    });

    const createResourceDisplay = (
        resource: Resource,
        resourceCap: ComputedRef<DecimalSource>,
        capIncreases: Ref<DecimalSource>
    ) => {
        const increaseCap = createClickable(() => ({
            canClick: () => Decimal.eq(resource.value, resourceCap.value),
            classes: { "squashed-clickable": true, flex: true },
            display: {
                title: "Increase Cap",
                description: <>Reset {resource.displayName} to double cap.</>
            },
            onClick: () => {
                if (unref(increaseCap.canClick) === false) {
                    return;
                }

                resource.value = 0;
                capIncreases.value = Decimal.add(capIncreases.value, 1);
            }
        }));

        const bar = createBar(() => ({
            direction: Direction.Right,
            height: 18,
            width: "100%",
            style: {
                overflow: "hidden"
            },
            borderStyle: {
                borderRadius: "0"
            },
            progress: () => {
                if (Decimal.gt(resourceCap.value, 1e10)) {
                    return Decimal.div(Decimal.ln(resource.value), Decimal.ln(resourceCap.value));
                }

                return Decimal.div(resource.value, resourceCap.value);
            }
        }));

        return computed(() => (
            <div
                class="cappable-resource-container w-full"
                data-augmented-ui="border tl-2-clip-x br-round-inset"
                id="lava-display"
            >
                <h3 class="title py-6">{resource.displayName}</h3>
                <div data-augmented-ui="border tl-clip">{render(bar)}</div>
                <div class="resource-display">
                    <h4>
                        {format(resource.value)}/{format(resourceCap.value)}
                    </h4>
                </div>
                <div class="increase-cap-action">{render(increaseCap)}</div>
            </div>
        ));
    };

    const lavaDisplay = createResourceDisplay(lava, lavaCap, lavaCapIncreases);

    const createLavaResourceDisplay = (
        resource: Resource,
        cap: ComputedRef<DecimalSource>,
        capIncreases: Resource,
        effectDisplayTitle: string,
        effectDisplayText: ComputedRef<string>,
        effectDisplayAugmentedUi: string,
        argumentedUi: string
    ) => {
        const bar = createBar(() => ({
            direction: Direction.Up,
            progress: () => Decimal.div(resource.value, cap.value),
            display: () => (
                <>
                    <h4 class="text-venus-500 text-shadow-lg">
                        {format(resource.value)}/{format(cap.value)}
                    </h4>
                </>
            ),
            width: "100%",
            height: "128px",
            borderStyle: {
                border: "0",
                borderRadius: "0"
            }
        }));

        const increaseCap = createClickable(() => ({
            canClick: () => Decimal.eq(resource.value, cap.value),
            classes: { "squashed-clickable": true, flex: true },
            display: {
                title: "Increase Cap",
                description: <>Reset {resource.displayName} to double cap & max effect.</>
            },
            onClick: () => {
                if (unref(increaseCap.canClick) === false) {
                    return;
                }

                resource.value = 0;
                capIncreases.value = Decimal.add(capIncreases.value, 1);
            }
        }));

        const id = `${resource.displayName.toLocaleLowerCase()}-display`;
        return computed(() => (
            <div data-augmented-ui={argumentedUi} class="flex-1 m-0 border-0" id={id}>
                <div class="py-2">
                    <h3>{resource.displayName}</h3>
                </div>
                <div data-augmented-ui={effectDisplayAugmentedUi} class="mt-1 py-2">
                    <h5>{effectDisplayTitle}</h5>
                    <h5 class="font-semibold">{effectDisplayText.value}</h5>
                </div>
                <div>{render(bar)}</div>
                {render(increaseCap)}
            </div>
        ));
    };

    const felsicEffectDisplay = computed(() => {
        return `+${format(felsicEffect.value)}%/+${format(felsicMaxEffect.value)}%`;
    });

    const felsicDisplay = createLavaResourceDisplay(
        felsicLava,
        felsicLavaCap,
        felsicLavaCapIncreases,
        "Pressure Build Chance:",
        felsicEffectDisplay,
        "border br-clip",
        "border tl-2-round-inset tr-clip"
    );

    const intermediateEffectDisplay = computed(() => {
        return `x${format(intermediateEffect.value)}/x${format(intermediateMaxEffect.value)}`;
    });
    const intermediateDisplay = createLavaResourceDisplay(
        intermediateLava,
        intermediateLavaCap,
        intermediateLavaCapIncreases,
        "Pressure Build Mult",
        intermediateEffectDisplay,
        "border br-clip bl-clip",
        "border tl-clip tr-scoop-x"
    );

    const maficEffectDisplay = computed(() => {
        return `÷${format(maficEffect.value)}/÷${format(maficMaxEffect.value)}`;
    });
    const maficDisplay = createLavaResourceDisplay(
        maficLava,
        maficLavaCap,
        maficLavaCapIncreases,
        "Pressure Interval",
        maficEffectDisplay,
        "border bl-clip",
        "border tl-scoop-x tr-2-clip-y"
    );

    const lavaConversionEnabled = ref(false);
    const lavaConvertTo = ref(0);

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
        baseResource: pressure,
        gainResource: noPersist(lava),
        onConvert: () => {
            pressure.value = 1;
            lava.value = Decimal.min(lava.value, lavaCap.value);
        }
    }));

    const tephra = createResource<DecimalSource>(0, "Tephra");

    const tephraConversion = createIndependentConversion(() => ({
        gainResource: noPersist(tephra),
        baseResource: pressure,
        formula: () =>
            Formula.variable(Decimal.dZero).if(
                () => pressureCapped.value,
                () => Formula.variable(Decimal.dOne)
            ),
        convert: () => (tephra.value = Decimal.add(tephra.value, 1))
    }));

    const eruptionPressureDivisor = 0.6;
    const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1));

    const massDestructionAmount = computed(() => {
        return Decimal.sub(0.99, Decimal.times(eruptions.value, 0.01));
    });

    const convertPressureButton = createClickable(() => ({
        classes: {
            "fit-content": true
        },
        display: (): JSX.Element => {
            const gainDisplay = (conversion: Conversion, cap: DecimalSource) => {
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

            if (!pressureCapped.value) {
                return (
                    <span>
                        <h3>Effusive Eruption</h3>
                        <br />
                        Reset Pressure for {gainDisplay(lavaConversion, lavaCap.value)}
                    </span>
                );
            }

            return (
                <>
                    <span>
                        <h3>Explosive Eruption</h3>
                        <br />
                        Reset The ENTIRE Pressure Tab for:
                        <br />
                        {gainDisplay(lavaConversion, lavaCap.value)}
                        <br />
                        {gainDisplay(tephraConversion, 999)}
                        <br />
                        Destroy ^{format(massDestructionAmount.value)} of the planet's mass.
                        <br />
                        Raise Explosive Eruption requirement to ^2.
                        <br />
                        Decrease interval by x{format(eruptionPenalityDisplay.value)}.
                    </span>
                </>
            );
        },
        onClick: () => {
            if (convertPressureButton.canClick === false) {
                return;
            }

            if (pressureCapped.value) {
                venusLayer.planetMass.value = Decimal.pow(
                    venusLayer.planetMass.value,
                    massDestructionAmount.value
                ); // must be before eruptions is increased

    //             const pressureToKeep = undergroundLavaEffect.value;

                lavaConversion.convert();

                tephraConversion.convert();
                eruptions.value = Decimal.add(eruptions.value, 1);

                // TODO:
    //             pressureTabReset.reset();

    //             if (Decimal.gt(pressureToKeep, 0)) {
    //                 pressure.value = pressureToKeep;
    //             }
            } else {
                lavaConversion.convert();
            }

    //         timeSinceLastEruption.value = Decimal.dZero;
        },
        canClick: computed(() => Decimal.gte(unref(lavaConversion.actualGain), 1))
    }));

    const display = (
        <>
            <div id="pressure-tab">
                <h3>{pressure.displayName}</h3>
                <h4>
                    {format(pressure.value)}/{format(pressureMax.value)}
                </h4>
                <Spacer height="8px" />

                <div data-augmented-ui="border br-clip" class="border-(--outline) w-[256px]">
                    {render(pressureBar)}
                </div>
                <Spacer />

                <h6>
                    {format(pressureChance.value)}% chance for pressure to build by x
                    {format(pressureGainMultiplier.value)} every {format(pressureTimerMax.value)}{" "}
                    seconds.
                </h6>
                <Spacer />

                <div
                    data-augmented-ui="border bl-clip"
                    class="border-(--outline) w-[128px] mb-12"
                    id="pressure-timer-bar"
                >
                    {render(pressureTimerBar)}
                </div>
                <Spacer />

                <div class="w-3/5 mb-10">{render(lavaDisplay.value)}</div>
                <div class="flex justify-center">
                    <Toggle
                        onUpdate:modelValue={value => (lavaConversionEnabled.value = value)}
                        modelValue={lavaConversionEnabled.value}
                        title={"Toggle Lava Conversion"}
                    />
                </div>

                <div class="flex gap-6 justify-center">
                    <Slider
                        min={0}
                        max={2}
                        onUpdate:modelValue={value => (lavaConvertTo.value = value)}
                        modelValue={lavaConvertTo.value}
                        displayTooltip={false}
                    />
                </div>

                <div class="flex">
                    {render(felsicDisplay.value)}
                    {render(intermediateDisplay.value)}
                    {render(maficDisplay.value)}
                </div>
            </div>
        </>
    );

    return {
        pressure,
        pressureTimer,
        eruptions,
        lava,
        lavaCapIncreases,
        felsicLava,
        felsicLavaCapIncreases,
        felsicDisplay,
        intermediateLava,
        intermediateLavaCapIncreases,
        intermediateDisplay,
        maficLava,
        maficLavaCapIncreases,
        maficDisplay,
        tephra,
        display: () => display,
        pressureCapped
    };
});

export default pressureLayer;
