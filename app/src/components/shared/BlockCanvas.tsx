import { useEffect, useRef } from "react";
import { cellsForChar } from "@/engines/block-glyphs";

export interface BlockCell {
  char: string;
  fg: { r: number; g: number; b: number } | null;
  bg: { r: number; g: number; b: number } | null;
}

export interface BlockCanvasProps {
  /** One entry per character cell, as the image-to-ansi renderers return. */
  cells: BlockCell[][];
  /** Character cell width in CSS pixels. Height is twice this. */
  cellWidth?: number;
  className?: string;
}

const rgb = (c: { r: number; g: number; b: number }) =>
  `rgb(${c.r},${c.g},${c.b})`;

/**
 * Draws a block-character grid as exact rectangles.
 *
 * This shows what the output looks like in a terminal whose font draws block
 * elements perfectly. Every rectangle edge is rounded to a whole device pixel
 * and each one starts where the last ended, so there are no seams and no
 * slivers of background between rows — the artefacts you get when the font's
 * glyph height and the CSS line height disagree.
 */
export function BlockCanvas({
  cells,
  cellWidth = 6,
  className,
}: BlockCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !cells.length) return;

    const cols = Math.max(...cells.map((r) => r.length));
    const rows = cells.length;
    const cw = cellWidth;
    const ch = cellWidth * 2; // terminal cells are about twice as tall as wide

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(cols * cw * dpr);
    canvas.height = Math.round(rows * ch * dpr);
    canvas.style.width = `${cols * cw}px`;
    canvas.style.height = `${rows * ch}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cols * cw, rows * ch);

    for (let row = 0; row < rows; row++) {
      const line = cells[row];
      // Snap the cell's own edges first, then subdivide inside them, so
      // neighbouring cells always share an edge exactly.
      const cellTop = Math.round(row * ch);
      const cellBottom = Math.round((row + 1) * ch);

      for (let col = 0; col < line.length; col++) {
        const cell = line[col];
        const cellLeft = Math.round(col * cw);
        const cellRight = Math.round((col + 1) * cw);
        const grid = cellsForChar(cell.char);

        if (cell.bg) {
          ctx.fillStyle = rgb(cell.bg);
          ctx.fillRect(
            cellLeft,
            cellTop,
            cellRight - cellLeft,
            cellBottom - cellTop,
          );
        }
        if (!grid || !cell.fg || grid.mask === 0) continue;

        ctx.fillStyle = rgb(cell.fg);
        const { w, h, mask } = grid;
        for (let dy = 0; dy < h; dy++) {
          const top = Math.round(cellTop + ((cellBottom - cellTop) * dy) / h);
          const bottom = Math.round(
            cellTop + ((cellBottom - cellTop) * (dy + 1)) / h,
          );
          for (let dx = 0; dx < w; dx++) {
            if (!(mask & (1 << (dy * w + dx)))) continue;
            const left = Math.round(
              cellLeft + ((cellRight - cellLeft) * dx) / w,
            );
            const right = Math.round(
              cellLeft + ((cellRight - cellLeft) * (dx + 1)) / w,
            );
            ctx.fillRect(left, top, right - left, bottom - top);
          }
        }
      }
    }
  }, [cells, cellWidth]);

  return (
    <canvas ref={ref} className={className} aria-label="Rendered output" />
  );
}
