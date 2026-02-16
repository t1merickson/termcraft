#!/usr/bin/env node
/*
 * Import a pixel font from an OTF/TTF file.
 *
 * Detects the native pixel grid by finding the GCD of all path
 * coordinate deltas, then samples each grid cell center to determine
 * on/off state. Outputs binary glyph rows ('1' = filled, '0' = empty).
 *
 * Supports proportional (variable-width) fonts: each glyph is stored
 * at its own natural advance width rather than being forced into a
 * fixed-width cell.
 *
 * Example:
 *   node scripts/import-otf.js \
 *     --input assets/geist-pixel/GeistPixel-Square.otf \
 *     --output fonts/geist-pixel/font.json \
 *     --name "Geist Pixel" \
 *     --id geist-pixel
 *
 * Options:
 *   --grid-size N   Override detected pixel grid size (font units per pixel)
 *   --fallback C    Fallback character (default: ?)
 *   --author S      Author name
 *   --source S      Source URL
 *   --license S     License name
 */

const fs = require('fs');
const nodePath = require('path');
const opentype = require('opentype.js');

// ── CLI args ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return args[name];
}

// ── Grid detection ────────────────────────────────────────────────

function detectGridSize(font) {
  const deltas = [];
  for (let i = 33; i <= 90; i++) {
    const glyph = font.charToGlyph(String.fromCharCode(i));
    if (!glyph || glyph.index === 0) continue;
    const p = glyph.getPath(0, 0, font.unitsPerEm);
    const xs = [];
    const ys = [];
    for (const cmd of p.commands) {
      if (cmd.x !== undefined) xs.push(Math.round(cmd.x));
      if (cmd.y !== undefined) ys.push(Math.round(cmd.y));
    }
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    for (let j = 1; j < xs.length; j++) {
      const d = xs[j] - xs[j - 1];
      if (d > 0) deltas.push(d);
    }
    for (let j = 1; j < ys.length; j++) {
      const d = ys[j] - ys[j - 1];
      if (d > 0) deltas.push(d);
    }
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  let g = deltas[0];
  for (let i = 1; i < deltas.length; i++) {
    g = gcd(g, deltas[i]);
    if (g === 1) break;
  }
  return g;
}

// ── Point-in-path (winding number) ───────────────────────────────

function windingLine(px, py, x0, y0, x1, y1) {
  if ((y0 <= py && y1 <= py) || (y0 > py && y1 > py)) return 0;
  const t = (py - y0) / (y1 - y0);
  const ix = x0 + t * (x1 - x0);
  return ix > px ? (y1 > y0 ? 1 : -1) : 0;
}

function windingCubic(px, py, x0, y0, x1, y1, x2, y2, x3, y3) {
  let w = 0;
  const steps = 16;
  let prevX = x0, prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const nx = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const ny = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    w += windingLine(px, py, prevX, prevY, nx, ny);
    prevX = nx; prevY = ny;
  }
  return w;
}

function windingQuadratic(px, py, x0, y0, x1, y1, x2, y2) {
  let w = 0;
  const steps = 16;
  let prevX = x0, prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const nx = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const ny = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    w += windingLine(px, py, prevX, prevY, nx, ny);
    prevX = nx; prevY = ny;
  }
  return w;
}

/**
 * Test whether point (x, y) is inside the path defined by cmds.
 * Properly handles Z (close) commands by testing the closing segment.
 */
