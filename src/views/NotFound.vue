<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="container-narrow py-5 px-3 text-center">
    <div class="surface-card p-4 p-md-5">
      <p class="eyebrow mb-2">404</p>
      <h1 class="font-display fw-semibold mb-2" style="font-size: 1.5rem">Page not found</h1>
      <p class="text-ink-soft mb-4">The page you're looking for doesn't exist.</p>
      <RouterLink to="/" class="btn-tally-primary">Create a poll</RouterLink>
    </div>
  </div>
</template>
