<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getPoll, submitVote } from "../services/pollService";
import { getLocalVote, recordLocalVote } from "../utils/voteRecord";
import StatusBadge from "../components/StatusBadge.vue";
import AlertMessage from "../components/AlertMessage.vue";
import SkeletonBlock from "../components/SkeletonBlock.vue";

const props = defineProps({
  code: { type: String, required: true },
});

const loading = ref(true);
const loadError = ref("");
const poll = ref(null);

const selectedIndex = ref(null);
const submitting = ref(false);
const submitError = ref("");

// If this device already voted (per local record), we short-circuit to the
// "you voted" view without waiting on a network round trip. The backend is
// still what actually prevents a second vote from being counted.
const localVotedIndex = ref(null);

const hasVoted = computed(() => localVotedIndex.value !== null);
const isClosed = computed(() => poll.value?.status === "closed");
const votingDisabled = computed(() => hasVoted.value || isClosed.value);

async function loadPoll() {
  loading.value = true;
  loadError.value = "";
  try {
    poll.value = await getPoll(props.code);
    localVotedIndex.value = getLocalVote(props.code);
  } catch (err) {
    loadError.value =
      err.status === 404
        ? "We couldn't find a poll with that code. Double-check the link."
        : err.message || "Couldn't load this poll.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadPoll);

function selectOption(index) {
  if (votingDisabled.value || submitting.value) return;
  selectedIndex.value = index;
}

async function castVote() {
  if (selectedIndex.value === null || votingDisabled.value) return;

  submitting.value = true;
  submitError.value = "";
  try {
    await submitVote(props.code, { optionIndex: selectedIndex.value });
    recordLocalVote(props.code, selectedIndex.value);
    localVotedIndex.value = selectedIndex.value;
  } catch (err) {
    if (err.code === "already_voted") {
      // Server says this voter already has a vote recorded (e.g. local
      // storage was cleared but the token/device is the same).
      recordLocalVote(props.code, selectedIndex.value);
      localVotedIndex.value = selectedIndex.value;
    } else if (err.code === "poll_closed" || err.status === 410 || err.status === 403) {
      // Poll was closed between loading the page and submitting the vote.
      // The backend answers 409 for this as well as for a duplicate vote,
      // which is why we branch on the error code rather than the status.
      poll.value = { ...poll.value, status: "closed" };
      submitError.value = "This poll closed while you were voting — your vote wasn't counted.";
    } else if (err.status === 409) {
      // A 409 we do not have a code for: treat it as already voted, which is
      // the only other thing the vote endpoint returns 409 for.
      recordLocalVote(props.code, selectedIndex.value);
      localVotedIndex.value = selectedIndex.value;
    } else {
      submitError.value = err.message || "Couldn't submit your vote. Please try again.";
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="container-narrow py-5 px-3">
    <!-- ===== Loading ===== -->
    <div v-if="loading">
      <SkeletonBlock height="14px" width="100px" class="mb-3" />
      <SkeletonBlock height="32px" width="80%" class="mb-4" />
      <div class="surface-card p-4 p-md-5">
        <SkeletonBlock height="48px" class="mb-2" />
        <SkeletonBlock height="48px" class="mb-2" />
        <SkeletonBlock height="48px" />
      </div>
    </div>

    <!-- ===== Load error (not found / network) ===== -->
    <div v-else-if="loadError" class="surface-card p-4 p-md-5 text-center">
      <i class="bi bi-exclamation-triangle-fill fs-2 mb-3 d-block" style="color: var(--color-danger)"></i>
      <h1 class="font-display fw-semibold mb-2" style="font-size: 1.3rem">
        {{ loadError }}
      </h1>
      <div class="d-flex justify-content-center gap-2 mt-4">
        <button type="button" class="btn-tally-primary" @click="loadPoll">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Try again
        </button>
        <RouterLink to="/" class="btn-tally-ghost">Create a poll</RouterLink>
      </div>
    </div>

    <!-- ===== Poll loaded ===== -->
    <div v-else>
      <header class="mb-4">
        <div class="d-flex align-items-center gap-2 mb-2">
          <StatusBadge :text="isClosed ? 'Closed' : 'Open for votes'" :tone="isClosed ? 'neutral' : 'positive'" />
          <span class="eyebrow">{{ code }}</span>
        </div>
        <h1 class="font-display fw-bold mb-0" style="font-size: 1.75rem">
          {{ poll.question }}
        </h1>
      </header>

      <!-- Already voted -->
      <section v-if="hasVoted" class="surface-card p-4 p-md-5">
        <div class="d-flex align-items-center gap-2 mb-4">
          <i class="bi bi-check-circle-fill fs-4" style="color: var(--color-success)" aria-hidden="true"></i>
          <h2 class="font-display fw-semibold mb-0" style="font-size: 1.2rem">
            Your vote is in
          </h2>
        </div>

        <div class="d-flex flex-column gap-2 mb-4">
          <div
            v-for="(opt, index) in poll.options"
            :key="index"
            class="vote-option"
            :class="{ 'vote-option--picked': index === localVotedIndex }"
          >
            <span class="vote-option__marker" aria-hidden="true">
              <i v-if="index === localVotedIndex" class="bi bi-check-lg"></i>
            </span>
            <span class="vote-option__label">{{ opt }}</span>
          </div>
        </div>

        <RouterLink :to="{ name: 'results-page', params: { code } }" class="btn-tally-primary">
          <i class="bi bi-bar-chart-fill" aria-hidden="true"></i>
          Watch live results
        </RouterLink>
      </section>

      <!-- Closed, never voted -->
      <section v-else-if="isClosed" class="surface-card p-4 p-md-5 text-center">
        <i class="bi bi-lock-fill fs-2 mb-3 d-block text-ink-soft" aria-hidden="true"></i>
        <h2 class="font-display fw-semibold mb-2" style="font-size: 1.2rem">
          This poll is closed
        </h2>
        <p class="text-ink-soft mb-4">The creator has stopped accepting new votes.</p>
        <RouterLink :to="{ name: 'results-page', params: { code } }" class="btn-tally-primary">
          <i class="bi bi-bar-chart-fill" aria-hidden="true"></i>
          See the results
        </RouterLink>
      </section>

      <!-- Voting form -->
      <section v-else class="surface-card p-4 p-md-5">
        <p class="text-ink-soft mb-3">Pick one option, then cast your vote.</p>

        <div class="d-flex flex-column gap-2 mb-4" role="radiogroup" :aria-label="poll.question">
          <button
            v-for="(opt, index) in poll.options"
            :key="index"
            type="button"
            class="vote-option"
            :class="{ 'is-selected': selectedIndex === index }"
            role="radio"
            :aria-checked="selectedIndex === index"
            :disabled="submitting"
            @click="selectOption(index)"
          >
            <span class="vote-option__marker" aria-hidden="true">
              <i v-if="selectedIndex === index" class="bi bi-check-lg"></i>
            </span>
            <span class="vote-option__label">{{ opt }}</span>
          </button>
        </div>

        <div v-if="submitError" class="mb-3">
          <AlertMessage tone="error">{{ submitError }}</AlertMessage>
        </div>

        <button
          type="button"
          class="btn-tally-primary w-100 w-sm-auto"
          :disabled="selectedIndex === null || submitting"
          @click="castVote"
        >
          <span
            v-if="submitting"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {{ submitting ? "Casting vote…" : "Cast vote" }}
        </button>

        <div class="mt-3">
          <RouterLink :to="{ name: 'results-page', params: { code } }" class="small">
            Just want to watch? See live results →
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
