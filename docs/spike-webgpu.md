# Spike: WebGPU Compute for ASCII Rendering

**Context:** Shape A (6D Vector Matching) is the selected shape. The
primary implementation is CPU-only (R9). This document captures what we
know about adding an optional WebGPU fast path later, so the decision can
be made with eyes open.

**Acceptance:** After reading this document we can describe (a) which parts
of the pipeline benefit from GPU compute, (b) the concrete browser/device
coverage trade-offs, (c) the API surface area involved, and (d) a rough
architecture for a CPU/GPU dual path.

---

## 1. Which Pipeline Stages Benefit

The shape-aware ASCII renderer has these hot stages:

| Stage                                       | Per-frame work          | CPU cost                          | GPU fit                                                                                                    |
| ------------------------------------------- | ----------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Precompute shape vectors**                | Once per charset change | Negligible (95 chars x 6 circles) | Not worth it                                                                                               |
| **Build k-d tree**                          | Once per charset change | ~1ms                              | Not worth it                                                                                               |
| **Image sampling (6 circles per cell)**     | Every frame             | O(cells x samples_per_circle)     | Good — embarrassingly parallel                                                                             |
| **Directional contrast (external circles)** | Every frame             | O(cells x 6)                      | Good — same parallel structure                                                                             |
| **Global contrast (power function)**        | Every frame             | O(cells x 6)                      | Good but trivial per-element                                                                               |
| **k-d tree lookup / cache**                 | Every frame             | O(cells x log(95))                | Moderate — tree traversal is branch-heavy, poor GPU fit. But brute-force 95-char comparison is fine on GPU |
| **String assembly (HTML/ANSI)**             | Every frame             | O(cells)                          | Not possible on GPU                                                                                        |

**Summary:** The GPU wins on stages 3-5 (sampling, contrast, matching) but
only when cell counts are high enough to amortize the CPU-GPU data transfer.
At 80x40 (3,200 cells) the CPU path with the quantized cache will be fast
enough. The GPU becomes compelling at:

- **Video to ASCII at high resolution** — e.g. 160x80 at 30fps = 384,000
  cell operations per second.
- **Large still images** — e.g. 300x150 = 45,000 cells where the CPU
  cache might not cover the variety.
- **Real-time webcam** — where consistent sub-16ms frame times matter
  more than average throughput.

## 2. Browser Support (as of February 2026)

| Browser           | Status                                                                                                                                       | Platform coverage                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Chrome / Edge** | Shipped since Chrome 113 (2023). Stable on Windows (D3D12), macOS, ChromeOS, Android 12+ (Qualcomm/ARM). Linux Intel Gen12+ from Chrome 144. | ~85% of desktop, ~60% of Android |
| **Safari**        | Shipped in Safari 26 (June 2025). macOS Tahoe, iOS 26, iPadOS 26, visionOS 26.                                                               | Apple devices on latest OS only  |
| **Firefox**       | Shipped in Firefox 141 (July 2025). Windows + macOS Apple Silicon (Firefox 145). Linux and Android in progress.                              | ~70% of Firefox desktop users    |

**Global WebGPU availability estimate:** ~75-80% of desktop browsers,
~40-50% of mobile browsers. The long tail is older OS versions (pre-Tahoe
macOS, pre-Android 12) and Linux with older Intel/AMD GPUs.

**Implication:** WebGPU cannot be the only path. A CPU fallback is
mandatory. This aligns with R9.

## 3. Pros

### 3.1 Massive parallelism for sampling

Each grid cell's 6-circle sampling is independent. A compute shader with
`@workgroup_size(8, 8)` maps perfectly — one invocation per cell, all
circles sampled in parallel within that invocation. For a 160x80 grid,
that's 200 workgroups of 64 invocations each. On even a modest GPU this
completes in microseconds.

### 3.2 Texture sampling is free

GPUs have dedicated texture sampling hardware. Reading pixel values from
an image within circular regions is exactly what texture units are
designed for. The CPU path must manually index into `ImageData`; the GPU
path uses `textureSampleLevel()` with hardware bilinear interpolation.

### 3.3 Consistent frame times for video

CPU performance is variable — GC pauses, other tab work, thermal
throttling. GPU compute provides more predictable frame-to-frame timing,
which matters for smooth video-to-ASCII playback.

### 3.4 Sobel / edge detection nearly free

If we later add Shape C's edge detection pass (R0 refinement), a Sobel
convolution is a textbook GPU compute task. A single dispatch with a 3x3
kernel per cell. This would be expensive on CPU for large grids but
trivial on GPU.

### 3.5 Future-proofs for heavier algorithms

SDF matching (Shape B), multi-scale analysis, or ML-based character
selection could all run as compute shaders if the WebGPU path exists.

## 4. Cons

### 4.1 Significant API surface area

A minimal WebGPU compute pipeline requires:

- `navigator.gpu.requestAdapter()` + `requestDevice()`
- Creating bind group layouts, pipeline layouts, compute pipelines
- Allocating GPU buffers (`GPUBuffer`) and textures (`GPUTexture`)
- Writing WGSL shader code (a second language in the project)
- Encoding and submitting command buffers
- Reading results back to CPU (`mapAsync` on a staging buffer)

