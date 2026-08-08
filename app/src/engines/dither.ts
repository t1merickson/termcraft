import { PALETTE as ANSI_PALETTE, STANDARD_16 } from "./ansi256.js";

export type DitherName =
  | "none"
  | "floyd-steinberg"
  | "atkinson"
  | "stucki"
  | "burkes"
  | "sierra-lite"
  | "jarvis"
  | "bayer-2"
  | "bayer-4"
  | "bayer-8"
  | "bayer-16"
  | "halftone"
  | "blue-noise";

export const DITHER_ALGORITHMS: { id: DitherName; label: string; kind: "diffusion" | "ordered" }[] = [
  { id: "none", label: "None (nearest colour)", kind: "ordered" },
  { id: "floyd-steinberg", label: "Floyd–Steinberg", kind: "diffusion" },
  { id: "atkinson", label: "Atkinson", kind: "diffusion" },
  { id: "stucki", label: "Stucki", kind: "diffusion" },
  { id: "burkes", label: "Burkes", kind: "diffusion" },
  { id: "sierra-lite", label: "Sierra Lite", kind: "diffusion" },
  { id: "jarvis", label: "Jarvis–Judice–Ninke", kind: "diffusion" },
  { id: "bayer-2", label: "Bayer 2×2", kind: "ordered" },
  { id: "bayer-4", label: "Bayer 4×4", kind: "ordered" },
  { id: "bayer-8", label: "Bayer 8×8", kind: "ordered" },
  { id: "bayer-16", label: "Bayer 16×16", kind: "ordered" },
  { id: "halftone", label: "Halftone (45°)", kind: "ordered" },
  { id: "blue-noise", label: "Blue noise", kind: "ordered" },
];

type RGB = [number, number, number];
const hex = (value: string): RGB => {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const grays = (count: number): RGB[] => Array.from({ length: count }, (_, i) => {
  const v = Math.round((i * 255) / (count - 1));
  return [v, v, v];
});

export const PALETTES: Record<string, { label: string; colors: RGB[] }> = {
  "mono-1bit": { label: "Monochrome (1-bit)", colors: [[0, 0, 0], [255, 255, 255]] },
  "ansi-16": { label: "ANSI 16", colors: STANDARD_16.map(({ r, g, b }: { r: number; g: number; b: number }) => [r, g, b] as RGB) },
  "ansi-256": { label: "ANSI 256", colors: ANSI_PALETTE.map(({ r, g, b }: { r: number; g: number; b: number }) => [r, g, b] as RGB) },
  "gray-4": { label: "Grayscale (4)", colors: grays(4) },
  "gray-8": { label: "Grayscale (8)", colors: grays(8) },
  "gray-24": { label: "ANSI grayscale ramp (24)", colors: Array.from({ length: 24 }, (_, i) => [8 + i * 10, 8 + i * 10, 8 + i * 10] as RGB) },
  gameboy: { label: "Game Boy", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"].map(hex) },
  "gameboy-pocket": { label: "Game Boy Pocket", colors: ["#000000", "#545454", "#a9a9a9", "#ffffff"].map(hex) },
  c64: { label: "Commodore 64", colors: ["#000000", "#ffffff", "#813338", "#75cec8", "#8e3c97", "#56ac4d", "#2e2c9b", "#edf171", "#8e5029", "#553800", "#c46c71", "#4a4a4a", "#7b7b7b", "#a9ff9f", "#706deb", "#b2b2b2"].map(hex) },
  pico8: { label: "PICO-8", colors: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"].map(hex) },
  cga: { label: "CGA", colors: ["#000000", "#0000aa", "#00aa00", "#00aaaa", "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa", "#555555", "#5555ff", "#55ff55", "#55ffff", "#ff5555", "#ff55ff", "#ffff55", "#ffffff"].map(hex) },
  "zx-spectrum": { label: "ZX Spectrum", colors: ["#000000", "#0000cd", "#cd0000", "#cd00cd", "#00cd00", "#00cdcd", "#cdcd00", "#cdcdcd", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"].map(hex) },
  riso: { label: "Risograph", colors: ["#000000", "#ff665e", "#0078bf", "#00a95c", "#ffb511", "#765ba7"].map(hex) },
  amber: { label: "Amber terminal", colors: ["#120b00", "#ffb000"].map(hex) },
  "green-phosphor": { label: "Green phosphor", colors: ["#001100", "#33ff66"].map(hex) },
};

type Kernel = { divisor: number; taps: [number, number, number][] };
const KERNELS: Partial<Record<DitherName, Kernel>> = {
  "floyd-steinberg": { divisor: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  atkinson: { divisor: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
  stucki: { divisor: 42, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]] },
  burkes: { divisor: 32, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]] },
  "sierra-lite": { divisor: 4, taps: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]] },
  jarvis: { divisor: 48, taps: [[1, 0, 7], [2, 0, 5], [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3], [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]] },
};

function bayer(size: number): Uint16Array {
  let matrix = [0, 2, 3, 1];
  let n = 2;
  while (n < size) {
    const next = new Array<number>(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = matrix[y * n + x] * 4;
      const nn = n * 2;
      next[y * nn + x] = v;
      next[y * nn + x + n] = v + 2;
      next[(y + n) * nn + x] = v + 3;
      next[(y + n) * nn + x + n] = v + 1;
    }
    matrix = next;
    n *= 2;
  }
  return Uint16Array.from(matrix);
}

const BAYER = { 2: bayer(2), 4: bayer(4), 8: bayer(8), 16: bayer(16) } as const;
const HALFTONE = Uint8Array.from([
  24, 10, 12, 26, 35, 47, 49, 37, 8, 0, 2, 14, 45, 59, 61, 51,
  22, 6, 4, 16, 43, 57, 63, 53, 30, 20, 18, 28, 33, 41, 55, 39,
  34, 46, 48, 36, 25, 11, 13, 27, 44, 58, 60, 50, 9, 1, 3, 15,
  42, 56, 62, 52, 23, 7, 5, 17, 32, 40, 54, 38, 31, 21, 19, 29,
]);
let blueNoiseTile: Uint16Array | null = null;

function blueNoise(): Uint16Array {
  if (blueNoiseTile) return blueNoiseTile;
  const count = 64 * 64;
  const scored = new Array<{ index: number; score: number }>(count);
  const hash = (n: number) => {
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
  };
  // Deterministic high-pass ranked noise: a fast seeded approximation to a
  // void-and-cluster tile that suppresses low-frequency neighbourhood clumps.
  const raw = new Float64Array(count);
  for (let i = 0; i < count; i++) raw[i] = hash(i + 0x9e3779b9) / 0xffffffff;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    let local = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      local += raw[((y + dy + 64) & 63) * 64 + ((x + dx + 64) & 63)];
    }
    const index = y * 64 + x;
    scored[index] = { index, score: raw[index] - local / 25 };
  }
  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  blueNoiseTile = new Uint16Array(count);
  scored.forEach((entry, rank) => { blueNoiseTile![entry.index] = rank; });
  return blueNoiseTile;
}

