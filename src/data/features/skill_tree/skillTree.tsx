import { noPersist, Persistent, persistent } from "game/persistence";
import { unref, MaybeRef, MaybeRefOrGetter, CSSProperties } from "vue";
import { Renderable, VueFeature, vueFeatureMixin, VueFeatureOptions } from "util/vue";
import { Link } from "features/links/links";
import { MaybeGetter, processGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import SkillTreeVue from './SkillTree.vue';
import SkillTreeNodeVue from './SkillTreeNode.vue';
import { createBooleanRequirement } from "game/requirements";

export const SkillTreeNodeType = Symbol("SkillTreeNode");
export const SkillTreeType = Symbol("SkillTree");

type SkillTreeNodeRequirementNode = VueFeature & { bought: Persistent<boolean> };
export function createSkillTreeNodeRequirement(nodes: SkillTreeNodeRequirementNode | SkillTreeNodeRequirementNode[]) {
  const processedNodes = Array.isArray(nodes) ? nodes : [nodes];

  return createBooleanRequirement(() => processedNodes.every(n => n.bought.value));
}

/**
 * An object that configures a {@link TreeNode}.
 */
export interface SkillTreeNodeOptions extends VueFeatureOptions {
  /** Whether or not this tree node can be clicked. */
  canClick?: MaybeRefOrGetter<boolean>;
  /** The background color for this node. */
  color?: MaybeRefOrGetter<string>;
  // /** The label to display on this tree node. */
  display?: MaybeGetter<Renderable>;
  /** The color of the glow effect shown to notify the user there's something to do with this node. */
  glowColor?: MaybeRefOrGetter<string>;
  /** A function that is called when the tree node is clicked. */
  onClick?: (e?: MouseEvent | TouchEvent) => void;
  /** A function that is called when the tree node is held down. */
  onHold?: VoidFunction;
  wrapper?: MaybeGetter<Renderable>;
}

/**
 * The properties that are added onto a processed {@link TreeNodeOptions} to create an {@link TreeNode}.
 */
export interface SkillTreeNode extends VueFeature {
  /** Whether or not this tree node can be clicked. */
  canClick?: MaybeRef<boolean>;
  /** The background color for this node. */
  color?: MaybeRef<string>;
  /** The label to display on this tree node. */
  display?: MaybeGetter<Renderable>;
  /** The color of the glow effect shown to notify the user there's something to do with this node. */
  glowColor?: MaybeRef<string>;
  /** A function that is called when the tree node is clicked. */
  onClick?: (e?: MouseEvent | TouchEvent) => void;
  /** A function that is called when the tree node is held down. */
  onHold?: VoidFunction;
  /** A symbol that helps identify features of the same type. */
  type: typeof SkillTreeNodeType;
  bought: Persistent<boolean>;
}

/**
 * Lazily creates a tree node with the given options.
 * @param optionsFunc Tree Node options.
 */
export function createSkillTreeNode<T extends SkillTreeNodeOptions>(optionsFunc?: () => T) {
  return createLazyProxy(() => {
    const options = optionsFunc?.() ?? ({} as T);
    const { canClick, color, display, glowColor, onClick, onHold, wrapper, ...props } = options;

    const bought = persistent<boolean>(false);

    const treeNode = {
      bought,
      type: SkillTreeNodeType,
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeNodeOptions>),
      ...vueFeatureMixin("skillTreeNode", options, () => (
        <SkillTreeNodeVue
          canClick={treeNode.canClick}
          onClick={treeNode.onClick}
          onHold={treeNode.onHold}
          color={treeNode.color}
          glowColor={treeNode.glowColor}
          display={treeNode.display}
          wrapper={treeNode.wrapper}
        ></SkillTreeNodeVue>
      )),
      canClick: processGetter(canClick) ?? true,
      color: processGetter(color),
      display,
      glowColor: processGetter(glowColor),
      wrapper,
      onClick:
        onClick == null
          ? undefined
          : function (e) {
            if (unref(treeNode.canClick) !== false) {
              onClick.call(treeNode, e);
            }
          },
      onHold:
        onHold == null
          ? undefined
          : function () {
            if (unref(treeNode.canClick) !== false) {
              onHold.call(treeNode);
            }
          }
    } satisfies SkillTreeNode;

    return treeNode;
  });
}

export interface SkillTreeBranch extends Omit<Link, "startNode" | "endNode"> {
  startNode: VueFeature;
  endNode: VueFeature;
}

/**
 * An object that configures a {@link Tree}.
 */
export interface SkillTreeOptions extends VueFeatureOptions {
  /** The nodes within the tree, in a 2D array. */
  nodes: MaybeRefOrGetter<VueFeature[][]>;
  /** The branches between nodes within this tree. */
  branches?: MaybeRefOrGetter<SkillTreeBranch[]>;
  /** A function that is called when a node within the tree is reset. */
  onReset?: (node: SkillTreeNode) => void;
  treeRowStyle?: MaybeRefOrGetter<CSSProperties>;
}

export interface SkillTree extends VueFeature {
  /** The nodes within the tree, in a 2D array. */
  nodes: MaybeRef<VueFeature[][]>;
  /** The branches between nodes within this tree. */
  branches?: MaybeRef<SkillTreeBranch[]>;
  /** The link objects for each of the branches of the tree.  */
  links: MaybeRef<Link[]>;
  /** A symbol that helps identify features of the same type. */
  type: typeof SkillTreeType;
}

/**
 * Lazily creates a tree with the given options.
 * @param optionsFunc Tree options.
 */
export function createSkillTree<T extends SkillTreeOptions>(optionsFunc: () => T) {
  return createLazyProxy(() => {
    const options = optionsFunc();
    const {
      branches: _branches,
      nodes,
      onReset,
      style: _style,
      treeRowStyle,
      ...props
    } = options;

    const style = processGetter(_style);
    options.style = () => ({ position: "static", ...(unref(style) ?? {}) });

    const branches = _branches == null ? undefined : processGetter(_branches);

    const tree = {
      type: SkillTreeType,
      ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeOptions>),
      ...vueFeatureMixin("skill-tree", options, () => (
        <SkillTreeVue
          nodes={tree.nodes}
          branches={tree.branches}
          treeRowStyle={tree.treeRowStyle}
        />
      )),
      branches,

      nodes: processGetter(nodes),

      links: branches == null ? [] : noPersist(branches),
      treeRowStyle: unref(processGetter(treeRowStyle)),
    } satisfies SkillTree;

    return tree;
  });
}