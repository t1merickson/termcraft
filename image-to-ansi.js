/**
 * Image to ANSI 256 Converter
 * Converts images to ANSI escape sequences using the 256 color palette.
 * Based on the algorithm from https://github.com/dom111/image-to-ansi
 */

(function(window) {
    'use strict';

    // ANSI 256 color palette - built from first principles
    const palette = buildPalette();

    function buildPalette() {
        const colors = [];

        // Standard 16 colors (0-15)
        const standard16 = [
            [0, 0, 0],       // 0: Black
            [128, 0, 0],     // 1: Maroon
            [0, 128, 0],     // 2: Green
            [128, 128, 0],   // 3: Olive
            [0, 0, 128],     // 4: Navy
            [128, 0, 128],   // 5: Purple
            [0, 128, 128],   // 6: Teal
            [192, 192, 192], // 7: Silver
            [128, 128, 128], // 8: Grey
            [255, 0, 0],     // 9: Red
            [0, 255, 0],     // 10: Lime
            [255, 255, 0],   // 11: Yellow
            [0, 0, 255],     // 12: Blue
            [255, 0, 255],   // 13: Fuchsia
            [0, 255, 255],   // 14: Aqua
            [255, 255, 255], // 15: White
        ];

        standard16.forEach((rgb, i) => {
            colors[i] = rgb;
        });

        // 6x6x6 color cube (16-231)
        const cubeValues = [0, 95, 135, 175, 215, 255];
        for (let r = 0; r < 6; r++) {
            for (let g = 0; g < 6; g++) {
                for (let b = 0; b < 6; b++) {
                    const index = 16 + (r * 36) + (g * 6) + b;
                    colors[index] = [cubeValues[r], cubeValues[g], cubeValues[b]];
                }
            }
        }

        // Grayscale (232-255)
        for (let i = 0; i < 24; i++) {
            const gray = 8 + 10 * i;
            colors[232 + i] = [gray, gray, gray];
        }

        return colors;
    }

    /**
     * Find the nearest ANSI 256 color using Manhattan distance
     */
    function rgbToAnsi256(r, g, b) {
        let bestIndex = 0;
        let bestDistance = Infinity;

        for (let i = 0; i < 256; i++) {
            const [pr, pg, pb] = palette[i];
            // Manhattan distance (L1 norm) - fast and works well for color matching
            const distance = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }

        return bestIndex;
    }

    /**
     * Convert RGBA to ANSI escape code
     * Returns null for transparent pixels
     */
    function rgbaToAnsi(r, g, b, a, useTrue24bit) {
        // Treat very transparent pixels as transparent
        if (a < 32) {
            return null;
        }

        if (useTrue24bit) {
            return `38;2;${r};${g};${b}`;
        } else {
            const index = rgbToAnsi256(r, g, b);
            return `38;5;${index}`;
        }
    }

    /**
     * Convert RGBA to background ANSI escape code
     */
    function rgbaToBgAnsi(r, g, b, a, useTrue24bit) {
        if (a < 32) {
            return null;
        }

        if (useTrue24bit) {
            return `48;2;${r};${g};${b}`;
        } else {
            const index = rgbToAnsi256(r, g, b);
            return `48;5;${index}`;
        }
    }

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
     * Main image processing function
     *
     * Options:
     * - maxWidth: Maximum output width in characters (default: 80)
     * - maxHeight: Maximum output height in lines (default: 40)
     * - useUnicode: Use Unicode half-blocks for higher resolution (default: true)
     * - useTrue24bit: Use 24-bit true color instead of 256 colors (default: false)
     */
    function processImage(img, options = {}) {
        const {
            maxWidth = 80,
            maxHeight = 40,
            useUnicode = true,
            useTrue24bit = false
        } = options;

        // Calculate scaled dimensions
        // Characters are roughly twice as tall as wide, so adjust for aspect ratio
        const aspectRatio = img.width / img.height;
        const charAspect = 2; // Approximate character height/width ratio

        let width, height;

        if (useUnicode) {
            // Unicode mode: each character represents 2 vertical pixels
            const effectiveHeight = maxHeight * 2;

            if (aspectRatio > (maxWidth / effectiveHeight) * charAspect) {
                width = maxWidth;
                height = Math.round(maxWidth / aspectRatio / charAspect) * 2;
            } else {
                height = effectiveHeight;
                width = Math.round(effectiveHeight * aspectRatio * charAspect);
            }

            // Ensure even height for Unicode mode
            height = Math.max(2, Math.floor(height / 2) * 2);
        } else {
            // Standard mode: each character is 2 spaces
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

        // Draw image to canvas at scaled size
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Use high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Generate ANSI output
        let output = '';
        let htmlOutput = '';

        if (useUnicode) {
            // Unicode mode: combine two rows into one using half-block characters
            // ▀ (upper half) or ▄ (lower half) with foreground and background colors
            for (let y = 0; y < height; y += 2) {
                let lineAnsi = '';
                let lineHtml = '';
                let lastFg = null;
                let lastBg = null;

                for (let x = 0; x < width; x++) {
                    // Top pixel
                    const topIdx = (y * width + x) * 4;
                    const topR = pixels[topIdx];
                    const topG = pixels[topIdx + 1];
                    const topB = pixels[topIdx + 2];
                    const topA = pixels[topIdx + 3];

                    // Bottom pixel (may not exist on last row)
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

                    let char, fgCode, bgCode;
                    let fgColor, bgColor;

                    if (topTransparent && botTransparent) {
                        // Both transparent - just a space
                        char = ' ';
                        fgCode = null;
                        bgCode = null;
                        fgColor = null;
                        bgColor = null;
                    } else if (topTransparent) {
                        // Only bottom visible - use lower half block with fg color
                        char = '▄';
                        fgCode = rgbaToAnsi(botR, botG, botB, botA, useTrue24bit);
                        bgCode = null;
                        fgColor = `rgb(${botR},${botG},${botB})`;
                        bgColor = null;
                    } else if (botTransparent) {
                        // Only top visible - use upper half block with fg color
                        char = '▀';
                        fgCode = rgbaToAnsi(topR, topG, topB, topA, useTrue24bit);
                        bgCode = null;
                        fgColor = `rgb(${topR},${topG},${topB})`;
                        bgColor = null;
                    } else {
                        // Both visible - upper half with fg=top, bg=bottom
                        char = '▀';
                        fgCode = rgbaToAnsi(topR, topG, topB, topA, useTrue24bit);
                        bgCode = rgbaToBgAnsi(botR, botG, botB, botA, useTrue24bit);
                        fgColor = `rgb(${topR},${topG},${topB})`;
                        bgColor = `rgb(${botR},${botG},${botB})`;
                    }

                    // Build ANSI sequence (optimize by only changing when needed)
                    let ansiSeq = '';
                    if (fgCode !== lastFg || bgCode !== lastBg) {
                        const codes = [];
                        if (fgCode) codes.push(fgCode);
                        if (bgCode) codes.push(bgCode);
                        if (codes.length > 0) {
                            ansiSeq = `\x1b[${codes.join(';')}m`;
                        } else {
                            ansiSeq = '\x1b[0m';
                        }
                        lastFg = fgCode;
                        lastBg = bgCode;
                    }

                    lineAnsi += ansiSeq + char;

                    // Build HTML output
                    let style = '';
                    if (fgColor) style += `color:${fgColor};`;
                    if (bgColor) style += `background:${bgColor};`;
                    if (style) {
                        lineHtml += `<span style="${style}">${char}</span>`;
                    } else {
                        lineHtml += char;
                    }
                }

                output += lineAnsi + '\x1b[0m\n';
                htmlOutput += lineHtml + '\n';
            }
        } else {
            // Standard mode: each pixel becomes 2 spaces with background color
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

                    // Build ANSI sequence
                    let ansiSeq = '';
                    if (bgCode !== lastBg) {
                        if (bgCode) {
                            ansiSeq = `\x1b[${bgCode}m`;
                        } else {
                            ansiSeq = '\x1b[0m';
                        }
                        lastBg = bgCode;
                    }

                    lineAnsi += ansiSeq + '  '; // Two spaces per pixel

                    // Build HTML output
                    if (bgColor) {
                        lineHtml += `<span style="background:${bgColor}">  </span>`;
                    } else {
                        lineHtml += '  ';
                    }
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

    /**
     * Get palette color by index
     */
    function getPaletteColor(index) {
        if (index >= 0 && index < 256) {
            return palette[index];
        }
        return [0, 0, 0];
    }

    // Export public API
    window.ImageToAnsi = {
        loadImage,
        readFile,
        processImage,
        escapeForPrintf,
        rgbToAnsi256,
        getPaletteColor,
        palette
    };

})(window);
