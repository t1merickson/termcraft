#!/usr/bin/env node
/*
 * Import a pixel font from a PNG sprite sheet.
 *
 * Example:
 * node scripts/import-png-sprite.js \
 *   --input assets/my-font.png \
 *   --output fonts/my-font/font.json \
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

if (!Number.isFinite(spaceWidth) || spaceWidth < 0) {
  console.error(`Invalid --space-width: ${args['space-width']}`);
  process.exit(1);
}
if (!Number.isFinite(letterGap) || letterGap < 0) {
  console.error(`Invalid --letter-gap: ${args['letter-gap']}`);
  process.exit(1);
}

const buffer = fs.readFileSync(input);
const png = PNG.sync.read(buffer);

const cols = Math.floor(png.width / glyphWidth);
const rows = Math.floor(png.height / glyphHeight);
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

  const originX = col * glyphWidth;
  const originY = row * glyphHeight;

  const rowsOut = [];
  for (let y = 0; y < glyphHeight; y++) {
    let line = '';
    for (let x = 0; x < glyphWidth; x++) {
      const px = getPixel(originX + x, originY + y);
      const on = px.a >= threshold;
      line += on ? '█' : ' ';
    }
    rowsOut.push(line);
  }

  glyphs[char] = rowsOut;
}

const outputDir = path.dirname(output);
fs.mkdirSync(outputDir, { recursive: true });

const font = {
  meta: {
    id,
    name,
    glyphWidth,
    glyphHeight,
    spaceWidth,
    letterGap,
    fallback,
    charset
  },
  glyphs
};

fs.writeFileSync(output, JSON.stringify(font, null, 2) + '\n');
console.log(`Wrote ${output}`);
