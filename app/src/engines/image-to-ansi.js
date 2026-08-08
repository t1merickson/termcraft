/**
 * Image to ANSI Converter
 *
 * Converts images to ANSI escape sequences for terminal display.
 */

import { rgbToAnsi256, getColor } from "./ansi256.js";

/**
 * Load an image from a URL or data URL (browser only)
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Read a file as a data URL (browser only)
 */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert RGBA to foreground ANSI code
 */
export function rgbaToFgAnsi(r, g, b, a, useTrue24bit) {
  if (a < 32) return null;

  if (useTrue24bit) {
    return `38;2;${r};${g};${b}`;
  }
  return `38;5;${rgbToAnsi256(r, g, b)}`;
}

/**
 * Convert RGBA to background ANSI code
 */
export function rgbaToBgAnsi(r, g, b, a, useTrue24bit) {
  if (a < 32) return null;

  if (useTrue24bit) {
    return `48;2;${r};${g};${b}`;
  }
  return `48;5;${rgbToAnsi256(r, g, b)}`;
}

/**
 * Get the display color for a cell (quantized for 256 mode, raw for 24bit)
 */
function cellColor(r, g, b, useTrue24bit) {
  if (useTrue24bit) {
    return { r, g, b };
  }
  const idx = rgbToAnsi256(r, g, b);
  const c = getColor(idx);
  return { r: c.r, g: c.g, b: c.b };
}

/**
 * Calculate pixel grid dimensions for a given render mode.
 */
