# Aspect Ratio Fix — Testing & Iteration Notes

What we learned fixing the Image-to-ANSI aspect ratio bug and building the headless test harness.

## The Bug

Images rendered through Image-to-ANSI always appeared stretched wider than they should. A square die emoji would render as a wide rectangle. This affected all render modes.

## Root Cause

The original code had a `CHAR_ASPECT = 2` constant applied globally to all scaling calculations. The intent was to compensate for terminal characters being roughly twice as tall as they are wide. But in this project, the HTML preview uses `line-height: 1` with a monospace font, which makes character cells approximately square. The 2x multiplier was solving a problem that didn't exist in the display context, and it was applied uniformly to all modes — which is wrong even for a real terminal, because each render mode has a different pixel-to-character mapping ratio.

## Why It Took Three Iterations

### Iteration 1: Remove CHAR_ASPECT entirely

Removed all references to `CHAR_ASPECT = 2`. Result: widths became correct, but half-blocks and full-spaces modes produced output that was squashed to half height. Block chars and quadrant modes looked fine.

### Iteration 2: Understand the per-mode mapping

Each render mode maps source pixels to terminal characters differently:

| Mode | Pixel → Char mapping | Effect |
|------|---------------------|--------|
| **Half blocks** (▀▄) | 1 char = 1 pixel wide × 2 pixels tall | Pixel grid height must be 2× to fill the character grid correctly |
| **Quadrant** (▖▗▘▝) | 1 char = 2 pixels wide × 2 pixels tall | Symmetric 2×2 packing — width and height scale equally, no correction needed |
| **Block chars** (█) | 1 char = 1 pixel | Direct 1:1 mapping, no correction needed |
| **Full spaces** (two spaces per pixel) | 1 pixel = 2 chars wide × 1 char tall | Pixel grid needs 2× height to compensate for the doubled width |

The original `CHAR_ASPECT = 2` happened to work for half-blocks (where you actually need a 2× height factor) but was wrong for block chars and quadrant (where no factor is needed). Removing it fixed block chars and quadrant but broke half-blocks and full-spaces.

### Iteration 3: Per-mode scaling

Applied the correction factor only to the modes that need it. Half-blocks scale pixel height to `2 * pixelW / aspectRatio`. Full-spaces scale pixel height similarly. Block chars and quadrant use the image aspect ratio directly.

This is the key insight: **you can't apply a single aspect correction to all modes because each mode has a different pixel-to-character geometry.**

## The Browser Cache Problem

Before we even got to the aspect ratio fix, a significant chunk of time was lost to browser caching. After modifying `pixel-font.js` and `app.js` for the shadow feature, the browser continued serving old cached versions despite hard-refreshing. Symptoms:

- Shadow feature appeared to not work at all
- Console showed no errors (old code ran fine, just without shadow logic)
- `python3 -m http.server` and `npx serve` both served cached files aggressively

**Fix:** Added `?v=2` cache-bust params to `<script>` tags as a temporary workaround. **Permanent fix:** Built a zero-dependency Node dev server (`scripts/dev-server.js`) that sets `Cache-Control: no-cache, no-store, must-revalidate` on every response.

**Lesson:** When modifying JS files served by a static file server with no cache headers, the browser will cache them. Both Python's `http.server` and `npx serve` default to caching behavior that makes iterative development painful. Always use no-cache headers during development.

Additional cache gotcha: we initially only cache-busted `pixel-font.js` but forgot `app.js`. The old `app.js` didn't pass shadow options to `renderText()`, so the shadow code existed in `pixel-font.js` but was never called. **Lesson:** When a feature spans multiple files, all of them need cache invalidation.

## The Headless Test Harness

Visually verifying aspect ratios in the browser was slow and unreliable (due to the caching issues above). We built `scripts/test-render.js` to:

1. Load sample PNGs from `samples/` using `pngjs`
2. Run the same scaling logic as `image-to-ansi.js` (mirrored in Node)
3. Render the ANSI cell grid to a PNG — each character cell drawn as an 8×8 pixel square
4. Save source and rendered PNGs to `test-output/` for side-by-side comparison

This let us verify all four render modes against all sample images in one `npm test` run, with no browser involved. Vision comparison of the output PNGs immediately showed when a mode was squashing or stretching.

**Key design decision:** The test renders cells as square (8×8 pixels) to match the browser's `line-height: 1` display. This means the test output looks exactly like the browser preview, making comparison straightforward.

### What the test caught

- Half-blocks squashing dice images into horizontal ovals (Iteration 1)
- Full-spaces producing the same squash
- Block chars and quadrant rendering correctly (confirming those modes needed no correction)
- All modes producing correct proportions after the per-mode fix (Iteration 3)

## The Shadow Recursive Bug

Unrelated to aspect ratio but worth noting: the pixel font shadow feature originally had a "Solid" intensity option that used █ as the shadow character — the same character used for filled pixels. This meant the shadow rendering pass would detect its own shadow characters as filled pixels, creating a cascade. Removed the Solid option entirely; shadow intensities are now limited to ░▒▓.

## Summary of Lessons

1. **One constant can't correct all modes.** Each render mode maps pixels to characters differently. Understand the geometry before applying scaling factors.
2. **Cache invalidation during dev is not optional.** Use a dev server with no-cache headers. Don't rely on browser hard-refresh.
3. **When busting cache, bust ALL modified files.** A feature that spans `pixel-font.js` and `app.js` requires both to be invalidated.
4. **Headless visual tests beat browser testing for geometry bugs.** Rendering the ANSI output to PNG and comparing against the source image is fast, reliable, and doesn't involve browser state.
5. **Test all modes simultaneously.** The aspect ratio bug only affected some modes — without testing all four in one pass, it's easy to fix one and break another.
6. **Don't let shadow chars collide with content chars.** If the shadow character is identical to the filled character, the shadow pass can't distinguish its own output from the source data.
