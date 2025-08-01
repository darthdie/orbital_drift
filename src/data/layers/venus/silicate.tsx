import { createLayer } from "game/layers";
import { createLavaSubtype } from "./createLavaSubtype";
import Decimal, { DecimalSource, format } from "util/bignum";
import { render, renderGroupedObjects } from "util/vue";
import { computed } from "vue";
import { createRepeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import { fibonacciCostFormula } from "data/formulas";
import lavaLayer from "./lava";
import "./silicate.css";
import { createClickable } from "features/clickables/clickable";
import { persistent } from "game/persistence";
import { createReset } from "features/reset";

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

    const feelTheHeatEffect = computed((): DecimalSource => {
        if (Decimal.gt(silicateBuyables.feelTheHeat.amount.value, 0)) {
            return Decimal.times(0.1, silicateBuyables.feelTheHeat.amount.value);
        }

        return Decimal.dZero;
    });

    const silicateBuyables = {
        feelTheHeat: createRepeatable(() => ({
            requirements: [
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: felsic.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.feelTheHeat.amount.value)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: intermediate.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.feelTheHeat.amount.value)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: mafic.resource,
                        cost: () => fibonacciCostFormula(silicateBuyables.feelTheHeat.amount.value)
                    })
                )
            ],
            display: {
                title: "Feel The Heat",
                description: "Increase conversion rate of Silicate Lavas by +0.1 per level",
                effectDisplay: () => `+${format(feelTheHeatEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        })),
        bringTheHeat: createRepeatable(() => ({
            requirements: [],
            display: {
                title: "Bring The Heat",
                description: "Decrease amount of Lava needed for conversion by ? per level",
                effectDisplay: () => ``
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        }))
    };

    const lavaConversionFromRate = computed(() => 1);
    const lavaConversionToRate = computed(() =>
        Decimal.fromNumber(0.1).add(feelTheHeatEffect.value)
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
            conversionLava != null &&
            Decimal.gt(lavaLayer.lava.value, 0) &&
            Decimal.lt(conversionLava.resource.value, conversionLava.cap.value)
        ) {
            const conversionRate = Decimal.div(
                lavaConversionFromRate.value,
                lavaConversionTimeRate.value
            );
            const conversionAmount = Decimal.min(
                lavaLayer.lava.value,
                Decimal.times(conversionRate, diff)
            );
            const producedAmount = Decimal.times(conversionAmount, lavaConversionToRate.value);

            conversionLava.resource.value = Decimal.add(
                conversionLava.resource.value,
                producedAmount
            ).clampMax(conversionLava.cap.value);
            lavaLayer.lava.value = Decimal.sub(lavaLayer.lava.value, conversionAmount);
        }
    });

    const selectedConversionLava = computed(() => {
        switch (selectedConversionLavaIndex.value) {
            case 0:
                return felsic;
            case 1:
                return intermediate;
            case 2:
                return mafic;
            default:
                return null;
        }
    });

    const conversionButtonClasses = (index: number) => {
        return {
            toggled: selectedConversionLavaIndex.value === index,
            "fit-content": true,
            "conversion-toggle-button": true
        };
    };

    const selectedConversionLavaIndex = persistent<number>(-1);
    const felsicConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaIndex.value !== 0,
        classes: () => conversionButtonClasses(0),
        display: "Convert to Felsic",
        onClick: () => {
            selectedConversionLavaIndex.value = 0;
        }
    }));

    const intermediateConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaIndex.value !== 1,
        classes: () => conversionButtonClasses(1),
        display: "Convert to Intermediate",
        onClick: () => {
            selectedConversionLavaIndex.value = 1;
        }
    }));

    const maficConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaIndex.value !== 2,
        classes: () => conversionButtonClasses(2),
        display: "Convert to Mafic",
        onClick: () => {
            selectedConversionLavaIndex.value = 2;
        }
    }));

    const disableConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaIndex.value !== -1,
        classes: () => conversionButtonClasses(-1),
        display: "Disable Conversion",
        onClick: () => (selectedConversionLavaIndex.value = -1)
    }));

    const showNotification = computed(() => {
        return (
            unlocked.value &&
            (Object.values(silicateBuyables).some(b => b.canClick.value) ||
                felsic.showNotification.value ||
                intermediate.showNotification.value ||
                mafic.showNotification.value)
        );
    });

    const explosiveEruptionReset = createReset(() => ({
        thingsToReset: () => [],
        onReset: () => {
            felsic.resource.value = 0;
            intermediate.resource.value = 0;
            mafic.resource.value = 0;
        }
    }));

    return {
        id,
        felsic,
        intermediate,
        mafic,
        silicateBuyables,
        unlocked,
        felsicConversionButton,
        intermediateConversionButton,
        maficConversionButton,
        selectedConversionLava,
        disableConversionButton,
        selectedConversionLavaIndex,
        showNotification,
        explosiveEruptionReset,
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
                        <h5 class="font-semibold">
                            {format(lavaConversionFromRate.value)} Lava is converted to{" "}
                            {format(lavaConversionToRate.value)} Silicate over{" "}
                            {format(lavaConversionTimeRate.value)} seconds.
                        </h5>
                    </div>

                    {render(disableConversionButton)}
                    <div class="flex mb-12">
                        <div class="flex-1">
                            {render(felsicConversionButton)}
                            {render(felsic)}
                        </div>
                        <div class="flex-1">
                            {render(intermediateConversionButton)}
                            {render(intermediate)}
                        </div>
                        <div class="flex-1">
                            {render(maficConversionButton)}
                            {render(mafic)}
                        </div>
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
