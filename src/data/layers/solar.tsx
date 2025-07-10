import Spacer from "components/layout/Spacer.vue";
import { createLayerTreeNode } from "data/common";
import { createAchievement } from "features/achievements/achievement";
import { createUpgrade } from "features/clickables/upgrade";
import { createReset } from "features/reset";
import { createResource, trackBest, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { createCostRequirement, createCountRequirement } from "game/requirements";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderGroupedObjects } from "util/vue";
import mercuryLayer from './mercury';
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { createMultiplicativeModifier, createSequentialModifier, MultiplicativeModifierOptions } from "game/modifiers";

const id = "S";
const layer = createLayer(id, baseLayer => {
  const name = "Solar";
  const color = "#FFCC33";

  const energy = createResource<DecimalSource>(1, "solar energy");
  const best = trackBest(energy);
  const totalEnergy = trackTotal(energy);

  const reset = createReset(() => ({
    thingsToReset: (): Record<string, unknown>[] => [layer]
  }));

  const treeNode = createLayerTreeNode(() => ({
    layerID: id,
    color,
    reset
  }));
  
  const mercuryUnlockUpgrade = createUpgrade(() => ({
    requirements: createCostRequirement(() => ({
      resource: noPersist(energy),
      cost: 1
    })),
    display: {
      description: (): string => mercuryUnlockUpgrade.bought.value ? "Mercury Unlocked" : "Unlock Mercury"
    }
  }));
  
  const milestones = {
    first: createAchievement(() => ({
      requirements: createCountRequirement(totalEnergy, 2),
      display: {
        requirement: "2 Solar Energy",
        optionsDisplay: "Unlock Solar Milestones and Solar Mercury Upgrades"
      }
    }))
  };

  const mercuryRetainedSpeedModifer = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: mercuryUpgrades.retainSpeed.bought,
      multiplier: 2
    }))
  ]);

  const mercurySolarFriedDustModifier = createSequentialModifier(() => [
    createMultiplicativeModifier((): MultiplicativeModifierOptions => ({
      enabled: mercuryUpgrades.solarFriedDust.bought,
      multiplier: 2
    }))
  ]);

  const mercuryUpgrades = {
    retainSpeed: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(energy),
        cost: Decimal.fromNumber(1)
      })),
      display: {
        title: "𝘴𝘰𝘭𝘢𝘳 𝘴𝘱𝘦𝘦𝘥",
        description: "Multiply time speed in Mercury by x2",
        effectDisplay: () => `x${mercuryRetainedSpeedModifer.apply(1)}`
      }
    })),
    solarFriedDust: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(energy),
        cost: Decimal.fromNumber(1)
      })),
      display: {
        title: "Solar Fried Dust",
        description: "Multiply Dust Gain by x2",
        effectDisplay: () => `x${mercurySolarFriedDustModifier.apply(1)}`
      }
    })),
    snortingDust: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(energy),
        cost: Decimal.fromNumber(1)
      })),
      display: {
        title: "Snorting Dust",
        description: "Always gain 5% of Dust per second."
      }
    })),
    secretChunkStash: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(energy),
        cost: Decimal.fromNumber(5)
      })),
      display: {
        title: "ˢᵉᶜʳᵉᵗ ᶜʰᵘⁿᵏ ˢᵗᵃˢʰ",
        description: "Start each Mercury reset with 3 Chunks."
      }
    })),
    youGetAPile: createUpgrade(() => ({
      requirements: createCostRequirement(() => ({
        resource: noPersist(energy),
        cost: Decimal.fromNumber(5)
      })),
      display: {
        title: "You get a pile, and you get...",
        description: "Keep 'Dust Piles' unlocked and start with 1 level of each buyable."
      }
    }))
  };

  const tabs = createTabFamily({
    milestones: () => ({
      display: "Milestones",
      visibility: milestones.first.earned,
      tab: createTab(() => ({display: () => <>{Object.values(milestones).map(a => render(a))}</>}))
    }),
    mercury: () => ({
      display: "Mercury",
      tab: createTab(() => ({
        display: () => (<>
          {render(mercuryUnlockUpgrade)}

          {
            milestones.first.earned.value ?
              <>
                <h5>Upgrades</h5>
                {renderGroupedObjects(mercuryUpgrades, 3)}
              </>
              : null
          }
        </>)
      }))
    })
  });

  // const reset = createReset(() => ({
  //   thingsToReset: (): Record<string, unknown> => [
  //     mercuryUpgrades,
  //   ]
  // }))

  return {
    name,
    energy,
    best,
    total: totalEnergy,
    color,
    mercuryUpgrade: mercuryUnlockUpgrade,
    milestones,
    tabs,
    mercuryUpgrades,
    mercuryRetainedSpeedModifer,
    mercurySolarFriedDustModifier,
    display: () => (
      <>
        <h2>You have {format(energy.value)} solar energy</h2>
        <h4>You have made a total of {format(totalEnergy.value)}</h4>
        <Spacer/>
        {render(tabs)}
      </>
    ),
    treeNode,
  };
});

export default layer;