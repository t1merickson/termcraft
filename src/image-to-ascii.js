/**
 * Image to ASCII Converter
 *
 * Converts images to ASCII art using character brightness mapping
 * or shape-aware 6D vector matching.
 */

import { rgbToAnsi256 } from './ansi256.js';
import * as ShapeVectors from './shape-vectors.js';

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
export function loadImage(src) {
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
export function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function getLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getCharForLuminance(luminance, charset, invert) {
    if (invert) luminance = 255 - luminance;
    const index = Math.floor((luminance / 256) * charset.length);
    return charset[Math.min(index, charset.length - 1)];
}

function rgbaToFgAnsi(r, g, b, a, useTrue24bit) {
    if (a < 32) return null;

    if (useTrue24bit) {
        return `38;2;${r};${g};${b}`;
    }
    return `38;5;${rgbToAnsi256(r, g, b)}`;
}

function calcOutputDimensions(imgWidth, imgHeight, maxWidth, maxHeight) {
    const aspectRatio = imgWidth / imgHeight;
    const charAspect = 2;

    let width, height;
    if (aspectRatio > (maxWidth / maxHeight) * charAspect) {
        width = maxWidth;
        height = Math.round(maxWidth / aspectRatio / charAspect);
    } else {
        height = maxHeight;
        width = Math.round(maxHeight * aspectRatio * charAspect);
    }

    return {
        width: Math.max(1, width),
        height: Math.max(1, height)
    };
}

/**
 * Process an image and convert to ASCII art
 */
export function processImage(img, options = {}) {
    const {
        maxWidth = 80,
        maxHeight = 40,
        charset = 'standard',
        colorMode = 'none',
        invert = false,
        greyscale = false,
        mode = 'brightness',
        contrastExponent = 2.0,
        directionalContrast = false
    } = options;

    const charsetStr = CHARSETS[charset] || charset || CHARSETS.standard;
    const { width, height } = calcOutputDimensions(img.width, img.height, maxWidth, maxHeight);

    const useColor = colorMode !== 'none';
    const useTrue24bit = colorMode === '24bit';

    const useShape = mode === 'shape';

    const cellW = useShape ? 12 : 1;
    const cellH = useShape ? 18 : 1;

    const canvasW = width * cellW;
    const canvasH = height * cellH;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
    const pixels = imageData.data;

    if (greyscale) {
        for (let i = 0; i < pixels.length; i += 4) {
            const lum = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
            pixels[i] = pixels[i + 1] = pixels[i + 2] = lum;
        }
    }

    let shapeData = null;
    if (useShape) {
        shapeData = ShapeVectors.precompute(charsetStr);
    }

    let ansi = '';
    let html = '';

    for (let row = 0; row < height; row++) {
        let lineAnsi = '';
        let lineHtml = '';
        let lastFg = null;

        for (let col = 0; col < width; col++) {
            const centerPx = Math.floor(col * cellW + cellW / 2);
            const centerPy = Math.floor(row * cellH + cellH / 2);
            const cidx = (centerPy * canvasW + centerPx) * 4;
            const r = pixels[cidx];
            const g = pixels[cidx + 1];
            const b = pixels[cidx + 2];
            const a = pixels[cidx + 3];

            if (a < 32) {
                if (lastFg !== null && useColor) {
                    lineAnsi += '\x1b[0m';
                    lastFg = null;
                }
                lineAnsi += ' ';
                lineHtml += ' ';
                continue;
            }

            let char;

            if (useShape) {
                const vec = ShapeVectors.sampleCell(imageData, col, row, cellW, cellH);

                if (invert) {
                    for (let i = 0; i < 6; i++) vec[i] = 1.0 - vec[i];
                }

                if (directionalContrast) {
                    const ext = ShapeVectors.sampleExternalCircles(imageData, col, row, cellW, cellH);
                    ShapeVectors.applyDirectionalContrast(vec, ext);
                }

                if (contrastExponent !== 1.0) {
                    ShapeVectors.applyGlobalContrast(vec, contrastExponent);
                }

                char = ShapeVectors.findNearest(vec, shapeData.vectors, shapeData.chars);
            } else {
                const luminance = getLuminance(r, g, b);
                char = getCharForLuminance(luminance, charsetStr, invert);
            }

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

    return { ansi, html, width, height };
}

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
export function escapeForPrintf(ansi) {
    return ansi
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\x1b/g, '\\033');
}

/**
 * Get available charset presets
 */
export function getCharsets() {
    return { ...CHARSETS };
}
