import { Visibility } from "features/feature";
import { createTree, createTreeNode, Tree, TreeBranch, TreeNode } from "features/trees/tree";
import { Persistent, persistent } from "game/persistence";
import { createBooleanRequirement, displayRequirements, payRequirements, Requirements, requirementsMet } from "game/requirements";
import { MaybeGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { isJSXElement, Renderable, VueFeature, render } from "util/vue";
import { MaybeRef, unref } from "vue";

export const blankTreeNode = createTreeNode(() => ({ visibility: Visibility.Hidden }));

export type SkillTreeNode = TreeNode & {
  bought: Persistent<boolean>;
  requirements: Requirements;
  display?: MaybeGetter<Renderable>;
};

export type SkillTree = {
  // treeNodes: Record<T, GenericSkillTreeNode>,
  tree: Tree;
  visibility: MaybeRef<Visibility | boolean>;
  treeNodes: Record<string, SkillTreeNode>;
};

export interface SkillTreeOptions {
  visibility: MaybeRef<Visibility | boolean>,
  nodes: Record<
    string,
    {
      display: | MaybeGetter<Renderable>
      | {
        /** A header to appear at the top of the display. */
        title?: MaybeGetter<Renderable>;
        /** The main text that appears in the display. */
        description?: MaybeGetter<Renderable>;
        /** A description of the current effect of the node. */
        effectDisplay?: MaybeGetter<Renderable>;
      };
      requirements?: Requirements;
      requiredNodes?: string[]
      visibility?: MaybeRef<Visibility | boolean>;
    }
  >,
  rows: (string | typeof blankTreeNode)[][]
}

export interface SkillTreeNodeOptions {
  visibility?: MaybeRef<Visibility | boolean>;
  treeNodes: Record<string, SkillTreeNode>;
  requirements?: Requirements;
  requiredNodes?: string[];
  display?:
  | MaybeGetter<Renderable>
  | {
    /** A header to appear at the top of the display. */
    title?: MaybeGetter<Renderable>;
    /** The main text that appears in the display. */
    description?: MaybeGetter<Renderable>;
    /** A description of the current effect of the node. */
    effectDisplay?: MaybeGetter<Renderable>;
  };
}

function createSkillTreeNode<T extends SkillTreeNodeOptions>(optionsFunc: () => T): SkillTreeNode {
  return createLazyProxy(() => {
    const bought = persistent<boolean>(false);
    const { treeNodes, requirements: _requirements, requiredNodes, display: _display, ...props } = optionsFunc();

    const requirements: Requirements = [
      createBooleanRequirement(() => !bought.value),
      createBooleanRequirement(() => requiredNodes?.every(node => treeNodes[node].bought.value) ?? true),
      ...(Array.isArray(_requirements) ? _requirements : _requirements ? [_requirements] : [])
    ];

    let display: any;
    if (typeof _display === "object" && !isJSXElement(_display)) {
      const { title, description, effectDisplay } = _display;

      display = () => (
        <span>
          {title != null ? (
            <div>
              {render(title, el => (
                <h3>{el}</h3>
              ))}
            </div>
          ) : null}
          {description != null ?
            render(description, el => (
              <div>{el}</div>
            )) : null}
          {effectDisplay != null ? <div>Currently: {render(effectDisplay)}</div> : null}
          {bought.value || requirements.length < 3 ? null : (
            <>
              <br />
              {displayRequirements(requirements)}
            </>
          )}
        </span>
      );
    } else if (_display != null) {
      display = _display;
    }

    const node = createTreeNode(() => ({
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeNodeOptions>),
      display,
      classes: () => ({ "skill-tree-node": true, bought: bought.value }),
      bought,
      requirements,
      canClick: () => {
        return requirementsMet(requirements);
      },
      onClick() {
        if (!unref(node.canClick) == true) {
          return;
        }

        bought.value = true;
        payRequirements(requirements)
      }
    })) as SkillTreeNode;

    return node;
  }) as SkillTreeNode;
}

export function createSkillTree<T extends SkillTreeOptions>(optionsFunc: () => T): SkillTree {
  return createLazyProxy(() => {
    const { nodes, rows, visibility, ...props } = optionsFunc();

    const tree = createTree(() => ({
      nodes: rows.map(r =>
        r.map(node => (node === blankTreeNode ? blankTreeNode : treeNodes[node as string]))
      ),
      branches: () =>
        Object.keys(nodes).reduce<TreeBranch[]>((acc, curr) => {
          return nodes[curr].requiredNodes
            ? [
              ...acc,
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
    }));

    const treeNodes = Object.keys(nodes).reduce<Partial<Record<string, SkillTreeNode>>>((acc, curr) => {
      const { requirements, requiredNodes, display, visibility } = nodes[curr];
      const node = createSkillTreeNode(() => ({
        treeNodes,
        requirements,
        requiredNodes,
        display,
        visibility
      })) satisfies SkillTreeNode;

      acc[curr] = node;
      return acc;
    }, {}) as Record<string, SkillTreeNode>;

    return {
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeOptions>),
      treeNodes,
      tree,
      visibility,
    };
  });
}
