/**
 * Shape-Aware ASCII Character Matching
 *
 * Implements 6D shape vector matching based on Alex Harri's approach.
 * Each character and image cell is described by 6 values — average
 * luminance within 6 sampling circles arranged in a 3-row x 2-col
 * staggered grid.  Characters are matched by Euclidean distance in
 * this 6D space.
 */

// ================================================================
// Sampling circle layout
// ================================================================

const CIRCLE_RADIUS = 0.22;

export const INTERNAL_CIRCLES = [
  { x: 0.3, y: 0.2 }, // 0: top-left
  { x: 0.7, y: 0.13 }, // 1: top-right
  { x: 0.3, y: 0.53 }, // 2: mid-left
  { x: 0.7, y: 0.47 }, // 3: mid-right
  { x: 0.3, y: 0.87 }, // 4: bot-left
  { x: 0.7, y: 0.8 }, // 5: bot-right
];

export const EXT_CIRCLES = [
  { x: -0.15, y: -0.1 }, // 0: top-left outside
  { x: 1.15, y: -0.1 }, // 1: top-right outside
  { x: -0.15, y: 0.33 }, // 2: left-upper outside
  { x: 1.15, y: 0.33 }, // 3: right-upper outside
  { x: -0.15, y: 0.6 }, // 4: left-mid outside
  { x: 1.15, y: 0.6 }, // 5: right-mid outside
  { x: -0.15, y: 0.87 }, // 6: left-lower outside
  { x: 1.15, y: 0.87 }, // 7: right-lower outside
  { x: -0.15, y: 1.1 }, // 8: bot-left outside
  { x: 1.15, y: 1.1 }, // 9: bot-right outside
];

// Which external circles affect each internal circle's contrast.
export const AFFECTING_EXTERNALS = [
  [0, 1, 2, 4], // internal 0 (top-left)
  [0, 1, 3, 5], // internal 1 (top-right)
  [2, 4, 6], // internal 2 (mid-left)
  [3, 5, 7], // internal 3 (mid-right)
  [4, 6, 8, 9], // internal 4 (bot-left)
  [5, 7, 8, 9], // internal 5 (bot-right)
];

// ================================================================
// Precompute character shape vectors
// ================================================================

// Cache: charset string → { vectors: Map<char, Float32Array>, maxComponents: Float32Array }
const _precomputeCache = new Map();

/**
 * Precompute 6D shape vectors for every character in a charset.
 *
 * Renders each glyph to a hidden canvas and measures how much of
 * each sampling circle the glyph covers.
 *
 * @param {string} charset - the character set string
 * @returns {{ vectors: Map<string, Float32Array>, chars: string[], rawVectors: Float32Array[] }}
 */
export function precompute(charset) {
  if (_precomputeCache.has(charset)) {
    return _precomputeCache.get(charset);
  }

  const cellW = 20;
  const cellH = 30;
  const canvas = document.createElement("canvas");
  canvas.width = cellW;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const fontSize = Math.floor(cellH * 0.85);
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const vectors = new Map();
  const chars = [];
  const rawVectors = [];

  const globalMax = new Float32Array(6);

  for (let i = 0; i < charset.length; i++) {
    const char = charset[i];
    if (vectors.has(char)) continue;

    ctx.clearRect(0, 0, cellW, cellH);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cellW, cellH);
    ctx.fillStyle = "#000";
    ctx.fillText(char, cellW / 2, cellH / 2);

    const imageData = ctx.getImageData(0, 0, cellW, cellH);
    const vec = sampleCirclesFromImageData(
      imageData,
      0,
      0,
      cellW,
      cellH,
      cellW,
    );

    for (let j = 0; j < 6; j++) {
      vec[j] = 1.0 - vec[j];
    }

    vectors.set(char, vec);
    chars.push(char);
    rawVectors.push(vec);

    for (let j = 0; j < 6; j++) {
      if (vec[j] > globalMax[j]) globalMax[j] = vec[j];
    }
  }

  for (const vec of rawVectors) {
    for (let j = 0; j < 6; j++) {
      if (globalMax[j] > 0) {
        vec[j] /= globalMax[j];
      }
    }
  }

  const result = { vectors, chars, rawVectors };
  _precomputeCache.set(charset, result);
  return result;
}

