<template>
  <div
    v-if="startPos && endPos"
    class="html-line"
    :style="lineStyle"
  ></div>
</template>

<script setup lang="ts">
import { FeatureNode } from 'game/layers';
import { computed, CSSProperties, nextTick, watch } from 'vue';
import { Link } from './links';

const props = defineProps<{
    link: Link;
    startNode: FeatureNode;
    endNode: FeatureNode;
    boundingRect: DOMRect | undefined;
}>();

const startPos = computed(() => {
        if (!props.boundingRect) {
        return null;
    }
    console.log({ rect: props.boundingRect.x, y: props.boundingRect.y })
    const r = props.startNode.rect;
const boundingRect = props.boundingRect ?? {x: 0, y: 0};
  return {
    x: r.x + r.width / 2 - boundingRect.x + (props.link.offsetStart?.x || 0),
    y: r.y + r.height / 2 - boundingRect.y + (props.link.offsetStart?.y || 0),
  };
});

const endPos = computed(() => {
    if (!props.boundingRect) {
        return null;
    }
    const r = props.endNode.rect;
const boundingRect = props.boundingRect ?? {x: 0, y: 0};
  return {
    x: r.x + r.width / 2 - boundingRect.x + (props.link.offsetEnd?.x || 0),
    y: r.y + r.height / 2 - boundingRect.y + (props.link.offsetEnd?.y || 0),
  };
});

const lineStyle = computed(() => {
  if (!startPos.value || !endPos.value) return {};

  const dx = endPos.value.x - startPos.value.x;
  const dy = endPos.value.y - startPos.value.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: `${length}px`,
    height: '2px',
    backgroundColor: 'black',
    transform: `translate(${startPos.value.x}px, ${startPos.value.y}px) rotate(${angleDeg}deg)`,
    transformOrigin: '0 0',
    pointerEvents: 'none',
    zIndex: 0,
  } as CSSProperties;
});

</script>

<style scoped>

</style>
