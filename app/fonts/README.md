# Pixel Fonts

This folder stores pixel fonts in a consistent JSON format so the app can list and render them.

## Font Format

Each font lives in its own folder:

- `app/fonts/<font-id>/font.json`
- `app/fonts/<font-id>/LICENSE`
- `app/fonts/<font-id>/README.md`

`font.json` has this shape:

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
    "A": ["00011000", "00111100", "01111110", "11100111", ...],
    "B": ["11111100", "11111111", "11000011", "11000011", ...]
  }
}
```

Glyph rows use binary format: `1` = filled pixel, `0` = empty pixel.

## Fonts to Avoid

LSDJ-style fonts (designed for the Game Boy music tracker Little Sound DJ) use non-standard charsets that don't follow ASCII ordering. They typically rearrange characters and include custom icons in place of standard punctuation. Not worth importing.

## Adding a Font

1. Find a permissively licensed pixel font (OFL, MIT, Apache-2.0, CC0).
2. Export a PNG sprite sheet where glyphs are laid out in a grid.
3. Run the importer:

```
node scripts/import-png-sprite.js \
  --input assets/font-sources/my-font/sprite.png \
  --output app/fonts/my-font/font.json \
  --name "My Font" \
  --id my-font \
  --glyph-width 8 \
  --glyph-height 12 \
  --charset "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# If your sprite sheet has spacing between glyphs:
#   --x-gap 1 --y-gap 1
# If your sheet has margins:
#   --margin-x 1 --margin-y 1
# If glyphs are dark on a light background:
#   --luma-threshold 128
```

4. Add `app/fonts/my-font/LICENSE` and `app/fonts/my-font/README.md` with attribution.
5. Add the font to `app/fonts/index.json`:

```json
{ "id": "my-font", "name": "My Font", "type": "pixel", "path": "fonts/my-font/font.json" }
```

## BMFont XML Import

For BMFont XML+PNG pairs (like the frostyfreeze pack):

```
node scripts/import-bmfont-xml.js \
  --xml assets/font-sources/myfont/myfont.xml \
  --png assets/font-sources/myfont/myfont.png \
  --output app/fonts/myfont/font.json \
  --name "My Font" \
  --id myfont
```

## OTF Import

For OpenType pixel fonts (like Geist Pixel):

```
node scripts/import-otf.js \
  --input assets/font-sources/geist-pixel/GeistPixel-Square.otf \
  --output app/fonts/geist-pixel/font.json \
  --name "Geist Pixel" \
  --id geist-pixel
```
