import assert from "node:assert/strict";
import test from "node:test";

import config from "../../tailwind.config";

const palette = (config.theme?.extend?.colors ?? {}) as Record<string, string>;

function channel(value: number) {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) => channel(parseInt(value.slice(offset, offset + 2), 16)));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

export function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = "#FFFFFF";

test("every token is a six-digit hex colour", () => {
  assert.ok(Object.keys(palette).length > 20, "the palette lost tokens");
  for (const [name, value] of Object.entries(palette)) {
    assert.match(value, /^#[0-9A-Fa-f]{6}$/, `${name} is not a hex colour: ${value}`);
  }
});

test("text colours clear WCAG AA against the surfaces they sit on", () => {
  const pairs: Array<[string, string, number]> = [
    ["ink", WHITE, 7],
    ["ink", palette["surface-soft"], 7],
    ["body", WHITE, 4.5],
    ["muted", WHITE, 4.5],
    ["muted", palette["surface-soft"], 4.5],
    ["primary", WHITE, 4.5],
    ["secondary", WHITE, 4.5],
    ["error", WHITE, 4.5],
    ["legal-link", WHITE, 4.5],
    ["favorite", WHITE, 4.5],
  ];
  for (const [token, background, minimum] of pairs) {
    const ratio = contrast(palette[token], background);
    assert.ok(ratio >= minimum, `${token} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
  }
});

test("white text is readable on every filled brand surface", () => {
  for (const token of ["primary", "primary-active", "secondary", "secondary-active", "error", "favorite", "ink"]) {
    const ratio = contrast(WHITE, palette[token]);
    assert.ok(ratio >= 4.5, `white on ${token} is ${ratio.toFixed(2)}:1`);
  }
});

test("error stays visibly distinct from the crimson primary", () => {
  // The brand colour is itself a deep red, so danger has to separate from it by
  // lightness or a destructive button reads as an ordinary one.
  const ratio = contrast(palette.error, palette.primary);
  assert.ok(ratio >= 1.8, `error and primary differ by only ${ratio.toFixed(2)}:1`);
});

test("soft tints stay light enough to carry ink text", () => {
  for (const token of ["surface-soft", "surface-strong", "accent-soft", "secondary-soft", "favorite-soft", "hairline-soft"]) {
    const ratio = contrast(palette.ink, palette[token]);
    assert.ok(ratio >= 7, `ink on ${token} is ${ratio.toFixed(2)}:1`);
  }
});

test("hairlines are visible against white without becoming borders", () => {
  for (const token of ["hairline", "border-strong"]) {
    const ratio = contrast(palette[token], WHITE);
    assert.ok(ratio > 1.05 && ratio < 3, `${token} against white is ${ratio.toFixed(2)}:1`);
  }
});
