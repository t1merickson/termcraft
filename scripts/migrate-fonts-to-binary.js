#!/usr/bin/env node
/**
 * One-shot migration: convert all pixel font glyph data from character rows
 * (█ and space) to binary rows (1 and 0).
 *
 * Also consolidates Geist Pixel variants (circle, grid, line, triangle)
 * into a single font since they all share the same pixel grid.
 *
 * Usage: node scripts/migrate-fonts-to-binary.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'app', 'fonts', 'index.json');

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

// Geist Pixel duplicates to remove (keep geist-pixel-square, rename it)
const GEIST_DUPES = new Set([
    'geist-pixel-circle',
    'geist-pixel-grid',
    'geist-pixel-line',
    'geist-pixel-triangle'
]);

let converted = 0;

for (const entry of index) {
    if (GEIST_DUPES.has(entry.id)) {
        console.log(`SKIP (duplicate): ${entry.id}`);
        continue;
    }

    const fontPath = path.join(ROOT, 'app', entry.path);
    if (!fs.existsSync(fontPath)) {
        console.log(`SKIP (missing): ${fontPath}`);
        continue;
    }

    const font = JSON.parse(fs.readFileSync(fontPath, 'utf-8'));
    const glyphs = font.glyphs || font;

    let changed = false;
    for (const [char, rows] of Object.entries(glyphs)) {
        if (!Array.isArray(rows)) continue;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Convert: any non-space → 1, space → 0
            const binary = row.replace(/./g, ch => ch === ' ' ? '0' : '1');
            if (binary !== row) {
                rows[i] = binary;
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(fontPath, JSON.stringify(font, null, 2) + '\n');
        console.log(`CONVERTED: ${entry.id} (${entry.path})`);
        converted++;
    } else {
        console.log(`ALREADY BINARY: ${entry.id}`);
    }
}

// Rename geist-pixel-square → geist-pixel
const squareEntry = index.find(e => e.id === 'geist-pixel-square');
if (squareEntry) {
    // Rename directory
    const oldDir = path.join(ROOT, 'app', 'fonts', 'geist-pixel-square');
    const newDir = path.join(ROOT, 'app', 'fonts', 'geist-pixel');
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
        fs.renameSync(oldDir, newDir);
        console.log(`RENAMED: fonts/geist-pixel-square → fonts/geist-pixel`);
    }

    // Update the font.json metadata
    const newFontPath = path.join(newDir, 'font.json');
    if (fs.existsSync(newFontPath)) {
        const font = JSON.parse(fs.readFileSync(newFontPath, 'utf-8'));
        if (font.meta) {
            font.meta.id = 'geist-pixel';
            font.meta.name = 'Geist Pixel';
        }
        fs.writeFileSync(newFontPath, JSON.stringify(font, null, 2) + '\n');
    }

    squareEntry.id = 'geist-pixel';
    squareEntry.name = 'Geist Pixel 12x17';
    squareEntry.path = 'fonts/geist-pixel/font.json';
}

// Remove duplicate entries from index
const newIndex = index.filter(e => !GEIST_DUPES.has(e.id));
fs.writeFileSync(INDEX_PATH, JSON.stringify(newIndex, null, 2) + '\n');
console.log(`\nUpdated fonts/index.json: ${index.length} → ${newIndex.length} entries`);

// Remove duplicate directories
for (const dupeId of GEIST_DUPES) {
    const dupeDir = path.join(ROOT, 'app', 'fonts', dupeId);
    if (fs.existsSync(dupeDir)) {
        fs.rmSync(dupeDir, { recursive: true });
        console.log(`REMOVED: fonts/${dupeId}/`);
    }
}

console.log(`\nDone. Converted ${converted} fonts to binary format.`);
