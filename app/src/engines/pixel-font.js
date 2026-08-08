/**
 * Pixel Font Renderer
 * Loads pre-extracted font data from JSON and renders text using block characters.
 * Font data stores pixels as binary strings ('1' = filled, '0' = empty).
 * The fill character is configurable at render time.
 */

import { PALETTE } from "./ansi256.js";

export const DEFAULT_META = Object.freeze({
  glyphWidth: 8,
  glyphHeight: 12,
  spaceWidth: 4,
  letterGap: 1,
  fallback: "?",
  charset: null,
});

// Stored letter data { 'A': ['1010', '1111', ...], ... }
let fontData = {};
let fontMeta = { ...DEFAULT_META };
let loaded = false;

// Configurable fill character (what '1' becomes in output)
let fillChar = "█";

export async function loadFont(jsonSrc) {
  const response = await fetch(jsonSrc);
  if (!response.ok) {
    throw new Error("Failed to load font JSON");
  }
  const data = await response.json();
  if (data && data.glyphs) {
    fontData = data.glyphs || {};
    fontMeta = { ...DEFAULT_META, ...(data.meta || {}) };
  } else {
    fontData = data || {};
    fontMeta = { ...DEFAULT_META };
  }

  const sampleGlyph = Object.values(fontData)[0];
  if (sampleGlyph && Array.isArray(sampleGlyph)) {
    if (!fontMeta.glyphHeight) {
      fontMeta.glyphHeight = sampleGlyph.length;
    }
    if (!fontMeta.glyphWidth) {
      fontMeta.glyphWidth = Math.max(
        ...sampleGlyph.map((r) => (r || "").length),
      );
    }
  }
  loaded = true;
}

export function setFillChar(char) {
  if (char && char.length > 0) {
    fillChar = char;
  }
}

export function getFillChar() {
  return fillChar;
}

// Shadow shade characters by intensity (1-4), relative to fill char
function shadowChars() {
  return [" ", "░", "▒", "▓", fillChar];
}

// Direction offsets: [dx, dy]
const SHADOW_OFFSETS = {
  br: [1, 1],
  bl: [-1, 1],
  tl: [-1, -1],
  tr: [1, -1],
};

function binaryToDisplay(row) {
  let out = "";
  for (let i = 0; i < row.length; i++) {
    out += row[i] === "1" ? fillChar : " ";
  }
  return out;
}

function wrapChar(ch) {
  if (ch === " ") return " ";
  return '<span class="pc">' + ch + "</span>";
}

function binaryToHtml(row) {
  let out = "";
  for (let i = 0; i < row.length; i++) {
    out += row[i] === "1" ? wrapChar(fillChar) : " ";
  }
  return out;
}

// ── Half-block output ──────────────────────────────────────────────────────
//
// A pixel font drawn one glyph pixel per character cell comes out twice as
// tall as it should, because a terminal cell is about twice as tall as it is
// wide. Packing two glyph rows into one cell with the half-block characters
// fixes the shape and doubles the vertical detail at the same time.
//
// Fill and shadow have to stay distinguishable, and a half block only has two
// regions, so the two are told apart by colour rather than by character.

const HALF_FILL_ANSI = 231; // near-white
// Roughly the ink density of the light, medium and dark shade characters the
// full-size renderer uses for shadows.
const HALF_SHADOW_ANSI = [null, 250, 245, 240, 231];

function halfColorFor(state, intensity) {
  if (state === "F") return HALF_FILL_ANSI;
  if (state === "S") return HALF_SHADOW_ANSI[intensity] ?? 245;
  return null;
}

function ansi256Hex(index) {
  const c = PALETTE[index];
  return `rgb(${c.r},${c.g},${c.b})`;
}

/**
 * Turn a grid of "F" / "S" / " " cells into half-block rows.
 *
 * Returns { ansi, html, cells }. `cells` carries the character plus its
 * resolved colours so the preview can paint exact rectangles instead of
 * trusting the font to draw a half block at exactly half the cell height —
 * Geist Mono draws it at 65%, which shows up as seams across the strokes.
 */
function gridToHalfBlocks(grid, intensity) {
  const width = Math.max(0, ...grid.map((r) => r.length));
  const ansiLines = [];
  const htmlLines = [];
  const cells = [];

  for (let r = 0; r < grid.length; r += 2) {
    let ansiLine = "";
    let htmlLine = "";
    let lastCodes = null;
    const cellRow = [];

    for (let c = 0; c < width; c++) {
      const top = grid[r]?.[c] ?? " ";
      const bottom = grid[r + 1]?.[c] ?? " ";
      const topColor = halfColorFor(top, intensity);
      const bottomColor = halfColorFor(bottom, intensity);

      let char = " ";
      let fg = null;
      let bg = null;

      if (topColor === null && bottomColor === null) {
        char = " ";
      } else if (topColor !== null && bottomColor === null) {
        char = "▀";
        fg = topColor;
      } else if (topColor === null && bottomColor !== null) {
        char = "▄";
        fg = bottomColor;
      } else if (topColor === bottomColor) {
        char = "█";
        fg = topColor;
      } else {
        char = "▀";
        fg = topColor;
        bg = bottomColor;
      }

      cellRow.push({
        char,
        fg: fg === null ? null : { ...PALETTE[fg] },
        bg: bg === null ? null : { ...PALETTE[bg] },
      });

      const codes = [];
      if (fg !== null) codes.push(`38;5;${fg}`);
      if (bg !== null) codes.push(`48;5;${bg}`);
      const key = codes.join(";");
      if (key !== lastCodes) {
        ansiLine += codes.length ? `\x1b[${key}m` : "\x1b[0m";
        lastCodes = key;
      }
      ansiLine += char;

      if (char === " ") {
        htmlLine += " ";
      } else {
        const style =
          `color:${ansi256Hex(fg)};` +
          (bg !== null ? `background:${ansi256Hex(bg)};` : "");
        htmlLine += `<span class="pc" style="${style}">${char}</span>`;
      }
    }

    ansiLines.push(lastCodes ? ansiLine + "\x1b[0m" : ansiLine);
    htmlLines.push(htmlLine);
    cells.push(cellRow);
  }

  return {
    ansi: ansiLines.join("\n"),
    html: htmlLines.join("\n"),
    cells,
  };
}

