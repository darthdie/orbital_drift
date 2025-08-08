import { Achievement, createAchievement } from "features/achievements/achievement";
import { createLayer } from "game/layers";
import { createCountRequirement } from "game/requirements";
import lavaLayer from "./lava";
import { computed } from "vue";
import Decimal, { format } from "util/bignum";
import { render } from "util/vue";

const id = "VM";
const milestonesLayer = createLayer(id, () => {
    // keep some upgrades on reset.
    const eruptions = lavaLayer.eruptions;

    const milestones: Record<string, Achievement> = {
        one: createAchievement(() => ({
            requirements: createCountRequirement(eruptions, 1),
            display: {
                requirement: "1 Eruption",
                effectDisplay: () => (
                    <>
                        <h4>Increase Effusive Eruption based on Eruptions.</h4>
                        <h4>Currently: +{format(oneMilestoneEffect.value)}</h4>
                    </>
                )
            }
        })),
        three: createAchievement(() => ({
            requirements: createCountRequirement(eruptions, 3),
            display: {
                requirement: "3 Eruptions",
                effectDisplay: () => (
                    <>
                        <h4>Increase base Tephra gain by Eruptions.</h4>
                        <h4>Current +{format(threeMilestoneEffect.value)}</h4>
                    </>
                )
            }
        })),
        five: createAchievement(() => ({
            requirements: createCountRequirement(eruptions, 5),
            display: {
                requirement: "5 Eruptions",
                effectDisplay: () => (
                    <>
                        <h4>Keep Effusive Eruption unlocked</h4>
                        <h4>Keep Molten Lava on Explosive Eruption based on Eruptions.</h4>
                        <h4>Current {format(fiveMilestoneEffect.value)}</h4>
                    </>
                )
            }
        }))
    };

    const oneMilestoneEffect = computed(() => {
        if (milestones.one.earned.value) {
            return Decimal.times(eruptions.value, 0.01);
        }

        return Decimal.dZero;
    });

    const threeMilestoneEffect = computed(() => {
        if (milestones.three.earned.value) {
            return Decimal.fromValue(eruptions.value);
        }

        return Decimal.dZero;
    });

    const fiveMilestoneEffect = computed(() => {
        if (milestones.five.earned.value) {
            return Decimal.times(eruptions.value, 25);
        }

        return Decimal.dZero;
    });

    const unlocked = computed(() => Decimal.gt(eruptions.value, 0));

    return {
        id,
        unlocked,
        milestones,
        oneMilestoneEffect,
        threeMilestoneEffect,
        fiveMilestoneEffect,
        display: () => (
            <>
                <div id="milestones-layer">
                    <div class="mb-2">
                        <h2>Milestones</h2>
                    </div>
                    <div class="mb-4">
                        <hr class="section-divider" />
                    </div>

                    <div class="mb-6">
                        <h3>You have erupted {format(eruptions.value, 0)} times.</h3>
                    </div>

                    {Object.values(milestones).map(a => render(a))}
                </div>
            </>
        )
    };
});

export default milestonesLayer;
