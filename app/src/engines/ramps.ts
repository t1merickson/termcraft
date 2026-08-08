export interface Ramp {
  id: string;
  label: string;
  chars: string;
  group: "ascii" | "blocks" | "geometric" | "lines" | "misc";
  /** true if it needs a font with good Unicode coverage */
  unicode: boolean;
  note?: string;
}

export const RAMP_GROUPS: { id: Ramp["group"]; label: string }[] = [
  { id: "ascii", label: "ASCII" },
  { id: "blocks", label: "Blocks" },
  { id: "geometric", label: "Geometric" },
  { id: "lines", label: "Lines" },
  { id: "misc", label: "Miscellaneous" },
];

// Within equal-coverage groups, glyphs are ordered from visually lighter to heavier.
export const RAMPS: Ramp[] = [
  {
    id: "standard",
    label: "Standard",
    chars: " .:-=+*#%@",
    group: "ascii",
    unicode: false,
  },
  {
    id: "detailed",
    label: "Detailed",
    chars: " .'`:;-~=+*!?#%@",
    group: "ascii",
    unicode: false,
  },
  {
    id: "simple",
    label: "Simple",
    chars: " .*#",
    group: "ascii",
    unicode: false,
  },
  {
    id: "extended",
    label: "Extended (70 characters)",
    chars:
      ' .`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    group: "ascii",
    unicode: false,
  },
  {
    id: "minimal",
    label: "Minimal",
    chars: " .oO@",
    group: "ascii",
    unicode: false,
  },
  {
    id: "numeric",
    label: "Numeric",
    chars: " 1234567890",
    group: "ascii",
    unicode: false,
    note: "Digit order follows the conventional numeric ramp.",
  },

  {
    id: "blocks",
    label: "Shades",
    chars: " ░▒▓█",
    group: "blocks",
    unicode: true,
  },
  {
    id: "eighths-up",
    label: "Eighths up",
    chars: " ▁▂▃▄▅▆▇█",
    group: "blocks",
    unicode: true,
  },
  {
    id: "eighths-left",
    label: "Eighths left",
    chars: " ▏▎▍▌▋▊▉█",
    group: "blocks",
    unicode: true,
  },
  {
    id: "quadrants",
    label: "Quadrants",
    chars: " ▘▝▖▗▀▌▞▚▐▄▛▜▙▟█",
    group: "blocks",
    unicode: true,
    note: "Ordered by filled quadrant count.",
  },

  {
    id: "dots",
    label: "Dots",
    chars: " ·∙•⬤",
    group: "geometric",
    unicode: true,
  },
  {
    id: "circles",
    label: "Circles",
    chars: " ◌○◍◉●",
    group: "geometric",
    unicode: true,
  },
  {
    id: "squares",
    label: "Squares",
    chars: " ▫▪◻◼■",
    group: "geometric",
    unicode: true,
  },
  {
    id: "diamonds",
    label: "Diamonds",
    chars: " ◇◈◆",
    group: "geometric",
    unicode: true,
  },
  {
    id: "triangles",
    label: "Triangles",
    chars: " ▵▴△▲",
    group: "geometric",
    unicode: true,
  },
  {
    id: "stars",
    label: "Stars",
    chars: " ˙⋆✦★",
    group: "geometric",
    unicode: true,
  },

  {
    id: "vertical",
    label: "Vertical",
    chars: " ⎸│┃█",
    group: "lines",
    unicode: true,
  },
  {
    id: "horizontal",
    label: "Horizontal",
    chars: " ⎯─━█",
    group: "lines",
    unicode: true,
  },
  {
    id: "diagonal",
    label: "Diagonal",
    chars: " ╱╲╳",
    group: "lines",
    unicode: true,
  },
  {
    id: "cross",
    label: "Cross",
    chars: " ·+✚✖",
    group: "lines",
    unicode: true,
  },
  {
    id: "hatch",
    label: "Hatch",
    chars: " ░╱▒╲▓█",
    group: "lines",
    unicode: true,
  },

  {
    id: "braille-density",
    label: "Braille density",
    chars: " ⠁⠃⠇⡇⡏⡟⡿⣿",
    group: "misc",
    unicode: true,
  },
  {
    id: "arrows",
    label: "Arrows",
    chars: " ·›→➜➤",
    group: "misc",
    unicode: true,
  },
  {
    id: "blocks-ascii",
    label: "Blocks (ASCII-safe)",
    chars: " .-+=#@",
    group: "misc",
    unicode: false,
  },
];

export function rampFor(id: string): string {
  return RAMPS.find((ramp) => ramp.id === id)?.chars ?? RAMPS[0].chars;
}