export function renderText(text, options) {
  if (!loaded) return { ansi: "", html: "" };

  const shadow = (options && options.shadow) || null;
  const shadowDir =
    shadow && shadow.direction !== "none" ? shadow.direction : null;
  const shadowIntensity = shadow
    ? Math.max(1, Math.min(4, shadow.intensity || 2))
    : 2;
  const shadowChar = shadowChars()[shadowIntensity];
  const half = options && options.resolution === "half";

  const lines = Array(fontMeta.glyphHeight).fill("");

  for (const char of text) {
    if (char === " ") {
      const space = "0".repeat(fontMeta.spaceWidth);
      for (let i = 0; i < fontMeta.glyphHeight; i++) {
        lines[i] += space;
      }
      continue;
    }

    const glyph =
      fontData[char] ||
      fontData[char.toUpperCase()] ||
      fontData[char.toLowerCase()] ||
      fontData[fontMeta.fallback];

    if (glyph) {
      for (let i = 0; i < fontMeta.glyphHeight; i++) {
        const row = glyph[i] || "0".repeat(fontMeta.glyphWidth);
        lines[i] += row + "0".repeat(fontMeta.letterGap);
      }
    } else {
      const space = "0".repeat(fontMeta.spaceWidth);
      for (let i = 0; i < fontMeta.glyphHeight; i++) {
        lines[i] += space;
      }
    }
  }

  if (shadowDir && SHADOW_OFFSETS[shadowDir]) {
    const [dx, dy] = SHADOW_OFFSETS[shadowDir];
    const origH = lines.length;
    const origW = Math.max(...lines.map((l) => l.length));

    const padTop = dy < 0 ? 1 : 0;
    const padBot = dy > 0 ? 1 : 0;
    const padLeft = dx < 0 ? 1 : 0;
    const padRight = dx > 0 ? 1 : 0;
    const gridH = origH + padTop + padBot;
    const gridW = origW + padLeft + padRight;

    const grid = [];
    for (let r = 0; r < gridH; r++) {
      const row = [];
      const srcR = r - padTop;
      const src = srcR >= 0 && srcR < origH ? lines[srcR] : "";
      for (let c = 0; c < gridW; c++) {
        const srcC = c - padLeft;
        const bit = srcC >= 0 && srcC < src.length ? src[srcC] : "0";
        row.push(bit === "1" ? "F" : " ");
      }
      grid.push(row);
    }

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        if (grid[r][c] === "F") {
          const sr = r + dy;
          const sc = c + dx;
          if (sr >= 0 && sr < gridH && sc >= 0 && sc < gridW) {
            if (grid[sr][sc] === " ") {
              grid[sr][sc] = "S";
            }
          }
        }
      }
    }

    if (half) {
      return gridToHalfBlocks(grid, shadowIntensity);
    }

    const ansiLines = [];
    const htmlLines = [];
    for (let r = 0; r < gridH; r++) {
      let ansiLine = "";
      let htmlLine = "";
      for (let c = 0; c < gridW; c++) {
        const cell = grid[r][c];
        if (cell === "F") {
          ansiLine += fillChar;
          htmlLine += wrapChar(fillChar);
        } else if (cell === "S") {
          ansiLine += shadowChar;
          htmlLine += wrapChar(shadowChar);
        } else {
          ansiLine += " ";
          htmlLine += " ";
        }
      }
      ansiLines.push(ansiLine);
      htmlLines.push(htmlLine);
    }

    while (ansiLines.length > origH && ansiLines[0].trim() === "") {
      ansiLines.shift();
      htmlLines.shift();
    }
    while (
      ansiLines.length > origH &&
      ansiLines[ansiLines.length - 1].trim() === ""
    ) {
      ansiLines.pop();
      htmlLines.pop();
    }

    return {
      ansi: ansiLines.join("\n"),
      html: htmlLines.join("\n"),
    };
  } else {
    if (half) {
      const grid = lines.map((row) =>
        Array.from(row, (bit) => (bit === "1" ? "F" : " ")),
      );
      return gridToHalfBlocks(grid, shadowIntensity);
    }

    const ansiLines = [];
    const htmlLines = [];
    for (let i = 0; i < lines.length; i++) {
      ansiLines.push(binaryToDisplay(lines[i]));
      htmlLines.push(binaryToHtml(lines[i]));
    }

    return {
      ansi: ansiLines.join("\n"),
      html: htmlLines.join("\n"),
    };
  }
}

export function getLetters() {
  const letters = {};
  for (const [char, rows] of Object.entries(fontData)) {
    const ansi = rows.map(binaryToDisplay).join("\n");
    const html = rows.map(binaryToHtml).join("\n");
    letters[char] = { ansi, html };
  }
  return letters;
}

export function getFontData() {
  return fontData;
}

export function getMeta() {
  return fontMeta;
}

export function isLoaded() {
  return loaded;
}
