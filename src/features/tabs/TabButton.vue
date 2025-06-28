<template>
    <button @click="selectTab" class="tabButton" :style="styles" :class="{ active }">
        <Component />
    </button>
</template>

<script setup lang="ts">
import themes from "data/themes";
import { getNotifyStyle } from "game/notifications";
import settings from "game/settings";
import { MaybeGetter } from "util/computed";
import { render, Renderable } from "util/vue";
import { computed, CSSProperties, MaybeRef, unref } from "vue";

const props = defineProps<{
    display: MaybeGetter<Renderable>;
    glowColor?: MaybeRef<string>;
    active?: boolean;
    style?: MaybeRef<CSSProperties>;
}>();

const emit = defineEmits<{
    selectTab: [];
}>();

const Component = () => render(props.display);

const styles = computed(() => {
    console.log(props.style)
    return {
    ...props.style,
    ...glowColorStyle
}
});

const glowColorStyle = computed(() => {
    const color = unref(props.glowColor);
    if (color == null || color === "") {
        return {};
    }
    if (floating.value) {
        return getNotifyStyle(color);
    }
    return { boxShadow: `0px 9px 5px -6px ${color}` };
});

const floating = computed(() => {
    return themes[settings.theme].floatingTabs;
});

function selectTab() {
    emit("selectTab");
}
</script>

<style scoped>
.tabButton {
    background-color: transparent;
    color: var(--foreground);
    font-size: 20px;
    cursor: pointer;
    padding: 5px 20px;
    margin: 5px;
    border-radius: 5px;
    border: 2px solid;
    flex-shrink: 0;
    border-color: var(--layer-color);
}

.tabButton:hover {
    transform: scale(1.1, 1.1);
    text-shadow: 0 0 7px var(--foreground);
}

:not(.floating) > .tabButton {
    height: 50px;
    margin: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom-width: 4px;
    border-radius: 0;
    transform: unset;
}

:not(.floating) .tabButton:not(.active) {
    border-bottom-color: transparent;
}

.tabButton > * {
    pointer-events: none;
}
</style>
