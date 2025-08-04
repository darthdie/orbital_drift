import "../../utils";
import { createRepeatable } from "features/clickables/repeatable";
import { createReset } from "features/reset";
import Decimal from "util/break_eternity";
import { describe, expect, test } from "vitest";
import { nextTick, ref } from "vue";

describe("Repeatables initial amount", () => {
    test("It resets to zero when not set", () => {
        const repeatable = createRepeatable(() => ({
            requirements: []
        }));

        const reset = createReset(() => ({
            thingsToReset: (): Record<string, unknown>[] => [repeatable]
        }));

        repeatable.amount.value = 100;
        reset.reset();
        expect(repeatable.amount.value).toBe(0);
    });

    test("it resets to simple initial amount", async () => {
        const repeatable = createRepeatable(() => ({
            requirements: [],
            initialAmount: 50
        }));

        const reset = createReset(() => ({
            thingsToReset: (): Record<string, unknown>[] => [repeatable]
        }));

        expect(Decimal.eq(repeatable.amount.value, 50)).toBe(true);

        repeatable.amount.value = 100;
        await nextTick();

        reset.reset();
        await nextTick();

        expect(Decimal.eq(repeatable.amount.value, 50)).toBe(true);
    });

    test("it resets to computed amount", async () => {
        const repeatable = createRepeatable(() => ({
            requirements: [],
            initialAmount: () => 50
        }));

        const reset = createReset(() => ({
            thingsToReset: (): Record<string, unknown>[] => [repeatable]
        }));

        expect(Decimal.eq(repeatable.amount.value, 50)).toBe(true);

        repeatable.amount.value = 100;
        await nextTick();

        reset.reset();
        await nextTick();

        expect(Decimal.eq(repeatable.amount.value, 50)).toBe(true);
    });

    test("It resets using dynamic amount", async () => {
        const isCool = ref(false);
        const repeatable = createRepeatable(() => ({
            requirements: [],
            initialAmount: () => (isCool.value ? 69 : 65)
        }));

        const reset = createReset(() => ({
            thingsToReset: (): Record<string, unknown>[] => [repeatable]
        }));

        expect(Decimal.eq(repeatable.amount.value, 65)).toBe(true);

        repeatable.amount.value = 100;
        await nextTick();

        reset.reset();
        await nextTick();

        expect(Decimal.eq(repeatable.amount.value, 65)).toBe(true);

        isCool.value = true;
        reset.reset();
        await nextTick();

        expect(Decimal.eq(repeatable.amount.value, 69)).toBe(true);
    });

    test("It updates current amount when inital amount changes", async () => {
        const isCool = ref(false);
        const repeatable = createRepeatable(() => ({
            requirements: [],
            initialAmount: () => (isCool.value ? 69 : 65)
        }));

        await nextTick();
        isCool.value = true;
        await nextTick();

        expect(Decimal.eq(repeatable.amount.value, 69)).toBe(true);
    });
});
