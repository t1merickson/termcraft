# How terminal art works

A primer on the machinery underneath every tool in Termcraft: what a terminal
can actually draw, how colour gets into it, and why a picture made of
characters has the proportions it does. Written for someone who has never
looked at an escape code. If you already know what `\033[38;5;196m` does, skip
to [renderers.md](renderers.md).

## A terminal is a grid of cells

A terminal window is not a canvas you can draw on. It is a grid, and every
position in that grid holds exactly one character. That is the whole drawing
surface. If the grid is 80 wide and 24 tall, you have 1,920 places to put
something, and each one gets a single character.

So "drawing a picture in a terminal" always means the same thing: choose a
character for every cell, so that the characters together look like the
picture.

Each cell can also carry a **foreground** colour (the ink the character is
drawn in) and a **background** colour (the paper behind it). That is two
colours per cell, and it turns out to matter a great deal — see
[Two colours per cell](#two-colours-per-cell-is-more-than-it-sounds) below.

## Cells are twice as tall as they are wide

This is the single fact that trips people up most.

Monospace type is designed so every character takes the same width, and that
width is roughly half the line height. A cell is therefore about 1 unit wide
and 2 units tall. Not exactly — it varies by font — but close enough that
every terminal-art tool assumes it.

The consequence: if you map one image pixel to one character cell, your
picture comes out **twice as tall as it should be**. A circle becomes an
oval. Everyone hits this. Termcraft hit it too, and there is a whole
postmortem about the ways it can go wrong:
[postmortems/aspect-ratio.md](postmortems/aspect-ratio.md).

There are two ways out:

1. **Sample fewer rows.** Read the image at half the vertical resolution, so
   one cell covers a 1×2 block of pixels. You lose half your vertical detail.
2. **Put more than one pixel in a cell.** Use a character that is itself
   divided into regions, so one cell can show two, four, six or eight pixels.
   This is what block characters are for, and it is strictly better.

## Escape codes

Colour is not stored anywhere in the text. It is switched on and off by
**escape sequences** — short runs of characters that the terminal reads as
instructions instead of printing.

They all start with the escape character, written `\033` or `\x1b` or `\e`
depending on the language, followed by `[`, then some numbers, then a letter
saying what kind of instruction it is. For colour the letter is `m`.

```
\033[38;5;196m   set the foreground to colour 196
\033[48;5;17m    set the background to colour 17
\033[0m          reset everything back to normal
```

Anything printed after that sequence uses those colours, until something
changes them again. That is why terminal art files look like noise in a text
editor and correct in a terminal: the escape codes are real characters sitting
in the middle of the art.

It also means art files are bigger than they look. A naive renderer emits a
colour code before every single character. Termcraft only emits one when the
colour actually changes from the previous cell, which typically cuts the file
size several times over.

**Always reset at the end.** A file that sets a background and never resets it
leaves the user's shell tinted until they run `reset`.

## Three colour depths

Terminals support different amounts of colour, and which you target is a
trade-off between fidelity and how many places the output will work.

| Depth       | Colours      | Escape form         | Notes                                                                                                                       |
| ----------- | ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 16 colours  | 16           | `\033[31m` …        | The oldest and most portable. Exact values are chosen by the terminal's theme, so the same code looks different everywhere. |
| 256 colours | 256          | `\033[38;5;n m`     | The common middle ground. A fixed, predictable palette.                                                                     |
| True colour | 16.7 million | `\033[38;2;r;g;b m` | Any RGB value. Widely supported now, but not universally.                                                                   |

The 256-colour palette is worth understanding because it is not arbitrary:

- **0–15** are the 16 base colours. Their exact RGB values are up to the
  terminal, so never rely on them matching a specific hex.
- **16–231** are a 6×6×6 colour cube. Index `16 + 36r + 6g + b`, where each of
  `r`, `g` and `b` is 0–5 and maps onto the values
  `[0, 95, 135, 175, 215, 255]`. Note the gap: the steps are not even. The
  jump from 0 to 95 is much larger than the rest, which is why dark colours
  quantise badly.
- **232–255** are 24 greys, `8 + 10i`. Neither pure black nor pure white is in
  this ramp; those live in the base 16.

Termcraft's implementation is in `app/src/engines/ansi256.js`, and the
[Color Wheel](https://t1merickson.github.io/termcraft/#/t/color-wheel) tool
lays the whole palette out by hue so you can see the shape of it.

## Two colours per cell is more than it sounds

Here is the trick that makes colour terminal images possible.

Take the character `▀` (U+2580 UPPER HALF BLOCK). It fills the top half of its
cell with ink and leaves the bottom half as paper. Now set the foreground to
one colour and the background to another. You have not drawn one coloured
character — you have drawn **two independently coloured rectangles, stacked**.

One cell, two pixels. And because cells are twice as tall as they are wide,
those two pixels are square. The picture comes out in the right proportions
for free.

The same idea scales up. Unicode has characters that divide a cell into
quarters, sixths and eighths:

| Characters            | Grid | Pixels per cell | Unicode                       |
| --------------------- | ---- | --------------- | ----------------------------- |
| `▀ ▄` half blocks     | 1×2  | 2               | Block Elements, long-standing |
| `▘▝▖▗▚▞▙▟…` quadrants | 2×2  | 4               | Block Elements, long-standing |
| sextants              | 2×3  | 6               | Unicode 13                    |
| octants               | 2×4  | 8               | Unicode 16                    |
| braille `⠀`–`⣿`       | 2×4  | 8               | Braille Patterns              |

With only two colours available per cell, the renderer has to decide which
sub-pixels are "foreground" and which are "background". Termcraft does this by
finding the two most different colours in the cell and sorting each sub-pixel
toward the nearer of them — a two-means clustering, in
`renderMosaic` in `app/src/engines/image-to-ansi.js`.

Braille is the odd one out: it gives you eight sub-pixels but they are dots
with gaps between them, and the whole cell takes a single colour. It is
excellent for line art, edges and plots, and poor for solid colour.

## Characters as brightness

The older approach, and still the best for some images, ignores block
characters entirely and picks an ordinary character based on how bright the
cell is. A space is the lightest, `@` is among the darkest, and you order a
set of characters between them:

```
 .:-=+*#%@
```

That is a **ramp**. Termcraft ships around two dozen, in
`app/src/engines/ramps.ts` — not just ASCII but dots, lines, diagonals,
crosses, diamonds and shades, each of which gives the output a different
texture.

There is a subtler method too. Brightness throws away everything about _where_
the ink sits in the cell. Two characters can be equally dark and look nothing
alike. **Shape matching** compares the actual drawn shape of each candidate
character against the pixels underneath it, so a diagonal edge picks a
character with a diagonal in it. It is slower and much better on edges. The
approach is Alex Harri's; the write-up of implementing it is in
[postmortems/shape-aware-ascii.md](postmortems/shape-aware-ascii.md).

## Dithering

A terminal has very few colours. An image has many. Rounding each pixel to the
nearest available colour produces flat bands where a smooth gradient should
be.

Dithering fixes this by spreading the rounding error around. If a pixel wanted
to be 60% grey and the nearest available colour is 50%, the missing 10% gets
pushed into the neighbouring pixels, which then round differently. Up close it
is visible noise. From a normal distance the eye averages it back into the
colour that was wanted.

This is why Game Boy screens, riso prints and good 1-bit images look like they
have more colours than they do. Details and the full algorithm list are in
[dithering.md](dithering.md).

## The gap between the character and the cell

One last thing, because it causes an artefact that looks like a bug in your
code when it is really a bug in the font.

Everything above assumes `▀` fills exactly the top half of its cell. Fonts
frequently do not do this. Measured at 100px, Geist Mono draws `▀` 65 pixels
tall instead of 50 — so the "top half" covers 65% of the cell and the
background colour meant for the bottom half only gets 35%. Colours land in the
wrong place, and thin lines of the wrong colour appear between rows.

You cannot fix that from your side; it is the font's outline. What you can do
is stop asking a font to draw pixels for you. Full explanation and
measurements in [glyph-geometry.md](glyph-geometry.md).

## Where to go next

- [renderers.md](renderers.md) — every mode Termcraft offers and when to use it
- [dithering.md](dithering.md) — the algorithms and palettes
- [glyph-geometry.md](glyph-geometry.md) — why the previews paint rectangles
- [architecture.md](architecture.md) — how the code is put together
