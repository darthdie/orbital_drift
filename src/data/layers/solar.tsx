import Spacer from "components/layout/Spacer.vue";
import { createLayerTreeNode } from "data/common";
import { createAchievement } from "features/achievements/achievement";
import { createUpgrade, UpgradeOptions } from "features/clickables/upgrade";
import { createReset } from "features/reset";
import { createResource, Resource, trackBest, trackTotal } from "features/resources/resource";
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
import CelestialBodyIcon, { SupportedBodies } from "components/CelestialBodyIcon.vue";
import { computed, MaybeRef, unref } from "vue";
import "./solar.css";
import {
    createSkillTree,
    createSkillTreeNodeRequirement
} from "data/features/skill_tree/skillTree";
import { createMercurySkillTree } from "./solar/mercurySkillTree";
import mercuryLayer from './mercury';
import venusLayer from './venus';

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

    const createPlanetCoreSummary = (
        body: SupportedBodies,
        layer: { color?: MaybeRef<string> },
        resource: Resource
    ) => {
        const color = unref(layer.color);
        return (
            <div class="flex" style={{ gap: "8px", color: color }}>
                <CelestialBodyIcon body={body} color={color}>
                    Mercury
                </CelestialBodyIcon>
                {format(resource.value)}
            </div>
        );
    };

    const {
        skillTree: mercuryTree,
        upgrades: mercuryTreeUpgrades,
        effects: mercuryTreeEffects
    } = createMercurySkillTree(solarRays);

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
                // visibility: milestones.second.earned,
                tab: createTab(() => ({
                    display: () => (
                        <>
                            <h2>{format(solarRays.value)} {solarRays.displayName}</h2>
                            <hr style={{ width: "256px", margin: "auto", background: "#997a1f" }} />
                            <div class="flex" style="gap: 32px;">
                                {createPlanetCoreSummary("Mercury", mercuryLayer, mercuryCores)}
                                {createPlanetCoreSummary("Venus", venusLayer, venusCores)}

                                <div class="flex" style="flex: 1;"></div>
                            </div>
                            <Spacer />
                            {render(mercuryTree)}
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
