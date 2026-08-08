# Dithering

This document explains the Dither Lab algorithms, palettes, and controls implemented in Termcraft. It is for readers choosing settings or changing `app/src/engines/dither.ts` and `app/src/tabs/DitherTab.tsx`.

## What dithering does

A terminal has very few colours compared with an image. Choosing only the nearest available colour removes smooth gradients and subtle shading. Dithering arranges the available colours across nearby pixels so the eye sees an intermediate result. It trades spatial resolution for apparent colour depth.

Dither Lab scales an image, adjusts brightness and contrast, reduces every pixel to a selected palette, then renders the result as full block characters, Braille, or a character ramp. The engine has two algorithm families.

- **Error diffusion** rounds a pixel to the nearest palette colour, measures the error, and adds weighted parts of that error to pixels that have not been processed yet.
- **Ordered or threshold dithering** adds a position-dependent threshold before choosing the nearest colour. The threshold comes from a repeating matrix or tile. `none` belongs to this branch but adds no threshold, so it is plain nearest-colour conversion.

The exact selector ids, labels, and family assignments are in `DITHER_ALGORITHMS` in `app/src/engines/dither.ts`.

## Error-diffusion algorithms

In each diagram, `X` is the pixel just quantised. Numbers are weights applied to its error. Blank positions receive none. Every weight is divided by the stated divisor and multiplied by Strength. With Serpentine diffusion enabled, odd rows are scanned right-to-left and the diagram is mirrored.

### `floyd-steinberg` — Floyd–Steinberg

```text
      X  7
   3  5  1    ÷ 16
```

The compact one-row footprint spreads all of the error across four neighbours. Pick it as a general-purpose starting point for photographs and gradients when detail should stay fairly local.

### `atkinson` — Atkinson

```text
      X  1  1
   1  1  1
      1       ÷ 8
```

The six weights add to 6 while the divisor is 8, so Atkinson deliberately diffuses only three quarters of the error. The unpropagated part increases contrast and gives a crisper, more strongly separated result, at the cost of some tonal detail.

### `stucki` — Stucki

```text
         X  8  4
   2  4  8  4  2
   1  2  4  2  1    ÷ 42
```

Stucki spreads the full error over two later rows and up to two columns each side. Pick it for photographs and broad gradients when a smoother, more distributed texture is worth a larger neighbourhood.

### `burkes` — Burkes

```text
         X  8  4
   2  4  8  4  2    ÷ 32
```

Burkes uses Stucki's width but only one later row. Pick it for a broad diffusion pattern with less vertical reach, which keeps changes more local than Stucki.

### `sierra-lite` — Sierra Lite

```text
      X  2
   1  1       ÷ 4
```

This is the smallest kernel in the engine. Pick it for small outputs and hard-edged graphics where a short, simple diffusion pattern is preferable to the smoother wide kernels.

### `jarvis` — Jarvis–Judice–Ninke

```text
         X  7  5
   3  5  7  5  3
   1  3  5  3  1    ÷ 48
```

This kernel spreads the full error across twelve neighbours over two later rows. Pick it for photographs and gentle gradients when a wide, smooth diffusion texture matters more than preserving the sharpest local transitions.

## Ordered and threshold algorithms

