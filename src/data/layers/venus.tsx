import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import Tooltip from "wrappers/tooltips/Tooltip.vue";
import { createLayerTreeNode } from "data/common";
import { Direction } from "util/common";
import { createTabFamily } from "features/tabs/tabFamily";
import pressure from "./venus/pressure";
import { render } from "util/vue";

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
        color,
        // reset: fullReset
    }));

    const showNotification = computed(() => false);

    const tabs = createTabFamily({
        pressure: () => ({
            display: "Pressure",
            tab: pressure.display
        })
    });

    return {
        name,
        color,
        planetMass,
        treeNode,
        unlocked,
        showNotification,
        tabs,
        display: () => <>
            {render(tabs)}
        </>
    };
});

export default layer;