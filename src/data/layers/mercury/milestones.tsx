import { Achievement, createAchievement } from "features/achievements/achievement";
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
import { DecimalSource } from "util/bignum";
import Spacer from "components/layout/Spacer.vue";

const id = "Mm";
const layer = createLayer(id, () => {
    const name = "Mercury";
    const color = "#8c8c94";

    const firstMilestoneModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                multiplier: () =>
                    Decimal.times(1.5, chunksTab.bestChunks.value)
                        .times(hundredFiftyEffect.value)
                        // .pow(sixthMilestoneEffect.value)
                        .clampMin(1),
                enabled: milestones.first.earned,
                description: "First Chunk Milestone"
            })
        )
    ]);

    const fourthMilestoneModifier = computed((): DecimalSource => {
        if (milestones.four.earned.value) {
            const pow = milestones.six.earned.value ? 0.65 : 0.5;
            return Decimal.add(chunksTab.bestChunks.value, 1).slog().pow(pow).clampMin(1);
        }

        return Decimal.dOne;
    });

    const fiftyMilestoneEffect = computed((): DecimalSource => {
        if (milestones.fifty.earned.value) {
            return Decimal.add(chunksTab.bestChunks.value, 1).log10().clampMin(1);
        }

        return Decimal.dOne;
    });

    const eightyMilestoneEffect = computed((): DecimalSource => {
        if (milestones.eighty.earned.value) {
            return Decimal.pow(chunksTab.bestChunks.value, 1.1);
        }

        return Decimal.dZero;
    });

    const completedMilestonesCount = computed(
        () => Object.values(milestones).filter(a => a.earned.value).length
    );

    const hundredFiftyEffect = computed(() => {
        if (milestones.hundredFifty.earned.value) {
            return Decimal.sqrt(chunksTab.bestChunks.value);
        }

        return Decimal.dOne;
    });

    const milestones: Record<string, Achievement> = {
        first: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 1),
            display: {
                requirement: "1 Best Mercurial Chunk",
                effectDisplay: () => `x${format(firstMilestoneModifier.apply(1))}`,
                optionsDisplay: () => (
                    <>
                        Unlock the 'Dust Piles' buyable
                        <br />
                        Boost time by x1.5 per best Chunk
                    </>
                )
            }
        })),
        second: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 2),
            display: {
                requirement: "2 Best Mercurial Chunks",
                optionsDisplay: "Keep 1 Dust upgrade per milestone earned.",
                effectDisplay: (): string => `${completedMilestonesCount.value} upgrades are kept.`
            }
        })),
        three: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 3),
            display: {
                requirement: "3 Best Mercurial Chunks",
                optionsDisplay: "Unlock Chunk Upgrades."
            }
        })),
        four: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 10),
            display: {
                requirement: "10 Best Mercurial Chunks",
                optionsDisplay: "Raise time rate by best Chunks at a heavily reduced rate.",
                effectDisplay: () => `^${format(fourthMilestoneModifier.value)}`
            }
        })),
        five: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 20),
            display: {
                requirement: "20 Best Mercurial Chunks",
                optionsDisplay: "Keep some buyable levels on reset equal to your best Chunks.",
                effectDisplay: () => `Up to ${chunksTab.bestChunks.value} buyable levels are kept.`
            }
        })),
        fifty: createAchievement(() => ({
            // visibility: dustLayer.unlocks.accelerators.bought,
            requirements: createCountRequirement(chunksTab.bestChunks, 50),
            display: {
                requirement: "50 Best Mercurial Chunks",
                optionsDisplay: "Divide Chunk Accelerons interval based on best Chunks.",
                effectDisplay: () => `Currently: ÷${format(fiftyMilestoneEffect.value)}`
            }
        })),
        six: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 65),
            display: {
                requirement: "65 Best Mercurial Chunks",
                optionsDisplay: "Improve the effect of Milestone 4."
            }
        })),
        eighty: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 80),
            display: {
                requirement: "80 Best Mercurial Chunks",
                optionsDisplay: "Increase base Collision Time based on best Chunks.",
                effectDisplay: () => `Currently: +${format(eightyMilestoneEffect.value)}`
            }
        })),
        hundredFifty: createAchievement(() => ({
            requirements: createCountRequirement(chunksTab.bestChunks, 150),
            display: {
                requirement: "150 Best Mercurial Chunks",
                optionsDisplay: "Multiply the effect of Milestone 1 based on best Chunks",
                effectDisplay: () => `Currently: x${format(hundredFiftyEffect.value)}`
            }
        }))
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
        fiftyMilestoneEffect,
        eightyMilestoneEffect,
        fullReset,
        display: () => (
            <>
                <h4>Your best condensed Chunks count is {format(chunksTab.bestChunks.value, 0)}</h4>
                <Spacer />
                {Object.values(milestones).map(a => render(a))}
            </>
        )
    };
});

export default layer;
