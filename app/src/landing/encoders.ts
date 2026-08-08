/**
 * Turns a luminance buffer from `scene.ts` into coloured character grids.
 *
 * Each encoder is one of the things the toolkit does, boiled down to the
 * smallest version that still looks like itself — so the landing page hero can
 * cycle through them and show what the tools actually produce.
 */

import type { Buffer } from "./scene";

export interface Encoder {
  id: string;
  label: string;
  /** Buffer samples per character cell, horizontally and vertically. */
  sx: number;
  sy: number;
  encode(buf: Buffer, cols: number, rows: number): string;
}

/** How much taller one buffer sample is than it is wide, once on screen. */
export function cellAspectFor(enc: Encoder): number {
  return (2 * enc.sx) / enc.sy;
}

// ── colour helpers ─────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Builds HTML one colour run at a time rather than one span per character.
 * At 100x40 that is the difference between a few hundred DOM nodes and four
 * thousand, every frame.
 */
class RunBuilder {
  private out = "";
  private pending = "";
  private color: string | null = null;

  push(ch: string, color: string | null) {
    if (color !== this.color) {
      this.flush();
      this.color = color;
    }
    this.pending += ch;
  }

  newline() {
    this.flush();
    this.color = null;
    this.out += "\n";
  }

  private flush() {
    if (!this.pending) return;
    const text = escapeHtml(this.pending);
    this.out += this.color
      ? `<span style="color:${this.color}">${text}</span>`
      : text;
    this.pending = "";
  }

  toString(): string {
    this.flush();
    return this.out;
  }
}

/** Average the samples covering one character cell. */
function cellAverage(
  buf: Buffer,
  col: number,
  row: number,
  sx: number,
  sy: number,
): { lum: number; hue: number; coverage: number } {
  let lum = 0;
  let hueX = 0;
  let hueY = 0;
  let hits = 0;
  const x0 = col * sx;
  const y0 = row * sy;

  for (let dy = 0; dy < sy; dy++) {
    const y = y0 + dy;
    if (y >= buf.height) continue;
    for (let dx = 0; dx < sx; dx++) {
      const x = x0 + dx;
      if (x >= buf.width) continue;
      const i = y * buf.width + x;
      if (!buf.hit[i]) continue;
      lum += buf.lum[i];
      // Average hue on the unit circle so 350 and 10 average to 0, not 180.
      const rad = (buf.hue[i] * Math.PI) / 180;
      hueX += Math.cos(rad);
      hueY += Math.sin(rad);
      hits++;
    }
  }

  const total = sx * sy;
  if (!hits) return { lum: 0, hue: 0, coverage: 0 };
  return {
    lum: lum / hits,
    hue: ((Math.atan2(hueY, hueX) * 180) / Math.PI + 360) % 360,
    coverage: hits / total,
  };
}

// ── encoders ───────────────────────────────────────────────────────────────

const ASCII_RAMP = " .:-=+*#%@";

/** The classic: one character per cell, picked by brightness. */
export const asciiEncoder: Encoder = {
  id: "ascii",
  label: "Characters",
  sx: 1,
  sy: 1,
  encode(buf, cols, rows) {
    const b = new RunBuilder();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * buf.width + col;
        const hit = buf.hit[i];
        if (!hit) {
          b.push(" ", null);
          continue;
        }
        const l = buf.lum[i];
        const idx = Math.min(
          ASCII_RAMP.length - 1,
          Math.floor(l * ASCII_RAMP.length),
        );
        const shade = Math.round(90 + l * 130);
        b.push(ASCII_RAMP[idx], `rgb(${shade},${shade},${shade})`);
      }
      b.newline();
    }
    return b.toString();
  },
};

/**
 * Braille packs eight dots into one cell, so a 100-column line carries 200
 * dots of horizontal detail. The bit layout is not raster order.
 */
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

