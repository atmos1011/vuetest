/**
 * Returns one color per count: the current leader (highest count, ties all
 * win) gets `leaderColor`, everyone else gets `baseColor`. All zero counts
 * means no leader yet, so everything stays `baseColor`.
 */
export function barColorsFor(counts, leaderColor, baseColor) {
  const max = Math.max(...counts, 0);
  return counts.map((c) => (max > 0 && c === max ? leaderColor : baseColor));
}
