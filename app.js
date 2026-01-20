/**
 * ANSI 256 Color Tools - Main Application
 * Requires: ansi256.js, image-to-ansi.js
 */

(function() {
    'use strict';

    // ============================================================
    // Derived Color Data
    // ============================================================

    // Add HSL to each palette color
    const colorData = ANSI256.PALETTE.map(c => ({
        ...c,
        hsl: ANSI256.rgbToHsl(c.r, c.g, c.b)
    }));

    // Separate chromatic and grayscale colors
    const chromaticColors = colorData.filter(c => !ANSI256.isGrayscale(c.r, c.g, c.b));
    const grayscaleColors = colorData.filter(c => ANSI256.isGrayscale(c.r, c.g, c.b));
    grayscaleColors.sort((a, b) => a.hsl.l - b.hsl.l);

    // Quick lookup by ID
    const colorMap = {};
    colorData.forEach(c => { colorMap[c.id] = c; });

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
    // Toast & Clipboard
    // ============================================================

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

    // ============================================================
    // Color Wheel Tab
    // ============================================================

    const wheelContainer = document.getElementById('wheel-container');
    const grayscaleStrip = document.getElementById('grayscale-strip');
    const tooltip = document.getElementById('tooltip');

    const containerSize = 600;
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    const minRadius = 40;
    const maxRadius = 280;

    // Build color wheel
    chromaticColors.forEach(color => {
        const angle = color.hsl.h * (Math.PI / 180);
        const radius = minRadius + (color.hsl.l / 100) * (maxRadius - minRadius);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY - radius * Math.sin(angle);

        const div = document.createElement('div');
        div.className = 'color-cell';
        div.style.backgroundColor = ANSI256.rgbToHex(color.r, color.g, color.b);
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.innerHTML = `<span class="code">${color.id}</span>`;
        div.dataset.code = color.id;
        wheelContainer.appendChild(div);
    });

    // Build grayscale strip
    grayscaleColors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'grayscale-cell';
        div.style.backgroundColor = ANSI256.rgbToHex(color.r, color.g, color.b);
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.innerHTML = `<span class="code">${color.id}</span>`;
        div.dataset.code = color.id;
        grayscaleStrip.appendChild(div);
    });

    // Tooltip behavior
    function setupTooltip(cell) {
        cell.addEventListener('mouseenter', () => {
            const color = colorMap[cell.dataset.code];
            if (!color) return;

            const hex = ANSI256.rgbToHex(color.r, color.g, color.b);
            document.getElementById('tooltip-color').style.backgroundColor = hex;
            document.getElementById('tooltip-ansi').textContent = color.id;
            document.getElementById('tooltip-name').textContent = color.name;
            document.getElementById('tooltip-hex').textContent = hex;
            document.getElementById('tooltip-rgb').textContent = `${color.r}, ${color.g}, ${color.b}`;
            document.getElementById('tooltip-hsl').textContent = `${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%`;
            document.getElementById('tooltip-escape').textContent = ANSI256.fgEscapeString(color.id);
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
            const escapeCode = ANSI256.fgEscapeString(cell.dataset.code);
            await copyToClipboard(escapeCode);
            showToast(`Copied: ${escapeCode}`);
        });
    }

    document.querySelectorAll('.color-cell').forEach(setupTooltip);
    document.querySelectorAll('.grayscale-cell').forEach(setupTooltip);

    // Mode Selector
    const grayscaleIds = new Set(grayscaleColors.map(c => c.id));
    const ansi16Ids = new Set(Array.from({ length: 16 }, (_, i) => i));

    document.getElementById('mode-swatch-grayscale').style.backgroundColor =
        ANSI256.rgbToHex(colorMap[0].r, colorMap[0].g, colorMap[0].b);
    document.getElementById('mode-swatch-ansi16').style.backgroundColor =
        ANSI256.rgbToHex(colorMap[1].r, colorMap[1].g, colorMap[1].b);
    document.getElementById('mode-swatch-ansi256').style.backgroundColor =
        ANSI256.rgbToHex(colorMap[17].r, colorMap[17].g, colorMap[17].b);

    function setMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        document.querySelectorAll('.color-cell, .grayscale-cell').forEach(cell => {
            const id = parseInt(cell.dataset.code);
            const visible = mode === 'ansi256' ||
                (mode === 'grayscale' && grayscaleIds.has(id)) ||
                (mode === 'ansi16' && ansi16Ids.has(id));
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

    function showLookupResult(r, g, b) {
        const result = ANSI256.findNearest(r, g, b, 'euclidean');
        const ansi = result.color;
        const inputHex = ANSI256.rgbToHex(r, g, b);
        const ansiHex = ANSI256.rgbToHex(ansi.r, ansi.g, ansi.b);
        const ansiHsl = ANSI256.rgbToHsl(ansi.r, ansi.g, ansi.b);

        document.getElementById('result-input-swatch').style.backgroundColor = inputHex;
        document.getElementById('result-ansi-swatch').style.backgroundColor = ansiHex;
        document.getElementById('result-ansi-label').textContent = `ANSI ${ansi.id}`;
        document.getElementById('result-code').textContent = ansi.id;
        document.getElementById('result-name').textContent = ansi.name;
        document.getElementById('result-hex').textContent = ansiHex;
        document.getElementById('result-rgb').textContent = `${ansi.r}, ${ansi.g}, ${ansi.b}`;
        document.getElementById('result-hsl').textContent = `${ansiHsl.h}°, ${ansiHsl.s}%, ${ansiHsl.l}%`;
        document.getElementById('result-distance').textContent = result.distance.toFixed(2);
        document.getElementById('result-escape').textContent = ANSI256.fgEscapeString(ansi.id);

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
        const rgb = ANSI256.hexToRgb(val);
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
        const rgb = ANSI256.hslToRgb(h, s, l);
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

    // File upload
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
        if (file) processFile(file);
    });

    async function processFile(file) {
        processing.classList.add('visible');
        previewArea.classList.remove('visible');
        escapeOutput.classList.remove('visible');

        try {
            const dataUrl = await ImageToAnsi.readFile(file);
            const img = await ImageToAnsi.loadImage(dataUrl);

            sourceImage.src = dataUrl;
            sourceInfo.textContent = `${img.width} × ${img.height} pixels`;

            const result = ImageToAnsi.processImage(img, {
                maxWidth: parseInt(optWidth.value) || 80,
                maxHeight: parseInt(optHeight.value) || 40,
                useUnicode: optUnicode.checked,
                useTrue24bit: optMode.value === 'true'
            });

            currentAnsiOutput = result.ansi;
            currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;

            ansiTerminal.innerHTML = result.html;
            escapeCode.textContent = currentPrintfOutput;

            processing.classList.remove('visible');
            previewArea.classList.add('visible');
            escapeOutput.classList.add('visible');

        } catch (error) {
            console.error('Error processing image:', error);
            processing.classList.remove('visible');
            showToast('Error processing image');
        }
    }

    // Re-process on option change
    [optWidth, optHeight, optMode, optUnicode].forEach(opt => {
        opt.addEventListener('change', () => {
            if (sourceImage.src && sourceImage.src !== window.location.href) {
                ImageToAnsi.loadImage(sourceImage.src).then(img => {
                    const result = ImageToAnsi.processImage(img, {
                        maxWidth: parseInt(optWidth.value) || 80,
                        maxHeight: parseInt(optHeight.value) || 40,
                        useUnicode: optUnicode.checked,
                        useTrue24bit: optMode.value === 'true'
                    });

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
