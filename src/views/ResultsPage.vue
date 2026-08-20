<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { getResults, closePoll, isPollCreator } from "../services/pollService";
import { watchPollResults } from "../services/signalr";
import { getLocalVote } from "../utils/voteRecord";
import LiveResultsChart from "../components/LiveResultsChart.vue";
import StatusBadge from "../components/StatusBadge.vue";
import AlertMessage from "../components/AlertMessage.vue";
import SkeletonBlock from "../components/SkeletonBlock.vue";

const props = defineProps({
  code: { type: String, required: true },
});

const loading = ref(true);
const loadError = ref("");

const question = ref("");
const options = ref([]);
const status = ref("open");
const counts = ref([]);

// "connecting" | "live" | "reconnecting" | "offline"
const connectionState = ref("connecting");

let liveConnection = null;

const totalVotes = computed(() => counts.value.reduce((a, b) => a + b, 0));
const isClosed = computed(() => status.value === "closed");
const localVoteIndex = computed(() => getLocalVote(props.code));

// The creator token was saved when this browser created the poll, so only the
// creator sees a Close button. The backend checks the token as well - this just
// avoids showing a button that would always fail for everyone else.
const canClose = computed(() => isPollCreator(props.code) && !isClosed.value);
const closing = ref(false);
const closeError = ref("");

async function handleClose() {
  if (closing.value) return;
  closing.value = true;
  closeError.value = "";
  try {
    const poll = await closePoll(props.code);
    status.value = poll.status;
  } catch (err) {
    closeError.value = err.message || "Couldn't close the poll. Please try again.";
  } finally {
    closing.value = false;
  }
}

const isPulsing = ref(false);
watch(totalVotes, () => {
  isPulsing.value = true;
  setTimeout(() => (isPulsing.value = false), 600);
});

function percentFor(count) {
  if (!totalVotes.value) return 0;
  return Math.round((count / totalVotes.value) * 100);
}

async function loadResults() {
  loading.value = true;
  loadError.value = "";
  try {
    const data = await getResults(props.code);
    question.value = data.question;
    options.value = data.options;
    status.value = data.status;
    counts.value = data.counts ?? new Array(data.options.length).fill(0);
  } catch (err) {
    loadError.value =
      err.status === 404
        ? "We couldn't find a poll with that code. Double-check the link."
        : err.message || "Couldn't load results.";
  } finally {
    loading.value = false;
  }
}

function connectLive() {
  liveConnection = watchPollResults(props.code, {
    onResults: (payload) => {
      if (Array.isArray(payload.counts)) counts.value = payload.counts;
      if (payload.status) status.value = payload.status;
    },
    onStateChange: (state) => {
      connectionState.value = state;
    },
  });
}

onMounted(async () => {
  await loadResults();
  if (!loadError.value) connectLive();
});

onBeforeUnmount(() => {
  liveConnection?.stop();
});

const connectionBadge = computed(() => {
  switch (connectionState.value) {
    case "live":
      return { text: "Live", tone: "positive" };
    case "reconnecting":
      return { text: "Reconnecting…", tone: "warn" };
    case "connecting":
      return { text: "Connecting…", tone: "warn" };
    default:
      return { text: "Updates paused", tone: "neutral" };
  }
});
</script>

<template>
  <div class="container-narrow py-5 px-3">
    <!-- ===== Loading ===== -->
    <div v-if="loading">
      <SkeletonBlock height="14px" width="100px" class="mb-3" />
      <SkeletonBlock height="32px" width="80%" class="mb-4" />
      <div class="surface-card p-4 p-md-5">
        <SkeletonBlock height="22px" width="140px" class="mb-4" />
        <SkeletonBlock height="280px" />
      </div>
    </div>

    <!-- ===== Load error ===== -->
    <div v-else-if="loadError" class="surface-card p-4 p-md-5 text-center">
      <i class="bi bi-exclamation-triangle-fill fs-2 mb-3 d-block" style="color: var(--color-danger)"></i>
      <h1 class="font-display fw-semibold mb-2" style="font-size: 1.3rem">
        {{ loadError }}
      </h1>
      <div class="d-flex justify-content-center gap-2 mt-4">
        <button type="button" class="btn-tally-primary" @click="loadResults">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Try again
        </button>
        <RouterLink to="/" class="btn-tally-ghost">Create a poll</RouterLink>
      </div>
    </div>

    <!-- ===== Results ===== -->
    <div v-else>
      <header class="mb-4">
        <div class="d-flex align-items-center flex-wrap gap-2 mb-2">
          <StatusBadge :text="isClosed ? 'Closed' : 'Open'" :tone="isClosed ? 'neutral' : 'positive'" />
          <StatusBadge :text="connectionBadge.text" :tone="connectionBadge.tone" />
          <span class="eyebrow">{{ code }}</span>
        </div>
        <h1 class="font-display fw-bold mb-0" style="font-size: 1.75rem">
          {{ question }}
        </h1>

        <!-- Only the browser that created the poll holds the creator token. -->
        <div v-if="canClose" class="mt-3">
          <button
            type="button"
            class="btn-tally-ghost"
            :disabled="closing"
            @click="handleClose"
          >
            <i class="bi bi-lock-fill" aria-hidden="true"></i>
            {{ closing ? "Closing…" : "Close this poll" }}
          </button>
          <p class="text-muted-soft mt-2 mb-0" style="font-size: 0.85rem">
            Closing stops new votes. The results stay visible.
          </p>
        </div>
        <AlertMessage v-if="closeError" tone="danger" class="mt-3">{{ closeError }}</AlertMessage>
      </header>

      <section class="surface-card p-4 p-md-5">
        <div class="d-flex align-items-baseline gap-2 mb-4" aria-live="polite">
          <span class="total-votes" :class="{ 'is-pulsing': isPulsing }">{{ totalVotes }}</span>
          <span class="text-ink-soft">{{ totalVotes === 1 ? "vote so far" : "votes so far" }}</span>
        </div>

        <LiveResultsChart :labels="options" :counts="counts" />

        <div class="mt-4">
          <div v-for="(opt, index) in options" :key="index" class="result-row">
            <span class="result-row__label">{{ opt }}</span>
            <span class="result-row__stats">{{ counts[index] ?? 0 }} · {{ percentFor(counts[index] ?? 0) }}%</span>
          </div>
        </div>
      </section>

      <div v-if="connectionState === 'offline'" class="mt-3">
        <AlertMessage tone="error" icon="bi-wifi-off">
          Live updates are paused. Refresh the page to see the latest votes.
        </AlertMessage>
      </div>

      <div class="mt-4">
        <RouterLink
          v-if="!isClosed && localVoteIndex === null"
          :to="{ name: 'vote-page', params: { code } }"
          class="btn-tally-primary"
        >
          Cast your vote
        </RouterLink>
        <p v-else-if="localVoteIndex !== null" class="text-ink-soft small mb-0">
          <i class="bi bi-check-circle-fill" style="color: var(--color-success)" aria-hidden="true"></i>
          You voted for "{{ options[localVoteIndex] }}"
        </p>
      </div>
    </div>
  </div>
</template>
