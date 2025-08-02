<template>
    <div class="mb-6">
        <div class="mb-2">
            <h2>{{header}}</h2>
        </div>
        <div class="mb-4">
            <hr class="section-divider" />
        </div>

        <slot></slot>
    </div>
</template>

<script setup lang="tsx">
const { header } = defineProps<{header: string}>();
</script>