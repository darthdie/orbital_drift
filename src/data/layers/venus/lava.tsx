import { createBar } from "features/bars/bar";
import { createClickable } from "features/clickables/clickable";
import { Conversion, createCumulativeConversion } from "features/conversion";
import { createResource, displayResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { Direction } from "util/common";
import { computed, ref, unref } from "vue";
import { format } from "util/break_eternity";
import { joinJSX, render } from "util/vue";
import { JSX } from "vue/jsx-runtime";
import pressureLayer from "./pressure";
import Toggle from "components/fields/Toggle.vue";
import Slider from "components/fields/Slider.vue";
import venusLayer from "../venus";
import tephraLayer from "./tephra";
import Spacer from "components/layout/Spacer.vue";
import "./lava.css";
import { calculateLavaEffect, createLavaSubtype } from "./createLavaSubtype";

// Magma? Convert Felsic, Intermediate, and Mafic to boost their effect by x0.01?

const id = "VL";
const lavaLayer = createLayer(id, baseLayer => {
    const lavaCapIncreases = createResource<DecimalSource>(0);
    const lava = createResource<DecimalSource>(0, "Lava");
    const lavaCap = computed(() =>
        Decimal.fromNumber(250).times(Decimal.times(lavaCapIncreases.value, 2).clampMin(1))
    );

    const eruptions = createResource<DecimalSource>(0);

    const felsic = createLavaSubtype(() => ({
        name: "Felsic",
        startingCap: 50,
        maxEffectDivisor: 10,
        effectDisplayBuilder: (effect, maxEffect) =>
            `+${format(effect.value)}%/+${format(maxEffect.value)}%`,
        effectDisplayTitle: "Pressure Build Chance:",
        effectDisplayAugmentedUi: "border br-clip",
        augmentedUi: "border tl-2-round-inset tr-clip"
    }));

    const intermediate = createLavaSubtype(() => ({
        name: "Intermediate",
        startingCap: 75,
        maxEffectDivisor: 10,
        effectDisplayBuilder: (effect, maxEffect) =>
            `x${format(effect.value)}/x${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Build Mult",
        effectDisplayAugmentedUi: "border br-clip bl-clip",
        augmentedUi: "border tl-clip tr-scoop-x",
        minimumEffect: 1
    }));

    const mafic = createLavaSubtype(() => ({
        name: "Mafic",
        startingCap: 100,
        maxEffectDivisor: 66.66,
        effectDisplayBuilder: (effect, maxEffect) =>
            `÷${format(effect.value)}/÷${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Interval",
        effectDisplayAugmentedUi: "border bl-clip",
        augmentedUi: "border tl-scoop-x tr-2-clip-y",
        minimumEffect: 1
    }));

    const lavaMaxEffect = computed(() => Decimal.div(lavaCap.value, 25));
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
            // display: () => `${format(resource.value)}/${format(resourceCap.value)}`,
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

        return computed(() => (
            <div
                class="cappable-resource-container w-full h-full"
                data-augmented-ui="border tl-2-clip-x br-round-inset bl-round-inset"
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
                        Reset Pressure and <b>all</b> Lava types for:
                        <br />
                        <span class="font-semibold">
                            {eruptionGainDisplay(lavaConversion, lavaCap.value)}
                        </span>
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
                        <span>
                            {pressureLayer.pressureCapped.value
                                ? null
                                : "Requires Pressure to be capped."}
                        </span>
                    </span>
                </>
            );
        },
        onClick: () => {
            if (explosiveEruptionButton.canClick === false) {
                return;
            }

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

            //         timeSinceLastEruption.value = Decimal.dZero;
        },
        canClick: computed(() => pressureLayer.pressureCapped.value),
        dataAttributes: {
            "augmented-ui": "border bl-2-scoop-xy br-2-scoop tl-clip tr-scoop-inset"
        }
    }));

    const selectedConversionLava = computed(() => {
        switch (lavaConvertTo.value) {
            case 0:
                return felsic;
            case 1:
                return intermediate;
            default:
                return mafic;
        }
    });

    const lavaConversionRate = computed(() => Decimal.fromNumber(0.1));
    const lavaConversionTimeRate = computed(() => Decimal.fromNumber(10));

    const unlocked = computed((): boolean => pressureLayer.upgrades.effusiveEruption.bought.value);

    const passiveLavaGain = computed(() => {
        return Decimal.times(unref(lavaConversion.currentGain), 0.001);
    });

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        lava.value = Decimal.add(lava.value, Decimal.times(passiveLavaGain.value, diff));

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
        }
    });

    return {
        id,
        lava,
        lavaCapIncreases,
        lavaEffect,
        eruptions,
        unlocked,
        felsic,
        intermediate,
        mafic,
        display: () => (
            <>
                <div id="lava-layer">
                    {/* <div data-augmented-ui="border tl-round-inset br-2-clip-x" class="w-fit p-8">
                        <h5>
                            You are gaining {format(passiveLavaGain.value)} {lava.displayName}/s
                        </h5>
                    </div> */}
                    <div class="w-3/4 mb-10 flex">
                        <div class="flex flex-col m-0">
                            {/* <div class="flex-1 m-0">{render(effusiveEruptionButton)}</div> */}
                            <div
                                class="m-0 h-[160px] flex flex-col"
                                data-augmented-ui="border br-round-inset tl-clip bl-2-clip-x tr-clip"
                            >
                                <div>
                                    <h5 class="m-0">Effusive Eruption</h5>
                                    <h5 class="font-semibold m-0">
                                        You are gaining {format(passiveLavaGain.value)}{" "}
                                        {lava.displayName}/s
                                    </h5>
                                </div>
                            </div>
                            <div class="m-0">{render(explosiveEruptionButton)}</div>
                        </div>
                        <div class="flex flex-col flex-1 m-0">
                            <div class="flex-1 m-0">{render(lavaDisplay.value)}</div>
                            <div data-augmented-ui="border tl-scoop-inset" class="flex-1 m-0">
                                <div class="flex justify-center">
                                    <Toggle
                                        onUpdate:modelValue={value =>
                                            (lavaConversionEnabled.value = value)
                                        }
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
                            </div>
                        </div>
                    </div>

                    <Spacer />

                    <div class="flex">
                        {render(felsic)}
                        {render(intermediate)}
                        {render(mafic)}
                    </div>
                </div>
            </>
        )
    };
});

export default lavaLayer;
