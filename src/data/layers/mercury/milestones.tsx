import { createAchievement } from "features/achievements/achievement";
import { createLayer } from "game/layers";
import { computed } from "vue";
import chunksTab from "./chunks";
import { createCountRequirement } from "game/requirements";
import Decimal, { format } from "util/break_eternity";
import {
    createSequentialModifier,
    createMultiplicativeModifier,
    MultiplicativeModifierOptions
} from "game/modifiers";
import { render } from "util/vue";
import { createReset } from "features/reset";

const id = "Mm";
const layer = createLayer(id, () => {
    const name = "Mercury";
    const color = "#8c8c94";

    const firstMilestoneModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                multiplier: () =>
                    Decimal.times(1.5, chunksTab.totalChunks.value)
                        // .pow(sixthMilestoneEffect.value)
                        .clampMin(1),
                enabled: milestones.first.earned,
                description: "First Chunk Milestone"
            })
        )
    ]);

    const fourthMilestoneModifier = computed(() => {
        if (milestones.four.earned.value === true) {
            return Decimal.add(chunksTab.totalChunks.value, 1).slog().pow(0.5).clampMin(1);
        }

        return Decimal.dOne;
    });

    // const sixthMilestoneEffect = computed(() => {
    //     if (milestones.six.earned.value === true) {
    //         return Decimal.fromNumber(1.1);
    //     }

    //     return Decimal.dOne;
    // });

    const completedMilestonesCount = computed(
        () => Object.values(milestones).filter(a => a.earned.value).length
    );

    const milestones = {
        first: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.totalChunks, 1),
            display: {
                requirement: "1 Mercurial Chunk",
                effectDisplay: () => `x${format(firstMilestoneModifier.apply(1))}`,
                optionsDisplay: () => (
                    <>
                        Unlock the `Dust Piles` buyable
                        <br />
                        Boost time by x1.5 per total chunk
                    </>
                )
            }
        })),
        second: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.totalChunks, 2),
            display: {
                requirement: "2 Total Mercurial Chunks",
                optionsDisplay: "Keep 1 Dust upgrade per milestone achieved.",
                effectDisplay: (): string => `${completedMilestonesCount.value} upgrades are kept`
            }
        })),
        three: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.totalChunks, 3),
            display: {
                requirement: "3 Total Mercurial Chunks",
                optionsDisplay: "Unlock Chunk Upgrades"
            }
        })),
        four: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.totalChunks, 10),
            display: {
                requirement: "10 Total Mercurial Chunks",
                optionsDisplay: "Raise time rate by total chunks at a heavily reduced rate.",
                effectDisplay: () => `^${format(fourthMilestoneModifier.value)}`
            }
        })),
        five: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.totalChunks, 20),
            display: {
                requirement: "20 Total Mercurial Chunks",
                optionsDisplay: "Keep some buyable levels on reset equal to your total chunks.",
                effectDisplay: () => `Up to ${chunksTab.totalChunks.value} buyable levels are kept.`
            }
        }))
        // six: createAchievement(() => ({
        //     requirements: createCountRequirement(chunksTab.totalChunks, 200),
        //     display: {
        //         requirement: "200 Total Mercurial Chunks",
        //         optionsDisplay: "Raise first Milestone effect by ^1.1.",
        //         effectDisplay: () => `^${format(sixthMilestoneEffect.value)}`
        //     }
        // }))
    };

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const fullReset = () => {
        reset.reset();

        Object.values(milestones).forEach(milestone => (milestone.earned.value = false));
    };

    return {
        name,
        color,
        milestones,
        completedMilestonesCount,
        firstMilestoneModifier,
        fourthMilestoneModifier,
        fullReset,
        display: () => (
            <>
                <h4>You have condensed {format(chunksTab.totalChunks.value)} total chunks.</h4>
                {Object.values(milestones).map(a => render(a))}
            </>
        )
    };
});

export default layer;
