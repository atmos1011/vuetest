export const POLL_LIMITS = {
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  QUESTION_MAX: 140,
  OPTION_MAX: 60,
};

/**
 * Validates a poll draft (question + option rows) before submitting.
 *
 * @param {string} question
 * @param {{ value: string }[]} options - option rows, some may be blank
 * @returns {{ isValid: boolean, errors: { question: string, options: string[], general: string } }}
 */
export function validatePollForm(question, options) {
  const errors = {
    question: "",
    options: new Array(options.length).fill(""),
    general: "",
  };
  let isValid = true;

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    errors.question = "Write the question you want people to answer.";
    isValid = false;
  } else if (trimmedQuestion.length > POLL_LIMITS.QUESTION_MAX) {
    errors.question = `Keep it under ${POLL_LIMITS.QUESTION_MAX} characters.`;
    isValid = false;
  }

  const seen = new Map();
  let filledCount = 0;

  options.forEach((opt, index) => {
    const trimmed = opt.value.trim();
    if (!trimmed) return; // empty rows are covered by the general "need N options" check

    filledCount += 1;

    if (trimmed.length > POLL_LIMITS.OPTION_MAX) {
      errors.options[index] = `Keep it under ${POLL_LIMITS.OPTION_MAX} characters.`;
      isValid = false;
      return;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      errors.options[index] = "This is the same as another option.";
      errors.options[seen.get(key)] = "This is the same as another option.";
      isValid = false;
    } else {
      seen.set(key, index);
    }
  });

  if (filledCount < POLL_LIMITS.MIN_OPTIONS) {
    errors.general = `Add at least ${POLL_LIMITS.MIN_OPTIONS} answer options.`;
    isValid = false;
  }

  return { isValid, errors };
}
