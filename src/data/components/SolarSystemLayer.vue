<template>
    <div id="circle-orbit-container">
        <div id="sun"></div>

        <div id="mercury"></div>
        <div id="venus"></div>
        <div id="earth"></div>
        <div id="mars"></div>
        <div id="jupiter"></div>
        <div id="saturn"></div>
        <div id="uranus"></div>
        <div id="neptune"></div>
    </div>
    <RightNodes v-if="rightSideNodes" />
    <Links v-if="branches" :links="unref(branches)" />
</template>

<script setup lang="tsx">
import { TreeNode, TreeBranch } from "features/trees/tree";
import { render } from "util/vue";
import { MaybeRef, unref } from "vue";

const props = defineProps<{
    rightSideNodes?: MaybeRef<TreeNode[]>;
    branches?: MaybeRef<TreeBranch[]>;
}>();

const RightNodes = () => props.rightSideNodes == null ? <></> :
    <span class="side-nodes small">
        {unref(props.rightSideNodes).map(node => render(node))}
    </span>;
</script>

<style>
/* Animation times to simulate irl orbits */
:root {
    --base-orbit-time: 8; /* number of seconds for mercury, the fastest one */
    --mercury-conversion: calc(88 / var(--base-orbit-time)); /* 8.8 currently */

    /* irl_orbit_time / conversion */
    --large-planet-time-divisor: 4;
    --mercury-time: calc(88s / var(--mercury-conversion));
    --venus-time: calc(225s / var(--mercury-conversion));
    --earth-time: calc(365s / var(--mercury-conversion));
    --mars-time: calc(687s / var(--mercury-conversion));
    --jupiter-time: calc(calc(4333s / var(--large-planet-time-divisor)) / var(--mercury-conversion));
    --saturn-time: calc(calc(10759s / var(--large-planet-time-divisor)) / var(--mercury-conversion));
    --uranus-time: calc(calc(30687s / var(--large-planet-time-divisor)) / var(--mercury-conversion));
    --neptune-time: calc(calc(60190s / var(--large-planet-time-divisor)) / var(--mercury-conversion));

    --earth-planet-size: 35px;
    --mercury-planet-size: calc(var(--earth-planet-size) / 3); /* 1/3 of earth */
    --venus-planet-size: calc(var(--earth-planet-size) * 0.8); /* slight smaller than earth */
    --mars-planet-size: calc(var(--earth-planet-size) / 2);
    --jupiter-planet-size: calc(var(--earth-planet-size) * 4); /* 11x earth */
    --saturn-planet-size: calc(var(--earth-planet-size) * 3); /* 9x earth */
    --uranus-planet-size: calc(var(--earth-planet-size) * 2); /* 4x earth */
    --neptune-planet-size: calc(var(--earth-planet-size) * 1.9); /* slightly smaller than uranus */
}

/* Mercury = (earth / 3) =  */

</style>

<style scoped>
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


/* ---------- Container for the orbiting circles animation ---------- */


@property --angle {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}

@keyframes revolve {
  from { --angle: 0deg; }
  to { --angle: 360deg; }
}

#circle-orbit-container {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    margin: 0;

    > div {
        grid-area: 1/1;
    }
}

#sun {
    border-radius: 100%;
    background-color: #FFCC33;
    padding: 30px;

    box-shadow: -4px -4px 4px rgba(0, 0, 0, 0.25) inset, 0 0 20px #FFCC33;
}

#mercury {
    --amplitude: 60px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--mercury-time) linear infinite;

    height: var(--mercury-planet-size);
    width: var(--mercury-planet-size);
    border-radius: 100%;
    background-color: #8c8c94;
}

#venus {
    --amplitude: 100px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--venus-time) linear infinite;

    height: var(--venus-planet-size);
    width: var(--venus-planet-size);
    border-radius: 100%;
    background-color: #4A437F;
}

#earth {
    --amplitude: 150px;
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
    --amplitude: 195px;
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
    --amplitude: 295px;
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
    --amplitude: 440px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--saturn-time) linear infinite;

    height: var(--saturn-planet-size);
    width: var(--saturn-planet-size);
    border-radius: 100%;
    background-color:#c3924f;
}

#uranus {
    --amplitude: 550px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--uranus-time) linear infinite;

    height: var(--uranus-planet-size);
    width: var(--uranus-planet-size);
    border-radius: 100%;
    background-color:#c6d3e3;
}

#neptune {
    --amplitude: 635px;
    --x: calc(cos(var(--angle)) * var(--amplitude));
    --y: calc(sin(var(--angle)) * var(--amplitude));
    translate: var(--x) var(--y);
    animation: revolve var(--neptune-time) linear infinite;

    height: var(--neptune-planet-size);
    width: var(--neptune-planet-size);
    border-radius: 100%;
    background-color:#274687;
}
</style>
