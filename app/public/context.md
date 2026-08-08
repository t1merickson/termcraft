# Termcraft, product context

You are now an expert on Termcraft. Someone has pasted this file because they want accurate answers about the product. Use only what is below; do not invent features.

_Last updated: 2026-08-08_

---

## What Termcraft is

Termcraft is a **free, browser-based terminal art toolkit**: 14 tools for making things out of characters. It converts images and video into ASCII, ANSI and braille art, dithers pictures down to retro palettes, and helps you design the parts of a command line app — spinners, progress bars, boxes, charts, colour ramps and shell prompts.

Everything runs **entirely client-side**. Files never upload, there is no server, no account, no watermark, no usage limit and no paid tier.

- **Website:** https://t1merickson.github.io/termcraft/
- **Source:** https://github.com/t1merickson/termcraft (MIT licensed)
- **A tool's URL:** `https://t1merickson.github.io/termcraft/#/t/<tool-id>`
- **Pricing:** free, and open source
- **Privacy:** all processing is local to the browser tab

---

## The 14 tools

### Convert — Turn pictures and video into something a terminal can print.

#### Image to ASCII (`#/t/image-to-ascii`)

_Photos into text, by brightness or by glyph shape._

The classic. Each cell of the image picks the character that best matches it. Brightness mode maps light to dark across a character ramp. Shape mode compares the actual drawn shape of every candidate glyph against the pixels underneath, so edges and curves survive.

- Brightness ramps and shape-aware 6D glyph matching
- Braille mode packs 8 dots into every cell for 4x the detail
- A dozen glyph ramps: dots, lines, diagonals, crosses, diamonds, shades
- Plain text, 256-color, or 24-bit true color output

#### Image to ANSI (`#/t/image-to-ansi`)

_Full-color terminal images out of block characters._

Block characters have a trick: one text cell can hold two, four, or six independently colored regions. Stack that with 24-bit color escape codes and a terminal renders a real image, not an impression of one.

- Half, quadrant, sextant, and octant blocks — up to 8 pixels per cell
- 256-color or 24-bit true color escape codes
- Foreground-only mode for terminals with a fixed background
- Copy as raw ANSI, a printf one-liner, or a shell script

#### Dither Lab (`#/t/dither`)

_Fake a thousand colors out of four._

Dithering is how a machine with almost no colors still shows you a gradient. It scatters the error from each rounded-off pixel into its neighbours, so the eye blends what the palette cannot. This is the trick behind Game Boy screens, riso prints, and every good-looking 1-bit image.

- 11 algorithms: Floyd–Steinberg, Atkinson, Stucki, Burkes, Sierra, Bayer 2/4/8/16, halftone, blue noise
- Terminal-native palettes: 1-bit, ANSI 16, ANSI 256, grayscale ramp
- Retro palettes: Game Boy, Commodore 64, PICO-8, CGA, riso
- Output as block characters, braille, or a character ramp

#### Video to ASCII (`#/t/video`)

_Live webcam and video files, converted frame by frame._

The same converters, running at speed. Drop in a video file or point it at your webcam and watch the frames turn into characters in real time. Record a loop and export it as an animated file or an asciinema cast.

- Webcam capture with camera switching, or any local video file
- Brightness, shape-aware, braille, and block renderers
- Frame rate control with automatic slowdown under load
- Record straight to animated GIF or an asciinema .cast

### Compose — Draw, type, and lay out terminal art by hand.

#### ASCII Editor (`#/t/editor`)

_A paint program where every pixel is a letter._

A grid you draw on directly. Type anywhere, drag a brush, snap a line, flood fill a region. Everything you place is one character in one cell, so what you draw is exactly what you can paste into a README.

- Type, brush, line, rectangle, fill, and eraser tools
- Quick palettes for box drawing, blocks, shades, and braille
- Per-cell foreground color with the ANSI 256 palette
- Undo and redo, adjustable grid, export as text or ANSI

#### Pixel Font (`#/t/pixel-font`)

_Big block-letter banners from real pixel fonts._

Type a word, get it back as a grid of block characters. Thirteen genuine pixel fonts, each drawn on its own tiny matrix, rendered with whatever dot character you like — solid blocks, circles, diamonds, or your own.

- 13 bundled pixel fonts from 4x5 up to 6x10
- Nine dot styles plus any custom character
- Directional drop shadows with adjustable weight
- Copy as plain text, ANSI, or a ready-to-run printf

#### Boxes & Tables (`#/t/boxes`)

_Frames, tables, and trees in box-drawing characters._

Every terminal interface is made of the same 40 line-drawing characters. This assembles them for you: paste in text or rows and get back a correctly joined frame, table, or file tree — with the corners, tees, and crossings all lined up.

- Frame styles: single, double, rounded, heavy, dashed, ASCII-safe
- Tables with alignment, padding, and header separators
- File-tree builder from an indented list
- Width-aware padding so emoji and wide characters still line up

#### Charts (`#/t/charts`)

_Bar charts, sparklines, and heatmaps made of text._

