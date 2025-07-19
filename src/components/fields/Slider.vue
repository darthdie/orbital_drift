<template>
    <div class="field">
        <span class="field-title" v-if="title">{{ title }}</span>
        <template v-if="displayTooltip">
            <Tooltip v-if="displayTooltip" :display="`${value}`" :class="{ fullWidth: !title }" :direction="Direction.Down">
                <input type="range" v-model="value" :min="min" :max="max" />
            </Tooltip>
        </template>

        <template v-if="!displayTooltip">
            <input type="range" v-model="value" :min="min" :max="max" />
        </template>
    </div>
</template>

<script setup lang="ts">
import "components/common/fields.css";
import Tooltip from "wrappers/tooltips/Tooltip.vue";
import { Direction } from "util/common";
import { computed } from "vue";

const { title, modelValue, min, max, displayTooltip = true } = defineProps<{
    title?: string;
    modelValue?: number;
    min?: number;
    max?: number;
    displayTooltip?: boolean
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: number): void;
}>();

const value = computed({
    get() {
        return String(modelValue ?? 0);
    },
    set(value: string) {
        emit("update:modelValue", Number(value));
    }
});
</script>

<style scoped>
.fullWidth {
    width: 100%;
}
</style>
