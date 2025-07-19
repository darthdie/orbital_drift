import Spacer from "components/layout/Spacer.vue";
import { createLayerTreeNode } from "data/common";
import { createAchievement } from "features/achievements/achievement";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
import { createReset } from "features/reset";
import { createResource, trackBest, trackTotal } from "features/resources/resource";
import { createLayer } from "game/layers";
import { noPersist } from "game/persistence";
import { createCostRequirement, createCountRequirement } from "game/requirements";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { render, renderGroupedObjects } from "util/vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import {
    createMultiplicativeModifier,
    createSequentialModifier,
    MultiplicativeModifierOptions
} from "game/modifiers";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import { computed } from "vue";
import {
    blankTreeNode,
    createBoughtNodeRequirement,
    createSkillTreeOld,
    createSkillTreeNodeOld,
    SkillTreeNodeOptions
} from "data/createSkillTree";
import "./solar.css";
import {
    createSkillTree,
    createSkillTreeNodeRequirement
} from "data/features/skill_tree/skillTree";

const id = "S";
const layer = createLayer(id, () => {
    const name = "Solar";
    const color = "#FFCC33";

    const energy = createResource<DecimalSource>(1, "Solar Energy");
    const best = trackBest(energy);
    const totalEnergy = trackTotal(energy);
    const solarRays = createResource<DecimalSource>(0, "Solar Rays");
    const mercuryCores = createResource<DecimalSource>(0, "Mercury Cores");
    const venusCores = createResource<DecimalSource>(0, "Venus Cores");

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const mercuryUnlockUpgrade = createUpgrade(() => ({
        requirements: createCostRequirement(() => ({
            resource: noPersist(energy),
            cost: 1
        })),
        display: {
            description: (): string =>
                mercuryUnlockUpgrade.bought.value ? "Mercury Unlocked" : "Unlock Mercury"
        }
    }));

    const milestones = {
        first: createAchievement(() => ({
            requirements: createCountRequirement(totalEnergy, 1),
            display: {
                requirement: "1 Solar Energy",
                optionsDisplay: "Start your journey. Unlock the Solar System."
            }
        })),
        second: createAchievement(() => ({
            requirements: createCountRequirement(totalEnergy, 4),
            display: {
                requirement: "2 Solar Energy",
                optionsDisplay: "Unlock Planet Cores & Mastery Trees"
            }
        }))
    };

    const mercuryRetainedSpeedModifer = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: mercuryUpgrades.retainSpeed.bought,
                multiplier: 2
            })
        )
    ]);

    const mercurySolarFriedDustModifier = createSequentialModifier(() => [
        createMultiplicativeModifier(
            (): MultiplicativeModifierOptions => ({
                enabled: mercuryUpgrades.solarFriedDust.bought,
                multiplier: 2
            })
        )
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
                description: "Start Mercury resets with a base of 5% Dust per second."
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

    // const createPlanetCoreSummary = (
    //     body: SupportedBodies,
    //     layer: { color?: MaybeRef<string> },
    //     resource: Resource
    // ) => {
    //     const color = unref(layer.color);
    //     return (
    //         <div class="flex" style={{ gap: "8px", color: color }}>
    //             <CelestialBodyIcon body={body} color={color}>
    //                 Mercury
    //             </CelestialBodyIcon>
    //             {format(resource.value)}
    //         </div>
    //     );
    // };

    const mercurySkillTree = createSkillTreeOld(
        {
            free: createSkillTreeNodeOld(() => ({
                display: {
                    title: "Unlock Mercury Tree"
                }
            })),
            snortingDust: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [
                        createCostRequirement(() => ({
                            resource: noPersist(solarRays),
                            cost: 1
                        })),
                        createBoughtNodeRequirement(mercurySkillTree, ["free"])
                    ],
                    display: {
                        title: "Snorting Dust",
                        description: "Start Mercury resets with a base of 5% Dust per second."
                    }
                })
            ),
            idk3: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["free"])],
                    display: {
                        title: "idk3"
                    }
                })
            ),
            idk3_3: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["snortingDust"])],
                    display: {
                        title: "idk3_3"
                    }
                })
            ),
            idk3_4: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk3"])],
                    display: {
                        title: "idk3_4"
                    }
                })
            ),
            idk4: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk3_3"])],
                    display: {
                        title: "idk4"
                    }
                })
            ),
            idk5: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk3_4"])],
                    display: {
                        title: "idk5"
                    }
                })
            ),
            idk4_3: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk4"])],
                    display: {
                        title: "idk4_3"
                    }
                })
            ),
            idk4_4: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk5"])],
                    display: {
                        title: "idk4_4"
                    }
                })
            ),
            idk6: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk4_3"])],
                    display: {
                        title: "idk6"
                    }
                })
            ),
            idk7: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk4_4"])],
                    display: {
                        title: "idk7"
                    }
                })
            ),
            idk8: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk6", "idk7"])],
                    display: {
                        title: "idk8"
                    }
                })
            ),
            idk9: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk10"])],
                    display: {
                        title: "idk9"
                    }
                })
            ),
            idk10: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk8"])],
                    display: {
                        title: "idk10"
                    }
                })
            ),
            idk11: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [createBoughtNodeRequirement(mercurySkillTree, ["idk10"])],
                    display: {
                        title: "idk11"
                    }
                })
            ),
            mastery: createSkillTreeNodeOld(
                (): SkillTreeNodeOptions => ({
                    requirements: [
                        createCostRequirement(() => ({
                            resource: noPersist(solarRays),
                            cost: 50
                        })),
                        createBoughtNodeRequirement(mercurySkillTree, ["idk10"])
                    ],
                    display: {
                        title: "Unlock Mastery"
                    }
                })
            )
        },
        () => ({
            visibility: true,
            rows: [
                // ??, ??
                ["free"],
                ["snortingDust", blankTreeNode, "idk3"],
                ["idk3_3", blankTreeNode, blankTreeNode, blankTreeNode, "idk3_4"],
                [
                    "idk4",
                    blankTreeNode,
                    blankTreeNode,
                    blankTreeNode,
                    blankTreeNode,
                    blankTreeNode,
                    "idk5"
                ],
                ["idk4_3", blankTreeNode, blankTreeNode, blankTreeNode, "idk4_4"],
                ["idk6", blankTreeNode, "idk7"],
                ["idk8"],
                ["idk9", "idk10", "idk11"],
                ["mastery"]
            ],
            style: { height: "100%" }
        })
    );

    const solarSystemUpgrades = {
        mercury: createUpgrade(
            (): UpgradeOptions => ({
                display: {
                    title: "Mercury",
                    description: "Unlock Mercury"
                },
                requirements: [
                    createCostRequirement(() => ({
                        resource: noPersist(energy),
                        cost: 1
                    }))
                ]
            })
        ),
        venus: createUpgrade(
            (): UpgradeOptions => ({
                display: {
                    title: "Venus",
                    description: "Unlock Venus"
                },
                requirements: [
                    createCostRequirement(() => ({
                        resource: noPersist(solarRays),
                        cost: 3
                    })),
                    createSkillTreeNodeRequirement(solarSystemUpgrades.mercury)
                ]
            })
        ),
        earth: createUpgrade(
            (): UpgradeOptions => ({
                visibility: false,
                display: "??",
                requirements: [
                    createCostRequirement(() => ({
                        resource: noPersist(solarRays),
                        cost: 3
                    })),
                    createSkillTreeNodeRequirement(solarSystemUpgrades.venus)
                ]
            })
        )
    };

    const solarSystemTree = createSkillTree(() => ({
        nodes: noPersist([
            [solarSystemUpgrades.mercury],
            [solarSystemUpgrades.venus],
            [solarSystemUpgrades.earth]
        ]),
        branches: noPersist([
            { startNode: solarSystemUpgrades.mercury, endNode: solarSystemUpgrades.venus },
            { startNode: solarSystemUpgrades.venus, endNode: solarSystemUpgrades.earth }
        ])
    }));

    const displayGlow = computed(() => {
        // Can any of the solar system tree be bought?
        return Object.values(solarSystemUpgrades).some(u => u.canPurchase.value);
    });

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        display: () => <CelestialBodyIcon body="Sun" />,
        glowColor: () => (displayGlow.value ? color : null),
        reset
    }));

    const tabs = createTabFamily(
        {
            milestones: () => ({
                display: "Milestones",
                tab: createTab(() => ({
                    display: () => <>{Object.values(milestones).map(a => render(a))}</>
                }))
            }),
            solarSystem: () => ({
                display: "Solar System",
                tab: createTab(() => ({
                    display: () => <>{render(solarSystemTree)}</>
                }))
            }),
            // rays: () => ({
            //   display: "Rays",
            //   // visibility: milestones.second.earned,
            //   tab: createTab(() => ({
            //     style: { height: "100%" },
            //     display: () => <>
            //       <h2>{format(solarRays.value)} {solarRays.displayName}</h2>
            //       <hr style={{ width: "256px", margin: "auto", background: "#997a1f" }} />
            //       <div class="flex" style="gap: 32px;">
            //         {createPlanetCoreSummary("Mercury", mercuryLayer, mercuryCores)}
            //         {createPlanetCoreSummary("Venus", venusLayer, venusCores)}

            //         <div class="flex" style="flex: 1;"></div>
            //       </div>
            //       <Spacer />
            //       <Spacer />
            //       {render(solarTree)}
            //     </>
            //   }))
            // }),
            mercury: () => ({
                display: "Mercury",
                visibility: milestones.second.earned,
                tab: createTab(() => ({
                    style: { height: "100%" },
                    display: () => (
                        <>
                            {/* {render(mercuryUnlockUpgrade)} */}

                            {renderGroupedObjects(mercuryUpgrades, 3)}

                            {/* {render(mercurySkillTree)} */}
                        </>
                    )
                }))
            })
        },
        () => ({ style: { height: "100%" } })
    );

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
        mercuryCores,
        venusCores,
        solarRays,
        mercurySkillTree,
        solarSystemTree,
        solarSystemUpgrades,
        // testUpgrade,
        // board,
        display: () => (
            <>
                <h2>
                    You have {format(energy.value)} {energy.displayName}
                </h2>
                <h4>You have made a total of {format(totalEnergy.value)}</h4>
                <Spacer />
                {render(tabs)}
            </>
        ),
        treeNode
    };
});

export default layer;
