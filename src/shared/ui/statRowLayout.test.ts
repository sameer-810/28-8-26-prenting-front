import test from "node:test";
import assert from "node:assert/strict";
import { statRowFits, TILE_MIN_WIDTH, TILE_DIVIDER } from "./statRowLayout.ts";

/**
 * The width a card gives its contents on the narrowest phone we support:
 * 390pt screen, 16pt screen padding either side, 16pt card padding either side.
 */
const PHONE_CARD_WIDTH = 390 - 32 - 32;

test("four tiles do not fit a phone card", () => {
  // The regression: Progress shows Sessions / Studied / Accuracy / Mastered,
  // and "Mastered" used to be clipped off the right edge.
  assert.equal(statRowFits(4, PHONE_CARD_WIDTH), false);
});

test("three tiles do fit a phone card", () => {
  // Home shows three. It has always been fine and must stay a single row.
  assert.equal(statRowFits(3, PHONE_CARD_WIDTH), true);
});

test("four tiles fit a tablet or desktop card", () => {
  assert.equal(statRowFits(4, 640), true);
});

test("the boundary is exact", () => {
  const exact = 4 * TILE_MIN_WIDTH + 3 * TILE_DIVIDER;
  assert.equal(statRowFits(4, exact), true);
  assert.equal(statRowFits(4, exact - 1), false);
});

test("an unmeasured row assumes it fits", () => {
  // Otherwise every row would render as a grid for one frame and then snap.
  assert.equal(statRowFits(4, 0), true);
});

test("a single tile always fits", () => {
  assert.equal(statRowFits(1, 10), true);
});
