/**
 * Shape-Aware ASCII Character Matching
 *
 * Implements 6D shape vector matching based on Alex Harri's approach.
 * Each character and image cell is described by 6 values — average
 * luminance within 6 sampling circles arranged in a 3-row x 2-col
 * staggered grid.  Characters are matched by Euclidean distance in
 * this 6D space.
 *
 * Requires: (none — standalone module)
 */

(function(root) {
    'use strict';

    // ================================================================
    // Sampling circle layout
    // ================================================================
    //
    // 6 circles in a 2-col x 3-row staggered layout inside a unit cell
    // (0,0)–(1,1).  Left column is shifted down slightly, right column
    // shifted up, to reduce vertical gaps.
    //
    //   Col 0 (x=0.30)    Col 1 (x=0.70)
    //   Row 0: y=0.20      Row 0: y=0.13
    //   Row 1: y=0.53      Row 1: y=0.47
    //   Row 2: y=0.87      Row 2: y=0.80
    //
    // Radius: 0.22 of cell width (circles slightly overlap to avoid gaps)

    const CIRCLE_RADIUS = 0.22;

    const INTERNAL_CIRCLES = [
        { x: 0.30, y: 0.20 },  // 0: top-left
        { x: 0.70, y: 0.13 },  // 1: top-right
        { x: 0.30, y: 0.53 },  // 2: mid-left
        { x: 0.70, y: 0.47 },  // 3: mid-right
        { x: 0.30, y: 0.87 },  // 4: bot-left
        { x: 0.70, y: 0.80 },  // 5: bot-right
    ];

    // 10 external circles that "reach" into neighboring cells.
    // Positions are relative to the current cell (can be <0 or >1).
    const EXTERNAL_CIRCLES = [
        { x: 0.50, y: -0.15 },  // 0: above center
        { x: 0.50, y:  1.15 },  // 1: below center (not in article's 9, but useful symmetry — see note)
        // Actually let's follow the article's 10-circle layout more closely:
        // The article uses indices 0–9 for externals, with the affecting map:
        // [[0,1,2,4], [0,1,3,5], [2,4,6], [3,5,7], [4,6,8,9], [5,7,8,9]]
    ];

    // Rethinking: the article references 10 external circles (indices 0–9)
    // and a 6-element affecting map.  Let's place them systematically:
    //
    // External circles sit just outside the cell boundary, one per
    // "edge region" around the cell:
    //
    //   0: top-left     (-0.15, -0.10)   — affects internals 0,1
    //   1: top-right    ( 1.15, -0.10)   — affects internals 0,1
    //   2: left-upper   (-0.15,  0.33)   — affects internals 0,2
    //   3: right-upper  ( 1.15,  0.33)   — affects internals 1,3
    //   4: left-mid     (-0.15,  0.60)   — affects internals 2,4
    //   5: right-mid    ( 1.15,  0.60)   — affects internals 3,5
    //   6: left-lower   (-0.15,  0.87)   — affects internals 4
    //   7: right-lower  ( 1.15,  0.87)   — affects internals 5
    //   8: bot-left     (-0.15,  1.10)   — affects internals 4,5
    //   9: bot-right    ( 1.15,  1.10)   — affects internals 4,5

    const EXT_CIRCLES = [
        { x: -0.15, y: -0.10 },  // 0: top-left outside
        { x:  1.15, y: -0.10 },  // 1: top-right outside
        { x: -0.15, y:  0.33 },  // 2: left-upper outside
        { x:  1.15, y:  0.33 },  // 3: right-upper outside
        { x: -0.15, y:  0.60 },  // 4: left-mid outside
        { x:  1.15, y:  0.60 },  // 5: right-mid outside
        { x: -0.15, y:  0.87 },  // 6: left-lower outside
        { x:  1.15, y:  0.87 },  // 7: right-lower outside
        { x: -0.15, y:  1.10 },  // 8: bot-left outside
        { x:  1.15, y:  1.10 },  // 9: bot-right outside
    ];

    // Which external circles affect each internal circle's contrast.
    // From the article: [[0,1,2,4], [0,1,3,5], [2,4,6], [3,5,7], [4,6,8,9], [5,7,8,9]]
    const AFFECTING_EXTERNALS = [
        [0, 1, 2, 4],  // internal 0 (top-left)
        [0, 1, 3, 5],  // internal 1 (top-right)
        [2, 4, 6],      // internal 2 (mid-left)
        [3, 5, 7],      // internal 3 (mid-right)
        [4, 6, 8, 9],  // internal 4 (bot-left)
        [5, 7, 8, 9],  // internal 5 (bot-right)
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
    function precompute(charset) {
        if (_precomputeCache.has(charset)) {
            return _precomputeCache.get(charset);
        }

        // Canvas sized to give enough pixels per circle for accurate sampling.
        // 20px wide x 30px tall matches a typical monospace aspect ratio.
        const cellW = 20;
        const cellH = 30;
        const canvas = document.createElement('canvas');
        canvas.width = cellW;
        canvas.height = cellH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Use a standard monospace font at a size that fills the cell
        const fontSize = Math.floor(cellH * 0.85);
        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const vectors = new Map();
        const chars = [];
        const rawVectors = [];

        // Track global max for normalization
        const globalMax = new Float32Array(6);

        for (let i = 0; i < charset.length; i++) {
            const char = charset[i];
            if (vectors.has(char)) continue; // skip duplicates

            // Clear and render glyph
            ctx.clearRect(0, 0, cellW, cellH);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cellW, cellH);
            ctx.fillStyle = '#000';
            ctx.fillText(char, cellW / 2, cellH / 2);

            const imageData = ctx.getImageData(0, 0, cellW, cellH);
            const vec = sampleCirclesFromImageData(imageData, 0, 0, cellW, cellH, cellW);

            // For character vectors, we want ink coverage: invert since
            // we drew black-on-white (low luminance = ink)
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

        // Normalize all vectors by global max per component
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

    /**
     * Sample 6 circle regions from a rectangular cell in pixel data.
     *
     * @param {ImageData} imageData - full image pixel data
     * @param {number} cellX - cell top-left x in pixels
     * @param {number} cellY - cell top-left y in pixels
     * @param {number} cellW - cell width in pixels
     * @param {number} cellH - cell height in pixels
     * @param {number} stride - image width in pixels (for indexing)
     * @returns {Float32Array} - 6 luminance values in [0,1]
     */
    function sampleCirclesFromImageData(imageData, cellX, cellY, cellW, cellH, stride) {
        const pixels = imageData.data;
        const vec = new Float32Array(6);
        const counts = new Float32Array(6);
        const radiusX = CIRCLE_RADIUS * cellW;
        const radiusY = CIRCLE_RADIUS * cellH;
        const rSqNorm = 1.0; // we'll compare normalized distances

        // For each pixel in the cell, check which circles it falls in
        for (let py = 0; py < cellH; py++) {
            for (let px = 0; px < cellW; px++) {
                const imgX = cellX + px;
                const imgY = cellY + py;

                if (imgX < 0 || imgX >= stride || imgY < 0 || imgY >= imageData.height) continue;

                const idx = (imgY * stride + imgX) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

                // Normalized pixel position within cell [0,1]
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

        // Average
        for (let c = 0; c < 6; c++) {
            if (counts[c] > 0) {
                vec[c] /= counts[c];
            }
        }

        return vec;
    }

    /**
     * Sample the 6 internal circles for a single cell in the source image.
     *
     * @param {ImageData} imageData - source image at rendering resolution
     * @param {number} col - cell column index
     * @param {number} row - cell row index
     * @param {number} cellW - cell width in pixels
     * @param {number} cellH - cell height in pixels
     * @returns {Float32Array} - 6 normalized luminance values
     */
    function sampleCell(imageData, col, row, cellW, cellH) {
        return sampleCirclesFromImageData(
            imageData,
            Math.round(col * cellW),
            Math.round(row * cellH),
            Math.round(cellW),
            Math.round(cellH),
            imageData.width
        );
    }

    /**
     * Sample the 10 external circles for a single cell.
     * External circles extend into neighboring cells.
     *
     * @param {ImageData} imageData - source image at rendering resolution
     * @param {number} col - cell column index
     * @param {number} row - cell row index
     * @param {number} cellW - cell width in pixels
     * @param {number} cellH - cell height in pixels
     * @returns {Float32Array} - 10 luminance values
     */
    function sampleExternalCircles(imageData, col, row, cellW, cellH) {
        const pixels = imageData.data;
        const stride = imageData.width;
        const extVec = new Float32Array(10);
        const extCounts = new Float32Array(10);

        const cellPxX = Math.round(col * cellW);
        const cellPxY = Math.round(row * cellH);
        const cw = Math.round(cellW);
        const ch = Math.round(cellH);

        // Sample a region larger than the cell to capture external circles
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

                // Normalized position relative to cell
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
     *
     * @param {Float32Array} vec - 6D vector (modified in place)
     * @param {number} exponent - power to raise components to (1.0 = no change)
     */
    function applyGlobalContrast(vec, exponent) {
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
     *
     * For each internal component, finds the max luminance among its
     * affecting external circles and uses that to boost edge transitions.
     *
     * @param {Float32Array} internal - 6D internal vector (modified in place)
     * @param {Float32Array} external - 10D external vector
     */
    function applyDirectionalContrast(internal, external) {
        for (let i = 0; i < 6; i++) {
            const affecting = AFFECTING_EXTERNALS[i];
            let maxExt = 0;
            for (let j = 0; j < affecting.length; j++) {
                if (external[affecting[j]] > maxExt) {
                    maxExt = external[affecting[j]];
                }
            }
            // Boost the internal component toward the max external value
            // This sharpens transitions at cell boundaries
            internal[i] = Math.max(internal[i], internal[i] * 0.6 + maxExt * 0.4);
        }
    }

    // ================================================================
    // k-d Tree for fast nearest-neighbor in 6D
    // ================================================================

    const KD_DIMS = 6;

    /**
     * Build a k-d tree from an array of { char, vec } objects.
     * Returns the root node.
     */
    function kdBuild(points, depth) {
        if (points.length === 0) return null;
        if (points.length === 1) {
            return { char: points[0].char, vec: points[0].vec, left: null, right: null, axis: depth % KD_DIMS };
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

    /**
     * Find nearest neighbor in k-d tree (iterative-style with stack).
     */
    function kdNearest(root, target) {
        let bestChar = root.char;
        let bestDist = Infinity;

        // Stack-based traversal to avoid recursion limits
        const stack = [{ node: root, phase: 0 }];

        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            const node = frame.node;

            if (node === null) {
                stack.pop();
                continue;
            }

            if (frame.phase === 0) {
                // Check this node
                let dist = 0;
                for (let i = 0; i < KD_DIMS; i++) {
                    const d = target[i] - node.vec[i];
                    dist += d * d;
                }
                if (dist < bestDist) {
                    bestDist = dist;
                    bestChar = node.char;
                }

                // Decide which side to search first
                const axis = node.axis;
                const diff = target[axis] - node.vec[axis];
                const nearSide = diff < 0 ? node.left : node.right;
                const farSide = diff < 0 ? node.right : node.left;

                frame.phase = 1;
                frame.farSide = farSide;
                frame.splitDist = diff * diff;

                // Search near side first
                stack.push({ node: nearSide, phase: 0 });
            } else if (frame.phase === 1) {
                frame.phase = 2;
                // Check if far side could have closer point
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
    const QUANT_LEVELS = (1 << QUANT_BITS); // 32

    /**
     * Pack a 6D vector into a 30-bit integer key.
     * Each component is quantized to 5 bits (0–31).
     */
    function quantizeKey(vec) {
        let key = 0;
        for (let i = 0; i < 6; i++) {
            const q = Math.min(QUANT_LEVELS - 1, Math.max(0, Math.round(vec[i] * (QUANT_LEVELS - 1))));
            key = (key << QUANT_BITS) | q;
        }
        return key;
    }

    // ================================================================
    // Character matching (k-d tree + cache)
    // ================================================================

    // Per-charset matcher: { kdRoot, cache }
    const _matcherCache = new Map();

    /**
     * Get or create a matcher (k-d tree + lookup cache) for a charset.
     */
    function getMatcher(charVectors, chars) {
        // Use the chars array joined as the cache key
        const key = chars.join('');
        if (_matcherCache.has(key)) return _matcherCache.get(key);

        const points = chars.map(c => ({ char: c, vec: charVectors.get(c) }));
        const kdRoot = kdBuild(points, 0);
        const cache = new Map();
        const matcher = { kdRoot, cache, charVectors, chars };
        _matcherCache.set(key, matcher);
        return matcher;
    }

    /**
     * Find the nearest character by Euclidean distance in 6D space.
     * Uses quantized cache first, then k-d tree, then stores in cache.
     *
     * @param {Float32Array} vector - 6D query vector
     * @param {Map<string, Float32Array>} charVectors - precomputed character vectors
     * @param {string[]} chars - character list
     * @returns {string} - best matching character
     */
    function findNearest(vector, charVectors, chars) {
        const matcher = getMatcher(charVectors, chars);
        const key = quantizeKey(vector);

        // Cache hit
        const cached = matcher.cache.get(key);
        if (cached !== undefined) return cached;

        // k-d tree search
        const result = kdNearest(matcher.kdRoot, vector);

        // Store in cache
        matcher.cache.set(key, result);
        return result;
    }

    // ================================================================
    // Public API
    // ================================================================

    const API = Object.freeze({
        precompute,
        sampleCell,
        sampleExternalCircles,
        applyGlobalContrast,
        applyDirectionalContrast,
        findNearest,
        // Expose constants for testing
        INTERNAL_CIRCLES,
        EXT_CIRCLES,
        AFFECTING_EXTERNALS,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = API;
    } else {
        root.ShapeVectors = API;
    }

})(typeof window !== 'undefined' ? window : global);
