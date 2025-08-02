import Formula from "game/formulas/formulas";
import Decimal from "util/break_eternity";
import pressureLayer from "./pressure";
import { noPersist } from "game/persistence";
import { createIndependentConversion } from "features/conversion";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { DecimalSource } from "lib/break_eternity";
import { computed, unref } from "vue";
import lavaLayer from "./lava";
import milestonesLayer from "./milestones";
import { createUpgrade, Upgrade } from "features/clickables/upgrade";

const id = "VT";
const tephraLayer = createLayer(id, () => {
    const tephra = createResource<DecimalSource>(0, "Tephra");

    const tephraConversion = createIndependentConversion(() => ({
        gainResource: noPersist(tephra),
        baseResource: pressureLayer.pressure,
        formula: () =>
            Formula.variable(Decimal.dZero).if(
                () => pressureLayer.pressureCapped.value,
                () => Formula.variable(Decimal.dOne).add(milestonesLayer.threeMilestoneEffect.value)
            ),
        convert: () => {
            tephra.value = unref(tephraConversion.currentGain);
        }
    }));

    // Buyables that boost shit
    // Unlock passive generators for lava subtypes?
    // Unlock more volcanos/pressure timers?
    // Increase tephra gain - some sort of inherent scaling bonus?

    // Going to have ~30 presses, and therefore 30 Tephra to buy stuff.
    // Either need to forgo buyables, or add a way to increase tephra gain.

    const upgrades: Record<string, Upgrade> = {
        // whatAboutSecondVolcano: createUpgrade(() => ({
        //     requirements: [],
        //     display: {
        //         title: "What about second volcano?",
        //         description: "Unlock a second volcano."
        //     }
        // }))
    };

    // Have ~4 upgrades that cost 1 Tephra
    // Have buyables start at cost 2 and increase by 1 each level
    // 4 upgrades:
    // Ultramafic? - effect tbd
    // Unlock more  upgrades?

    // Buyables:
    // Reduce Explosive Eruption Requirement
    // X1.01|^1.01 resources?

    const generatorBuyables = {};

    const unlocked = computed(() => Decimal.gt(lavaLayer.eruptions.value, 0));

    const showNotification = computed(() => false);

    return {
        id,
        tephra,
        tephraConversion,
        unlocked,
        upgrades,
        showNotification,
        display: () => <>???</>
    };
});

export default tephraLayer;
