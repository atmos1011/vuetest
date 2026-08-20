let counter = 0;

/**
 * Stable-ish unique id for v-for keys on dynamically added/removed rows.
 * Doesn't need to be cryptographically unique — just unique per session.
 */
export function nextId(prefix = "id") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}
