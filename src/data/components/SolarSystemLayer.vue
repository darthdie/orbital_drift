<template>
    <div id="circle-orbit-container" ref="orbitContainer">
        <div id="sun" ref="sun"></div>
        <div id="mercury" ref="mercury"></div>
        <!-- <div id="venus" ref="venus"></div> -->
        <!-- <div id="venus"></div> -->
        <!-- <div id="earth"></div> -->
        <!-- <div id="mars"></div> -->
        <!-- <div id="jupiter"></div> -->
        <!-- <div id="saturn"></div> -->
        <!-- <div id="uranus"></div> -->
        <!-- <div id="neptune"></div> -->
    </div>
    <RightNodes v-if="rightSideNodes" />
    <Links v-if="branches" :links="unref(branches)" />
    <div ref="resizeListener" class="resize-listener" />
</template>

<script setup lang="tsx">
import { TreeNode, TreeBranch } from "features/trees/tree";
import { render } from "util/vue";
import { MaybeRef, nextTick, onMounted, ref, unref } from "vue";
import Links from "features/links/Links.vue";

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
const sun = ref<HTMLDivElement | null>(null);
const resizeObserver = new ResizeObserver(repositionSun);
const resizeListener = ref<Element | null>(null);

const planets = [
    {
        element: mercury,
        orbitRadius: 450,
        orbitTime: 3 * 1000,
        initialAngle: 1
    },
    // {
    //     element: venus,
    //     orbitRadius: 375,
    //     orbitTime: 8 * 1000,
    //     initialAngle: Math.PI / 2,
    //     initialTimeOffset: 0
    // }
];

