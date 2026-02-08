/**
 * Pixel Font Renderer
 * Loads pre-extracted font data from JSON and renders text using block characters
 */
(function(window) {
    'use strict';

    // Default font configuration (overridden by font metadata)
    const DEFAULT_META = Object.freeze({
        glyphWidth: 8,
        glyphHeight: 12,
        spaceWidth: 4,
        letterGap: 1,
        fallback: '?',
        charset: null
    });

    // Stored letter data { 'A': ['row1', 'row2', ...], ... }
    let fontData = {};
    let fontMeta = { ...DEFAULT_META };
    let loaded = false;

    /**
     * Load font data from JSON file
     */
    async function loadFont(jsonSrc) {
        const response = await fetch(jsonSrc);
        if (!response.ok) {
            throw new Error('Failed to load font JSON');
        }
        const data = await response.json();
        if (data && data.glyphs) {
            fontData = data.glyphs || {};
            fontMeta = { ...DEFAULT_META, ...(data.meta || {}) };
        } else {
            // Backwards-compatible format: raw glyph map
            fontData = data || {};
            fontMeta = { ...DEFAULT_META };
        }

        // Infer dimensions if not provided
        const sampleGlyph = Object.values(fontData)[0];
        if (sampleGlyph && Array.isArray(sampleGlyph)) {
            if (!fontMeta.glyphHeight) {
                fontMeta.glyphHeight = sampleGlyph.length;
            }
            if (!fontMeta.glyphWidth) {
                fontMeta.glyphWidth = Math.max(...sampleGlyph.map(r => (r || '').length));
            }
        }
        loaded = true;
    }

    // Shadow shade characters by intensity (1-4)
    const SHADOW_CHARS = [' ', '░', '▒', '▓', '█'];
    // Direction offsets: [dx, dy]
    const SHADOW_OFFSETS = {
        br: [1, 1],
        bl: [-1, 1],
        tl: [-1, -1],
        tr: [1, -1]
    };

    /**
     * Render a text string using the loaded font
     * Returns { ansi, html } with multi-line output
     * The output uses █ for filled pixels and space for empty - no color codes
     * Options: { shadow: { direction: 'br'|'bl'|'tl'|'tr'|'none', intensity: 1-4 } }
     */
    function renderText(text, options) {
        if (!loaded) return { ansi: '', html: '' };

        const shadow = (options && options.shadow) || null;
        const shadowDir = shadow && shadow.direction !== 'none' ? shadow.direction : null;
        const shadowIntensity = shadow ? Math.max(1, Math.min(4, shadow.intensity || 2)) : 2;
        const shadowChar = SHADOW_CHARS[shadowIntensity];

        // Initialize line arrays (one per glyph row)
        const lines = Array(fontMeta.glyphHeight).fill('');

        for (const char of text) {
            if (char === ' ') {
                // Add space
                const space = ' '.repeat(fontMeta.spaceWidth);
                for (let i = 0; i < fontMeta.glyphHeight; i++) {
                    lines[i] += space;
                }
                continue;
            }

            const glyph =
                fontData[char] ||
                fontData[char.toUpperCase()] ||
                fontData[char.toLowerCase()] ||
                fontData[fontMeta.fallback];

            if (glyph) {
                for (let i = 0; i < fontMeta.glyphHeight; i++) {
                    const row = glyph[i] || ' '.repeat(fontMeta.glyphWidth);
                    lines[i] += row + ' '.repeat(fontMeta.letterGap);
                }
            } else {
                // Unknown glyph: fall back to spacing so output doesn't collapse
                const space = ' '.repeat(fontMeta.spaceWidth);
                for (let i = 0; i < fontMeta.glyphHeight; i++) {
                    lines[i] += space;
                }
            }
        }

        // Apply directional shadow if requested
        if (shadowDir && SHADOW_OFFSETS[shadowDir]) {
            const [dx, dy] = SHADOW_OFFSETS[shadowDir];
            const origH = lines.length;
            const origW = Math.max(...lines.map(l => l.length));

            // Pad grid: add 1 row/col on the side the shadow falls toward
            const padTop = dy < 0 ? 1 : 0;
            const padBot = dy > 0 ? 1 : 0;
            const padLeft = dx < 0 ? 1 : 0;
            const padRight = dx > 0 ? 1 : 0;
            const gridH = origH + padTop + padBot;
            const gridW = origW + padLeft + padRight;

            // Build grid with original content offset by padding
            const grid = [];
            for (let r = 0; r < gridH; r++) {
                const row = [];
                const srcR = r - padTop;
                const src = (srcR >= 0 && srcR < origH) ? lines[srcR] : '';
                for (let c = 0; c < gridW; c++) {
                    const srcC = c - padLeft;
                    row.push(srcC >= 0 && srcC < src.length ? src[srcC] : ' ');
                }
                grid.push(row);
            }

            // Place shadows: for each filled pixel, offset by (dx,dy).
            // Shadow only appears where the target cell is empty (space).
            for (let r = 0; r < gridH; r++) {
                for (let c = 0; c < gridW; c++) {
                    if (grid[r][c] === '█') {
                        const sr = r + dy;
                        const sc = c + dx;
                        if (sr >= 0 && sr < gridH && sc >= 0 && sc < gridW) {
                            if (grid[sr][sc] === ' ') {
                                grid[sr][sc] = shadowChar;
                            }
                        }
                    }
                }
            }

            // Convert grid back to lines
            lines.length = 0;
            for (let r = 0; r < gridH; r++) {
                lines.push(grid[r].join(''));
            }

            // Trim padding rows/cols if they ended up empty
            // Trim top
            while (lines.length > origH && lines[0].trim() === '') {
                lines.shift();
            }
            // Trim bottom
            while (lines.length > origH && lines[lines.length - 1].trim() === '') {
                lines.pop();
            }
        }

        const output = lines.join('\n');
        return {
            ansi: output,
            html: output // Same thing - just plain text with block characters
        };
    }

    /**
     * Get letter data for preview
     * Returns object with ansi/html for each letter
     */
    function getLetters() {
        const letters = {};
        for (const [char, rows] of Object.entries(fontData)) {
            const output = rows.join('\n');
            letters[char] = { ansi: output, html: output };
        }
        return letters;
    }

    /**
     * Get raw font data
     */
    function getFontData() {
        return fontData;
    }

    function getMeta() {
        return fontMeta;
    }

    function isLoaded() {
        return loaded;
    }

    // Export API
    window.PixelFont = Object.freeze({
        loadFont,
        renderText,
        getFontData,
        getMeta,
        getLetters,
        isLoaded,
        DEFAULT_META
    });

})(window);
