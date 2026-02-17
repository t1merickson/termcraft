#!/usr/bin/env node
/*
 * Import a pixel font from a PNG sprite sheet.
 *
 * Example:
 * node scripts/import-png-sprite.js \
 *   --input assets/font-sources/my-font/sprite.png \
 *   --output app/fonts/my-font/font.json \
 *   --name "My Font" \
 *   --id my-font \
 *   --glyph-width 8 \
 *   --glyph-height 12 \
 *   --charset "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

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

function toNumber(value, name) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    console.error(`Invalid --${name}: ${value}`);
    process.exit(1);
  }
  return num;
}

const args = parseArgs(process.argv.slice(2));
const input = requireArg(args, 'input');
const output = requireArg(args, 'output');
const name = requireArg(args, 'name');
const id = requireArg(args, 'id');
const glyphWidth = toNumber(requireArg(args, 'glyph-width'), 'glyph-width');
const glyphHeight = toNumber(requireArg(args, 'glyph-height'), 'glyph-height');
const charset = requireArg(args, 'charset');
const spaceWidth = args['space-width'] ? Number(args['space-width']) : Math.floor(glyphWidth / 2);
const letterGap = args['letter-gap'] ? Number(args['letter-gap']) : 1;
const fallback = args['fallback'] || '?';
const threshold = args['threshold'] ? Number(args['threshold']) : 32;
const lumaThreshold = args['luma-threshold'] ? Number(args['luma-threshold']) : null;
const lumaInvert = args['luma-invert'] ? true : false;
const xGap = args['x-gap'] ? Number(args['x-gap']) : 0;
const yGap = args['y-gap'] ? Number(args['y-gap']) : 0;
const marginX = args['margin-x'] ? Number(args['margin-x']) : 0;
const marginY = args['margin-y'] ? Number(args['margin-y']) : 0;

if (!Number.isFinite(spaceWidth) || spaceWidth < 0) {
  console.error(`Invalid --space-width: ${args['space-width']}`);
  process.exit(1);
}
if (!Number.isFinite(letterGap) || letterGap < 0) {
  console.error(`Invalid --letter-gap: ${args['letter-gap']}`);
  process.exit(1);
}
if (!Number.isFinite(xGap) || xGap < 0) {
  console.error(`Invalid --x-gap: ${args['x-gap']}`);
  process.exit(1);
}
if (!Number.isFinite(yGap) || yGap < 0) {
  console.error(`Invalid --y-gap: ${args['y-gap']}`);
  process.exit(1);
}
if (!Number.isFinite(marginX) || marginX < 0) {
  console.error(`Invalid --margin-x: ${args['margin-x']}`);
  process.exit(1);
}
if (!Number.isFinite(marginY) || marginY < 0) {
  console.error(`Invalid --margin-y: ${args['margin-y']}`);
  process.exit(1);
}
if (lumaThreshold !== null && (!Number.isFinite(lumaThreshold) || lumaThreshold < 0 || lumaThreshold > 255)) {
  console.error(`Invalid --luma-threshold: ${args['luma-threshold']}`);
  process.exit(1);
}

const buffer = fs.readFileSync(input);
const png = PNG.sync.read(buffer);

const usableWidth = png.width - (marginX * 2);
const usableHeight = png.height - (marginY * 2);
const cols = Math.floor((usableWidth + xGap) / (glyphWidth + xGap));
const rows = Math.floor((usableHeight + yGap) / (glyphHeight + yGap));
const capacity = cols * rows;

if (charset.length > capacity) {
  console.error(`Sprite sheet only fits ${capacity} glyphs, but charset has ${charset.length}`);
  process.exit(1);
}

function getPixel(x, y) {
  const idx = (png.width * y + x) * 4;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3]
  };
}

const glyphs = {};

for (let i = 0; i < charset.length; i++) {
  const char = charset[i];
  const col = i % cols;
  const row = Math.floor(i / cols);

  const originX = marginX + col * (glyphWidth + xGap);
  const originY = marginY + row * (glyphHeight + yGap);

  const rowsOut = [];
  for (let y = 0; y < glyphHeight; y++) {
    let line = '';
    for (let x = 0; x < glyphWidth; x++) {
      const px = getPixel(originX + x, originY + y);
      let on = false;
      if (lumaThreshold !== null) {
        const luma = 0.299 * px.r + 0.587 * px.g + 0.114 * px.b;
        on = lumaInvert ? luma >= lumaThreshold : luma <= lumaThreshold;
      } else {
        on = px.a >= threshold;
      }
      line += on ? '1' : '0';
    }
    rowsOut.push(line);
  }

  glyphs[char] = rowsOut;
}

// ── Strip empty padding ──────────────────────────────────────────

function stripPadding(glyphs) {
  const chars = Object.keys(glyphs).filter(c => c !== ' ');
  if (chars.length === 0) return { glyphs, topStripped: 0, bottomStripped: 0, leftStripped: 0, rightStripped: 0 };
  const h = glyphs[chars[0]].length;

  let topStrip = 0;
  for (let r = 0; r < h; r++) {
    if (chars.every(ch => !glyphs[ch][r].includes('1'))) topStrip++;
    else break;
  }
  let bottomStrip = 0;
  for (let r = h - 1; r >= topStrip; r--) {
    if (chars.every(ch => !glyphs[ch][r].includes('1'))) bottomStrip++;
    else break;
  }
  let leftStrip = Infinity;
  for (const ch of chars) {
    const rows = glyphs[ch]; const w = rows[0].length; let cols = 0;
    for (let c = 0; c < w; c++) { if (rows.every(row => row[c] === '0')) cols++; else break; }
    if (cols < leftStrip) leftStrip = cols;
  }
  if (!Number.isFinite(leftStrip)) leftStrip = 0;
  let rightStrip = Infinity;
  for (const ch of chars) {
    const rows = glyphs[ch]; const w = rows[0].length; let cols = 0;
    for (let c = w - 1; c >= leftStrip; c--) { if (rows.every(row => row[c] === '0')) cols++; else break; }
    if (cols < rightStrip) rightStrip = cols;
  }
  if (!Number.isFinite(rightStrip)) rightStrip = 0;

  if (topStrip === 0 && bottomStrip === 0 && leftStrip === 0 && rightStrip === 0) {
    return { glyphs, topStripped: 0, bottomStripped: 0, leftStripped: 0, rightStripped: 0 };
  }
  const stripped = {};
  for (const [ch, rows] of Object.entries(glyphs)) {
    const trimmedRows = rows.slice(topStrip, h - bottomStrip);
    stripped[ch] = trimmedRows.map(row => row.slice(leftStrip, row.length - rightStrip));
  }
  return { glyphs: stripped, topStripped: topStrip, bottomStripped: bottomStrip, leftStripped: leftStrip, rightStripped: rightStrip };
}

const pad = stripPadding(glyphs);
const finalGlyphs = pad.glyphs;
const finalWidth = glyphWidth - pad.leftStripped - pad.rightStripped;
const finalHeight = glyphHeight - pad.topStripped - pad.bottomStripped;
const finalSpaceW = Math.max(1, spaceWidth - pad.leftStripped - pad.rightStripped);

if (pad.topStripped || pad.bottomStripped || pad.leftStripped || pad.rightStripped) {
  console.log(`Stripped padding: top=${pad.topStripped} bottom=${pad.bottomStripped} left=${pad.leftStripped} right=${pad.rightStripped}`);
  console.log(`Effective size: ${finalWidth}x${finalHeight} (was ${glyphWidth}x${glyphHeight})`);
}

const outputDir = path.dirname(output);
fs.mkdirSync(outputDir, { recursive: true });

const font = {
  meta: {
    id,
    name,
    glyphWidth: finalWidth,
    glyphHeight: finalHeight,
    spaceWidth: finalSpaceW,
    letterGap,
    fallback,
    charset,
    source: path.basename(input)
  },
  glyphs: finalGlyphs
};

fs.writeFileSync(output, JSON.stringify(font, null, 2) + '\n');
console.log(`Wrote ${output}`);
