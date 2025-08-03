import Decimal, { DecimalSource } from "util/bignum";

export function fibonacciCostFormula(amount: DecimalSource): DecimalSource {
    if (Decimal.lte(amount, 1)) {
        return 1;
    }

    let a = 1,
        b = 1;
    for (let i = 2; Decimal.lte(i, amount); i++) {
        [a, b] = [b, a + b];
    }

    return b;
};
