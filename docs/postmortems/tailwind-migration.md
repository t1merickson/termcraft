# Tailwind CSS v4 Migration — Postmortem

Moving the UI from hand-written CSS to Tailwind CSS v4 + Vite, with real Geist design tokens.

## What Changed

~900 lines of hand-written CSS replaced by ~400 lines of Tailwind v4 config (`@theme`, `@layer base`, `@layer components`) plus utility classes in `index.html`. The old Node dev server was deleted in favor of Vite. Geist Sans and Geist Mono woff2 fonts moved from `fonts/geist/` to `assets/geist/` to separate runtime assets from font glyph data. The font index was reordered to feature Geist Pixel, Pixel Alpha, and Public Pixel first, with an `<hr>` separator in the `<select>` dropdown. The pixel font renderer was fixed to align all dot styles correctly.

Total: 17 files changed, ~8,000 insertions, ~1,400 deletions across 3 commits.

## The Token Extraction Approach

Rather than approximating Geist colors by eyeballing hex values, we pulled the real `--ds-*` CSS custom properties from vercel.com/geist using browser DevTools. This gave us the exact gray scale (100-1000), gray-alpha scale (with alpha channels), accent colors (in oklch), background values, shadows, and focus ring styles used in production Geist components.

These map into Tailwind v4's `@theme` block, which lets you write `bg-gray-alpha-100` or `shadow-focus-ring` as utilities. The mapping is direct: `--color-gray-400: #2e2e2e` becomes `border-gray-400` in markup.

## Tailwind v4's `--color-*: initial` Trap

Tailwind v4 uses a CSS-first configuration model. The `@theme` block defines design tokens as CSS custom properties. To prevent Tailwind's default color palette (slate, emerald, rose, etc.) from polluting the utility class namespace, you declare `--color-*: initial` which resets all color tokens.

The trap: this also clears `white` and `black`. Toggle switches used `after:bg-white` for the thumb — after the reset, the thumb rendered as transparent. The fix was adding `--color-white: #ffffff` and `--color-black: #000000` back into `@theme`. This wasn't obvious because the toggles looked correct at first glance (the track was visible, only the thumb was invisible against the dark background).

**Lesson:** When resetting Tailwind's color namespace with `--color-*: initial`, audit every utility that uses built-in color names. `bg-white`, `bg-black`, `text-white`, `text-black`, `border-white`, `border-black` all break silently.

## The Stale Dev Server Problem (Again)

After completing all the Tailwind migration edits, the browser showed completely unstyled content — raw HTML with no Tailwind processing. The Tailwind `@import "tailwindcss"` directive was in the CSS, the `@tailwindcss/vite` plugin was configured, but nothing was being compiled.

Root cause: the old `node scripts/dev-server.js` process was still running on port 8000 from a previous session. It served raw CSS files without any build step, so `@import "tailwindcss"` was sent to the browser as-is (which the browser ignores). Vite was never actually running.

Fix: kill the old process, start Vite with `npx vite --port 8000`. Immediately worked.

This is the same category of problem documented in the aspect ratio postmortem (browser caching stale files), but at the process level. The lesson isn't new but the failure mode is different: having two different dev servers that can occupy the same port, where one does build-time processing and one doesn't.

**Lesson:** When switching build tools, verify the correct server is actually running. A stale process on the same port will silently serve old/unprocessed files.

## HTML ↔ JS Interface

The Tailwind migration mostly touched HTML and CSS, but `app.js` has expectations about the DOM. A few things had to stay in sync:

1. Every element ID in the HTML had to be preserved — `app.js` uses `getElementById` throughout.
2. Every `.nav-item` needed to keep its `data-tab` attribute, every `.mode-btn` its `data-mode`.
3. CSS class toggling (`.active`, `.visible`, `.hidden`) had to work the same way — `app.js` toggles them by name, so `@layer components` in styles.css defines these rather than using Tailwind utilities.

Two features required small `app.js` changes:

**Grayscale button removal.** The Color Wheel originally had a Grayscale mode button. Since the grayscale strip is always visible, the button was redundant. Removing it meant also removing the `getElementById('mode-swatch-grayscale')` line in `app.js` that set its background color — otherwise it would throw a null reference.

