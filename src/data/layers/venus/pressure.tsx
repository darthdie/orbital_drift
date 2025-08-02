import { format } from "util/break_eternity";
import { createResource, trackBest } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { render, renderGroupedObjects } from "util/vue";
import { createLayer } from "game/layers";
import "./pressure.css";
import lavaLayer from "./lava";
import { createUpgrade } from "features/clickables/upgrade";
import { createCostRequirement } from "game/requirements";
import Formula from "game/formulas/formulas";
import silicateLayer from "./silicate";
import { createReset } from "features/reset";
import tephraLayer from "./tephra";
import Section from "data/components/Section.vue";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");
    const bestPressure = trackBest(pressure);

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        (): DecimalSource =>
            Formula.variable(15)
                .times(pressureSoftcapDivisor)
                .div(silicateLayer.mafic.effect.value)
                .div(tephraLayer.greenIsNotACreativeColorEffect.value)
                .evaluate()
        // Decimal.times(15, pressureSoftcapDivisor.evaluate()).div(lavaLayer.maficEffect.value)
        // Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
        //     .div(pressureIntervalBuyableEffect.value)
        //     .div(lavaIsFloorEffect.value)
        //     .div(maficEffect.value)
        //     .div(hotPotEffect.value)
        //     .pow(tephraPressureIntervalEffect.value)
    );

    const pressureChance = computed(
        (): Decimal =>
            Decimal.add(10, silicateLayer.felsic.effect.value).times(
                tephraLayer.gamblingManEffect.value
            )
        // Decimal.add(10, pressureChanceBuyableEffect.apply(0))
        //     .add(floorIsLavaEffect.value)
        //     .add(bubblingEffect.value)
        //     .pow(tephraPressureChanceEffect.value)
    );
    const pressureGainMultiplier = computed(
        (): Decimal => {
            return Decimal.times(1.3, silicateLayer.intermediate.effect.value).times(
                tephraLayer.blobTheBuilderEffect.value
            );
        }
        // Decimal.times(1.3, pressureMultBuyableEffect.value)
        //     .times(riceCookerEffect.value)
        //     .pow(tephraPressureGainEffect.value)
    );

    const pressureSoftcapDivisor = Formula.if(
        Formula.variable(pressure),
        () => Decimal.lt(pressure.value, 1e25),
        f => f.min(1),
        f => {
            // Decimal.log10(1e10).div(5).times(.01).add(1)  -> 1.02 (1.02 * 15) -> 15.3
            // Decimal.log10(1e10).div(5).times(.1).add(1) -> 1.2 (1.2 * 15) -> 18
            return f.sub(1e25).add(10).log10().cbrt().clampMin(1);
        }
    );

    const pressureMax = computed((): DecimalSource => {
        const pow = Decimal.pow(2, lavaLayer.eruptions.value);
        return Decimal.fromNumber(1e25).pow(pow).pow(tephraLayer.youreGonnaMakeMeBlowEffect.value);
    });
    const pressureCapped = computed(() => Decimal.gte(pressure.value, pressureMax.value));

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
            return Decimal.add(pressure.value, 1)
                .log10()
                .cbrt()
                .times(underPressureEffect.value)
                .times(redHotEffect.value)
                .clampMin(1);
            // return Decimal.fromNumber(2);
        }

        return Decimal.dOne;
    });

    const underPressureEffect = computed(() => {
        if (upgrades.underPressure.bought.value) {
            return Decimal.fromNumber(2);
        }

        return Decimal.dOne;
    });

    const redHotEffect = computed(() => {
        if (upgrades.redHot.bought.value) {
            return Decimal.log(pressure.value, 1e15).sqrt().clampMin(1);
        }

        return Decimal.dOne;
    });

    // Eventually, upgrades to reduce softcap.
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
                description: "Increase Effusive Eruption based on Pressure.",
                effectDisplay: () => `x${format(lavaFlowffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        underPressure: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e6
            })),
            display: {
                title: "Under Pressure",
                description: "Double the effect of 'Lava Flow'",
                effectDisplay: () => `x${format(underPressureEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        })),
        redHot: createUpgrade(() => ({
            requirements: createCostRequirement(() => ({
                resource: pressure,
                cost: 1e15
            })),
            display: {
                title: "Red Hot",
                description: "Increase the effect of 'Lava Flow' based Pressure.",
                effectDisplay: () => `x${format(redHotEffect.value)}`
            },
            classes: { "sd-upgrade": true },
            clickableDataAttributes: {
                "augmented-ui": "border tr-clip"
            }
        }))
        // Uncap pressure chance, and each /100% has a chance to proc?
    };

    const eruptionPressureDivisor = 0.6;
    const eruptionPenalityDisplay = computed(() => Decimal.add(eruptionPressureDivisor, 1));

    const showNotification = computed(() => {
        return unlocked.value && Object.values(upgrades).some(u => u.canPurchase.value);
    });

    const explosiveEruptionReset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [pressureLayer]
    }));

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
        pressureMax,
        lavaFlowffect,
        pressureCapped,
        upgrades,
        showNotification,
        explosiveEruptionReset,
        display: () => (
            <>
                <div id="pressure-tab">
                    <Section header="Volcano">
                        <div class="w-[312px] mb-2">
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

                        <h5>Softcap Divisor: {format(pressureSoftcapDivisor.evaluate())}</h5>
                    </Section>

                    <Section header="Upgrades">{renderGroupedObjects(upgrades, 4)}</Section>
                </div>
            </>
        )
    };
});

export default pressureLayer;
