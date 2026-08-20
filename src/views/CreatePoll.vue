<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { createPoll } from "../services/pollService";
import { nextId } from "../utils/id";
import { validatePollForm, POLL_LIMITS } from "../utils/pollValidation";
import AlertMessage from "../components/AlertMessage.vue";

const { MIN_OPTIONS, MAX_OPTIONS, QUESTION_MAX, OPTION_MAX } = POLL_LIMITS;

const router = useRouter();

const question = ref("");
const options = reactive([
  { id: nextId("opt"), value: "" },
  { id: nextId("opt"), value: "" },
]);

const errors = reactive({ question: "", options: [], general: "" });
const submitting = ref(false);
const submitError = ref("");
const result = ref(null); // holds the created poll { code, question, options, ... }
const linkCopied = ref(false);

const canAddOption = computed(() => options.length < MAX_OPTIONS);
const canRemoveOption = computed(() => options.length > MIN_OPTIONS);

const questionCounterClass = computed(() => {
  const remaining = QUESTION_MAX - question.value.length;
  if (remaining <= 0) return "is-at-limit";
  if (remaining <= 15) return "is-near-limit";
  return "";
});

function addOption() {
  if (!canAddOption.value) return;
  options.push({ id: nextId("opt"), value: "" });
}

function removeOption(index) {
  if (!canRemoveOption.value) return;
  options.splice(index, 1);
}

function resetForm() {
  question.value = "";
  options.splice(0, options.length, { id: nextId("opt"), value: "" }, { id: nextId("opt"), value: "" });
  errors.question = "";
  errors.options = [];
  errors.general = "";
  submitError.value = "";
  result.value = null;
  linkCopied.value = false;
}

async function handleSubmit() {
  submitError.value = "";

  const { isValid, errors: validationErrors } = validatePollForm(question.value, options);
  errors.question = validationErrors.question;
  errors.options = validationErrors.options;
  errors.general = validationErrors.general;
  if (!isValid) return;

  submitting.value = true;
  try {
    const payload = {
      question: question.value.trim(),
      options: options.map((o) => o.value.trim()).filter(Boolean),
    };
    const created = await createPoll(payload);
    result.value = created;
  } catch (err) {
    submitError.value = err.message || "Couldn't create the poll. Please try again.";
  } finally {
    submitting.value = false;
  }
}

const shareLink = computed(() => {
  if (!result.value?.code) return "";
  return `${window.location.origin}/poll/${result.value.code}`;
});

async function copyLink() {
  if (!shareLink.value) return;
  try {
    await navigator.clipboard.writeText(shareLink.value);
    linkCopied.value = true;
    setTimeout(() => (linkCopied.value = false), 2000);
  } catch {
    // Clipboard API can fail without HTTPS/permission — surface a fallback
    // rather than silently doing nothing.
    submitError.value = "Couldn't copy automatically — select and copy the link instead.";
  }
}

function goToResults() {
  if (!result.value?.code) return;
  router.push({ name: "results-page", params: { code: result.value.code } });
}
</script>

