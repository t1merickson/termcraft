# Shape-Aware ASCII + New Tools — Shaping Document

## Frame

**Source:**
User wants to upgrade the Image to ASCII tool based on Alex Harri's
shape-aware ASCII rendering approach, and add new ASCII-based tools as
sidebar tabs.

**Problem:**
The current Image to ASCII tool uses single-pixel brightness sampling —
each grid cell maps to one luminance value, which maps to one character.
This discards all shape information.  Edges look jagged, diagonals are
noisy, and the output reads as a "texture" rather than a recognizable
image.  There are also no other ASCII-oriented tools in the suite beyond
the basic converter.

**Outcome:**
ASCII output that preserves edges and shapes.  A richer set of ASCII tools
that make the suite a go-to workbench for terminal art.


---


## Requirements

| ID  | Requirement                                                        | Status      |
|-----|--------------------------------------------------------------------|-------------|
| R0  | Shape-aware character matching that preserves edges and structure  | Core goal   |
| R1  | User can toggle between brightness-only and shape-aware modes      | Must-have   |
| R2  | Contrast enhancement controls (global exponent + directional)      | Must-have   |
| R3  | Performance stays interactive (sub-200ms) at typical output sizes  | Must-have   |
| R4  | New tool: live ASCII text editor / canvas for composing art        | Must-have   |
| R5  | New tool: video/webcam to ASCII (real-time stream)                 | Must-have   |
| R6  | New tab structure is consistent with existing sidebar patterns     | Must-have   |
| R7  | Shape vectors are precomputed per charset, not per frame           | Must-have   |
| R8  | Works with all existing charsets (standard, detailed, extended, etc.) | Must-have   |
| R9  | No WebGPU dependency — CPU fallback is the primary path            | Must-have   |
| R10 | Existing brightness-only output is not broken or regressed         | Must-have   |


---


## Shapes

### Shape A: "6D Vector Matching In-Place"

Upgrade the existing Image to ASCII tab with a mode toggle.  Add the 6D
sampling vector approach from the article directly into `image-to-ascii.js`.
Add new tools as separate tabs.

| Part | Mechanism                                                                | Flag |
|------|--------------------------------------------------------------------------|:----:|
| A1   | **6D shape vector engine** — precompute shape vectors for every character in each charset by rendering glyphs to a hidden canvas, overlaying 6 sampling circles (2 rows x 3 cols), and measuring coverage per circle. Store as `Float32Array[6]` per character. | |
| A2   | **Runtime sampling** — for each grid cell in the source image, collect 6 average-luminance values from the same circle layout. Normalize to `[0,1]` range. | |
| A3   | **Global contrast enhancement** — raise each normalized component to a user-controlled exponent (range 1.0–4.0, default 2.0). Slider in the options panel. | |
| A4   | **Directional contrast enhancement** — add 6 external sampling circles that "reach" into neighboring cells. Use the max external value to boost internal components that border bright regions. Toggle on/off in UI. | |
| A5   | **Cached k-d tree lookup** — build a k-d tree from the character shape vectors. At runtime, find nearest character via k-d tree search in 6D space. Add a quantized bit-packed cache (5 bits per component, 30-bit key) for repeat lookups. | |
| A6   | **Mode toggle UI** — dropdown in the options panel: "Brightness" (current behavior) / "Shape-Aware" (new). Shape-aware shows the contrast sliders; brightness hides them. | |
| A7   | **ASCII Art Editor tab** — new sidebar tab "ASCII Editor". A grid-based canvas where users can type/draw ASCII characters, paint with a character brush, fill regions, and export. Fixed-width grid with cursor navigation. | |
| A8   | **Video to ASCII tab** — new sidebar tab "Video to ASCII". Accepts video file upload or webcam stream. Renders frames to ASCII in real-time using the same shape-aware engine. Frame rate and resolution controls. | (!) |

**Flag notes:**
- A8 is flagged because real-time video → ASCII at interactive frame rates
  requires careful performance work.  The shape-aware engine needs to process
  a full frame in <33ms for 30fps.  At 80×40 output (3,200 cells), this is
  feasible with the cache, but webcam integration and frame scheduling need
  investigation.


### Shape B: "Canvas-Rendered SDF Matching"

Instead of sampling circles, render each character glyph to canvas and
generate a mini signed distance field (SDF).  Match image cells using SDF
distance comparison.  More accurate than circles but more expensive.

