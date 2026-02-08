/**
 * Image to ASCII Converter
 *
 * Converts images to ASCII art using character brightness mapping.
 * Requires: ansi256.js
 */

(function(root) {
    'use strict';

    // Resolve ANSI256 dependency (works in both Node and browser)
    const ANSI256 = (typeof require !== 'undefined' && typeof window === 'undefined')
        ? require('./ansi256.js')
        : root.ANSI256;

    // Preset character sets ordered from dark to light
    const CHARSETS = {
        standard: ' .:-=+*#%@',
        detailed: " .'`:;-~=+*!?#%@",
        blocks: ' ░▒▓█',
        simple: ' .*#',
        extended: " .`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
    };

    /**
     * Load an image from a URL or data URL
     */
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    }

    /**
     * Read a file as a data URL
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Calculate luminance from RGB values
     */
    function getLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    /**
     * Map luminance to a character from the charset
     */
    function getCharForLuminance(luminance, charset, invert) {
        if (invert) luminance = 255 - luminance;
        const index = Math.floor((luminance / 256) * charset.length);
        return charset[Math.min(index, charset.length - 1)];
    }

    /**
     * Convert RGBA to foreground ANSI code
     */
    function rgbaToFgAnsi(r, g, b, a, useTrue24bit) {
        if (a < 32) return null;

        if (useTrue24bit) {
            return `38;2;${r};${g};${b}`;
        }
        return `38;5;${ANSI256.rgbToAnsi256(r, g, b)}`;
    }

    /**
     * Process an image and convert to ASCII art
     *
     * @param {HTMLImageElement} img - Source image
     * @param {object} options - Conversion options
     * @param {number} options.maxWidth - Max output width in characters (default: 80)
     * @param {number} options.maxHeight - Max output height in lines (default: 40)
     * @param {string} options.charset - Character set name or custom string (default: 'standard')
     * @param {string} options.colorMode - Color mode: 'none', '256', '24bit' (default: 'none')
     * @param {boolean} options.invert - Invert brightness mapping (default: false)
     * @returns {{ ansi: string, html: string, width: number, height: number }}
     */
    function processImage(img, options = {}) {
        const {
            maxWidth = 80,
            maxHeight = 40,
            charset = 'standard',
            colorMode = 'none',
            invert = false,
            greyscale = false
        } = options;

        // Get charset string (allow preset name or custom string)
        const charsetStr = CHARSETS[charset] || charset || CHARSETS.standard;

        // Calculate scaled dimensions
        // Characters are ~2x taller than wide, so we need to compensate
        const aspectRatio = img.width / img.height;
        const charAspect = 2;

        let width, height;

        // Scale to fit within maxWidth x maxHeight while maintaining aspect ratio
        if (aspectRatio > (maxWidth / maxHeight) * charAspect) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio / charAspect);
        } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio * charAspect);
        }

        width = Math.max(1, width);
        height = Math.max(1, height);

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Apply greyscale transform (invert is handled in getCharForLuminance)
        if (greyscale) {
            for (let i = 0; i < pixels.length; i += 4) {
                const lum = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
                pixels[i] = pixels[i + 1] = pixels[i + 2] = lum;
            }
        }

        const useColor = colorMode !== 'none';
        const useTrue24bit = colorMode === '24bit';

        let ansi = '';
        let html = '';

        for (let y = 0; y < height; y++) {
            let lineAnsi = '';
            let lineHtml = '';
            let lastFg = null;

            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                const a = pixels[idx + 3];

                // Handle transparency
                if (a < 32) {
                    if (lastFg !== null && useColor) {
                        lineAnsi += '\x1b[0m';
                        lastFg = null;
                    }
                    lineAnsi += ' ';
                    lineHtml += ' ';
                    continue;
                }

                const luminance = getLuminance(r, g, b);
                const char = getCharForLuminance(luminance, charsetStr, invert);

                if (useColor) {
                    const fgCode = rgbaToFgAnsi(r, g, b, a, useTrue24bit);
                    const fgColor = `rgb(${r},${g},${b})`;

                    if (fgCode !== lastFg) {
                        lineAnsi += `\x1b[${fgCode}m`;
                        lastFg = fgCode;
                    }
                    lineAnsi += char;
                    lineHtml += `<span style="color:${fgColor}">${escapeHtml(char)}</span>`;
                } else {
                    lineAnsi += char;
                    lineHtml += escapeHtml(char);
                }
            }

            if (useColor) {
                ansi += lineAnsi + '\x1b[0m\n';
            } else {
                ansi += lineAnsi + '\n';
            }
            html += lineHtml + '\n';
        }

        return {
            ansi: ansi,
            html: html,
            width: width,
            height: height
        };
    }

    /**
     * Escape HTML special characters
     */
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Escape ANSI codes for shell printf
     */
    function escapeForPrintf(ansi) {
        return ansi
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\x1b/g, '\\033');
    }

    /**
     * Get available charset presets
     */
    function getCharsets() {
        return { ...CHARSETS };
    }

    // Export API
    const API = Object.freeze({
        loadImage,
        readFile,
        processImage,
        escapeForPrintf,
        getCharsets
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = API;
    } else {
        root.ImageToAscii = API;
    }

})(typeof window !== 'undefined' ? window : global);