This is ~200-300 lines of boilerplate before any application logic. The
current project is vanilla JS with zero GPU code.

### 4.2 Async readback latency

`GPUBuffer.mapAsync()` is asynchronous. Reading results back to the CPU
adds at least one frame of latency. For the video path this means the
pipeline must be structured as:

```
Frame N:  upload image → dispatch compute
Frame N+1: read results → render to DOM
```

This 1-frame delay is invisible for video but adds complexity.

### 4.3 Two code paths to maintain

Every change to the sampling logic, contrast enhancement, or character
matching must be implemented in both JavaScript (CPU) and WGSL (GPU).
Bugs can diverge between paths. Test coverage must cover both.

### 4.4 WGSL limitations

- No recursion (k-d tree traversal must be iterative or replaced with
  brute-force).
- No dynamic memory allocation.
- Fixed workgroup sizes — must handle grids that aren't exact multiples.
- String output is impossible on GPU — the final HTML/ANSI assembly
  always happens on CPU.

### 4.5 Mobile GPU thermal throttling

Mobile GPUs throttle aggressively. Sustained compute (video playback)
may cause the GPU to clock down, negating the performance advantage. The
CPU path may actually be more consistent on phones.

### 4.6 Debugging is harder

WGSL has no `console.log`. Debugging compute shaders requires writing
values to a buffer and inspecting them on the CPU side. Chrome DevTools
has a GPU profiler but it's less mature than CPU profiling.

### 4.7 Build/bundle complexity

WGSL shaders need to be either:

- Inline as template strings (large, noisy)
- Loaded from `.wgsl` files (requires Vite raw import config)

Either way it's a new file type and concern for the build pipeline.

## 5. Recommended Architecture (if we proceed)

```
image-to-ascii.js          (existing, CPU path — always available)
  |
  +-- shape-vectors.js     (shared: precompute vectors, k-d tree, cache)
  |
  +-- ascii-gpu.js          (optional: WebGPU compute path)
       |
       +-- ascii-sample.wgsl     (sampling + contrast compute shader)
       +-- ascii-match.wgsl      (brute-force 95-char matching shader)
```

### Detection and fallback

```javascript
async function getAsciiRenderer() {
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) {
      const device = await adapter.requestDevice();
      return new GpuAsciiRenderer(device);
    }
  }
  return new CpuAsciiRenderer(); // always works
}
```

### Shared interface

Both renderers implement the same method:

```javascript
// Returns { characters: string[][], vectors: Float32Array[] }
renderer.process(imageData, width, height, options);
```

The caller (app.js) doesn't know or care which path is active. HTML/ANSI
string assembly always happens on CPU.

### GPU pipeline (2 dispatches per frame)

1. **Sample dispatch** — reads source texture, writes 6-component vector
   per cell to a storage buffer. Applies global + directional contrast
   in the same shader.
2. **Match dispatch** — reads vector buffer + precomputed character
   vectors (uniform buffer), writes character index per cell to an
   output buffer.

Total GPU work: 2 dispatches + 1 readback. For a 160x80 grid this is
~25,600 invocations — well under 1ms on any discrete GPU.

## 6. Effort Estimate

| Work item                                            | Size                      |
| ---------------------------------------------------- | ------------------------- |
| WebGPU boilerplate (adapter, device, pipeline setup) | Medium                    |
| WGSL sampling shader                                 | Medium                    |
| WGSL matching shader                                 | Small                     |
| Fallback detection + shared interface                | Small                     |
| Vite config for `.wgsl` imports                      | Trivial                   |
| Testing both paths produce identical output          | Medium                    |
| **Total**                                            | ~2-3 days of focused work |

## 7. Recommendation

**Don't build the GPU path in the initial implementation.**

The CPU path with the quantized 30-bit cache (Shape A, part A5) will be
fast enough for:

- Still images at any resolution (one-shot, no frame budget)
- Video at 80x40 / 30fps (3,200 cells x 30 = 96K lookups/sec — well
  within cache throughput)

**Revisit when:**

- Video to ASCII at 160x80+ drops below 30fps on target hardware
- Users request real-time webcam at high resolution
- We want to add Sobel edge detection (Shape C refinement) and the
  convolution becomes a bottleneck
- We want to add ML-based character selection or style transfer

**When we do build it**, the shared-interface architecture above means it
slots in without changing any calling code. The GPU path is additive, not
a rewrite.

## Sources

- [Can I Use: WebGPU](https://caniuse.com/webgpu)
- [WebGPU Hits Critical Mass: All Major Browsers Now Ship It](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/)
- [WebGPU Compute Shader Basics](https://webgpufundamentals.org/webgpu/lessons/webgpu-compute-shaders.html)
- [Convolution Filters — Learn WebGPU](https://eliemichel.github.io/LearnWebGPU/basic-compute/image-processing/convolution-filters.html)
- [Get Started with GPU Compute on the Web — Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/gpu-compute)
- [WebGPU — All of the Cores, None of the Canvas — surma.dev](https://surma.dev/things/webgpu/)
- [WebGPU Browser Support in 2026](https://webo360solutions.com/blog/webgpu-browser-support-2026/)
