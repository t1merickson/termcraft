#!/usr/bin/env node
/*
 * Convert opaque sprite-sheet PNGs to use transparency.
 *
 * Many pixel-font sprite sheets encode foreground/background as two
 * colors with full opacity.  This script detects the background color
 * (the most common pixel value) and makes it fully transparent, while
 * keeping foreground pixels opaque (black, alpha 255).
 *
 * Usage:
 *   node scripts/fix-png-alpha.js <input.png> [<input.png> ...]
 *
 * Overwrites each file in place.
 */

const fs = require('fs');
const { PNG } = require('pngjs');

for (const file of process.argv.slice(2)) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;

  // Count pixel frequency to find the background color
  const freq = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = `${data[i]},${data[i+1]},${data[i+2]}`;
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  // Background = most common color
  let bgKey = null, bgCount = 0;
  for (const [key, count] of freq) {
    if (count > bgCount) { bgKey = key; bgCount = count; }
  }

  console.log(`${file}: ${width}x${height}, ${freq.size} colors, bg=${bgKey} (${bgCount}px)`);

  // Make background transparent, foreground black+opaque
  const [bgR, bgG, bgB] = bgKey.split(',').map(Number);
  let converted = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === bgR && data[i+1] === bgG && data[i+2] === bgB) {
      data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 0;
      converted++;
    } else {
      data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 255;
    }
  }

  const buf = PNG.sync.write(png);
  fs.writeFileSync(file, buf);
  console.log(`  -> ${converted} bg pixels made transparent, ${width*height - converted} fg pixels kept`);
}
