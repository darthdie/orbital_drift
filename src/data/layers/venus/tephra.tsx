import Formula from "game/formulas/formulas";
import Decimal from "util/break_eternity";
import pressureLayer from "./pressure";
import { noPersist } from "game/persistence";
import { ConversionOptions, createIndependentConversion } from "features/conversion";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { DecimalSource } from "lib/break_eternity";
import { computed, unref } from "vue";
import milestonesLayer from "./milestones";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import { createRepeatable, Repeatable } from "features/clickables/repeatable";
import { renderGroupedObjects } from "util/vue";
import { format } from "util/bignum";
import "./tephra.css";
import Section from "data/components/Section.vue";
import lavaLayer from "./lava";

const id = "VT";
const tephraLayer = createLayer(id, () => {
    const tephra = createResource<DecimalSource>(0, "Tephra");

    const tephraConversion = createIndependentConversion(
        (): ConversionOptions => ({
            gainResource: noPersist(tephra),
            baseResource: pressureLayer.pressure,
            formula: () =>
                Formula.variable(Decimal.dZero).if(
                    () => pressureLayer.pressureCapped.value,
                    () =>
                        Formula.variable(Decimal.dOne).add(
                            milestonesLayer.threeMilestoneEffect.value
                        )
                ),
            convert: () => {
                tephra.value = unref(tephraConversion.currentGain);
            }
        })
    );

    // Buyables that boost shit
    // Unlock passive generators for lava subtypes?
    // Unlock more volcanos/pressure timers?
    // Increase tephra gain - some sort of inherent scaling bonus?

    // Going to have ~30 presses, and therefore 30 Tephra to buy stuff.
    // Either need to forgo buyables, or add a way to increase tephra gain.

    // Add upgrade to add buyables?
    // Silicate buyable: Decrease amount needed to increase cap (without affecting max effect) - should start a bit more expensive
    // Silicate buyable: Decrease conversion time (probably should add the ability to sell)

    const upgrades = {
        // whatAboutSecondVolcano: createUpgrade(() => ({
        //     requirements: [],
        //     display: {
        //         title: "What about second volcano?",
        //         description: "Unlock a second volcano."
        //     }
        // }))
        secretsLongBuried: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: 1
            })),
            display: {
                title: "Secrets Once Buried",
                description: "Unlock more Volcano & Molten Lava upgrades."
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        shinyRocks: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: 1
            })),
            display: {
                title: "Shiny Rocks",
                description: "Unlock Volcano & Molten Lava Buyables."
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        ultraMafic: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: 1
            })),
            display: {
                title: "Ultramafic",
                description: "Unlock a new Silicate Lava, which boosts the other Silicate effects."
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    // Have ~4 upgrades that cost 1 Tephra
    // Have buyables start at cost 2 and increase by 1 each level
    // 4 upgrades:
    // Ultramafic? - effect tbd
    // Unlock more  upgrades?

    const gamblingManEffect = computed(() => {
        if (Decimal.gt(buyables.gamblingMan.amount.value, 0)) {
            return Decimal.times(buyables.gamblingMan.amount.value, 1.2).clampMin(1);
        }

        return Decimal.dOne;
    });

    const blobTheBuilderEffect = computed(() => {
        if (Decimal.gt(buyables.blobTheBuilder.amount.value, 0)) {
            return Decimal.times(buyables.blobTheBuilder.amount.value, 1.2).clampMin(1);
        }

        return Decimal.dOne;
    });

    const greenIsNotACreativeColorEffect = computed(() => {
        if (Decimal.gt(buyables.greenIsNotACreativeColor.amount.value, 0)) {
            return Decimal.times(buyables.greenIsNotACreativeColor.amount.value, 1.2).clampMin(1);
        }

        return Decimal.dOne;
    });

    const youreGonnaMakeMeBlowEffect = computed(() => {
        if (Decimal.gt(buyables.youreGonnaMakeMeBlow.amount.value, 0)) {
            return Decimal.sub(1, Decimal.times(buyables.youreGonnaMakeMeBlow.amount.value, 0.02));
        }

        return Decimal.dOne;
    });

    const buyables: Record<string, Repeatable> = {
        gamblingMan: createRepeatable(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: Formula.variable(buyables.gamblingMan.amount).add(2)
            })),
            display: {
                title: "Gambling Man",
                description: "Increase Pressure Build Chance by x1.2 per level.",
                effectDisplay: () => `x${format(gamblingManEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        })),

        blobTheBuilder: createRepeatable(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: Formula.variable(buyables.blobTheBuilder.amount).add(2)
            })),
            display: {
                title: "Blob The Builder",
                description: "Increase Pressure Build Mult by x1.2 per level.",
                effectDisplay: () => `x${format(blobTheBuilderEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        })),

        greenIsNotACreativeColor: createRepeatable(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: Formula.variable(buyables.greenIsNotACreativeColor.amount).add(2)
            })),
            display: {
                title: "Green is Not a Creative Color",
                description: "Divide Pressure Interval by ÷1.2 per level.",
                effectDisplay: () => `÷${format(greenIsNotACreativeColorEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        })),

        youreGonnaMakeMeBlow: createRepeatable(() => ({
            requirements: createCostRequirement(() => ({
                resource: tephra,
                cost: Formula.variable(buyables.youreGonnaMakeMeBlow.amount).add(2)
            })),
            display: {
                title: "You're Gonna Make Me Blow",
                description: "Raise the Explosive Eruption by ^α. Each level reduces α by -0.02.",
                effectDisplay: () => `${format(youreGonnaMakeMeBlowEffect.value)}`
            },
            classes: { "normal-repeatable": true },
            clickableDataAttributes: {
                "augmented-ui": "border bl-scoop-x"
            }
        }))
    };

    const unlocked = computed(() => Decimal.gt(lavaLayer.eruptions.value, 0));

    const showNotification = computed(() => {
        return (
            unlocked.value &&
            (Object.values(upgrades).some(u => u.canPurchase.value) ||
                Object.values(buyables).some(b => b.canClick.value))
        );
    });

    return {
        id,
        tephra,
        tephraConversion,
        unlocked,
        upgrades,
        buyables,
        showNotification,
        gamblingManEffect,
        blobTheBuilderEffect,
        greenIsNotACreativeColorEffect,
        youreGonnaMakeMeBlowEffect,
        display: () => (
            <>
                <div id="tephra-layer">
                    <Section header="Tephra">
                        <div data-augmented-ui="border tl-rect br-rect" class="w-[212px] h-fit p-6">
                            <h5 class="font-semibold">
                                You have {format(tephra.value, 0)} {tephra.displayName}
                            </h5>
                        </div>
                    </Section>

                    <Section header="Upgrades">
                        <div>{renderGroupedObjects(upgrades, 4)}</div>
                    </Section>

                    <Section header="Buyables">
                        <div class="mb-4">{renderGroupedObjects(buyables, 4)}</div>
                    </Section>
                </div>
            </>
        )
    };
});

export default tephraLayer;
