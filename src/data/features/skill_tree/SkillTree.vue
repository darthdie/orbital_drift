<template>
    <Nodes />
    <Links v-if="branches" :links="unref(branches)" />
</template>

<script setup lang="tsx">
import "components/common/table.css";
import Links from "features/links/Links.vue";
import { render, VueFeature } from "util/vue";
import { CSSProperties, MaybeRef, StyleValue, unref } from "vue";
import { SkillTreeBranch, SkillTreeNode } from "./skillTree";

const props = defineProps<{
    nodes: MaybeRef<VueFeature[][]>;
    branches?: MaybeRef<SkillTreeBranch[]>;
    treeRowStyle?: MaybeRef<CSSProperties>;
}>();

const Nodes = () => unref(props.nodes).map(nodes => {
    const styles = props.treeRowStyle ? unref(props.treeRowStyle) : "margin: 50px auto;";
    return <span class="row tree-row" style={styles}>
        {nodes.map(node => render(node))}
    </span>;
});

</script>

<style scoped>
/* .small :deep(.SkillTreeNode) {
    height: 60px;
    width: 60px;
}

.small :deep(.SkillTreeNode)>*:first-child {
    font-size: 30px;
} */
</style>
