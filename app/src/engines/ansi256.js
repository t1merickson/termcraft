/**
 * ANSI 256 Color Utilities
 *
 * Computes all 256 ANSI colors from first principles:
 * - 0-15: Standard 16 terminal colors
 * - 16-231: 6×6×6 color cube (values: 0, 95, 135, 175, 215, 255)
 * - 232-255: 24 grayscale steps (8 + 10*i for i in 0..23)
 */

// 6×6×6 cube channel values
export const CUBE_VALUES = Object.freeze([0, 95, 135, 175, 215, 255]);

// Standard 16 colors (VGA palette)
export const STANDARD_16 = Object.freeze([
  { id: 0, r: 0, g: 0, b: 0, name: "Black" },
  { id: 1, r: 128, g: 0, b: 0, name: "Maroon" },
  { id: 2, r: 0, g: 128, b: 0, name: "Green" },
  { id: 3, r: 128, g: 128, b: 0, name: "Olive" },
  { id: 4, r: 0, g: 0, b: 128, name: "Navy" },
  { id: 5, r: 128, g: 0, b: 128, name: "Purple" },
  { id: 6, r: 0, g: 128, b: 128, name: "Teal" },
  { id: 7, r: 192, g: 192, b: 192, name: "Silver" },
  { id: 8, r: 128, g: 128, b: 128, name: "Grey" },
  { id: 9, r: 255, g: 0, b: 0, name: "Red" },
  { id: 10, r: 0, g: 255, b: 0, name: "Lime" },
  { id: 11, r: 255, g: 255, b: 0, name: "Yellow" },
  { id: 12, r: 0, g: 0, b: 255, name: "Blue" },
  { id: 13, r: 255, g: 0, b: 255, name: "Fuchsia" },
  { id: 14, r: 0, g: 255, b: 255, name: "Aqua" },
  { id: 15, r: 255, g: 255, b: 255, name: "White" },
]);

/**
 * Build the complete 256 color palette
 */
function buildPalette() {
  const colors = new Array(256);

  // Standard 16 (0-15)
  for (const c of STANDARD_16) {
    colors[c.id] = { id: c.id, r: c.r, g: c.g, b: c.b, name: c.name };
  }

  // 6×6×6 cube (16-231)
  for (let ri = 0; ri < 6; ri++) {
    for (let gi = 0; gi < 6; gi++) {
      for (let bi = 0; bi < 6; bi++) {
        const id = 16 + ri * 36 + gi * 6 + bi;
        colors[id] = {
          id,
          r: CUBE_VALUES[ri],
          g: CUBE_VALUES[gi],
          b: CUBE_VALUES[bi],
          name: `Color${id}`,
        };
      }
    }
  }

  // Grayscale (232-255)
  for (let i = 0; i < 24; i++) {
    const gray = 8 + 10 * i;
    const id = 232 + i;
    colors[id] = {
      id,
      r: gray,
      g: gray,
      b: gray,
      name: `Grey${i}`,
    };
  }

  return Object.freeze(colors);
}

export const PALETTE = buildPalette();

// ========================================
// Color Space Conversions
// ========================================

export function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

// ========================================
// Color Matching
// ========================================

/**
 * Euclidean distance in RGB space
 */
export function colorDistanceEuclidean(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
}

/**
 * Manhattan distance (L1 norm) - faster, good for color matching
 */
export function colorDistanceManhattan(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r2 - r1) + Math.abs(g2 - g1) + Math.abs(b2 - b1);
}

/**
 * Find nearest ANSI 256 color to given RGB
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @param {string} metric - 'euclidean' or 'manhattan' (default: 'manhattan')
 * @returns {{ color: object, distance: number }}
 */
export function findNearest(r, g, b, metric = "manhattan") {
  const distFn =
    metric === "euclidean" ? colorDistanceEuclidean : colorDistanceManhattan;
  let nearest = PALETTE[0];
  let minDistance = Infinity;

  for (let i = 0; i < 256; i++) {
    const c = PALETTE[i];
    const dist = distFn(r, g, b, c.r, c.g, c.b);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = c;
    }
  }

  return { color: nearest, distance: minDistance };
}

/**
 * Convert RGB directly to ANSI 256 index (fast, using Manhattan distance)
 */
export function rgbToAnsi256(r, g, b) {
  return findNearest(r, g, b, "manhattan").color.id;
}

// ========================================
// Color Classification
// ========================================

/**
 * Check if a color is grayscale (low saturation)
 */
export function isGrayscale(r, g, b, threshold = 5) {
  const hsl = rgbToHsl(r, g, b);
  return hsl.s < threshold;
}

/**
 * Get color by ANSI index
 */
export function getColor(index) {
  if (index >= 0 && index < 256) {
    return PALETTE[index];
  }
  return null;
}

/**
 * Get foreground escape code
 */
export function fgEscape(index) {
  return `\x1b[38;5;${index}m`;
}

/**
 * Get background escape code
 */
export function bgEscape(index) {
  return `\x1b[48;5;${index}m`;
}

/**
 * Reset escape code
 */
export function resetEscape() {
  return "\x1b[0m";
}

/**
 * Get printable escape code string (for display)
 */
export function fgEscapeString(index) {
  return `\\e[38;5;${index}m`;
}

export function bgEscapeString(index) {
  return `\\e[48;5;${index}m`;
}