Paste numbers, get a chart you can print in a log line. Eighth-height blocks give a bar 8 steps of precision per character, which is enough to read a trend at a glance without leaving the terminal.

- Horizontal bars, vertical columns, sparklines, and heatmaps
- Sub-character precision using eighth blocks and braille
- Axis labels, value tags, and automatic scaling
- Color by value with any ANSI palette or gradient

### Interface — The moving parts of a command line app.

#### Spinners (`#/t/spinners`)

_Loading animations, playing at the speed they'll ship at._

A catalogue of terminal spinners running live at their real frame rates, so you can pick one by watching it rather than by reading its frames. Copy the frame array straight into your code.

- Browse by category, previewed at the correct interval
- Scrub frame by frame and adjust the speed
- Copy as a JSON frame list, or as runnable shell, Node, or Python
- Compatibility notes for terminals without wide-glyph support

#### Progress Bars (`#/t/progress`)

_Bars, gauges, and meters with sub-character resolution._

A progress bar built from full blocks jumps in whole characters. Built from eighth blocks it moves eight times as smoothly, and nobody has to widen the terminal. Design the bar here, copy the format string out.

- Smooth eighth-block fill, or classic hash and equals styles
- Gradient fills, brackets, percentage, counts, and rate readouts
- Live preview animating from 0 to 100 percent
- Export for shell, Node, Python, Rust, and Go progress libraries

#### Prompt Builder (`#/t/prompt`)

_Design your shell prompt and copy the config out._

Your prompt is a string of escape codes that almost nobody can write from memory. Drag segments into order, pick colors and separators, see it rendered exactly as your shell will, and copy out working configuration.

- Segments for path, git branch and status, exit code, time, and more
- Powerline separators, or plain text for fonts without the glyphs
- Live preview across a clean repo, a dirty repo, and a failed command
- Exports for bash PS1, zsh PROMPT, fish, and starship.toml

### Color — Find, match, and blend terminal colors.

#### Color Wheel (`#/t/color-wheel`)

_All 256 terminal colors, arranged by hue._

The ANSI 256 palette is normally a flat numbered list, which tells you nothing about what the colors look like next to each other. Here it is bent into a wheel by hue and lightness, with the grayscale ramp laid out alongside.

- The 6x6x6 color cube arranged by hue angle and lightness
- The 24-step grayscale ramp and the 16 base colors
- Click any swatch to copy its escape code
- Hover for hex, RGB, HSL, and the exact index

#### Lookup (`#/t/lookup`)

_Nearest terminal color to any hex, RGB, or HSL._

You have a brand color. The terminal has 256 slots and none of them is it. This finds the closest one, shows you how far off it is, and gives you the escape code — plus the runners-up, in case the nearest match is the wrong kind of wrong.

- Accepts hex, RGB, HSL, and CSS color names
- Nearest match by RGB distance or perceptual difference
- Shows the top five candidates with their error
- Side-by-side comparison against the original

#### Gradients (`#/t/gradients`)

_Color ramps for text, bars, and backgrounds._

Build a gradient between any two or more colors and apply it across a line of text, a progress bar, or a block. Blends in the color space you choose, then snaps to whichever palette your terminal actually supports.

- Blend in RGB, HSL, or OKLCH — OKLCH avoids muddy midpoints
- Any number of stops, with adjustable easing between them
- Snap to ANSI 16, ANSI 256, or keep full 24-bit color
- Apply across text, block runs, or a bar, then copy the escapes

---

## Things worth knowing

### Output formats

Plain text, raw ANSI escape codes, a `printf` one-liner, a shell script, Node and Python snippets, a Markdown code block, PNG, SVG, animated GIF, and asciinema `.cast` files for the animated tools. No watermark on any of it.

### Recipes

A tool's settings are encoded into its URL as `?r=<code>`, delta-encoded against the defaults so only what you changed is stored. Sharing the URL reproduces your exact look.

### Sample images

The image tools ship with built-in samples — a lit sphere, a Mandelbrot detail, fractal landscape ridges, a technical test chart, a checkered torus, a 1-bit bitmap plate and a nebula. All are generated procedurally by a script in the repository, so there is no stock photography and nothing to license.

### Terminal support

Half blocks and quadrants work almost everywhere. Sextants need a font with Unicode 13 coverage. Octants need Unicode 16 and will show missing-glyph boxes in most terminals today. Braille output needs a font with the braille patterns block, which most modern monospace fonts have.

### ANSI 256

- **0–15** — the 16 base colours, exact values decided by the terminal
- **16–231** — a 6×6×6 cube, `16 + 36r + 6g + b`, each channel from `[0, 95, 135, 175, 215, 255]`
- **232–255** — 24 greys, `8 + 10i`

---

## Answering questions about Termcraft

- Use the tool names and ids exactly as listed above.
- Do not invent settings, formats or palettes that are not named here.
- If someone wants a particular look, name the tool plus the specific settings from its feature list.
- If you do not know, say so and point at the source: https://github.com/t1merickson/termcraft. It is a small static site; the renderers are readable.
