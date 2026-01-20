/**
 * Image to ANSI Converter
 *
 * Converts images to ANSI escape sequences for terminal display.
 * Requires: ansi256.js
 */

(function(window) {
    'use strict';

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
     * Convert RGBA to background ANSI code
     */
    function rgbaToBgAnsi(r, g, b, a, useTrue24bit) {
        if (a < 32) return null;

        if (useTrue24bit) {
            return `48;2;${r};${g};${b}`;
        }
        return `48;5;${ANSI256.rgbToAnsi256(r, g, b)}`;
    }

    /**
     * Process an image and convert to ANSI art
     *
     * @param {HTMLImageElement} img - Source image
     * @param {object} options - Conversion options
     * @param {number} options.maxWidth - Max output width in characters (default: 80)
     * @param {number} options.maxHeight - Max output height in lines (default: 40)
     * @param {boolean} options.useUnicode - Use Unicode half-blocks for 2x resolution (default: true)
     * @param {boolean} options.useTrue24bit - Use 24-bit color instead of 256 (default: false)
     * @returns {{ ansi: string, html: string, width: number, height: number }}
     */
    function processImage(img, options = {}) {
        const {
            maxWidth = 80,
            maxHeight = 40,
            useUnicode = true,
            useTrue24bit = false
        } = options;

        // Calculate scaled dimensions (characters are ~2x taller than wide)
        const aspectRatio = img.width / img.height;
        const charAspect = 2;

        let width, height;

        if (useUnicode) {
            const effectiveHeight = maxHeight * 2;
            if (aspectRatio > (maxWidth / effectiveHeight) * charAspect) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio / charAspect) * 2;
            } else {
                height = effectiveHeight;
                width = Math.round(effectiveHeight * aspectRatio * charAspect);
            }
            height = Math.max(2, Math.floor(height / 2) * 2);
        } else {
            if (aspectRatio > (maxWidth / maxHeight) * charAspect) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio / charAspect);
            } else {
                height = maxHeight;
                width = Math.round(maxHeight * aspectRatio * charAspect);
            }
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

        let output = '';
        let htmlOutput = '';

        if (useUnicode) {
            // Unicode mode: ▀ (upper half) with fg=top, bg=bottom
            for (let y = 0; y < height; y += 2) {
                let lineAnsi = '';
                let lineHtml = '';
                let lastFg = null;
                let lastBg = null;

                for (let x = 0; x < width; x++) {
                    const topIdx = (y * width + x) * 4;
                    const topR = pixels[topIdx];
                    const topG = pixels[topIdx + 1];
                    const topB = pixels[topIdx + 2];
                    const topA = pixels[topIdx + 3];

                    let botR = 0, botG = 0, botB = 0, botA = 0;
                    if (y + 1 < height) {
                        const botIdx = ((y + 1) * width + x) * 4;
                        botR = pixels[botIdx];
                        botG = pixels[botIdx + 1];
                        botB = pixels[botIdx + 2];
                        botA = pixels[botIdx + 3];
                    }

                    const topTransparent = topA < 32;
                    const botTransparent = botA < 32;

                    let char, fgCode, bgCode, fgColor, bgColor;

                    if (topTransparent && botTransparent) {
                        char = ' ';
                        fgCode = bgCode = fgColor = bgColor = null;
                    } else if (topTransparent) {
                        char = '▄';
                        fgCode = rgbaToFgAnsi(botR, botG, botB, botA, useTrue24bit);
                        bgCode = null;
                        fgColor = `rgb(${botR},${botG},${botB})`;
                        bgColor = null;
                    } else if (botTransparent) {
                        char = '▀';
                        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
                        bgCode = null;
                        fgColor = `rgb(${topR},${topG},${topB})`;
                        bgColor = null;
                    } else {
                        char = '▀';
                        fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
                        bgCode = rgbaToBgAnsi(botR, botG, botB, botA, useTrue24bit);
                        fgColor = `rgb(${topR},${topG},${topB})`;
                        bgColor = `rgb(${botR},${botG},${botB})`;
                    }

                    // ANSI output
                    if (fgCode !== lastFg || bgCode !== lastBg) {
                        const codes = [];
                        if (fgCode) codes.push(fgCode);
                        if (bgCode) codes.push(bgCode);
                        lineAnsi += codes.length > 0 ? `\x1b[${codes.join(';')}m` : '\x1b[0m';
                        lastFg = fgCode;
                        lastBg = bgCode;
                    }
                    lineAnsi += char;

                    // HTML output
                    let style = '';
                    if (fgColor) style += `color:${fgColor};`;
                    if (bgColor) style += `background:${bgColor};`;
                    lineHtml += style ? `<span style="${style}">${char}</span>` : char;
                }

                output += lineAnsi + '\x1b[0m\n';
                htmlOutput += lineHtml + '\n';
            }
        } else {
            // Standard mode: two spaces per pixel with background color
            for (let y = 0; y < height; y++) {
                let lineAnsi = '';
                let lineHtml = '';
                let lastBg = null;

                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const r = pixels[idx];
                    const g = pixels[idx + 1];
                    const b = pixels[idx + 2];
                    const a = pixels[idx + 3];

                    const bgCode = rgbaToBgAnsi(r, g, b, a, useTrue24bit);
                    const bgColor = a >= 32 ? `rgb(${r},${g},${b})` : null;

                    if (bgCode !== lastBg) {
                        lineAnsi += bgCode ? `\x1b[${bgCode}m` : '\x1b[0m';
                        lastBg = bgCode;
                    }
                    lineAnsi += '  ';

                    lineHtml += bgColor
                        ? `<span style="background:${bgColor}">  </span>`
                        : '  ';
                }

                output += lineAnsi + '\x1b[0m\n';
                htmlOutput += lineHtml + '\n';
            }
        }

        return {
            ansi: output,
            html: htmlOutput,
            width: width,
            height: useUnicode ? height / 2 : height
        };
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

    // Export API
    window.ImageToAnsi = Object.freeze({
        loadImage,
        readFile,
        processImage,
        escapeForPrintf
    });

})(window);
