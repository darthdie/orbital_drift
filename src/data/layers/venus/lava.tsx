import { createBar } from "features/bars/bar";
import { createClickable } from "features/clickables/clickable";
import { Conversion, createCumulativeConversion } from "features/conversion";
import { createResource, displayResource, Resource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist, persistent } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { Direction } from "util/common";
import { computed, ComputedRef, ref, toRef, unref, watch } from "vue";
import { format } from "util/break_eternity";
import { joinJSX, render } from "util/vue";
import { JSX } from "vue/jsx-runtime";
import pressureLayer from "./pressure";
import Toggle from "components/fields/Toggle.vue";
import Slider from "components/fields/Slider.vue";
import venusLayer from "../venus";
import tephraLayer from "./tephra";
import Spacer from "components/layout/Spacer.vue";
import { loadingSave } from "util/save";
import "./lava.css";

const id = "VL";
const lavaLayer = createLayer(id, baseLayer => {
    const lavaCapIncreases = createResource<DecimalSource>(0);
    const lava = createResource<DecimalSource>(0, "Lava");
    const lavaCap = computed(() =>
        Decimal.fromNumber(250).times(Decimal.times(lavaCapIncreases.value, 2).clampMin(1))
    );

    const eruptions = createResource<DecimalSource>(0);

    const calculateLavaEffect = (
        resource: Resource,
        cap: ComputedRef<DecimalSource>,
        maxEffect: ComputedRef<DecimalSource>
    ) => {
        // Figured out the % of the resource vs the cap, and return that % of the max effect
        return Decimal.times(maxEffect.value, Decimal.div(resource.value, cap.value));
    };

    const felsicLava = createResource<DecimalSource>(0, "Felsic");
    const felsicLavaCapIncreases = createResource<DecimalSource>(0);
    const felsicLavaCap = computed(() =>
        Decimal.fromNumber(50).times(Decimal.times(felsicLavaCapIncreases.value, 2).clampMin(1))
    );
    const felsicMaxEffect = computed(() => {
        // 50 -> Max +5%?
        return Decimal.div(felsicLavaCap.value, 10);
    });
    const felsicEffect = computed(() =>
        calculateLavaEffect(felsicLava, felsicLavaCap, felsicMaxEffect)
    );

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

    const intermediateEffect = computed(() =>
        calculateLavaEffect(intermediateLava, intermediateLavaCap, intermediateMaxEffect).clampMin(
            1
        )
    );

    const maficLava = createResource<DecimalSource>(0, "Mafic");
    const maficLavaCapIncreases = createResource<DecimalSource>(0);
    const maficLavaCap = computed(() =>
        Decimal.fromNumber(100).times(Decimal.times(maficLavaCapIncreases.value, 2).clampMin(1))
    );

    const maficMaxEffect = computed(() => {
        return Decimal.div(maficLavaCap.value, 66.66);
    });

    const maficEffect = computed(() =>
        calculateLavaEffect(maficLava, maficLavaCap, maficMaxEffect)
    );

    const lavaMaxEffect = computed(() => Decimal.div(lavaCap.value, 20));
    const lavaEffect = computed(() => calculateLavaEffect(lava, lavaCap, lavaMaxEffect));

    const createLavaResourceDisplay = () => {
        const resource = lava;
        const resourceCap = lavaCap;
        const capIncreases = lavaCapIncreases;
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
            height: 32,
            width: "100%",
            style: {
                overflow: "hidden"
            },
            borderStyle: {
                borderRadius: "0"
            },
            display: () => `${format(resource.value)}/${format(resourceCap.value)}`,
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
                <div class="flex flex-col bg-(--raised-background) p-2">
                    <h5>Chance for Pressure to build by an additional x5</h5>
                    <br />
                    <h5 class="font-semibold">
                        {format(lavaEffect.value)}%/{format(lavaMaxEffect.value)}%
                    </h5>
                </div>
                <div class="increase-cap-action">{render(increaseCap)}</div>
            </div>
        ));
    };

    const lavaDisplay = createLavaResourceDisplay();

    const createLavaSubtypeResourceDisplay = (
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

    const felsicDisplay = createLavaSubtypeResourceDisplay(
        felsicLava,
        felsicLavaCap,
        felsicLavaCapIncreases,
        "Pressure Build Chance:",
        felsicEffectDisplay,
        "border br-clip",
        "border tl-2-round-inset tr-clip"
    );

    // const felsicUpgrades = {

    // };

    const intermediateEffectDisplay = computed(() => {
        return `x${format(intermediateEffect.value)}/x${format(intermediateMaxEffect.value)}`;
    });
    const intermediateDisplay = createLavaSubtypeResourceDisplay(
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
    const maficDisplay = createLavaSubtypeResourceDisplay(
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
        baseResource: pressureLayer.pressure,
        gainResource: noPersist(lava),
        onConvert: () => {
            pressureLayer.pressure.value = 1;
            lava.value = Decimal.min(lava.value, lavaCap.value);
        }
    }));

    const bestPendingLava = persistent<DecimalSource>(lavaConversion.currentGain);
    watch(toRef(lavaConversion.currentGain), amount => {
        if (loadingSave.value) {
            return;
        }
        if (Decimal.gt(amount, bestPendingLava.value)) {
            bestPendingLava.value = amount;
        }
    });

    const convertPressureButton = createClickable(() => ({
        classes: {
            "lava-reset-button": true
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

            if (!pressureLayer.pressureCapped.value) {
                return (
                    <span>
                        <h3>Effusive Eruption</h3>
                        <br />
                        Reset Pressure
                        <br />
                        <span class="font-semibold">
                            Gain {gainDisplay(lavaConversion, lavaCap.value)}
                        </span>
                    </span>
                );
            }

            return (
                <>
                    <span>
                        <h3>Explosive Eruption</h3>
                        <br />
                        Reset Pressure and <b>all</b> Lava types for:
                        <br />
                        <span class="font-semibold">
                            {gainDisplay(lavaConversion, lavaCap.value)}
                        </span>
                        <br />
                        <span class="font-semibold">
                            {gainDisplay(tephraLayer.tephraConversion, 999)}
                        </span>
                        <br />
                        <span class="font-semibold">
                            Destroy ^{format(venusLayer.massDestructionAmount.value)} of the
                            planet's mass.
                        </span>
                        <br />
                        <span class="font-semibold">
                            Raise Explosive Eruption requirement to ^2.
                        </span>
                        <br />
                        <span class="font-semibold">
                            Decrease interval by x
                            {format(pressureLayer.eruptionPenalityDisplay.value)}
                        </span>
                        .
                    </span>
                </>
            );
        },
        onClick: () => {
            if (convertPressureButton.canClick === false) {
                return;
            }

            if (pressureLayer.pressureCapped.value) {
                venusLayer.planetMass.value = Decimal.pow(
                    venusLayer.planetMass.value,
                    venusLayer.massDestructionAmount.value
                ); // must be before eruptions is increased

                //             const pressureToKeep = undergroundLavaEffect.value;

                lavaConversion.convert();

                tephraLayer.tephraConversion.convert();
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
        canClick: computed(() => Decimal.gte(unref(lavaConversion.actualGain), 1)),
        dataAttributes: {
            "augmented-ui": "border br-round-inset tl-clip bl-2-clip-x tr-clip"
        }
    }));

    const selectedConversionLava = computed(() => {
        switch (lavaConvertTo.value) {
            case 0:
                return {
                    resource: felsicLava,
                    cap: felsicLavaCap,
                    capIncreases: felsicLavaCapIncreases
                };
            case 1:
                return {
                    resource: intermediateLava,
                    cap: intermediateLavaCap,
                    capIncreases: intermediateLavaCapIncreases
                };
            default:
                return {
                    resource: maficLava,
                    cap: maficLavaCap,
                    capIncreases: maficLavaCapIncreases
                };
        }
    });

    const lavaConversionRate = computed(() => Decimal.fromNumber(0.5));
    const lavaConversionTimeRate = computed(() => Decimal.fromNumber(5));

    const unlocked = computed(
        (): boolean => venusLayer.unlocked.value && Decimal.gte(bestPendingLava.value, 10)
    );

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        const conversionLava = selectedConversionLava.value;

        if (
            lavaConversionEnabled.value &&
            Decimal.gt(lava.value, 0) &&
            Decimal.lt(conversionLava.resource.value, conversionLava.cap.value)
        ) {
            const conversionRate = Decimal.div(1, lavaConversionTimeRate.value);
            const conversionAmount = Decimal.min(lava.value, Decimal.times(conversionRate, diff));
            const producedAmount = Decimal.times(conversionAmount, lavaConversionRate.value);

            conversionLava.resource.value = Decimal.add(
                conversionLava.resource.value,
                producedAmount
            ).clampMax(conversionLava.cap.value);
            lava.value = Decimal.sub(lava.value, conversionAmount);

            // if (Decimal.gt(lavaConversionLossRateSeconds.value, 0)) {
            //     // %5 -> 0.05
            //     const lossRate = Decimal.times(lavaConversionLossRateSeconds.value, 0.01);
            //     lava.value = Decimal.sub(
            //         lava.value,
            //         Decimal.times(lava.value, lossRate).times(diff)
            //     );
            // }
        }
    });

    return {
        id,
        lava,
        lavaCapIncreases,
        lavaEffect,
        eruptions,
        felsicLava,
        felsicLavaCapIncreases,
        felsicDisplay,
        intermediateLava,
        intermediateLavaCapIncreases,
        intermediateDisplay,
        maficLava,
        maficLavaCapIncreases,
        maficDisplay,
        bestPendingLava,
        unlocked,
        display: () => (
            <>
                <div id="lava-layer">
                    <div class="w-3/5 mb-10">
                        <div class="flex">
                            <div class="flex-1">{render(convertPressureButton)}</div>
                            <div class="flex-1"></div>
                        </div>
                        {render(lavaDisplay.value)}
                    </div>
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
                    <h5>
                        1 Lava will be converted into {format(lavaConversionRate.value)}{" "}
                        {selectedConversionLava.value.resource.displayName} every{" "}
                        {format(lavaConversionTimeRate.value)} seconds.
                    </h5>
                    <Spacer />

                    <div class="flex">
                        {render(felsicDisplay.value)}
                        {render(intermediateDisplay.value)}
                        {render(maficDisplay.value)}
                    </div>
                </div>
            </>
        )
    };
});

export default lavaLayer;