// ================================================================
// Runtime image sampling
// ================================================================

function sampleCirclesFromImageData(
  imageData,
  cellX,
  cellY,
  cellW,
  cellH,
  stride,
) {
  const pixels = imageData.data;
  const vec = new Float32Array(6);
  const counts = new Float32Array(6);
  const rSqNorm = 1.0;

  for (let py = 0; py < cellH; py++) {
    for (let px = 0; px < cellW; px++) {
      const imgX = cellX + px;
      const imgY = cellY + py;

      if (imgX < 0 || imgX >= stride || imgY < 0 || imgY >= imageData.height)
        continue;

      const idx = (imgY * stride + imgX) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

      const nx = (px + 0.5) / cellW;
      const ny = (py + 0.5) / cellH;

      for (let c = 0; c < 6; c++) {
        const dx = (nx - INTERNAL_CIRCLES[c].x) / CIRCLE_RADIUS;
        const dy = (ny - INTERNAL_CIRCLES[c].y) / CIRCLE_RADIUS;
        if (dx * dx + dy * dy <= rSqNorm) {
          vec[c] += lum;
          counts[c]++;
        }
      }
    }
  }

  for (let c = 0; c < 6; c++) {
    if (counts[c] > 0) {
      vec[c] /= counts[c];
    }
  }

  return vec;
}

/**
 * Sample the 6 internal circles for a single cell in the source image.
 */
export function sampleCell(imageData, col, row, cellW, cellH) {
  return sampleCirclesFromImageData(
    imageData,
    Math.round(col * cellW),
    Math.round(row * cellH),
    Math.round(cellW),
    Math.round(cellH),
    imageData.width,
  );
}

/**
 * Sample the 10 external circles for a single cell.
 * External circles extend into neighboring cells.
 */
export function sampleExternalCircles(imageData, col, row, cellW, cellH) {
  const pixels = imageData.data;
  const stride = imageData.width;
  const extVec = new Float32Array(10);
  const extCounts = new Float32Array(10);

  const cellPxX = Math.round(col * cellW);
  const cellPxY = Math.round(row * cellH);
  const cw = Math.round(cellW);
  const ch = Math.round(cellH);

  const margin = Math.ceil(Math.max(cellW, cellH) * 0.3);
  const startX = cellPxX - margin;
  const startY = cellPxY - margin;
  const endX = cellPxX + cw + margin;
  const endY = cellPxY + ch + margin;

  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) {
      if (px < 0 || px >= stride || py < 0 || py >= imageData.height) continue;

      const idx = (py * stride + px) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

      const nx = (px - cellPxX + 0.5) / cw;
      const ny = (py - cellPxY + 0.5) / ch;

      for (let c = 0; c < 10; c++) {
        const dx = (nx - EXT_CIRCLES[c].x) / CIRCLE_RADIUS;
        const dy = (ny - EXT_CIRCLES[c].y) / CIRCLE_RADIUS;
        if (dx * dx + dy * dy <= 1.0) {
          extVec[c] += lum;
          extCounts[c]++;
        }
      }
    }
  }

  for (let c = 0; c < 10; c++) {
    if (extCounts[c] > 0) {
      extVec[c] /= extCounts[c];
    }
  }

  return extVec;
}

// ================================================================
// Contrast enhancement
// ================================================================

/**
 * Apply global contrast enhancement by raising normalized components
 * to an exponent.
 */
export function applyGlobalContrast(vec, exponent) {
  if (exponent === 1.0) return;

  let maxVal = 0;
  for (let i = 0; i < 6; i++) {
    if (vec[i] > maxVal) maxVal = vec[i];
  }
  if (maxVal === 0) return;

  for (let i = 0; i < 6; i++) {
    let v = vec[i] / maxVal;
    v = Math.pow(v, exponent);
    vec[i] = v * maxVal;
  }
}

