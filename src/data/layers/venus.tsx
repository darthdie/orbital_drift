import { createResource, displayResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import Tooltip from "wrappers/tooltips/Tooltip.vue";
import { createLayerTreeNode } from "data/common";
import { Direction } from "util/common";
import { createTabFamily } from "features/tabs/tabFamily";
import pressureLayer from "./venus/pressure";
import { render } from "util/vue";
import { createBar } from "features/bars/bar";
import { DefaultValue } from "game/persistence";
import lavaLayer from "./venus/lava";
import Spacer from "components/layout/Spacer.vue";
import { format } from "util/bignum";
import silicateLayer from "./venus/silicate";
import { LavaSubtype } from "./venus/createLavaSubtype";
import tephraLayer from "./venus/tephra";
import milestonesLayer from "./venus/milestones";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import solarLayer from "./solar";

const id = "V";
const layer = createLayer(id, () => {
    const name = "Venus";
    const color = "#f8e2b0";

    const unlocked = computed(() => solarLayer.solarSystemUpgrades.venus.bought.value);

    const planetMass = createResource<DecimalSource>(Decimal.fromNumber(2e256), "Planet Mass");

    const treeNode = createLayerTreeNode(() => ({
        visibility: unlocked,
        layerID: id,
        display: () => <CelestialBodyIcon body={"Venus"} />,
        wrapper: <Tooltip display="Venus" direction={Direction.Left}></Tooltip>,
        glowColor: () => (showNotification.value ? color : null),
        color
        // reset: fullReset
    }));

    const tabs = createTabFamily({
        pressure: () => ({
            display: () => <>Volcano{pressureLayer.showNotification.value ? " !" : null}</>,
            tab: pressureLayer.display
        }),
        lava: () => ({
            display: () => <>Molten Lava{lavaLayer.showNotification.value ? " !" : null}</>,
            visibility: lavaLayer.unlocked,
            tab: lavaLayer.display
        }),
        silicate: () => ({
            display: () => <>Silicate Lava{silicateLayer.showNotification.value ? " !" : null}</>,
            visibility: silicateLayer.unlocked,
            tab: silicateLayer.display
        }),
        tepra: () => ({
            display: () => <>Tephra{tephraLayer.showNotification.value ? " !" : null}</>,
            visibility: tephraLayer.unlocked,
            tab: tephraLayer.display
        }),
        milestones: () => ({
            display: "Milestones",
            visibility: milestonesLayer.unlocked,
            tab: milestonesLayer.display
        })
    });

    const planetMassBar = createBar(() => ({
        direction: Direction.Right,
        height: 16,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        },
        progress: () =>
            Decimal.div(Decimal.ln(planetMass.value), Decimal.ln(planetMass[DefaultValue]))
    }));

    const massDestructionAmount = computed(() => {
        return Decimal.sub(0.99, Decimal.times(lavaLayer.eruptions.value, 0.01));
    });

    const pressureBar = createBar(() => ({
        direction: Direction.Right,
        height: 24,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        },
        display: () => (
            <span class="text-shadow-lg text-venus-500">
                {format(pressureLayer.pressure.value)}/{format(pressureLayer.pressureMax.value)}
            </span>
        ),
        progress: () =>
            Decimal.div(
                Decimal.ln(pressureLayer.pressure.value),
                Decimal.ln(pressureLayer.pressureMax.value)
            )
    }));

    const lavaBar = createBar(() => ({
        direction: Direction.Right,
        height: 32,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        },
        display: () => (
            <>
                <h4 class="text-venus-500 text-shadow-lg">
                    {format(lavaLayer.lava.value)}/{format(lavaLayer.lavaCap.value)}
                </h4>
            </>
        ),
        progress: () => {
            if (Decimal.gt(lavaLayer.lavaCap.value, 1e10)) {
                return Decimal.div(
                    Decimal.ln(lavaLayer.lava.value),
                    Decimal.ln(lavaLayer.lavaCap.value)
                );
            }

            return Decimal.div(lavaLayer.lava.value, lavaLayer.lavaCap.value);
        }
    }));

    function createSilicateBar(silicate: LavaSubtype) {
        return createBar(() => ({
            direction: Direction.Right,
            height: 32,
            width: "152px",
            style: {
                overflow: "hidden"
            },
            borderStyle: {
                borderRadius: "0",
                borderColor: "var(--outline)"
            },
            display: () => (
                <>
                    <h4 class="text-venus-500 text-shadow-lg">
                        {format(silicate.resource.value)}/{format(silicate.cap.value)}
                    </h4>
                </>
            ),
            progress: () => {
                if (Decimal.gt(silicate.cap.value, 1e10)) {
                    return Decimal.div(
                        Decimal.ln(silicate.resource.value),
                        Decimal.ln(silicate.cap.value)
                    );
                }

                return Decimal.div(silicate.resource.value, silicate.cap.value);
            }
        }));
    }

    const felsicBar = createSilicateBar(silicateLayer.felsic);
    const intermediateBar = createSilicateBar(silicateLayer.intermediate);
    const maficBar = createSilicateBar(silicateLayer.mafic);

    const showNotification = computed(() => {
        return (
            (unlocked.value && pressureLayer.showNotification.value) ||
            lavaLayer.showNotification.value ||
            silicateLayer.showNotification.value
        );
    });

    return {
        name,
        color,
        planetMass,
        treeNode,
        unlocked,
        showNotification,
        tabs,
        massDestructionAmount,
        display: () => (
            <>
                <h2>
                    {displayResource(planetMass)} {planetMass.displayName}
                </h2>
                <div data-augmented-ui="border tr-clip" class="w-[312px]">
                    {render(planetMassBar)}
                </div>
                <Spacer />

                <div class="w-[256px]">
                    <div data-augmented-ui="border tl-clip br-clip">
                        <h3>Pressure</h3>
                    </div>
                    <div data-augmented-ui="border tr-clip br-clip">{render(pressureBar)}</div>

                    {lavaLayer.unlocked.value ? (
                        <>
                            <div data-augmented-ui="border bl-clip tr-clip">
                                <h3>Lava</h3>
                            </div>
                            <div data-augmented-ui="border tl-clip br-rect">{render(lavaBar)}</div>
                        </>
                    ) : null}
                </div>

                {silicateLayer.unlocked.value ? (
                    <div class="w-fit flex">
                        <div class="flex-1" data-augmented-ui="border tl-clip">
                            <h4 class="p-1">Felsic</h4>
                            {render(felsicBar)}
                        </div>

                        <div class="flex-1" data-augmented-ui="border">
                            <h4 class="p-1">Intermediate</h4>
                            {render(intermediateBar)}
                        </div>

                        <div class="flex-1" data-augmented-ui="border tr-clip">
                            <h4 class="p-1">Mafic</h4>
                            {render(maficBar)}
                        </div>
                    </div>
                ) : null}

                <Spacer />

                {render(tabs)}
            </>
        )
    };
});

export default layer;
