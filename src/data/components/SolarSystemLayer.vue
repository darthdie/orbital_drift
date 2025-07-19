<template>
    <div id="circle-orbit-container" ref="orbitContainer">
        <div id="sun" ref="sun"></div>
        <div id="mercury" ref="mercury" v-if="mercuryLayer.unlocked.value"></div>
        <div id="venus" ref="venus" v-if="venusLayer.unlocked.value"></div>
        <!-- <div id="earth" ref="earth"></div> -->
        <!-- <div id="mars" ref="mars"></div> -->
        <!-- <div id="jupiter" ref="jupiter"></div> -->
        <!-- <div id="saturn" ref="saturn"></div> -->
        <!-- <div id="uranus" ref="uranus"></div> -->
        <!-- <div id="neptune" ref="neptune"></div> -->
    </div>
    <RightNodes v-if="rightSideNodes" />
    <Links v-if="branches" :links="unref(branches)" />
</template>

<script setup lang="tsx">
import { TreeNode, TreeBranch } from "features/trees/tree";
import { render } from "util/vue";
import { computed, MaybeRef, onMounted, Ref, ref, unref } from "vue";
import Links from "features/links/Links.vue";
import mercuryLayer from '../layers/mercury';
import venusLayer from '../layers/venus';

const props = defineProps<{
    rightSideNodes?: MaybeRef<TreeNode[]>;
    branches?: MaybeRef<TreeBranch[]>;
}>();

const RightNodes = () => props.rightSideNodes == null ? <></> :
    <span class="side-nodes small">
        {unref(props.rightSideNodes).map(node => render(node))}
    </span>;

const orbitContainer = ref<HTMLDivElement | null>(null);
const mercury = ref<HTMLDivElement | null>(null);
const venus = ref<HTMLDivElement | null>(null);
const earth = ref<HTMLDivElement | null>(null);
const mars = ref<HTMLDivElement | null>(null);
const jupiter = ref<HTMLDivElement | null>(null);
const sun = ref<HTMLDivElement | null>(null);
const saturn = ref<HTMLDivElement | null>(null);
const uranus = ref<HTMLDivElement | null>(null);
const neptune = ref<HTMLDivElement | null>(null);

interface PlanetDefinition {
    element: Ref<HTMLDivElement | null>;
    orbitRadius: number;
    orbitTime: number;
    initialAngle: number;
}

function calculateOrbitTime(daysPerYear: number) {
    const baseOrbitTime = 3; // based on mercury, to keep a vaguely relative orbit time
    const mercuryConversion = 88 / baseOrbitTime;
    const extraDivisor = daysPerYear > 1000 ? 4 : 1; // otherwise the outer planets don't move enough to be visually interesting

    // derive time based on number of irl days per year and mercury computed time
    return ((daysPerYear / extraDivisor) / mercuryConversion) * 1000;
}

function calculateInitialAngle(index: number) {
    return (index / 8) * 2 * Math.PI;
}

const planets: PlanetDefinition[] = [
    {
        element: mercury,
        orbitRadius: 235,
        orbitTime: calculateOrbitTime(88),
        initialAngle: calculateInitialAngle(0)
    },
    {
        element: venus,
        orbitRadius: 280,
        orbitTime: calculateOrbitTime(225),
        initialAngle: calculateInitialAngle(1)
    },
    {
        element: earth,
        orbitRadius: 330,
        orbitTime: calculateOrbitTime(365),
        initialAngle: calculateInitialAngle(2)
    },
    {
        element: mars,
        orbitRadius: 380,
        orbitTime: calculateOrbitTime(687),
        initialAngle: calculateInitialAngle(3)
    },
    {
        element: jupiter,
        orbitRadius: 480,
        orbitTime: calculateOrbitTime(4333),
        initialAngle: calculateInitialAngle(4)
    },
    {
        element: saturn,
        orbitRadius: 625,
        orbitTime: calculateOrbitTime(10759),
        initialAngle: calculateInitialAngle(5)
    },
    {
        element: uranus,
        orbitRadius: 740,
        orbitTime: calculateOrbitTime(30687),
        initialAngle: calculateInitialAngle(6)
    },
    {
        element: neptune,
        orbitRadius: 830,
        orbitTime: calculateOrbitTime(60190),
        initialAngle: calculateInitialAngle(7)
    }
];

