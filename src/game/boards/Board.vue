<template>
    <panZoom
        selector=".stage"
        :options="{ initialZoom: 0.8, minZoom: 0.1, maxZoom: 10, zoomDoubleClickSpeed: 1 }"
        ref="stage"
        @init="onInit"
        @mousemove="(e: MouseEvent) => emit('drag', e)"
        @touchmove="(e: TouchEvent) => emit('drag', e)"
        @mouseleave="(e: MouseEvent) => emit('mouseLeave', e)"
        @mouseup="(e: MouseEvent) => emit('mouseUp', e)"
        @touchend.passive="(e: TouchEvent) => emit('mouseUp', e)"
    >
        <div
            class="event-listener"
            @mousedown="(e: MouseEvent) => emit('mouseDown', e)"
            @touchstart="(e: TouchEvent) => emit('mouseDown', e)"
        />
        <div class="stage" ref="actualStage">
            <LinksVue v-if="links" :links="unref(links)" ref="linksComponent"></LinksVue>
            <slot />
        </div>
    </panZoom>
</template>

<script setup lang="ts">
import type { PanZoom } from "panzoom";
import type { ComponentPublicInstance } from "vue";
import { computed, reactive, ref, unref } from "vue";
// Required to make sure panzoom component gets registered:
import "./board";
import { Link } from "features/links/links";
import LinksVue from "features/links/Links.vue";

const { links } = defineProps<{ links?: Link[] }>();

defineExpose({
    panZoomInstance: computed(() => stage.value?.panZoomInstance)
});
const emit = defineEmits<{
    (event: "drag", e: MouseEvent | TouchEvent): void;
    (event: "mouseDown", e: MouseEvent | TouchEvent): void;
    (event: "mouseUp", e: MouseEvent | TouchEvent): void;
    (event: "mouseLeave", e: MouseEvent | TouchEvent): void;
    (event: "zoom", e: Event): void;
}>();

const stage = ref<{ panZoomInstance: PanZoom } & ComponentPublicInstance<HTMLElement>>();
const actualStage = ref<HTMLElement>();
const linksComponent = ref<typeof LinksVue>();

function onInit(panzoomInstance: PanZoom) {
    panzoomInstance.setTransformOrigin(null as any);
    panzoomInstance.moveTo(stage.value?.$el.clientWidth / 3, 0)
}

</script>

<style scoped>
.event-listener {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.stage {
    transition-duration: 0s;
    width: 100%;
    height: 100%;
    pointer-events: none;
}
</style>

<style>
svg {
    overflow: visible;
}

.vue-pan-zoom-scene {
    width: 100%;
    height: 100%;
    cursor: grab;
}

.vue-pan-zoom-scene:active {
    cursor: grabbing;
}

.stage > * {
    pointer-events: initial;
}

/* "Only" child (excluding resize listener) */
.layer-tab > .vue-pan-zoom-item:first-child:nth-last-child(2) {
    width: calc(100% + 20px);
    height: calc(100% + 100px);
    margin: -50px -10px;
}

.board-node {
    position: absolute;
    top: 0;
    left: 50%;
    transition-duration: 0s;
}
</style>
game/boards/board