export const brailleEncoder: Encoder = {
  id: "braille",
  label: "Braille",
  sx: 2,
  sy: 4,
  encode(buf, cols, rows) {
    const b = new RunBuilder();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let mask = 0;
        let lum = 0;
        let hits = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = col * 2 + dx;
            const y = row * 4 + dy;
            if (x >= buf.width || y >= buf.height) continue;
            const i = y * buf.width + x;
            if (!buf.hit[i]) continue;
            hits++;
            lum += buf.lum[i];
            // Ordered threshold so gradients break up into dot texture
            // instead of a hard edge.
            const threshold = 0.28 + ((dx * 2 + (dy % 2)) % 4) * 0.09;
            if (buf.lum[i] > threshold) mask |= BRAILLE_BITS[dy][dx];
          }
        }
        if (!mask) {
          b.push("⠀", null);
          continue;
        }
        const l = hits ? lum / hits : 0;
        const shade = Math.round(110 + l * 130);
        b.push(
          String.fromCharCode(0x2800 + mask),
          `rgb(${shade},${shade},${shade})`,
        );
      }
      b.newline();
    }
    return b.toString();
  },
};

/** Half blocks: two independently coloured pixels stacked in one cell. */
export const halfBlockEncoder: Encoder = {
  id: "blocks",
  label: "Half blocks",
  sx: 1,
  sy: 2,
  encode(buf, cols, rows) {
    let out = "";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const top = sampleColor(buf, col, row * 2);
        const bottom = sampleColor(buf, col, row * 2 + 1);
        if (!top && !bottom) {
          out += " ";
          continue;
        }
        // Upper half block with a foreground for the top and a background for
        // the bottom — exactly how the Image to ANSI tool does it.
        const fg = top ?? "transparent";
        const bg = bottom ?? "transparent";
        out += `<span style="color:${fg};background:${bg}">▀</span>`;
      }
      out += "\n";
    }
    return out;
  },
};

function sampleColor(buf: Buffer, x: number, y: number): string | null {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return null;
  const i = y * buf.width + x;
  if (!buf.hit[i]) return null;
  const l = buf.lum[i];
  const [r, g, bb] = hslToRgb(buf.hue[i], 0.55, 0.12 + l * 0.5);
  return `rgb(${r},${g},${bb})`;
}

const SHADE_RAMP = " ░▒▓█";

/** Shade blocks, coloured — the look most people mean by "terminal art". */
export const shadeEncoder: Encoder = {
  id: "shades",
  label: "Shade blocks",
  sx: 1,
  sy: 1,
  encode(buf, cols, rows) {
    const b = new RunBuilder();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { lum, hue, coverage } = cellAverage(buf, col, row, 1, 1);
        if (!coverage) {
          b.push(" ", null);
          continue;
        }
        const idx = Math.min(
          SHADE_RAMP.length - 1,
          Math.floor(lum * SHADE_RAMP.length),
        );
        const [r, g, bb] = hslToRgb(hue, 0.6, 0.25 + lum * 0.45);
        b.push(SHADE_RAMP[idx], `rgb(${r},${g},${bb})`);
      }
      b.newline();
    }
    return b.toString();
  },
};

/**
 * One-bit output with Floyd–Steinberg error diffusion — the reason the Dither
 * Lab exists. Two characters, and it still reads as a lit surface.
 */
export const ditherEncoder: Encoder = {
  id: "dither",
  label: "Dithered 1-bit",
  sx: 2,
  sy: 4,
  encode(buf, cols, rows) {
    const w = cols * 2;
    const h = rows * 4;
    const err = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = y * buf.width + x;
        const inside = x < buf.width && y < buf.height && buf.hit[si];
        const value = (inside ? buf.lum[si] : 0) + err[y * w + x];
        const on = value > 0.5 ? 1 : 0;
        const e = value - on;
        err[y * w + x] = on;

        // Spread the rounding error into the neighbours not yet visited.
        if (x + 1 < w) err[y * w + x + 1] += (e * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) err[(y + 1) * w + x - 1] += (e * 3) / 16;
          err[(y + 1) * w + x] += (e * 5) / 16;
          if (x + 1 < w) err[(y + 1) * w + x + 1] += e / 16;
        }
      }
    }

    const b = new RunBuilder();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let mask = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            if (err[(row * 4 + dy) * w + col * 2 + dx] === 1) {
              mask |= BRAILLE_BITS[dy][dx];
            }
          }
        }
        b.push(
          mask ? String.fromCharCode(0x2800 + mask) : "⠀",
          mask ? "rgb(220,220,220)" : null,
        );
      }
      b.newline();
    }
    return b.toString();
  },
};

export const ENCODERS: Encoder[] = [
  asciiEncoder,
  shadeEncoder,
  brailleEncoder,
  halfBlockEncoder,
  ditherEncoder,
];
