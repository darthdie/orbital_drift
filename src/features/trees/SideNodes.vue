<template>
    <span :class="classes">
        <Nodes/>
        <Links v-if="branches" :links="unref(branches)" />
    </span>
</template>

<script setup lang="tsx">
import { computed, MaybeRef, unref } from 'vue';
import { TreeBranch, TreeNode } from './tree';
import { render } from "../../util/vue";
import Links from "features/links/Links.vue";

const props = defineProps<{
    nodes: MaybeRef<TreeNode[]>;
    classes?: MaybeRef<Record<string, boolean>>;
    branches?: MaybeRef<TreeBranch[]>;
}>();

const classes = computed(() => ({
    small: true,
    ...unref(props.classes)
}))

const Nodes = () => <>
 {unref(props.nodes).map(node => render(node))}
</>;
</script>

<style scoped>
:deep(.treeNode) {
   margin-right: 4px;
}
.small :deep(.treeNode) {
    height: 60px;
    width: 60px;
}

.small :deep(.treeNode) > *:first-child {
    font-size: 30px;
}
</style>
