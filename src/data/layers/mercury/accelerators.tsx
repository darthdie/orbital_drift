import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import { createBar } from "features/bars/bar";
import { createRepeatable } from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { CostRequirementOptions, createCostRequirement, displayRequirements } from "game/requirements";
import { Direction } from "util/common";
import { joinJSX, render, renderRow } from "util/vue";
import dustLayer from './dust';
import Decimal, { DecimalSource } from "lib/break_eternity";
import { createResource } from "features/resources/resource";
import { format } from "util/bignum";
import Formula from "game/formulas/formulas";
import { computed, unref } from "vue";
import { createMultiplicativeModifier, createSequentialModifier, MultiplicativeModifierOptions } from "game/modifiers";
import { createTabFamily, TabFamilyOptions } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { chunkArray, createResetButton } from "data/common";
import { createUpgrade } from "features/clickables/upgrade";

const id = "Ma";
const layer = createLayer(id, (baseLayer: BaseLayer) => {
  const name = "Mercury";
  const color = "#8c8c94";

  const sharedBarSettings = {
    direction: Direction.Right,
    height: 18,
    width: 256
  };

  const dustAccelerator = {
    timer: createResource<DecimalSource>(0),
    resource: createResource<DecimalSource>(0, "Dust Accelerators"),

    gainComputed: computed((): Decimal => {
      return Decimal.times(1, dustAccelerator.dustAcceleratorGainModifier.apply(1));
    }),

    bar: createBar(() => ({
      ...sharedBarSettings,
      progress: (): Decimal => Decimal.div(dustAccelerator.timer.value, dustAccelerator.timerMax.value)
    })),

    intervalBuyable: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(dustLayer.mercurialDust),
        cost: () => Formula.variable(dustAccelerator.intervalBuyable.amount.value).pow_base(5.3).times(5e5).evaluate(),
        requiresPay: false,
      })),
      clickableStyle: {
        minHeight: '0',
        width: 'fit-content',
        paddingLeft: '12px',
        paddingRight: '12px'
      },
      display: () => (<>
        <div>
          Decrease timer interval<br />
          Currently: {format(dustAccelerator.dustAcceleratorTimerMaxEffect.value)}
          {displayRequirements(dustAccelerator.intervalBuyable.requirements, unref(dustAccelerator.intervalBuyable.amountToIncrease))}
        </div>
      </>)
    })),

    timerMax: computed((): Decimal => {
      return Decimal.div(120, dustAccelerator.dustAcceleratorTimerMaxEffect.value).div(dustAccelerator.dustUpgradeTimerMaxEffect.value);
    }),

    isAtLeastLevelOne: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 1)),
    isAtLeastLevelTwo: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 2)),
    isAtLeastLevelThree: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 3)),

    dustGainMultiplierModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: () => Decimal.gt(dustAccelerator.resource.value, 0),
        multiplier: () => Decimal.add(dustAccelerator.resource.value, 1).pow(0.25).clampMin(1),
        description: "Dust Accelerators"
      }))
    ]),

    dustAcceleratorGainModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: () => dustAccelerator.isAtLeastLevelOne.value,
        multiplier: () => Decimal.add(dustAccelerator.resource.value, 1).pow(0.2).clampMin(1)
      }))
    ]),

    dustAcceleratorDustRaiseEffect: computed((): Decimal => {
      if (dustAccelerator.isAtLeastLevelTwo.value) {
        return Decimal.add(dustAccelerator.resource.value, 1).slog().pow(0.1).clampMin(1);
      }

      return Decimal.dOne;
    }),

    dustAcceleratorsGainComputed: computed((): Decimal => {
      return Decimal.times(1, dustAccelerator.dustAcceleratorGainModifier.apply(1));
    }),

    dustUpgradeTimerMaxEffect: computed((): Decimal => {
      if (dustAccelerator.upgrades.second.bought.value) {
        return Decimal.add(dustAccelerator.resource.value, 1).log10().pow(0.5).clampMin(1);
      }

      return Decimal.dOne;
    }),

    dustAcceleratorTimerMaxEffect: computed((): Decimal => {
      if (Decimal.gt(dustAccelerator.intervalBuyable.amount.value, 0)) {
        return Decimal.mul(dustAccelerator.intervalBuyable.amount.value, 0.025).add(1).clampMin(1);
      }

      return Decimal.dOne;
    }),

    dustBuyableCapEffect: computed((): Decimal => {
      return Decimal.add(dustAccelerator.resource.value, 1).log2().sqrt().floor().clampMin(1);
    }),

    levelBuyable: createRepeatable(() => ({
      limit: 3,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        requiresPay: false,
        resource: noPersist(dustAccelerator.resource),
        cost: Formula.variable(dustAccelerator.levelBuyable.amount).pow_base(5).times(100)
      })),
      display: {
        title: "Refine",
        description: "Reset Dust Accelerators to unlock a new effect."
      },
      onClick: () => {
        dustAccelerator.resource.value = 0;
      }
    })),

    upgrades: {
      first: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(dustAccelerator.resource),
          cost: Decimal.fromNumber(10)
        })),
        display: {
          title: "Speed Dust",
          description: "Unlock more Dust upgrades"
        }
      })),

      second: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(dustAccelerator.resource),
          cost: Decimal.fromNumber(25)
        })),
        display: {
          title: "Accelerating the Accelerator",
          description: "Decrease timer interval based on accelerators",
          effectDisplay: (): string => `/${format(dustAccelerator.dustUpgradeTimerMaxEffect.value)}`
        }
      })),

      chunksUnlock: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(dustAccelerator.resource),
          cost: Decimal.fromNumber(100)
        })),
        display: {
          title: "je ne sais chunks",
          description: "Unlock Chunk Accelerators",
        }
      }))
    },

    tick: (diff: number) => {
      dustAccelerator.timer.value = Decimal.add(
        dustAccelerator.timer.value,
        Decimal.times(1, diff)
      );

      if (Decimal.gte(dustAccelerator.timer.value, dustAccelerator.timerMax.value)) {
        dustAccelerator.timer.value = 0;
        dustAccelerator.resource.value = Decimal.add(dustAccelerator.resource.value, dustAccelerator.gainComputed.value);
      }
    },

    levelEffectsDisplay: () => {
      const effects = [
        <h5>A x{format(dustAccelerator.dustGainMultiplierModifier.apply(1))} boost to Dust gain.</h5>
      ];

      if (dustAccelerator.isAtLeastLevelOne.value) {
        effects.push(<h5>A x{format(dustAccelerator.dustAcceleratorGainModifier.apply(1))} boost to accelerators gain.</h5>)
      }

      if (dustAccelerator.isAtLeastLevelTwo.value) {
        effects.push(<h5>A ^{format(dustAccelerator.dustAcceleratorDustRaiseEffect.value)} boost to dust gain.</h5>)
      }

      if (dustAccelerator.isAtLeastLevelThree.value) {
        effects.push(<h5>Adding +{format(dustAccelerator.dustAcceleratorDustRaiseEffect.value)} to Dust buyable caps.</h5>)
      }
      
      return joinJSX(effects, <></>);
    }
  }

  baseLayer.on("preUpdate", (diff) => {
    dustAccelerator.tick(diff);
  });

  const tabs = createTabFamily<TabFamilyOptions>({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: () => (<>
          <h2>{format(dustAccelerator.resource.value)} Dust Accelerators</h2>
          <h6>You are gaining {format(dustAccelerator.gainComputed.value)} every {format(dustAccelerator.timerMax.value)} seconds.</h6>
          <Spacer />

          {render(dustAccelerator.bar)}
          <Spacer />

          <h4>You have {format(dustLayer.mercurialDust.value)} mercurial dust.</h4>
          <Row>
            {render(dustAccelerator.intervalBuyable)}
          </Row>
          <Spacer />

          <h4>Granting you:</h4>
          {render(dustAccelerator.levelEffectsDisplay)}
          <Spacer />

          {render(dustAccelerator.levelBuyable)}

          <Spacer />
          <h4>Upgrades</h4>
          <Column>
            {chunkArray(Object.values(dustAccelerator.upgrades), 4).map(group => renderRow.apply(null, group))}
          </Column>
        </>)
      }))
    }),
    chunks: () => ({
      display: "Chunks",
      visibility: dustAccelerator.upgrades.chunksUnlock.bought,
      tab: createTab(() => ({
        display: () => (<>butts</>)
      }))
    })
  }, () => ({
    floating: true,
    buttonStyle: {
      border: 'solid 2px',
      borderRadius: '12px'
    }
  }));

  return {
    id,
    name,
    color,
    dustAccelerator,
    tabs,
    display: () => (<>{render(tabs)}</>)
  }
});

export default layer;