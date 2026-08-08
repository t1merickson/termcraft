import { rgbToAnsi256 } from "./ansi256.js";
import { dither, type DitherName } from "./dither";

export interface BrailleOptions {
  threshold?: number;
  invert?: boolean;
  dither?: DitherName | "none";
  color?: "none" | "256" | "24bit";
}

export const BRAILLE_DOT_BITS = [
  0x01, 0x08,
  0x02, 0x10,
  0x04, 0x20,
  0x40, 0x80,
] as const;

function sample(imageData: ImageData, width: number, height: number): ImageData {
  if (imageData.width === width && imageData.height === height) {
    return new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  }
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.min(imageData.width - 1, Math.floor((x + 0.5) * imageData.width / width));
    const sy = Math.min(imageData.height - 1, Math.floor((y + 0.5) * imageData.height / height));
    const source = (sy * imageData.width + sx) * 4;
    const target = (y * width + x) * 4;
    output[target] = imageData.data[source]; output[target + 1] = imageData.data[source + 1];
    output[target + 2] = imageData.data[source + 2]; output[target + 3] = imageData.data[source + 3];
  }
  return new ImageData(output, width, height);
}

export function renderBraille(
  imageData: ImageData,
  cols: number,
  rows: number,
  opts: BrailleOptions = {},
): { ansi: string; html: string; text: string; width: number; height: number } {
  const width = Math.max(1, Math.floor(cols));
  const height = Math.max(1, Math.floor(rows));
  const threshold = Math.max(0, Math.min(255, opts.threshold ?? 128));
  const invert = opts.invert ?? false;
  const color = opts.color ?? "none";
  const source = sample(imageData, width * 2, height * 4);
  const algorithm = opts.dither ?? "none";
  const maskSource = algorithm === "none" ? source : dither(source, {
    algorithm,
    palette: "mono-1bit",
    // Diffusion quantises around 128; shift the source so the user-selected
    // threshold remains meaningful for every algorithm.
    brightness: (128 - threshold) / 255,
  });
  let ansi = "", html = "", text = "";

  for (let row = 0; row < height; row++) {
    let lineAnsi = "", lineHtml = "", lineText = "", lastAnsi: string | null = null;
    let htmlRun = "", htmlColor: string | null = null;
    const flushHtml = () => {
      if (!htmlRun) return;
      lineHtml += htmlColor ? `<span style="color:${htmlColor}">${htmlRun}</span>` : htmlRun;
      htmlRun = "";
    };
    for (let col = 0; col < width; col++) {
      let mask = 0, onR = 0, onG = 0, onB = 0, onCount = 0;
      let allR = 0, allG = 0, allB = 0, allCount = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) {
        const p = (((row * 4 + dy) * width * 2) + col * 2 + dx) * 4;
        const a = source.data[p + 3];
        const lum = 0.299 * maskSource.data[p] + 0.587 * maskSource.data[p + 1] + 0.114 * maskSource.data[p + 2];
        const on = a >= 32 && (invert ? lum < threshold : lum >= threshold);
        if (a >= 32) { allR += source.data[p]; allG += source.data[p + 1]; allB += source.data[p + 2]; allCount++; }
        if (on) {
          mask |= BRAILLE_DOT_BITS[dy * 2 + dx];
          onR += source.data[p]; onG += source.data[p + 1]; onB += source.data[p + 2]; onCount++;
        }
      }
      const char = String.fromCodePoint(0x2800 + mask);
      lineText += char;
      let nextAnsi: string | null = null, nextHtml: string | null = null;
      if (color !== "none" && (onCount || allCount)) {
        const count = onCount || allCount;
        const r = Math.round((onCount ? onR : allR) / count);
        const g = Math.round((onCount ? onG : allG) / count);
        const b = Math.round((onCount ? onB : allB) / count);
        nextAnsi = color === "24bit" ? `38;2;${r};${g};${b}` : `38;5;${rgbToAnsi256(r, g, b)}`;
        nextHtml = `rgb(${r},${g},${b})`;
      }
      if (nextAnsi !== lastAnsi) {
        lineAnsi += nextAnsi ? `\x1b[${nextAnsi}m` : "\x1b[0m";
        lastAnsi = nextAnsi;
      }
      lineAnsi += char;
      if (nextHtml !== htmlColor) { flushHtml(); htmlColor = nextHtml; }
      htmlRun += char;
    }
    flushHtml();
    text += lineText + "\n";
    ansi += lineAnsi + (color === "none" ? "\n" : "\x1b[0m\n");
    html += lineHtml + "\n";
  }
  return { ansi, html, text, width, height };
}
