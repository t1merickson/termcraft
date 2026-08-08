export interface BorderStyle {
  topLeft: string; topRight: string; bottomLeft: string; bottomRight: string;
  horizontal: string; vertical: string; leftTee: string; rightTee: string;
  topTee: string; bottomTee: string; cross: string;
}

export const BORDER_STYLES: Record<string, BorderStyle> = {
  single: { topLeft:"┌",topRight:"┐",bottomLeft:"└",bottomRight:"┘",horizontal:"─",vertical:"│",leftTee:"├",rightTee:"┤",topTee:"┬",bottomTee:"┴",cross:"┼" },
  double: { topLeft:"╔",topRight:"╗",bottomLeft:"╚",bottomRight:"╝",horizontal:"═",vertical:"║",leftTee:"╠",rightTee:"╣",topTee:"╦",bottomTee:"╩",cross:"╬" },
  rounded: { topLeft:"╭",topRight:"╮",bottomLeft:"╰",bottomRight:"╯",horizontal:"─",vertical:"│",leftTee:"├",rightTee:"┤",topTee:"┬",bottomTee:"┴",cross:"┼" },
  heavy: { topLeft:"┏",topRight:"┓",bottomLeft:"┗",bottomRight:"┛",horizontal:"━",vertical:"┃",leftTee:"┣",rightTee:"┫",topTee:"┳",bottomTee:"┻",cross:"╋" },
  dashed: { topLeft:"┌",topRight:"┐",bottomLeft:"└",bottomRight:"┘",horizontal:"╌",vertical:"╎",leftTee:"├",rightTee:"┤",topTee:"┬",bottomTee:"┴",cross:"┼" },
  ascii: { topLeft:"+",topRight:"+",bottomLeft:"+",bottomRight:"+",horizontal:"-",vertical:"|",leftTee:"+",rightTee:"+",topTee:"+",bottomTee:"+",cross:"+" },
  none: { topLeft:"",topRight:"",bottomLeft:"",bottomRight:"",horizontal:"",vertical:"",leftTee:"",rightTee:"",topTee:"",bottomTee:"",cross:"" },
};

const combining = (cp: number) =>
  (cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) ||
  (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) ||
  (cp >= 0xfe20 && cp <= 0xfe2f) || (cp >= 0xfe00 && cp <= 0xfe0f) ||
  (cp >= 0x1f3fb && cp <= 0x1f3ff) || cp === 0x200d;
const wide = (cp: number) =>
  cp >= 0x1100 && (cp <= 0x115f || cp === 0x2329 || cp === 0x232a ||
  (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) || (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe19) ||
  (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f000 && cp <= 0x1faff) ||
  (cp >= 0x20000 && cp <= 0x3fffd));

export function stringWidth(value: string): number {
  let result = 0;
  const points = [...value].map((char) => char.codePointAt(0) ?? 0);
  let joined = false;
  for (let i = 0; i < points.length; i++) {
    const cp = points[i];
    if (cp === 0x200d) { joined = true; continue; }
    if (joined) { joined = false; continue; }
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff && points[i + 1] >= 0x1f1e6 && points[i + 1] <= 0x1f1ff) { result += 2; i++; continue; }
    if (points[i + 1] === 0xfe0f && !wide(cp)) { result += 2; continue; }
    if (combining(cp) || cp === 0 || cp < 32 || (cp >= 0x7f && cp < 0xa0)) continue;
    result += wide(cp) ? 2 : 1;
  }
  return result;
}

const spaces = (n: number) => " ".repeat(Math.max(0, n));
const alignCell = (value: string, width: number, align: "left" | "center" | "right") => {
  const gap = Math.max(0, width - stringWidth(value));
  if (align === "right") return spaces(gap) + value;
  if (align === "center") return spaces(Math.floor(gap / 2)) + value + spaces(Math.ceil(gap / 2));
  return value + spaces(gap);
};

