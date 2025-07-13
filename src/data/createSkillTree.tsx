import { Repeatable } from "features/clickables/repeatable";
import { Upgrade } from "features/clickables/upgrade";
import { Visibility } from "features/feature";
import { createTree, createTreeNode, Tree, TreeBranch, TreeNode } from "features/trees/tree";
import Board from "game/boards/Board.vue";
import { Persistent, persistent } from "game/persistence";
import { createBooleanRequirement, displayRequirements, payRequirements, Requirements, requirementsMet } from "game/requirements";
import { MaybeGetter, processGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import { isJSXElement, Renderable, VueFeature, render, vueFeatureMixin, VueFeatureOptions } from "util/vue";
import { computed, CSSProperties, MaybeRef, Ref, ref, unref } from "vue";
import Clickable from "features/clickables/Clickable.vue";

// , bought: ref(false)
export const blankTreeNode = createTreeNode(() => ({ visibility: Visibility.Hidden }));

export const SkillTreeType = Symbol("SkillTree");

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

export interface SkillTreeNode2 extends VueFeature {
  bought: Persistent<boolean>;
}

export interface SkillTree2 extends VueFeature {
  type: typeof SkillTreeType;
  treeNodes: Record<string, SkillTreeNode2>;
}

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

export interface SkillTreeOptions2 extends VueFeatureOptions {
  visibility: MaybeRef<Visibility | boolean>,
  // VueFeature?
  // nodes: Record<string, SkillTreeNode2>,
  // nodes: Record<
  //   string,
  //   {
  //     display: | MaybeGetter<Renderable>
  //     | {
  //       /** A header to appear at the top of the display. */
  //       title?: MaybeGetter<Renderable>;
  //       /** The main text that appears in the display. */
  //       description?: MaybeGetter<Renderable>;
  //       /** A description of the current effect of the node. */
  //       effectDisplay?: MaybeGetter<Renderable>;
  //     };
  //     requirements?: Requirements;
  //     requiredNodes?: string[]
  //     visibility?: MaybeRef<Visibility | boolean>;
  //   }
  // >,
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

export interface SkillTreeNodeOptions2 extends VueFeatureOptions {
  visibility?: MaybeRef<Visibility | boolean>;
  // treeNodes: Record<string, SkillTreeNode>;
  requirements?: Requirements;
  // requiredNodes?: string[];
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
  const bought = persistent<boolean>(false);
  return createLazyProxy(() => {

    const { treeNodes, requirements: _requirements, requiredNodes, display: _display, ...props } = optionsFunc();

    const requirements: Requirements = [
      createBooleanRequirement(() => !bought.value),
      // TODO: Move this into its own requirement handled by the caller, and make the creator of the tree pass it?
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
      // style: {
      //   margin: "25px",
      // },
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

// const testUpgrade = createUpgrade(() => ({
//   requirements: [],
//   style: {transform: "transform: translate(0px, 0px);", minHeight: "0px"},
//   display: {
//     title: "HELLO",
//     description: "does stuff"
//   }
// }))

// const board = <Board style={{height: "100%"}}>
//   {render(testUpgrade)}
// </Board>;

// [
//   [rootNode],
//   [subNode, subNod2]
// ]

export function createBoughtNodeRequirement(tree: SkillTree2, requiredNodes: string[]) {
  return createBooleanRequirement(
    () => requiredNodes.every(node => tree.treeNodes[node].bought.value)
  );
}

export function createSkillTreeNode2<T extends SkillTreeNodeOptions2>(optionsFunc: () => T): SkillTreeNode2 {
  const bought = persistent<boolean>(false);
  return createLazyProxy(() => {

    const options = optionsFunc();
    const { requirements: _requirements, display: _display, ...props } = options;

    const requirements: Requirements = [
      // createBooleanRequirement(() => !bought.value),
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
          {requirements.length < 3 ? null : (
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

    // options.classes = {
    //   "skill-tree-node": true, bought: bought.value,
    //   ...options.classes
    // };

    if (options.classes == null) {
      options.classes = computed(() => ({ "skill-tree-node": true, bought: unref(bought) }));
    } else {
      const classes = processGetter(options.classes);
      options.classes = computed(() => ({
        "skill-tree-node": true,
        ...unref(classes),
        bought: unref(bought)
      }));
    }

    // canClick: MaybeRef<boolean>;
    const node = {
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeNodeOptions>),
      display,
      // classes: () => ({ "skill-tree-node": true, bought: bought.value }),
      bought,
      requirements,
      ...vueFeatureMixin("skill-tree-node", options, () => (
        <Clickable
          canClick={node.canClick}
          onClick={node.onClick}
          onHold={node.onClick}
          display={node.display}
        />
      )),
      canClick: computed(() => requirementsMet(requirements)),
      onClick: () => {
        console.log('fuck you', { can: unref(node.canClick) })
        if (!unref(node.canClick) == true) {
          return;
        }

        console.log("piece of shit")
        bought.value = true;
        payRequirements(requirements)
      }
    } satisfies SkillTreeNode2;

    return node;

    // const node = createTreeNode(() => ({
    // ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeNodeOptions>),
    // display,
    // classes: () => ({ "skill-tree-node": true, bought: bought.value }),
    // bought,
    // requirements,
    // // style: {
    // //   margin: "25px",
    // // },
    // canClick: () => {
    //   return requirementsMet(requirements);
    // },
    // onClick() {
    //   if (!unref(node.canClick) == true) {
    //     return;
    //   }

    //   bought.value = true;
    //   payRequirements(requirements)
    // }
    // })) as SkillTreeNode2;
  });
}

// tabs: Record<string, () => TabButtonOptions>,
// optionsFunc?: () => T
export function createSkillTree2<T extends SkillTreeOptions2>(
  treeNodes: Record<string, SkillTreeNode2>,
  optionsFunc?: () => T
): SkillTree2 {
  return createLazyProxy(() => {
    const options = optionsFunc?.() ?? ({} as T);
    const { rows, ...props } = options;

    // const fullColumnCount = rows.reduce((acc, curr) => {
    //   if (curr.length > acc) {
    //     return curr.length;
    //   }

    //   return acc;
    // }, 0);

    // const convertedNodes: (SkillTreeNode2)[] = [];
    // let firstNode = null;
    // const treeNodes = createLazyProxy(() => {
    //   const { nodes: _nodes } = options;
    //   // const procssedNodes = _nodes();
    //   // console.log({ procssedNodes })
    //   const nodes: Record<string, SkillTreeNode2> = {};
    //   for (var row = 0; row < rows.length; row++) {
    //     console.log({ row: row });
    //     const columns = rows[row];

    //     const CELL_HEIGHT = 186;
    //     const yOffset = row > 0 ? `${row * CELL_HEIGHT}px` : "0px";

    //     // let preppedNodes: any = []
    //     for (let column = 0; column < columns.length; column++) {
    //       console.log({ column: column });
    //       const cell = columns[column];
    //       if (typeof cell != 'string') {
    //         continue;
    //       }

    //       // createSkillTree2Node(
    //       //   row,
    //       //   column
    //       // )

    //       nodes[cell] = createLazyProxy(() => {
    //         const node = _nodes[cell];

    //         const startX = -((columns.length - 1) / 2);
    //         const offset = startX + column;

    //         const existingStyle = node.style ? unref(node.style) : {};
    //         const CELL_WIDTH = 256;
    //         const offsetCss = `${offset * CELL_WIDTH}px`;

    //         const style: CSSProperties = {
    //           position: 'absolute',
    //           transform: `translate(${offsetCss}, ${yOffset})`,
    //           ...existingStyle
    //         };
    //         node.style = style;
    //         return node;
    //       });
    //     }
    //   }

    //   return nodes;
    // })

    // // console.log({
    // //   convertedNodes: convertedNodes
    // // })

    // // convertedNodes.forEach(r => console.log({r}));

    // // const firstNode = nodes[rows[0][0]];
    // const firstNode = rows.find(())

    // const arrangedTreeNodes: Record<;
    for (var row = 0; row < rows.length; row++) {
      console.log({ row: row });
      const columns = rows[row];

      const CELL_HEIGHT = 186;
      const yOffset = row > 0 ? `${row * CELL_HEIGHT}px` : "0px";

      // let preppedNodes: any = []
      for (let column = 0; column < columns.length; column++) {
        console.log({ column: column });
        const cell = columns[column];
        if (typeof cell != 'string') {
          continue;
        }

        // TODO: Move into a Vue component?
        const startX = -((columns.length - 1) / 2);
        const offset = startX + column;
        const node = treeNodes[cell];
        const existingStyle = node.style ? unref(node.style) : {};
        const CELL_WIDTH = 256;
        const offsetCss = `${offset * CELL_WIDTH}px`;

        const style: CSSProperties = {
          position: 'absolute',
          transform: `translate(${offsetCss}, ${yOffset})`,
          ...existingStyle
        };
        node.style = style;
        // createSkillTree2Node(
        //   row,
        //   column
        // )

        // nodes[cell] = createLazyProxy(() => {
        //   const node = _nodes[cell];

        // const startX = -((columns.length - 1) / 2);
        // const offset = startX + column;

        //   const existingStyle = node.style ? unref(node.style) : {};
        // const CELL_WIDTH = 256;
        // const offsetCss = `${offset * CELL_WIDTH}px`;

        // const style: CSSProperties = {
        //   position: 'absolute',
        //   transform: `translate(${offsetCss}, ${yOffset})`,
        //   ...existingStyle
        // };
        // node.style = style;
        //   return node;
        // });
      }
    }

    // const parsedTreeNodes = Object.entries(treeNodes).reduce((acc, [key, value]) => {
    //   acc[key] = value;
    //   return acc;
    // }, {} as Record<string, SkillTreeNode2>)

    return {
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeOptions2>),
      ...vueFeatureMixin("skill-tree", options, () => (
        <Board style={{ height: "100%" }}>
          {Object.values(treeNodes).map(n => render(n))}
        </Board>
      )),
      type: SkillTreeType,
      treeNodes,
    } satisfies SkillTree2;
  });
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
        }, []),
      treeRowStyle: {
        margin: "25px auto"
      }
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
