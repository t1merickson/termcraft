# Image renderers

This document catalogues every renderer and character ramp used by Termcraft's Image to ANSI and Image to ASCII tools. It is for readers choosing an output format, checking its font requirements, or changing the renderer code.

## The choices at a glance

A character cell is one position in the terminal grid. “Pixels per cell” below means the number of sampled image regions encoded into that position, not the physical pixels used to draw the glyph.

| Tool and mode            | Code value   |        Pixels per cell | Characters                       | Colour per cell                                        | Required character block                                                                  |
| ------------------------ | ------------ | ---------------------: | -------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Half Blocks (fg+bg)      | `half`       |                    1×2 | ` `, `▀`, `▄`                    | Foreground and background; 256 or 24-bit               | Basic Latin and Block Elements                                                            |
| Half Blocks (fg only)    | `halffg`     |                    1×2 | ` `, `▀`, `▄`, `█`               | One foreground; 256 or 24-bit                          | Basic Latin and Block Elements                                                            |
| Quadrant (fg only)       | `quad`       |                    2×2 | 16 space/block masks             | One foreground; 256 or 24-bit                          | Basic Latin and Block Elements                                                            |
| Sextant (2×3)            | `sextant`    |                    2×3 | Sextants plus ` `, `▌`, `▐`, `█` | Up to one foreground and one background; 256 or 24-bit | Symbols for Legacy Computing and Block Elements                                           |
| Octant (2×4, Unicode 16) | `octant`     |                    2×4 | Octants plus older block glyphs  | Up to one foreground and one background; 256 or 24-bit | Symbols for Legacy Computing Supplement, Symbols for Legacy Computing, and Block Elements |
| Full Block (fg only)     | `block`      |                    1×1 | ` `, `█`                         | One foreground; 256 or 24-bit                          | Basic Latin and Block Elements                                                            |
| Spaces (bg only)         | `full`       | 1 pixel across 2 cells | Two spaces                       | One background; 256 or 24-bit                          | Basic Latin                                                                               |
| Binary (no color)        | `binary`     |                    1×2 | ` `, `▀`, `▄`, `█`               | No ANSI colour                                         | Basic Latin and Block Elements                                                            |
| Brightness               | `brightness` |                    1×1 | Selected ramp                    | None, 256, or 24-bit foreground                        | Depends on the ramp                                                                       |
| Shape-Aware              | `shape`      |          12×18 samples | Selected ramp                    | None, 256, or 24-bit foreground                        | Depends on the ramp                                                                       |
| Braille                  | `braille`    |                    2×4 | U+2800–U+28FF                    | None, 256, or 24-bit foreground                        | Braille Patterns                                                                          |

The Image to ANSI labels and values come from `app/src/tabs/ImageToAnsiTab.tsx`. Its colour selector offers `24bit` and `256`. The Image to ASCII labels and values come from `app/src/tabs/ImageToAsciiTab.tsx`. Its `colorMode` values are `none`, `24bit`, and `256`.

## Image to ANSI

`app/src/engines/image-to-ansi.js` first scales the source image to the sampling grid for the chosen mode. Pixels with alpha below 32 are treated as transparent. The optional greyscale and invert passes run before rendering. Modes other than `binary` can emit either ANSI 256-colour codes or 24-bit colour codes.

The “1×” option changes scaling, not encoding. It preserves one source pixel per sample where possible, then pads dimensions to a complete 1×2, 2×2, 2×3, or 2×4 cell.

### Half Blocks (fg+bg): `half`

This mode places the top pixel in the foreground of `▀` and the bottom pixel in its background. If only one half is opaque, it uses `▀` or `▄` with no background colour. It therefore preserves two colours in one cell.

Use it for photographs and colour artwork when detail and broad font support both matter. It doubles vertical sampling without asking the font for unusual glyphs. It is less suitable when the output must not set the terminal background.

### Half Blocks (fg only): `halffg`

This mode uses `▀`, `▄`, or `█` and never emits a background colour. When both source pixels are opaque, `█` takes the top pixel's colour, so the bottom colour is discarded.

Use it for silhouettes, sprites with transparency, or output that must respect the viewer's terminal background. It loses colour variation whenever both halves of a cell are filled.

### Quadrant (fg only): `quad`

This mode tests the alpha of a 2×2 sample and selects one of all 16 masks:

```text
  ▘ ▝ ▀ ▖ ▌ ▞ ▛ ▗ ▚ ▐ ▜ ▄ ▙ ▟ █
```

The foreground is the average colour of the opaque samples. There is no background colour. Use it for hard-edged logos, masks, icons, and transparent line art. A fully opaque 2×2 area becomes `█`, so the mode cannot preserve four colour samples from a photograph.

