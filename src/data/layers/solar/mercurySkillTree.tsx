import { createSkillTree, blankSkillTreeNode, createSkillTreeNodeRequirement } from "data/features/skill_tree/skillTree";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
import { noPersist } from "game/persistence";
import { createCostRequirement } from "game/requirements";
import { createMultiplicativeModifier, createSequentialModifier, MultiplicativeModifierOptions } from "game/modifiers";
import { Resource } from "features/resources/resource";
import { DecimalSource } from "util/bignum";

// Planet Cores -> Solar Rays

export function createMercurySkillTree(solarRays: Resource<DecimalSource>) {
  const solarSpeedModifer = createSequentialModifier(() => [
    createMultiplicativeModifier(
      (): MultiplicativeModifierOptions => ({
        enabled: upgrades.solarSpeed.bought,
        multiplier: 2
      })
    )
  ]);

  const mercurySolarFriedDustModifier = createSequentialModifier(() => [
    createMultiplicativeModifier(
      (): MultiplicativeModifierOptions => ({
        enabled: upgrades.solarFriedDust.bought,
        multiplier: 2
      })
    )
  ]);

  const upgrades = {
    solarFriedDust: createUpgrade((): UpgradeOptions => ({
      requirements: createCostRequirement(() => ({
        resource: solarRays,
        cost: 1
      })),
      display: {
        title: "Solar Fried Dust",
        description: "Multiply Dust Gain by x2",
        effectDisplay: () => `x${mercurySolarFriedDustModifier.apply(1)}`
      }
    })),
    solarSpeed: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 1
        })),
        createSkillTreeNodeRequirement(upgrades.solarFriedDust)
      ],
      display: {
        title: "𝘴𝘰𝘭𝘢𝘳 𝘴𝘱𝘦𝘦𝘥",
        description: "Multiply time speed by x2",
        effectDisplay: () => `x${solarSpeedModifer.apply(1)}`
      }
    })),
    dustyTomes: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 1
        })),
        createSkillTreeNodeRequirement(upgrades.solarFriedDust)
      ],
      display: {
        title: "Dusty Tomes",
        description: "Keep the first row of Dust upgrades."
      }
    })),
    eightyEight: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 1
        })),
        createSkillTreeNodeRequirement(upgrades.solarFriedDust)
      ],
      display: {
        title: "88",
        description: "Multiply Acceleron Gain by x2.",
        effectDisplay: (): string => upgrades.eightyEight.bought.value ? `x2` : `x1`
      }
    })),
    nowIHaveTwo: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 1
        })),
        createSkillTreeNodeRequirement(upgrades.solarFriedDust)
      ],
      display: {
        title: "Now I Have Two!",
        description: "Divide Chunks cost by ÷2.",
        effectDisplay: () => upgrades.nowIHaveTwo.bought.value ? `÷2` : `÷1`
      }
    })),
    snortingDust: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 3
        })),
        createSkillTreeNodeRequirement(upgrades.dustyTomes)
      ],
      display: {
        title: "Snorting Dust",
        description: "Start each reset with a base of 5% Dust per second."
      }
    })),
    secretChunkStash: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 3
        })),
        createSkillTreeNodeRequirement(upgrades.eightyEight)
      ],
      display: {
        title: "ˢᵉᶜʳᵉᵗ ᶜʰᵘⁿᵏ ˢᵗᵃˢʰ",
        description: "Start each reset with 3 Chunks."
      }
    })),
    youGetAPile: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 5
        })),
        createSkillTreeNodeRequirement([upgrades.snortingDust, upgrades.secretChunkStash])
      ],
      display: {
        title: "You get a pile, and you get...",
        description: "Keep 'Dust Piles' unlocked and start with 1 level of each buyable."
      }
    })),
    likeThatBlueGuy: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 5
        })),
        createSkillTreeNodeRequirement(upgrades.youGetAPile)
      ],
      display: {
        title: "Like that blue guy",
        description: "All Acceleron intervals are divided by ÷2.",
        effectDisplay: (): string => upgrades.likeThatBlueGuy.bought.value ? "÷2" : "÷1"
      }
    })),
    autoAutoChunks: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 5
        })),
        createSkillTreeNodeRequirement(upgrades.likeThatBlueGuy)
      ],
      display: {
        title: "AUTO Autoin' Chunks",
        description: "Keep 'Autoin' Chunks' on reset."
      }
    })),
    nTropy: createUpgrade((): UpgradeOptions => ({
      requirements: [
        createCostRequirement(() => ({
          resource: solarRays,
          cost: 5
        })),
        createSkillTreeNodeRequirement(upgrades.likeThatBlueGuy)
      ],
      display: {
        title: "Tropy, N. Dr.",
        description: "Keep Accelerons Unlocked on reset."
      }
    })),
    mastery: createUpgrade((): UpgradeOptions => ({
      requirements: [createCostRequirement(() => ({
        resource: solarRays,
        cost: 10
      })),
      createSkillTreeNodeRequirement([upgrades.autoAutoChunks, upgrades.nTropy, upgrades.likeThatBlueGuy])
      ],
      display: {
        title: "Mastery",
        description: "Unlock Mercury Mastery."
      }
    }))
  };

  const skillTree = createSkillTree(() => ({
    nodes: noPersist([
      [upgrades.solarSpeed, blankSkillTreeNode, upgrades.nowIHaveTwo],
      [blankSkillTreeNode, upgrades.solarFriedDust, blankSkillTreeNode],
      [upgrades.dustyTomes, blankSkillTreeNode, upgrades.eightyEight],
      [upgrades.snortingDust, blankSkillTreeNode, upgrades.secretChunkStash],
      [blankSkillTreeNode, upgrades.youGetAPile, blankSkillTreeNode],
      [upgrades.nTropy, upgrades.likeThatBlueGuy, upgrades.autoAutoChunks],
      [blankSkillTreeNode, upgrades.mastery, blankSkillTreeNode]
    ]),
    branches: noPersist([
      { startNode: upgrades.solarFriedDust, endNode: upgrades.solarSpeed },
      { startNode: upgrades.solarFriedDust, endNode: upgrades.nowIHaveTwo },
      { startNode: upgrades.solarFriedDust, endNode: upgrades.dustyTomes },
      { startNode: upgrades.solarFriedDust, endNode: upgrades.eightyEight },
      { startNode: upgrades.dustyTomes, endNode: upgrades.snortingDust },
      { startNode: upgrades.eightyEight, endNode: upgrades.secretChunkStash },
      { startNode: upgrades.snortingDust, endNode: upgrades.youGetAPile },
      { startNode: upgrades.secretChunkStash, endNode: upgrades.youGetAPile },
      { startNode: upgrades.youGetAPile, endNode: upgrades.likeThatBlueGuy },
      { startNode: upgrades.likeThatBlueGuy, endNode: upgrades.nTropy },
      { startNode: upgrades.likeThatBlueGuy, endNode: upgrades.autoAutoChunks },
      { startNode: upgrades.nTropy, endNode: upgrades.mastery },
      { startNode: upgrades.likeThatBlueGuy, endNode: upgrades.mastery },
      { startNode: upgrades.autoAutoChunks, endNode: upgrades.mastery },
    ])
  }));

  // post mastery upgrades:
  // uncap level buyables, boosting the previous effects.

  return {
    upgrades,
    skillTree
  };
}