import assert from "node:assert/strict";
import test from "node:test";

import { FLICKER_TONES, REDRIVE_FLICKER_GRIDS } from "./flickerGrids";

// The player reads a frame as a flat 7x7 array and does not validate the
// length. A frame that is one dot short renders a silently scrambled grid, so
// the shape is pinned here rather than discovered in the browser.
test("every frame is a complete 7x7 dot grid of booleans", () => {
  assert.ok(REDRIVE_FLICKER_GRIDS.length >= 2, "an animation needs at least two frames");
  for (const [index, frame] of REDRIVE_FLICKER_GRIDS.entries()) {
    assert.equal(frame.length, 49, `frame ${index} is not 49 dots`);
    assert.ok(frame.every((dot) => typeof dot === "boolean"), `frame ${index} holds a non-boolean`);
  }
});

test("every frame lights at least one dot so the loader never blanks", () => {
  for (const [index, frame] of REDRIVE_FLICKER_GRIDS.entries()) {
    assert.ok(frame.some(Boolean), `frame ${index} is empty`);
  }
});

test("the animation moves: no two consecutive frames are identical", () => {
  for (let index = 1; index < REDRIVE_FLICKER_GRIDS.length; index += 1) {
    assert.notDeepEqual(
      REDRIVE_FLICKER_GRIDS[index],
      REDRIVE_FLICKER_GRIDS[index - 1],
      `frame ${index} repeats the frame before it`,
    );
  }
});

test("lit dots stay inside the 5x5 safe area the small variant crops to", () => {
  // flicker-dot's '5x5' variant keeps rows and columns 1..5. A dot on the outer
  // ring would vanish at that size, so the loader must not rely on one.
  const outerRing = (position: number) => {
    const row = Math.floor(position / 7);
    const column = position % 7;
    return row === 0 || row === 6 || column === 0 || column === 6;
  };
  for (const [index, frame] of REDRIVE_FLICKER_GRIDS.entries()) {
    const strays = frame.map((dot, position) => (dot && outerRing(position) ? position : -1)).filter((position) => position >= 0);
    assert.deepEqual(strays, [], `frame ${index} lights dots on the outer ring`);
  }
});

test("each tone pairs a lit and an unlit colour", () => {
  for (const [name, tone] of Object.entries(FLICKER_TONES)) {
    assert.match(tone.on, /^#[0-9A-F]{6}$/i, `${name} on-colour is not a hex colour`);
    assert.match(tone.off, /^#[0-9A-F]{6}$/i, `${name} off-colour is not a hex colour`);
    assert.notEqual(tone.on, tone.off, `${name} would render an invisible animation`);
  }
});
