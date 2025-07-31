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
import { render } from "util/vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import CelestialBodyIcon from "components/CelestialBodyIcon.vue";
import { computed, unref } from "vue";
import "./solar.css";
import {
    createSkillTree,
    createSkillTreeNodeRequirement
} from "data/features/skill_tree/skillTree";
import { createMercurySkillTree } from "./solar/mercurySkillTree";
import mercuryLayer from "./mercury";
import { createRepeatable, RepeatableOptions } from "features/clickables/repeatable";
import { fibonacciCostFormula } from "data/formulas";

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

    const milestones = {
        first: createAchievement(() => ({
            requirements: createCountRequirement(totalEnergy, 1),
            display: {
                requirement: "1 Total Solar Energy",
                optionsDisplay: "Start your journey. Unlock the Solar System."
            }
        })),
        second: createAchievement(() => ({
            requirements: createCountRequirement(totalEnergy, 2),
            display: {
                requirement: "2 Total Solar Energy",
                optionsDisplay: "Unlock Planet Cores & Mastery Trees"
            }
        }))
    };

    const {
        skillTree: mercuryTree,
        upgrades: mercuryTreeUpgrades,
        effects: mercuryTreeEffects
    } = createMercurySkillTree(mercuryCores);

    const solarSystemUpgrades = {
        mercury: createUpgrade(
            (): UpgradeOptions => ({
                display: {
                    title: "Mercury",
                    description: "Unlock Mercury"
                },
                requirements: [
                    createCostRequirement(() => ({
                        resource: energy,
                        cost: 1
                    }))
                ],
                classes: { "solar-tree-node": true }
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
                        resource: mercuryCores,
                        cost: 5
                    })),
                    createSkillTreeNodeRequirement(solarSystemUpgrades.mercury)
                ],
                classes: { "solar-tree-node": true }
            })
        ),
        earth: createUpgrade(
            (): UpgradeOptions => ({
                visibility: solarSystemUpgrades.venus.bought,
                display: "??",
                requirements: [
                    createCostRequirement(() => ({
                        resource: solarRays,
                        cost: 100
                    })),
                    createSkillTreeNodeRequirement(solarSystemUpgrades.venus)
                ],
                classes: { "solar-tree-node": true }
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
        const solarSystemPurchaseable = Object.values(solarSystemUpgrades).some(
            u => u.canPurchase.value
        );
        const mercuryTreePurchasable = Object.values(mercuryTreeUpgrades).some(
            u => u.canPurchase.value
        );
        return solarSystemPurchaseable || mercuryTreePurchasable;
    });

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        display: () => <CelestialBodyIcon body="Sun" />,
        glowColor: () => (displayGlow.value ? color : null),
        reset
    }));

    const converters = {
        solarEnergy: createRepeatable(
            (): RepeatableOptions => ({
                requirements: createCostRequirement(() => ({
                    resource: energy,
                    cost: () => fibonacciCostFormula(converters.solarEnergy.amount.value)
                })),
                display: {
                    showAmount: false,
                    // title: "Energy Converter",
                    description: `Convert 1 ${energy.displayName} to 1 ${solarRays.displayName}.`
                },
                clickableStyle: {
                    width: "200px",
                    minHeight: "0"
                }
            })
        )
    };

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
            //   <h2>{format(solarRays.value)} {solarRays.displayName}</h2>
            //   <hr style={{ width: "256px", margin: "auto", background: "#997a1f" }} />
            //   <div class="flex" style="gap: 32px;">
            //     {createPlanetCoreSummary("Mercury", mercuryLayer, mercuryCores)}
            //     {createPlanetCoreSummary("Venus", venusLayer, venusCores)}

            //     <div class="flex" style="flex: 1;"></div>
            //   </div>
            //   <Spacer />
            //       <Spacer />
            //       {render(solarTree)}
            //     </>
            //   }))
            // }),
            mercury: () => ({
                display: "Mercury",
                visibility: milestones.second.earned,
                tab: createTab(() => {
                    const color = unref(mercuryLayer.color);
                    return {
                        display: () => (
                            <>
                                <h2>
                                    <CelestialBodyIcon
                                        body="Mercury"
                                        style={{ display: "inline", color }}
                                    />{" "}
                                    {format(mercuryCores.value, 0)} {mercuryCores.displayName}
                                </h2>
                                <hr
                                    style={{
                                        width: "256px",
                                        margin: "auto",
                                        background: color,
                                        marginTop: "6px"
                                    }}
                                />
                                <Spacer />
                                {render(mercuryTree)}
                            </>
                        )
                    };
                })
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
        milestones,
        tabs,
        mercuryCores,
        venusCores,
        solarRays,
        solarSystemTree,
        solarSystemUpgrades,
        mercuryTree,
        mercuryTreeUpgrades,
        mercuryTreeEffects,
        converters,
        display: () => (
            <>
                <div id="solar-layer">
                    <h2>
                        You have{" "}
                        <CelestialBodyIcon body="Sun" style={{ display: "inline", color }} />{" "}
                        {format(energy.value)} {energy.displayName}
                    </h2>
                    <h4>You have made a total of {format(totalEnergy.value)}</h4>
                    <Spacer />
                    {render(tabs)}
                </div>
            </>
        ),
        treeNode
    };
});

export default layer;