onMounted(() => {
    const resListener = resizeListener.value;
    if (resListener != null) {
        resizeObserver.observe(resListener);
    }

    let lastTimestamp: any = null;
    let startTime: number | null = null;
    let pausedTime = 0;

    function getSunCenter() {
        const sunRect = sun.value!.getBoundingClientRect();
        const containerRect = orbitContainer.value!.getBoundingClientRect();
        return {
            x: sunRect.left - containerRect.left + sunRect.width / 2,
            y: sunRect.top - containerRect.top + sunRect.height / 2,
        };
    }

    function animate(timestamp: number) {
        if (!startTime) {
            startTime = timestamp;
        }

        // Adjust for pause duration
        if (lastTimestamp && timestamp < lastTimestamp) {
            pausedTime += lastTimestamp - timestamp;
        }

        const elapsed = timestamp - startTime - pausedTime;

        const sunCenter = getSunCenter();

        planets.forEach(planet => {
            // Calculate angle based on elapsed time and initial angle offset
            const orbitFraction = (elapsed % planet.orbitTime) / planet.orbitTime;
            const angle = (orbitFraction * 2 * Math.PI) + planet.initialAngle;

            // Calculate planet position
            const x = sunCenter.x + planet.orbitRadius * Math.cos(angle) - planet.element.value!.offsetWidth / 2;
            const y = sunCenter.y + planet.orbitRadius * Math.sin(angle) - planet.element.value!.offsetHeight / 2;

            // Set position with transform for GPU acceleration
            planet.element.value!.style.transform = `translate(${x}px, ${y}px)`;
        });

        lastTimestamp = timestamp;
        requestAnimationFrame(animate);
    }

    function initializePositions() {
        const sunCenter = getSunCenter();
        planets.forEach(planet => {
            const x = sunCenter.x + planet.orbitRadius * Math.cos(planet.initialAngle) - planet.element.value!.offsetWidth / 2;
            const y = sunCenter.y + planet.orbitRadius * Math.sin(planet.initialAngle) - planet.element.value!.offsetHeight / 2;
            planet.element.value!.style.transform = `translate(${x}px, ${y}px)`;
            // planet.element.value!.style.opacity = "1";
            console.log("placing!")
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log("pausing")
            // Pause time tracking by resetting lastTimestamp
            lastTimestamp = null;
        }
    });

    initializePositions();
    requestAnimationFrame(animate);

    // for (const planet of planets) {
    //     planet.initialTimeOffset = (planet.initialAngle / (2 * Math.PI)) * planet.orbitTime;
    // }

    // const sunRect = sun.value!.getBoundingClientRect();
    // const containerRect = orbitContainer.value!.getBoundingClientRect();

    // // Get the Sun's position relative to the container
    // const sunCenterX = sunRect.left - containerRect.left + sunRect.width / 2;
    // const sunCenterY = sunRect.top - containerRect.top + sunRect.height / 2;

    // const orbitStartTimestamp = Date.now();

    // function animateOrbit() {
    //     if (sun.value && orbitContainer.value) {
    //         for (const planet of planets) {
    //             if (!planet.element.value) {
    //                 continue;
    //             }
    //             const now = Date.now();
    //             const elapsed = now - orbitStartTimestamp;

    //             // Angle based on elapsed time (converted to radians)
    //             // const angle = (elapsed / planet.orbitTime) * 2 * Math.PI;
    //             // const angle = ((elapsed % planet.orbitTime) / planet.orbitTime) * 2 * Math.PI;
    //             // const adjustedElapsed = (elapsed - planet.initialTimeOffset + planet.orbitTime) % planet.orbitTime;
    //             // const angle = ((elapsed % planet.orbitTime) / planet.orbitTime) * 2 * Math.PI + (planet.initialAngle || 0);
    //             const adjustedElapsed = (elapsed - planet.initialTimeOffset + planet.orbitTime) % planet.orbitTime;
    //             // const angle = (adjustedElapsed / planet.orbitTime) * 2 * Math.PI;

    //                   const angle = (( adjustedElapsed % planet.orbitTime) / planet.orbitTime) * 2 * Math.PI;


    //             // Calculate the new position of the planet around the Sun
    //             const x = sunCenterX + planet.orbitRadius * Math.cos(angle) - planet.element.value.offsetWidth / 2;
    //             const y = sunCenterY + planet.orbitRadius * Math.sin(angle) - planet.element.value.offsetHeight / 2;

    //             // Update the planet's position using top and left
    //             // planet.element.value.style.left = `${x}px`;
    //             // planet.element.value.style.top = `${y}px`;
    //             planet.element.value.style.transform = `translate(${x}px, ${y}px)`;
    //         }
    //     }

    //     // Request the next frame to animate
    //     requestAnimationFrame(animateOrbit);
    // }

    // function positionPlanetsAtStart() {
    //     const sunRect = sun.value!.getBoundingClientRect();
    //     const containerRect = orbitContainer.value!.getBoundingClientRect();
    //     const sunCenterX = sunRect.left - containerRect.left + sunRect.width / 2;
    //     const sunCenterY = sunRect.top - containerRect.top + sunRect.height / 2;

    //     for (const planet of planets) {
    //         const planetRadius = planet.element.value!.offsetWidth / 2;

    //         const angle = planet.initialAngle;
    //         const x = sunCenterX + planet.orbitRadius * Math.cos(angle) - planetRadius;
    //         const y = sunCenterY + planet.orbitRadius * Math.sin(angle) - planetRadius;

    //         planet.element.value!.style.transform = `translate(${x}px, ${y}px)`;
    //     }
    // }

    // positionPlanetsAtStart();
    // requestAnimationFrame(animateOrbit);
});

// Ensure that the orbit container is positioned just slightly offscreen to the left.
function repositionSun() {
    if (!orbitContainer.value?.parentElement) {
        console.log("no parent");
        return;
    }

    const halfWidth = (orbitContainer.value?.parentElement?.clientWidth / 2) + 60;
    // orbitContainer.value.style.left = `-${halfWidth}px`;
    console.log("hi");
}

</script>