| Id           | Label                 | Threshold source                          | What it looks like and when to pick it                                                                                                                                                                              |
| ------------ | --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`       | None (nearest colour) | No threshold                              | Produces flat regions separated at the nearest-palette boundary. Use it for flat graphics already close to the target palette, or when any dither texture is unwanted.                                              |
| `bayer-2`    | Bayer 2×2             | Repeating 2×2 Bayer matrix                | The shortest and most obvious repeating Bayer pattern. Use it for very small output or a deliberately coarse ordered texture.                                                                                       |
| `bayer-4`    | Bayer 4×4             | Repeating 4×4 Bayer matrix                | Adds more threshold steps before the pattern repeats. It is a middle ground for small graphics that need stable, non-diffused edges.                                                                                |
| `bayer-8`    | Bayer 8×8             | Repeating 8×8 Bayer matrix                | Produces finer threshold placement over a larger tile. Use it when a 4×4 pattern is too coarse but a regular ordered texture is acceptable.                                                                         |
| `bayer-16`   | Bayer 16×16           | Repeating 16×16 Bayer matrix              | Uses the largest Bayer tile in the engine. Pick it for larger output that can show its finer threshold ordering; the pattern still repeats.                                                                         |
| `halftone`   | Halftone (45°)        | Fixed 8×8 matrix                          | Produces the deliberate diagonal screen named by the UI. Use it when a visible print-like pattern is part of the intended result.                                                                                   |
| `blue-noise` | Blue noise            | Deterministic 64×64 high-pass ranked tile | Uses an irregular tile designed in the code to suppress low-frequency neighbourhood clumps. Pick it when regular Bayer repetition is distracting but error diffusion's directional propagation is also undesirable. |

The Bayer matrices are generated from the 2×2 seed `[0, 2; 3, 1]`. The halftone values and blue-noise construction are both defined in `app/src/engines/dither.ts`; the blue-noise tile is a deterministic approximation, not a stored image.

## Palettes

A palette is the fixed list of RGB colours to which the engine may round a pixel. Dither Lab shows the number of entries beside each label. All 15 definitions are in `PALETTES` in `app/src/engines/dither.ts`.

### Terminal and neutral palettes

| Id               | Label                    | Colours |
| ---------------- | ------------------------ | ------: |
| `mono-1bit`      | Monochrome (1-bit)       |       2 |
| `ansi-16`        | ANSI 16                  |      16 |
| `ansi-256`       | ANSI 256                 |     256 |
| `gray-4`         | Grayscale (4)            |       4 |
| `gray-8`         | Grayscale (8)            |       8 |
| `gray-24`        | ANSI grayscale ramp (24) |      24 |
| `amber`          | Amber terminal           |       2 |
| `green-phosphor` | Green phosphor           |       2 |

`ansi-16` imports `STANDARD_16` and `ansi-256` imports the full `PALETTE` from `app/src/engines/ansi256.js`. `gray-4` and `gray-8` divide the range from 0 to 255 evenly. `gray-24` uses the 24 values `8 + 10i`.

### Retro, hardware, and print palettes

| Id               | Label           | Colours |
| ---------------- | --------------- | ------: |
| `gameboy`        | Game Boy        |       4 |
| `gameboy-pocket` | Game Boy Pocket |       4 |
| `c64`            | Commodore 64    |      16 |
| `pico8`          | PICO-8          |      16 |
| `cga`            | CGA             |      16 |
| `zx-spectrum`    | ZX Spectrum     |      15 |
| `riso`           | Risograph       |       6 |

These are literal RGB arrays in the engine. Dither Lab does not apply hardware display rules or ink overprinting; it only restricts output to the listed colours.

## Controls

The tab stores controls as percentages and passes them to `dither()` divided by 100.

| Control              | What the code does                                                                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strength             | Clamps the value to 0–1. For error diffusion, it multiplies every propagated error weight. For ordered algorithms, it multiplies the threshold offset. At 0, diffusion still chooses the nearest colour but propagates no error; ordered modes add no threshold. |
| Brightness           | Clamps the value to −1–1, multiplies it by 255, and adds that amount to every RGB channel before palette matching. Values are then clamped to 0–255.                                                                                                             |
| Contrast             | Clamps the value to −1–1 and scales every channel around 128. Non-negative values use `1 + contrast × 3`, giving a factor from 1 to 4. Negative values use `1 + contrast × 0.75`, giving a factor from 1 down to 0.25.                                           |
| Serpentine diffusion | Applies only to error-diffusion algorithms. When enabled, even rows run left-to-right and odd rows right-to-left; the horizontal kernel offsets are mirrored on reverse rows. The switch is disabled for ordered algorithms.                                     |

Brightness and contrast are applied before any algorithm chooses a palette colour. Alpha bytes are copied from the source and are not changed by `dither()`.

## Choosing settings

For a photograph, start with `floyd-steinberg`. Try `stucki` or `jarvis` when you want the error spread across a wider area, and `atkinson` when stronger contrast is more useful than subtle tones. A palette with more colours preserves more of the source; a small palette makes the dither pattern carry more of the image.

For flat graphics, start with `none` when the source already fits the palette. Use `bayer-4` or `bayer-8` when you need intermediate-looking areas without error spreading across an edge. Use `halftone` only when its diagonal screen is wanted as a visible style.

For small output sizes, begin with `sierra-lite`, `bayer-2`, or `bayer-4`. Their neighbourhoods or tiles are small enough to appear within a compact image. Wide two-row kernels and large ordered tiles have less room to show their intended distribution.
