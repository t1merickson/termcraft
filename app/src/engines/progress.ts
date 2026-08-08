import { findNearest, PALETTE } from "./ansi256.js";

export interface BarStyle {
  fill: string;
  track: string;
  partial?: string;
  head?: string;
}
export const BAR_STYLES: Record<string, BarStyle> = {
  smooth: { fill: "█", track: "░", partial: "▏▎▍▌▋▊▉" },
  blocks: { fill: "█", track: "░" },
  hash: { fill: "#", track: "-" },
  equals: { fill: "=", track: " ", head: ">" },
  dots: { fill: "⣿", track: "⣀" },
  shaded: { fill: "▓", track: "▒" },
  squares: { fill: "▰", track: "▱" },
  circles: { fill: "●", track: "○" },
  ascii: { fill: "#", track: " " },
};
export type Readout = "percentage" | "count" | "elapsed" | "rate" | "eta";
export interface ProgressOptions {
  style?: string;
  width?: number;
  brackets?: "none" | "square" | "pipes" | "parens" | "angle";
  readouts?: Readout[];
  positions?: Partial<Record<Readout, "before" | "after">>;
  total?: number;
  color?: "none" | "solid" | "gradient";
  colorA?: number;
  colorB?: number;
}
const brackets: Record<string, [string, string]> = {
  none: ["", ""],
  square: ["[", "]"],
  pipes: ["▕", "▏"],
  parens: ["(", ")"],
  angle: ["<", ">"],
};
const gradientIndex = (a: number, b: number, t: number) => {
  const start = PALETTE[a] ?? PALETTE[27],
    end = PALETTE[b] ?? PALETTE[201];
  return findNearest(
    start.r + (end.r - start.r) * t,
    start.g + (end.g - start.g) * t,
    start.b + (end.b - start.b) * t,
  ).color.id;
};
function decorate(
  chars: string[],
  filled: number,
  opts: ProgressOptions,
): string {
  if ((opts.color ?? "none") === "none") return chars.join("");
  return chars
    .map((char, i) =>
      i < filled
        ? `\x1b[38;5;${opts.color === "solid" ? (opts.colorA ?? 45) : gradientIndex(opts.colorA ?? 27, opts.colorB ?? 201, i / Math.max(1, filled - 1))}m${char}\x1b[0m`
        : char,
    )
    .join("");
}
const readout = (kind: Readout, percent: number, total: number) =>
  ({
    percentage: `${Math.round(percent)}%`,
    count: `${Math.round((total * percent) / 100)}/${total}`,
    elapsed: "00:03",
    rate: "24.8/s",
    eta: percent >= 100 ? "ETA 00:00" : "ETA 00:01",
  })[kind];
export function renderBar(
  percent: number,
  opts: ProgressOptions = {},
): { ansi: string; text: string } {
  const p = Math.max(0, Math.min(100, percent));
  const width = Math.max(1, opts.width ?? 24);
  const style = BAR_STYLES[opts.style ?? "smooth"] ?? BAR_STYLES.smooth;
  const exact = (p / 100) * width;
  const full = Math.floor(exact);
  const fraction = exact - full;
  const chars = Array(width).fill(style.track);
  let filled = full;
  for (let i = 0; i < full; i++) chars[i] = style.fill;
  if (style.partial && full < width && fraction > 0) {
    chars[full] = style.partial[Math.min(6, Math.floor(fraction * 8))];
    filled++;
  }
  if (style.head && p > 0 && p < 100) {
    chars[Math.min(width - 1, full)] = style.head;
    filled = Math.min(width, full + 1);
  }
  const [left, right] = brackets[opts.brackets ?? "square"] ?? brackets.square;
  const enabled = opts.readouts ?? ["percentage"];
  const before = enabled
    .filter((x) => opts.positions?.[x] === "before")
    .map((x) => readout(x, p, opts.total ?? 100))
    .join(" ");
  const after = enabled
    .filter((x) => opts.positions?.[x] !== "before")
    .map((x) => readout(x, p, opts.total ?? 100))
    .join(" ");
  const join = (bar: string) =>
    [before, `${left}${bar}${right}`, after].filter(Boolean).join(" ");
  return {
    text: join(chars.join("")),
    ansi: join(decorate(chars, filled, opts)),
  };
}
export function renderIndeterminate(
  frame: number,
  opts: ProgressOptions = {},
): { ansi: string; text: string } {
  const width = Math.max(4, opts.width ?? 24),
    segment = Math.max(2, Math.floor(width / 4)),
    cycle = Math.max(1, (width - segment) * 2),
    phase = ((frame % cycle) + cycle) % cycle;
  const start = phase <= width - segment ? phase : cycle - phase;
  const style = BAR_STYLES[opts.style ?? "smooth"] ?? BAR_STYLES.smooth;
  const chars = Array(width).fill(style.track);
  for (let i = start; i < start + segment; i++) chars[i] = style.fill;
  const [left, right] = brackets[opts.brackets ?? "square"] ?? brackets.square;
  return {
    text: `${left}${chars.join("")}${right}`,
    ansi: `${left}${decorate(chars, start + segment, opts)}${right}`,
  };
}
export type ExportLanguage = "bash" | "node" | "python" | "go" | "rust";
export function codeFor(
  language: ExportLanguage,
  opts: ProgressOptions,
): string {
  const style = BAR_STYLES[opts.style ?? "smooth"] ?? BAR_STYLES.smooth;
  const width = Math.max(1, opts.width ?? 24),
    [left, right] = brackets[opts.brackets ?? "square"] ?? brackets.square;
  const suffix = (opts.readouts ?? ["percentage"]).includes("percentage");
  if (language === "bash")
    return `progress() { local p=\${1:-0} i filled=$((p*${width}/100)); printf '\\r${left}'; for ((i=0;i<${width};i++)); do ((i<filled)) && printf '${style.fill}' || printf '${style.track}'; done; printf '${right}${suffix ? " %3d%%" : ""}' "$p"; }\nprogress 62`;
  if (language === "python")
    return `def progress(percent):\n    filled = percent * ${width} // 100\n    bar = "${style.fill}" * filled + "${style.track}" * (${width} - filled)\n    print(f"\\r${left}{bar}${right}${suffix ? " {percent:3d}%" : ""}", end="", flush=True)\n\nprogress(62)`;
  if (language === "go")
    return `package main\nimport ("fmt"; "strings")\nfunc progress(p int) { f := p * ${width} / 100; bar := strings.Repeat("${style.fill}", f) + strings.Repeat("${style.track}", ${width}-f); fmt.Printf("\\r${left}%s${right}${suffix ? " %3d%%" : ""}", bar${suffix ? ", p" : ""}) }\nfunc main() { progress(62) }`;
  if (language === "rust")
    return `fn progress(p: usize) { let f=p*${width}/100; let bar=format!("{}{}", "${style.fill}".repeat(f), "${style.track}".repeat(${width}-f)); print!("\\r${left}{}${right}${suffix ? " {:3}%" : ""}", bar${suffix ? ", p" : ""}); }\nfn main() { progress(62); }`;
  return `function progress(percent) { const filled=Math.floor(percent*${width}/100); const bar="${style.fill}".repeat(filled)+"${style.track}".repeat(${width}-filled); process.stdout.write(\`\\r${left}\${bar}${right}${suffix ? " ${percent.toString().padStart(3)}%" : ""}\`); }\nprogress(62);`;
}
