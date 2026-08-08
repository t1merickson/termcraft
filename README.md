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

| Tool               | What it does                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Image to ASCII** | Photos into text, by brightness or by glyph shape. Braille mode packs 8 dots per cell for 4× the detail. A dozen glyph ramps. |
| **Image to ANSI**  | Full-colour terminal images from block characters — half, quadrant, sextant and octant blocks, up to 8 pixels per cell.       |
| **Dither Lab**     | 11 dithering algorithms and 15 palettes, from 1-bit and ANSI 256 to Game Boy, C64, PICO-8 and CGA.                            |
| **Video to ASCII** | Webcam and video files converted frame by frame, in real time.                                                                |

### Compose

| Tool               | What it does                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **ASCII Editor**   | A paint program where every pixel is a letter. Type, brush, line, fill, eraser, undo.                  |
| **Pixel Font**     | Big block-letter banners from 13 real pixel fonts, with nine dot styles and drop shadows.              |
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
    fonts/              13 pixel fonts, each with its own licence
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
docs/                   Postmortems worth reading before changing renderers
```

Two rules keep it navigable:

- **`engines/` never imports React.** Every renderer is a pure function from
  pixels or numbers to strings, which is why they can be tested headlessly and
  reused between the tools, the landing page and the sample generator.
- **`registry.ts` is the only place a tool is described.** The sidebar, the
  router, the landing page and the page headings all read from it.

### Routing

Hash routing (`#/`, `#/t/<tool>`), and the Vite base is relative. That means
the built site works from a GitHub Pages project path, a custom domain, or a
`file://` URL, with no rewrite rules anywhere.

### Sample images

Everything under `app/public/samples/` is generated by
`scripts/generate-samples.js` — a lit sphere, a Mandelbrot detail, fractal
landscape ridges, a test chart, a checkered torus, a 1-bit bitmap plate and a
nebula. They are procedural and seeded, so regenerating produces identical
bytes. No stock photos, no licensing to trace.

## ANSI 256, briefly

Colours 0–255 come from the standard:

- **0–15** — the 16 base colours, whose exact values are up to the terminal
- **16–231** — a 6×6×6 cube: `16 + 36r + 6g + b`, each channel drawn from
  `[0, 95, 135, 175, 215, 255]`
- **232–255** — 24 greys: `8 + 10i`

## Contributing

Issues and pull requests are welcome. Before opening one:

```bash
npm run typecheck && npm test && npm run format:check
```

If you touch a renderer, `npm test` compares against tracked baseline images.
A diff there is a real change in output — look at it before regenerating with
`npm run test:update`.

## Licence

MIT — see [LICENSE](LICENSE).

The bundled pixel fonts are third-party works under their own licences, kept
alongside each font in `app/public/fonts/`.

## Thanks

The scope of this rebuild owes a lot to [ASCII Magic](https://www.ascii-magic.com),
which is a lovely piece of work and worth your time.
