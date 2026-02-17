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

## The `app.js` Constraint

`src/app.js` could not be modified — it uses `getElementById`, `querySelectorAll`, `classList.toggle`, `dataset` attributes, and `addEventListener` throughout. All 881 lines had to work unchanged. This meant:

1. Every element ID in the HTML had to be preserved exactly.
2. Every `.nav-item` needed to keep its `data-tab` attribute.
3. Every `.mode-btn` needed to keep its `data-mode` attribute.
4. CSS class toggling (`.active`, `.visible`, `.hidden`) had to work the same way.
5. The `<select id="font-select">` had to remain empty for dynamic population.

This shaped the entire migration: Tailwind utility classes went into the HTML alongside the existing class names and IDs. `@layer components` in styles.css handled the JS-toggled state classes (`.active`, `.visible`, `.hidden`) that couldn't be replaced with Tailwind utilities because `app.js` toggles them by name.

One subtle case: removing the Grayscale button from the Color Wheel. `app.js` line 150 sets `document.getElementById('mode-swatch-grayscale').style.backgroundColor = ...` — removing the button would throw. Fix: add a hidden `<span class="hidden" id="mode-swatch-grayscale"></span>` placeholder. The JS writes to it harmlessly.

## Font Select `<hr>` Separator

The font dropdown needed a visual separator after the 3 featured fonts. Modern browsers support `<hr>` inside `<select>` elements as a native separator. But `app.js` dynamically populates the select via `populateFontSelect()`, which only creates `<option>` elements.

Since `app.js` can't be modified, the solution was a small inline `<script>` after `app.js` that uses a `MutationObserver` to watch for options being added to the select, then injects an `<hr>` after the 3rd option. The observer disconnects after firing once, so there's no ongoing overhead.

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
9. **Color Wheel Grayscale button** — Removed (grayscale strip is always visible), added hidden placeholder for JS

Most of these were layout decisions that looked fine in the old CSS but needed rethinking with Tailwind's utility approach. The explicit 3-row layout for image options (row 1: dimensions+scale, row 2: render+color, row 3: toggles) was cleaner than the old flex-wrap approach which broke differently at different widths.

## Summary

| Area | What went wrong | Fix |
|------|----------------|-----|
| Color tokens | `--color-*: initial` kills white/black | Re-declare them in `@theme` |
| Dev server | Old process lingering on port 8000 | Kill it, start Vite |
| JS constraint | Can't modify app.js, but need to remove a button | Hidden placeholder element |
| Font select | Can't modify app.js, but need `<hr>` separator | MutationObserver in inline script |
| Dot styles | Unicode chars ≠ 1ch wide in monospace | CSS `display: inline-block; width: 1ch` |
| Layout | Flex-wrap fragile at different widths | Explicit grid rows |
