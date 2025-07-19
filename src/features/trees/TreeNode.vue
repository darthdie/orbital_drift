<template>
    <wrapper>
        <button
            :style="styles"
            :class="{
                treeNode: true,
                can: unref(canClick)
            }"
            @click="e => emits('click', e)"
            @mousedown="start"
            @mouseleave="stop"
            @mouseup="stop"
            @touchstart.passive="start"
            @touchend.passive="stop"
            @touchcancel.passive="stop"
        >
            <Component />
        </button>
    </wrapper>
</template>

<script setup lang="tsx">
import { MaybeGetter } from "util/computed";
import { render, Renderable, setupHoldToClick } from "util/vue";
import { computed, MaybeRef, reactive, unref } from "vue";

const props = defineProps<{
    canClick?: MaybeRef<boolean>;
    display?: MaybeGetter<Renderable>;
    color?: MaybeRef<string>;
    glowColor?: MaybeRef<string | null>;
    wrapper?: MaybeGetter<Renderable>;
}>();

const emits = defineEmits<{
    (e: "click", event?: MouseEvent | TouchEvent): void;
    (e: "hold"): void;
}>();

const Component = () => props.display == null ? <></> :
    render(props.display, el => <div>{el}</div>);

const wrapper = computed(() => props.wrapper ?? <div></div>);

const { start, stop } = setupHoldToClick(() => emits("hold"));

const styles = computed(() => {
    const glowColor = unref(props.glowColor);
    return {
        backgroundColor: unref(props.color),
        boxShadow: glowColor ? `-4px -4px 4px rgba(0, 0, 0, 0.25) inset, 0 0 20px ${glowColor}` : 'none'
    };
})

</script>

<style scoped>
.treeNode {
    height: 100px;
    width: 100px;
    border: 2px solid rgba(0, 0, 0, 0.125);
    border-radius: 50%;
    padding: 0;
    margin: 0 10px 0 10px;
    font-size: 40px;
    color: rgba(0, 0, 0, 0.5);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.25);
    display: flex;
}

.treeNode > * {
    pointer-events: none;
}
</style>