function isPointInPath(cmds, x, y) {
  let winding = 0;
  let firstX, firstY; // M origin for Z closure
  let curX, curY;

  for (const cmd of cmds) {
    switch (cmd.type) {
      case 'M':
        firstX = cmd.x; firstY = cmd.y;
        curX = cmd.x; curY = cmd.y;
        break;
      case 'L':
        winding += windingLine(x, y, curX, curY, cmd.x, cmd.y);
        curX = cmd.x; curY = cmd.y;
        break;
      case 'C':
        winding += windingCubic(x, y, curX, curY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        curX = cmd.x; curY = cmd.y;
        break;
      case 'Q':
        winding += windingQuadratic(x, y, curX, curY, cmd.x1, cmd.y1, cmd.x, cmd.y);
        curX = cmd.x; curY = cmd.y;
        break;
      case 'Z':
        winding += windingLine(x, y, curX, curY, firstX, firstY);
        curX = firstX; curY = firstY;
        break;
    }
  }
  return winding !== 0;
}

// ── Main ──────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const input = requireArg(args, 'input');
const output = requireArg(args, 'output');
const name = requireArg(args, 'name');
const id = requireArg(args, 'id');
const fallback = args['fallback'] || '?';
const authorArg = args['author'] || '';
const sourceArg = args['source'] || '';
const licenseArg = args['license'] || '';

const font = opentype.loadSync(input);

const gridSize = args['grid-size'] ? Number(args['grid-size']) : detectGridSize(font);
console.log(`Detected grid size: ${gridSize} units/pixel`);

// Pixel dimensions
const ascentPx = Math.ceil(font.ascender / gridSize);
const descentPx = Math.ceil(-font.descender / gridSize);
const glyphHeight = ascentPx + descentPx;

// Printable ASCII charset
const charset = [];
for (let i = 32; i <= 126; i++) charset.push(String.fromCharCode(i));

// Find max advance width across all glyphs (for metadata)
let maxAdvPx = 0;
for (let i = 33; i <= 126; i++) {
  const g = font.charToGlyph(String.fromCharCode(i));
  const advPx = Math.round(g.advanceWidth / gridSize);
  if (advPx > maxAdvPx) maxAdvPx = advPx;
}

console.log(`Height: ${glyphHeight}px (ascent=${ascentPx}, descent=${descentPx})`);
console.log(`Max advance width: ${maxAdvPx}px`);

// Render each glyph at its natural advance width
const glyphs = {};

for (const char of charset) {
  const glyph = font.charToGlyph(char);

  if (!glyph || glyph.index === 0 || char === ' ') {
    // Empty/space glyph
    const w = Math.round((glyph ? glyph.advanceWidth : font.unitsPerEm / 4) / gridSize) || 4;
    const rows = [];
    for (let y = 0; y < glyphHeight; y++) {
      rows.push('0'.repeat(w));
    }
    glyphs[char] = rows;
    continue;
  }

  const advPx = Math.round(glyph.advanceWidth / gridSize);
  const path = glyph.getPath(0, ascentPx * gridSize, font.unitsPerEm);
  const cmds = path.commands;
  const rows = [];

  for (let py = 0; py < glyphHeight; py++) {
    let line = '';
    for (let px = 0; px < advPx; px++) {
      const fx = (px + 0.5) * gridSize;
      const fy = (py + 0.5) * gridSize;
      line += isPointInPath(cmds, fx, fy) ? '1' : '0';
    }
    rows.push(line);
  }

  glyphs[char] = rows;
}

// Preview
for (const ch of ['.', 'A', 'H', 'g', 'W', 'i', '0', '@']) {
  if (glyphs[ch]) {
    const w = glyphs[ch][0].length;
    console.log(`\n[${ch}] ${w}px wide:`);
    for (const row of glyphs[ch]) {
      const display = row.replace(/1/g, '█').replace(/0/g, ' ');
      console.log('|' + display + '|');
    }
  }
}

// Write output
const outputDir = nodePath.dirname(output);
fs.mkdirSync(outputDir, { recursive: true });

const fontJson = {
  meta: {
    id,
    name,
    glyphWidth: maxAdvPx,
    glyphHeight,
    spaceWidth: Math.round((font.charToGlyph(' ').advanceWidth || font.unitsPerEm / 4) / gridSize),
    letterGap: 0,
    fallback,
    author: authorArg,
    source: sourceArg,
    license: licenseArg,
    charset: charset.join('')
  },
  glyphs
};

fs.writeFileSync(output, JSON.stringify(fontJson, null, 2) + '\n');
console.log(`\nWrote ${output} (max ${maxAdvPx}x${glyphHeight})`);
