import { PALETTE, STANDARD_16 } from "@/engines/ansi256.js";

export interface Cell {
  ch: string;
  fg?: [number, number, number];
  bg?: [number, number, number];
  bold?: boolean;
}

export interface Grid {
  cols: number;
  rows: number;
  cells: Cell[][];
}

type RGB = [number, number, number];

function paletteColor(index: number): RGB | undefined {
  const color = PALETTE[index];
  return color ? [color.r, color.g, color.b] : undefined;
}

function standardColor(index: number): RGB | undefined {
  const color = STANDARD_16[index];
  return color ? [color.r, color.g, color.b] : undefined;
}

function applySgr(params: number[], state: Omit<Cell, "ch">) {
  if (params.length === 0) params = [0];
  for (let i = 0; i < params.length; i += 1) {
    const code = params[i];
    if (code === 0) {
      delete state.fg;
      delete state.bg;
      delete state.bold;
    } else if (code === 1) {
      state.bold = true;
    } else if (code === 22) {
      delete state.bold;
    } else if (code === 39) {
      delete state.fg;
    } else if (code === 49) {
      delete state.bg;
    } else if (code >= 30 && code <= 37) {
      state.fg = standardColor(code - 30);
    } else if (code >= 40 && code <= 47) {
      state.bg = standardColor(code - 40);
    } else if (code >= 90 && code <= 97) {
      state.fg = standardColor(code - 90 + 8);
    } else if (code >= 100 && code <= 107) {
      state.bg = standardColor(code - 100 + 8);
    } else if ((code === 38 || code === 48) && params[i + 1] === 5) {
      const color = paletteColor(params[i + 2]);
      if (color) state[code === 38 ? "fg" : "bg"] = color;
      i += 2;
    } else if ((code === 38 || code === 48) && params[i + 1] === 2) {
      const rgb = params.slice(i + 2, i + 5);
      if (
        rgb.length === 3 &&
        rgb.every((part) => Number.isFinite(part) && part >= 0 && part <= 255)
      ) {
        state[code === 38 ? "fg" : "bg"] = rgb as RGB;
      }
      i += 4;
    }
  }
}

/** Parse printable characters and SGR styling into a rectangular cell grid. */
export function parseAnsi(input: string): Grid {
  const lines: Cell[][] = [[]];
  const state: Omit<Cell, "ch"> = {};

  for (let i = 0; i < input.length;) {
    if (input[i] === "\x1b") {
      if (input[i + 1] === "]") {
        const end = input.slice(i + 2).search(/\x07|\x1b\\/);
        i =
          end < 0
            ? input.length
            : i + 2 + end + (input[i + 2 + end] === "\x07" ? 1 : 2);
        continue;
      }
      if (["P", "X", "^", "_"].includes(input[i + 1])) {
        const end = input.indexOf("\x1b\\", i + 2);
        i = end < 0 ? input.length : end + 2;
        continue;
      }
      if (input[i + 1] === "[") {
        const match = /^\x1b\[([0-9;]*)m/.exec(input.slice(i));
        if (match) {
          applySgr(
            match[1] === "" ? [0] : match[1].split(";").map(Number),
            state,
          );
          i += match[0].length;
          continue;
        }
        const csi = /^\x1b\[[0-?]*[ -\/]*[@-~]/.exec(input.slice(i));
        if (csi) {
          i += csi[0].length;
          continue;
        }
      }
      const escape = /^\x1b[ -\/]*[@-~]/.exec(input.slice(i));
      i += escape?.[0].length ?? 1;
      continue;
    }
    const point = String.fromCodePoint(input.codePointAt(i)!);
    i += point.length;
    if (point === "\n") {
      lines.push([]);
    } else if (point !== "\r") {
      lines[lines.length - 1].push({
        ch: point,
        ...state,
        fg: state.fg && [...state.fg],
        bg: state.bg && [...state.bg],
      });
    }
  }

  const cols = Math.max(0, ...lines.map((line) => line.length));
  for (const line of lines) {
    while (line.length < cols) line.push({ ch: " " });
  }
  return { cols, rows: lines.length, cells: lines };
}

function sameRgb(a?: RGB, b?: RGB) {
  return (
    a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2])
  );
}

function styleSequence(cell: Cell): string {
  const codes: string[] = [];
  if (cell.bold) codes.push("1");
  if (cell.fg) codes.push(`38;2;${cell.fg.join(";")}`);
  if (cell.bg) codes.push(`48;2;${cell.bg.join(";")}`);
  return codes.length ? `\x1b[${codes.join(";")}m` : "";
}

/** Convert a grid back to true-colour ANSI while suppressing unchanged runs. */
export function gridToAnsi(grid: Grid): string {
  return grid.cells
    .map((row) => {
      let active: Omit<Cell, "ch"> = {};
      let styled = false;
      let output = "";
      for (const cell of row) {
        const changed =
          active.bold !== cell.bold ||
          !sameRgb(active.fg, cell.fg) ||
          !sameRgb(active.bg, cell.bg);
        if (changed) {
          if (active.bold || active.fg || active.bg) output += "\x1b[0m";
          output += styleSequence(cell);
          active = { bold: cell.bold, fg: cell.fg, bg: cell.bg };
        }
        styled ||= !!(cell.bold || cell.fg || cell.bg);
        output += cell.ch;
      }
      if (styled) output += "\x1b[0m";
      return output;
    })
    .join("\n");
}
