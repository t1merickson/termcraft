/**
 * Tool registry — the single source of truth for every tool in Termcraft.
 *
 * The app shell (sidebar, router, tab content) and the landing page both read
 * from this list. Adding a tool means adding an entry here plus a tab component
 * registered in `app/src/tools/tabs.tsx`.
 */

export type ToolId =
  | "image-to-ansi"
  | "image-to-ascii"
  | "dither"
  | "video"
  | "editor"
  | "pixel-font"
  | "boxes"
  | "charts"
  | "spinners"
  | "progress"
  | "prompt"
  | "color-wheel"
  | "lookup"
  | "gradients";

export type GroupId = "convert" | "compose" | "interface" | "color";

export interface ToolGroup {
  id: GroupId;
  label: string;
  /** One line for the landing page section header. */
  blurb: string;
}

export interface Tool {
  id: ToolId;
  /** Sidebar + card title. */
  name: string;
  group: GroupId;
  /** Lucide icon name, resolved in `app/src/tools/icons.tsx`. */
  icon: string;
  /** One sentence, sentence case, no trailing period — used on cards. */
  tagline: string;
  /** Two or three sentences for the tool's landing-page section. */
  description: string;
  /** Three to five short capability bullets. */
  features: string[];
  /**
   * A tiny static sample of what the tool makes. Monospace, <= 12 lines.
   * Rendered in the card preview on the landing page.
   */
  preview: string[];
  /** True once the tool ships. Unfinished tools are hidden from the shell. */
  ready: boolean;
}

export const GROUPS: ToolGroup[] = [
  {
    id: "convert",
    label: "Convert",
    blurb: "Turn pictures and video into something a terminal can print.",
  },
  {
    id: "compose",
    label: "Compose",
    blurb: "Draw, type, and lay out terminal art by hand.",
  },
  {
    id: "interface",
    label: "Interface",
    blurb: "The moving parts of a command line app.",
  },
  {
    id: "color",
    label: "Color",
    blurb: "Find, match, and blend terminal colors.",
  },
];

