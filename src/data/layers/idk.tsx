/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion } from "features/conversion";
import { createReset } from "features/reset";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { computed, unref } from "vue";
import Decimal, { format } from "util/bignum";
import { createRepeatable } from "features/clickables/repeatable";
import { CostRequirementOptions, createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import { noPersist } from "game/persistence";
import {
    createAdditiveModifier,
    createMultiplicativeModifier,
    createSequentialModifier
} from "game/modifiers";
import Column from "components/layout/Column.vue";
import solarLayer from "./solar";

const id = "M";
const layer = createLayer(id, baseLayer => {
    const name = "Mercury";
    const color = "#8c8c94";

    const timerMaxRepeatable = createRepeatable(() => ({
        requirements: createCostRequirement(
            (): CostRequirementOptions => ({
                resource: noPersist(instability),
                cost: Formula.variable(timerMaxRepeatable.amount).add(1).times(3)
            })
        ),
        display: {
            title: "Time Dilation",
            description: "Decrease the timer interval",
            effectDisplay: () => {
                const c = new Decimal(1).sub(
                    new Decimal(0.01).times(timerMaxRepeatable.amount.value)
                );
                return `/ ${c}`;
            }
        }
    }));

    const timerMaxModifer = createSequentialModifier(() => [
        // 1 - (.01 * X)
        createMultiplicativeModifier(() => ({
            multiplier: () =>
                new Decimal(1).sub(new Decimal(0.01).times(timerMaxRepeatable.amount.value))
        }))
    ]);

    const driftChanceRepeatable = createRepeatable(() => ({
        requirements: createCostRequirement(
            (): CostRequirementOptions => ({
                resource: noPersist(instability),
                cost: Formula.variable(driftChanceRepeatable.amount).add(10).times(4.5)
            })
        ),
        display: {
            title: "Align the Stars",
            description: "Increase the chance of drift by +0.5%",
            effectDisplay: () => {
                const c: any = driftChanceModifier.apply(0);
                return `+${c}%`;
            }
        }
    }));

    const driftChanceModifier = createSequentialModifier(() => [
        createAdditiveModifier(() => ({
            addend: () => Decimal.div(driftChanceRepeatable.amount.value, 2)
        }))
    ]);

    const driftMultiplierRepeatable = createRepeatable(() => ({
        requirements: createCostRequirement(
            (): CostRequirementOptions => ({
                resource: noPersist(instability),
                cost: Formula.variable(driftMultiplierRepeatable.amount).add(25).times(3)
            })
        ),
        display: {
            title: "Sharp, Short, Shove",
            description: "Increase the multiplier of drift",
            effectDisplay: () => {
                const c: Decimal = new Decimal(1).add(unref(driftMultiplierRepeatable.amount));
                return `* ${c}`;
            }
        }
    }));

    const driftMultiplierModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            multiplier: () => new Decimal(1).add(driftMultiplierRepeatable.amount.value),
            enabled: Decimal.gt(driftMultiplierRepeatable.amount.value, 0)
        }))
    ]);

    const drift = createResource<DecimalSource>(1, "drift");
    const timer = createResource<DecimalSource>(0, "timer");
    const timerMax = computed(() => {
        return new Decimal(5).times(timerMaxModifer.apply(1));
    });

    const timerGain = computed(() => new Decimal(1));

    const driftChance = computed(() => {
        return new Decimal(5).add(driftChanceModifier.apply(0));
    });

    const driftGainMultiplier = computed(() => {
        const gain = new Decimal(1.1).times(driftMultiplierModifier.apply(1));
        return gain;
    });

    baseLayer.on("update", diff => {
        timer.value = Decimal.add(timer.value, Decimal.times(timerGain.value, diff));

        if (timer.value.gte(timerMax.value)) {
            timer.value = 0;

            const value = Math.random() * 100;
            if (Decimal.gte(driftChance.value, value)) {
                drift.value = Decimal.multiply(drift.value, driftGainMultiplier.value).clampMax(
                    1.79e308
                );
            }
        }
    });

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const instability = createResource(0, "instability", 2);

    const treeNode = createLayerTreeNode(() => ({
        visibility: noPersist(solarLayer.mercuryUpgrade.bought),
        layerID: id,
        color,
        reset
    }));

    const conversion = createCumulativeConversion(() => ({
        formula: x => x.add(1).log10().pow(0.8),
        baseResource: drift,
        gainResource: noPersist(instability),
        onConvert: () => (drift.value = 1),
        currentGain: computed((): Decimal => {
            return Decimal.fromValue(conversion.formula.evaluate(drift.value));
        })
    }));

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode,
        showNextAt: false
    }));

    // const hotkey = createHotkey(() => ({
    //     description: "Reset for prestige points",
    //     key: "p",
    //     onPress: resetButton.onClick!
    // }));

    return {
        name,
        color,
        drift,
        driftGainMultiplier,
        driftChance,
        timer,
        timerGain,
        timerMax,
        instability,
        timerMaxRepeatable,
        driftChanceRepeatable,
        driftMultiplierRepeatable,
        display: () => (
            <>
                <h2>You have {format(drift.value)}</h2>
                <br></br>
                <p>
                    Timer: {format(timer.value)}/{format(timerMax.value)}
                </p>
                <p>Chance: {format(driftChance.value)}%</p>
                <p>Multiplier: {format(driftGainMultiplier.value)}</p>
                <br />
                <br />
                <h3>You have {format(instability.value)} instability</h3>
                {render(resetButton)}
                <br />
                <br />
                <Column>
                    {renderRow(
                        timerMaxRepeatable,
                        driftChanceRepeatable,
                        driftMultiplierRepeatable
                    )}
                </Column>
            </>
        ),
        treeNode

        // hotkey
    };
});

export default layer;
