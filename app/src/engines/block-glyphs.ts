/**
 * Maps every block-drawing character back to the grid of sub-cells it fills.
 *
 * Why this exists: painting pixels with glyphs only looks right if the font
 * draws each block element to exactly fill its cell, and almost no font does.
 * Measured at 100px: Geist Mono draws U+2588 FULL BLOCK 130px tall and U+2580
 * UPPER HALF BLOCK 65px tall — so a "half" block covers 65% of the cell, not
 * 50%, and the background colour meant for the bottom half only gets 35%.
 * That mismatch is where the slivers between rows come from. Unicode 16
 * octants make it worse: no shipping font has them, so they render as
 * missing-glyph boxes of the wrong width.
 *
 * With this table the preview can draw the exact rectangles a perfect terminal
 * would show, from the same characters and colours we copy out. It is not a
 * cheat — it is the same data, drawn without a font in the way.
 *
 * `mask` bit `dy * w + dx` is set when that sub-cell takes the foreground
 * colour. That is the same bit order the renderers in image-to-ansi.js use.
 */

import { SEXTANT_CHARS, OCTANT_GLYPHS } from "./image-to-ansi.js";

export interface GlyphCells {
  /** Sub-cells across. */
  w: number;
  /** Sub-cells down. */
  h: number;
  /** Bit `dy * w + dx` set means that sub-cell is foreground. */
  mask: number;
}

const TABLE = new Map<string, GlyphCells>();

function add(char: string, w: number, h: number, mask: number) {
  // First registration wins, so a character gets its simplest grid. A full
  // block is the same picture whether you call it 1x1 or 2x4.
  if (!TABLE.has(char)) TABLE.set(char, { w, h, mask });
}

// Whole and half blocks.
add(" ", 1, 1, 0b0);
add("█", 1, 1, 0b1);
add("▀", 1, 2, 0b01);
add("▄", 1, 2, 0b10);
add("▌", 2, 1, 0b01);
add("▐", 2, 1, 0b10);

// Quadrants, in the same bit order renderQuadrant uses.
const QUADRANTS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";
for (let mask = 0; mask < 16; mask++) add(QUADRANTS[mask], 2, 2, mask);

// Sextants (2x3) and octants (2x4), read straight off the renderer's tables so
// the two can never disagree.
SEXTANT_CHARS.forEach((char: string, mask: number) => add(char, 2, 3, mask));
OCTANT_GLYPHS.forEach((glyph: { char: string }, mask: number) =>
  add(glyph.char, 2, 4, mask),
);

/**
 * The sub-cell grid a character fills, or null if it is not a block character.
 *
 * An inverted octant needs no special handling: the renderer stores the
 * complement's character and swaps the two colours, so decoding the character
 * naively and painting the foreground into its set bits lands exactly right.
 */
export function cellsForChar(char: string): GlyphCells | null {
  if (!char) return null;
  // Some renderers emit two spaces for one full-width background cell.
  if (char.trim() === "") return { w: 1, h: 1, mask: 0 };
  return TABLE.get(char) ?? null;
}

/** True when every character in the grid is one this module can paint. */
export function isBlockGrid(
  cells: { char: string }[][] | null | undefined,
): boolean {
  if (!cells || !cells.length) return false;
  for (const row of cells) {
    for (const cell of row) {
      if (!cellsForChar(cell.char)) return false;
    }
  }
  return true;
}
