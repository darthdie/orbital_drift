<template>
    <div class="mb-6">
        <div class="mb-2">
            <h2>{{header}}</h2>
        </div>
        <div class="mb-4">
            <hr :style="dividerStyle" />
        </div>

        <slot></slot>
    </div>
</template>

<script setup lang="tsx">
import { CSSProperties, reactive } from 'vue';

const { header,  } = defineProps<{header: string}>();

const dividerStyle = reactive<CSSProperties>({
    background: "#99E1D9",
    width: "128px",
    margin: "auto",
    height: "2px"
});
</script>
