# Pixel Fonts

This folder stores pixel fonts in a consistent JSON format so the app can list and render them.

## Font Format

Each font lives in its own folder:

- `fonts/<font-id>/font.json`
- `fonts/<font-id>/LICENSE`
- `fonts/<font-id>/README.md`

`font.json` has this shape:

```
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
    "A": ["   ██   ", "  ████  ", " ██████ ", "███  ███", "██    ██", "██    ██", "████████", "████████", "██    ██", "██    ██", "██    ██", "██    ██"],
    "B": ["██████  ", "████████", "██    ██", "██    ██", "██    ██", "███████ ", "████████", "██    ██", "██    ██", "██    ██", "████████", "██████  "]
  }
}
```

## Fonts to Avoid

LSDJ-style fonts (designed for the Game Boy music tracker Little Sound DJ) use non-standard charsets that don't follow ASCII ordering. They typically rearrange characters and include custom icons (pulse width waveforms, paw prints, etc.) in place of standard punctuation. Not worth importing.

## Adding a Font

1. Find a permissively licensed pixel font (OFL, MIT, Apache-2.0, CC0).
2. Export a PNG sprite sheet where glyphs are laid out in a grid.
3. Run the importer:

```
node scripts/import-png-sprite.js \
  --input assets/my-font.png \
  --output fonts/my-font/font.json \
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

4. Add `fonts/my-font/LICENSE` and `fonts/my-font/README.md` with attribution.
5. Add the font to `fonts/index.json`:

```
[
  { "id": "pixel-alpha", "name": "Pixel Alpha", "path": "fonts/pixel-alpha/font.json" },
  { "id": "my-font", "name": "My Font", "path": "fonts/my-font/font.json" }
]
```

## BMFont XML Import

For BMFont XML+PNG pairs (like the frostyfreeze pack), use:

```
node scripts/import-bmfont-xml.js \
  --xml assets/font-sources/myfont.xml \
  --png assets/font-sources/myfont.png \
  --output fonts/myfont/font.json \
  --name "My Font" \
  --id myfont
```
