const STORAGE_KEY = "tally_voted_polls";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Returns the option index this device already voted for on `code`,
 * or null if there's no local record of a vote.
 *
 * This only drives the UI (skip straight to "you voted for X" instead of
 * showing the form again) — the backend independently enforces one vote
 * per voterToken, so this cache being wrong or cleared never allows a
 * double vote to succeed silently.
 */
export function getLocalVote(code) {
  const all = readAll();
  return Object.prototype.hasOwnProperty.call(all, code) ? all[code] : null;
}

export function recordLocalVote(code, optionIndex) {
  const all = readAll();
  all[code] = optionIndex;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
