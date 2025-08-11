import { createLayer } from "game/layers";
import { createLavaEffectFormula, createLavaSubtype, LavaSubtype } from "./createLavaSubtype";
import Decimal, { DecimalSource, format } from "util/bignum";
import { render, renderGroupedObjects } from "util/vue";
import { computed, unref } from "vue";
import { createRepeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import { fibonacciCostFormula } from "data/formulas";
import lavaLayer from "./lava";
import "./silicate.css";
import { createClickable } from "features/clickables/clickable";
import { persistent } from "game/persistence";
import { createReset } from "features/reset";
import Section from "data/components/Section.vue";
import Formula from "game/formulas/formulas";
import tephraLayer from "./tephra";
import Spacer from "components/layout/Spacer.vue";

enum SilicateLavaConversion {
    none,
    felsic,
    intermediate,
    mafic,
    ultramafic
}

const id = "VS";
const silicateLayer = createLayer(id, baseLayer => {
    const scalingExponent = 0.8;
    const ultramafic: LavaSubtype = createLavaSubtype("Ultramafic", () => ({
        capCostFormula: () =>
            Formula.variable(ultramafic.capIncreases)
                .pow_base(2)
                .times(500)
                .step(1500, f => f.times(9)),
        maxEffectFormula: () => Formula.variable(ultramafic.capIncreases).pow_base(2).times(1.1),
        effectFormula: () => createLavaEffectFormula(ultramafic, 1, scalingExponent),
        effectDisplayBuilder: (effect, maxEffect) =>
            `x${format(effect.value)}/x${format(maxEffect.value)}`,
        effectDisplayTitle: "Increase to other Silicate Effects",
        effectDisplayAugmentedUi: "border",
        augmentedUi: "border tr-clip tl-clip"
    }));

    // 50 -> 100 -> 200 -> (400)800
    const felsic: LavaSubtype = createLavaSubtype("Felsic", () => ({
        capCostFormula: () =>
            Formula.variable(felsic.capIncreases)
                .pow_base(2)
                .times(50)
                .step(350, f => f.times(9)),
        maxEffectFormula: () =>
            Formula.variable(felsic.capIncreases).pow_base(2).times(5).times(ultramafic.effect),
        effectFormula: () =>
            createLavaEffectFormula(felsic, 0, scalingExponent).times(ultramafic.effect),
        effectDisplayBuilder: (effect, maxEffect) =>
            `+${format(effect.value)}%/+${format(maxEffect.value)}%`,
        effectDisplayTitle: "Pressure Build Chance",
        effectDisplayAugmentedUi: "border br-clip",
        augmentedUi: "border tl-2-round-inset tr-clip"
    }));

    // 75 -> 150 -> 300 -> (600)
    const intermediate: LavaSubtype = createLavaSubtype("Intermediate", () => ({
        capCostFormula: () =>
            Formula.variable(intermediate.capIncreases)
                .pow_base(2)
                .times(75)
                .step(550, f => f.times(9)),
        maxEffectFormula: () =>
            Formula.variable(intermediate.capIncreases)
                .pow_base(2)
                .times(2)
                .times(ultramafic.effect),
        effectFormula: () =>
            createLavaEffectFormula(intermediate, 1, scalingExponent).times(ultramafic.effect),
        effectDisplayBuilder: (effect, maxEffect) =>
            `x${format(effect.value)}/x${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Build Mult",
        effectDisplayAugmentedUi: "border br-clip bl-clip",
        augmentedUi: "border tl-clip tr-scoop-x"
    }));

    // 100 -> 200 -> 400 -> (800)
    const mafic: LavaSubtype = createLavaSubtype("Mafic", () => ({
        capCostFormula: () =>
            Formula.variable(mafic.capIncreases)
                .pow_base(2)
                .times(100)
                .step(750, f => f.times(9)),
        maxEffectFormula: () =>
            Formula.variable(mafic.capIncreases).pow_base(2).times(1.5).times(ultramafic.effect),
        effectFormula: () =>
            createLavaEffectFormula(mafic, 1, scalingExponent).times(ultramafic.effect),
        effectDisplayBuilder: (effect, maxEffect) =>
            `÷${format(effect.value)}/÷${format(maxEffect.value)}`,
        effectDisplayTitle: "Pressure Interval",
        effectDisplayAugmentedUi: "border bl-clip",
        augmentedUi: "border tl-scoop-x tr-2-clip-y"
    }));

    const feelTheHeatEffect = computed((): DecimalSource => {
        if (Decimal.gt(silicateBuyables.feelTheHeat.amount.value, 0)) {
            return Decimal.times(0.1, silicateBuyables.feelTheHeat.amount.value);
        }

        return Decimal.dZero;
    });

    const bringTheHeatEffect = computed(() => {
        if (Decimal.gt(silicateBuyables.bringTheHeat.amount.value, 0)) {
            return Decimal.times(0.05, silicateBuyables.bringTheHeat.amount.value).add(1);
        }

        return Decimal.dOne;
    });

    const beTheHeatEffectForTier = (tier: DecimalSource) => {
        if (Decimal.lte(tier, 1)) {
            return Decimal.dOne;
        }

        return Decimal.times(0.1, Decimal.sub(tier, 1)).add(1);
    };

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
                description: "Increase conversion rate of Silicate Lavas by +0.1 per level.",
                effectDisplay: () => `+${format(feelTheHeatEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-clip"
            }
        })),
        bringTheHeat: createRepeatable(() => ({
            requirements: [
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: felsic.resource,
                        cost: () =>
                            fibonacciCostFormula(
                                Decimal.add(silicateBuyables.bringTheHeat.amount.value, 4)
                            )
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: intermediate.resource,
                        cost: () =>
                            fibonacciCostFormula(
                                Decimal.add(silicateBuyables.bringTheHeat.amount.value, 4)
                            )
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: mafic.resource,
                        cost: () =>
                            fibonacciCostFormula(
                                Decimal.add(silicateBuyables.bringTheHeat.amount.value, 4)
                            )
                    })
                )
            ],
            display: {
                title: "Bring The Heat",
                description: "Divides conversion rate of Lava by +0.05 per level.",
                effectDisplay: (): string => `÷${format(bringTheHeatEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-clip"
            }
        })),
        beTheHeat: createRepeatable(() => ({
            requirements: [
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: felsic.resource,
                        cost: Formula.variable(silicateBuyables.beTheHeat.amount)
                            .pow_base(1.2)
                            .times(20)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: intermediate.resource,
                        cost: Formula.variable(silicateBuyables.beTheHeat.amount)
                            .pow_base(1.2)
                            .times(20)
                    })
                ),
                createCostRequirement(
                    (): CostRequirementOptions => ({
                        resource: mafic.resource,
                        cost: Formula.variable(silicateBuyables.beTheHeat.amount)
                            .pow_base(1.2)
                            .times(20)
                    })
                )
            ],
            display: {
                title: "BE The Heat",
                description:
                    "Increase max Conversion Tier. Each Tier increases speed divisor by +0.1, but increases Lava Costs by +1.5x.",
                effectDisplay: (): string =>
                    `+${Decimal.sub(maximumSpeedDivisorTier.value, 1)} Max Tiers`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-clip"
            }
        }))
    };

    const lavaConversionFromRate = computed(() =>
        Decimal.div(1, bringTheHeatEffect.value).times(currentLavaCostMultiplier.value)
    );
    const lavaConversionToRate = computed(() =>
        Decimal.fromNumber(0.5).add(feelTheHeatEffect.value)
    );
    const lavaConversionTimeRate = computed(() =>
        Decimal.fromNumber(10).div(currentSpeedDivisor.value)
    );

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
        switch (selectedConversionLavaType.value) {
            case SilicateLavaConversion.felsic:
                return felsic;
            case SilicateLavaConversion.intermediate:
                return intermediate;
            case SilicateLavaConversion.mafic:
                return mafic;
            case SilicateLavaConversion.ultramafic:
                return ultramafic;
            default:
                return null;
        }
    });

    const conversionButtonClasses = (type: SilicateLavaConversion) => {
        return {
            toggled: selectedConversionLavaType.value === type,
            "fit-content": true,
            "conversion-toggle-button": true
        };
    };

    const selectedConversionLavaType = persistent<SilicateLavaConversion>(
        SilicateLavaConversion.none
    );
    const felsicConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaType.value !== SilicateLavaConversion.felsic,
        classes: () => conversionButtonClasses(SilicateLavaConversion.felsic),
        display: "Convert to Felsic",
        onClick: () => {
            selectedConversionLavaType.value = SilicateLavaConversion.felsic;
        }
    }));

    const intermediateConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaType.value !== SilicateLavaConversion.intermediate,
        classes: () => conversionButtonClasses(SilicateLavaConversion.intermediate),
        display: "Convert to Intermediate",
        onClick: () => {
            selectedConversionLavaType.value = SilicateLavaConversion.intermediate;
        }
    }));

    const maficConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaType.value !== SilicateLavaConversion.mafic,
        classes: () => conversionButtonClasses(SilicateLavaConversion.mafic),
        display: "Convert to Mafic",
        onClick: () => {
            selectedConversionLavaType.value = SilicateLavaConversion.mafic;
        }
    }));

    const ultramaficConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaType.value !== SilicateLavaConversion.ultramafic,
        classes: () => conversionButtonClasses(SilicateLavaConversion.ultramafic),
        display: "Convert to Ultramafic",
        onClick: () => {
            selectedConversionLavaType.value = SilicateLavaConversion.ultramafic;
        }
    }));

    const disableConversionButton = createClickable(() => ({
        canClick: () => selectedConversionLavaType.value !== SilicateLavaConversion.none,
        classes: () => conversionButtonClasses(SilicateLavaConversion.none),
        display: "Disable Conversion",
        onClick: () => (selectedConversionLavaType.value = SilicateLavaConversion.none)
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

    // y / (x * z)
    const silicateGainPerSecond = computed(() =>
        Decimal.div(
            lavaConversionToRate.value,
            Decimal.times(lavaConversionFromRate.value, lavaConversionTimeRate.value)
        )
    );

    const lavaLossPerSecond = computed(() =>
        Decimal.div(
            lavaConversionFromRate.value,
            Decimal.times(lavaConversionToRate.value, lavaConversionTimeRate.value)
        )
    );

    const currentSpeedTier = persistent<DecimalSource>(1);
    const maximumSpeedDivisorTier = computed(() =>
        Decimal.add(silicateBuyables.beTheHeat.amount.value, 1)
    );

    const currentSpeedDivisor = computed(() => beTheHeatEffectForTier(currentSpeedTier.value));
    const currentLavaCostMultiplier = computed(() => {
        if (Decimal.lte(currentSpeedTier.value, 1)) {
            return Decimal.dOne;
        }

        return Decimal.sub(currentSpeedTier.value, 1).times(1.5);
    });

    const decreaseSpeedClickable = createClickable(() => ({
        canClick: () => Decimal.gt(currentSpeedTier.value, 1),
        classes: {
            "fit-content": true,
            "clickable:can:text-venus-200!": true,
            "clickable:locked:text-venus-500!": true,
            "clickable:text-lg!": true,
            "clickable:border-2": true,
            "clickable:can:border-venus-200!": true,
            "clickable:locked:border-venus-500!": true,
            "clickable:bg-remove!": true,
            "clickable:rounded-full!": true
        },
        display: "-",
        onClick: () => {
            if (unref(decreaseSpeedClickable.canClick) === false) {
                return;
            }

            currentSpeedTier.value = Decimal.sub(currentSpeedTier.value, 1);
        }
    }));

    const increaseSpeedClickable = createClickable(() => ({
        canClick: () => Decimal.lt(currentSpeedTier.value, maximumSpeedDivisorTier.value),
        classes: {
            "fit-content": true,
            "clickable:can:text-venus-200!": true,
            "clickable:locked:text-venus-500!": true,
            "clickable:text-lg!": true,
            "clickable:border-2": true,
            "clickable:can:border-venus-200!": true,
            "clickable:locked:border-venus-500!": true,
            "clickable:bg-remove!": true,
            "clickable:rounded-full!": true
        },
        display: "+",
        onClick: () => {
            if (unref(increaseSpeedClickable.canClick) === false) {
                return;
            }

            currentSpeedTier.value = Decimal.add(currentSpeedTier.value, 1);
        }
    }));

    return {
        id,
        felsic,
        intermediate,
        mafic,
        ultramafic,
        silicateBuyables,
        unlocked,
        felsicConversionButton,
        intermediateConversionButton,
        maficConversionButton,
        selectedConversionLava,
        disableConversionButton,
        selectedConversionLavaType,
        showNotification,
        explosiveEruptionReset,
        currentSpeedTier,
        display: () => (
            <>
                <div id="silicate-layer">
                    <Section header="Silicate Buyables">
                        <div
                            data-augmented-ui="border tl-2-clip-y br-round-x"
                            class="flex-1 w-[300px] px-8 py-4 mb-4"
                        >
                            <h5>Convert Molten Lava into Silicate Lava for buffs</h5>

                            <Spacer />

                            <div class="flex">
                                {render(decreaseSpeedClickable)}
                                <div class="flex flex-col">
                                    <h4>Conversion Tier - {currentSpeedTier.value}</h4>
                                    <h5 class="font-semibold">
                                        {format(lavaConversionFromRate.value)} Lava to{" "}
                                        {format(lavaConversionToRate.value)} Silicate
                                    </h5>
                                    <h5 class="font-semibold">
                                        Every {format(lavaConversionTimeRate.value)}/s
                                    </h5>
                                    <h6>
                                        ÷{format(currentSpeedDivisor.value)} | x
                                        {format(currentLavaCostMultiplier.value)}
                                    </h6>
                                    <h6 class="font-semibold">
                                        +{format(silicateGainPerSecond.value)} Silicate/s | -
                                        {format(lavaLossPerSecond.value)} Lava/s
                                    </h6>
                                </div>
                                {render(increaseSpeedClickable)}
                            </div>
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

                        {tephraLayer.upgrades.ultraMafic.bought.value ? (
                            <div class="w-3/5">
                                {render(ultramaficConversionButton)}
                                {render(ultramafic)}
                            </div>
                        ) : null}
                    </Section>

                    <Section header="Buyables">{renderGroupedObjects(silicateBuyables, 4)}</Section>
                </div>
            </>
        )
    };
});

export default silicateLayer;
