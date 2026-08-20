<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { barColorsFor } from "../utils/chartColors";

// Register only what a horizontal bar chart needs, instead of pulling in
// the full chart.js/auto bundle (line/pie/radar controllers, legends we
// don't use, etc.) — keeps this route's chunk noticeably smaller.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps({
  labels: { type: Array, required: true },
  counts: { type: Array, required: true },
});

const canvasRef = ref(null);
let chart = null;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Highlight the current leader in amber, everyone else in teal — makes the
// "who's ahead" read at a glance, and re-colors live as the lead changes.
function barColors(counts) {
  return barColorsFor(counts, cssVar("--color-accent"), cssVar("--color-primary"));
}

function buildChart() {
  chart = new Chart(canvasRef.value, {
    type: "bar",
    data: {
      labels: props.labels,
      datasets: [
        {
          data: props.counts,
          backgroundColor: barColors(props.counts),
          borderRadius: 6,
          maxBarThickness: 34,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 550, easing: "easeOutQuart" },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0, color: cssVar("--color-ink-soft") },
          grid: { color: cssVar("--color-line") },
        },
        y: {
          grid: { display: false },
          ticks: { color: cssVar("--color-ink"), font: { weight: 500 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cssVar("--color-ink"),
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const value = ctx.parsed.x;
              const pct = total ? Math.round((value / total) * 100) : 0;
              return `${value} vote${value === 1 ? "" : "s"} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

onMounted(buildChart);
onBeforeUnmount(() => chart?.destroy());

watch(
  () => [props.labels, props.counts],
  () => {
    if (!chart) return;
    chart.data.labels = props.labels;
    chart.data.datasets[0].data = props.counts;
    chart.data.datasets[0].backgroundColor = barColors(props.counts);
    chart.update();
  },
  { deep: true }
);
</script>

<template>
  <div class="chart-wrap">
    <canvas
      ref="canvasRef"
      role="img"
      :aria-label="`Bar chart of vote counts. ${labels.map((l, i) => `${l}: ${counts[i]} votes`).join('. ')}`"
    ></canvas>
  </div>
</template>
