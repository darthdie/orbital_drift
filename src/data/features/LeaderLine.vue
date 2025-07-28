<template>
</template>

<script setup lang="tsx">
import LeaderLine from 'leader-line-vue';
// import { useQuerySelector } from '../use-query-selector.js'
import { computed, reactive, Ref, ref, watch, watchEffect } from 'vue';
import { useMutationObserver } from '@vueuse/core';
import linemate from "linemate";
import LinkerLine from "linkerline";

// const props = defineProps<{
//     nodes: MaybeRef<VueFeature[][]>;
//     branches?: MaybeRef<SkillTreeBranch[]>;
//     treeRowStyle?: MaybeRef<CSSProperties>;
// }>();

// const Nodes = () => unref(props.nodes).map(nodes => {
//     const styles = props.treeRowStyle ? unref(props.treeRowStyle) : "margin: 50px auto;";
//     return <span class="row tree-row" style={styles}>
//         {nodes.map(node => render(node))}
//     </span>;
// });

const props = defineProps<{
    elementOneId: string;
    elementTwoId: string;
    options?: Record<string, unknown>;
}>();

function useQuerySelector(selectors: string): Ref<HTMLElement | undefined> {
  const value = ref<HTMLElement | undefined>(document.head?.querySelector<HTMLElement>(selectors) ?? undefined)
  useMutationObserver(document.documentElement, (mutations) => {
    const latestMutation = mutations[0]
    if (latestMutation.type === 'childList')
      value.value = document?.querySelector<HTMLElement>(selectors) ?? undefined
  }, {
    childList: true,
    subtree: true,
  })
  return value
}

const elementOne = useQuerySelector(`#${props.elementOneId}`);
const elementTwo = useQuerySelector(`#${props.elementTwoId}`);

const loaded = ref(false)
watch([elementOne, elementTwo], () => {
    if (elementOne?.value && elementTwo?.value && loaded.value === false) {
        console.log({options: props.options})
        // LeaderLine.setLine(
        //     elementOne.value,
        //     elementTwo.value,
        //     props.options
        // );
        // linemate.confine("#pressure-tab")
        // linemate.connect([`#${props.elementOneId}`, `#${props.elementTwoId}`], {
        //     width: 10
        // })
        const line=new LinkerLine({
            //...OriginalClassProps,
            parent: document.querySelector("#pressure-tab") as HTMLElement,
            start: LinkerLine.PointAnchor(elementOne.value, {y: '100%'}),
            end: LinkerLine.PointAnchor(elementTwo.value, { y: '1%' }),
            ...props.options
        });

        loaded.value = true;
    }
});


// const Line = computed(() => {
//     console.log("??")
//     if (elementOne?.value && elementTwo?.value) {
//         console.log({
//             elementOne: elementOne.value, elementTwo: elementTwo.value
//         })
//         return LeaderLine.setLine(
//             elementOne.value,
//             elementTwo.value,
//             props.options
//         )
//     }

//     return <></>;
// })

</script>