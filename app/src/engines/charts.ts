import { PALETTE } from "./ansi256.js";

export interface Datum { label: string; value: number; }
export interface ChartOutput { ansi: string; text: string; }
export function parseData(input: string): Datum[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const lines = trimmed.includes("\n") ? trimmed.split(/\r?\n/) : trimmed.split(",").every((x) => Number.isFinite(Number(x.trim()))) ? trimmed.split(",") : [trimmed];
  return lines.flatMap((line, i) => {
    if (!line.includes(",") && /\s/.test(line.trim())) {
      return line.trim().split(/\s+/).flatMap((token, j) => Number.isFinite(Number(token)) ? [{ label: `${i + 1}.${j + 1}`, value: Number(token) }] : []);
    }
    const parts = line.split(",").map((x) => x.trim());
    const value = Number(parts.length > 1 ? parts[parts.length - 1] : parts[0]);
    return Number.isFinite(value) ? [{ label: parts.length > 1 ? parts.slice(0, -1).join(",") : String(i + 1), value }] : [];
  });
}
const range = (data: Datum[], min?: number, max?: number) => {
  const values = data.map((d) => d.value);
  const lo = min ?? Math.min(...values, 0);
  const hi0 = max ?? Math.max(...values, 0);
  return { lo, hi: hi0 === lo ? lo + 1 : hi0 };
};
const norm = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const color = (text: string, t: number, mode: "none" | "256", ramp = [27, 45, 226, 196]) => mode === "256" ? `\x1b[38;5;${ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]}m${text}\x1b[0m` : text;

export interface BarsOptions { width?: number; labels?: boolean; values?: boolean; labelAlign?: "left" | "right"; min?: number; max?: number; color?: "none" | "256"; }
export function bars(data: Datum[], opts: BarsOptions = {}): ChartOutput {
  if (!data.length) return { ansi: "", text: "" };
  const { lo, hi } = range(data, opts.min, opts.max); const width = opts.width ?? 20;
  const labelWidth = Math.max(...data.map((d) => d.label.length), 0); const eighths = "▏▎▍▌▋▊▉█";
  const lines = data.map((d) => {
    const t = norm(d.value, lo, hi); const units = Math.max(1, Math.round(t * width * 8));
    const full = Math.floor(units / 8); const rem = units % 8; const bar = "█".repeat(full) + (rem ? eighths[rem - 1] : "");
    const label = opts.labels === false ? "" : (opts.labelAlign === "right" ? d.label.padStart(labelWidth) : d.label.padEnd(labelWidth)) + " ";
    const value = opts.values === false ? "" : ` ${d.value}`;
    return { plain: label + bar.padEnd(width) + value, ansi: label + color(bar, t, opts.color ?? "none") + " ".repeat(Math.max(0, width - full - (rem ? 1 : 0))) + value };
  });
  return { text: lines.map((x) => x.plain).join("\n"), ansi: lines.map((x) => x.ansi).join("\n") };
}

export function columns(data: Datum[], height = 8, colorMode: "none" | "256" = "none"): ChartOutput {
  if (!data.length) return { ansi: "", text: "" }; const { lo, hi } = range(data); const glyphs = " ▁▂▃▄▅▆▇█";
  const units = data.map((d) => Math.max(1, Math.round(norm(d.value, lo, hi) * height * 8)));
  const textLines: string[] = [], ansiLines: string[] = [];
  for (let row = height - 1; row >= 0; row--) {
    const chars = units.map((u) => glyphs[Math.max(0, Math.min(8, u - row * 8))]); textLines.push(chars.join(" "));
    ansiLines.push(chars.map((c, i) => color(c, norm(data[i].value, lo, hi), colorMode)).join(" "));
  }
  return { text: textLines.join("\n"), ansi: ansiLines.join("\n") };
}

export function sparkline(data: Datum[], braille = false, colorMode: "none" | "256" = "none"): ChartOutput {
  if (!data.length) return { ansi: "", text: "" }; const { lo, hi } = range(data);
  let text: string;
  if (!braille) text = data.map((d) => "▁▂▃▄▅▆▇█"[Math.min(7, Math.floor(norm(d.value, lo, hi) * 8))]).join("");
  else {
    const bits = [[0x40, 0x04, 0x02, 0x01], [0x80, 0x20, 0x10, 0x08]];
    text = Array.from({ length: Math.ceil(data.length / 2) }, (_, pair) => {
      let mask = 0; for (let col = 0; col < 2; col++) { const d = data[pair * 2 + col]; if (d) { const level = Math.min(3, Math.round(norm(d.value, lo, hi) * 3)); mask |= bits[col][level]; } }
      return String.fromCodePoint(0x2800 + mask);
    }).join("");
  }
  const ansi = colorMode === "none" ? text : [...text].map((c, i) => color(c, norm(data[Math.min(data.length - 1, i * (braille ? 2 : 1))].value, lo, hi), colorMode)).join("");
  return { text, ansi };
}

export const HEAT_RAMPS: Record<string, number[]> = { grayscale: [232, 236, 240, 244, 248, 252, 255], ocean: [17, 18, 19, 20, 27, 39, 51], fire: [52, 88, 124, 160, 196, 208, 226] };
export function heatmap(input: string, palette = "ocean", cell = "█"): ChartOutput {
  const rows = input.trim().split(/\r?\n/).map((line) => line.split(/[\s,]+/).map(Number).filter(Number.isFinite)).filter((r) => r.length);
  const values = rows.flat(); if (!values.length) return { ansi: "", text: "" }; const lo = Math.min(...values), hi = Math.max(...values); const ramp = HEAT_RAMPS[palette] ?? HEAT_RAMPS.ocean;
  const ansi = rows.map((row) => row.map((v) => { const i = ramp[Math.min(ramp.length - 1, Math.floor(norm(v, lo, hi === lo ? lo + 1 : hi) * ramp.length))]; return cell === "  " ? `\x1b[48;5;${i}m  \x1b[0m` : `\x1b[38;5;${i}m${cell}\x1b[0m`; }).join("")).join("\n");
  const shades = " ░▒▓█"; const text = rows.map((row) => row.map((v) => shades[Math.min(4, Math.floor(norm(v, lo, hi === lo ? lo + 1 : hi) * 5))].repeat(cell === "  " ? 2 : 1)).join("")).join("\n");
  void PALETTE; return { ansi, text };
}
