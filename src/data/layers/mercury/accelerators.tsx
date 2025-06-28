import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";
import Spacer from "components/layout/Spacer.vue";
import { createBar } from "features/bars/bar";
import { createRepeatable } from "features/clickables/repeatable";
import { BaseLayer, createLayer } from "game/layers";
import { noPersist, persistent } from "game/persistence";
import { CostRequirementOptions, createCostRequirement, displayRequirements } from "game/requirements";
import { Direction } from "util/common";
import { render, renderCol, renderRow } from "util/vue";
import dustLayer from './dust';
import Decimal, { DecimalSource } from "lib/break_eternity";
import { createResource, Resource } from "features/resources/resource";
import { format } from "util/bignum";
import Formula from "game/formulas/formulas";
import { computed, MaybeRefOrGetter, unref } from "vue";
import { createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";
import { createTabFamily, TabFamilyOptions } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { createResetButton } from "data/common";

const id = "Ma";
const layer = createLayer(id, (baseLayer: BaseLayer) => {
  const name = "Mercury";
  const color = "#8c8c94";

  const sharedBarSettings = {
    direction: Direction.Right,
    height: 18,
    width: 256
  };

  const dustAccelerators= createResource<DecimalSource>(0, "Dust Accelerators");
  // const timerMax = 120;
  const dustTimer = createResource<DecimalSource>(0);
  const chunkAccelerators = createResource<DecimalSource>(0);
  const timeAccelerators = createResource<DecimalSource>(0);

  const dustBar = createBar(() => ({
    ...sharedBarSettings,
    progress: () => Decimal.div(dustTimer.value, dustTimerMax.value)
  }));

  // dustBuyable.amount.value.add(100).pow(1.3)
  const dustBuyable = createRepeatable(() => ({
    requirements: createCostRequirement((): CostRequirementOptions => ({
      resource: noPersist(dustLayer.mercurialDust),
      cost: Formula.variable(dustBuyable.amount).pow_base(1.9).times(5e5).evaluate()
    })),
    clickableStyle: {
      minHeight: '40px',
      width: 'fit-content'
    },
    display: () => (<>
      <div>
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

    // mul(0.075).add(1)

    if (Decimal.gte(dustTimer.value, dustTimerMax.value)) {
      dustTimer.value = 0;
      dustAccelerators.value = Decimal.add(dustAccelerators.value, 1);
    }
  });

  const dustBuyableGainModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(() => ({
      enabled: () => Decimal.gt(dustBuyable.amount.value, 0),
      multiplier: () => new Decimal(dustAccelerators.value).pow(0.01),
      description: "Dust Accelerators"
    }))
  ]);

  const dustTimerMaxModifier = Formula.variable(dustBuyable.amount).mul(0.002).add(1);

  // const dustAcceleratorResetButton = createResetButton(() => ({

  // }))

  const tabs = createTabFamily<TabFamilyOptions>({
    dust: () => ({
      display: "Dust",
      tab: createTab(() => ({
        display: () => <>
          <h2>{format(dustAccelerators.value)} Dust Accelerators</h2>
          <h6>You are gaining 1 every {format(dustTimerMax.value)} seconds.</h6>
          <Spacer/>

          {render(dustBar)}
          <Spacer/>

          <h4>You have {format(dustLayer.mercurialDust.value)} mercurial dust.</h4>
          <h5>Store dust to increase the speed</h5>
          {render(dustBuyable)}
          <Spacer/>

          <h4>Effects</h4>
          <h5>Granting a x{format(dustBuyableGainModifier.apply(1))} boost to Dust gain.</h5>

          <Spacer/>
          <h4>Upgrades</h4>
        </>
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