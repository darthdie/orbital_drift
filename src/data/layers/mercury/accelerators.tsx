import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import { createBar } from "features/bars/bar";
import { createRepeatable, setupAutoPurchaseRepeatable } from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { CostRequirementOptions, createCostRequirement, displayRequirements } from "game/requirements";
import { Direction } from "util/common";
import { joinJSX, render, renderGroupedObjects } from "util/vue";
import dustLayer from './dust';
import Decimal, { DecimalSource } from "lib/break_eternity";
import { createResource } from "features/resources/resource";
import { format } from "util/bignum";
import Formula from "game/formulas/formulas";
import { computed, unref } from "vue";
import { createMultiplicativeModifier, createSequentialModifier, MultiplicativeModifierOptions } from "game/modifiers";
import { createTabFamily, TabFamilyOptions } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { createUpgrade, setupAutoPurchase } from "features/clickables/upgrade";
import chunksLayer from './chunks';
import mercuryLayer from '../mercury';
import { createLazyProxy } from "util/proxies";
import { createReset } from "features/reset";
import solarLayer from '../solar';

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
    resource: createResource<DecimalSource>(0, "Dust Accelerons"),

    gainComputed: computed((): Decimal => {
      return Decimal.times(1, dustAccelerator.dustAcceleratorGainModifier.apply(1))
        .times(chunkAccelerator.dustAcceleratorModifierEffect.value)
        .times(solarLayer.mercuryRetainedSpeedModifer.apply(1));
    }),

    bar: createBar(() => ({
      ...sharedBarSettings,
      progress: (): Decimal => Decimal.div(dustAccelerator.timer.value, dustAccelerator.timerMax.value)
    })),

    intervalBuyable: createRepeatable(() => ({
      requirements: createCostRequirement((): CostRequirementOptions => ({
        resource: noPersist(dustLayer.mercurialDust),
        cost: () => Formula.variable(dustAccelerator.intervalBuyable.amount.value).pow_base(7).times(1e10).evaluate(),
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
      return Decimal
        .div(120, dustAccelerator.dustAcceleratorTimerMaxEffect.value)
        .div(dustAccelerator.acceleratingTheAcceleratorEffect.value)
        .div(timeAccelerator.levelTwoTimeRaiseEffect.value)
        .clampMin(0.1);
    }),

    isAtLeastLevelOne: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 1)),
    isAtLeastLevelTwo: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 2)),
    isAtLeastLevelThree: computed((): boolean => Decimal.gte(dustAccelerator.levelBuyable.amount.value, 3)),

    dustGainMultiplierModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: () => Decimal.gt(dustAccelerator.resource.value, 0),
        multiplier: () => Decimal.add(dustAccelerator.resource.value, 1).pow(0.25).clampMin(1),
        description: "Dust Accelerons"
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
      if (dustAccelerator.isAtLeastLevelThree.value) {
        return Decimal.add(dustAccelerator.resource.value, 1).log2().sqrt().floor().clampMin(1);
      }
      
      return Decimal.dZero;
    }),

    levelBuyable: createRepeatable(() => ({
      limit: 3,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        requiresPay: false,
        resource: noPersist(dustAccelerator.resource),
        cost: Formula.variable(dustAccelerator.levelBuyable.amount).pow_base(5).times(100)
      })),
      display: {
        title: "Upgrade",
        description: "Reset Dust Accelerons to unlock a new effect."
      },
      onClick: () => {
        dustAccelerator.resource.value = 0;
      }
    })),

    upgrades: {
      second: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(dustAccelerator.resource),
          cost: Decimal.fromNumber(25)
        })),
        display: {
          title: "Accelerating the Accelerator",
          description: "Decrease timer interval based on accelerons",
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
          description: "Unlock Chunk Accelerons",
        }
      })),

      first: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(dustAccelerator.resource),
          cost: Decimal.fromNumber(150)
        })),
        display: {
          title: "Speed Dust",
          description: "Unlock more Dust upgrades"
        }
      })),
    },

    tick: (diff: number) => {
      if (!dustLayer.unlocks.accelerators.bought.value) {
        return;
      }

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
        effects.push(<h5>A x{format(dustAccelerator.dustAcceleratorGainModifier.apply(1))} boost to accelerons gain.</h5>)
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
    resource: createResource<DecimalSource>(0, "Chunk Accelerons"),

    gainComputed: computed((): Decimal => {
      return Decimal
        .times(1, chunkAccelerator.acceleratorGainModifier.apply(1))
        .times(timeAccelerator.chunkAcceleronGainModifier.apply(1))
        .times(solarLayer.mercuryRetainedSpeedModifer.apply(1));
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
        .div(chunkAccelerator.dustAcceleratorIntervalEffect.value)
        .div(timeAccelerator.levelTwoTimeRaiseEffect.value);
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
        title: "Upgrade",
        description: "Reset Chunk Accelerons to unlock a new effect."
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
          description: "Decrease timer interval based on Dust Accelerons",
          effectDisplay: (): string => `÷${format(chunkAccelerator.dustAcceleratorIntervalEffect.value)}`
        }
      })),

      timeUnlock: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(chunkAccelerator.resource),
          cost: Decimal.fromNumber(100)
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
      return Decimal.add(chunkAccelerator.resource.value, 1).log2().pow(chunkAccelerator.levelThreeRaiseEffect.value).clampMin(1);
    }),

    chunkCostDivisionEffect: computed((): Decimal => {
      if (chunkAccelerator.isAtLeastLevelTwo.value) {
        return Decimal.add(chunkAccelerator.resource.value, 1).pow(0.2).cbrt().pow(chunkAccelerator.levelThreeRaiseEffect.value).clampMin(1);
      }

      return Decimal.dOne;
    }),

    acceleratorGainModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: () => chunkAccelerator.isAtLeastLevelOne.value,
        multiplier: () => Decimal.add(chunkAccelerator.resource.value, 1).pow(0.2).pow(chunkAccelerator.levelThreeRaiseEffect.value).clampMin(1)
      }))
    ]),

    levelThreeRaiseEffect: computed((): Decimal => {
      if (chunkAccelerator.isAtLeastLevelThree) {
        return Decimal.add(chunkAccelerator.resource.value, 1).pow(0.1).cbrt().clampMin(1);
      }

      return Decimal.dOne;
    }),

    levelEffectsDisplay: () => {
      const effects = [
        <h5>A x{format(chunkAccelerator.dustAcceleratorModifierEffect.value)} boost to Dust Acceleron gain.</h5>
      ];

      if (chunkAccelerator.isAtLeastLevelOne.value) {
        effects.push(<h5>A x{format(chunkAccelerator.acceleratorGainModifier.apply(1))} boost to Chunk Acceleron gain.</h5>)
      }

      if (chunkAccelerator.isAtLeastLevelTwo.value) {
        effects.push(<h5>Reduces Chunk cost by ÷{format(chunkAccelerator.chunkCostDivisionEffect.value)}.</h5>)
      }

      if (chunkAccelerator.isAtLeastLevelThree.value) {
        effects.push(<h5>Raising above effects by ^{format(chunkAccelerator.levelThreeRaiseEffect.value)}.</h5>)
      }

      return joinJSX(effects, <></>);
    },

    tick: (diff: number) => {
      if (!dustAccelerator.upgrades.chunksUnlock.bought.value) {
        return;
      }

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

  const timeAccelerator = {
    timer: createResource<DecimalSource>(0),
    resource: createResource<DecimalSource>(0, "time Accelerons"),

    gainComputed: computed((): Decimal => {
      return Decimal.times(1, timeAccelerator.finalCountdownEffect.value).times(solarLayer.mercuryRetainedSpeedModifer.apply(1));
    }),

    bar: createBar(() => ({
      ...sharedBarSettings,
      progress: (): Decimal => Decimal.div(timeAccelerator.timer.value, timeAccelerator.timerMax.value)
    })),

    acceleronTimerDivisionModifier: computed((): Decimal => {
      return Decimal.add(timeAccelerator.resource.value, 1).log2().sqrt().pow(timeAccelerator.levelThreeRaiseEffect.value).clampMin(1);
    }),

    timerMax: computed((): Decimal => {
      return Decimal.fromNumber(120)
        .div(timeAccelerator.acceleronTimerDivisionModifier.value)
        .div(timeAccelerator.doomsdayClockEffect.value)
        .div(timeAccelerator.levelTwoTimeRaiseEffect.value);
        // .div(timeAccelerator.intervalBuyableEffect.value);
        // .div(timeAccelerator.dustAcceleratorIntervalEffect.value);
    }),

    levelBuyable: createRepeatable(() => ({
      limit: 3,
      requirements: createCostRequirement((): CostRequirementOptions => ({
        requiresPay: false,
        resource: noPersist(timeAccelerator.resource),
        cost: Formula.variable(timeAccelerator.levelBuyable.amount).pow_base(5).times(10)
      })),
      display: {
        title: "Upgrade",
        description: "Reset Time Accelerons to unlock a new effect."
      },
      onClick: () => {
        timeAccelerator.resource.value = 0;
      }
    })),

    upgrades: {
      autoVonDoom: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(timeAccelerator.resource),
          cost: Decimal.fromNumber(10)
        })),
        display: {
          title: "Auto Von Doom",
          description: "Automate Accelerator Interval Buyables"
        }
      })),
      doomsDayClock: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(timeAccelerator.resource),
          cost: Decimal.fromNumber(25)
        })),
        display: {
          title: "Doomsday Clock",
          description: "Reduce interval based on collision time rate",
          effectDisplay: (): string => `÷${format(timeAccelerator.doomsdayClockEffect.value)}`
        }
      })),
      finalCountdown: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(timeAccelerator.resource),
          cost: Decimal.fromNumber(100)
        })),
        display: {
          title: "Final Countdown",
          description: "Multiply Time Acceleron gain based on collision time rate",
          effectDisplay: (): string => `÷${format(timeAccelerator.finalCountdownEffect.value)}`
        }
      })),
      bringItHome: createUpgrade(() => ({
        requirements: createCostRequirement((): CostRequirementOptions => ({
          resource: noPersist(timeAccelerator.resource),
          cost: Decimal.fromNumber(500)
        })),
        display: {
          title: "Bring It Home",
          description: "Multiply Collision Time based on itself",
          effectDisplay: (): string => `x${format(timeAccelerator.bringItHomeEffect.value)}`
        }
      }))
    },

    doomsdayClockEffect: computed((): Decimal => {
      if (timeAccelerator.upgrades.doomsDayClock.bought.value) {
        return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1).log10().cbrt().clampMin(1);
      }

      return Decimal.dOne;
    }),

    finalCountdownEffect: computed((): Decimal => {
      if (timeAccelerator.upgrades.finalCountdown.bought.value) {
        return Decimal.add(mercuryLayer.collisionTimeGainComputed.value, 1).log(8).sqrt().clampMin(1); 
      }

      return Decimal.dOne;
    }),

    bringItHomeEffect: computed((): Decimal => {
      if (timeAccelerator.upgrades.bringItHome.bought.value) {
        // return Decimal.dOne;
        return Decimal.add(timeAccelerator.resource.value, 1).pow(0.1).cbrt().clampMin(1);
      }

      return Decimal.dOne;
    }),

    isAtLeastLevelOne: computed((): boolean => Decimal.gte(timeAccelerator.levelBuyable.amount.value, 1)),
    isAtLeastLevelTwo: computed((): boolean => Decimal.gte(timeAccelerator.levelBuyable.amount.value, 2)),
    isAtLeastLevelThree: computed((): boolean => Decimal.gte(timeAccelerator.levelBuyable.amount.value, 3)),

    chunkAcceleratorModifierEffect: computed((): Decimal => {
      return Decimal.add(chunkAccelerator.resource.value, 1).log2().clampMin(1);
    }),

    chunkAcceleronGainModifier: createSequentialModifier(() => [
      createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
        enabled: timeAccelerator.isAtLeastLevelOne,
        multiplier: () => Decimal.add(timeAccelerator.resource.value, 1).log2().sqrt().pow(timeAccelerator.levelThreeRaiseEffect.value).clampMin(1)
      }))
    ]),

    levelTwoTimeRaiseEffect: computed((): Decimal => {
      if (timeAccelerator.isAtLeastLevelTwo) {
        return Decimal.add(timeAccelerator.resource.value, 10).log10().pow(0.25).cbrt().pow(timeAccelerator.levelThreeRaiseEffect.value).clampMin(1);
      }

      return Decimal.dOne;
    }),

    levelThreeRaiseEffect: computed((): Decimal => {
      if (timeAccelerator.isAtLeastLevelThree) {
        return Decimal.add(timeAccelerator.resource.value, 10).log10().pow(0.1).sqrt().add(timeAccelerator.bringItHomeEffect.value).clampMin(1);
      }

      return Decimal.dOne;
    }),

    levelEffectsDisplay: () => {
      const effects = [
        <h5>Decreasing the timer interval by ÷{format(timeAccelerator.acceleronTimerDivisionModifier.value)}.</h5>
      ];

      if (timeAccelerator.isAtLeastLevelOne.value) {
        effects.push(<h5>A x{format(timeAccelerator.chunkAcceleronGainModifier.apply(1))} boost to Chunk Acceleron gain.</h5>)
      }

      if (timeAccelerator.isAtLeastLevelTwo.value) {
        effects.push(<h5>Raising time speed by ^{format(timeAccelerator.levelTwoTimeRaiseEffect.value)}.</h5>)
      }

      if (timeAccelerator.isAtLeastLevelThree.value) {
        effects.push(<h5>Raising previous effects by ^{format(timeAccelerator.levelThreeRaiseEffect.value)}.</h5>)
      }

      return joinJSX(effects, <></>);
    },

    tick: (diff: number) => {
      if (!chunkAccelerator.upgrades.timeUnlock.bought.value) {
        return;
      }

      timeAccelerator.timer.value = Decimal.add(
        timeAccelerator.timer.value,
        Decimal.times(1, diff)
      );

      if (Decimal.gte(timeAccelerator.timer.value, timeAccelerator.timerMax.value)) {
        timeAccelerator.timer.value = 0;
        timeAccelerator.resource.value = Decimal.add(timeAccelerator.resource.value, timeAccelerator.gainComputed.value);
      }
    },
  };

  baseLayer.on("preUpdate", (diff) => {
    dustAccelerator.tick(diff);
    chunkAccelerator.tick(diff);
    timeAccelerator.tick(diff);
  });

  const autoIntervalBuyers = createLazyProxy(() => {
    setupAutoPurchaseRepeatable(
      layer,
      timeAccelerator.upgrades.autoVonDoom.bought,
      [
        dustAccelerator.intervalBuyable,
        chunkAccelerator.intervalBuyable
      ]
    );

    return {};
  });

  const tabs = createTabFamily<TabFamilyOptions>({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: () => (<>
          <h2>{format(dustAccelerator.resource.value)} Dust Accelerons</h2>
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
          <h2>{format(chunkAccelerator.resource.value)} Chunk Accelerons</h2>
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
          <h2>{format(timeAccelerator.resource.value)} time Accelerons</h2>
          <h6>You are gaining {format(timeAccelerator.gainComputed.value)} every {format(timeAccelerator.timerMax.value)} seconds.</h6>
          <Spacer />

          {render(timeAccelerator.bar)}
          <Spacer />

          <h4>Granting you:</h4>
          {render(timeAccelerator.levelEffectsDisplay)}
          <Spacer />

          {render(timeAccelerator.levelBuyable)}

          <Spacer />
          <h4>Upgrades</h4>
          <Column>
            {renderGroupedObjects(timeAccelerator.upgrades, 4, "gap: 8px; margin-bottom: 8px;")}
          </Column>
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

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer],
    onReset: () => {

    }
  }));

  const fullReset = () => {
    reset.reset();
    dustAccelerator.resource.value = 0;
    chunkAccelerator.resource.value = 0;
    timeAccelerator.resource.value = 0;
  };

  const showExclamation = computed(() => {
    return dustAccelerator.levelBuyable.canClick.value ||
      chunkAccelerator.levelBuyable.canClick.value ||
      timeAccelerator.levelBuyable.canClick.value;
  });

  return {
    id,
    name,
    color,
    dustAccelerator,
    chunkAccelerator,
    timeAccelerator,
    tabs,
    autoIntervalBuyers,
    showExclamation,
    fullReset,
    display: () => (<>{render(tabs)}</>)
  }
});

export default layer;