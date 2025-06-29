import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import { createBar } from "features/bars/bar";
import { createRepeatable } from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist, persistent } from "game/persistence";
import { CostRequirementOptions, createCostRequirement, createCountRequirement, displayRequirements } from "game/requirements";
import { Direction } from "util/common";
import { render, renderCol, renderRow } from "util/vue";
import dustLayer from './dust';
import Decimal, { DecimalSource } from "lib/break_eternity";
import { createResource, Resource } from "features/resources/resource";
import { format } from "util/bignum";
import Formula from "game/formulas/formulas";
import { computed, MaybeRefOrGetter, unref } from "vue";
import { createExponentialModifier, createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
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

  const dustAccelerators = createResource<DecimalSource>(0, "Dust Accelerators");
  const dustTimer = createResource<DecimalSource>(0);
  const chunkAccelerators = createResource<DecimalSource>(0);
  const timeAccelerators = createResource<DecimalSource>(0);

  const dustBar = createBar(() => ({
    ...sharedBarSettings,
    progress: () => Decimal.div(dustTimer.value, dustTimerMax.value)
  }));

  const dustBuyable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(dustLayer.mercurialDust),
      cost: () => Formula.variable(dustBuyable.amount.value).pow_base(5).times(5e5).evaluate()
    })),
    clickableStyle: {
      minHeight: '40px',
      width: 'fit-content'
    },
    display: () => (<>
      <div>
        {dustBuyable.amount.value}
        {displayRequirements(dustBuyable.requirements, unref(dustBuyable.amountToIncrease))}
      </div>
    </>)
  }));

  const chunksBar = createBar(() => ({
    ...sharedBarSettings,
    progress: 0.5
  }));

  const timeBar = createBar(() => ({
    ...sharedBarSettings,
    progress: 0.5
  }));

  const dustTimerMax = computed(() => Decimal.div(120, dustTimerMaxModifier.evaluate()))

  baseLayer.on("preUpdate", (diff) => {
    dustTimer.value = Decimal.add(dustTimer.value, Decimal.times(1, diff));

    if (Decimal.gte(dustTimer.value, dustTimerMax.value)) {
      dustTimer.value = 0;
      dustAccelerators.value = Decimal.add(dustAccelerators.value, dustAcceleratorsGainComputed.value);
    }
  });

  const dustBuyableGainModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => Decimal.gt(dustAccelerators.value, 0),
      multiplier: () => Decimal.add(dustAccelerators.value, 1).pow(0.05).clampMin(1),
      description: "Dust Accelerators"
    }))
  ]);

  const dustAcceleratorGainModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => Decimal.gt(dustAcceleratorLevelBuyable.amount.value, 0),
      multiplier: () => Decimal.add(dustAccelerators.value, 1).pow(0.1).clampMin(1)
    }))
  ]);

  const dustAcceleratorsGainComputed = computed(() => {
    return Decimal.times(1, dustAcceleratorGainModifier.apply(1));
  })

  const dustTimerMaxModifier = Formula.variable(dustBuyable.amount).log10().clampMin(1);

  const dustAcceleratorLevelBuyable = createRepeatable(() => ({
    limit: 3,
    requirements: createCostRequirement((): CostRequirementOptions => ({
      requiresPay: false,
      resource: noPersist(dustAccelerators),
      cost: Formula.variable(dustAcceleratorLevelBuyable.amount).pow_base(1e1).times(100)
    })),
    display: {
      title: "Refine",
      description: "Reset Dust Accelerators to unlock a new effect."
    },
    onClick: () => {
      dustAccelerators.value = 0;
    }
  }));

  const dustUpgrades = {
    first: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(dustAccelerators),
        cost: Decimal.fromNumber(10)
      })),
      display: {
        title: "Speed Dust",
        description: "Unlock more Dust upgrades"
      }
    })),
  };

  const tabs = createTabFamily<TabFamilyOptions>({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: () => (<>
          <h2>{format(dustAccelerators.value)} Dust Accelerators</h2>
          <h6>You are gaining {format(dustAcceleratorsGainComputed.value)} every {format(dustTimerMax.value)} seconds.</h6>
          <Spacer/>

          {render(dustBar)}
          <Spacer/>

          <h4>You have {format(dustLayer.mercurialDust.value)} mercurial dust.</h4>
          <h5>Store dust to increase the speed</h5>
          {render(dustBuyable)}
          <Spacer/>

          <h4>Effects</h4>
          <h5>Granting a x{format(dustBuyableGainModifier.apply(1))} boost to Dust gain.</h5>
          {
            Decimal.gt(dustAcceleratorLevelBuyable.amount.value, 0) ?
              <h5>Granting a x{format(dustAcceleratorGainModifier.apply(1))} boost to accelerators gain.</h5> :
              null
          }
          <Spacer/>
          
          {render(dustAcceleratorLevelBuyable)}

          <Spacer/>
          <h4>Upgrades</h4>
          <Column>
            {chunkArray(Object.values(dustUpgrades), 4).map(group => renderRow.apply(null, group))}
          </Column>
        </>)
      }))
    }),
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
    dustBar,
    chunksBar,
    timeBar,
    dustBuyable,
    dustTimer,
    dustAccelerators,
    chunkAccelerators,
    timeAccelerators,
    dustBuyableGainModifier,
    dustAcceleratorLevelBuyable,
    dustUpgrades,
    tabs,
    display: () => (<>
      <h4>You have ${0} mercurial chunks.</h4>
      <h4>You have ?time?.</h4>

      {render(tabs)}

      <div class="row" style="gap: 16px;">


        {/* <div style="display: flex; gap: 8px;">
          {render(chunksBar)}
          <div style="text-align: start; margin: 0; margin-top: 6px;">
            <h2>{format(chunkAccelerators.value)} Chunks</h2>
            <h4>Granting a x1 boost to Chunks gain?</h4>
          </div>
        </div> */}
      </div>

      {/* <div class="row" style="gap: 16px; margin-top: 16px;">
        <div style="display: flex; gap: 8px;">
          {render(timeBar)}
          <div style="text-align: start; margin: 0; margin-top: 6px;">
            <h2>{format(timeAccelerators.value)} Time</h2>
            <h4>Granting a x1 boost to the rate of time.</h4>
          </div>
        </div>
        <div></div>
      </div> */}
    </>)
  }
});

export default layer;