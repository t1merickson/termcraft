#!/usr/bin/env node
'use strict';

/**
 * test-render.js — Headless visual test for Image-to-ANSI rendering
 *
 * Loads sample PNGs, runs them through the real image-to-ansi.js render
 * functions, then writes the ANSI cell output back to a PNG so it can
 * be compared pixel-for-pixel against expected reference images.
 *
 * Usage:  node scripts/test-render.js            (run tests)
 *         node scripts/test-render.js --update    (regenerate expected images)
 * Output: test-output/ directory with rendered PNGs
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Import real source modules (no more duplicated logic)
const ANSI256 = require('../src/ansi256.js');
const ImageToAnsi = require('../src/image-to-ansi.js');

const OUTPUT_DIR = path.join(__dirname, '..', 'test-output');
const EXPECTED_DIR = path.join(OUTPUT_DIR, 'expected');
const SAMPLES_DIR = path.join(__dirname, '..', 'samples');

const updateMode = process.argv.includes('--update');

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

// ─── Scale image (nearest-neighbor) ───────────────────────────────────

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

// ─── Render cells to PNG ─────────────────────────────────────────────

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
    const hw = w / 2;
    const hh = h / 2;

    switch (char) {
        case '█':
            if (fg) fillRect(png, x0, y0, w, h, fg);
            break;
        case '▀':
            if (fg) fillRect(png, x0, y0, w, hh, fg);
            if (bg) fillRect(png, x0, y0 + hh, w, hh, bg);
            break;
        case '▄':
            if (bg) fillRect(png, x0, y0, w, hh, bg);
            if (fg) fillRect(png, x0, y0 + hh, w, hh, fg);
            break;
        case '  ':
            if (bg) fillRect(png, x0, y0, w, h, bg);
            break;
        // Quadrant characters (fg only)
        case '▘': if (fg) fillRect(png, x0, y0, hw, hh, fg); break;
        case '▝': if (fg) fillRect(png, x0 + hw, y0, hw, hh, fg); break;
        case '▖': if (fg) fillRect(png, x0, y0 + hh, hw, hh, fg); break;
        case '▗': if (fg) fillRect(png, x0 + hw, y0 + hh, hw, hh, fg); break;
        case '▌': if (fg) fillRect(png, x0, y0, hw, h, fg); break;
        case '▐': if (fg) fillRect(png, x0 + hw, y0, hw, h, fg); break;
        case '▞': // top-right + bottom-left
            if (fg) { fillRect(png, x0 + hw, y0, hw, hh, fg); fillRect(png, x0, y0 + hh, hw, hh, fg); }
            break;
        case '▚': // top-left + bottom-right
            if (fg) { fillRect(png, x0, y0, hw, hh, fg); fillRect(png, x0 + hw, y0 + hh, hw, hh, fg); }
            break;
        case '▛': // all but bottom-right
            if (fg) { fillRect(png, x0, y0, w, hh, fg); fillRect(png, x0, y0 + hh, hw, hh, fg); }
            break;
        case '▜': // all but bottom-left
            if (fg) { fillRect(png, x0, y0, w, hh, fg); fillRect(png, x0 + hw, y0 + hh, hw, hh, fg); }
            break;
        case '▙': // all but top-right
            if (fg) { fillRect(png, x0, y0, hw, hh, fg); fillRect(png, x0, y0 + hh, w, hh, fg); }
            break;
        case '▟': // all but top-left
            if (fg) { fillRect(png, x0 + hw, y0, hw, hh, fg); fillRect(png, x0, y0 + hh, w, hh, fg); }
            break;
        // ' ' (space) = just background, already filled
    }
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

// ─── Pixel-for-pixel PNG comparison ──────────────────────────────────

function comparePngs(actual, expectedPath) {
    if (!fs.existsSync(expectedPath)) {
        return { match: false, reason: 'no expected file', diffCount: -1 };
    }
    const expData = fs.readFileSync(expectedPath);
    const expected = PNG.sync.read(expData);

    if (actual.width !== expected.width || actual.height !== expected.height) {
        return {
            match: false,
            reason: `size mismatch: ${actual.width}×${actual.height} vs ${expected.width}×${expected.height}`,
            diffCount: -1
        };
    }

    let diffCount = 0;
    const totalPixels = actual.width * actual.height;
    for (let i = 0; i < actual.data.length; i += 4) {
        if (actual.data[i]     !== expected.data[i] ||
            actual.data[i + 1] !== expected.data[i + 1] ||
            actual.data[i + 2] !== expected.data[i + 2]) {
            diffCount++;
        }
    }

    return {
        match: diffCount === 0,
        reason: diffCount > 0 ? `${diffCount}/${totalPixels} pixels differ` : 'ok',
        diffCount
    };
}

// ─── Main test runner ────────────────────────────────────────────────

const MODES = [
    'half-256',     'half-24bit',
    'halffg-256',   'halffg-24bit',
    'quad-256',     'quad-24bit',
    'block-256',    'block-24bit',
    'full-256',     'full-24bit',
    'binary',
];

const MAX_WIDTH = 80;
const MAX_HEIGHT = 60;

function renderForMode(pixels, w, h, mode) {
    const useTrue24bit = mode.includes('-24bit');

    if (mode.startsWith('halffg-')) {
        return ImageToAnsi.renderHalfBlocksFgOnly(pixels, w, h, useTrue24bit);
    } else if (mode.startsWith('half-')) {
        return ImageToAnsi.renderHalfBlocks(pixels, w, h, useTrue24bit);
    } else if (mode.startsWith('quad-')) {
        return ImageToAnsi.renderQuadrant(pixels, w, h, useTrue24bit);
    } else if (mode.startsWith('block-')) {
        return ImageToAnsi.renderBlockChars(pixels, w, h, useTrue24bit);
    } else if (mode === 'binary') {
        return ImageToAnsi.renderBinary(pixels, w, h);
    } else {
        return ImageToAnsi.renderFullBlocks(pixels, w, h, useTrue24bit);
    }
}

function run() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (updateMode && !fs.existsSync(EXPECTED_DIR)) fs.mkdirSync(EXPECTED_DIR, { recursive: true });

    const samples = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.png'));

    console.log(`\nTest Render — ${samples.length} samples × ${MODES.length} modes${updateMode ? ' (UPDATE MODE)' : ''}\n`);

    let passed = 0, failed = 0, newFiles = 0;

    for (const sample of samples) {
        const src = loadPng(path.join(SAMPLES_DIR, sample));
        const name = path.basename(sample, '.png');
        console.log(`  ${name} (${src.width}×${src.height})`);

        for (const mode of MODES) {
            const dims = ImageToAnsi.calcDimensions(src.width, src.height, MAX_WIDTH, MAX_HEIGHT, mode);
            const scaled = scaleImage(src, dims.width, dims.height);
            const pixels = scaled.data;
            const w = scaled.width;
            const h = scaled.height;

            const result = renderForMode(pixels, w, h, mode);
            const cells = result.cells;

            const outPng = cellsToPng(cells);
            if (!outPng) continue;

            const outFile = `${name}_${mode}.png`;
            savePng(outPng, path.join(OUTPUT_DIR, outFile));

            // Compare or update expected
            const expectedPath = path.join(EXPECTED_DIR, outFile);
            if (updateMode) {
                savePng(outPng, expectedPath);
            }

            const cmp = comparePngs(outPng, expectedPath);
            let status;
            if (cmp.match) {
                status = 'PASS';
                passed++;
            } else if (cmp.diffCount === -1 && cmp.reason === 'no expected file') {
                status = 'NEW';
                newFiles++;
            } else {
                status = 'FAIL';
                failed++;
            }

            const charW = cells[0].length;
            const charH = cells.length;
            const detail = status === 'PASS' ? '' : ` (${cmp.reason})`;
            console.log(`    ${mode.padEnd(14)} ${status.padEnd(4)} → pixel grid ${w}×${h} → ${charW}×${charH} chars → ${outPng.width}×${outPng.height}px${detail}`);
        }

        // Also save source scaled to match half-block output height for comparison
        const halfDims = ImageToAnsi.calcDimensions(src.width, src.height, MAX_WIDTH, MAX_HEIGHT, 'half-24bit');
        const halfRows = Math.floor(halfDims.height / 2);
        const refH = halfRows * CELL;
        copySourceScaled(src, path.join(OUTPUT_DIR, `${name}_source.png`), refH);
    }

    console.log(`\n  Output written to ${OUTPUT_DIR}/`);
    console.log(`  Results: ${passed} passed, ${failed} failed, ${newFiles} new\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

run();
