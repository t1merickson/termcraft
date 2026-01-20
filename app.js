/**
 * ANSI 256 Color Tools - Main Application
 */

(function() {
    'use strict';

    // ============================================================
    // ANSI 256 Color Generation - Computed from First Principles
    // ============================================================

    const standard16 = [
        { colorId: 0,  rgb: { r: 0,   g: 0,   b: 0   }, name: 'Black' },
        { colorId: 1,  rgb: { r: 128, g: 0,   b: 0   }, name: 'Maroon' },
        { colorId: 2,  rgb: { r: 0,   g: 128, b: 0   }, name: 'Green' },
        { colorId: 3,  rgb: { r: 128, g: 128, b: 0   }, name: 'Olive' },
        { colorId: 4,  rgb: { r: 0,   g: 0,   b: 128 }, name: 'Navy' },
        { colorId: 5,  rgb: { r: 128, g: 0,   b: 128 }, name: 'Purple' },
        { colorId: 6,  rgb: { r: 0,   g: 128, b: 128 }, name: 'Teal' },
        { colorId: 7,  rgb: { r: 192, g: 192, b: 192 }, name: 'Silver' },
        { colorId: 8,  rgb: { r: 128, g: 128, b: 128 }, name: 'Grey' },
        { colorId: 9,  rgb: { r: 255, g: 0,   b: 0   }, name: 'Red' },
        { colorId: 10, rgb: { r: 0,   g: 255, b: 0   }, name: 'Lime' },
        { colorId: 11, rgb: { r: 255, g: 255, b: 0   }, name: 'Yellow' },
        { colorId: 12, rgb: { r: 0,   g: 0,   b: 255 }, name: 'Blue' },
        { colorId: 13, rgb: { r: 255, g: 0,   b: 255 }, name: 'Fuchsia' },
        { colorId: 14, rgb: { r: 0,   g: 255, b: 255 }, name: 'Aqua' },
        { colorId: 15, rgb: { r: 255, g: 255, b: 255 }, name: 'White' },
    ];

    const cubeValues = [0, 95, 135, 175, 215, 255];

    function generateCubeColors() {
        const colors = [];
        for (let r = 0; r < 6; r++) {
            for (let g = 0; g < 6; g++) {
                for (let b = 0; b < 6; b++) {
                    const colorId = 16 + (r * 36) + (g * 6) + b;
                    colors.push({
                        colorId,
                        rgb: { r: cubeValues[r], g: cubeValues[g], b: cubeValues[b] },
                        name: `Color${colorId}`
                    });
                }
            }
        }
        return colors;
    }

    function generateGrayscaleColors() {
        const colors = [];
        for (let i = 0; i < 24; i++) {
            const gray = 8 + 10 * i;
            const colorId = 232 + i;
            colors.push({
                colorId,
                rgb: { r: gray, g: gray, b: gray },
                name: `Grey${Math.round(gray / 255 * 100)}`
            });
        }
        return colors;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h;
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    function generateAllColors() {
        const allColors = [...standard16, ...generateCubeColors(), ...generateGrayscaleColors()];
        return allColors.map(color => ({
            ...color,
            hsl: rgbToHsl(color.rgb.r, color.rgb.g, color.rgb.b)
        }));
    }

    const colorData = generateAllColors();
    const colorMap = {};
    colorData.forEach(c => { colorMap[c.colorId] = c; });

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function colorDistance(r1, g1, b1, r2, g2, b2) {
        return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
    }

    function findNearestColor(r, g, b) {
        let nearest = null;
        let minDistance = Infinity;
        colorData.forEach(color => {
            const dist = colorDistance(r, g, b, color.rgb.r, color.rgb.g, color.rgb.b);
            if (dist < minDistance) { minDistance = dist; nearest = color; }
        });
        return { color: nearest, distance: minDistance };
    }

    function isGrayscale(color) {
        return color.hsl.s === 0 || color.hsl.s < 5;
    }

    const chromaticColors = colorData.filter(c => !isGrayscale(c));
    const grayscaleColorsAll = colorData.filter(c => isGrayscale(c));
    grayscaleColorsAll.sort((a, b) => a.hsl.l - b.hsl.l);

    // ============================================================
    // Tab Navigation
    // ============================================================
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById('tab-' + item.dataset.tab).classList.add('active');
        });
    });

    // ============================================================
    // Color Wheel Tab
    // ============================================================
    const wheelContainer = document.getElementById('wheel-container');
    const containerSize = 600;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const minRadius = 40;
    const maxRadius = 280;

    chromaticColors.forEach(color => {
        const angle = color.hsl.h * (Math.PI / 180);
        const radius = minRadius + (color.hsl.l / 100) * (maxRadius - minRadius);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY - radius * Math.sin(angle);
        const div = document.createElement('div');
        div.className = 'color-cell';
        div.style.backgroundColor = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`;
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.innerHTML = `<span class="code">${color.colorId}</span>`;
        div.dataset.code = color.colorId;
        wheelContainer.appendChild(div);
    });

    const grayscaleStrip = document.getElementById('grayscale-strip');
    grayscaleColorsAll.forEach(color => {
        const div = document.createElement('div');
        div.className = 'grayscale-cell';
        div.style.backgroundColor = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`;
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.innerHTML = `<span class="code">${color.colorId}</span>`;
        div.dataset.code = color.colorId;
        grayscaleStrip.appendChild(div);
    });

    // Tooltip
    const tooltip = document.getElementById('tooltip');
    const toast = document.getElementById('toast');

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    function setupTooltip(cell) {
        cell.addEventListener('mouseenter', () => {
            const color = colorMap[cell.dataset.code];
            if (!color) return;
            const hex = rgbToHex(color.rgb.r, color.rgb.g, color.rgb.b);
            document.getElementById('tooltip-color').style.backgroundColor = hex;
            document.getElementById('tooltip-ansi').textContent = color.colorId;
            document.getElementById('tooltip-name').textContent = color.name;
            document.getElementById('tooltip-hex').textContent = hex;
            document.getElementById('tooltip-rgb').textContent = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
            document.getElementById('tooltip-hsl').textContent = `${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%`;
            document.getElementById('tooltip-escape').textContent = `\\e[38;5;${color.colorId}m`;
            tooltip.classList.add('visible');
        });
        cell.addEventListener('mousemove', (e) => {
            const x = e.clientX + 15;
            const y = e.clientY + 15;
            const rect = tooltip.getBoundingClientRect();
            tooltip.style.left = Math.min(x, window.innerWidth - rect.width - 10) + 'px';
            tooltip.style.top = Math.min(y, window.innerHeight - rect.height - 10) + 'px';
        });
        cell.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
        cell.addEventListener('click', async () => {
            const escapeCode = `\\e[38;5;${cell.dataset.code}m`;
            await copyToClipboard(escapeCode);
            showToast(`Copied: ${escapeCode}`);
        });
    }

    document.querySelectorAll('.color-cell').forEach(setupTooltip);
    document.querySelectorAll('.grayscale-cell').forEach(setupTooltip);

    // Mode Selector
    const grayscaleIds = new Set(grayscaleColorsAll.map(c => c.colorId));
    const ansi16Ids = new Set(Array.from({length: 16}, (_, i) => i));

    document.getElementById('mode-swatch-grayscale').style.backgroundColor = rgbToHex(colorMap[0].rgb.r, colorMap[0].rgb.g, colorMap[0].rgb.b);
    document.getElementById('mode-swatch-ansi16').style.backgroundColor = rgbToHex(colorMap[1].rgb.r, colorMap[1].rgb.g, colorMap[1].rgb.b);
    document.getElementById('mode-swatch-ansi256').style.backgroundColor = rgbToHex(colorMap[17].rgb.r, colorMap[17].rgb.g, colorMap[17].rgb.b);

    function setMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        document.querySelectorAll('.color-cell, .grayscale-cell').forEach(cell => {
            const id = parseInt(cell.dataset.code);
            let visible = mode === 'ansi256' || (mode === 'grayscale' && grayscaleIds.has(id)) || (mode === 'ansi16' && ansi16Ids.has(id));
            cell.classList.toggle('hidden', !visible);
        });
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // ============================================================
    // Lookup Tab
    // ============================================================
    const lookupResult = document.getElementById('lookup-result');

    function showLookupResult(inputR, inputG, inputB) {
        const result = findNearestColor(inputR, inputG, inputB);
        const ansi = result.color;
        const inputHex = rgbToHex(inputR, inputG, inputB);
        const ansiHex = rgbToHex(ansi.rgb.r, ansi.rgb.g, ansi.rgb.b);

        document.getElementById('result-input-swatch').style.backgroundColor = inputHex;
        document.getElementById('result-ansi-swatch').style.backgroundColor = ansiHex;
        document.getElementById('result-ansi-label').textContent = `ANSI ${ansi.colorId}`;
        document.getElementById('result-code').textContent = ansi.colorId;
        document.getElementById('result-name').textContent = ansi.name;
        document.getElementById('result-hex').textContent = ansiHex;
        document.getElementById('result-rgb').textContent = `${ansi.rgb.r}, ${ansi.rgb.g}, ${ansi.rgb.b}`;
        document.getElementById('result-hsl').textContent = `${ansi.hsl.h}°, ${ansi.hsl.s}%, ${ansi.hsl.l}%`;
        document.getElementById('result-distance').textContent = result.distance.toFixed(2);
        document.getElementById('result-escape').textContent = `\\e[38;5;${ansi.colorId}m`;

        lookupResult.classList.add('visible');
    }

    // HEX input
    const hexInput = document.getElementById('lookup-hex');
    const hexPreview = document.getElementById('preview-hex');
    hexInput.addEventListener('input', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{3}$/.test(val) || /^#[0-9A-Fa-f]{6}$/.test(val)) {
            hexPreview.style.backgroundColor = val;
        }
    });
    document.getElementById('lookup-hex-btn').addEventListener('click', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (!/^#[0-9A-Fa-f]{6}$/.test(val) && !/^#[0-9A-Fa-f]{3}$/.test(val)) return;
        const rgb = hexToRgb(val);
        showLookupResult(rgb.r, rgb.g, rgb.b);
    });

    // RGB input
    const rInput = document.getElementById('lookup-r');
    const gInput = document.getElementById('lookup-g');
    const bInput = document.getElementById('lookup-b');
    const rgbPreview = document.getElementById('preview-rgb');
    function updateRgbPreview() {
        const r = parseInt(rInput.value) || 0;
        const g = parseInt(gInput.value) || 0;
        const b = parseInt(bInput.value) || 0;
        rgbPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }
    [rInput, gInput, bInput].forEach(inp => inp.addEventListener('input', updateRgbPreview));
    document.getElementById('lookup-rgb-btn').addEventListener('click', () => {
        const r = Math.min(255, Math.max(0, parseInt(rInput.value) || 0));
        const g = Math.min(255, Math.max(0, parseInt(gInput.value) || 0));
        const b = Math.min(255, Math.max(0, parseInt(bInput.value) || 0));
        showLookupResult(r, g, b);
    });

    // HSL input
    const hInput = document.getElementById('lookup-h');
    const sInput = document.getElementById('lookup-s');
    const lInput = document.getElementById('lookup-l');
    const hslPreview = document.getElementById('preview-hsl');
    function updateHslPreview() {
        const h = parseInt(hInput.value) || 0;
        const s = parseInt(sInput.value) || 0;
        const l = parseInt(lInput.value) || 0;
        hslPreview.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
    }
    [hInput, sInput, lInput].forEach(inp => inp.addEventListener('input', updateHslPreview));
    document.getElementById('lookup-hsl-btn').addEventListener('click', () => {
        const h = Math.min(360, Math.max(0, parseInt(hInput.value) || 0));
        const s = Math.min(100, Math.max(0, parseInt(sInput.value) || 0));
        const l = Math.min(100, Math.max(0, parseInt(lInput.value) || 0));
        const rgb = hslToRgb(h, s, l);
        showLookupResult(rgb.r, rgb.g, rgb.b);
    });

    // ============================================================
    // Image to ANSI Tab
    // ============================================================
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const processing = document.getElementById('processing');
    const previewArea = document.getElementById('preview-area');
    const sourceImage = document.getElementById('source-image');
    const sourceInfo = document.getElementById('source-info');
    const ansiTerminal = document.getElementById('ansi-terminal');
    const escapeOutput = document.getElementById('escape-output');
    const escapeCode = document.getElementById('escape-code');

    const optWidth = document.getElementById('opt-width');
    const optHeight = document.getElementById('opt-height');
    const optMode = document.getElementById('opt-mode');
    const optUnicode = document.getElementById('opt-unicode');

    let currentAnsiOutput = '';
    let currentPrintfOutput = '';

    // File upload handling
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            processFile(file);
        }
    });

    async function processFile(file) {
        // Show processing
        processing.classList.add('visible');
        previewArea.classList.remove('visible');
        escapeOutput.classList.remove('visible');

        try {
            // Read file
            const dataUrl = await ImageToAnsi.readFile(file);

            // Load image
            const img = await ImageToAnsi.loadImage(dataUrl);

            // Show source preview
            sourceImage.src = dataUrl;
            sourceInfo.textContent = `${img.width} × ${img.height} pixels`;

            // Process image
            const options = {
                maxWidth: parseInt(optWidth.value) || 80,
                maxHeight: parseInt(optHeight.value) || 40,
                useUnicode: optUnicode.checked,
                useTrue24bit: optMode.value === 'true'
            };

            const result = ImageToAnsi.processImage(img, options);

            // Store outputs
            currentAnsiOutput = result.ansi;
            currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;

            // Display HTML preview
            ansiTerminal.innerHTML = result.html;

            // Display printf command
            escapeCode.textContent = currentPrintfOutput;

            // Show results
            processing.classList.remove('visible');
            previewArea.classList.add('visible');
            escapeOutput.classList.add('visible');

        } catch (error) {
            console.error('Error processing image:', error);
            processing.classList.remove('visible');
            showToast('Error processing image');
        }
    }

    // Re-process when options change
    [optWidth, optHeight, optMode, optUnicode].forEach(opt => {
        opt.addEventListener('change', () => {
            if (sourceImage.src && sourceImage.src !== window.location.href) {
                // Re-process with new options
                ImageToAnsi.loadImage(sourceImage.src).then(img => {
                    const options = {
                        maxWidth: parseInt(optWidth.value) || 80,
                        maxHeight: parseInt(optHeight.value) || 40,
                        useUnicode: optUnicode.checked,
                        useTrue24bit: optMode.value === 'true'
                    };

                    const result = ImageToAnsi.processImage(img, options);
                    currentAnsiOutput = result.ansi;
                    currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;
                    ansiTerminal.innerHTML = result.html;
                    escapeCode.textContent = currentPrintfOutput;
                });
            }
        });
    });

    // Copy buttons
    document.getElementById('copy-ansi').addEventListener('click', async () => {
        if (currentAnsiOutput) {
            await copyToClipboard(currentAnsiOutput);
            showToast('ANSI codes copied!');
        }
    });

    document.getElementById('copy-printf').addEventListener('click', async () => {
        if (currentPrintfOutput) {
            await copyToClipboard(currentPrintfOutput);
            showToast('printf command copied!');
        }
    });

})();
