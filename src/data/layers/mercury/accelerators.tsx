import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import { createBar } from "features/bars/bar";
import { createRepeatable } from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { CostRequirementOptions, createCostRequirement, displayRequirements } from "game/requirements";
import { Direction } from "util/common";
import { joinJSX, render, renderGroupedObjects, renderRow } from "util/vue";
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
import chunksLayer from './chunks';

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
      return Decimal.times(1, dustAccelerator.dustAcceleratorGainModifier.apply(1))
        .times(chunkAccelerator.dustAcceleratorModifierEffect.value);
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
      return Decimal.div(120, dustAccelerator.dustAcceleratorTimerMaxEffect.value).div(dustAccelerator.acceleratingTheAcceleratorEffect.value).clampMin(0.1);
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

    acceleratingTheAcceleratorEffect: computed((): Decimal => {
      if (dustAccelerator.upgrades.second.bought.value) {
        // return Decimal.add(dustAccelerator.resource.value, 1).mul(0.004).add(1).clampMin(1);
        return Decimal.fromValue(
          Formula.variable(Decimal.add(dustAccelerator.resource.value, 1))
            .mul(0.004)
            .add(1)
            .step(2, f => f.pow(0.1))
            .evaluate()
        );
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
          effectDisplay: (): string => `/${format(dustAccelerator.acceleratingTheAcceleratorEffect.value)}`
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
        effects.push(<h5>Adding +{format(dustAccelerator.dustBuyableCapEffect.value)} to Dust buyable caps.</h5>)
      }

      return joinJSX(effects, <></>);
    }
  }

  const chunkAccelerator = {
    timer: createResource<DecimalSource>(0),
    resource: createResource<DecimalSource>(0, "Chunk Accelerators"),

    gainComputed: computed((): Decimal => {
      return Decimal.times(1, chunkAccelerator.acceleratorGainModifier.apply(1));
    }),

    bar: createBar(() => ({
      ...sharedBarSettings,
      progress: (): Decimal => Decimal.div(chunkAccelerator.timer.value, chunkAccelerator.timerMax.value)
    })),

    intervalBuyable: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(chunksLayer.chunks),
        cost: () => Formula.variable(chunkAccelerator.intervalBuyable.amount.value).pow_base(1.2).times(30).floor().evaluate(),
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
          Currently: {format(chunkAccelerator.intervalBuyableEffect.value)}
          {displayRequirements(chunkAccelerator.intervalBuyable.requirements, unref(chunkAccelerator.intervalBuyable.amountToIncrease))}
        </div>
      </>)
    })),

    timerMax: computed((): Decimal => {
      return Decimal.fromNumber(120)
        .div(chunkAccelerator.intervalBuyableEffect.value)
        .div(chunkAccelerator.dustAcceleratorIntervalEffect.value);
    }),

    dustAcceleratorIntervalEffect: computed(() => {
      if (chunkAccelerator.upgrades.chunksMeetDust.bought.value) {
        return Decimal.add(dustAccelerator.resource.value, 1).pow(0.12).sqrt().clampMin(1);
      }

      return Decimal.dOne;
    }),

    intervalBuyableEffect: computed((): Decimal => {
      if (Decimal.gt(chunkAccelerator.intervalBuyable.amount.value, 0)) {
        return Decimal.mul(chunkAccelerator.intervalBuyable.amount.value, 0.03).add(1).clampMin(1);
      }

      return Decimal.dOne;
    }),

    levelBuyable: createRepeatable(() => ({
      limit: 3,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        requiresPay: false,
        resource: noPersist(chunkAccelerator.resource),
        cost: Formula.variable(chunkAccelerator.levelBuyable.amount).pow_base(3).times(30)
      })),
      display: {
        title: "Refine",
        description: "Reset Chunk Accelerators to unlock a new effect."
      },
      onClick: () => {
        chunkAccelerator.resource.value = 0;
      }
    })),

    upgrades: {
      moreChunkUpgrades: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(chunkAccelerator.resource),
          cost: Decimal.fromNumber(10)
        })),
        display: {
          title: "Speed Chunks",
          description: "Unlock more Chunk upgrades",
        }
      })),

      chunksMeetDust: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(chunkAccelerator.resource),
          cost: Decimal.fromNumber(25)
        })),
        display: {
          title: "Chunks, meet Dust",
          description: "Decrease timer interval based on dust accelerators",
          effectDisplay: (): string => `÷${format(chunkAccelerator.dustAcceleratorIntervalEffect.value)}`
        }
      })),

      timeUnlock: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(chunkAccelerator.resource),
          cost: Decimal.fromNumber(25)
        })),
        display: {
          title: "Time go brrr",
          description: "Unlock Time Accelerons"
        }
      }))
    },

    isAtLeastLevelOne: computed((): boolean => Decimal.gte(chunkAccelerator.levelBuyable.amount.value, 1)),
    isAtLeastLevelTwo: computed((): boolean => Decimal.gte(chunkAccelerator.levelBuyable.amount.value, 2)),
    isAtLeastLevelThree: computed((): boolean => Decimal.gte(chunkAccelerator.levelBuyable.amount.value, 3)),

    dustAcceleratorModifierEffect: computed((): Decimal => {
      return Decimal.add(chunkAccelerator.resource.value, 1).log2();
    }),

    chunkCostDivisionEffect: computed((): Decimal => {
      if (chunkAccelerator.isAtLeastLevelTwo.value) {
        return Decimal.add(chunkAccelerator.resource.value, 1).pow(0.2).cbrt().clampMin(1);
      }

      return Decimal.dOne;
    }),

    acceleratorGainModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: () => chunkAccelerator.isAtLeastLevelOne.value,
        multiplier: () => Decimal.add(chunkAccelerator.resource.value, 1).pow(0.2).clampMin(1)
      }))
    ]),

    levelEffectsDisplay: () => {
      const effects = [
        <h5>A x{format(chunkAccelerator.dustAcceleratorModifierEffect.value)} boost to Dust Accelerator gain.</h5>
      ];

      if (dustAccelerator.isAtLeastLevelOne.value) {
        effects.push(<h5>A x{format(chunkAccelerator.acceleratorGainModifier.apply(1))} boost to Chunk accelerator gain.</h5>)
      }

      if (chunkAccelerator.isAtLeastLevelTwo.value) {
        effects.push(<h5>Reduces Chunk cost by ÷{format(chunkAccelerator.chunkCostDivisionEffect.value)}.</h5>)
      }

      // if (dustAccelerator.isAtLeastLevelThree.value) {
      //   effects.push(<h5>Adding +{format(dustAccelerator.dustAcceleratorDustRaiseEffect.value)} to Dust buyable caps.</h5>)
      // }

      return joinJSX(effects, <></>);
    },

    tick: (diff: number) => {
      chunkAccelerator.timer.value = Decimal.add(
        chunkAccelerator.timer.value,
        Decimal.times(1, diff)
      );

      if (Decimal.gte(chunkAccelerator.timer.value, chunkAccelerator.timerMax.value)) {
        chunkAccelerator.timer.value = 0;
        chunkAccelerator.resource.value = Decimal.add(chunkAccelerator.resource.value, chunkAccelerator.gainComputed.value);
      }
    },
  };

  baseLayer.on("preUpdate", (diff) => {
    dustAccelerator.tick(diff);
    chunkAccelerator.tick(diff);
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
            {renderGroupedObjects(dustAccelerator.upgrades, 4, "gap: 8px; margin-bottom: 8px;")}
          </Column>
        </>)
      }))
    }),
    chunks: () => ({
      display: "Chunks",
      visibility: dustAccelerator.upgrades.chunksUnlock.bought,
      tab: createTab(() => ({
        display: () => (<>
          <h2>{format(chunkAccelerator.resource.value)} Chunk Accelerators</h2>
          <h6>You are gaining {format(chunkAccelerator.gainComputed.value)} every {format(chunkAccelerator.timerMax.value)} seconds.</h6>
          <Spacer />

          {render(chunkAccelerator.bar)}
          <Spacer />

          <h4>You have {format(chunksLayer.chunks.value)} mercurial chunks.</h4>
          <Row>
            {render(chunkAccelerator.intervalBuyable)}
          </Row>
          <Spacer />

          <h4>Granting you:</h4>
          {render(chunkAccelerator.levelEffectsDisplay)}
          <Spacer />

          {render(chunkAccelerator.levelBuyable)}

          <Spacer />
          <h4>Upgrades</h4>
          <Column>
            {renderGroupedObjects(chunkAccelerator.upgrades, 4, "gap: 8px; margin-bottom: 8px;")}
          </Column>
        </>)
      }))
    }),
    time: () => ({
      display: "Time",
      visibility: chunkAccelerator.upgrades.timeUnlock.bought,
      tab: createTab(() => ({
        display: () => (<>
          hi.
        </>)
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
    chunkAccelerator,
    tabs,
    display: () => (<>{render(tabs)}</>)
  }
});

export default layer;