<script setup>
defineProps({
  height: { type: String, default: "20px" },
  width: { type: String, default: "100%" },
});
</script>

<template>
  <div
    class="skeleton"
    :style="{ height, width }"
    role="status"
    aria-label="Loading"
  ></div>
</template>
