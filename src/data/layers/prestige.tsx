/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion } from "features/conversion";
import { createHotkey } from "features/hotkey";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import { createResource } from "features/resources/resource";
import { createResourceTooltip } from "features/trees/tree";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render } from "util/vue";
import { addTooltip } from "wrappers/tooltips/tooltip";
import { createLayerTreeNode, createResetButton } from "../common";
import { computed } from "vue";
import Decimal, { format } from "util/bignum";

const id = "P";
const layer = createLayer(id, baseLayer => {
    const name = "Prestige";
    const color = "#4BDC13";

    const drift = createResource<DecimalSource>(1, "drift");
    const timer = createResource<DecimalSource>(0, "timer");
    const timerMax = computed(() => {
        return new Decimal(5);
    });

    const timerGain = computed(() => {
        return new Decimal(1);
    });
    
    const driftChance = computed(() => {
        return new Decimal(5);
    })

    const driftGainMultiplier = computed(() => {
        // eslint-disable-next-line prefer-const
        let gain = new Decimal(1.1);
        return gain;
    });
    baseLayer.on("update", diff => {
        timer.value = Decimal.add(timer.value, Decimal.times(timerGain.value, diff));
        // points.value = Decimal.add(points.value, Decimal.times(driftGain.value, diff));

        if (timer.value.gte(timerMax.value)) {
            timer.value = 0;

            const value = Math.random() * 100;
            console.log({ value })
            if (Decimal.gte(driftChance.value, value)) {
                console.log('ping!');
                drift.value = Decimal.multiply(drift.value, driftGainMultiplier.value);
            } 
        }
    });

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset
    }));

    // const resetButton = createResetButton(() => ({
    //     conversion,
    //     tree: main.tree,
    //     treeNode
    // }));

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
        display: () => (
            <>
                {Decimal.lt(drift.value, "1e1000") ? <span>You have </span> : null}
                <h2>{format(drift.value)}</h2>
                {Decimal.lt(drift.value, "1e1e6") ? <span> drift</span> : null}
                <br></br>
                <p>Timer: {format(timer.value)}/{format(timerMax.value)}</p>
                <p>Chance: {format(driftChance.value)}%</p>
                <p>Multiplier: {format(driftGainMultiplier.value)}</p>
                {/* {render(resetButton)} */}
            </>
        ),
        treeNode,

        // hotkey
    };
});

export default layer;
