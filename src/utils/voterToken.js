const STORAGE_KEY = "tally_voter_token";

/**
 * A lightweight stand-in for "browser fingerprint or session cookie" from
 * the brief: a random token generated once and persisted in localStorage,
 * so it survives refreshes but is unique per browser/device. It's sent with
 * every vote so the backend can enforce one-vote-per-respondent per poll.
 *
 * This is intentionally simple — no login, no server-set cookie required.
 * The backend is still the source of truth for "already voted" (a device
 * could clear localStorage), so this pairs with server-side enforcement,
 * not instead of it.
 */
export function getVoterToken() {
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}
