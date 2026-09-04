/**
 * Whether a row of stat tiles fits side by side, or has to become a grid.
 *
 * Split out of StatTile so it can be tested without a renderer — the bug this
 * guards against (a fourth tile sliding off a 390pt phone) is arithmetic, and
 * arithmetic is worth a test.
 */

/** What a tile needs to hold a figure like "81.5h" above a label like "Accuracy". */
export const TILE_MIN_WIDTH = 78;

/** A 1pt hairline plus its 12pt margins. */
export const TILE_DIVIDER = 25;

export function statRowFits(count: number, width: number): boolean {
  // Before the first layout the width is unknown. Assume it fits: the row is
  // correct at any width wide enough, and a grid that snaps to a row on mount
  // is more jarring than the reverse.
  if (width === 0) return true;
  if (count < 2) return true;
  return count * TILE_MIN_WIDTH + (count - 1) * TILE_DIVIDER <= width;
}