### Sextant (2×3): `sextant`

This mode groups the opaque colours in each 2×3 sample into two clusters, chooses a six-bit sextant mask, and assigns the cluster colours to foreground and background. A single-colour cell omits the background colour. `SEXTANT_CHARS` uses U+1FB00–U+1FB3B, with `▌` and `▐` substituted for masks 21 and 42, plus space and `█` for the empty and full masks.

Use it when a modern font is available and six samples per cell are worth the compatibility cost. It keeps more small structure than half blocks. Its two-colour clustering still reduces every cell to at most two colours, and it needs Unicode 13 coverage.

### Octant (2×4): `octant`

This mode applies the same two-cluster process to a 2×4 sample. `OCTANT_GLYPHS` builds the new characters from U+1CD00–U+1CDE5. It also reuses space, `🮂`, `🮅`, `▘`, `▝`, `▀`, `▖`, `▌`, `▞`, `▛`, `▗`, `▚`, `▐`, `▜`, `▂`, `▄`, `▙`, `▟`, `▆`, and `█`; six masks reuse an inverse glyph with foreground and background swapped.

Use it only when maximum cell density matters and the target font is known. It needs Unicode 16 coverage and renders as missing-glyph boxes in most terminals today. Like sextants, it carries at most two colours per cell rather than eight independent colours.

### Full Block (fg only): `block`

This mode maps each opaque pixel to foreground-coloured `█` and each transparent pixel to a space. Use it for predictable one-sample cells, especially where background colour is undesirable. It uses twice as many rows as half blocks for the same vertical sample count.

### Spaces (bg only): `full`

This mode writes two background-coloured spaces for every source pixel. The doubled width compensates for the cell shape used by the converter. Use it when solid rectangular colour is more important than glyph appearance. It paints the terminal background, doubles the output columns, and cannot represent transparency except by resetting to the viewer's background.

### Binary (no color): `binary`

This mode computes luminance for the top and bottom pixels, uses a threshold of 128, and writes ` `, `▀`, `▄`, or `█` with no escape codes. Transparent pixels count as dark.

Use it for stark two-tone output that must not contain ANSI colour codes. It discards every intermediate tone and still requires Block Elements glyphs, so plain ASCII brightness output is the safer choice when only basic characters are allowed.

## Image to ASCII

`app/src/engines/image-to-ascii.js` corrects for character cells by using a character aspect value of 2 when it calculates output dimensions. Transparent samples become spaces. For coloured output, the renderer uses the colour at the centre of each cell as its foreground.

### Brightness: `brightness`

Brightness mode calculates luminance and selects a character by position in the chosen light-to-heavy ramp. Invert reverses the luminance before the lookup. Each output cell uses one image sample after scaling.

Use it for photographs, gradients, and small output where tone matters more than the direction of an edge. It is fast and can be ASCII-only. It does not consider whether a glyph's strokes line up with the source shape.

### Shape-Aware: `shape`

Shape-Aware mode samples a 12×18 area into the six-component vector implemented by `app/src/engines/shape-vectors.js`, then finds the nearest precomputed vector among the selected ramp's glyphs. The Contrast control supplies `contrastExponent`; Directional Contrast also compares the cell with external sample circles.

Use it for logos, diagrams, outlines, and screenshots whose edges need to survive. It costs more work per cell than brightness mode. Its result also depends on the shapes available in the selected ramp and on how the viewer's font draws them.

### Braille: `braille`

Braille mode thresholds a 2×4 sample and sets the corresponding eight Braille dot bits. It can first apply any Dither Lab algorithm against the `mono-1bit` palette. The threshold defaults to 128; the renderer shifts dithered input so a user-selected threshold still applies. A coloured cell uses the average colour of its lit samples, or of all opaque samples if none are lit.

Use it for dense monochrome detail, contours, and compact images. It needs the Braille Patterns block, which most modern monospace fonts have. Dot size and spacing come from the font, and each cell still has only one foreground colour.

## Character ramps

Both Brightness and Shape-Aware modes use `RAMPS` from `app/src/engines/ramps.ts`. Characters are listed exactly as stored, from visually lighter to heavier within equal-coverage groups. Leading spaces are shown as `␠` so they remain visible in the table; the actual first character is an ordinary space.

