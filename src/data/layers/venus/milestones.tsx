import { Achievement, createAchievement } from "features/achievements/achievement";
import { createLayer } from "game/layers";
import { createCountRequirement } from "game/requirements";
import lavaLayer from "./lava";
import { computed } from "vue";
import Decimal, { format } from "util/bignum";
import { render } from "util/vue";

const id = "VM";
const milestonesLayer = createLayer(id, () => {
    // Milestone - increase tephra gain
    // Milestone - keep/gain some lava on reset & retain effusive eruption on reset
    // keep some upgrades on reset.
    const eruptions = lavaLayer.eruptions;

    const firstMilestoneEffect = computed(() => {
        if (milestones.one.earned.value) {
            return Decimal.times(eruptions.value, 0.001);
        }

        return Decimal.dZero;
    });

    const milestones: Record<string, Achievement> = {
        one: createAchievement(() => ({
            requirements: createCountRequirement(eruptions, 1),
            display: {
                requirement: "1 Eruption",
                effectDisplay: (
                    <>
                        <h3>Increase Effusive Eruption based on Eruptions.</h3>
                        <h4>Currently: {format(firstMilestoneEffect.value)}</h4>
                    </>
                )
            }
        }))
    };

    const unlocked = computed(() => Decimal.gt(eruptions.value, 0));

    return {
        id,
        unlocked,
        milestones,
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
                        <h3>You have erupted ${format(eruptions.value, 1)} times.</h3>
                    </div>

                    {Object.values(milestones).map(a => render(a))}
                </div>
            </>
        )
    };
});

export default milestonesLayer;
