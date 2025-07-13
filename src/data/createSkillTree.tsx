import { createClickable } from "features/clickables/clickable";
import { Visibility } from "features/feature";
import { createTree, createTreeNode, Tree, TreeBranch, TreeNode } from "features/trees/tree";
import { Persistent, persistent } from "game/persistence";
import { createBooleanRequirement, Requirements, requirementsMet } from "game/requirements";
import Decimal, { DecimalSource } from "lib/break_eternity";
import { format } from "util/break_eternity";
import { MaybeGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { Renderable, VueFeature } from "util/vue";
import { computed, MaybeRef, Ref, watch } from "vue";
import { jsx } from "vue/jsx-runtime";

export const blankTreeNode = createTreeNode(() => ({ visibility: Visibility.Hidden }));

export type GenericSkillTreeNode = TreeNode & {
  bought: Ref<boolean>;
  requirements: Requirements;
};

export type SkillTree = {
  // treeNodes: Record<T, GenericSkillTreeNode>,
  tree: Tree;
  visibility: MaybeRef<Visibility | boolean>;
  treeNodes: Record<string, GenericSkillTreeNode>;
};

export interface SkillTreeOptions {
  visibility: MaybeRef<Visibility | boolean>,
  nodes: Record<
    string,
    {
      display: MaybeGetter<Renderable>;
      requirements?: Requirements;
      requiredNodes?: string[]
    }
  >,
  rows: (string | typeof blankTreeNode)[][]
}

export function createSkillTree<T extends SkillTreeOptions>(optionsFunc: () => T): SkillTree {
  return createLazyProxy(() => {
    const { nodes, rows, visibility, ...props } = optionsFunc();

    const treeNodes = Object.keys(nodes).reduce<Partial<Record<string, GenericSkillTreeNode>>>((acc, curr) => {
      
      //       const requirements = nodes[curr].requirements ?? [];
      //       requirements.unshift();
      // [
      //                       //     createVisibilityRequirement(vueFeature.visibility ?? true),
      //                       //     createBooleanRequirement(() => !earned.value),
      //                       //     ...(Array.isArray(requirements) ? requirements : [requirements])
      //                       // ],
      acc[curr] = createLazyProxy(() => {
        const { requirements: _requirements, requiredNodes } = nodes[curr];
        const bought = persistent<boolean>(false); // TODO: NOT PERSISTED, WHOOPS



        const requirements: Requirements = [
          createBooleanRequirement(() => !bought.value),
          createBooleanRequirement(() => requiredNodes?.every(node => treeNodes[node].bought.value) ?? true),
          ...(Array.isArray(_requirements) ? _requirements : _requirements ? [_requirements] : [])
        ];
        return createTreeNode(() => ({
          display: nodes[curr].display,
          classes: () => ({ "skill-tree-node": true, bought: bought.value }),
          bought,
          requirements,
          canClick: () => {
            // if (treeNodes[curr].bought.value) {
            //   return false;
            // }
            // // if (Decimal.gte(spentPoints.value, level.value)) {
            // //   return false;
            // // }
            // // 
            // if (nodes[curr].requirements?.some(r => !treeNodes[r].bought.value)) {
            //   return false;
            // }
            if (!requirementsMet(requirements)) {
              return false;
            }
            return true;
          },
          onClick() {
            treeNodes[curr].bought.value = true;
          }
        }));
      }) as GenericSkillTreeNode;
      return acc;
    }, {}) as Record<string, GenericSkillTreeNode>;

    return {
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeOptions>),
      treeNodes,
      tree: createTree(() => ({
        nodes: rows.map(r =>
          r.map(node => (node === blankTreeNode ? blankTreeNode : treeNodes[node as string]))
        ),
        branches: () =>
          Object.keys(nodes).reduce<TreeBranch[]>((acc, curr) => {
            return nodes[curr].requiredNodes
              ? [
                ...acc,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...nodes[curr].requiredNodes.map(r => ({
                  startNode: treeNodes[curr],
                  endNode: treeNodes[r],
                  stroke: treeNodes[r].bought.value
                    ? "#B949DE"
                    : "var(--locked)",
                  "stroke-width": "4px"
                }))
              ]
              : acc;
          }, [])
      })),
      visibility,
    };
  });
}

// createSkillTree({
//   moreFlowersFlat: {
//     display: "x2 flowers gain"
//   },
//   moreFlowersPerSpell: {
//     display: jsx(() => (
//       <div>
//         +.25x Therizó potency per known spell
//         <br />
//         (+{format(moreFlowersPerSpellEffect.value)})
//       </div>
//     )),
//     requirements: ["moreFlowersFlat"]
//   },
//   moreFlowersPerLevel: {
//     display: jsx(() => (
//       <div>
//         Additional x1.1 Therizó potency per Therizó level
//         <br />
//         (x{format(moreFlowersPerLevelEffect.value)})
//       </div>
//     )),
//     requirements: ["moreFlowersPerSpell"]
//   },
//   moreJobXpPerFlower: {
//     display: jsx(() => (
//       <div>
//         Flowers affect job exp
//         <br />
//         (x{format(flowersEffect.value)})
//       </div>
//     )),
//     requirements: ["moreFlowersFlat"]
//   },
//   moreSpellXpPerFlower: {
//     display: jsx(() => (
//       <div>
//         Flowers affect all spell exp
//         <br />
//         (x{format(flowersEffect.value)})
//       </div>
//     )),
//     requirements: ["moreJobXpPerFlower"]
//   },
//   morePotencyPerFlower: {
//     display: jsx(() => (
//       <div>
//         Flower's affect all spell potency twice
//         <br />
//         (x{format(flowersEffect.value)})
//       </div>
//     )),
//     requirements: ["moreSpellXpPerFlower"]
//   },
//   passiveFlowerGain: {
//     display: "1% of flower gain when casting other spells",
//     requirements: ["moreSpellXpPerFlower"]
//   }
// },
//   // Scythe shape (or flipped F)
//   [
//     ["moreFlowersPerLevel", "moreFlowersPerSpell", "moreFlowersFlat"],
//     [blank, blank, "moreJobXpPerFlower"],
//     [blank, "passiveFlowerGain", "moreSpellXpPerFlower"],
//     [blank, blank, "morePotencyPerFlower"]
//   ]
// ))