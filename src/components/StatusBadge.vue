<script setup>
defineProps({
  text: { type: String, required: true },
  // "positive" (green, pulsing) | "neutral" (grey, static) | "warn" (amber, pulsing)
  tone: { type: String, default: "neutral", validator: (v) => ["positive", "neutral", "warn"].includes(v) },
});

const toneClass = {
  positive: "status-badge--open",
  neutral: "status-badge--closed",
  warn: "status-badge--warn",
};
</script>

<template>
  <span class="status-badge" :class="toneClass[tone]">
    <span class="status-badge__dot" aria-hidden="true"></span>
    {{ text }}
  </span>
</template>
