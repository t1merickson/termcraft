#!/usr/bin/env node
'use strict';

/**
 * test-render.js — Headless visual test for Image-to-ANSI rendering
 *
 * Loads sample PNGs, runs them through the same scaling + render logic
 * as image-to-ansi.js, then writes the ANSI output back to a PNG so
 * it can be compared visually (with vision or just eyeballing).
 *
 * Usage:  node scripts/test-render.js
 * Output: test-output/ directory with before/after PNGs
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUTPUT_DIR = path.join(__dirname, '..', 'test-output');
const SAMPLES_DIR = path.join(__dirname, '..', 'samples');

// ─── Minimal ANSI 256 palette (inlined from ansi256.js) ───────────────

const CUBE_VALUES = [0, 95, 135, 175, 215, 255];
const STANDARD_16 = [
    { r: 0,   g: 0,   b: 0   }, { r: 128, g: 0,   b: 0   },
    { r: 0,   g: 128, b: 0   }, { r: 128, g: 128, b: 0   },
    { r: 0,   g: 0,   b: 128 }, { r: 128, g: 0,   b: 128 },
    { r: 0,   g: 128, b: 128 }, { r: 192, g: 192, b: 192 },
    { r: 128, g: 128, b: 128 }, { r: 255, g: 0,   b: 0   },
    { r: 0,   g: 255, b: 0   }, { r: 255, g: 255, b: 0   },
    { r: 0,   g: 0,   b: 255 }, { r: 255, g: 0,   b: 255 },
    { r: 0,   g: 255, b: 255 }, { r: 255, g: 255, b: 255 },
];

const PALETTE = [];
for (let i = 0; i < 16; i++) PALETTE.push(STANDARD_16[i]);
for (let r = 0; r < 6; r++)
    for (let g = 0; g < 6; g++)
        for (let b = 0; b < 6; b++)
            PALETTE.push({ r: CUBE_VALUES[r], g: CUBE_VALUES[g], b: CUBE_VALUES[b] });
for (let i = 0; i < 24; i++) {
    const v = 8 + 10 * i;
    PALETTE.push({ r: v, g: v, b: v });
}

function rgbToAnsi256(r, g, b) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < 256; i++) {
        const c = PALETTE[i];
        const d = Math.abs(r - c.r) + Math.abs(g - c.g) + Math.abs(b - c.b);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
}

// ─── Image loading via pngjs ──────────────────────────────────────────

function loadPng(filePath) {
    const data = fs.readFileSync(filePath);
    const png = PNG.sync.read(data);
    return {
        width: png.width,
        height: png.height,
        data: png.data, // RGBA Uint8Array
    };
}

// ─── Scale image (nearest-neighbor for pixel art, bilinear otherwise) ─

function scaleImage(src, dstW, dstH) {
    const out = Buffer.alloc(dstW * dstH * 4);
    for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
            const srcX = Math.floor(x * src.width / dstW);
            const srcY = Math.floor(y * src.height / dstH);
            const si = (srcY * src.width + srcX) * 4;
            const di = (y * dstW + x) * 4;
            out[di]     = src.data[si];
            out[di + 1] = src.data[si + 1];
            out[di + 2] = src.data[si + 2];
            out[di + 3] = src.data[si + 3];
        }
    }
    return { width: dstW, height: dstH, data: out };
}

// ─── Scaling logic (mirrors image-to-ansi.js processImage) ───────────

function calcDimensions(imgW, imgH, maxWidth, maxHeight, renderMode) {
    const useHalfBlocks = renderMode.startsWith('half-');
    const useHalfFgOnly = renderMode.startsWith('halffg-');
    const useQuadrant   = renderMode.startsWith('quad-');
    const useBlockChars = renderMode.startsWith('block-');
    const isBinary      = renderMode === 'binary';
    const aspectRatio   = imgW / imgH;

    let width, height;

    if (useHalfBlocks || useHalfFgOnly || isBinary) {
        // charW = pixelW, charH = pixelH / 2
        const maxPixH = maxHeight * 2;
        if (aspectRatio > maxWidth / maxHeight) {
            width = maxWidth;
            height = Math.round(2 * maxWidth / aspectRatio);
        } else {
            height = maxPixH;
            width = Math.round(maxPixH * aspectRatio / 2);
        }
        height = Math.max(2, Math.floor(height / 2) * 2);
    } else if (useQuadrant) {
        // charW = pixelW/2, charH = pixelH/2 → pixel ratio = image ratio
        if (aspectRatio > maxWidth / maxHeight) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
        } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
        }
        width  = Math.max(2, Math.floor(width / 2) * 2);
        height = Math.max(2, Math.floor(height / 2) * 2);
    } else if (useBlockChars) {
        // charW = pixelW, charH = pixelH → pixel ratio = image ratio
        if (aspectRatio > maxWidth / maxHeight) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
        } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
        }
    } else {
        // Full spaces: charW = pixelW * 2, charH = pixelH
        const maxPixW = Math.floor(maxWidth / 2);
        if (aspectRatio > maxWidth / 2 / maxHeight) {
            width = maxPixW;
            height = Math.round(2 * maxPixW / aspectRatio);
        } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio / 2);
        }
    }

    return { width: Math.max(1, width), height: Math.max(1, height) };
}

// ─── Render modes (mirror image-to-ansi.js) ──────────────────────────

function px(pixels, w, x, y) {
    const i = (y * w + x) * 4;
    return { r: pixels[i], g: pixels[i+1], b: pixels[i+2], a: pixels[i+3] };
}

/**
 * Each render function returns an array of rows.
 * Each row is an array of cells: { char, fg, bg }
 *   fg/bg are {r,g,b} or null
 */

