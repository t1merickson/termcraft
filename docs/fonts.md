# Pixel fonts

How the bundled pixel fonts are stored, how to add one, and what to watch out
for. For the list of which fonts ship and who made them, see the Thanks
section of the [README](../README.md).

There are two unrelated kinds of font in this project. This document is about
the first.

- **Pixel fonts** are data, not typefaces. Each is a set of small bitmaps that
  the app draws using block characters. They live in `app/public/fonts/` and
  power the Pixel Font tool.
- **Interface fonts** are Geist Sans and Geist Mono, ordinary web fonts loaded
  by `app/src/styles.css`. Nothing to do with the above.

## Where they live

Everything under `app/public/` is copied into the build as-is, so these files
are fetched at runtime rather than bundled.

```
app/public/fonts/
  index.json                 the list the app loads first
  <font-id>/
    font.json                the glyph data
    LICENSE                  required, one per font
    README.md                optional, attribution and notes
```

`index.json` is an array:

```json
{
  "id": "geist-pixel",
  "name": "Geist Pixel",
  "type": "pixel",
  "path": "fonts/geist-pixel/font.json",
  "featured": true
}
```

`path` is relative to the site root, and the app prefixes it with
`import.meta.env.BASE_URL` so the build works from a subdirectory. If you
hardcode a leading slash it will break on GitHub Pages.

## The font format

```json
{
  "meta": {
    "id": "pixel-alpha",
    "name": "Pixel Alpha",
    "glyphWidth": 8,
    "glyphHeight": 12,
    "spaceWidth": 4,
    "letterGap": 1,
    "fallback": "?",
    "charset": "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  },
  "glyphs": {
    "A": ["00011000", "00111100", "01111110", "11100111"],
    "B": ["11111100", "11111111", "11000011", "11000011"]
  }
}
```

Each glyph is an array of row strings, one character per pixel: `1` is filled,
`0` is empty. Rows run top to bottom.

| Field                       | What it does                                               |
| --------------------------- | ---------------------------------------------------------- |
| `glyphWidth`, `glyphHeight` | The bitmap size. Inferred from the first glyph if missing. |
| `spaceWidth`                | How many empty columns a space produces.                   |
| `letterGap`                 | Empty columns inserted between glyphs.                     |
| `fallback`                  | Which glyph to substitute for a character the font lacks.  |
| `charset`                   | Display order for the glyph grid in the UI. Cosmetic only. |

### Partial fonts are fine, but say so

A font does not have to cover much. Pixel Alpha is 26 uppercase letters, no
digits and no punctuation.

The renderer looks up a character, then its uppercase form, then its lowercase
form, then `meta.fallback`. If none of those exist it emits a gap
`spaceWidth` wide. That gap looks exactly like a space, which is confusing, so
the Pixel Font tool lists the characters the selected font cannot draw. If you
add a partial font, nothing extra is needed — that warning is automatic.

Setting `fallback` to a character the font does not contain, as Pixel Alpha
does with `?`, is harmless. It just means missing characters fall through to
the gap.

## Adding a font

1. **Check the licence first.** Prefer OFL, MIT, Apache-2.0, CC0 or public
   domain. Anything NonCommercial or NoDerivatives is out: the import step
   converts the original into a new bitmap format, which is a derivative work,
   and the project is MIT so downstream users may well be commercial. Three
   CC BY-NC-ND fonts were removed for exactly this reason. Share-alike is
   workable but passes an obligation to anyone who forks, so prefer without.
2. Import it with whichever script matches your source, below.
3. Write `app/public/fonts/<id>/LICENSE` with the real author, the licence and
   a URL. This is not optional; it is the only record of where the font came
   from.
4. Add the entry to `app/public/fonts/index.json`.
5. Add a row to the fonts table in the README's Thanks section.
6. Load the Pixel Font tool and check the glyph grid renders.

### From a PNG sprite sheet

```bash
node scripts/import-png-sprite.js \
  --input assets/font-sources/my-font/sprite.png \
  --output app/public/fonts/my-font/font.json \
  --name "My Font" \
  --id my-font \
  --glyph-width 8 \
  --glyph-height 12 \
  --charset "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
```

Useful extras: `--x-gap` and `--y-gap` if the sheet has spacing between
glyphs, `--margin-x` and `--margin-y` if it has an outer margin, and
`--luma-threshold 128` if the glyphs are dark on a light background rather
than the other way round.

### From BMFont XML plus PNG

```bash
node scripts/import-bmfont-xml.js \
  --xml assets/font-sources/myfont/myfont.xml \
  --png assets/font-sources/myfont/myfont.png \
  --output app/public/fonts/myfont/font.json \
  --name "My Font" \
  --id myfont
```

### From an OpenType file

```bash
node scripts/import-otf.js \
  --input assets/font-sources/geist-pixel/GeistPixel-Square.otf \
  --output app/public/fonts/geist-pixel/font.json \
  --name "Geist Pixel" \
  --id geist-pixel
```

This only works for fonts whose outlines are actually made of square pixels.
Run it on a normal typeface and you will get mush.

## Source files are not tracked

`assets/font-sources/` holds the original PNGs and OTFs the importers read.
`.gitignore` excludes everything there except `sprite.json` metadata, because
the binaries are large and the generated `font.json` is what the app needs. If
you clone the repo you will have the fonts but not their sources.

## How rendering works

The Pixel Font tool has two modes.

**Half blocks**, the default, packs two glyph rows into one character cell.
A terminal cell is about twice as tall as it is wide, so one cell per pixel
makes every font come out twice as tall as it was drawn. Pairing rows fixes
the proportions and doubles the vertical detail at the same time. Fill and
shadow are distinguished by colour, because a half block only has two regions
to work with.

**One cell per pixel** is the older mode and the one that supports dot styles:
any character can stand in for a filled pixel, so you can render a word in
circles, diamonds or squares.

In half-block mode the preview is painted as rectangles rather than drawn with
a font, because no font draws a half block at exactly half the cell height.
See [glyph-geometry.md](glyph-geometry.md).

## Fonts to avoid

LSDJ-style fonts, made for the Game Boy tracker Little Sound DJ, use charsets
that do not follow ASCII order. They rearrange characters and put custom icons
where punctuation should be, so the importers map them wrongly and fixing it
by hand is not worth the effort.
