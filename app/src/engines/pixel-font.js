/**
 * Pixel Font Renderer
 * Loads pre-extracted font data from JSON and renders text using block characters.
 * Font data stores pixels as binary strings ('1' = filled, '0' = empty).
 * The fill character is configurable at render time.
 */

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

export function renderText(text, options) {
  if (!loaded) return { ansi: "", html: "" };

  const shadow = (options && options.shadow) || null;
  const shadowDir =
    shadow && shadow.direction !== "none" ? shadow.direction : null;
  const shadowIntensity = shadow
    ? Math.max(1, Math.min(4, shadow.intensity || 2))
    : 2;
  const shadowChar = shadowChars()[shadowIntensity];

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
