/**
 * @module
 * @hidden
 */
import { createReset } from "features/reset";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import type { DecimalSource } from "util/bignum";
import { render } from "util/vue";
import { createLayerTreeNode } from "../common";
import { computed } from "vue";
import Decimal, { format } from "util/bignum";
import { noPersist } from "game/persistence";
import { createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import solarLayer from "./solar";
import Spacer from "components/layout/Spacer.vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import dustTab from "./mercury/dust";
import chunksTab from "./mercury/chunks";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import milestones from "./mercury/milestones";
import accelerators from "./mercury/accelerators";
import { createClickable } from "features/clickables/clickable";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import Tooltip from "wrappers/tooltips/Tooltip.vue";

/* TODO:
  upgrade/repeatable: seconds increases itself (acceleration)
  rename: "reset time" to something more thematic
  add milestones
  add solar rays

  I need
*/

/*
  Add toggle to enable/disable mercurial dust gain, which enables/disables collision time?
  Then add upgrades that boost based on collision time?
*/

const id = "M";
const layer = createLayer(id, baseLayer => {
    const name = "Mercury";
    const color = "#8c8c94";

    const unlocked = noPersist(solarLayer.solarSystemUpgrades.mercury.bought);

    const maxCollisionTime = Decimal.times(1e88, 84600);
    const collisionTime = createResource<DecimalSource>(maxCollisionTime);
    const totalResets = createResource<DecimalSource>(0);

    const collisionTimeProgressBar = createBar(() => ({
        progress: () => {
            return Decimal.sub(
                1,
                Decimal.div(
                    Decimal.ln(collisionTimeGainComputed.value),
                    Decimal.ln(maxCollisionTime)
                )
            );
        },
        width: "100%",
        height: 10,
        direction: Direction.Right,
        containerStyle: {
            "text-align": "center"
        },
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline-lighter)"
        },
    }));

    const baseTimeRateModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(() => ({
            multiplier: 1.5,
            enabled: dustTab.basicUpgrades.messengerGodUpgrade.bought,
            description: "Messenger God"
        }))
    ]);

    const collisionTimeGainComputed = computed(() =>
        new Decimal(1)
            .add(milestones.eightyMilestoneEffect.value)
            .times(baseTimeRateModifier.apply(1))
            .times(milestones.firstMilestoneModifier.apply(1))
            .times(solarLayer.mercuryTreeEffects.solarSpeed.value)
            .times(dustTab.messengerGodModifier.apply(1))
            .pow(dustTab.collisionCourseEffect.value)
            .pow(milestones.fourthMilestoneModifier.value)
            .pow(chunksTab.collidingChunksEffect.value)
    );

    const hasCollidedComputed = computed(() => Decimal.lte(collisionTime.value, 0));
    // const hasCollidedComputed = computed(() => false);

    baseLayer.on("update", diff => {
        if (!unlocked.value) {
            return;
        }

        collisionTime.value = Decimal.sub(
            collisionTime.value,
            Decimal.times(collisionTimeGainComputed.value, diff)
        ).clampMin(0);
    });

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const showNotification = computed(() => {
        return (
            dustTab.showNotification.value ||
            chunksTab.showNotification.value ||
            accelerators.showNotification.value
        );
    });

    const treeNode = createLayerTreeNode(() => ({
        visibility: unlocked,
        layerID: id,
        display: () => <CelestialBodyIcon body={"Mercury"} />,
        wrapper: <Tooltip display="Mercury" direction={Direction.Down}></Tooltip>,
        glowColor: () => (showNotification.value ? color : null),
        color,
        reset
    }));

    const tabs = createTabFamily({
        dust: () => ({
            display: () => <>Dust {dustTab.showNotification.value ? "!" : null}</>,
            tab: createTab(() => ({
                display: dustTab.display
            }))
        }),
        chunks: () => ({
            visibility: () => dustTab.unlocks.chunks.bought.value,
            display: () => <>Chunks {chunksTab.showNotification.value ? "!" : null}</>,
            tab: createTab(() => ({
                display: chunksTab.display
            }))
        }),
        accelerators: () => ({
            visibility: dustTab.unlocks.accelerators.bought,
            display: () => <>Accelerators {accelerators.showNotification.value ? "!" : null}</>,
            tab: createTab(() => ({ display: accelerators.display }))
        }),
        milestones: () => {
            return {
                visibility: dustTab.unlocks.chunks.bought,
                display: "Milestones",
                tab: createTab(() => ({
                    display: milestones.display
                }))
            };
        }
    });

    const regularDisplay = computed(() => (
        <>
            <h2>Mercury</h2>
            <br />
            {Decimal.lt(collisionTime.value, 86400) ? (
                <h3>{format(Decimal.div(collisionTime.value, 3600))} hours until collision</h3>
            ) : (
                <h3>{format(Decimal.div(collisionTime.value, 86400))} days until collision</h3>
            )}

            <h4>-{format(collisionTimeGainComputed.value)}/s</h4>

            <div
                data-augmented-ui="border tl-clip"
                style="border-color: var(--outline); width: 512px"
            >
                {render(collisionTimeProgressBar)}
            </div>

            <Spacer />
            {render(tabs)}
        </>
    ));

    const solarResetButton = createClickable(() => ({
        display: {
            title: "Mercury has collided with the Sun.",
            description: "Reset for 1 Solar Energy."
        },
        onClick: () => {
            solarLayer.energy.value = Decimal.add(solarLayer.energy.value, 1);
            solarLayer.mercuryCores.value = Decimal.add(solarLayer.mercuryCores.value, 1);
            totalResets.value = Decimal.add(totalResets.value, 1);
            accelerators.fullReset();
            milestones.fullReset();
            chunksTab.fullReset();
            dustTab.fullReset();
            reset.reset();
            collisionTime.value = maxCollisionTime;
        }
    }));

    const collidedDisplay = computed(() => (
        <>
            <div style="height: 100%; display: flex;">{render(solarResetButton)}</div>
        </>
    ));

    const renderDisplay = () => {
        return hasCollidedComputed.value ? collidedDisplay.value : regularDisplay.value;
    };

    return {
        name,
        color,
        collisionTime,
        maxCollisionTime,
        tabs,
        collisionTimeGainComputed,
        display: () => renderDisplay(),
        treeNode,
        totalResets,
        unlocked,
        solarResetButton
    };
});

export default layer;
