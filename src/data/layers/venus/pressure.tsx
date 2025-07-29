import { format } from "util/break_eternity";
import { createResource, trackBest } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { render } from "util/vue";
import { createLayer } from "game/layers";

import "./pressure.css";
import lavaLayer from "./lava";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");
    const bestPressure = trackBest(pressure);

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        () => Decimal.div(15, lavaLayer.maficEffect.value)
        // Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
        //     .div(pressureIntervalBuyableEffect.value)
        //     .div(lavaIsFloorEffect.value)
        //     .div(maficEffect.value)
        //     .div(hotPotEffect.value)
        //     .pow(tephraPressureIntervalEffect.value)
    );
    const pressureChance = computed(
        () => Decimal.add(10, lavaLayer.felsicEffect.value)
        // Decimal.add(10, pressureChanceBuyableEffect.apply(0))
        //     .add(floorIsLavaEffect.value)
        //     .add(bubblingEffect.value)
        //     .pow(tephraPressureChanceEffect.value)
    );
    const pressureGainMultiplier = computed(
        () => Decimal.times(1.3, lavaLayer.intermediateEffect.value)
        // Decimal.times(1.3, pressureMultBuyableEffect.value)
        //     .times(riceCookerEffect.value)
        //     .pow(tephraPressureGainEffect.value)
    );
    
    const pressureMax = computed(() => {
        const pow = Decimal.pow(2, lavaLayer.eruptions.value);
        return Decimal.fromNumber(1e25).pow(pow);
    });
    const pressureCapped = computed(() => Decimal.eq(pressure.value, pressureMax.value));

    const unlocked = computed(() => true);

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
                {format(pressure.value)}/{format(pressureMax.value)}
            </span>
        ),
        progress: () => Decimal.div(Decimal.ln(pressure.value), Decimal.ln(pressureMax.value))
    }));

    const pressureTimerBar = createBar(() => ({
        direction: Direction.Right,
        height: 24,
        width: "100%",
        progress: () => Decimal.div(pressureTimer.value, pressureTimerMax.value),
        display: () => (
            <span class="text-shadow-lg text-venus-500">
                {format(Decimal.sub(pressureTimerMax.value, pressureTimer.value))}
            </span>
        ),
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline)"
        }
    }));

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value) {
            return;
        }

        tickPressure(diff);
    });

    function tickPressure(diff: number) {
        if (pressureCapped.value) {
            pressureTimer.value = Decimal.dZero;
            return;
        }

        pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

        if (pressureTimer.value.lt(pressureTimerMax.value)) {
            return;
        }

        pressureTimer.value = 0;

        const rng = random();
        console.log({ rng });
        if (Decimal.gte(pressureChance.value, rng)) {
            let buildAmount = pressureGainMultiplier.value;

            if (Decimal.gt(lavaLayer.lavaEffect.value, 0)) {
                if (Decimal.gte(lavaLayer.lavaEffect.value, random())) {
                    buildAmount = buildAmount.times(5);
                    console.log("KICK");
                }
            }

            pressure.value = Decimal.multiply(
                Decimal.clampMin(pressure.value, 1),
                buildAmount
            ).clampMax(pressureMax.value);
        }
    }

    /*
        Pressure
        -> Lava
        --> Felsic
        ---> Pressure Build %
        --> Intermediate
        ---> Pressure Build X
        --> Mafic
        ---> Pressure Interval

        Ultramafic?
    */

    const eruptionPressureDivisor = 0.6;
    const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1));

    return {
        pressure,
        bestPressure,
        pressureTimer,
        eruptionPenalityDisplay,
        display: () => (
            <>
                <div id="pressure-tab">
                    <div class="w-[312px]">
                        <div
                            data-augmented-ui="border tl-clip-y tr-round-inset"
                            class="border-(--outline)"
                        >
                            <div class="p-4">
                                <h3>{pressure.displayName}</h3>
                                <h6 class="font-semibold">
                                    {format(pressureChance.value)}% chance for pressure to build by
                                    x{format(pressureGainMultiplier.value)} every{" "}
                                    {format(pressureTimerMax.value)} seconds.
                                </h6>
                            </div>
                        </div>

                        <div
                            data-augmented-ui="border bl-clip"
                            class="border-(--outline)"
                            id="pressure-timer-bar"
                        >
                            {render(pressureTimerBar)}
                        </div>

                        <div data-augmented-ui="border br-clip" class="border-(--outline)">
                            {render(pressureBar)}
                        </div>
                    </div>
                </div>
            </>
        ),
        pressureCapped
    };
});

export default pressureLayer;
