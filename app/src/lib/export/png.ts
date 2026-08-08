import type { Grid } from "@/lib/ansi-parse";

export interface RasterOptions {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  scale?: 1 | 2 | 3 | 4;
  background?: string | "transparent";
  padding?: number;
}

export const DEFAULT_MONO = "'Geist Mono', 'SF Mono', ui-monospace, monospace";

export function rasterMetrics(grid: Grid, opts: RasterOptions = {}, context?: CanvasRenderingContext2D) {
  const fontFamily = opts.fontFamily ?? DEFAULT_MONO;
  const fontSize = opts.fontSize ?? 16;
  const lineHeight = opts.lineHeight ?? 1;
  const letterSpacing = opts.letterSpacing ?? 0;
  const padding = opts.padding ?? 16;
  if (context) context.font = `${fontSize}px ${fontFamily}`;
  const measured = context?.measureText("0").width ?? fontSize * 0.6;
  const cellWidth = measured + letterSpacing;
  const cellHeight = fontSize * lineHeight;
  return {
    fontFamily, fontSize, lineHeight, letterSpacing, padding, cellWidth, cellHeight,
    width: Math.max(1, padding * 2 + grid.cols * cellWidth),
    height: Math.max(1, padding * 2 + grid.rows * cellHeight),
  };
}

function rgb(color: [number, number, number]) {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

export function rasterize(grid: Grid, opts: RasterOptions = {}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas 2D rendering is unavailable");
  const metrics = rasterMetrics(grid, opts, measure);
  const scale = opts.scale ?? 2;
  canvas.width = Math.ceil(metrics.width * scale);
  canvas.height = Math.ceil(metrics.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D rendering is unavailable");
  ctx.scale(scale, scale);
  ctx.textBaseline = "top";
  ctx.font = `${metrics.fontSize}px ${metrics.fontFamily}`;

  if ((opts.background ?? "#000000") !== "transparent") {
    ctx.fillStyle = opts.background ?? "#000000";
    ctx.fillRect(0, 0, metrics.width, metrics.height);
  }

  grid.cells.forEach((row, y) => {
    for (let start = 0; start < row.length;) {
      const bg = row[start].bg;
      let end = start + 1;
      while (end < row.length && JSON.stringify(row[end].bg) === JSON.stringify(bg)) end += 1;
      if (bg) {
        ctx.fillStyle = rgb(bg);
        ctx.fillRect(metrics.padding + start * metrics.cellWidth, metrics.padding + y * metrics.cellHeight,
          (end - start) * metrics.cellWidth, metrics.cellHeight);
      }
      start = end;
    }
  });

  grid.cells.forEach((row, y) => row.forEach((cell, x) => {
    if (cell.ch === " ") return;
    ctx.fillStyle = cell.fg ? rgb(cell.fg) : "#ffffff";
    ctx.font = `${cell.bold ? "bold " : ""}${metrics.fontSize}px ${metrics.fontFamily}`;
    ctx.fillText(cell.ch, metrics.padding + x * metrics.cellWidth,
      metrics.padding + y * metrics.cellHeight + (metrics.cellHeight - metrics.fontSize) / 2);
  }));
  return canvas;
}

export function toPngBlob(grid: Grid, opts?: RasterOptions): Promise<Blob> {
  const canvas = rasterize(grid, opts);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Could not encode PNG")), "image/png",
  ));
}
