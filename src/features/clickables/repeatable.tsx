import Clickable from "features/clickables/Clickable.vue";
import { findFeatures, Visibility } from "features/feature";
import { DefaultValue, Persistent, persistent } from "game/persistence";
import {
    createVisibilityRequirement,
    displayRequirements,
    maxRequirementsMet,
    payRequirements,
    Requirements,
    requirementsMet
} from "game/requirements";
import type { DecimalSource } from "util/bignum";
import Decimal, { formatWhole } from "util/bignum";
import { MaybeGetter, processGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { isJSXElement, render, Renderable, VueFeature, vueFeatureMixin } from "util/vue";
import type { CSSProperties, MaybeRef, MaybeRefOrGetter, Ref } from "vue";
import { computed, toRef, unref, watch } from "vue";
import { ClickableOptions } from "./clickable";
import { Layer } from "game/layers";
import { isFunction } from "util/common";

/** A symbol used to identify {@link Repeatable} features. */
export const RepeatableType = Symbol("Repeatable");

/** An object that configures a {@link Repeatable}. */
export interface RepeatableOptions extends ClickableOptions {
    /** The requirement(s) to increase this repeatable. */
    requirements: Requirements;
    /** The maximum amount obtainable for this repeatable. */
    limit?: MaybeRefOrGetter<DecimalSource>;
    /** The initial amount this repeatable has on a new save / after reset. */
    initialAmount?: MaybeRefOrGetter<DecimalSource>;
    /** The display to use for this repeatable. */
    display?:
        | MaybeGetter<Renderable>
        | {
              /** A header to appear at the top of the display. */
              title?: MaybeGetter<Renderable>;
              /** The main text that appears in the display. */
              description: MaybeGetter<Renderable>;
              /** A description of the current effect of this repeatable, based off its amount. */
              effectDisplay?: MaybeGetter<Renderable>;
              /** Whether or not to show the current amount of this repeatable at the bottom of the display. */
              showAmount?: boolean;
          };
    clickableStyle?: MaybeRef<CSSProperties>;
    clickableDataAttributes?: MaybeRef<Record<string, string>>;
}

/** An object that represents a feature with multiple "levels" with scaling requirements. */
export interface Repeatable extends VueFeature {
    /** The requirement(s) to increase this repeatable. */
    requirements: Requirements;
    /** The maximum amount obtainable for this repeatable. */
    limit: MaybeRef<DecimalSource>;
    /** The initial amount this repeatable has on a new save / after reset. */
    initialAmount?: MaybeRef<DecimalSource>;
    /** The display to use for this repeatable. */
    display?: MaybeGetter<Renderable>;
    /** Whether or not the repeatable may be clicked. */
    canClick: Ref<boolean>;
    /** A function that is called when the repeatable is clicked. */
    onClick: (event?: MouseEvent | TouchEvent) => void;
    purchase: (spend: boolean) => void;
    /** The current amount this repeatable has. */
    amount: Persistent<DecimalSource>;
    /** Whether or not this repeatable's amount is at it's limit. */
    maxed: Ref<boolean>;
    /** How much amount can be increased by, or 1 if unclickable. **/
    amountToIncrease: Ref<DecimalSource>;
    /** A symbol that helps identify features of the same type. */
    type: typeof RepeatableType;
    clickableDataAttributes?: MaybeRef<Record<string, string>>;
}

/**
 * Lazily creates a repeatable with the given options.
 * @param optionsFunc Repeatable options.
 */
export function createRepeatable<T extends RepeatableOptions>(optionsFunc: () => T) {
    const amount = persistent<DecimalSource>(0);
    return createLazyProxy(() => {
        const options = optionsFunc();
        const {
            requirements: _requirements,
            display: _display,
            limit,
            onClick,
            initialAmount,
            clickableStyle,
            clickableDataAttributes,
            ...props
        } = options;

        if (options.classes == null) {
            options.classes = computed(() => ({
                bought: unref(repeatable.maxed),
                repeatable: true
            }));
        } else {
            const classes = processGetter(options.classes);
            options.classes = computed(() => ({
                ...unref(classes),
                bought: unref(repeatable.maxed),
                repeatable: true
            }));
        }
        const vueFeature = vueFeatureMixin("repeatable", options, () => (
            <Clickable
                style={repeatable.clickableStyle}
                canClick={repeatable.canClick}
                onClick={repeatable.onClick}
                onHold={repeatable.onClick}
                display={repeatable.display}
                dataAttributes={repeatable.clickableDataAttributes}
            />
        ));

        const limitRequirement = {
            requirementMet: computed(
                (): DecimalSource => Decimal.sub(unref(repeatable.limit), unref(amount))
            ),
            requiresPay: false,
            visibility: Visibility.None,
            canMaximize: true
        } satisfies Requirements;
        const requirements: Requirements = [
            ...(Array.isArray(_requirements) ? _requirements : [_requirements]),
            limitRequirement
        ];
        if (vueFeature.visibility != null) {
            requirements.push(createVisibilityRequirement(vueFeature.visibility));
        }

        let display;
        if (typeof _display === "object" && !isJSXElement(_display)) {
            const { title, description, effectDisplay, showAmount } = _display;

            display = () => (
                <span class="repeatable-content">
                    {title == null ? null : (
                        <div>
                            {render(title, el => (
                                <h3 class="title">{el}</h3>
                            ))}
                        </div>
                    )}
                    <span class="description">{render(description)}</span>
                    {showAmount === false ? null : (
                        <div class="amount">
                            <br />
                            <>Amount: {formatWhole(unref(amount))}</>
                            {Decimal.isFinite(unref(repeatable.limit)) ? (
                                <> / {formatWhole(unref(repeatable.limit))}</>
                            ) : undefined}
                        </div>
                    )}
                    {effectDisplay == null ? null : (
                        <div class="effect">
                            <br />
                            Currently: {render(effectDisplay)}
                        </div>
                    )}
                    {unref(repeatable.maxed) ? null : (
                        <div class="requirements">
                            <br />
                            {displayRequirements(requirements, unref(repeatable.amountToIncrease))}
                        </div>
                    )}
                </span>
            );
        } else if (_display != null) {
            display = _display;
        }

        amount[DefaultValue] = 0;

        const repeatable = {
            type: RepeatableType,
            ...(props as Omit<typeof props, keyof VueFeature | keyof RepeatableOptions>),
            ...vueFeature,
            amount,
            requirements,
            initialAmount: processGetter(initialAmount),
            clickableStyle,
            clickableDataAttributes,
            limit: processGetter(limit) ?? Decimal.dInf,
            classes: computed(() => {
                const currClasses = unref(vueFeature.classes) || {};
                if (unref(repeatable.maxed)) {
                    currClasses.bought = true;
                }
                return currClasses;
            }),
            maxed: computed((): boolean => Decimal.gte(unref(amount), unref(repeatable.limit))),
            canClick: computed(() => requirementsMet(requirements)),
            amountToIncrease: computed(() => Decimal.clampMin(maxRequirementsMet(requirements), 1)),
            purchase(spend: boolean = true) {
                if (!unref(repeatable.canClick)) {
                    return;
                }
                const purchaseAmount = unref(repeatable.amountToIncrease) ?? 1;
                if (spend) {
                    payRequirements(requirements, purchaseAmount);
                }
                amount.value = Decimal.add(unref(amount), purchaseAmount);
            },
            onClick(event?: MouseEvent | TouchEvent) {
                if (!unref(repeatable.canClick)) {
                    return;
                }
                repeatable.purchase();
                onClick?.(event);
            },
            ensureHasMinimum() {
                const minimimum = unref(repeatable.initialAmount) ?? Decimal.dZero;

                if (Decimal.gte(amount.value, minimimum)) {
                    return;
                }

                amount.value = Decimal.min(minimimum, unref(repeatable.limit));
            },
            display
        } satisfies Repeatable;

        watch(amount, () => repeatable.ensureHasMinimum());

        watch(toRef(repeatable.initialAmount), () => repeatable.ensureHasMinimum());
        repeatable.ensureHasMinimum();

        return repeatable;
    });
}

export function setupAutoPurchaseRepeatable(
    layer: Layer,
    autoActive: MaybeRefOrGetter<boolean>,
    repeatables: Repeatable[] = [],
    limit?: MaybeRefOrGetter<number>,
    spend: boolean = true
) {
    repeatables =
        repeatables.length === 0
            ? (findFeatures(layer, RepeatableType) as Repeatable[])
            : repeatables;
    const isAutoActive: MaybeRef<boolean> = isFunction(autoActive)
        ? computed(autoActive)
        : autoActive;

    const buyLimit: DecimalSource =
        unref(limit) === undefined ? Number.MAX_SAFE_INTEGER : unref(processGetter(limit!));

    layer.on("update", () => {
        if (unref(isAutoActive)) {
            repeatables.forEach(repeatable => {
                if (Decimal.gte(repeatable.amount.value, buyLimit)) {
                    return;
                }

                repeatable.purchase(spend);
            });
        }
    });
}
