import { createBar } from "features/bars/bar";
import { createClickable } from "features/clickables/clickable";
import { createResource, Resource } from "features/resources/resource";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/bignum";
import { Direction } from "util/common";
import { processGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { VueFeature, VueFeatureOptions, render, vueFeatureMixin } from "util/vue";
import { ComputedRef, MaybeRefOrGetter, computed, unref } from "vue";

export interface LavaSubtype extends VueFeature {
    resource: Resource;
    capIncreases: Resource;
    cap: ComputedRef<DecimalSource>;
    maxEffect: ComputedRef<DecimalSource>;
    effect: ComputedRef<DecimalSource>;
    effectDisplay: ComputedRef<DecimalSource>;
    showNotification: ComputedRef<boolean>;
}

export interface LavaSubtypeOptions extends VueFeatureOptions {
    startingCap: number;
    maxEffectDivisor: number;
    effectDisplayBuilder: (
        effect: ComputedRef<DecimalSource>,
        maxEffect: ComputedRef<DecimalSource>
    ) => string;
    augmentedUi: MaybeRefOrGetter<string>;
    effectDisplayAugmentedUi: MaybeRefOrGetter<string>;
    effectDisplayTitle: MaybeRefOrGetter<string>;
    minimumEffect?: MaybeRefOrGetter<DecimalSource>;
}

export function createLavaSubtype<T extends LavaSubtypeOptions>(
    name: string,
    optionsFunc: () => T
) {
    const resource = createResource<DecimalSource>(0, name);
    const capIncreases = createResource<DecimalSource>(0);

    return createLazyProxy(() => {
        const options = optionsFunc();
        const {
            startingCap,
            maxEffectDivisor,
            effectDisplayBuilder,
            effectDisplayTitle,
            augmentedUi,
            effectDisplayAugmentedUi,
            minimumEffect: _minimumEffect,
            ...props
        } = options;

        const cap = computed(() =>
            Decimal.fromNumber(startingCap).times(Decimal.times(capIncreases.value, 2).clampMin(1))
        );
        const maxEffect = computed(() => Decimal.div(cap.value, maxEffectDivisor));
        const minimumEffect = processGetter(_minimumEffect) ?? Decimal.dZero;
        const effect = computed(() =>
            calculateLavaEffect(resource.value, cap.value, unref(minimumEffect), maxEffect.value)
        );

        const effectDisplay = computed(() => effectDisplayBuilder(effect, maxEffect));

        const bar = createBar(() => ({
            direction: Direction.Up,
            progress: () => Decimal.div(resource.value, cap.value),
            display: () => (
                <>
                    <h4 class="text-venus-500 text-shadow-lg">
                        {format(resource.value)}/{format(cap.value)}
                    </h4>
                </>
            ),
            width: "100%",
            height: "128px",
            borderStyle: {
                border: "0",
                borderRadius: "0"
            }
        }));

        const increaseCap = createClickable(() => ({
            canClick: () => Decimal.eq(resource.value, cap.value),
            classes: { "squashed-clickable": true, flex: true },
            display: {
                title: "Increase Cap",
                description: <>Reset {resource.displayName} to double cap & max effect.</>
            },
            onClick: () => {
                if (unref(increaseCap.canClick) === false) {
                    return;
                }

                resource.value = 0;
                capIncreases.value = Decimal.add(capIncreases.value, 1);
            }
        }));

        const id = `${resource.displayName.toLocaleLowerCase()}-display`;

        if (options.classes == null) {
            options.classes = computed(() => ({
                "m-0": true,
                "lava-subtype": true
            }));
        } else {
            const classes = processGetter(options.classes);
            options.classes = computed(() => ({
                ...unref(classes),
                "m-0": true,
                "lava-subtype": true
            }));
        }

        const showNotification = computed(() => unref(increaseCap.canClick) === true);

        const lavaSubtype = {
            resource,
            capIncreases,
            cap,
            maxEffect,
            effect,
            effectDisplay,
            showNotification,
            augmentedUi: processGetter(augmentedUi),
            effectDisplayAugmentedUi: processGetter(effectDisplayAugmentedUi),
            effectDisplayTitle: processGetter(effectDisplayTitle),
            ...(props as Omit<typeof props, keyof VueFeature | keyof LavaSubtypeOptions>),
            ...vueFeatureMixin("lavaSubtype", options, () => (
                <>
                    <div data-augmented-ui={lavaSubtype.augmentedUi} class="border-0" id={id}>
                        <div class="py-2">
                            <h3>{resource.displayName}</h3>
                        </div>
                        <div
                            data-augmented-ui={lavaSubtype.effectDisplayAugmentedUi}
                            class="mt-1 py-2"
                        >
                            <h5>{lavaSubtype.effectDisplayTitle}</h5>
                            <h5 class="font-semibold">{effectDisplay.value}</h5>
                        </div>
                        <div>{render(bar)}</div>
                        {render(increaseCap)}
                    </div>
                </>
            ))
        } satisfies LavaSubtype;

        return lavaSubtype;
    });
}

export function calculateLavaEffect(
    resource: DecimalSource,
    cap: DecimalSource,
    minEffect: DecimalSource,
    maxEffect: DecimalSource,
    exponent: number = 1
) {
    const percent = Decimal.max(0, Decimal.div(resource, cap));
    const curved = Decimal.pow(percent, exponent);
    const cal = Decimal.sub(maxEffect, minEffect).times(curved);
    return Decimal.add(minEffect, cal);
}
