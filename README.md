# Termcraft

**Everything you can make out of characters.**

A browser-based terminal art toolkit. Fourteen tools for turning pictures,
video, numbers and colour into things a terminal can print — and for designing
the moving parts of a command line app.

**[Open it →](https://t1merickson.github.io/termcraft/)**

Everything runs in your browser. Nothing uploads, there is no account, and
there is no server to have one on.

```
                             @@@@@@@@@@@@@@@@@@@
                          @@@@@@@@%@%%%%%%%%%%%%@@@
                       @@@@@%%%%%################%%%%
                     %@@%%%#########*************######
                    %%%%#######*****++++++++++++****####
                   ########*****++====--------===+++*****
                  ######****+++==---::::....::----==++****
                 *###*****+++==---::............::-==+++++
                 *****++++==--::.....      ......:::-===++
                 +++++++===--:....          =.:::---======
                 ===+=======-----=+*#%%@@@@@%##+++++====:
                  ==============++*#%@@@@@@@@%##**+++=-:
                    :--======++++**###%%%%%%###**+=-:
                        .::---==+++++*****++==-:
                            .::::--------::..
```

## The tools

### Convert

| Tool               | What it does                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Image to ASCII** | Photos into text, by brightness or by glyph shape. Braille mode packs 8 dots per cell for 4× the detail. 24 glyph ramps. |
| **Image to ANSI**  | Full-colour terminal images from block characters — half, quadrant, sextant and octant blocks, up to 8 pixels per cell.  |
| **Dither Lab**     | 12 dithering algorithms and 15 palettes, from 1-bit and ANSI 256 to Game Boy, C64, PICO-8 and CGA.                       |
| **Video to ASCII** | Webcam and video files converted frame by frame, in real time.                                                           |

### Compose

| Tool               | What it does                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **ASCII Editor**   | A paint program where every pixel is a letter. Type, brush, line, fill, eraser, undo.                  |
| **Pixel Font**     | Big block-letter banners from 12 real pixel fonts, with nine dot styles and drop shadows.              |
| **Boxes & Tables** | Frames, tables and file trees in box-drawing characters, with width-aware padding that survives emoji. |
| **Charts**         | Bar charts, sparklines and heatmaps made of text, with eighth-block sub-character precision.           |

### Interface

| Tool               | What it does                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| **Spinners**       | A catalogue of loading animations playing at their real frame rates.           |
| **Progress Bars**  | Bars and gauges with sub-character resolution, exportable for five languages.  |
| **Prompt Builder** | Design a shell prompt and copy out working bash, zsh, fish or starship config. |

### Colour

| Tool            | What it does                                                              |
| --------------- | ------------------------------------------------------------------------- |
| **Color Wheel** | All 256 terminal colours arranged by hue instead of by index.             |
| **Lookup**      | The nearest terminal colour to any hex, RGB or HSL, with the error shown. |
| **Gradients**   | Colour ramps for text, bars and blocks, blended in RGB, HSL or OKLCH.     |

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:8000>.

## Scripts

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Dev server on port 8000                                  |
| `npm run build`       | Production build into `app/dist/`                        |
| `npm run preview`     | Serve the production build                               |
| `npm test`            | 33 headless render tests against tracked baselines       |
| `npm run typecheck`   | TypeScript, no emit                                      |
| `npm run verify`      | Load every page in a headless browser and fail on errors |
| `npm run format`      | Prettier over the repo                                   |
| `npm run gen:samples` | Regenerate the built-in sample images                    |
| `npm run gen:og`      | Regenerate the social preview card                       |

`npm run verify` needs the dev server running in another terminal. It is the
check that catches a tool which compiles but breaks on mount.

## How it is put together

```
app/
  index.html            App shell
  public/               Copied verbatim into the build
    fonts/              12 pixel fonts, each with its own licence
    samples/            Built-in sample images (generated, see below)
  src/
    main.tsx            Entry point
    App.tsx             Landing page or workbench, chosen by the route
    tools/
      registry.ts       Every tool's id, name, copy and preview art
      tabs.tsx          Tool id to component
    landing/            Landing page, including the live hero renderer
    engines/            The actual work: no React in here
    tabs/               One file per tool: UI and state only
    components/         Shared UI, shadcn/ui primitives over Geist tokens
    hooks/  lib/        Clipboard, uploads, routing, export, recipes
assets/
  geist/                Geist Sans and Mono
  font-sources/         Build-time font sources (not tracked)
scripts/                Build, import and verification tooling
tests/                  Sample inputs and tracked render baselines
docs/                   Guides, reference and postmortems (see docs/README.md)
```

Two rules keep it navigable:

- **`engines/` never imports React.** The cell renderers take pixel arrays or
  numbers and return strings, which is why they can be tested headlessly and
  reused between the tools, the landing page and the sample generator. Some
  entry points do touch the browser — `processImage` creates a canvas — but
  the layer underneath stays independent of it.
- **`registry.ts` is the only place a tool is described.** The sidebar, the
  router, the landing page and the page headings all read from it.

### Routing

Hash routing (`#/`, `#/t/<tool>`), and the Vite base is relative. That means
the built site works from a GitHub Pages project path, a custom domain, or a
`file://` URL, with no rewrite rules anywhere.

### Sample images

Everything under `app/public/samples/` is generated by
`scripts/generate-samples.js` — a lit sphere, a synthetic portrait bust, a
Mandelbrot detail, fractal landscape ridges, a test chart, a checkered torus,
a 1-bit bitmap plate and a nebula. They are procedural and seeded, so regenerating produces identical
bytes. No stock photos, no licensing to trace.

## ANSI 256, briefly

Colours 0–255 come from the standard:

- **0–15** — the 16 base colours, whose exact values are up to the terminal
- **16–231** — a 6×6×6 cube: `16 + 36r + 6g + b`, each channel drawn from
  `[0, 95, 135, 175, 215, 255]`
- **232–255** — 24 greys: `8 + 10i`

## Documentation

`docs/` has guides as well as postmortems — start at
[docs/README.md](docs/README.md).

| Doc                                         | What it covers                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| [terminal-art.md](docs/terminal-art.md)     | How terminals draw anything: cells, escape codes, colour depths, block characters |
| [renderers.md](docs/renderers.md)           | Every image-to-characters mode and when to use it                                 |
| [dithering.md](docs/dithering.md)           | The dithering algorithms and palettes                                             |
| [glyph-geometry.md](docs/glyph-geometry.md) | Why block characters do not tile, and why previews paint rectangles               |
| [fonts.md](docs/fonts.md)                   | The pixel font format and how to add one                                          |
| [architecture.md](docs/architecture.md)     | Code layout, adding a tool, how the tests work                                    |

## Contributing

Issues and pull requests are welcome. Before opening one:

```bash
npm run typecheck && npm test && npm run format:check
```

If you touch a renderer, `npm test` compares against tracked baseline images.
A diff there is a real change in output — look at it before regenerating with
`npm run test:update`.

## Licence

The Termcraft source is MIT — see [LICENSE](LICENSE).

**The MIT licence does not cover the bundled fonts.** Each one is a third-party
work under its own terms, listed in Thanks below, with the full text kept
alongside the font in `app/public/fonts/<name>/LICENSE`. All of them permit
redistribution. One, the Elektron Pixel Font, is CC BY-SA, so anything derived
from it carries the same share-alike obligation.

## Thanks

Termcraft is mostly other people's work rearranged. Here is who.

### The reason this rebuild happened

[**ASCII Magic**](https://www.ascii-magic.com) set the bar for what a browser
ASCII toolkit could be. The idea of treating glyph ramps, dithering and export
formats as first-class rather than afterthoughts came straight from using it.

### Fonts

Twelve pixel fonts ship with the app. Real names, real authors:

| Font                                                                     | By                                                           | Licence       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------- |
| [Geist Pixel](https://github.com/vercel/geist-font)                      | The Geist Project Authors (Vercel)                           | SIL OFL 1.1   |
| [Public-Pixel](https://santiagocrespo.itch.io/public-pixel-for-gbs)      | Santiago Crespo, from GGBotNet's original                    | CC0 1.0       |
| [Micro 4x6](https://github.com/luizbills/font4x6)                        | Luiz Bills                                                   | Public domain |
| [Nitram Micro Mono 5x5](https://github.com/nitram509/nitram-micro-font)  | Martin W. Kirst                                              | MIT           |
| [Five Pixel Font](https://github.com/ChrisG0x20/five-pixel-font)         | Chris Gassib                                                 | Unlicense     |
| [VGA 8x8](https://github.com/dhepper/font8x8)                            | Daniel Hepper, Marcel Sondaar, IBM                           | Public domain |
| [Square 6x6](https://frostyfreeze.itch.io/pixel-bitmap-fonts-png-xml)    | frostyfreeze                                                 | CC0 1.0       |
| [Round 6x6](https://frostyfreeze.itch.io/pixel-bitmap-fonts-png-xml)     | frostyfreeze                                                 | CC0 1.0       |
| [Thick 8x8](https://frostyfreeze.itch.io/pixel-bitmap-fonts-png-xml)     | frostyfreeze                                                 | CC0 1.0       |
| [Minogram 6x10](https://frostyfreeze.itch.io/pixel-bitmap-fonts-png-xml) | frostyfreeze                                                 | CC0 1.0       |
| [Elektron Pixel Font](https://fontstruct.com/fontstructions/show/70152)  | savingaurora                                                 | CC BY-SA 3.0  |
| Pixel Alpha                                                              | Tim Erickson ([t1merickson](https://github.com/t1merickson)) | see below     |

**Pixel Alpha** is mine. It is an alpha: 26 uppercase letters, no digits or
punctuation, and a beta with lowercase is in progress. Anything it has no
glyph for renders as a gap.

[Geist Sans and Geist Mono](https://vercel.com/geist) by Vercel are the
interface typefaces, and the `--ds-*` design tokens the UI is built on are
Geist's.

### Algorithms

Nothing in `engines/` was invented here. The dithering kernels are named after
the people who published them:

- **Floyd–Steinberg** — Robert W. Floyd and Louis Steinberg, 1976
- **Atkinson** — Bill Atkinson, for the original Macintosh
- **Stucki** — Peter Stucki
- **Burkes** — Daniel Burkes
- **Sierra Lite** — Frankie Sierra
- **Jarvis–Judice–Ninke** — J. F. Jarvis, C. N. Judice and W. H. Ninke
- **Ordered / Bayer matrices** — Bryce E. Bayer
- **Void-and-cluster blue noise** — the approach is Robert Ulichney's; what
  ships here is a deterministic approximation, not his tile

Elsewhere:

- **Shape-aware ASCII matching** — [Alex Harri](https://alexharri.com)'s
  six-circle approach. The `AFFECTING_EXTERNALS` table in
  `app/src/engines/shape-vectors.js` is transcribed from his article rather
  than re-derived, because getting it right by reasoning about the geometry
  would have been fragile. See
  [docs/postmortems/shape-aware-ascii.md](docs/postmortems/shape-aware-ascii.md).
- **OKLab and OKLCH** — [Björn Ottosson](https://bottosson.github.io/posts/oklab/),
  which is why the gradient tool's midpoints do not go grey.
- **k-d trees** — Jon Bentley, 1975, used for nearest-glyph search.

### Data

- **Spinners** are curated from [cli-spinners](https://github.com/sindresorhus/cli-spinners)
  by Sindre Sorhus and [unicode-animations](https://www.npmjs.com/package/unicode-animations)
  by gunnargray-dev.
- **Retro palettes** reproduce the colours of the Game Boy, Game Boy Pocket,
  Commodore 64, [PICO-8](https://www.lexaloffle.com/pico-8.php), CGA and the
  ZX Spectrum. Those palettes are the work of the people who designed that
  hardware; the specific values here are the ones in common circulation and no
  single authoritative source is cited.
- **Character ramps** are the ones the ASCII art community has passed around
  for decades. The 70-character extended ramp in particular has no origin we
  can point to. If you know who first published it, please open an issue.

### The characters themselves

The Unicode Consortium, for encoding this stuff at all: Block Elements and the
quadrants, Braille Patterns, the sextants added in Unicode 13, and the octants
added in Unicode 16.

### Libraries

[React](https://react.dev), [Vite](https://vite.dev),
[TypeScript](https://www.typescriptlang.org), [Tailwind CSS](https://tailwindcss.com),
[Radix UI](https://www.radix-ui.com), [shadcn/ui](https://ui.shadcn.com),
[Lucide](https://lucide.dev), [Sonner](https://sonner.emilkowal.ski),
[opentype.js](https://opentype.js.org), [pngjs](https://github.com/pngjs/pngjs),
[Playwright](https://playwright.dev) and [Prettier](https://prettier.io).

### Corrections welcome

Several attributions above are best-effort. If something here credits the
wrong person, or misses one, open an issue and it gets fixed.