export function calcDimensions(imgW, imgH, maxWidth, maxHeight, renderMode) {
  const useHalfBlocks = renderMode.startsWith("half-");
  const useHalfFgOnly = renderMode.startsWith("halffg-");
  const useQuadrant = renderMode.startsWith("quad-");
  const useSextant = renderMode.startsWith("sextant-");
  const useOctant = renderMode.startsWith("octant-");
  const useBlockChars = renderMode.startsWith("block-");
  const isBinary = renderMode === "binary";
  const is1to1 = renderMode.endsWith("-1x");
  const aspectRatio = imgW / imgH;

  let width, height;

  if (is1to1 && (useHalfBlocks || useHalfFgOnly)) {
    width = imgW;
    height = imgH % 2 === 0 ? imgH : imgH + 1;
  } else if (is1to1 && (useQuadrant || useSextant || useOctant)) {
    width = imgW % 2 === 0 ? imgW : imgW + 1;
    const cellH = useSextant ? 3 : useOctant ? 4 : 2;
    height = Math.ceil(imgH / cellH) * cellH;
  } else if (is1to1) {
    width = imgW;
    height = imgH;
  } else if (useHalfBlocks || useHalfFgOnly || isBinary) {
    const maxPixH = maxHeight * 2;
    if (aspectRatio > maxWidth / maxHeight) {
      width = maxWidth;
      height = Math.round((2 * maxWidth) / aspectRatio);
    } else {
      height = maxPixH;
      width = Math.round((maxPixH * aspectRatio) / 2);
    }
    height = Math.max(2, Math.floor(height / 2) * 2);
  } else if (useQuadrant || useSextant || useOctant) {
    if (aspectRatio > maxWidth / maxHeight) {
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }
    width = Math.max(2, Math.floor(width / 2) * 2);
    const cellH = useSextant ? 3 : useOctant ? 4 : 2;
    height = Math.max(cellH, Math.floor(height / cellH) * cellH);
  } else if (useBlockChars) {
    if (aspectRatio > maxWidth / maxHeight) {
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }
  } else {
    // Full spaces
    const maxPixW = Math.floor(maxWidth / 2);
    if (aspectRatio > maxWidth / 2 / maxHeight) {
      width = maxPixW;
      height = Math.round((2 * maxPixW) / aspectRatio);
    } else {
      height = maxHeight;
      width = Math.round((maxHeight * aspectRatio) / 2);
    }
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

/**
 * Process an image and convert to ANSI art (browser only — uses canvas)
 */
export function processImage(img, options = {}) {
  const {
    maxWidth = 80,
    maxHeight = 40,
    renderMode = "half-256",
    invert = false,
    greyscale = false,
  } = options;

  const useHalfBlocks = renderMode.startsWith("half-");
  const useHalfFgOnly = renderMode.startsWith("halffg-");
  const useQuadrant = renderMode.startsWith("quad-");
  const useSextant = renderMode.startsWith("sextant-");
  const useOctant = renderMode.startsWith("octant-");
  const useBlockChars = renderMode.startsWith("block-");
  const useTrue24bit = renderMode.includes("-24bit");
  const isBinary = renderMode === "binary";

  const { width, height } = calcDimensions(
    img.width,
    img.height,
    maxWidth,
    maxHeight,
    renderMode,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  if (greyscale || invert) {
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i],
        g = pixels[i + 1],
        b = pixels[i + 2];
      if (greyscale) {
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        r = g = b = lum;
      }
      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }

  let result;

  if (isBinary) {
    result = renderBinary(pixels, width, height);
  } else if (useHalfFgOnly) {
    result = renderHalfBlocksFgOnly(pixels, width, height, useTrue24bit);
  } else if (useHalfBlocks) {
    result = renderHalfBlocks(pixels, width, height, useTrue24bit);
  } else if (useQuadrant) {
    result = renderQuadrant(pixels, width, height, useTrue24bit);
  } else if (useSextant) {
    result = renderSextant(pixels, width, height, useTrue24bit);
  } else if (useOctant) {
    result = renderOctant(pixels, width, height, useTrue24bit);
  } else if (useBlockChars) {
    result = renderBlockChars(pixels, width, height, useTrue24bit);
  } else {
    result = renderFullBlocks(pixels, width, height, useTrue24bit);
  }

  return {
    ansi: result.ansi,
    html: result.html,
    // The per-cell character and colours, so a caller can paint the output as
    // exact rectangles instead of relying on the font's block glyphs.
    cells: result.cells,
    width: width,
    height:
      useHalfBlocks || useHalfFgOnly || isBinary
        ? height / 2
        : useQuadrant
          ? height / 2
          : useSextant
            ? height / 3
            : useOctant
              ? height / 4
              : height,
  };
}

/**
 * Render using half blocks (▀▄) - 2x vertical resolution
 */
export function renderHalfBlocks(pixels, width, height, useTrue24bit) {
  let ansi = "";
  let html = "";
  const cells = [];

  for (let y = 0; y < height; y += 2) {
    let lineAnsi = "";
    let lineHtml = "";
    let lastFg = null;
    let lastBg = null;
    const row = [];

    for (let x = 0; x < width; x++) {
      const topIdx = (y * width + x) * 4;
      const topR = pixels[topIdx];
      const topG = pixels[topIdx + 1];
      const topB = pixels[topIdx + 2];
      const topA = pixels[topIdx + 3];

      let botR = 0,
        botG = 0,
        botB = 0,
        botA = 0;
      if (y + 1 < height) {
        const botIdx = ((y + 1) * width + x) * 4;
        botR = pixels[botIdx];
        botG = pixels[botIdx + 1];
        botB = pixels[botIdx + 2];
        botA = pixels[botIdx + 3];
      }

      const topTransparent = topA < 32;
      const botTransparent = botA < 32;

      let char, fgCode, bgCode, fgColor, bgColor, cellFg, cellBg;

      if (topTransparent && botTransparent) {
        char = " ";
        fgCode = bgCode = fgColor = bgColor = null;
        cellFg = cellBg = null;
      } else if (topTransparent) {
        char = "▄";
        fgCode = rgbaToFgAnsi(botR, botG, botB, botA, useTrue24bit);
        bgCode = null;
        fgColor = `rgb(${botR},${botG},${botB})`;
        bgColor = null;
        cellFg = cellColor(botR, botG, botB, useTrue24bit);
        cellBg = null;
      } else if (botTransparent) {
        char = "▀";
        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
        bgCode = null;
        fgColor = `rgb(${topR},${topG},${topB})`;
        bgColor = null;
        cellFg = cellColor(topR, topG, topB, useTrue24bit);
        cellBg = null;
      } else {
        char = "▀";
        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
        bgCode = rgbaToBgAnsi(botR, botG, botB, botA, useTrue24bit);
        fgColor = `rgb(${topR},${topG},${topB})`;
        bgColor = `rgb(${botR},${botG},${botB})`;
        cellFg = cellColor(topR, topG, topB, useTrue24bit);
        cellBg = cellColor(botR, botG, botB, useTrue24bit);
      }

      row.push({ char, fg: cellFg, bg: cellBg });

      if (fgCode !== lastFg || bgCode !== lastBg) {
        const codes = [];
        if (fgCode) codes.push(fgCode);
        if (bgCode) codes.push(bgCode);
        lineAnsi += codes.length > 0 ? `\x1b[${codes.join(";")}m` : "\x1b[0m";
        lastFg = fgCode;
        lastBg = bgCode;
      }
      lineAnsi += char;

      let style = "";
      if (fgColor) style += `color:${fgColor};`;
      if (bgColor) style += `background:${bgColor};`;
      lineHtml += style ? `<span style="${style}">${char}</span>` : char;
    }

    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }

  return { ansi, html, cells };
}

/**
 * Render using half blocks with foreground color only (no background)
 */
export function renderHalfBlocksFgOnly(pixels, width, height, useTrue24bit) {
  let ansi = "";
  let html = "";
  const cells = [];

  for (let y = 0; y < height; y += 2) {
    let lineAnsi = "";
    let lineHtml = "";
    let lastFg = null;
    const row = [];

    for (let x = 0; x < width; x++) {
      const topIdx = (y * width + x) * 4;
      const topR = pixels[topIdx];
      const topG = pixels[topIdx + 1];
      const topB = pixels[topIdx + 2];
      const topA = pixels[topIdx + 3];

      let botR = 0,
        botG = 0,
        botB = 0,
        botA = 0;
      if (y + 1 < height) {
        const botIdx = ((y + 1) * width + x) * 4;
        botR = pixels[botIdx];
        botG = pixels[botIdx + 1];
        botB = pixels[botIdx + 2];
        botA = pixels[botIdx + 3];
      }

      const topOn = topA >= 32;
      const botOn = botA >= 32;

      let char, fgCode, fgColor, cellFg;

      if (!topOn && !botOn) {
        char = " ";
        fgCode = null;
        fgColor = null;
        cellFg = null;
      } else if (topOn && botOn) {
        char = "█";
        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
        fgColor = `rgb(${topR},${topG},${topB})`;
        cellFg = cellColor(topR, topG, topB, useTrue24bit);
      } else if (topOn) {
        char = "▀";
        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
        fgColor = `rgb(${topR},${topG},${topB})`;
        cellFg = cellColor(topR, topG, topB, useTrue24bit);
      } else {
        char = "▄";
        fgCode = rgbaToFgAnsi(botR, botG, botB, botA, useTrue24bit);
        fgColor = `rgb(${botR},${botG},${botB})`;
        cellFg = cellColor(botR, botG, botB, useTrue24bit);
      }

      row.push({ char, fg: cellFg, bg: null });

      if (fgCode !== lastFg) {
        lineAnsi += fgCode ? `\x1b[${fgCode}m` : "\x1b[0m";
        lastFg = fgCode;
      }
      lineAnsi += char;

      lineHtml += fgColor
        ? `<span style="color:${fgColor}">${char}</span>`
        : char;
    }

    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }

  return { ansi, html, cells };
}

/**
 * Render using quadrant block characters - 2x2 pixels per character
 */
export function renderQuadrant(pixels, width, height, useTrue24bit) {
  const quadChars = [
    " ", // 0000
    "▘", // 0001 - top-left
    "▝", // 0010 - top-right
    "▀", // 0011 - top
    "▖", // 0100 - bottom-left
    "▌", // 0101 - left
    "▞", // 0110 - diagonal
    "▛", // 0111 - all but bottom-right
    "▗", // 1000 - bottom-right
    "▚", // 1001 - other diagonal
    "▐", // 1010 - right
    "▜", // 1011 - all but bottom-left
    "▄", // 1100 - bottom
    "▙", // 1101 - all but top-right
    "▟", // 1110 - all but top-left
    "█", // 1111 - full
  ];

  let ansi = "";
  let html = "";
  const cells = [];

  for (let y = 0; y < height; y += 2) {
    let lineAnsi = "";
    let lineHtml = "";
    let lastFg = null;
    const row = [];

    for (let x = 0; x < width; x += 2) {
      const getPixel = (px, py) => {
        if (px >= width || py >= height) return { r: 0, g: 0, b: 0, a: 0 };
        const idx = (py * width + px) * 4;
        return {
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
          a: pixels[idx + 3],
        };
      };

      const tl = getPixel(x, y);
      const tr = getPixel(x + 1, y);
      const bl = getPixel(x, y + 1);
      const br = getPixel(x + 1, y + 1);

      const tlOn = tl.a >= 32 ? 1 : 0;
      const trOn = tr.a >= 32 ? 2 : 0;
      const blOn = bl.a >= 32 ? 4 : 0;
      const brOn = br.a >= 32 ? 8 : 0;
      const pattern = tlOn | trOn | blOn | brOn;

      const char = quadChars[pattern];

      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      if (tlOn) {
        r += tl.r;
        g += tl.g;
        b += tl.b;
        count++;
      }
      if (trOn) {
        r += tr.r;
        g += tr.g;
        b += tr.b;
        count++;
      }
      if (blOn) {
        r += bl.r;
        g += bl.g;
        b += bl.b;
        count++;
      }
      if (brOn) {
        r += br.r;
        g += br.g;
        b += br.b;
        count++;
      }

      let fgCode = null;
      let fgColor = null;
      let cellFg = null;
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        fgCode = rgbaToFgAnsi(r, g, b, 255, useTrue24bit);
        fgColor = `rgb(${r},${g},${b})`;
        cellFg = cellColor(r, g, b, useTrue24bit);
      }

      row.push({ char, fg: cellFg, bg: null });

      if (fgCode !== lastFg) {
        lineAnsi += fgCode ? `\x1b[${fgCode}m` : "\x1b[0m";
        lastFg = fgCode;
      }
      lineAnsi += char;

      lineHtml += fgColor
        ? `<span style="color:${fgColor}">${char}</span>`
        : char;
    }

    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }

  return { ansi, html, cells };
}

export const SEXTANT_CHARS = (() => {
  const chars = new Array(64);
  chars[0] = " ";
  let codePoint = 0x1fb00;
  for (let mask = 1; mask < 63; mask++) {
    if (mask === 21) chars[mask] = "▌";
    else if (mask === 42) chars[mask] = "▐";
    else chars[mask] = String.fromCodePoint(codePoint++);
  }
  chars[63] = "█";
  return Object.freeze(chars);
})();

const OCTANT_EXISTING = new Map([
  [0, " "],
  [3, "🮂"],
  [5, "▘"],
  [10, "▝"],
  [15, "▀"],
  [63, "🮅"],
  [80, "▖"],
  [85, "▌"],
  [90, "▞"],
  [95, "▛"],
  [160, "▗"],
  [165, "▚"],
  [170, "▐"],
  [175, "▜"],
  [192, "▂"],
  [240, "▄"],
  [245, "▙"],
  [250, "▟"],
  [252, "▆"],
  [255, "█"],
]);
const OCTANT_REVERSE_ONLY = new Set([1, 2, 20, 40, 64, 128]);

/**
 * Octants need a very new Unicode 16 font and fall back to tofu in most
 * terminals. The table also records masks represented by an inverted glyph.
 */
export const OCTANT_GLYPHS = (() => {
  const glyphs = new Array(256);
  const omitted = new Set([...OCTANT_EXISTING.keys(), ...OCTANT_REVERSE_ONLY]);
  let codePoint = 0x1cd00;
  for (let mask = 0; mask < 256; mask++) {
    if (OCTANT_EXISTING.has(mask))
      glyphs[mask] = { char: OCTANT_EXISTING.get(mask), inverted: false };
    else if (!omitted.has(mask))
      glyphs[mask] = {
        char: String.fromCodePoint(codePoint++),
        inverted: false,
      };
  }
  for (const mask of OCTANT_REVERSE_ONLY) {
    const reverse = glyphs[255 - mask];
    glyphs[mask] = { char: reverse.char, inverted: true };
  }
  return Object.freeze(glyphs);
})();

export const OCTANT_CHARS = Object.freeze(
  OCTANT_GLYPHS.map(({ char }) => char),
);

function renderMosaic(
  pixels,
  width,
  height,
  cellHeight,
  glyphForMask,
  useTrue24bit,
) {
  let ansi = "";
  let html = "";
  const cells = [];
  for (let y = 0; y < height; y += cellHeight) {
    let lineAnsi = "",
      lineHtml = "";
    let lastFg = null,
      lastBg = null;
    const row = [];
    for (let x = 0; x < width; x += 2) {
      const points = [];
      for (let dy = 0; dy < cellHeight; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const px = x + dx,
            py = y + dy;
          if (px >= width || py >= height) {
            points.push({ r: 0, g: 0, b: 0, a: 0 });
            continue;
          }
          const p = (py * width + px) * 4;
          points.push({
            r: pixels[p],
            g: pixels[p + 1],
            b: pixels[p + 2],
            a: pixels[p + 3],
          });
        }
      const opaque = points.filter((point) => point.a >= 32);
      if (!opaque.length) {
        row.push({ char: " ", fg: null, bg: null });
        if (lastFg !== null || lastBg !== null) {
          lineAnsi += "\x1b[0m";
          lastFg = lastBg = null;
        }
        lineAnsi += " ";
        lineHtml += " ";
        continue;
      }
      let first = opaque[0],
        second = opaque[0],
        farthest = -1;
      for (const a of opaque)
        for (const b of opaque) {
          const d = (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
          if (d > farthest) {
            farthest = d;
            first = a;
            second = b;
          }
        }
      let fg = { r: first.r, g: first.g, b: first.b };
      let bg = { r: second.r, g: second.g, b: second.b };
      for (let iteration = 0; iteration < 3; iteration++) {
        const sums = [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ];
        for (const point of opaque) {
          const df =
            (point.r - fg.r) ** 2 +
            (point.g - fg.g) ** 2 +
            (point.b - fg.b) ** 2;
          const db =
            (point.r - bg.r) ** 2 +
            (point.g - bg.g) ** 2 +
            (point.b - bg.b) ** 2;
          const sum = sums[df <= db ? 0 : 1];
          sum[0] += point.r;
          sum[1] += point.g;
          sum[2] += point.b;
          sum[3]++;
        }
        if (sums[0][3])
          fg = {
            r: Math.round(sums[0][0] / sums[0][3]),
            g: Math.round(sums[0][1] / sums[0][3]),
            b: Math.round(sums[0][2] / sums[0][3]),
          };
        if (sums[1][3])
          bg = {
            r: Math.round(sums[1][0] / sums[1][3]),
            g: Math.round(sums[1][1] / sums[1][3]),
            b: Math.round(sums[1][2] / sums[1][3]),
          };
      }
      let mask = 0;
      points.forEach((point, index) => {
        if (point.a < 32) return;
        const df =
          (point.r - fg.r) ** 2 + (point.g - fg.g) ** 2 + (point.b - fg.b) ** 2;
        const db =
          (point.r - bg.r) ** 2 + (point.g - bg.g) ** 2 + (point.b - bg.b) ** 2;
        if (df <= db) mask |= 1 << index;
      });
      let glyph = glyphForMask(mask);
      if (typeof glyph === "string") glyph = { char: glyph, inverted: false };
      if (glyph.inverted) [fg, bg] = [bg, fg];
      const fgCode = rgbaToFgAnsi(fg.r, fg.g, fg.b, 255, useTrue24bit);
      const bgCode =
        farthest > 0 ? rgbaToBgAnsi(bg.r, bg.g, bg.b, 255, useTrue24bit) : null;
      const fgColor = `rgb(${fg.r},${fg.g},${fg.b})`;
      const bgColor = farthest > 0 ? `rgb(${bg.r},${bg.g},${bg.b})` : null;
      const cellFg = cellColor(fg.r, fg.g, fg.b, useTrue24bit);
      const cellBg =
        farthest > 0 ? cellColor(bg.r, bg.g, bg.b, useTrue24bit) : null;
      row.push({ char: glyph.char, fg: cellFg, bg: cellBg });
      if (fgCode !== lastFg || bgCode !== lastBg) {
        const codes = [fgCode, bgCode].filter(Boolean);
        lineAnsi += codes.length ? `\x1b[${codes.join(";")}m` : "\x1b[0m";
        lastFg = fgCode;
        lastBg = bgCode;
      }
      lineAnsi += glyph.char;
      const style = `color:${fgColor};${bgColor ? `background:${bgColor};` : ""}`;
      lineHtml += `<span style="${style}">${glyph.char}</span>`;
    }
    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }
  return { ansi, html, cells };
}

export function renderSextant(pixels, width, height, useTrue24bit) {
  return renderMosaic(
    pixels,
    width,
    height,
    3,
    (mask) => SEXTANT_CHARS[mask],
    useTrue24bit,
  );
}

export function renderOctant(pixels, width, height, useTrue24bit) {
  return renderMosaic(
    pixels,
    width,
    height,
    4,
    (mask) => OCTANT_GLYPHS[mask],
    useTrue24bit,
  );
}

/**
 * Render using full blocks (two spaces with background color)
 */
export function renderFullBlocks(pixels, width, height, useTrue24bit) {
  let ansi = "";
  let html = "";
  const cells = [];

  for (let y = 0; y < height; y++) {
    let lineAnsi = "";
    let lineHtml = "";
    let lastBg = null;
    const row = [];

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      const bgCode = rgbaToBgAnsi(r, g, b, a, useTrue24bit);
      const bgColor = a >= 32 ? `rgb(${r},${g},${b})` : null;
      const cellBg = a >= 32 ? cellColor(r, g, b, useTrue24bit) : null;

      row.push({ char: "  ", fg: null, bg: cellBg });

      if (bgCode !== lastBg) {
        lineAnsi += bgCode ? `\x1b[${bgCode}m` : "\x1b[0m";
        lastBg = bgCode;
      }
      lineAnsi += "  ";

      lineHtml += bgColor
        ? `<span style="background:${bgColor}">  </span>`
        : "  ";
    }

    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }

  return { ansi, html, cells };
}

/**
 * Render using block characters (█) with foreground color - 1 char per pixel
 */
export function renderBlockChars(pixels, width, height, useTrue24bit) {
  let ansi = "";
  let html = "";
  const cells = [];

  for (let y = 0; y < height; y++) {
    let lineAnsi = "";
    let lineHtml = "";
    let lastFg = null;
    const row = [];

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a < 32) {
        row.push({ char: " ", fg: null, bg: null });
        if (lastFg !== null) {
          lineAnsi += "\x1b[0m";
          lastFg = null;
        }
        lineAnsi += " ";
        lineHtml += " ";
      } else {
        const fgCode = rgbaToFgAnsi(r, g, b, a, useTrue24bit);
        const fgColor = `rgb(${r},${g},${b})`;
        const cf = cellColor(r, g, b, useTrue24bit);

        row.push({ char: "█", fg: cf, bg: null });

        if (fgCode !== lastFg) {
          lineAnsi += `\x1b[${fgCode}m`;
          lastFg = fgCode;
        }
        lineAnsi += "█";
        lineHtml += `<span style="color:${fgColor}">█</span>`;
      }
    }

    cells.push(row);
    ansi += lineAnsi + "\x1b[0m\n";
    html += lineHtml + "\n";
  }

  return { ansi, html, cells };
}

