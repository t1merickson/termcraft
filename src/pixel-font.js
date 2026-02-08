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

    /**
     * Render a text string using the loaded font
     * Returns { ansi, html } with multi-line output
     * The output uses █ for filled pixels and space for empty - no color codes
     */
    function renderText(text) {
        if (!loaded) return { ansi: '', html: '' };

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
