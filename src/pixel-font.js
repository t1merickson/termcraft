/**
 * Pixel Font Renderer
 * Loads pre-extracted font data from JSON and renders text using block characters.
 * Font data stores pixels as binary strings ('1' = filled, '0' = empty).
 * The fill character is configurable at render time.
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

    // Stored letter data { 'A': ['1010', '1111', ...], ... }
    let fontData = {};
    let fontMeta = { ...DEFAULT_META };
    let loaded = false;

    // Configurable fill character (what '1' becomes in output)
    let fillChar = '█';

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

    /**
     * Set the character used to represent filled pixels.
     * Does not trigger re-render — caller should re-render after calling this.
     */
    function setFillChar(char) {
        if (char && char.length > 0) {
            fillChar = char;
        }
    }

    /**
     * Get the current fill character.
     */
    function getFillChar() {
        return fillChar;
    }

    // Shadow shade characters by intensity (1-4), relative to fill char
    function shadowChars() {
        return [' ', '░', '▒', '▓', fillChar];
    }

    // Direction offsets: [dx, dy]
    const SHADOW_OFFSETS = {
        br: [1, 1],
        bl: [-1, 1],
        tl: [-1, -1],
        tr: [1, -1]
    };

    /**
     * Convert a binary glyph row to display characters.
     * '1' → fillChar, '0' → space
     */
    function binaryToDisplay(row) {
        let out = '';
        for (let i = 0; i < row.length; i++) {
            out += row[i] === '1' ? fillChar : ' ';
        }
        return out;
    }

    /**
     * Render a text string using the loaded font
     * Returns { ansi, html } with multi-line output
     * Options: { shadow: { direction: 'br'|'bl'|'tl'|'tr'|'none', intensity: 1-4 } }
     */
    function renderText(text, options) {
        if (!loaded) return { ansi: '', html: '' };

        const shadow = (options && options.shadow) || null;
        const shadowDir = shadow && shadow.direction !== 'none' ? shadow.direction : null;
        const shadowIntensity = shadow ? Math.max(1, Math.min(4, shadow.intensity || 2)) : 2;
        const shadowChar = shadowChars()[shadowIntensity];

        // Initialize line arrays (one per glyph row) — kept as binary during layout
        const lines = Array(fontMeta.glyphHeight).fill('');

        for (const char of text) {
            if (char === ' ') {
                // Add space
                const space = '0'.repeat(fontMeta.spaceWidth);
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
                    const row = glyph[i] || '0'.repeat(fontMeta.glyphWidth);
                    lines[i] += row + '0'.repeat(fontMeta.letterGap);
                }
            } else {
                // Unknown glyph: fall back to spacing so output doesn't collapse
                const space = '0'.repeat(fontMeta.spaceWidth);
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
            // Grid cells: ' ' = empty, 'F' = filled, 'S' = shadow
            const grid = [];
            for (let r = 0; r < gridH; r++) {
                const row = [];
                const srcR = r - padTop;
                const src = (srcR >= 0 && srcR < origH) ? lines[srcR] : '';
                for (let c = 0; c < gridW; c++) {
                    const srcC = c - padLeft;
                    const bit = srcC >= 0 && srcC < src.length ? src[srcC] : '0';
                    row.push(bit === '1' ? 'F' : ' ');
                }
                grid.push(row);
            }

            // Place shadows: for each filled pixel, offset by (dx,dy).
            // Shadow only appears where the target cell is empty (space).
            for (let r = 0; r < gridH; r++) {
                for (let c = 0; c < gridW; c++) {
                    if (grid[r][c] === 'F') {
                        const sr = r + dy;
                        const sc = c + dx;
                        if (sr >= 0 && sr < gridH && sc >= 0 && sc < gridW) {
                            if (grid[sr][sc] === ' ') {
                                grid[sr][sc] = 'S';
                            }
                        }
                    }
                }
            }

            // Convert grid to display characters
            lines.length = 0;
            for (let r = 0; r < gridH; r++) {
                let line = '';
                for (let c = 0; c < gridW; c++) {
                    const cell = grid[r][c];
                    if (cell === 'F') line += fillChar;
                    else if (cell === 'S') line += shadowChar;
                    else line += ' ';
                }
                lines.push(line);
            }

            // Trim padding rows if they ended up empty
            while (lines.length > origH && lines[0].trim() === '') {
                lines.shift();
            }
            while (lines.length > origH && lines[lines.length - 1].trim() === '') {
                lines.pop();
            }
        } else {
            // No shadow — convert binary lines to display characters
            for (let i = 0; i < lines.length; i++) {
                lines[i] = binaryToDisplay(lines[i]);
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
            const output = rows.map(binaryToDisplay).join('\n');
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
        setFillChar,
        getFillChar,
        DEFAULT_META
    });

})(window);
