import { createLayer } from "game/layers";
import { createLavaSubtype } from "./createLavaSubtype";
import Decimal, { DecimalSource, format } from "util/bignum";
import { render, renderGroupedObjects } from "util/vue";
import { computed, ref } from "vue";
import { createRepeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import { fibonacciCostFormula } from "data/formulas";
import Toggle from "components/fields/Toggle.vue";
import Slider from "components/fields/Slider.vue";
import lavaLayer from "./lava";
import "./silicate.css";

const id = "VS";
const silicateLayer = createLayer(id, baseLayer => {
    const felsic = createLavaSubtype("Felsic", () => ({
        startingCap: 50,
        maxEffectDivisor: 10,
        effectDisplayBuilder: (effect, maxEffect) =>
            `+${format(effect.value)}%/+${format(maxEffect.value)}%`,
        effectDisplayTitle: "Pressure Build Chance:",
        effectDisplayAugmentedUi: "border br-clip",
        augmentedUi: "border tl-2-round-inset tr-clip"
    }));

    const intermediate = createLavaSubtype("Intermediate", () => ({
        startingCap: 75,
        maxEffectDivisor: 10,
        effectDisplayBuilder: (effect, maxEffect) =>
            `x${format(effect.value)}/x${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Build Mult",
        effectDisplayAugmentedUi: "border br-clip bl-clip",
        augmentedUi: "border tl-clip tr-scoop-x",
        minimumEffect: 1
    }));

    const mafic = createLavaSubtype("Mafic", () => ({
        startingCap: 100,
        maxEffectDivisor: 66.66,
        effectDisplayBuilder: (effect, maxEffect) =>
            `÷${format(effect.value)}/÷${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Interval",
        effectDisplayAugmentedUi: "border bl-clip",
        augmentedUi: "border tl-scoop-x tr-2-clip-y",
        minimumEffect: 1
    }));

    const improvedFlowEffect = computed((): DecimalSource => {
        if (Decimal.gt(silicateBuyables.improvedFlow.amount.value, 0)) {
            return Decimal.times(0.1, silicateBuyables.improvedFlow.amount.value);
        }

        return Decimal.dZero;
    });

    const silicateBuyables = {
        improvedFlow: createRepeatable(() => ({
            requirements: [
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: felsic.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.improvedFlow.amount.value)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: intermediate.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.improvedFlow.amount.value)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: mafic.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.improvedFlow.amount.value)
                    })
                )
            ],
            display: {
                title: "Improved Flow",
                description: "Increase conversion rate of Silicate Lavas by +0.1 per level",
                effectDisplay: () => `+${format(improvedFlowEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        }))
    };

    const lavaConversionEnabled = ref(false);
    const lavaConvertTo = ref(0);

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

    const lavaConversionRate = computed(() =>
        Decimal.fromNumber(0.1).add(improvedFlowEffect.value)
    );
    const lavaConversionTimeRate = computed(() => Decimal.fromNumber(10));

    const unlocked = computed(() => {
        return lavaLayer.lavaUpgrades.silicateLava.bought.value;
    });

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        const conversionLava = selectedConversionLava.value;

        if (
            lavaConversionEnabled.value &&
            Decimal.gt(lavaLayer.lava.value, 0) &&
            Decimal.lt(conversionLava.resource.value, conversionLava.cap.value)
        ) {
            const conversionRate = Decimal.div(1, lavaConversionTimeRate.value);
            const conversionAmount = Decimal.min(
                lavaLayer.lava.value,
                Decimal.times(conversionRate, diff)
            );
            const producedAmount = Decimal.times(conversionAmount, lavaConversionRate.value);

            conversionLava.resource.value = Decimal.add(
                conversionLava.resource.value,
                producedAmount
            ).clampMax(conversionLava.cap.value);
            lavaLayer.lava.value = Decimal.sub(lavaLayer.lava.value, conversionAmount);
        }
    });

    return {
        id,
        felsic,
        intermediate,
        mafic,
        silicateBuyables,
        unlocked,
        display: () => (
            <>
                <div id="silicate-layer">
                    <div class="mb-2">
                        <h2>Silicate Lavas</h2>
                    </div>
                    <div class="mb-4">
                        <hr class="section-divider" />
                    </div>

                    <div
                        data-augmented-ui="border tl-2-clip-y br-round-x"
                        class="flex-1 w-[300px] px-8 py-4 mb-4"
                    >
                        <div class="flex justify-center">
                            <Toggle
                                onUpdate:modelValue={value => (lavaConversionEnabled.value = value)}
                                modelValue={lavaConversionEnabled.value}
                                title={"Toggle Lava Conversion"}
                                class={{ "lava-conversion-toggle": true }}
                            />
                        </div>

                        <div class="flex gap-6 justify-center">
                            <Slider
                                min={0}
                                max={2}
                                onUpdate:modelValue={value => (lavaConvertTo.value = value)}
                                modelValue={lavaConvertTo.value}
                                displayTooltip={false}
                                class={{
                                    "lava-type-slider": true,
                                    "accent-venus-400": true
                                }}
                            />
                        </div>
                        <h5 class="font-semibold">
                            1 Lava will be converted into {format(lavaConversionRate.value)}{" "}
                            {selectedConversionLava.value.resource.displayName} every{" "}
                            {format(lavaConversionTimeRate.value)} seconds.
                        </h5>
                    </div>

                    <div class="flex mb-12">
                        {render(felsic)}
                        {render(intermediate)}
                        {render(mafic)}
                    </div>

                    <div class="mb-2">
                        <h3>Improvements</h3>
                    </div>
                    <div class="mb-4">
                        <hr class="section-divider" />
                    </div>

                    {renderGroupedObjects(silicateBuyables, 4)}
                </div>
            </>
        )
    };
});

export default silicateLayer;
