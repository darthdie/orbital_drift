<template>
    <span class="celestial-body-icon">{{bodyIcon}}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type SupportedBodies = "Moon" | "Sun" | "Venus" | "Mercury" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Ceres" | "Earth" | "Palas" | "Juno" | "5 Astrea" | "Vesta" | "Palas" | "Pluto" | "Sedna" | "Eris" | "Makemake" | "Orcus" | "Ixion" | "Moon";
const BodyLetterMapping: Record<SupportedBodies, string> = {
    "Moon": "A",
    "Sun": "B",
    "Venus": "C",
    "Mercury": "D",
    "Mars": "E",
    "Jupiter": "F",
    "Saturn": "G",
    "Uranus": "H",
    // "Uranus_lower": "I",
    "Neptune": "J",
    "Ceres": "K",
    "Earth": "L",
    // "Earth": "M",
    "Palas": "N",
    "Juno": "O",
    "5 Astrea": "P",
    "Vesta": "Q",
    // "Palas": "R",
    "Pluto": "T",
    "Sedna": "U",
    "Eris": "V",
    "Makemake": "W",
    "Orcus": "X",
    "Ixion": "Y",
    // "Moon": "Z",
}

const { body } = defineProps<{ body: SupportedBodies }>();

const bodyIcon = computed(() => BodyLetterMapping[body]);

</script>
