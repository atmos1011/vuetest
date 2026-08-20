const STORAGE_KEY = "tally_creator_tokens";

/**
 * The backend hands out a creator token once, in the response to creating a
 * poll, and never again. Whoever holds it can close or edit that poll, so it
 * is what makes "only the creator can close it" work without any login.
 *
 * Kept per poll code, because one person may create several polls from the
 * same browser.
 */
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function rememberCreatorToken(code, token) {
  const all = readAll();
  all[code] = token;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getCreatorToken(code) {
  return readAll()[code] ?? null;
}