export const TOOLS: Tool[] = [
  // ── Convert ──────────────────────────────────────────────────────────────
  {
    id: "image-to-ascii",
    name: "Image to ASCII",
    group: "convert",
    icon: "Type",
    tagline: "Photos into text, by brightness or by glyph shape",
    description:
      "The classic. Each cell of the image picks the character that best matches it. Brightness mode maps light to dark across a character ramp. Shape mode compares the actual drawn shape of every candidate glyph against the pixels underneath, so edges and curves survive.",
    features: [
      "Brightness ramps and shape-aware 6D glyph matching",
      "Braille mode packs 8 dots into every cell for 4x the detail",
      "A dozen glyph ramps: dots, lines, diagonals, crosses, diamonds, shades",
      "Plain text, 256-color, or 24-bit true color output",
    ],
    preview: [
      "        .:-=+**+=-:.        ",
      "     .=*#%@@@@@@%#*=.       ",
      "   .+#@@@@@@@@@@@@@#+.      ",
      "  :*@@@@@%*+==+*%@@@@*:     ",
      " .#@@@@#:      :#@@@@#.     ",
      " =@@@@%.        .%@@@@=     ",
      " *@@@@#          #@@@@*     ",
      " =@@@@%.        .%@@@@=     ",
      "  :*@@@@@%*++*%@@@@@*:      ",
      "    .=*#%@@@@@@%#*=.        ",
    ],
    ready: true,
  },
  {
    id: "image-to-ansi",
    name: "Image to ANSI",
    group: "convert",
    icon: "Image",
    tagline: "Full-color terminal images out of block characters",
    description:
      "Block characters have a trick: one text cell can hold two, four, or six independently colored regions. Stack that with 24-bit color escape codes and a terminal renders a real image, not an impression of one.",
    features: [
      "Half, quadrant, sextant, and octant blocks — up to 8 pixels per cell",
      "256-color or 24-bit true color escape codes",
      "Foreground-only mode for terminals with a fixed background",
      "Copy as raw ANSI, a printf one-liner, or a shell script",
    ],
    preview: [
      "  ▗▄▄▖▗▄▄▄▄▖▗▄▄▖  ",
      " ▟▓▓▓▛▀▀▀▀▜▓▓▓▙   ",
      "▐▓▓▛▘  ▄▄  ▝▜▓▓▌  ",
      "▐▓▛  ▗▟██▙▖  ▜▓▌  ",
      "▝▜▌  ▐████▌  ▐▛▘  ",
      " ▝▚▖  ▀▜▛▀  ▗▞▘   ",
      "  ▝▀▚▄▄▄▄▄▄▞▀▘    ",
      "  ░▒▓█ 24-bit     ",
    ],
    ready: true,
  },
  {
    id: "dither",
    name: "Dither Lab",
    group: "convert",
    icon: "Grip",
    tagline: "Fake a thousand colors out of four",
    description:
      "Dithering is how a machine with almost no colors still shows you a gradient. It scatters the error from each rounded-off pixel into its neighbours, so the eye blends what the palette cannot. This is the trick behind Game Boy screens, riso prints, and every good-looking 1-bit image.",
    features: [
      "11 algorithms: Floyd–Steinberg, Atkinson, Stucki, Burkes, Sierra, Bayer 2/4/8/16, halftone, blue noise",
      "Terminal-native palettes: 1-bit, ANSI 16, ANSI 256, grayscale ramp",
      "Retro palettes: Game Boy, Commodore 64, PICO-8, CGA, riso",
      "Output as block characters, braille, or a character ramp",
    ],
    preview: [
      "░░░░▒▒▒▒▓▓▓▓████",
      "░░▒▒░▒▓▒▓█▓██▓██",
      "░▒░▒▒▒▓▒▓▓█▓███▓",
      "▒░▒▒▓▒▓▓▓█▓███▓█",
      "░▒▒▓▒▓▓█▓██▓████",
      "▒▒▒▓▓▓▓███▓█████",
    ],
    ready: true,
  },
  {
    id: "video",
    name: "Video to ASCII",
    group: "convert",
    icon: "Video",
    tagline: "Live webcam and video files, converted frame by frame",
    description:
      "The same converters, running at speed. Drop in a video file or point it at your webcam and watch the frames turn into characters in real time. Record a loop and export it as an animated file or an asciinema cast.",
    features: [
      "Webcam capture with camera switching, or any local video file",
      "Brightness, shape-aware, braille, and block renderers",
      "Frame rate control with automatic slowdown under load",
      "Record straight to animated GIF or an asciinema .cast",
    ],
    preview: [
      " ● REC  00:04.2   24 fps ",
      "                         ",
      "   ⢀⣠⣴⣶⣶⣦⣄⡀     ▁▂▃▅▇▅▃  ",
      "  ⣰⣿⡿⠛⠉⠛⢿⣿⣆    ▂▃▅▇▅▃▂▁  ",
      "  ⣿⡟  ⣤⣤  ⢻⣿    ▃▅▇▅▃▂▁▂  ",
      "  ⠹⣿⣄⡀  ⢀⣠⣿⠏    ▅▇▅▃▂▁▂▃  ",
      "   ⠈⠛⠻⠿⠿⠟⠛⠁     ▇▅▃▂▁▂▃▅  ",
    ],
    ready: true,
  },

  // ── Compose ──────────────────────────────────────────────────────────────
  {
    id: "editor",
    name: "ASCII Editor",
    group: "compose",
    icon: "PencilLine",
    tagline: "A paint program where every pixel is a letter",
    description:
      "A grid you draw on directly. Type anywhere, drag a brush, snap a line, flood fill a region. Everything you place is one character in one cell, so what you draw is exactly what you can paste into a README.",
    features: [
      "Type, brush, line, rectangle, fill, and eraser tools",
      "Quick palettes for box drawing, blocks, shades, and braille",
      "Per-cell foreground color with the ANSI 256 palette",
      "Undo and redo, adjustable grid, export as text or ANSI",
    ],
    preview: [
      "┌─────────────────┐",
      "│  ▛▀▀▀▜   hello  │",
      "│  ▌ ▗ ▐   world  │",
      "│  ▙▄▄▄▟          │",
      "├─────────────────┤",
      "│ ▓▓▓▓▓▓▒▒▒░░░    │",
      "└─────────────────┘",
    ],
    ready: true,
  },
  {
    id: "pixel-font",
    name: "Pixel Font",
    group: "compose",
    icon: "Grid2x2",
    tagline: "Big block-letter banners from real pixel fonts",
    description:
      "Type a word, get it back as a grid of block characters. Thirteen genuine pixel fonts, each drawn on its own tiny matrix, rendered with whatever dot character you like — solid blocks, circles, diamonds, or your own.",
    features: [
      "15 bundled pixel fonts from 4x5 up to 6x10",
      "Nine dot styles plus any custom character",
      "Directional drop shadows with adjustable weight",
      "Copy as plain text, ANSI, or a ready-to-run printf",
    ],
    preview: [
      "█████ ████  ████  ██   ██",
      "  █   █     █  █  ███ ███",
      "  █   ███   ████  █ ███ █",
      "  █   █     █ █   █  █  █",
      "  █   ████  █  █  █     █",
    ],
    ready: true,
  },
  {
    id: "boxes",
    name: "Boxes & Tables",
    group: "compose",
    icon: "TableProperties",
    tagline: "Frames, tables, and trees in box-drawing characters",
    description:
      "Every terminal interface is made of the same 40 line-drawing characters. This assembles them for you: paste in text or rows and get back a correctly joined frame, table, or file tree — with the corners, tees, and crossings all lined up.",
    features: [
      "Frame styles: single, double, rounded, heavy, dashed, ASCII-safe",
      "Tables with alignment, padding, and header separators",
      "File-tree builder from an indented list",
      "Width-aware padding so emoji and wide characters still line up",
    ],
    preview: [
      "╭──────────┬───────╮",
      "│ package  │  ver  │",
      "├──────────┼───────┤",
      "│ vite     │ 7.3.1 │",
      "│ react    │ 19.2  │",
      "╰──────────┴───────╯",
    ],
    ready: true,
  },
  {
    id: "charts",
    name: "Charts",
    group: "compose",
    icon: "ChartNoAxesColumn",
    tagline: "Bar charts, sparklines, and heatmaps made of text",
    description:
      "Paste numbers, get a chart you can print in a log line. Eighth-height blocks give a bar 8 steps of precision per character, which is enough to read a trend at a glance without leaving the terminal.",
    features: [
      "Horizontal bars, vertical columns, sparklines, and heatmaps",
      "Sub-character precision using eighth blocks and braille",
      "Axis labels, value tags, and automatic scaling",
      "Color by value with any ANSI palette or gradient",
    ],
    preview: [
      "mon ████████████▊    62",
      "tue ██████▍          33",
      "wed ███████████████  78",
      "thu █████████▏       47",
      "fri ██████████████▋  74",
      "    ▁▂▃▅▂▇▆▃▁▂▄▆█▅▃▂▁",
    ],
    ready: true,
  },

  // ── Interface ────────────────────────────────────────────────────────────
  {
    id: "spinners",
    name: "Spinners",
    group: "interface",
    icon: "LoaderCircle",
    tagline: "Loading animations, playing at the speed they'll ship at",
    description:
      "A catalogue of terminal spinners running live at their real frame rates, so you can pick one by watching it rather than by reading its frames. Copy the frame array straight into your code.",
    features: [
      "Browse by category, previewed at the correct interval",
      "Scrub frame by frame and adjust the speed",
      "Copy as a JSON frame list, or as runnable shell, Node, or Python",
      "Compatibility notes for terminals without wide-glyph support",
    ],
    preview: [
      "⠋ building     ⣾ fetching",
      "◐ linking      ▖ writing ",
      "◜ resolving    ⠴ packing ",
      "▁▃▅▇ compiling           ",
    ],
    ready: true,
  },
  {
    id: "progress",
    name: "Progress Bars",
    group: "interface",
    icon: "Loader",
    tagline: "Bars, gauges, and meters with sub-character resolution",
    description:
      "A progress bar built from full blocks jumps in whole characters. Built from eighth blocks it moves eight times as smoothly, and nobody has to widen the terminal. Design the bar here, copy the format string out.",
    features: [
      "Smooth eighth-block fill, or classic hash and equals styles",
      "Gradient fills, brackets, percentage, counts, and rate readouts",
      "Live preview animating from 0 to 100 percent",
      "Export for shell, Node, Python, Rust, and Go progress libraries",
    ],
    preview: [
      "[████████████▌       ]  62%",
      "▕██████████████▊     ▏ 74%",
      "  ###########-------   55%",
      "  ▰▰▰▰▰▰▰▰▱▱▱▱  8/12",
    ],
    ready: true,
  },
  {
    id: "prompt",
    name: "Prompt Builder",
    group: "interface",
    icon: "ChevronRight",
    tagline: "Design your shell prompt and copy the config out",
    description:
      "Your prompt is a string of escape codes that almost nobody can write from memory. Drag segments into order, pick colors and separators, see it rendered exactly as your shell will, and copy out working configuration.",
    features: [
      "Segments for path, git branch and status, exit code, time, and more",
      "Powerline separators, or plain text for fonts without the glyphs",
      "Live preview across a clean repo, a dirty repo, and a failed command",
      "Exports for bash PS1, zsh PROMPT, fish, and starship.toml",
    ],
    preview: [
      " ~/dev/termcraft   main ±2  ✔ ",
      "❯ npm run build",
      "",
      " ~/dev/termcraft   main ±2  ✘1 ",
      "❯ ",
    ],
    ready: true,
  },

  // ── Color ────────────────────────────────────────────────────────────────
  {
    id: "color-wheel",
    name: "Color Wheel",
    group: "color",
    icon: "Palette",
    tagline: "All 256 terminal colors, arranged by hue",
    description:
      "The ANSI 256 palette is normally a flat numbered list, which tells you nothing about what the colors look like next to each other. Here it is bent into a wheel by hue and lightness, with the grayscale ramp laid out alongside.",
    features: [
      "The 6x6x6 color cube arranged by hue angle and lightness",
      "The 24-step grayscale ramp and the 16 base colors",
      "Click any swatch to copy its escape code",
      "Hover for hex, RGB, HSL, and the exact index",
    ],
    preview: [
      "  ▄▟███▙▄    16 ▸ 231",
      " ▟███████▙   6×6×6 cube",
      " █████████   by hue",
      " ▜███████▛   ",
      "  ▀▜███▛▀    232 ▸ 255",
      " ░░▒▒▓▓██    grayscale",
    ],
    ready: true,
  },
  {
    id: "lookup",
    name: "Lookup",
    group: "color",
    icon: "Search",
    tagline: "Nearest terminal color to any hex, RGB, or HSL",
    description:
      "You have a brand color. The terminal has 256 slots and none of them is it. This finds the closest one, shows you how far off it is, and gives you the escape code — plus the runners-up, in case the nearest match is the wrong kind of wrong.",
    features: [
      "Accepts hex, RGB, HSL, and CSS color names",
      "Nearest match by RGB distance or perceptual difference",
      "Shows the top five candidates with their error",
      "Side-by-side comparison against the original",
    ],
    preview: [
      "  #7c3aed  ▸  ANSI 98",
      "  ██████     ██████",
      "  target     match",
      "  ΔE 3.4   \\033[38;5;98m",
    ],
    ready: true,
  },
  {
    id: "gradients",
    name: "Gradients",
    group: "color",
    icon: "Blend",
    tagline: "Color ramps for text, bars, and backgrounds",
    description:
      "Build a gradient between any two or more colors and apply it across a line of text, a progress bar, or a block. Blends in the color space you choose, then snaps to whichever palette your terminal actually supports.",
    features: [
      "Blend in RGB, HSL, or OKLCH — OKLCH avoids muddy midpoints",
      "Any number of stops, with adjustable easing between them",
      "Snap to ANSI 16, ANSI 256, or keep full 24-bit color",
      "Apply across text, block runs, or a bar, then copy the escapes",
    ],
    preview: [
      "T E R M C R A F T",
      "████████████████",
      "▓▓▓▒▒▒░░░   ░▒▓█",
      "oklch ▸ ansi256",
    ],
    ready: true,
  },
];

export const TOOLS_BY_ID: Record<ToolId, Tool> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolId, Tool>;

export function toolsInGroup(group: GroupId): Tool[] {
  return TOOLS.filter((t) => t.group === group);
}

export function isToolId(value: string): value is ToolId {
  return Object.prototype.hasOwnProperty.call(TOOLS_BY_ID, value);
}
