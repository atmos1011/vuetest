<script setup>
const props = defineProps({
  tone: { type: String, default: "error", validator: (v) => ["error", "success"].includes(v) },
  icon: { type: String, default: "" },
});

const defaultIcon = props.tone === "error" ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill";
</script>

<template>
  <div class="alert-tally" :class="tone === 'error' ? 'alert-tally--error' : 'alert-tally--success'" role="alert">
    <i class="bi" :class="icon || defaultIcon" aria-hidden="true"></i>
    <span><slot /></span>
  </div>
</template>