function renderHalfBlocks(pixels, w, h) {
    const rows = [];
    for (let y = 0; y < h; y += 2) {
        const row = [];
        for (let x = 0; x < w; x++) {
            const top = px(pixels, w, x, y);
            const bot = (y + 1 < h) ? px(pixels, w, x, y + 1) : { r:0, g:0, b:0, a:0 };
            const tT = top.a < 32, bT = bot.a < 32;
            if (tT && bT) {
                row.push({ char: ' ', fg: null, bg: null });
            } else if (tT) {
                row.push({ char: '▄', fg: bot, bg: null });
            } else if (bT) {
                row.push({ char: '▀', fg: top, bg: null });
            } else {
                row.push({ char: '▀', fg: top, bg: bot });
            }
        }
        rows.push(row);
    }
    return rows;
}

function renderBlockChars(pixels, w, h) {
    const rows = [];
    for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
            const p = px(pixels, w, x, y);
            if (p.a < 32) {
                row.push({ char: ' ', fg: null, bg: null });
            } else {
                row.push({ char: '█', fg: p, bg: null });
            }
        }
        rows.push(row);
    }
    return rows;
}

function renderBinary(pixels, w, h) {
    const rows = [];
    for (let y = 0; y < h; y += 2) {
        const row = [];
        for (let x = 0; x < w; x++) {
            const top = px(pixels, w, x, y);
            const bot = (y + 1 < h) ? px(pixels, w, x, y + 1) : { r:0, g:0, b:0, a:0 };
            const topLum = top.a >= 32 ? 0.299*top.r + 0.587*top.g + 0.114*top.b : 0;
            const botLum = bot.a >= 32 ? 0.299*bot.r + 0.587*bot.g + 0.114*bot.b : 0;
            const tF = topLum >= 128, bF = botLum >= 128;
            if (!tF && !bF) row.push({ char: ' ', fg: null, bg: null });
            else if (!tF && bF) row.push({ char: '▄', fg: { r:255,g:255,b:255 }, bg: null });
            else if (tF && !bF) row.push({ char: '▀', fg: { r:255,g:255,b:255 }, bg: null });
            else row.push({ char: '█', fg: { r:255,g:255,b:255 }, bg: null });
        }
        rows.push(row);
    }
    return rows;
}

function renderFullSpaces(pixels, w, h) {
    const rows = [];
    for (let y = 0; y < h; y++) {
        const row = [];
        for (let x = 0; x < w; x++) {
            const p = px(pixels, w, x, y);
            if (p.a < 32) {
                row.push({ char: '  ', fg: null, bg: null });
            } else {
                row.push({ char: '  ', fg: null, bg: p });
            }
        }
        rows.push(row);
    }
    return rows;
}

// ─── Render cells to PNG ─────────────────────────────────────────────

/**
 * Takes the cell grid and draws it into a PNG.
 * Each cell is CELL × CELL pixels (square, matching browser line-height:1).
 * For half-block chars (▀▄█), we draw the top/bottom halves within
 * the square cell to simulate the 2-row packing.
 */
const CELL = 8;      // pixels per character cell (square)
const BG_COLOR = { r: 0, g: 0, b: 0 };

function cellsToPng(rows) {
    if (rows.length === 0) return null;
    const cols = rows[0].length;
    const charsPerCell = rows[0][0].char.length; // 1 for most, 2 for full-spaces
    const cellW = CELL * charsPerCell;
    const cellH = CELL;
    const imgW = cols * cellW;
    const imgH = rows.length * cellH;
    const png = new PNG({ width: imgW, height: imgH });

    // Fill background
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i]     = BG_COLOR.r;
        png.data[i + 1] = BG_COLOR.g;
        png.data[i + 2] = BG_COLOR.b;
        png.data[i + 3] = 255;
    }

    for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < rows[row].length; col++) {
            const cell = rows[row][col];
            const x0 = col * cellW;
            const y0 = row * cellH;
            drawCell(png, x0, y0, cellW, cellH, cell);
        }
    }

    return png;
}

