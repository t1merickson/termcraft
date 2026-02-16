# ANSI 256 Color Tools

A browser-based toolkit for working with ANSI 256 terminal colors, image-to-ANSI conversion, and pixel font rendering. Built with Tailwind CSS v4 and Vite.

## Tools

### Color Wheel

Visual representation of all 256 ANSI colors arranged by hue angle, with grayscale colors in a separate strip. Two viewing modes:

- **ANSI 16** — Standard 16 terminal colors
- **ANSI 256** — Full 256 color palette with 6x6x6 color cube

Click any color to copy its escape code. Hover for color details.

### Lookup & Convert

Find the nearest ANSI 256 color from HEX, RGB, or HSL input. Shows the input color, matched ANSI color, escape code, and Euclidean distance in RGB space.

### Image to ANSI

Convert images to terminal art using ANSI escape codes.

- **Render modes** — Half blocks (fg+bg or fg-only), quadrant blocks, full blocks, spaces (bg-only), binary
- **Color depth** — 256-color or 24-bit true color
- **Options** — Configurable dimensions, preset scales (1/2x, 1x, 2x, 1:1), invert brightness, greyscale
- **Output** — Live preview, copy raw ANSI escape codes or shell `printf` command

### Image to ASCII

Convert images to ASCII art using character density mapping.

- **Character sets** — Standard, detailed, blocks, simple, extended (70 chars)
- **Color modes** — Plain ASCII, 256-color, 24-bit true color
- **Options** — Same dimension/scale controls, invert, greyscale

### Pixel Font

Render text using block-character pixel art with 13 built-in fonts.

- **Featured fonts** — Geist Pixel, Pixel Alpha, Public Pixel
- **Dot styles** — Full block, square, circle, diamond, rectangle, and more (or custom character)
- **Shadow** — Four directional shadows with adjustable intensity
- **Glyph preview** — Browse all characters in the current font
- **Output** — Copy rendered text as ANSI or `printf` command

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:8000`.

### Build for production

```bash
npm run build
npm run preview
```

### Run tests

```bash
npm test
```

Runs 33 headless render tests across all image conversion modes. Test images live in `samples/`, expected output in `test-output/expected/`.

## Project Structure

```
index.html              Single-page app (all 5 tools)
vite.config.js          Vite + Tailwind CSS v4 plugin
src/
  styles.css            Tailwind v4 with @theme (Geist design tokens)
  app.js                UI logic, tab navigation, event handling
  ansi256.js            ANSI 256 color computation and lookup
  image-to-ansi.js      Image-to-ANSI conversion engine
  image-to-ascii.js     Image-to-ASCII conversion engine
  pixel-font.js         Pixel font loader and renderer
fonts/
  index.json            Font registry (13 fonts)
  <font-id>/font.json   Individual font glyph data
assets/
  geist/                Geist Sans + Mono variable woff2 fonts
scripts/
  test-render.js        Headless render test harness
  import-png-sprite.js  Import fonts from PNG sprite sheets
  import-bmfont-xml.js  Import fonts from BMFont XML format
  import-otf.js         Import fonts from OTF files
samples/                Test input images
```

## Design System

The UI follows the [Geist](https://vercel.com/geist) design system, using real `--ds-*` tokens extracted from vercel.com/geist (dark theme). Tailwind CSS v4's `@theme` directive maps these to utility classes like `bg-gray-alpha-100`, `text-gray-900`, `shadow-focus-ring`, etc.

## ANSI 256 Color Specification

Colors 0-255 are computed from the standard:

- **0-15** — Standard 16 terminal colors (implementation-defined)
- **16-231** — 6x6x6 color cube: `16 + 36r + 6g + b` where each channel maps to `[0, 95, 135, 175, 215, 255]`
- **232-255** — 24 grayscale steps: `8 + 10i` for i in 0..23

## Pixel Fonts

See [`fonts/README.md`](fonts/README.md) for the font JSON format and import workflow.

## License

MIT
