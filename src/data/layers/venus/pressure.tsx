import { format } from "util/break_eternity";
import { createResource, trackBest } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { renderGroupedObjects } from "util/vue";
import { createLayer } from "game/layers";
import "./pressure.css";
import lavaLayer from "./lava";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");
    const bestPressure = trackBest(pressure);

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        () => Formula.variable(15).times(pressureSoftcapDivisor).div(lavaLayer.mafic.effect.value).evaluate()
            // Decimal.times(15, pressureSoftcapDivisor.evaluate()).div(lavaLayer.maficEffect.value)
        // Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
        //     .div(pressureIntervalBuyableEffect.value)
        //     .div(lavaIsFloorEffect.value)
        //     .div(maficEffect.value)
        //     .div(hotPotEffect.value)
        //     .pow(tephraPressureIntervalEffect.value)
    );
    const pressureChance = computed(
        () => Decimal.add(10, lavaLayer.felsic.effect.value)
        // Decimal.add(10, pressureChanceBuyableEffect.apply(0))
        //     .add(floorIsLavaEffect.value)
        //     .add(bubblingEffect.value)
        //     .pow(tephraPressureChanceEffect.value)
    );
    const pressureGainMultiplier = computed(
        () => Decimal.times(1.3, lavaLayer.intermediate.effect.value)
        // Decimal.times(1.3, pressureMultBuyableEffect.value)
        //     .times(riceCookerEffect.value)
        //     .pow(tephraPressureGainEffect.value)
    );

    const pressureSoftcapDivisor = Formula.if(
        Formula.variable(pressure),
        () => Decimal.lt(pressure.value, 1e25),
        f => f.min(1),
        f => f.step(1e25, f => f.log10().cbrt())
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

    const lavaFlowffect = computed(() => {
        if (upgrades.lavaFlow.bought.value) {
            return Decimal.add(pressure.value, 1).log10().cbrt().clampMin(1);
            // return Decimal.fromNumber(2);
        }

        return Decimal.dOne;
    });

    const upgrades = {
        effusiveEruption: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 5
            })),
            display: {
                title: "Effusive Eruption",
                description: "Unlock Lava & Passive Lava gain.",
                effectDisplay: () => `${format(lavaLayer.passiveLavaGain.value)}/s`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        lavaFlow: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 100
            })),
            display: {
                title: "Lava Flow",
                description: "Increase Lava gain based on Pressure.",
                effectDisplay: () => `x${format(lavaFlowffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
    };

    const eruptionPressureDivisor = 0.6;
    const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1));

    return {
        pressure,
        bestPressure,
        pressureTimer,
        eruptionPenalityDisplay,
        pressureBar,
        pressureTimerMax,
        pressureChance,
        pressureGainMultiplier,
        pressureTimerBar,
        pressureSoftcapDivisor,
        lavaFlowffect,
        display: () => (
            <>
                <div id="pressure-tab">
                    <div class="mb-2">
                        <h3>Upgrades</h3>
                    </div>
                    <div class="mb-4">
                        <hr class="section-divider" />
                    </div>

                    {renderGroupedObjects(upgrades, 4)}
                </div>
            </>
        ),
        pressureCapped,
        upgrades
    };
});

export default pressureLayer;
