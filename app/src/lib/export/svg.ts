import type { Grid } from "@/lib/ansi-parse";
import {
  DEFAULT_MONO,
  rasterMetrics,
  type RasterOptions,
} from "@/lib/export/png";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const color = (rgb?: [number, number, number], fallback = "#fff") =>
  rgb ? `rgb(${rgb.join(" ")})` : fallback;
const same = (a?: [number, number, number], b?: [number, number, number]) =>
  JSON.stringify(a) === JSON.stringify(b);

export function toSvg(grid: Grid, opts: RasterOptions = {}): string {
  let context: CanvasRenderingContext2D | undefined;
  if (typeof document !== "undefined")
    context = document.createElement("canvas").getContext("2d") ?? undefined;
  const m = rasterMetrics(grid, opts, context);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(m.width)}" height="${Math.ceil(m.height)}" viewBox="0 0 ${m.width} ${m.height}">`,
    "<!-- Font is referenced by family name and is not embedded. -->",
    `<style>text{font-family:${esc(opts.fontFamily ?? DEFAULT_MONO)};font-size:${m.fontSize}px;dominant-baseline:text-before-edge}</style>`,
  ];
  const background = opts.background ?? "#000000";
  if (background !== "transparent")
    parts.push(`<rect width="100%" height="100%" fill="${esc(background)}"/>`);

  grid.cells.forEach((row, y) => {
    for (let start = 0; start < row.length;) {
      const bg = row[start].bg;
      let end = start + 1;
      while (end < row.length && same(row[end].bg, bg)) end += 1;
      if (bg)
        parts.push(
          `<rect x="${m.padding + start * m.cellWidth}" y="${m.padding + y * m.cellHeight}" width="${(end - start) * m.cellWidth}" height="${m.cellHeight}" fill="${color(bg)}"/>`,
        );
      start = end;
    }
    for (let start = 0; start < row.length;) {
      const fg = row[start].fg;
      const bold = row[start].bold;
      let end = start + 1;
      while (
        end < row.length &&
        same(row[end].fg, fg) &&
        row[end].bold === bold
      )
        end += 1;
      const text = row
        .slice(start, end)
        .map((cell) => cell.ch)
        .join("");
      parts.push(
        `<text x="${m.padding + start * m.cellWidth}" y="${m.padding + y * m.cellHeight + (m.cellHeight - m.fontSize) / 2}" fill="${color(fg)}"${bold ? ' font-weight="bold"' : ""} xml:space="preserve">${esc(text)}</text>`,
      );
      start = end;
    }
  });
  parts.push("</svg>");
  return parts.join("\n");
}
