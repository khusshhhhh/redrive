// Frames exported from Flicker (flicker.laurie.fyi). The player reads each
// frame as a flat 49-boolean 7x7 dot grid, so the source is laid out seven per
// row: what you read here is the square that the loader traces.
export const REDRIVE_FLICKER_GRIDS: boolean[][] = [
  [
    false, false, false, false, false, false, false,
    false, false, true, true, true, false, false,
    false, false, false, false, false, true, false,
    false, false, false, false, false, true, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
  ],
  [
    false, false, false, false, false, false, false,
    false, false, false, false, true, false, false,
    false, false, false, false, false, true, false,
    false, false, false, false, false, true, false,
    false, false, false, false, false, true, false,
    false, false, false, false, true, false, false,
    false, false, false, false, false, false, false,
  ],
  [
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, true, false,
    false, false, false, false, false, true, false,
    false, false, true, true, true, false, false,
    false, false, false, false, false, false, false,
  ],
  [
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, true, false, false, false, false, false,
    false, true, false, false, false, false, false,
    false, false, true, true, true, false, false,
    false, false, false, false, false, false, false,
  ],
  [
    false, false, false, false, false, false, false,
    false, false, true, false, false, false, false,
    false, true, false, false, false, false, false,
    false, true, false, false, false, false, false,
    false, true, false, false, false, false, false,
    false, false, true, false, false, false, false,
    false, false, false, false, false, false, false,
  ],
  [
    false, false, false, false, false, false, false,
    false, false, true, true, true, false, false,
    false, true, false, false, false, false, false,
    false, true, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
    false, false, false, false, false, false, false,
  ],
];

export type FlickerTone = "primary" | "ink" | "inverse";

// Crimson and Sand, the palette in tailwind.config.ts. The lit dot carries the
// brand colour and the unlit dots sit at hairline weight, so the loader reads as
// part of the page rather than as a borrowed widget.
export const FLICKER_TONES: Record<FlickerTone, { on: string; off: string }> = {
  primary: { on: "#710014", off: "#DFDCD5" },
  ink: { on: "#161616", off: "#DFDCD5" },
  inverse: { on: "#F2F1ED", off: "#332F2C" },
};