/**
 * Apply directional contrast enhancement using external circle samples.
 */
export function applyDirectionalContrast(internal, external) {
  for (let i = 0; i < 6; i++) {
    const affecting = AFFECTING_EXTERNALS[i];
    let maxExt = 0;
    for (let j = 0; j < affecting.length; j++) {
      if (external[affecting[j]] > maxExt) {
        maxExt = external[affecting[j]];
      }
    }
    internal[i] = Math.max(internal[i], internal[i] * 0.6 + maxExt * 0.4);
  }
}

// ================================================================
// k-d Tree for fast nearest-neighbor in 6D
// ================================================================

const KD_DIMS = 6;

function kdBuild(points, depth) {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return {
      char: points[0].char,
      vec: points[0].vec,
      left: null,
      right: null,
      axis: depth % KD_DIMS,
    };
  }

  const axis = depth % KD_DIMS;
  points.sort((a, b) => a.vec[axis] - b.vec[axis]);
  const mid = points.length >> 1;

  return {
    char: points[mid].char,
    vec: points[mid].vec,
    axis: axis,
    left: kdBuild(points.slice(0, mid), depth + 1),
    right: kdBuild(points.slice(mid + 1), depth + 1),
  };
}

function kdNearest(root, target) {
  let bestChar = root.char;
  let bestDist = Infinity;

  const stack = [{ node: root, phase: 0 }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const node = frame.node;

    if (node === null) {
      stack.pop();
      continue;
    }

    if (frame.phase === 0) {
      let dist = 0;
      for (let i = 0; i < KD_DIMS; i++) {
        const d = target[i] - node.vec[i];
        dist += d * d;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestChar = node.char;
      }

      const axis = node.axis;
      const diff = target[axis] - node.vec[axis];
      const nearSide = diff < 0 ? node.left : node.right;
      const farSide = diff < 0 ? node.right : node.left;

      frame.phase = 1;
      frame.farSide = farSide;
      frame.splitDist = diff * diff;

      stack.push({ node: nearSide, phase: 0 });
    } else if (frame.phase === 1) {
      frame.phase = 2;
      if (frame.splitDist < bestDist) {
        stack.push({ node: frame.farSide, phase: 0 });
      }
    } else {
      stack.pop();
    }
  }

  return bestChar;
}

// ================================================================
// Quantized cache (5 bits per component, 30-bit key)
// ================================================================

const QUANT_BITS = 5;
const QUANT_LEVELS = 1 << QUANT_BITS; // 32

function quantizeKey(vec) {
  let key = 0;
  for (let i = 0; i < 6; i++) {
    const q = Math.min(
      QUANT_LEVELS - 1,
      Math.max(0, Math.round(vec[i] * (QUANT_LEVELS - 1))),
    );
    key = (key << QUANT_BITS) | q;
  }
  return key;
}

// ================================================================
// Character matching (k-d tree + cache)
// ================================================================

const _matcherCache = new Map();

function getMatcher(charVectors, chars) {
  const key = chars.join("");
  if (_matcherCache.has(key)) return _matcherCache.get(key);

  const points = chars.map((c) => ({ char: c, vec: charVectors.get(c) }));
  const kdRoot = kdBuild(points, 0);
  const cache = new Map();
  const matcher = { kdRoot, cache, charVectors, chars };
  _matcherCache.set(key, matcher);
  return matcher;
}

/**
 * Find the nearest character by Euclidean distance in 6D space.
 */
export function findNearest(vector, charVectors, chars) {
  const matcher = getMatcher(charVectors, chars);
  const key = quantizeKey(vector);

  const cached = matcher.cache.get(key);
  if (cached !== undefined) return cached;

  const result = kdNearest(matcher.kdRoot, vector);

  matcher.cache.set(key, result);
  return result;
}