**Font select `<hr>` separator.** The font dropdown needed a visual separator after the 3 featured fonts. Modern browsers support `<hr>` inside `<select>` as a native separator. `populateFontSelect()` in `app.js` was updated to check each font's `featured` property and insert an `<hr>` when the featured run ends.

### The phantom constraint

Both of these were initially worked around without touching `app.js` — a hidden placeholder `<span>` to absorb the dead `getElementById` write, and a `MutationObserver` inline script to inject the `<hr>` after `populateFontSelect()` ran. These workarounds existed because of a false constraint carried forward from a previous session summary that said `app.js` must not be modified. In reality, there was no such requirement. The direct fixes (two deleted lines and six added lines in `app.js`) were cleaner than the workarounds they replaced.

**Lesson:** Question inherited constraints. A constraint that made sense during one phase of work (e.g., "don't touch the JS while migrating CSS") can become a liability when carried forward as a permanent rule.

## Dot Style Character Width Fix

Unicode block/symbol characters have inconsistent advance widths even in monospace fonts. Full Block (█) is typically exactly one character cell wide, but Square (■), Circle (●), Diamond (◆), Large Circle (⬤), and others are narrower or wider depending on the font. In the pixel font renderer, each character occupies one position in a text grid — if the character is narrower than 1ch, subsequent characters shift left, and rows of different content misalign.

The fix splits the render output into two paths:

- `ansi` — plain text for clipboard/terminal (unchanged)
- `html` — each non-space character wrapped in `<span class="pc">` where `.pc { display: inline-block; width: 1ch; text-align: center }`

This forces every cell to exactly one monospace character width regardless of the glyph's natural dimensions. The `text-align: center` keeps smaller symbols visually centered rather than left-hugging. Spaces don't need wrapping because they're always 1ch in monospace fonts.

The shadow characters (░, ▒, ▓) also go through the same wrapping, since they have the same variable-width problem.

**Lesson:** Monospace fonts only guarantee consistent widths for the basic Latin repertoire. Unicode symbols, box-drawing characters, and block elements often have different advance widths. If you need a perfect character grid, enforce cell width in CSS rather than trusting the font.

## The Nine UI Fixes

After the initial Tailwind migration, visual review in Chrome revealed 9 issues:

1. **Toggle thumbs invisible** — `--color-*: initial` cleared white (see above)
2. **Container missing side borders** — Added `border-x border-gray-alpha-400` to the page wrapper
3. **Lookup tab off-center** — Removed stray `mx-auto` from the tab wrapper
4. **Sidebar nav items wrong padding** — Changed `px-5` to `mx-3 px-3` on all 5 items
5. **Image to ANSI options layout** — Restructured from flex-wrap to 3 explicit rows
6. **Image to ASCII options layout** — Same restructure
7. **Pixel Font layout** — Moved Text input to top, Font+Dot Style side by side in 2-column grid
8. **Pixel Font glyph preview** — Added "Show Glyphs" toggle button, preview starts hidden
9. **Color Wheel Grayscale button** — Removed (grayscale strip is always visible), deleted dead JS reference

Most of these were layout decisions that looked fine in the old CSS but needed rethinking with Tailwind's utility approach. The explicit 3-row layout for image options (row 1: dimensions+scale, row 2: render+color, row 3: toggles) was cleaner than the old flex-wrap approach which broke differently at different widths.

## Summary

| Area               | What went wrong                                     | Fix                                                 |
| ------------------ | --------------------------------------------------- | --------------------------------------------------- |
| Color tokens       | `--color-*: initial` kills white/black              | Re-declare them in `@theme`                         |
| Dev server         | Old process lingering on port 8000                  | Kill it, start Vite                                 |
| Dot styles         | Unicode chars ≠ 1ch wide in monospace               | CSS `display: inline-block; width: 1ch`             |
| Layout             | Flex-wrap fragile at different widths               | Explicit grid rows                                  |
| Phantom constraint | Workarounds avoided touching `app.js` unnecessarily | Question inherited constraints, make the direct fix |
