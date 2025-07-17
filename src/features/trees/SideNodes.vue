<template>
    <span :class="classes">
        <Nodes/>
    </span>
</template>

<script setup lang="tsx">
import { computed, MaybeRef, unref } from 'vue';
import { TreeNode } from './tree';
import { render } from "../../util/vue";

const props = defineProps<{
    nodes: MaybeRef<TreeNode[]>;
    classes?: MaybeRef<Record<string, boolean>>;
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
/* .left-side-nodes {
    position: absolute;
    left: 15px;
    top: 65px;
}

.side-nodes {
    position: absolute;
    right: 15px;
    top: 65px;
}

.left-side-nodes :deep(.treeNode),
.side-nodes :deep(.treeNode) {
    margin: 20px auto;
}*/
:deep(.treeNode) {
   margin-right: 4px;
}
.small :deep(.treeNode) {
    height: 60px;
    width: 60px;
    transform: rotate(-90deg);
}

.small :deep(.treeNode) > *:first-child {
    font-size: 30px;
}
</style>
