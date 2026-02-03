# ANSI 256 Color Tools

A browser-based toolkit for working with ANSI 256 terminal colors. No build tools required.

## Features

### Color Wheel
Visual representation of all 256 ANSI colors arranged by hue angle, with grayscale colors in a separate strip. Supports three viewing modes:
- **Grayscale** - Only grayscale colors
- **ANSI 16** - Standard 16 terminal colors
- **ANSI 256** - Full 256 color palette

Click any color to copy its escape code.

### Lookup & Convert
Find the nearest ANSI 256 color from:
- HEX (`#FF5733`)
- RGB (`255, 87, 51`)
- HSL (`11°, 100%, 60%`)

Shows the input color, matched ANSI color, and Euclidean distance.

### Image to ANSI
Convert images to ANSI terminal art.

**Options:**
- Max width/height in characters
- ANSI 256 or True Color (24-bit) mode
- Unicode half-blocks for 2x vertical resolution

**Output:**
- Live preview
- Copy raw ANSI escape codes
- Copy shell `printf` command

## Usage

Serve the directory with any static file server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` in your browser.

## Files

```
├── index.html        # Main HTML structure
├── styles.css        # Minimal black/white theme
├── app.js            # Application logic
├── image-to-ansi.js  # Image conversion algorithm
└── colors.json       # Color data reference
```

## Color Computation

All colors are computed from the ANSI 256 specification:

- **0-15**: Standard 16 terminal colors
- **16-231**: 6×6×6 color cube (`16 + 36r + 6g + b`, values: 0, 95, 135, 175, 215, 255)
- **232-255**: 24 grayscale steps (`8 + 10i` for i in 0..23)

## Image Conversion Algorithm

Based on [dom111/image-to-ansi](https://github.com/dom111/image-to-ansi):

1. Scale image to fit within max dimensions
2. For each pixel, find nearest ANSI color using Manhattan distance
3. In Unicode mode, combine two vertical pixels using half-block characters (▀/▄)
4. Optimize output by only emitting escape codes when color changes

## Pixel Fonts

Pixel fonts live under `fonts/` and are loaded from `fonts/index.json`.
See `fonts/README.md` for the format and import workflow.

## License

MIT