| Group         | Id                | Label                    | Characters                                                                             | Font requirement                                     |
| ------------- | ----------------- | ------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| ASCII         | `standard`        | Standard                 | `␠.:-=+*#%@`                                                                           | Basic ASCII                                          |
| ASCII         | `detailed`        | Detailed                 | <code>␠.'`:;-~=+*!?#%@</code>                                                          | Basic ASCII                                          |
| ASCII         | `simple`          | Simple                   | `␠.*#`                                                                                 | Basic ASCII                                          |
| ASCII         | `extended`        | Extended (70 characters) | <code>␠.`^",:;Il!i><~+_-?][}{1)(&#124;/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$</code> | Basic ASCII                                          |
| ASCII         | `minimal`         | Minimal                  | `␠.oO@`                                                                                | Basic ASCII                                          |
| ASCII         | `numeric`         | Numeric                  | `␠1234567890`                                                                          | Basic ASCII                                          |
| Blocks        | `blocks`          | Shades                   | `␠░▒▓█`                                                                                | Unicode shade and block glyphs                       |
| Blocks        | `eighths-up`      | Eighths up               | `␠▁▂▃▄▅▆▇█`                                                                            | Block Elements                                       |
| Blocks        | `eighths-left`    | Eighths left             | `␠▏▎▍▌▋▊▉█`                                                                            | Block Elements                                       |
| Blocks        | `quadrants`       | Quadrants                | `␠▘▝▖▗▀▌▞▚▐▄▛▜▙▟█`                                                                     | Block Elements                                       |
| Geometric     | `dots`            | Dots                     | `␠·∙•⬤`                                                                                | Unicode punctuation and geometric glyphs             |
| Geometric     | `circles`         | Circles                  | `␠◌○◍◉●`                                                                               | Geometric Shapes                                     |
| Geometric     | `squares`         | Squares                  | `␠▫▪◻◼■`                                                                               | Geometric Shapes                                     |
| Geometric     | `diamonds`        | Diamonds                 | `␠◇◈◆`                                                                                 | Geometric Shapes                                     |
| Geometric     | `triangles`       | Triangles                | `␠▵▴△▲`                                                                                | Geometric Shapes                                     |
| Geometric     | `stars`           | Stars                    | `␠˙⋆✦★`                                                                                | Several Unicode symbol blocks                        |
| Lines         | `vertical`        | Vertical                 | `␠⎸│┃█`                                                                                | Mathematical, Box Drawing, and Block Elements glyphs |
| Lines         | `horizontal`      | Horizontal               | `␠⎯─━█`                                                                                | Mathematical, Box Drawing, and Block Elements glyphs |
| Lines         | `diagonal`        | Diagonal                 | `␠╱╲╳`                                                                                 | Box Drawing                                          |
| Lines         | `cross`           | Cross                    | `␠·+✚✖`                                                                                | Unicode punctuation and symbol glyphs                |
| Lines         | `hatch`           | Hatch                    | `␠░╱▒╲▓█`                                                                              | Block Elements and Box Drawing                       |
| Miscellaneous | `braille-density` | Braille density          | `␠⠁⠃⠇⡇⡏⡟⡿⣿`                                                                            | Braille Patterns                                     |
| Miscellaneous | `arrows`          | Arrows                   | `␠·›→➜➤`                                                                               | Unicode punctuation and arrow glyphs                 |
| Miscellaneous | `blocks-ascii`    | Blocks (ASCII-safe)      | `␠.-+=#@`                                                                              | Basic ASCII                                          |

The code marks the first six ramps and `blocks-ascii` as ASCII-safe. Every other ramp has `unicode: true`. Unicode ramps can look different between fonts, especially in Shape-Aware mode, because the matching vectors and the terminal's glyph design may not agree.

## Which should I use?

| Situation                                                     | Start with                                                                         | Why                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A colour photograph                                           | Half Blocks (fg+bg), 24-bit                                                        | It keeps two vertical colour samples per common block cell.              |
| A flat logo or transparent icon                               | Quadrant (fg only), or Shape-Aware with a suitable ramp                            | Quadrants preserve a 2×2 alpha mask; Shape-Aware follows glyph edges.    |
| A screenshot of text or line work                             | Shape-Aware                                                                        | It matches local stroke shape instead of tone alone.                     |
| A README that must work everywhere                            | Brightness with `standard`, `simple`, or another ASCII ramp, and `colorMode: none` | The output uses ordinary ASCII and no ANSI escape codes.                 |
| A modern terminal with a known Unicode 13 font                | Sextant, 24-bit                                                                    | It packs six samples into each cell while retaining two colour clusters. |
| The densest possible output for a controlled Unicode 16 setup | Octant, 24-bit                                                                     | It packs eight samples per cell, with the stated compatibility cost.     |
| Compact monochrome detail                                     | Braille                                                                            | It encodes an independent on/off decision for each point in a 2×4 grid.  |

When the destination is unknown, preview the copied text in the actual target font. The exact preview in Image to ANSI paints rectangles, while the text preview shows what the font itself draws; `app/src/tabs/ImageToAnsiTab.tsx` provides both because those results can differ.
