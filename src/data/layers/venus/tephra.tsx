import Formula from "game/formulas/formulas";
import Decimal from "util/break_eternity";
import pressureLayer from "./pressure";
import { noPersist } from "game/persistence";
import { createIndependentConversion } from "features/conversion";
import { createResource } from "features/resources/resource";
import { createLayer } from "game/layers";
import { DecimalSource } from "lib/break_eternity";

const id = "VT";
const tephraLayer = createLayer(id, () => {
    const tephra = createResource<DecimalSource>(0, "Tephra");

    const tephraConversion = createIndependentConversion(() => ({
        gainResource: noPersist(tephra),
        baseResource: pressureLayer.pressure,
        formula: () =>
            Formula.variable(Decimal.dZero).if(
                () => pressureLayer.pressureCapped.value,
                () => Formula.variable(Decimal.dOne)
            ),
        convert: () => (tephra.value = Decimal.add(tephra.value, 1))
    }));

    // Buyables that boost shit
    // Unlock passive generators for lava subtypes?
    // Unlock more volcanos/pressure timers?
    // Increase tephra gain - some sort of inherent scaling bonus?

    return {
        id,
        tephra,
        tephraConversion,
        display: () => (<>???</>)
    };
});

export default tephraLayer;
