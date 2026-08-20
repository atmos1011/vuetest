<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <header class="app-header">
      <div class="container-narrow d-flex align-items-center justify-content-between py-3 px-3">
        <RouterLink to="/" class="brand-mark">
          <span class="brand-mark__glyph" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </span>
          Tally
        </RouterLink>
        <RouterLink to="/" class="btn-tally-ghost btn-sm py-1 px-3" style="font-size: 0.85rem">
          New poll
        </RouterLink>
      </div>
    </header>

    <main class="flex-grow-1">
      <RouterView v-slot="{ Component }">
        <Transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="text-center text-ink-soft small py-4">
      Built with ASP.NET Core, Vue &amp; SignalR — 45H Workshop 2026
    </footer>
  </div>
</template>