function drawCell(png, x0, y0, w, h, cell) {
    const { char, fg, bg } = cell;

    if (char === '█') {
        // Full block: fill entire cell with fg color
        if (fg) fillRect(png, x0, y0, w, h, fg);
    } else if (char === '▀') {
        // Upper half block: top half = fg, bottom half = bg
        if (fg) fillRect(png, x0, y0, w, h / 2, fg);
        if (bg) fillRect(png, x0, y0 + h / 2, w, h / 2, bg);
    } else if (char === '▄') {
        // Lower half block: top half = bg, bottom half = fg
        if (bg) fillRect(png, x0, y0, w, h / 2, bg);
        if (fg) fillRect(png, x0, y0 + h / 2, w, h / 2, fg);
    } else if (char === '  ') {
        // Full spaces: entire cell is bg
        if (bg) fillRect(png, x0, y0, w, h, bg);
    }
    // ' ' (space) = just background, already filled
}

function fillRect(png, x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h && y < png.height; y++) {
        for (let x = x0; x < x0 + w && x < png.width; x++) {
            const i = (y * png.width + x) * 4;
            png.data[i]     = color.r;
            png.data[i + 1] = color.g;
            png.data[i + 2] = color.b;
            png.data[i + 3] = 255;
        }
    }
}

function savePng(png, filePath) {
    const buf = PNG.sync.write(png);
    fs.writeFileSync(filePath, buf);
}

// ─── Copy source image to output for side-by-side comparison ─────────

function copySourceScaled(src, outPath, targetH) {
    // Scale source to same height as output for easy visual comparison
    const scale = targetH / src.height;
    const dstW = Math.round(src.width * scale);
    const dstH = targetH;
    const png = new PNG({ width: dstW, height: dstH });
    for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
            const srcX = Math.min(Math.floor(x / scale), src.width - 1);
            const srcY = Math.min(Math.floor(y / scale), src.height - 1);
            const si = (srcY * src.width + srcX) * 4;
            const di = (y * dstW + x) * 4;
            png.data[di]     = src.data[si];
            png.data[di + 1] = src.data[si + 1];
            png.data[di + 2] = src.data[si + 2];
            png.data[di + 3] = src.data[si + 3];
        }
    }
    savePng(png, outPath);
}

// ─── Main test runner ────────────────────────────────────────────────

const MODES = [
    'half-24bit',
    'block-24bit',
    'binary',
    'full-24bit',
];

const MAX_WIDTH = 80;
const MAX_HEIGHT = 60;

function run() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const samples = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.png'));

    console.log(`\nTest Render — ${samples.length} samples × ${MODES.length} modes\n`);

    for (const sample of samples) {
        const src = loadPng(path.join(SAMPLES_DIR, sample));
        const name = path.basename(sample, '.png');
        console.log(`  ${name} (${src.width}×${src.height})`);

        for (const mode of MODES) {
            const dims = calcDimensions(src.width, src.height, MAX_WIDTH, MAX_HEIGHT, mode);
            const scaled = scaleImage(src, dims.width, dims.height);
            const pixels = scaled.data;
            const w = scaled.width;
            const h = scaled.height;

            let cells;
            if (mode.startsWith('half-'))      cells = renderHalfBlocks(pixels, w, h);
            else if (mode.startsWith('block-')) cells = renderBlockChars(pixels, w, h);
            else if (mode === 'binary')         cells = renderBinary(pixels, w, h);
            else                                cells = renderFullSpaces(pixels, w, h);

            const outPng = cellsToPng(cells);
            if (!outPng) continue;

            const outFile = `${name}_${mode}.png`;
            savePng(outPng, path.join(OUTPUT_DIR, outFile));

            const charW = cells[0].length;
            const charH = cells.length;
            console.log(`    ${mode.padEnd(14)} → pixel grid ${w}×${h} → ${charW}×${charH} chars → ${outPng.width}×${outPng.height}px`);
        }

        // Also save source scaled to match half-block output height for comparison
        const halfDims = calcDimensions(src.width, src.height, MAX_WIDTH, MAX_HEIGHT, 'half-24bit');
        const halfRows = Math.floor(halfDims.height / 2);
        const refH = halfRows * CELL;
        copySourceScaled(src, path.join(OUTPUT_DIR, `${name}_source.png`), refH);
    }

    console.log(`\n  Output written to ${OUTPUT_DIR}/\n`);
}

run();
