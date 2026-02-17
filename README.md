# Termcraft

A browser-based terminal art toolkit. 7 tools for working with ANSI colors, image/video conversion, ASCII editing, and pixel fonts.

Built with Vite, Tailwind CSS v4, and the [Geist](https://vercel.com/geist) design system.

## Tools

### Color Wheel

ANSI 16 and 256 color palettes arranged by hue angle, with grayscale strip. Click any color to copy its escape code. Hover for details.

### Lookup & Convert

Find the nearest ANSI 256 color from HEX, RGB, or HSL input. Shows matched color, escape code, and Euclidean distance in RGB space.

### Image to ANSI

Convert images to terminal art using ANSI escape codes. Render modes: half blocks (fg+bg or fg-only), quadrant blocks, full blocks, spaces (bg-only), binary. 256-color or 24-bit true color. Configurable dimensions with preset scales, invert, and greyscale options.

### Image to ASCII

Convert images to ASCII art via brightness mapping or shape-aware 6D vector matching. Five character sets (standard, detailed, blocks, simple, extended). Adjustable contrast exponent and directional contrast from neighboring cells. Plain, 256-color, or 24-bit output.

### ASCII Editor

Grid-based canvas for composing ASCII art. Tools: type, brush, line, fill, eraser. Quick character palette, configurable grid size, undo/redo. Export as plain text or ANSI codes.

### Video to ASCII

Real-time video and webcam to ASCII. Upload files or use webcam with camera switching. Brightness or shape-aware matching. Adjustable FPS with auto-reduce for performance.

### Pixel Font

Render text as block-character pixel art with 13 built-in fonts. Dot styles: full block, square, circle, diamond, rectangle, and more. Four directional shadows with adjustable intensity. Copy as ANSI or `printf` command.

## Getting Started

```bash
npm install
npm run dev       # http://localhost:8000
```

## Scripts

```bash
npm run build     # Production build (output: app/dist/)
npm run preview   # Preview production build
npm test          # 33 headless visual regression tests
npm run test:update  # Regenerate test baselines
```

Font import (see `app/fonts/README.md` for details):

```bash
npm run import:png     -- --input <sprite.png> --output <font.json> ...
npm run import:bmfont  -- --xml <file.xml> --png <file.png> --output <font.json> ...
npm run import:otf     -- --input <file.otf> --output <font.json> ...
```

## Project Structure

```
app/                        Runnable application (Vite root)
  index.html                App shell
  src/
    app.js                  Entry point, tab navigation
    utils.js                Shared helpers (toast, clipboard, image loading)
    styles.css              Tailwind v4 config with Geist design tokens
    engines/                Core rendering engines
      ansi256.js            ANSI 256 color computation and lookup
      image-to-ansi.js      Image-to-ANSI conversion (half/quad/full/binary)
      image-to-ascii.js     Image-to-ASCII (brightness + shape-aware)
      shape-vectors.js      6D shape vector matching, k-d tree, cache
      ascii-editor.js       Grid-based ASCII art editor
      video-to-ascii.js     Real-time video-to-ASCII converter
      pixel-font.js         Pixel font loader and renderer
    tabs/                   Tab UI modules (one per sidebar tool)
  fonts/                    Runtime font data (13 pixel fonts)
    index.json              Font registry

assets/                     Static assets
  geist/                    Geist Sans + Mono woff2 fonts
  font-sources/             Build-time font source files (PNG sprites, OTFs)

scripts/                    Build and import tooling
  test-render.js            Headless render test harness
  import-png-sprite.js      Import font from PNG sprite sheet
  import-bmfont-xml.js      Import font from BMFont XML + PNG
  import-otf.js             Import font from OTF/TTF file
  migrate-fonts-to-binary.js  One-shot glyph format migration

tests/                      Test data and baselines
  samples/                  Input images (3 PNGs)
  expected/                 Baseline renders (33 PNGs, git-tracked)
  output/                   Transient test output (gitignored)

docs/                       Documentation and postmortems
```

## ANSI 256 Color Specification

Colors 0-255 are computed from the standard:

- **0-15** -- Standard 16 terminal colors (implementation-defined)
- **16-231** -- 6x6x6 color cube: `16 + 36r + 6g + b` where each channel maps to `[0, 95, 135, 175, 215, 255]`
- **232-255** -- 24 grayscale steps: `8 + 10i` for i in 0..23

## Design System

The UI uses real `--ds-*` tokens from [Geist](https://vercel.com/geist) (dark theme). Tailwind CSS v4's `@theme` maps these to utility classes like `bg-gray-alpha-100`, `text-gray-900`, `shadow-focus-ring`.

## License

MIT
