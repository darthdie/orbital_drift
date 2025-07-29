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

const id = "V";
const layer = createLayer(id, () => {
    const name = "Venus";
    const color = "#f8e2b0";

    // const unlocked = computed(() => solarLayer.solarSystemUpgrades.venus.bought.value);
    const unlocked = computed(() => true);

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

    const showNotification = computed(() => false);

    const tabs = createTabFamily({
        pressure: () => ({
            display: "Pressure",
            tab: pressureLayer.display
        }),
        lava: () => ({
            display: "Lava",
            visibility: lavaLayer.unlocked,
            tab: lavaLayer.display
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

                {render(tabs)}
            </>
        )
    };
});

export default layer;