const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;

export function dither(
  imageData: ImageData,
  opts: {
    algorithm: DitherName;
    palette: string | RGB[];
    strength?: number;
    serpentine?: boolean;
    brightness?: number;
    contrast?: number;
  },
): ImageData {
  const { width, height } = imageData;
  const source = imageData.data;
  const output = new Uint8ClampedArray(source);
  const colors = typeof opts.palette === "string" ? (PALETTES[opts.palette] ?? PALETTES["mono-1bit"]).colors : opts.palette;
  const flat = new Int32Array(colors.length * 3);
  colors.forEach((color, i) => { flat[i * 3] = color[0]; flat[i * 3 + 1] = color[1]; flat[i * 3 + 2] = color[2]; });
  const cache = new Int16Array(32768);
  cache.fill(-1);
  const nearest = (r: number, g: number, b: number) => {
    const cr = clamp(r), cg = clamp(g), cb = clamp(b);
    const key = ((cr | 0) >> 3 << 10) | ((cg | 0) >> 3 << 5) | ((cb | 0) >> 3);
    let found = cache[key];
    if (found >= 0) return found;
    let best = 0, bestDistance = Infinity;
    for (let i = 0; i < colors.length; i++) {
      const p = i * 3;
      const dr = cr - flat[p], dg = cg - flat[p + 1], db = cb - flat[p + 2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    }
    cache[key] = best;
    return best;
  };
  const brightness = Math.max(-1, Math.min(1, opts.brightness ?? 0)) * 255;
  const contrast = Math.max(-1, Math.min(1, opts.contrast ?? 0));
  const contrastFactor = contrast >= 0 ? 1 + contrast * 3 : 1 + contrast * 0.75;
  const work = new Float32Array(width * height * 3);
  for (let i = 0, p = 0; i < source.length; i += 4, p += 3) {
    work[p] = clamp((source[i] - 128) * contrastFactor + 128 + brightness);
    work[p + 1] = clamp((source[i + 1] - 128) * contrastFactor + 128 + brightness);
    work[p + 2] = clamp((source[i + 2] - 128) * contrastFactor + 128 + brightness);
  }

  const strength = Math.max(0, Math.min(1, opts.strength ?? 1));
  const kernel = KERNELS[opts.algorithm];
  if (kernel) {
    const serpentine = opts.serpentine ?? true;
    for (let y = 0; y < height; y++) {
      const reverse = serpentine && (y & 1) === 1;
      for (let step = 0; step < width; step++) {
        const x = reverse ? width - 1 - step : step;
        const wp = (y * width + x) * 3;
        const choice = nearest(work[wp], work[wp + 1], work[wp + 2]);
        const cp = choice * 3;
        const er = work[wp] - flat[cp], eg = work[wp + 1] - flat[cp + 1], eb = work[wp + 2] - flat[cp + 2];
        const op = (y * width + x) * 4;
        output[op] = flat[cp]; output[op + 1] = flat[cp + 1]; output[op + 2] = flat[cp + 2];
        for (const [dx0, dy, weight] of kernel.taps) {
          const dx = reverse ? -dx0 : dx0;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny >= height) continue;
          const np = (ny * width + nx) * 3;
          const scale = strength * weight / kernel.divisor;
          work[np] += er * scale; work[np + 1] += eg * scale; work[np + 2] += eb * scale;
        }
      }
    }
  } else {
    let map: Uint16Array | Uint8Array | null = null;
    let size = 1;
    if (opts.algorithm.startsWith("bayer-")) { size = Number(opts.algorithm.slice(6)); map = BAYER[size as keyof typeof BAYER]; }
    else if (opts.algorithm === "halftone") { size = 8; map = HALFTONE; }
    else if (opts.algorithm === "blue-noise") { size = 64; map = blueNoise(); }
    const levels = size * size;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const wp = (y * width + x) * 3;
      const threshold = map ? ((map[(y % size) * size + (x % size)] + 0.5) / levels - 0.5) * 255 * strength : 0;
      const choice = nearest(work[wp] + threshold, work[wp + 1] + threshold, work[wp + 2] + threshold);
      const cp = choice * 3, op = (y * width + x) * 4;
      output[op] = flat[cp]; output[op + 1] = flat[cp + 1]; output[op + 2] = flat[cp + 2];
    }
  }
  return new ImageData(output, width, height);
}
