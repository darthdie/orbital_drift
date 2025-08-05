<template>
    <button
        @click="e => emits('click', e)"
        @mousedown="start"
        @mouseleave="stop"
        @mouseup="stop"
        @touchstart.passive="start"
        @touchend.passive="stop"
        @touchcancel.passive="stop"
        v-bind="unref(dataAttributes)"
        :class="{
            clickable: true,
            can: unref(canClick),
            locked: !unref(canClick)
        }"
        :disabled="!unref(canClick)"
    >
        <Component />
    </button>
</template>

<script setup lang="tsx">
import "components/common/features.css";
import { MaybeGetter } from "util/computed";
import {
    render,
    Renderable,
    setupHoldToClick
} from "util/vue";
import type { Component, MaybeRef } from "vue";
import { computed, unref } from "vue";

const props = defineProps<{
    canClick: MaybeRef<boolean>;
    display?: MaybeGetter<Renderable>;
    dataAttributes?: MaybeRef<Record<string, string>>;
}>();

const dataAttributes = computed(() => {
    if (!props.dataAttributes) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(unref(props.dataAttributes)).map(([key, value]) => [`data-${key}`, value])
    )
})

const emits = defineEmits<{
    (e: "click", event?: MouseEvent | TouchEvent): void;
    (e: "hold"): void;
}>();

const Component = () => props.display == null ? <></> : render(props.display);

const { start, stop } = setupHoldToClick(() => emits("hold"));
</script>

<style scoped>
.clickable {
    min-height: 120px;
    width: 120px;
    font-size: 10px;
}

.clickable > * {
    pointer-events: none;
}

.repeatable .clickable {
    border: 0;
    height: 200px;
    width: 150px;
    box-sizing: border-box;
    .repeatable-content {
        padding-bottom: 22px;
    }
}

.sd-upgrade .clickable {
    height: 150px;
    width: 130px;
    border: 0;
    box-sizing: border-box;
}

.reset-button, .sd-upgrade, .repeatable {
    .clickable {
        &.locked {
            color: oklch(from var(--layer-color) calc(l + 0.3) c h);
        }

        &.can {
            color: oklch(from var(--layer-color) calc(l - 0.5) c h);
        }
    }
}

</style>
