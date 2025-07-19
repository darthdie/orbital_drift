import { Visibility } from "features/feature";
import { createTree, createTreeNode } from "features/trees/tree";
import Board from "game/boards/Board.vue";
import { Persistent, persistent } from "game/persistence";
import {
    createBooleanRequirement,
    displayRequirements,
    payRequirements,
    Requirement,
    Requirements,
    requirementsMet
} from "game/requirements";
import { MaybeGetter, processGetter } from "util/computed";
import { createLazyProxy } from "util/proxies";
import {
    isJSXElement,
    Renderable,
    VueFeature,
    render,
    vueFeatureMixin,
    VueFeatureOptions
} from "util/vue";
import { computed, CSSProperties, unref } from "vue";
import Clickable from "features/clickables/Clickable.vue";
import { createLinks, Link } from "features/links/links";

const BlankSkillTreeNodeType = Symbol("BlankSkillTreeNode");
export const blankTreeNode = createTreeNode(() => ({
    visibility: Visibility.Hidden,
    type: BlankSkillTreeNodeType
}));

export const SkillTreeType = Symbol("SkillTree");

export interface SkillTreeNode extends VueFeature {
    bought: Persistent<boolean>;
    requirements: Requirements;
}

export interface SkillTree extends VueFeature {
    type: typeof SkillTreeType;
    treeNodes: Record<string, SkillTreeNode>;
}

export interface SkillTreeOptions extends VueFeatureOptions {
    rows: (string | typeof blankTreeNode)[][];
}

export interface SkillTreeNodeOptions extends VueFeatureOptions {
    requirements?: Requirements;
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

interface BoughtNodeRequirement extends Requirement {
    requiredNodes: string[];
    type: typeof BoughtNodeRequirementType;
}

const BoughtNodeRequirementType = Symbol("BoughtNodeRequirement");
export function createBoughtNodeRequirement(tree: SkillTree, requiredNodes: string[]) {
    const display = null;
    const requirement = () => requiredNodes.every(node => tree.treeNodes[node].bought.value);

    return createLazyProxy(() => {
        const partialDisplay =
            display == null ? undefined : typeof display === "function" ? display : () => display;
        return {
            requirementMet: processGetter(requirement),
            partialDisplay,
            display: display == null ? undefined : () => <>Req: {partialDisplay}</>,
            visibility: display == null ? Visibility.None : Visibility.Visible,
            requiresPay: false,
            requiredNodes,
            type: BoughtNodeRequirementType
        } satisfies BoughtNodeRequirement;
    });
}

export function createSkillTreeNodeOld<T extends SkillTreeNodeOptions>(
    optionsFunc: () => T
): SkillTreeNode {
    const bought = persistent<boolean>(false);
    return createLazyProxy(() => {
        const options = optionsFunc();
        const { requirements: _requirements, display: _display, ...props } = options;

        const requirements: Requirements = [
            createBooleanRequirement(() => !bought.value),
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
                    {description != null ? render(description, el => <div>{el}</div>) : null}
                    {effectDisplay != null ? <div>Currently: {render(effectDisplay)}</div> : null}
                    {bought.value || requirements.length < 2 ? null : (
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

        const node = {
            ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeNodeOptions>),
            display,
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
                if (!unref(node.canClick) == true) {
                    return;
                }

                bought.value = true;
                payRequirements(requirements);
            }
        } satisfies SkillTreeNode;

        return node;
    });
}

export function createSkillTreeOld<T extends SkillTreeOptions>(
    treeNodes: Record<string, SkillTreeNode>,
    optionsFunc?: () => T
): SkillTree {
    return createLazyProxy(() => {
        const options = optionsFunc?.() ?? ({} as T);
        const { rows, ...props } = options;

        for (let row = 0; row < rows.length; row++) {
            const columns = rows[row];

            const CELL_HEIGHT = 186;
            const yOffset = row > 0 ? `${row * CELL_HEIGHT}px` : "0px";

            for (let column = 0; column < columns.length; column++) {
                const cell = columns[column];
                if (typeof cell !== "string") {
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
                    position: "absolute",
                    transform: `translate(${offsetCss}, ${yOffset})`,
                    ...existingStyle
                };
                node.style = style;
            }
        }

        const links = computed(() =>
            Object.values(treeNodes).flatMap(node => {
                if (BlankSkillTreeNodeType in node) {
                    return [];
                }
                const requirements = Array.isArray(node.requirements)
                    ? node.requirements
                    : [node.requirements];
                const nodes: string[] = requirements.flatMap((r: any) => r.requiredNodes ?? []);

                if (nodes.length === 0) {
                    return [];
                }

                return nodes.map(requiredNodeName => {
                    const requiredNode = treeNodes[requiredNodeName];

                    const link: Link = {
                        startNode: { id: node.id },
                        endNode: { id: requiredNode.id }
                    };
                    return link;
                });
            })
        );

        return {
            ...(props as Omit<typeof props, keyof VueFeature | keyof SkillTreeOptions>),
            ...vueFeatureMixin("skill-tree", options, () => (
                <Board
                    style={{ height: "100%", display: "relative", overflow: "hidden" }}
                    links={links.value}
                >
                    {Object.values(treeNodes).map(n => (
                        <foreignObject>{render(n)}</foreignObject>
                    ))}
                </Board>
            )),
            type: SkillTreeType,
            treeNodes,
            links
        } satisfies SkillTree;
    });
}