onMounted(() => {
    let lastTimestamp: any = null;
    let startTime: number | null = null;
    let pausedTime = 0;

    function getSunCenter() {
        if (!sun.value || !orbitContainer.value) {
            return null;

        }
        const sunRect = sun.value.getBoundingClientRect();
        const containerRect = orbitContainer.value.getBoundingClientRect();
        return {
            x: sunRect.left - containerRect.left + sunRect.width / 2,
            y: sunRect.top - containerRect.top + sunRect.height / 2,
        };
    }

    function animate(timestamp: number) {
        if (!startTime) {
            startTime = timestamp;
        }

        if (lastTimestamp && timestamp < lastTimestamp) {
            pausedTime += lastTimestamp - timestamp;
        }

        const elapsed = timestamp - startTime - pausedTime;

        const sunCenter = getSunCenter();
        if (!sunCenter) {
            requestAnimationFrame(animate);
            return;
        }

        planets.forEach(planet => {
            if (!planet.element.value) {
                return;
            }

            const orbitFraction = (elapsed % planet.orbitTime) / planet.orbitTime;
            const angle = (orbitFraction * 2 * Math.PI) + planet.initialAngle;

            const x = sunCenter.x + planet.orbitRadius * Math.cos(angle) - planet.element.value!.offsetWidth / 2;
            const y = sunCenter.y + planet.orbitRadius * Math.sin(angle) - planet.element.value!.offsetHeight / 2;

            planet.element.value!.style.transform = `translate(${x}px, ${y}px)`;
        });

        lastTimestamp = timestamp;
        requestAnimationFrame(animate);
    }

    function initializePositions() {
        const sunCenter = getSunCenter();
        if (!sunCenter) {
            return;
        }

        planets.forEach(planet => {
            if (!planet.element.value) {
                return;
            }

            const x = sunCenter.x + planet.orbitRadius * Math.cos(planet.initialAngle) - planet.element.value!.offsetWidth / 2;
            const y = sunCenter.y + planet.orbitRadius * Math.sin(planet.initialAngle) - planet.element.value!.offsetHeight / 2;
            planet.element.value!.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            lastTimestamp = null;
        }
    });

    initializePositions();
    requestAnimationFrame(animate);
});

</script>

<style>
:root {
    --earth-planet-size: 35px;
    /* 1/3 of earth */
    --mercury-planet-size: calc(var(--earth-planet-size) / 3);
    /* slight smaller than earth */
    --venus-planet-size: calc(var(--earth-planet-size) * 0.8);
    --mars-planet-size: calc(var(--earth-planet-size) / 2);
    /* 11x earth */
    --jupiter-planet-size: calc(var(--earth-planet-size) * 4);
    /* 9x earth */
    --saturn-planet-size: calc(var(--earth-planet-size) * 3);
    /* 4x earth */
    --uranus-planet-size: calc(var(--earth-planet-size) * 2);
    /* slightly smaller than uranus */
    --neptune-planet-size: calc(var(--earth-planet-size) * 1.9);
    --sun-size: 190px;
}
</style>

<style scoped>
.resize-listener {
    position: absolute;
    top: 0;
    left: 0;
    z-index: -10;
    pointer-events: none;
    margin: 0;
    width: 100%;
    height: 100%;
}

.side-nodes {
    position: absolute;
    right: 15px;
    top: 65px;
}

.left-side-nodes :deep(.treeNode),
.side-nodes :deep(.treeNode) {
    margin: 20px auto;
}

.small :deep(.treeNode) {
    height: 60px;
    width: 60px;
}