export interface FrameOptions { style?: string; padding?: number; align?: "left" | "center" | "right"; title?: string; width?: number; }
export function frame(content: string, options: FrameOptions = {}): string {
  const b = BORDER_STYLES[options.style ?? "rounded"] ?? BORDER_STYLES.rounded;
  const padding = Math.max(0, options.padding ?? 1);
  const lines = content.split("\n");
  const natural = Math.max(1, ...lines.map(stringWidth));
  const inner = Math.max(natural, options.width ?? 0);
  const body = lines.map((line) => `${b.vertical}${spaces(padding)}${alignCell(line, inner, options.align ?? "left")}${spaces(padding)}${b.vertical}`);
  if (!b.horizontal) return body.join("\n");
  const span = inner + padding * 2;
  const title = (options.title ?? "").trim();
  const titleText = title ? ` ${title.slice(0, Math.max(0, span - 2))} ` : "";
  const top = b.topLeft + titleText + b.horizontal.repeat(Math.max(0, span - stringWidth(titleText))) + b.topRight;
  return [top, ...body, b.bottomLeft + b.horizontal.repeat(span) + b.bottomRight].join("\n");
}

export interface TableOptions { style?: string; padding?: number; header?: boolean; alignments?: Array<"auto" | "left" | "center" | "right">; innerRows?: boolean; }
export function table(rows: string[][], options: TableOptions = {}): string {
  if (!rows.length) return "";
  const b = BORDER_STYLES[options.style ?? "single"] ?? BORDER_STYLES.single;
  const padding = Math.max(0, options.padding ?? 1);
  const columns = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columns }, (_, i) => row[i] ?? ""));
  const widths = Array.from({ length: columns }, (_, i) => Math.max(1, ...normalized.map((row) => stringWidth(row[i]))));
  const numeric = widths.map((_, i) => normalized.slice(options.header ? 1 : 0).filter((r) => r[i].trim()).every((r) => Number.isFinite(Number(r[i]))));
  const aligns = widths.map((_, i) => options.alignments?.[i] && options.alignments[i] !== "auto" ? options.alignments[i] as "left"|"center"|"right" : numeric[i] ? "right" : "left");
  const line = (left: string, fill: string, joint: string, right: string) => left + widths.map((w) => fill.repeat(w + padding * 2)).join(joint) + right;
  const body = normalized.map((row) => b.vertical + row.map((cell, i) => spaces(padding) + alignCell(cell, widths[i], aligns[i]) + spaces(padding)).join(b.vertical) + b.vertical);
  if (!b.horizontal) return body.join("\n");
  const separator = line(b.leftTee, b.horizontal, b.cross, b.rightTee);
  const output = [line(b.topLeft, b.horizontal, b.topTee, b.topRight)];
  body.forEach((row, i) => { output.push(row); if (i < body.length - 1 && ((options.header && i === 0) || options.innerRows)) output.push(separator); });
  output.push(line(b.bottomLeft, b.horizontal, b.bottomTee, b.bottomRight));
  return output.join("\n");
}

interface TreeNode { text: string; children: TreeNode[]; }
export function tree(input: string): string {
  const roots: TreeNode[] = [];
  const stack: Array<{ level: number; node: TreeNode }> = [];
  for (const raw of input.split("\n").filter((line) => line.trim())) {
    const indent = raw.match(/^[\t ]*/)?.[0] ?? "";
    const level = (indent.match(/\t/g)?.length ?? 0) + Math.floor(indent.replace(/\t/g, "").length / 2);
    const node = { text: raw.trim(), children: [] };
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    if (stack.length) stack[stack.length - 1].node.children.push(node); else roots.push(node);
    stack.push({ level, node });
  }
  const output: string[] = [];
  const visit = (node: TreeNode, prefix: string, last: boolean, root: boolean) => {
    output.push(root ? node.text : `${prefix}${last ? "└── " : "├── "}${node.text}`);
    const childPrefix = root ? "" : prefix + (last ? "    " : "│   ");
    node.children.forEach((child, i) => visit(child, childPrefix, i === node.children.length - 1, false));
  };
  roots.forEach((root, i) => visit(root, "", i === roots.length - 1, true));
  return output.join("\n");
}