/**
 * Render in binary mode - just █ and space based on luminance, no color codes
 */
export function renderBinary(pixels, width, height) {
  let ansi = "";
  const cells = [];
  const white = { r: 255, g: 255, b: 255 };

  for (let y = 0; y < height; y += 2) {
    let line = "";
    const row = [];

    for (let x = 0; x < width; x++) {
      const topIdx = (y * width + x) * 4;
      const topR = pixels[topIdx];
      const topG = pixels[topIdx + 1];
      const topB = pixels[topIdx + 2];
      const topA = pixels[topIdx + 3];

      let botR = 0,
        botG = 0,
        botB = 0,
        botA = 0;
      if (y + 1 < height) {
        const botIdx = ((y + 1) * width + x) * 4;
        botR = pixels[botIdx];
        botG = pixels[botIdx + 1];
        botB = pixels[botIdx + 2];
        botA = pixels[botIdx + 3];
      }

      const topLum =
        topA >= 32 ? 0.299 * topR + 0.587 * topG + 0.114 * topB : 0;
      const botLum =
        botA >= 32 ? 0.299 * botR + 0.587 * botG + 0.114 * botB : 0;

      const topFilled = topLum >= 128;
      const botFilled = botLum >= 128;

      if (!topFilled && !botFilled) {
        line += " ";
        row.push({ char: " ", fg: null, bg: null });
      } else if (!topFilled && botFilled) {
        line += "▄";
        row.push({ char: "▄", fg: white, bg: null });
      } else if (topFilled && !botFilled) {
        line += "▀";
        row.push({ char: "▀", fg: white, bg: null });
      } else {
        line += "█";
        row.push({ char: "█", fg: white, bg: null });
      }
    }

    cells.push(row);
    ansi += line + "\n";
  }

  return { ansi, html: ansi, cells };
}

/**
 * Escape ANSI codes for shell printf
 */
export function escapeForPrintf(ansi) {
  return ansi
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\x1b/g, "\\033");
}
