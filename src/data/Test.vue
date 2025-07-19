<template>
  <panZoom class="panzoom">
    <div class="content">
      <svg :width="width" :height="height" class="svg-layer">
        <line
          v-for="(link, i) in links"
          :key="i"
          :x1="nodesMap[link.from].x + nodeW / 2"
          :y1="nodesMap[link.from].y + nodeH / 2"
          :x2="nodesMap[link.to].x + nodeW / 2"
          :y2="nodesMap[link.to].y + nodeH / 2"
          stroke="black"
          stroke-width="2"
        />
      </svg>

      <div
        v-for="node in nodes"
        :key="node.id"
        class="node"
        :style="{ left: node.x + 'px', top: node.y + 'px' }"
      >
        {{ node.label }}
      </div>
    </div>
  </panZoom>
</template>

<script setup>
import { reactive, computed } from 'vue'

const width = 800
const height = 600
const nodeW = 100
const nodeH = 50

const nodes = reactive([
  { id: 'a', label: 'Node A', x: 100, y: 100 },
  { id: 'b', label: 'Node B', x: 300, y: 200 },
  { id: 'c', label: 'Node C', x: 200, y: 350 },
])

const links = reactive([
  { from: 'a', to: 'b' },
  { from: 'a', to: 'c' },
])

const nodesMap = computed(() =>
  Object.fromEntries(nodes.map((node) => [node.id, node]))
)
</script>

<style scoped>
.panzoom {
  width: 100vw;
  height: 100vh;
  background: #fafafa;
  overflow: hidden;
}

.content {
  position: relative;
  width: 800px;
  height: 600px;
}

.svg-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.node {
  position: absolute;
  width: 100px;
  height: 50px;
  background: #90caf9;
  border-radius: 4px;
  border: 1px solid #42a5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  user-select: none;
  z-index: 1;
}
</style>