| Part | Mechanism                                                                | Flag |
|------|--------------------------------------------------------------------------|:----:|
| B1   | **Per-character SDF generation** — render each glyph to a small canvas (e.g. 12×18 px), threshold to binary, compute Euclidean distance transform. Store as `Uint8Array` per character. | |
| B2   | **Image cell SDF** — for each grid cell, downsample to same resolution, threshold at luminance midpoint, compute distance transform. | (!) |
| B3   | **SDF matching** — compare cell SDF vs all character SDFs via sum of squared differences. Pick minimum distance character. | |
| B4   | **Same UI additions as A6–A8** | |

**Flag notes:**
- B2 is flagged because computing a distance transform per grid cell per
  frame is expensive (~microseconds per cell × 3,200 cells = potential
  bottleneck).  Would likely need WebGPU for real-time.


### Shape C: "Hybrid — Shape Vectors + Edge Detection"

Use 6D shape vectors for interior regions but add a dedicated Sobel edge
detection pass.  For cells on detected edges, prefer characters that match
the edge direction (`/`, `\`, `|`, `-`, etc.) instead of relying purely on
shape matching.

| Part | Mechanism                                                                | Flag |
|------|--------------------------------------------------------------------------|:----:|
| C1   | **Same as A1–A5** for shape vector engine                               | |
| C2   | **Sobel edge pass** — run Sobel operator on the source image at grid resolution. For each cell, compute gradient magnitude and direction. | |
| C3   | **Edge character table** — map 8 quantized directions (0°, 45°, 90°, …) to preferred characters: `—`, `|`, `/`, `\`, `╱`, `╲`, etc. When gradient magnitude exceeds a threshold, override shape match with edge character. | |
| C4   | **Edge sensitivity slider** — controls the magnitude threshold for switching from shape match to edge character. | |
| C5   | **Same UI additions as A6–A8** | |


---


## Fit Check

| Req | Requirement                                                        | Status      |  A  |  B  |  C  |
|-----|--------------------------------------------------------------------|-------------|-----|-----|-----|
| R0  | Shape-aware character matching that preserves edges and structure  | Core goal   | [x] | [x] | [x] |
| R1  | User can toggle between brightness-only and shape-aware modes      | Must-have   | [x] | [x] | [x] |
| R2  | Contrast enhancement controls (global exponent + directional)      | Must-have   | [x] | [ ] | [x] |
| R3  | Performance stays interactive (sub-200ms) at typical output sizes  | Must-have   | [x] | [ ] | [x] |
| R4  | New tool: live ASCII text editor / canvas for composing art        | Must-have   | [x] | [x] | [x] |
| R5  | New tool: video/webcam to ASCII (real-time stream)                 | Must-have   | [x] | [ ] | [x] |
| R6  | New tab structure is consistent with existing sidebar patterns     | Must-have   | [x] | [x] | [x] |
| R7  | Shape vectors are precomputed per charset, not per frame           | Must-have   | [x] | [x] | [x] |
| R8  | Works with all existing charsets                                   | Must-have   | [x] | [x] | [x] |
| R9  | No WebGPU dependency — CPU fallback is the primary path            | Must-have   | [x] | [ ] | [x] |
| R10 | Existing brightness-only output is not broken or regressed         | Must-have   | [x] | [x] | [x] |

**Notes:**
- **B fails R2** — SDF matching doesn't naturally support the contrast
  enhancement technique (which operates on the sampling vector).
- **B fails R3** — per-cell distance transforms are too expensive without GPU.
- **B fails R5** — same performance concern rules out real-time video.
- **B fails R9** — practical SDF matching at speed needs WebGPU.
- **A passes everything**.  The 6D circle approach is well-suited to CPU,
  the cache makes it fast, and contrast enhancement slots in naturally.
- **C passes everything** and adds explicit edge detection.  The trade-off
  is complexity: two matching systems (shape + edge override) with a
  blending threshold.

**Recommendation: Shape A.**

Shape A is the cleanest approach — one matching system, well-understood from
the article, and the sampling circle layout already captures edges implicitly
through the 6D shape vector.  Shape C's Sobel overlay adds a second system
that must be tuned (threshold, blending) and may produce jarring transitions
between edge characters and shape-matched characters.  If edge quality turns
out insufficient with A alone, the Sobel pass (C2–C4) can be added later as
a refinement without redesigning the core.


---


## Slices

Shape A selected.  Each slice ends in a demo-able state.


---


### Slice 1: Shape Vector Engine + Mode Toggle

**Demo:** User uploads image, picks "Shape-Aware" from a new dropdown,
sees visibly sharper edges and diagonals compared to "Brightness" mode.

**New file: `src/shape-vectors.js`**

Standalone module (IIFE, exports to `window.ShapeVectors`).  Responsible
for all shape-aware logic — keeps `image-to-ascii.js` clean.

| Affordance | Mechanism |
|------------|-----------|
| `precompute(charset)` | Render each character in `charset` to a hidden 20x30 canvas using the browser's monospace font. Overlay the 6 sampling circles (2 rows x 3 cols, staggered). Measure pixel coverage per circle. Return `Map<char, Float32Array[6]>`. |
| `sampleCell(imageData, x, y, cellW, cellH)` | For one grid cell, sample the same 6 circle regions from the source pixel data. Average luminance within each circle. Return `Float32Array[6]` normalized to `[0,1]`. |
| `findNearest(vector, charVectors)` | Brute-force Euclidean distance across all characters. Return best-match char. (k-d tree comes in Slice 3.) |

**Changes to `src/image-to-ascii.js`**

- Add `mode` option to `processImage()`: `'brightness'` (default, existing
  behavior) or `'shape'`.
- When `mode === 'shape'`:
  - Call `ShapeVectors.precompute(charsetStr)` once (memoized by charset).
  - Scale source image to a higher-res canvas (cellW x cols, cellH x rows)
    so each cell has enough pixels to sample circles from.
  - For each cell, call `sampleCell()` then `findNearest()`.
  - Character + color output uses the same ANSI/HTML assembly as today.

**Changes to `index.html`**

- Add "Matching Mode" dropdown to the ASCII options panel (after Character
  Set row):
  ```
  <select id="ascii-opt-mode">
    <option value="brightness">Brightness</option>
    <option value="shape">Shape-Aware</option>
  </select>
  ```

**Changes to `src/app.js`**

- Wire `ascii-opt-mode` change event to `reprocessAsciiImage()`.
- Pass `mode: asciiOptMode.value` to `processImage()`.

**R coverage:** R0, R1, R7, R8, R10.


---


### Slice 2: Contrast Enhancement

**Demo:** With shape-aware mode active, user drags a "Contrast" slider and
sees edges sharpen in real time.  A "Directional" toggle further boosts
boundary definition.

**Changes to `src/shape-vectors.js`**

| Affordance | Mechanism |
|------------|-----------|
| `applyGlobalContrast(vector, exponent)` | Normalize vector to max component = 1, raise each component to `exponent`, denormalize. In-place on the Float32Array. |
| `sampleExternalCircles(imageData, x, y, cellW, cellH, cols, rows)` | Sample 6 external circles that extend into neighboring cells. Return `Float32Array[6]`. |
| `applyDirectionalContrast(internal, external, affectingMap)` | For each internal component, find max of the affecting external values. Blend into the internal vector to boost edge transitions. |

The `affectingMap` is a constant — which external circles affect which
internal components (the article's `AFFECTING_EXTERNAL_INDICES` array).

**Changes to `index.html`**

- Below the mode dropdown, add (visible only when mode is "shape"):
  ```
  Contrast Exponent: <input type="range" min="10" max="40" value="20">
  (displays as 1.0–4.0)
  Directional Contrast: <toggle>
  ```

**Changes to `src/app.js`**

- Show/hide contrast controls based on mode value.
- Pass `contrastExponent` and `directionalContrast` to `processImage()`.

**R coverage:** R2.


---


### Slice 3: Cached k-d Tree Lookup

**Demo:** No visible UI change.  At 300x150 output, processing time drops
from ~500ms to ~50ms (visible in the processing indicator duration).

**Changes to `src/shape-vectors.js`**

| Affordance | Mechanism |
|------------|-----------|
| `KdTree` class | Build a k-d tree from character shape vectors (6 dimensions). `nearest(vector)` returns best-match char. Standard median-split construction. |
| `QuantizedCache` class | Quantize each vector component to 5 bits (0–31). Pack 6 components into a single 30-bit integer via bit-shifting. Use a `Map<number, string>` as the cache. `get(vector)` returns cached char or `undefined`. `set(vector, char)` stores it. |
| Updated `findNearest()` | Check cache first → k-d tree second → store result in cache. |

Cache and k-d tree are rebuilt when `precompute()` is called with a new
charset.

**R coverage:** R3.


---


### Slice 4: ASCII Art Editor Tab

**Demo:** New "ASCII Editor" tab in sidebar.  User sees an 80x24 grid,
can click to place characters, type freely, paint with a brush, and
export to clipboard.

**New file: `src/ascii-editor.js`**

IIFE module, exports to `window.AsciiEditor`.

| Affordance | Mechanism |
|------------|-----------|
| Grid model | 2D array of `{ char, fgColor }` cells.  Default 80 cols x 24 rows. Resizable. |
| Canvas renderer | Renders the grid to a `<canvas>` element using `ctx.fillText()` with a monospace font.  Each cell is `cellW x cellH` pixels.  Cursor position highlighted. |
| Keyboard input | Arrow keys move cursor.  Typing inserts character at cursor and advances.  Backspace/Delete.  Home/End.  Enter moves to next row. |
| Character brush | Select a character, click-drag to paint.  Brush size 1x1.  Hold Shift for straight lines. |
| Fill tool | Flood-fill from clicked cell with selected character. |
| Color painting | Optional foreground color per cell (from ANSI 256 palette or 24-bit picker). |
| Resize | Controls for grid width and height.  Preserves existing content when growing. |
| Export | Copy as plain text.  Copy as ANSI escape codes (with colors).  Copy as printf. |
| Clear | Reset grid to spaces. |
| Undo/redo | Stack-based, stores cell diffs (not full grid snapshots). |

**Changes to `index.html`**

- New nav-item: `data-tab="editor"`, icon `▥`, label "ASCII Editor".
- New `<div class="tab-content" id="tab-editor">` with:
  - Tool bar (brush, type, fill, line, eraser) + character picker
  - Color picker (small ANSI palette strip)
  - Canvas element for the grid
  - Bottom bar: grid size controls, export buttons
- Placed after Image to ASCII in the sidebar order.

**Changes to `src/app.js`**

- Initialize `AsciiEditor` when the editor tab is first activated (lazy).
- Wire export buttons to `AsciiEditor.export()`.

**R coverage:** R4, R6.


---


### Slice 5: Video to ASCII Tab

**Demo:** New "Video to ASCII" tab.  User uploads a video or enables
webcam.  ASCII art plays in real-time in the terminal preview.

**New file: `src/video-to-ascii.js`**

IIFE module, exports to `window.VideoToAscii`.

| Affordance | Mechanism |
|------------|-----------|
| Video source | `<video>` element fed by file upload (`URL.createObjectURL`) or `getUserMedia()` for webcam. |
| Frame loop | `requestAnimationFrame` loop.  Each tick: draw current video frame to an offscreen canvas, call `ImageToAscii.processImage()` (with shape-aware mode + cache), render HTML to the terminal div. |
| Frame rate control | Target FPS slider (5–30, default 15).  Skip frames to hit target.  Display actual FPS. |
| Resolution control | Max width/height inputs (same as Image to ASCII). |
| Play/pause | Toggle button.  Pause freezes on current frame. |
| Snapshot | Capture current ASCII frame to clipboard (ANSI or plain text). |
| Webcam toggle | Button to request camera.  Dropdown for camera selection if multiple available. |
| Performance | Uses the cached k-d tree from Slice 3.  At 80x40 / 15fps, that's 48K lookups/sec — well within cache throughput.  If frame time exceeds budget, auto-reduce resolution and show a warning. |

**Changes to `index.html`**

- New nav-item: `data-tab="video"`, icon `▶`, label "Video to ASCII".
- New `<div class="tab-content" id="tab-video">` with:
  - Upload area (accepts video/* files) + webcam button
  - Options: resolution, FPS, mode (brightness/shape), charset, color mode,
    contrast controls (reuse same option pattern as Image to ASCII)
  - Terminal preview (same `.ansi-terminal` pattern)
  - Controls bar: play/pause, snapshot, FPS display
- Placed after ASCII Editor in the sidebar.

**Changes to `src/app.js`**

- Initialize `VideoToAscii` lazily on first tab activation.
- Clean up `requestAnimationFrame` loop when navigating away from tab.
- Wire all option controls.

**R coverage:** R5, R6.

**Open unknown (from A8 flag):** Webcam + shape-aware at high resolution
may need the frame-skip / auto-reduce mechanism.  Build with the
auto-reduce safety valve from the start, test on real hardware.