.small :deep(.treeNode)>*:first-child {
    font-size: 30px;
}

#circle-orbit-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
}

#sun {
    border-radius: 100%;
    /* background-color: #FFCC33; */
    padding: var(--sun-size);
    box-shadow: -4px -4px 4px rgba(0, 0, 0, 0.25) inset, 0 0 20px #ff9800;
    position: absolute;
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(-60%, -50%);

    background: radial-gradient(circle, #ffecb3, #ff9800, #ff5722);
}

#circle-orbit-container>div:not(#sun) {
    position: absolute;
    transition: none !important;
    border-radius: 100%;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.2);
}

#mercury {
    height: var(--mercury-planet-size);
    width: var(--mercury-planet-size);
    /* background-color: #8c8c94; */
    background: radial-gradient(circle at 30% 30%, #d3d3d3, #8c8c94 60%, #3a3a3a);
}

#venus {
    height: var(--venus-planet-size);
    width: var(--venus-planet-size);
    /* background-color: #4A437F; */
    background: radial-gradient(circle at 35% 35%, #e3d9c6, #c9a76c 60%, #7c5c2f);
}

#earth {
    height: var(--earth-planet-size);
    width: var(--earth-planet-size);
    background:
        radial-gradient(circle at 50% 40%, #1e3c72 40%, transparent 60%),
        radial-gradient(circle at 70% 60%, #0a2549 30%, transparent 50%),
        radial-gradient(circle at 40% 40%, #2c5a1a 18%, transparent 25%),
        radial-gradient(circle at 60% 60%, #2e6b22 15%, transparent 22%),
        radial-gradient(circle at 45% 55%, #3c7f29 8%, transparent 12%),
        radial-gradient(circle at 70% 45%, #2c5a1a 10%, transparent 15%),
        radial-gradient(circle at center, rgba(102, 204, 255, 0.25) 55%, transparent 70%);
}

#mars {
    height: var(--mars-planet-size);
    width: var(--mars-planet-size);
    /* background-color: #c1440e; */
    background: radial-gradient(circle at 40% 40%, #f4a261, #e76f51 60%, #6a2e1f);
}

#jupiter {
    height: var(--jupiter-planet-size);
    width: var(--jupiter-planet-size);
    /* background-color: #d8ca9d; */
    background: radial-gradient(circle, #d2b48c 0%, #a0522d 60%, #5a3e26 100%);
}

/* #jupiter::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, 
      #d6a564 10%, 
      #b77a3c 15%, 
      #c48e48 20%, 
      #b77a3c 25%, 
      #d6a564 30%, 
      #b07c40 35%, 
      #a16e34 40%, 
      #c99e5b 45%, 
      #d6a564 50%, 
      #b77a3c 55%, 
      #c48e48 60%, 
      #b77a3c 65%, 
      #d6a564 70%, 
      #b07c40 75%, 
      #a16e34 80%, 
      #c99e5b 85%, 
      #d6a564 90%);
  filter: brightness(0.95) contrast(1.1);
  position: relative;
  overflow: hidden;
} */

#saturn {
    height: var(--saturn-planet-size);
    width: var(--saturn-planet-size);
    /* background-color: #c3924f; */
    background: radial-gradient(circle, #f6e27a 0%, #e0b94b 70%, #8c6917 100%);
}

#uranus {
    height: var(--uranus-planet-size);
    width: var(--uranus-planet-size);
    /* background-color: #c6d3e3; */
    background: radial-gradient(circle, #b0ffff 0%, #60d6d6 70%, #2b7a78 100%);
}

#neptune {
    height: var(--neptune-planet-size);
    width: var(--neptune-planet-size);
    /* background-color: #274687; */
    background: radial-gradient(circle, #6ca0dc 0%, #3b4cca 70%, #1b2a72 100%);
    /* box-shadow: 0 0 6px rgba(59, 76, 202, 0.4); */

}
</style>
