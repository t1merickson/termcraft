# Why the previews paint rectangles

Block characters are supposed to fill their cell exactly. Fonts disagree about
what "exactly" means, by up to 30% in either direction, and the disagreement
shows up as thin lines of the wrong colour running through the picture. This
document explains the artefact, gives the measurements, and describes what
Termcraft does about it.

For the general background on cells and block characters, read
[terminal-art.md](terminal-art.md) first.

## The artefact

A colour image made of block characters is built from cells like this: print
`▀` (U+2580 UPPER HALF BLOCK), set the foreground to the colour you want on
top and the background to the colour you want underneath. One cell, two
stacked pixels.

That only works if the glyph's ink covers precisely the top half of the cell.
When it covers more, the top colour spills over the midpoint. When it covers
less, a strip of background shows through where the top colour should be. In
a grid of thousands of cells the errors line up into horizontal streaks: a
sliver of the wrong colour along every row boundary.

It reads as a bug in the renderer. It is not. The renderer emitted the correct
character and the correct colours.

## The measurements

The cell is defined by CSS: its width is the font's advance width, its height
is the line height. The ink is defined by the font's outlines. Nothing forces
those two to agree.

Measured in a browser at `font-size: 100px`, so a line height of 1.0 gives a
100px-tall cell. `actualBoundingBox` gives the real inked extent of the glyph.

| Font                | Advance | `█` ink width | `█` ink height | `▀` ink height |
| ------------------- | ------: | ------------: | -------------: | -------------: |
| Geist Mono          |    60.0 |          60.0 |          130.0 |           65.0 |
| Menlo               |    60.2 |          62.2 |          102.0 |           51.0 |
| Monaco              |    60.0 |          59.9 |           76.6 |           51.0 |
| Courier New         |    60.0 |          60.0 |          113.3 |           57.7 |
| Default `monospace` |    50.0 |          73.0 |          121.3 |           60.7 |

Read against a 100px cell, where a full block wants 100 and a half block
wants 50:

- **Geist Mono overdraws.** Its full block is 130% of the cell and bleeds into
  the rows above and below. Its half block is 65% rather than 50%, so the
  boundary between the foreground and background colours sits at 65% instead
  of halfway. This is the font the app uses for its own interface, which is
  how the problem was found.
- **Monaco underdraws.** Its full block is 77% of the cell, leaving a quarter
  of every row as background. Solid fills come out striped.
- **Menlo is close to right.** 102% and 51%. Of the fonts measured, it is the
  only one you could call correct.
- **The default `monospace` has ink wider than its advance**: 73 units of ink
  in a 50-unit cell. That overlaps horizontally, into the neighbouring column.

There is no consistent direction to the error. You cannot compensate for it
with a fixed line-height nudge, because the correction that fixes one font
breaks another, and you do not control which font the user picks.

### Reproducing it

Any browser console will do:

```js
const c = document.createElement("canvas").getContext("2d");
c.font = '100px "Geist Mono"';
const m = c.measureText("▀");
m.actualBoundingBoxAscent + m.actualBoundingBoxDescent; // 65, not 50
```

## What Termcraft does

Split the two jobs that were tangled together.

**The output stays text.** What you copy is unchanged: real characters, real
ANSI escape codes, exactly what a terminal expects. That is the product and it
must not be compromised to make a preview look nice.

**The preview stops using a font.** Every renderer in
`app/src/engines/image-to-ansi.js` already returns a `cells` grid alongside the
text: for each cell, the character it chose and the two colours it resolved.
`app/src/engines/block-glyphs.ts` maps each block character back to the grid of
sub-cells it fills, and `app/src/components/shared/BlockCanvas.tsx` paints
those sub-cells as rectangles on a canvas.

This is not a cheat or an approximation. It is the same characters and the
same colours, drawn without a font in the way — what the output looks like in
a terminal whose font is geometrically perfect.

Two details make it exact:

- Every rectangle edge is rounded to a whole pixel, and each rectangle starts
  where the previous one ended. Cell boundaries are snapped first, then
  subdivided inside, so neighbouring cells always share an edge. Nothing can
  fall between two rectangles.
- Sub-cell divisions are computed from the snapped cell edges rather than
  accumulated, so a 2×3 sextant divides a cell height that is not a multiple
  of three without drifting.

### It also fixed octants

Octants (2×4 sub-cells per character) were added in Unicode 16. No shipping
font has them yet, so asking a font to draw one produces a missing-glyph box —
and those boxes have a different advance width, which destroys the column
alignment as well as the picture.

Painting rectangles removes the font from the question entirely, so octant
output previews correctly today. The copied text still needs a font that has
the characters, which is a fair thing to warn about and a bad thing to be
unable to preview.

### And pixel fonts

The same fix applies in `app/src/tabs/PixelFontTab.tsx`. Pixel fonts render as
half blocks so two glyph rows fit in one cell — which doubles the vertical
detail and, more importantly, gives the letters the proportions they were
drawn with. Through a font, the 65%-instead-of-50% error put visible seams
across every stroke. Through `BlockCanvas`, the strokes are solid.

## Where the text preview still matters

Image to ANSI keeps an **Exact / Text** toggle, and the text view is not a
legacy fallback. It answers a different and equally real question: what will
this look like in a terminal, with a font, right now? If the user's font
overdraws its half blocks, their terminal will show the seams, and hiding that
would be dishonest. The exact view shows what the data says; the text view
shows what a font will make of it.

## What to take from this

If you are building anything that paints pixels with text characters:

1. A glyph's ink box and its layout box are unrelated. Do not assume block
   elements tile.
2. Measure before you compensate. `measureText().actualBoundingBox*` is the
   only reliable way to find out, and the answer differs per font.
3. If you control the rendering surface, do not use a font to draw pixels.
   Keep the characters as the output and paint the preview yourself.
4. If you must use a font, prefer one whose block elements were drawn to tile.
   Of the ones measured here, Menlo is the only one that is close.
