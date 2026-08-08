# Shape-Aware ASCII Rendering — Postmortem

Adding shape-aware character matching (based on Alex Harri's approach), plus an ASCII art editor and a video-to-ASCII converter.

## What Changed

The Image to ASCII tab gained a second matching mode. The original brightness mode maps each grid cell to a single luminance value and picks a character from a density ramp. The new shape-aware mode samples 6 circular regions within each cell, producing a 6-dimensional vector, and finds the nearest character by Euclidean distance in that vector space. A k-d tree and quantized cache accelerate the lookup. Two new tabs — ASCII Editor and Video to ASCII — were added to the sidebar.

Total: 4 new files (`shape-vectors.js`, `ascii-editor.js`, `video-to-ascii.js`, `spike-webgpu.md`), 3 modified files (`image-to-ascii.js`, `index.html`, `app.js`, `styles.css`). The suite went from 4 sidebar tabs to 7.

## Why Brightness Matching Looks Blurry

The core insight from Alex Harri's article, and the motivation for this work: traditional ASCII renderers treat each cell as a single pixel. No matter how many samples you take within a cell, averaging them into one brightness value and picking one character from a luminance ramp throws away all spatial information. A cell containing a diagonal edge and a cell containing uniform gray at the same average brightness produce the same character. The output reads as texture, not structure.

The shape-aware approach fixes this structurally. Six sampling circles (arranged in a 2-column by 3-row staggered grid) measure _where_ brightness concentrates within the cell, not just _how much_. A cell with brightness concentrated in the top-left produces a different 6D vector than one with brightness concentrated in the bottom-right, even if the total luminance is identical. The character `\` naturally matches one; `/` matches the other.

This is why the SDF alternative (Shape B in the planning doc) was appealing but unnecessary. Signed distance fields solve outline matching — a harder problem than what's actually needed. The circle sampling already captures spatial structure at a fraction of the cost.

**Lesson:** When the output looks bad, check whether the representation discards the information you need. Brightness-only matching isn't a sampling fidelity problem — it's a dimensionality problem. Adding more samples per cell can't help because they all collapse into one number.

## The AFFECTING_EXTERNALS Mapping

Directional contrast enhancement uses 10 external sampling circles that reach into neighboring cells. The non-obvious part is how these map to internal components. The article's `AFFECTING_EXTERNALS` array defines which external circles influence which internal components, and the mapping is many-to-many, not 1:1. Each external circle affects multiple internal components, "widening" the influence across the cell boundary.

Getting this mapping wrong would produce staircase artifacts at edges — hard jumps between characters rather than smooth transitions. We transcribed the exact mapping from the article: external circles at the top affect internal circles in the top row, external circles on the left affect the left column, and corner externals affect the nearest internal circle. The implementation in `shape-vectors.js` stores this as a constant array of arrays.

The result: along a color boundary, you get smooth character progressions rather than abrupt switches. The article shows transitions like `U → Y → f → ' → backtick → !` along a gradient edge, which is exactly what our implementation produces.

**Lesson:** When an algorithm's correctness depends on a specific mapping table, transcribe it exactly rather than deriving it from first principles. The many-to-many relationship between external and internal circles isn't intuitive — getting it right by reasoning about geometry would be fragile. Getting it right by copying the known-good table took seconds.

## Normalization Does Two Jobs

Raw circle coverage values cluster toward the low end of their range because most ASCII characters leave most of their cell blank. Only a few dense characters like `@`, `#`, `█` have high coverage across all circles. Without normalization, Euclidean distance calculations are dominated by these dense characters — everything else is clustered near the origin in vector space.

The global contrast enhancement formula (normalize to max component = 1, raise to power, denormalize) is doing two things at once: it enhances contrast between components within a single vector _and_ it spreads the character vectors across the full 6D space so that distance calculations produce meaningful distinctions. We implemented this exactly as described in the article — normalize each component by dividing by the maximum, raise to the user-controlled exponent (1.0–4.0), then multiply back by the original maximum.

A useful emergent property: cells with roughly uniform brightness have shape vectors where all 6 components are similar. Raising similar values to a power doesn't change their relative ordering, so contrast enhancement aggressively sharpens edges while leaving smooth areas alone. No special-case logic needed.

**Lesson:** When a formula serves multiple purposes simultaneously, implement it whole rather than trying to decompose it. The normalization and contrast enhancement steps are coupled — splitting them into separate passes would require understanding both purposes independently, which is harder than implementing the combined formula.

## The Two-Level Cache

Character matching needs to be fast for video (3,200 cells × 15fps = 48K lookups per second). We implemented two levels:

**Level 1 — quantized cache.** Each 6D vector component is quantized to 5 bits (32 levels). Six components pack into a single 30-bit integer key via bit-shifting. A `Map<number, string>` stores the result. This gives O(1) lookups for vectors that quantize to the same key. At 80×40 with typical images, cache hit rates are high because many cells share similar luminance patterns — large regions of similar brightness all hash to the same key.

**Level 2 — k-d tree.** On cache miss, a 6-dimensional k-d tree (median-split construction, iterative stack-based search) finds the nearest character in O(log n) time. With ~95 characters, the tree is 6–7 levels deep. The result is stored back into the quantized cache for future hits.

Brute force (95 distance calculations per cell) is technically fine for still images — at 80×40, that's 304K distance calculations, which completes in ~30ms. But for video, brute force at 15fps would be 4.56M distance calculations per second. The two-level cache reduces this to mostly Map lookups.

Measured performance: 80×40 shape-aware at 25ms warm, 100ms at 160×80. The 200ms budget had 2–4x headroom. This headroom is what made the video tab feasible without reaching for WebGPU.

**Lesson:** Build the cache before you need it. We added the k-d tree and quantized cache in Slice 3, before starting the video tab in Slice 5. If we'd built the video tab first and _then_ discovered it was too slow, we'd have been debugging performance under pressure instead of just plugging in an already-tested optimization.

## WebGPU: Spike It, Don't Build It

The article uses WebGPU compute shaders for its real-time demo. We wrote a standalone spike document (`spike-webgpu.md`) analyzing whether to add GPU acceleration. The analysis found 7 concrete downsides: ~75-80% desktop browser support, boilerplate for adapter/device/pipeline setup, two parallel code paths to maintain, WGSL shader language with no source maps, no iOS Safari support, readback latency from GPU→CPU, and complex error handling for lost devices.

The spike's conclusion: the CPU path with the quantized cache meets the performance budget for all current use cases (sub-200ms for stills, sub-66ms for video at 15fps). WebGPU becomes necessary only at high resolution + high frame rate (160×80 @ 30fps = 384K lookups/sec). The recommended decision gate: profile at 160×80 @ 30fps, and if it drops below budget, implement a `CpuAsciiRenderer` / `GpuAsciiRenderer` interface.

Writing this as a document rather than building it preserved the analysis for future reference without adding code complexity today. The GPU and CPU paths produce identical output — this is a throughput optimization, not a quality one.

**Lesson:** When a technology is appealing but not yet necessary, write down why you're not using it and when you would. A spike document is cheaper than a feature branch and more durable than a comment.

## Slices 1 and 2 Were Really One Slice

The plan separated the shape vector engine (Slice 1) from contrast enhancement (Slice 2). In implementation, they were inseparable. The contrast functions live in `shape-vectors.js`, use the same circle layout, share the same UI panel, and are wired through the same `getAsciiOptions()` helper. The "mode toggle" and "contrast controls" shipped together as one set of edits to `index.html` and `app.js`.

The artificial separation added planning overhead (two separate affordance tables, two R-coverage lists) without adding meaningful delivery granularity. Both slices produced their first testable demo at the same moment.

**Lesson:** If two planned slices share the same file, the same UI panel, and the same data structures, they're one slice. Splitting work that can't be independently demonstrated creates phantom milestones.

## The Editor's Missing Color Picker

The ASCII editor's data model supports per-cell foreground colors — every cell stores `{ char, fg }` and the ANSI export emits `\x1b[38;2;r;g;bm` sequences when `fg` is set. But the UI has no color picker. Users can only paint in the default white. The `setBrushColor()` API exists and is exposed on the public interface, but nothing in `app.js` calls it.

This was spec'd in the plan as "Color painting: Optional foreground color per cell (from ANSI 256 palette or 24-bit picker)" but deprioritized during implementation to keep the editor's first version focused on the grid mechanics — tools, undo/redo, resize, export. The color picker would be a small addition (an ANSI palette strip in the toolbar, wiring click → `editor.setBrushColor(rgb)`) but it's the difference between an editor that exports plain text and one that exports colored ANSI art.

**Lesson:** When a data model supports a capability but the UI doesn't expose it, document the gap explicitly. The capability is invisible to users and easy to forget.

## The Video Tab's Untested Paths

The video-to-ASCII renderer was verified with a programmatic test: generate a canvas with a gradient and circle, process it through `ImageToAscii.processImage()`, render to the terminal div. This proved the processing pipeline works — the same code path that runs on each `requestAnimationFrame` tick.

But three user-facing paths were only structurally validated (code exists, no runtime errors, UI renders correctly) without end-to-end testing:

1. **File upload → play → pause → stop** — requires a real video file.
2. **Webcam capture** — requires browser camera permission, which can't be programmatically granted.
3. **Auto-reduce** — requires a frame that exceeds the budget for 3 consecutive ticks, triggering the resolution downgrade. Synthetic testing would need a deliberately slow processing path.

The auto-reduce mechanism (track consecutive slow frames, halve resolution when `consecutiveSlow >= 3`, gradually recover when headroom returns) was built from the start as specified in the plan's A8 flag note. But it hasn't been stress-tested on real hardware.

**Lesson:** When a feature requires hardware interaction (camera, microphone, GPU) or real media files, note the untested paths explicitly. "It renders without errors" and "it works end-to-end" are different claims.

## The Editor Tool Button Visibility Problem

The editor toolbar has 5 tool buttons (Type, Brush, Line, Fill, Eraser). The active tool gets the `.editor-tool-btn.active` class, which reuses the same `.mode-btn.active` style from the Color Wheel tab: `bg-gray-alpha-100` with a slightly brighter border. On the dark background, the difference between active and inactive is a 4-5% brightness shift — visible if you're looking for it, invisible in peripheral vision.

This was noticed during browser testing but not fixed. The tool buttons are the primary interaction point for the editor, and "which tool am I using?" should be answerable at a glance. A stronger indicator — colored border-bottom, filled background, or inverted colors — would cost one CSS rule change.

**Lesson:** If you notice a usability problem during testing and decide to skip it, write it down in the same session. The cost of the fix is lowest when the context is fresh.

## Summary of Lessons

1. **Brightness matching is a dimensionality problem, not a sampling problem.** More samples per cell can't help if they all collapse into one number. Shape-aware matching uses 6 dimensions to preserve spatial information.
2. **Transcribe known-good mapping tables exactly.** The AFFECTING_EXTERNALS array defines a non-intuitive many-to-many relationship. Copying it is faster and more reliable than deriving it.
3. **When a formula serves multiple purposes, implement it whole.** The normalization + contrast enhancement formula does two jobs simultaneously. Decomposing it requires understanding both independently.
4. **Build the cache before you need it.** The k-d tree and quantized cache were ready before the video tab existed, so video performance was never a blocking issue.
5. **Spike technologies you're not using yet.** A document explaining why you're not using WebGPU and when you would is cheaper than a feature branch and more useful than a TODO comment.
6. **Don't split slices that share files and UI panels.** If two slices can't be independently demonstrated, they're one slice.
7. **When the data model supports a capability but the UI doesn't, document the gap.** The editor's color support is invisible to users.
8. **Note untested paths explicitly.** Hardware-dependent features (webcam, file upload, auto-reduce) need real-world testing beyond structural validation.
9. **Fix usability issues when the context is fresh.** The editor's subtle active-tool indicator was noticed during testing and deferred — the cheapest fix is always in the same session.
