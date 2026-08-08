# Termcraft docs

Four kinds of document live here.

**Learn how this works.** Start here if terminal art is new to you, or if you
want to understand what the tools are actually doing.

- [terminal-art.md](terminal-art.md) — how a terminal draws anything at all:
  cells, escape codes, colour depths, block characters, and why a picture made
  of text comes out twice as tall as it should
- [glyph-geometry.md](glyph-geometry.md) — why block characters do not tile the
  way you would expect, with measurements, and why the previews paint
  rectangles instead of using a font

**Reference.** Look things up.

- [renderers.md](renderers.md) — every way an image can be turned into
  characters, what each packs into a cell, and which one to reach for
- [dithering.md](dithering.md) — the dithering algorithms and palettes, what
  each looks like and when to use it
- [fonts.md](fonts.md) — the pixel font format, how to import one, and the
  licensing rule for adding more

**Work on the code.**

- [architecture.md](architecture.md) — how the codebase is laid out, the two
  rules that keep it navigable, how to add a tool, and how the tests work

**What went wrong before.** Read the relevant one before changing a renderer;
these exist so the same mistake does not get made twice.

- [postmortems/aspect-ratio.md](postmortems/aspect-ratio.md) — the many ways
  character aspect ratio can be got wrong
- [postmortems/shape-aware-ascii.md](postmortems/shape-aware-ascii.md) —
  implementing shape matching, and why brightness alone cannot work
- [postmortems/tailwind-migration.md](postmortems/tailwind-migration.md) —
  moving to Tailwind v4 and the Geist tokens
- [spikes/webgpu.md](spikes/webgpu.md) — an investigation into GPU rendering,
  not implemented

## Conventions

Prose uses British spelling. Code identifiers are quoted exactly as they
appear in the source, which uses American spelling (`color`, not `colour`).

Paths are repo-relative so you can go and read the thing being described.