<style>
/* Animation times to simulate irl orbits */
:root {
    --base-orbit-time: 3;
    /* number of seconds for mercury, the fastest one */
    --mercury-conversion: calc(88 / var(--base-orbit-time));
    /*  currently 29.33 */

    /* irl_orbit_time / conversion */
    --large-planet-time-divisor: 4;
    /* --mercury-time: calc(88s / var(--mercury-conversion)); */
    --mercury-time: 3s;
    /* --venus-time: calc(225s / var(--mercury-conversion)); */
    --venus-time: 8s;
    /* --earth-time: calc(365s / var(--mercury-conversion)); */
    --earth-time: 12s;
    /* --mars-time: calc(687s / var(--mercury-conversion)); */
    --mars-time: 23s;
    /* --jupiter-time: calc(calc(4333s / var(--large-planet-time-divisor)) / var(--mercury-conversion)); */
    --jupiter-time: 37s;
    /* --saturn-time: calc(calc(10759s / var(--large-planet-time-divisor)) / var(--mercury-conversion)); */
    --saturn-time: 92s;
    /* --uranus-time: calc(calc(30687s / var(--large-planet-time-divisor)) / var(--mercury-conversion)); */
    --uranus-time: 262s;
    /* --neptune-time: calc(calc(60190s / var(--large-planet-time-divisor)) / var(--mercury-conversion)); */
    --neptune-time: 513s;

    --earth-planet-size: 35px;
    --mercury-planet-size: calc(var(--earth-planet-size) / 3);
    /* 1/3 of earth */
    --venus-planet-size: calc(var(--earth-planet-size) * 0.8);
    /* slight smaller than earth */
    --mars-planet-size: calc(var(--earth-planet-size) / 2);
    --jupiter-planet-size: calc(var(--earth-planet-size) * 4);
    /* 11x earth */
    --saturn-planet-size: calc(var(--earth-planet-size) * 3);
    /* 9x earth */
    --uranus-planet-size: calc(var(--earth-planet-size) * 2);
    /* 4x earth */
    --neptune-planet-size: calc(var(--earth-planet-size) * 1.9);
    /* slightly smaller than uranus */
    --sun-size: 190px;

    --planet-gap: 40px;
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
    width: 500px;
    height: 500px;
    overflow: visible;
}

#sun {
    border-radius: 100%;
    background-color: #FFCC33;
    padding: var(--sun-size);

    box-shadow: -4px -4px 4px rgba(0, 0, 0, 0.25) inset, 0 0 20px #FFCC33;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

#circle-orbit-container>div:not(#sun) {
    position: absolute;
    /* opacity: 0; */
    transition: none !important; /* prevent accidental animations */
}

#mercury {
    height: var(--mercury-planet-size);
    width: var(--mercury-planet-size);
    background-color: #8c8c94;
    border-radius: 100%;
    
}

#venus {
    height: var(--venus-planet-size);
    width: var(--venus-planet-size);
    background-color: #4A437F;
    border-radius: 100%;
}

#earth {
    --amplitude: 320px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--earth-time) linear infinite;

    height: var(--earth-planet-size);
    width: var(--earth-planet-size);
    border-radius: 100%;
    background-color: #384e1d;
}

#mars {
    --amplitude: 370px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--mars-time) linear infinite;

    height: var(--mars-planet-size);
    width: var(--mars-planet-size);
    border-radius: 100%;
    background-color: #c1440e;
}

#jupiter {
    --amplitude: 470px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--jupiter-time) linear infinite;

    height: var(--jupiter-planet-size);
    width: var(--jupiter-planet-size);
    border-radius: 100%;
    background-color: #d8ca9d;
}

#saturn {
    --amplitude: 620px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--saturn-time) linear infinite;

    height: var(--saturn-planet-size);
    width: var(--saturn-planet-size);
    border-radius: 100%;
    background-color: #c3924f;
}

#uranus {
    --amplitude: 735px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--uranus-time) linear infinite;

    height: var(--uranus-planet-size);
    width: var(--uranus-planet-size);
    border-radius: 100%;
    background-color: #c6d3e3;
}

#neptune {
    --amplitude: 830px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--neptune-time) linear infinite;

    height: var(--neptune-planet-size);
    width: var(--neptune-planet-size);
    border-radius: 100%;
    background-color: #274687;
}
</style>