<template>
  <div class="container-narrow py-5 px-3">
    <header class="mb-4">
      <p class="eyebrow mb-2">New poll</p>
      <h1 class="font-display fw-bold mb-2" style="font-size: 2rem">
        Ask a question. Watch the votes land.
      </h1>
      <p class="text-ink-soft mb-0">
        Write your question, add up to six answers, and you'll get a short link to share.
        No sign-up needed for you or your voters.
      </p>
    </header>

    <Transition name="fade-slide" mode="out-in">
      <!-- ===== Success state: ticket stub with the poll code/link ===== -->
      <section v-if="result" key="result" class="surface-card p-4 p-md-5">
        <div class="d-flex align-items-center gap-2 mb-4">
          <i class="bi bi-check-circle-fill text-success fs-4" aria-hidden="true"></i>
          <h2 class="font-display fw-semibold mb-0" style="font-size: 1.35rem">
            Your poll is live
          </h2>
        </div>

        <div class="ticket-stub text-center mx-auto mb-4" style="max-width: 420px">
          <p class="eyebrow mb-2">Poll code</p>
          <p class="ticket-stub__code mb-3">{{ result.code }}</p>
          <p class="text-ink-soft small mb-2">{{ result.question }}</p>
        </div>

        <label class="form-label" for="share-link">Shareable link</label>
        <div class="d-flex flex-column flex-sm-row gap-2 mb-4">
          <input
            id="share-link"
            type="text"
            class="form-control ticket-stub__link flex-grow-1"
            :value="shareLink"
            readonly
            @focus="$event.target.select()"
          />
          <button type="button" class="btn-tally-primary flex-shrink-0" @click="copyLink">
            <i class="bi" :class="linkCopied ? 'bi-clipboard-check' : 'bi-clipboard'" aria-hidden="true"></i>
            {{ linkCopied ? "Copied!" : "Copy link" }}
          </button>
        </div>

        <div v-if="submitError" class="mb-4">
          <AlertMessage tone="error">{{ submitError }}</AlertMessage>
        </div>

        <div class="d-flex flex-column flex-sm-row gap-2">
          <button type="button" class="btn-tally-primary" @click="goToResults">
            <i class="bi bi-bar-chart-fill" aria-hidden="true"></i>
            Watch live results
          </button>
          <button type="button" class="btn-tally-ghost" @click="resetForm">
            Create another poll
          </button>
        </div>
      </section>

      <!-- ===== Form state ===== -->
      <section v-else key="form" class="surface-card p-4 p-md-5">
        <form novalidate @submit.prevent="handleSubmit">
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-baseline">
              <label class="form-label" for="poll-question">Question</label>
              <span class="char-counter" :class="questionCounterClass">
                {{ question.length }}/{{ QUESTION_MAX }}
              </span>
            </div>
            <textarea
              id="poll-question"
              v-model="question"
              class="form-control"
              :class="{ 'is-invalid': errors.question }"
              rows="2"
              :maxlength="QUESTION_MAX"
              placeholder="e.g. What should we order for the team lunch?"
              :disabled="submitting"
            ></textarea>
            <div v-if="errors.question" class="invalid-feedback d-block">
              {{ errors.question }}
            </div>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <label class="form-label mb-0">Answer options</label>
              <span class="text-ink-soft small">{{ options.length }}/{{ MAX_OPTIONS }}</span>
            </div>

            <div class="d-flex flex-column gap-2">
              <div v-for="(opt, index) in options" :key="opt.id">
                <div class="option-row">
                  <span class="option-row__index" aria-hidden="true">{{ index + 1 }}</span>
                  <input
                    v-model="opt.value"
                    type="text"
                    class="form-control"
                    :class="{ 'is-invalid': errors.options[index] }"
                    :maxlength="OPTION_MAX"
                    :placeholder="`Option ${index + 1}`"
                    :aria-label="`Answer option ${index + 1}`"
                    :disabled="submitting"
                  />
                  <button
                    type="button"
                    class="option-row__remove"
                    :disabled="!canRemoveOption || submitting"
                    :aria-label="`Remove option ${index + 1}`"
                    title="Remove option"
                    @click="removeOption(index)"
                  >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                </div>
                <div v-if="errors.options[index]" class="invalid-feedback d-block ms-5">
                  {{ errors.options[index] }}
                </div>
              </div>
            </div>

            <button
              type="button"
              class="btn-add-option mt-2"
              :disabled="!canAddOption || submitting"
              @click="addOption"
            >
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              Add option
            </button>

            <div v-if="errors.general" class="mt-3">
              <AlertMessage tone="error">{{ errors.general }}</AlertMessage>
            </div>
          </div>

          <div v-if="submitError" class="mb-3">
            <AlertMessage tone="error">{{ submitError }}</AlertMessage>
          </div>

          <button type="submit" class="btn-tally-primary w-100 w-sm-auto" :disabled="submitting">
            <span
              v-if="submitting"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ submitting ? "Creating poll…" : "Create poll" }}
          </button>
        </form>
      </section>
    </Transition>

    <aside class="mt-4 d-flex flex-column flex-sm-row gap-3 text-ink-soft small">
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-1-circle-fill" aria-hidden="true" style="color: var(--color-primary)"></i>
        <span>Ask your question and add answers.</span>
      </div>
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-2-circle-fill" aria-hidden="true" style="color: var(--color-primary)"></i>
        <span>Share the link — no login needed to vote.</span>
      </div>
      <div class="d-flex align-items-start gap-2">
        <i class="bi bi-3-circle-fill" aria-hidden="true" style="color: var(--color-primary)"></i>
        <span>Watch votes tally up live.</span>
      </div>
    </aside>
  </div>
</template>
