import { format } from "util/break_eternity";
import Spacer from "components/layout/Spacer.vue";
import { createResource, Resource } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { computed, ComputedRef, Ref, unref } from "vue";
import { createBar } from "features/bars/bar";
import { Direction } from "util/common";
import { render } from "util/vue";
import { createLayer } from "game/layers";
import { createClickable } from "features/clickables/clickable";

const random = () => Math.random() * 100;

const id = "VP";
const pressureLayer = createLayer(id, baseLayer => {
    const pressure = createResource<DecimalSource>(1, "Pressure");

    const lavaCapIncreases = createResource<DecimalSource>(0);
    const lava = createResource<DecimalSource>(0, "Lava");
    const lavaCap = computed(() =>
        Decimal.fromNumber(250).times(Decimal.times(lavaCapIncreases.value, 2).clampMin(1))
    );

    const pressureTimer = createResource<DecimalSource>(0);
    const pressureTimerMax = computed(
        () => Decimal.fromNumber(15)
        // Decimal.times(15, Decimal.times(eruptionPressureDivisor, eruptions.value).add(1))
        //     .div(pressureIntervalBuyableEffect.value)
        //     .div(lavaIsFloorEffect.value)
        //     .div(maficEffect.value)
        //     .div(hotPotEffect.value)
        //     .pow(tephraPressureIntervalEffect.value)
    );
    const pressureChance = computed(
        () => Decimal.fromNumber(10)
        // Decimal.add(10, pressureChanceBuyableEffect.apply(0))
        //     .add(floorIsLavaEffect.value)
        //     .add(bubblingEffect.value)
        //     .pow(tephraPressureChanceEffect.value)
    );
    const pressureGainMultiplier = computed(
        () => Decimal.fromNumber(1.3)
        // Decimal.times(1.3, pressureMultBuyableEffect.value)
        //     .times(riceCookerEffect.value)
        //     .pow(tephraPressureGainEffect.value)
    );
    const eruptions = createResource<DecimalSource>(0);
    const pressureMax = computed(() => {
        const pow = Decimal.pow(2, eruptions.value);
        return Decimal.fromNumber(1e25).pow(pow);
    });
    const pressureCapped = computed(() => Decimal.eq(pressure.value, pressureMax.value));

    const pressureBar = createBar(() => ({
        direction: Direction.Right,
        height: 14,
        width: "100%",
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline-lighter)"
        },
        progress: () => Decimal.div(Decimal.ln(pressure.value), Decimal.ln(pressureMax.value))
    }));

    const pressureTimerBar = createBar(() => ({
        direction: Direction.Right,
        height: 24,
        width: "100%",
        progress: () => Decimal.div(pressureTimer.value, pressureTimerMax.value),
        display: () => format(Decimal.sub(pressureTimerMax.value, pressureTimer.value)),
        textStyle: {
            color: "#ad8d54"
        },
        style: {
            overflow: "hidden"
        },
        borderStyle: {
            borderRadius: "0",
            borderColor: "var(--outline-lighter)"
        },
    }));

    const unlocked = computed(() => true);

    baseLayer.on("preUpdate", diff => {
        if (!unlocked.value || pressureCapped.value) {
            return;
        }

        if (pressureCapped.value) {
            pressureTimer.value = Decimal.dZero;
            return;
        }

        pressureTimer.value = Decimal.add(pressureTimer.value, Decimal.times(1, diff));

        if (pressureTimer.value.lt(pressureTimerMax.value)) {
            return;
        }

        pressureTimer.value = 0;

        if (Decimal.gte(pressureChance.value, random())) {
            const buildAmount = pressureGainMultiplier.value;

            // if (pressureUpgrades.extraKick.bought.value) {
            //     if (Decimal.gte(10, random())) {
            //         buildAmount = buildAmount.times(5);
            //         console.log("KICK");
            //     }
            // }

            pressure.value = Decimal.multiply(
                Decimal.clampMin(pressure.value, 1),
                buildAmount
            ).clampMax(pressureMax.value);
        }
    });

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

    const createResourceDisplay = (
        resource: Resource,
        resourceCap: ComputedRef<DecimalSource>,
        capIncreases: Ref<DecimalSource>
    ) => {
        const increaseCap = createClickable(() => ({
            canClick: () => Decimal.eq(resource.value, resourceCap.value),
            classes: { "squashed-clickable": true, flex: true },
            display: {
                title: "Increase Cap",
                description: <>Reset {resource.displayName} to double cap.</>
            },
            onClick: () => {
                if (unref(increaseCap.canClick) === false) {
                    return;
                }

                resource.value = 0;
                capIncreases.value = Decimal.add(capIncreases.value, 1);
            }
        }));

        const bar = createBar(() => ({
            direction: Direction.Right,
            height: 18,
            width: "100%",
            style: {
                overflow: "hidden"
            },
            borderStyle: {
                borderRadius: "0"
            },
            progress: () => {
                if (Decimal.gt(resourceCap.value, 1e10)) {
                    return Decimal.div(Decimal.ln(resource.value), Decimal.ln(resourceCap.value));
                }

                return Decimal.div(resource.value, resourceCap.value);
            }
        }));

        return computed(() => (
            <div class="cappable-resource-container" data-augmented-ui="border tl-2-clip-x br-round-inset">
                <h3 class="title">{resource.displayName}</h3>
                <div data-augmented-ui="border tl-clip">
                    {render(bar)}
                </div>
                <div class="resource-display">
                    <h4>
                        {format(resource.value)}/{format(resourceCap.value)}
                    </h4>
                </div>
                <div class="increase-cap-action">{render(increaseCap)}</div>
            </div>
        ));
    };

    const lavaDisplay = createResourceDisplay(lava, lavaCap, lavaCapIncreases);

    const display = (
        <>
            <h3>{pressure.displayName}</h3>
            <h4>
                {format(pressure.value)}/{format(pressureMax.value)}
            </h4>
            <Spacer height="8px" />

            <div
                data-augmented-ui="border br-clip"
                style="border-color: var(--outline); width: 256px"
            >
                {render(pressureBar)}
            </div>
            <Spacer />

            <div
                data-augmented-ui="border bl-clip"
                style="border-color: var(--outline); width: 128px"
            >
                {render(pressureTimerBar)}
            </div>
            <Spacer />

            <h6>
                {format(pressureChance.value)}% chance for pressure to build by x
                {format(pressureGainMultiplier.value)} every {format(pressureTimerMax.value)}{" "}
                seconds.
            </h6>
            <Spacer />

            <div class="flex">
                {render(lavaDisplay.value)}
                <div>Felsic</div>
                <div>Intermediate</div>
                <div>Mafic</div>
            </div>
        </>
    );

    return {
        pressure,
        pressureTimer,
        eruptions,
        lava,
        lavaCapIncreases,
        display: () => display,
        pressureCapped
    };
});

export default pressureLayer;
