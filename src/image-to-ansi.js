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
     * @param {string} options.renderMode - Render mode: 'half-256', 'half-24bit', 'full-256', 'full-24bit', 'binary'
     * @returns {{ ansi: string, html: string, width: number, height: number }}
     */
    function processImage(img, options = {}) {
        const {
            maxWidth = 80,
            maxHeight = 40,
            renderMode = 'half-256'
        } = options;

        // Parse render mode
        const useHalfBlocks = renderMode.startsWith('half-');
        const useHalfFgOnly = renderMode.startsWith('halffg-');
        const useQuadrant = renderMode.startsWith('quad-');
        const useFullSpaces = renderMode.startsWith('full-');
        const useBlockChars = renderMode.startsWith('block-');
        const useTrue24bit = renderMode.includes('-24bit');
        const isBinary = renderMode === 'binary';
        const is1to1 = renderMode.endsWith('-1x');

        // Calculate scaled dimensions
        // The pixel grid matches the source image aspect ratio directly.
        // Each render mode maps pixels to characters differently (half blocks
        // pack 2 rows per line, quadrant packs 2×2 per char, etc.) but the
        // pixel grid itself always preserves the original image proportions.
        // Visual aspect correction is handled by the display layer (CSS
        // line-height in the preview, or the terminal's font metrics).
        const aspectRatio = img.width / img.height;

        let width, height;

        if (is1to1 && (useHalfBlocks || useHalfFgOnly)) {
            // Half blocks 1:1: use source width, round height up to even
            width = img.width;
            height = img.height % 2 === 0 ? img.height : img.height + 1;
        } else if (is1to1 && useQuadrant) {
            // Quadrant 1:1: 2x2 pixels per char, round up to even
            width = img.width % 2 === 0 ? img.width : img.width + 1;
            height = img.height % 2 === 0 ? img.height : img.height + 1;
        } else if (is1to1) {
            // Other 1:1 modes: use source dimensions directly, no scaling
            width = img.width;
            height = img.height;
        } else if (useHalfBlocks || useHalfFgOnly || isBinary) {
            // Half blocks: charW = pixelW, charH = pixelH / 2
            // For correct display aspect: pixelH = 2 * pixelW / aspectRatio
            const maxPixH = maxHeight * 2; // max pixel rows = max char lines × 2
            if (aspectRatio > maxWidth / maxHeight) {
                width = maxWidth;
                height = Math.round(2 * maxWidth / aspectRatio);
            } else {
                height = maxPixH;
                width = Math.round(maxPixH * aspectRatio / 2);
            }
            height = Math.max(2, Math.floor(height / 2) * 2);
        } else if (useQuadrant) {
            // Quadrant: charW = pixelW / 2, charH = pixelH / 2
            // Char aspect = (pixelW/2) / (pixelH/2) = pixelW/pixelH
            // So pixel grid matches image ratio. No correction needed.
            if (aspectRatio > maxWidth / maxHeight) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio);
            } else {
                height = maxHeight;
                width = Math.round(maxHeight * aspectRatio);
            }
            // Round to even
            width = Math.max(2, Math.floor(width / 2) * 2);
            height = Math.max(2, Math.floor(height / 2) * 2);
        } else if (useBlockChars) {
            // Block chars: charW = pixelW, charH = pixelH
            // Pixel grid matches image ratio directly.
            if (aspectRatio > maxWidth / maxHeight) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio);
            } else {
                height = maxHeight;
                width = Math.round(maxHeight * aspectRatio);
            }
        } else {
            // Full spaces: charW = pixelW × 2, charH = pixelH
            // For correct display aspect: pixelH = 2 * pixelW / aspectRatio
            const maxPixW = Math.floor(maxWidth / 2); // max pixel cols = max char cols / 2
            if (aspectRatio > maxWidth / 2 / maxHeight) {
                width = maxPixW;
                height = Math.round(2 * maxPixW / aspectRatio);
            } else {
                height = maxHeight;
                width = Math.round(maxHeight * aspectRatio / 2);
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

        if (isBinary) {
            // Binary mode: just █ and space, no color codes
            output = renderBinary(pixels, width, height);
            htmlOutput = output;
        } else if (useHalfBlocks) {
            // Half-block mode: ▀ (upper half) with fg=top, bg=bottom
            const result = renderHalfBlocks(pixels, width, height, useTrue24bit);
            output = result.ansi;
            htmlOutput = result.html;
        } else if (useHalfFgOnly) {
            // Half-block fg-only mode: ▀▄█ with foreground color only
            const result = renderHalfBlocksFgOnly(pixels, width, height, useTrue24bit);
            output = result.ansi;
            htmlOutput = result.html;
        } else if (useQuadrant) {
            // Quadrant mode: 2x2 pixels per char using ▖▗▘▝▙▛▜▟█
            const result = renderQuadrant(pixels, width, height, useTrue24bit);
            output = result.ansi;
            htmlOutput = result.html;
        } else if (useBlockChars) {
            // Block char mode: █ with foreground color, 1 char per pixel
            const result = renderBlockChars(pixels, width, height, useTrue24bit);
            output = result.ansi;
            htmlOutput = result.html;
        } else {
            // Full spaces mode: two spaces per pixel with background color
            const result = renderFullBlocks(pixels, width, height, useTrue24bit);
            output = result.ansi;
            htmlOutput = result.html;
        }

        return {
            ansi: output,
            html: htmlOutput,
            width: width,
            height: useHalfBlocks || useHalfFgOnly || isBinary ? height / 2 : (useQuadrant ? height / 2 : height)
        };
    }

    /**
     * Render using half blocks (▀▄) - 2x vertical resolution
     */
    function renderHalfBlocks(pixels, width, height, useTrue24bit) {
        let ansi = '';
        let html = '';

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

            ansi += lineAnsi + '\x1b[0m\n';
            html += lineHtml + '\n';
        }

        return { ansi, html };
    }

    /**
     * Render using half blocks with foreground color only (no background)
     * Uses ▀ for top, ▄ for bottom, █ for both, space for neither
     */
    function renderHalfBlocksFgOnly(pixels, width, height, useTrue24bit) {
        let ansi = '';
        let html = '';

        for (let y = 0; y < height; y += 2) {
            let lineAnsi = '';
            let lineHtml = '';
            let lastFg = null;

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

                const topOn = topA >= 32;
                const botOn = botA >= 32;

                let char, fgCode, fgColor;

                if (!topOn && !botOn) {
                    // Both transparent
                    char = ' ';
                    fgCode = null;
                    fgColor = null;
                } else if (topOn && botOn) {
                    // Both on - use full block with averaged/top color
                    char = '█';
                    fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
                    fgColor = `rgb(${topR},${topG},${topB})`;
                } else if (topOn) {
                    // Only top
                    char = '▀';
                    fgCode = rgbaToFgAnsi(topR, topG, topB, topA, useTrue24bit);
                    fgColor = `rgb(${topR},${topG},${topB})`;
                } else {
                    // Only bottom
                    char = '▄';
                    fgCode = rgbaToFgAnsi(botR, botG, botB, botA, useTrue24bit);
                    fgColor = `rgb(${botR},${botG},${botB})`;
                }

                // ANSI output
                if (fgCode !== lastFg) {
                    lineAnsi += fgCode ? `\x1b[${fgCode}m` : '\x1b[0m';
                    lastFg = fgCode;
                }
                lineAnsi += char;

                // HTML output
                lineHtml += fgColor
                    ? `<span style="color:${fgColor}">${char}</span>`
                    : char;
            }

            ansi += lineAnsi + '\x1b[0m\n';
            html += lineHtml + '\n';
        }

        return { ansi, html };
    }

    /**
     * Render using quadrant block characters - 2x2 pixels per character
     * Uses ▖▗▘▝▙▛▜▟█ and space for the 16 possible 2x2 patterns
     */
    function renderQuadrant(pixels, width, height, useTrue24bit) {
        // Quadrant characters indexed by bit pattern:
        // bit 0 = top-left, bit 1 = top-right, bit 2 = bottom-left, bit 3 = bottom-right
        const quadChars = [
            ' ',  // 0000
            '▘',  // 0001 - top-left
            '▝',  // 0010 - top-right
            '▀',  // 0011 - top
            '▖',  // 0100 - bottom-left
            '▌',  // 0101 - left
            '▞',  // 0110 - diagonal
            '▛',  // 0111 - all but bottom-right
            '▗',  // 1000 - bottom-right
            '▚',  // 1001 - other diagonal
            '▐',  // 1010 - right
            '▜',  // 1011 - all but bottom-left
            '▄',  // 1100 - bottom
            '▙',  // 1101 - all but top-right
            '▟',  // 1110 - all but top-left
            '█'   // 1111 - full
        ];

        let ansi = '';
        let html = '';

        for (let y = 0; y < height; y += 2) {
            let lineAnsi = '';
            let lineHtml = '';
            let lastFg = null;

            for (let x = 0; x < width; x += 2) {
                // Get 2x2 pixel block
                const getPixel = (px, py) => {
                    if (px >= width || py >= height) return { r: 0, g: 0, b: 0, a: 0 };
                    const idx = (py * width + px) * 4;
                    return {
                        r: pixels[idx],
                        g: pixels[idx + 1],
                        b: pixels[idx + 2],
                        a: pixels[idx + 3]
                    };
                };

                const tl = getPixel(x, y);
                const tr = getPixel(x + 1, y);
                const bl = getPixel(x, y + 1);
                const br = getPixel(x + 1, y + 1);

                // Build bit pattern
                const tlOn = tl.a >= 32 ? 1 : 0;
                const trOn = tr.a >= 32 ? 2 : 0;
                const blOn = bl.a >= 32 ? 4 : 0;
                const brOn = br.a >= 32 ? 8 : 0;
                const pattern = tlOn | trOn | blOn | brOn;

                const char = quadChars[pattern];

                // Average color of all "on" pixels
                let r = 0, g = 0, b = 0, count = 0;
                if (tlOn) { r += tl.r; g += tl.g; b += tl.b; count++; }
                if (trOn) { r += tr.r; g += tr.g; b += tr.b; count++; }
                if (blOn) { r += bl.r; g += bl.g; b += bl.b; count++; }
                if (brOn) { r += br.r; g += br.g; b += br.b; count++; }

                let fgCode = null;
                let fgColor = null;
                if (count > 0) {
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    fgCode = rgbaToFgAnsi(r, g, b, 255, useTrue24bit);
                    fgColor = `rgb(${r},${g},${b})`;
                }

                // ANSI output
                if (fgCode !== lastFg) {
                    lineAnsi += fgCode ? `\x1b[${fgCode}m` : '\x1b[0m';
                    lastFg = fgCode;
                }
                lineAnsi += char;

                // HTML output
                lineHtml += fgColor
                    ? `<span style="color:${fgColor}">${char}</span>`
                    : char;
            }

            ansi += lineAnsi + '\x1b[0m\n';
            html += lineHtml + '\n';
        }

        return { ansi, html };
    }

    /**
     * Render using full blocks (two spaces with background color)
     */
    function renderFullBlocks(pixels, width, height, useTrue24bit) {
        let ansi = '';
        let html = '';

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

            ansi += lineAnsi + '\x1b[0m\n';
            html += lineHtml + '\n';
        }

        return { ansi, html };
    }

    /**
     * Render using block characters (█) with foreground color - 1 char per pixel
     */
    function renderBlockChars(pixels, width, height, useTrue24bit) {
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

                if (a < 32) {
                    // Transparent pixel
                    if (lastFg !== null) {
                        lineAnsi += '\x1b[0m';
                        lastFg = null;
                    }
                    lineAnsi += ' ';
                    lineHtml += ' ';
                } else {
                    const fgCode = rgbaToFgAnsi(r, g, b, a, useTrue24bit);
                    const fgColor = `rgb(${r},${g},${b})`;

                    if (fgCode !== lastFg) {
                        lineAnsi += `\x1b[${fgCode}m`;
                        lastFg = fgCode;
                    }
                    lineAnsi += '█';
                    lineHtml += `<span style="color:${fgColor}">█</span>`;
                }
            }

            ansi += lineAnsi + '\x1b[0m\n';
            html += lineHtml + '\n';
        }

        return { ansi, html };
    }

    /**
     * Render in binary mode - just █ and space based on luminance, no color codes
     */
    function renderBinary(pixels, width, height) {
        let output = '';

        for (let y = 0; y < height; y += 2) {
            let line = '';

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

                // Calculate luminance for each pixel
                const topLum = (topA >= 32) ? (0.299 * topR + 0.587 * topG + 0.114 * topB) : 0;
                const botLum = (botA >= 32) ? (0.299 * botR + 0.587 * botG + 0.114 * botB) : 0;

                // Threshold at 128
                const topFilled = topLum >= 128;
                const botFilled = botLum >= 128;

                if (!topFilled && !botFilled) {
                    line += ' ';
                } else if (!topFilled && botFilled) {
                    line += '▄';
                } else if (topFilled && !botFilled) {
                    line += '▀';
                } else {
                    line += '█';
                }
            }

            output += line + '\n';
        }

        return output;
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
