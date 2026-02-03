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
    const optRender = document.getElementById('opt-render');
    const optColor = document.getElementById('opt-color');
    const btnHalf = document.getElementById('btn-half');
    const btnFull = document.getElementById('btn-full');
    const btnDouble = document.getElementById('btn-double');
    const btn1to1 = document.getElementById('btn-1to1');

    let currentAnsiOutput = '';
    let currentPrintfOutput = '';
    let sourceWidth = 0;
    let sourceHeight = 0;
    let is1to1Mode = false;

    // Build the full render mode string from UI state
    function getRenderMode() {
        const base = optRender.value;
        if (base === 'binary') return 'binary';
        const color = optColor.value;
        const suffix = is1to1Mode ? '-1x' : '';
        return `${base}-${color}${suffix}`;
    }

    // Update UI state for 1:1 mode
    function set1to1Mode(enabled) {
        is1to1Mode = enabled;
        optWidth.disabled = enabled;
        optHeight.disabled = enabled;
        btn1to1.classList.toggle('active', enabled);
        // Grey out appearance
        optWidth.style.opacity = enabled ? '0.5' : '1';
        optHeight.style.opacity = enabled ? '0.5' : '1';
    }

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
            sourceWidth = img.width;
            sourceHeight = img.height;
            sourceInfo.textContent = `${img.width} × ${img.height} pixels`;

            // Enable preset buttons
            btnHalf.disabled = false;
            btnFull.disabled = false;
            btnDouble.disabled = false;
            btn1to1.disabled = false;

            const result = ImageToAnsi.processImage(img, {
                maxWidth: parseInt(optWidth.value) || 80,
                maxHeight: parseInt(optHeight.value) || 40,
                renderMode: getRenderMode()
            });

            currentAnsiOutput = result.ansi;
            currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;

            ansiTerminal.innerHTML = `<code>${result.html}</code>`;
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
    function reprocessImage() {
        if (sourceImage.src && sourceImage.src !== window.location.href) {
            ImageToAnsi.loadImage(sourceImage.src).then(img => {
                const result = ImageToAnsi.processImage(img, {
                    maxWidth: parseInt(optWidth.value) || 80,
                    maxHeight: parseInt(optHeight.value) || 40,
                    renderMode: getRenderMode()
                });

                currentAnsiOutput = result.ansi;
                currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;
                ansiTerminal.innerHTML = `<code>${result.html}</code>`;
                escapeCode.textContent = currentPrintfOutput;
            });
        }
    }

    [optWidth, optHeight, optRender, optColor].forEach(opt => {
        opt.addEventListener('change', reprocessImage);
    });

    // Preset buttons
    btnHalf.addEventListener('click', () => {
        if (sourceWidth && sourceHeight) {
            set1to1Mode(false);
            optWidth.value = Math.floor(sourceWidth / 2);
            optHeight.value = Math.floor(sourceHeight / 2);
            reprocessImage();
        }
    });

    btnFull.addEventListener('click', () => {
        if (sourceWidth && sourceHeight) {
            set1to1Mode(false);
            optWidth.value = sourceWidth;
            optHeight.value = sourceHeight;
            reprocessImage();
        }
    });

    btnDouble.addEventListener('click', () => {
        if (sourceWidth && sourceHeight) {
            set1to1Mode(false);
            optWidth.value = sourceWidth * 2;
            optHeight.value = sourceHeight * 2;
            reprocessImage();
        }
    });

    btn1to1.addEventListener('click', () => {
        if (sourceWidth && sourceHeight) {
            set1to1Mode(!is1to1Mode);
            reprocessImage();
        }
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

    // Preview controls
    const ctrlFontSize = document.getElementById('ctrl-font-size');
    const ctrlFontSizeVal = document.getElementById('ctrl-font-size-val');
    const ctrlLineHeight = document.getElementById('ctrl-line-height');
    const ctrlLineHeightVal = document.getElementById('ctrl-line-height-val');
    const ctrlLetterSpacing = document.getElementById('ctrl-letter-spacing');
    const ctrlLetterSpacingVal = document.getElementById('ctrl-letter-spacing-val');
    const ctrlNoWrap = document.getElementById('ctrl-no-wrap');

    function updatePreviewStyles() {
        const fontSize = ctrlFontSize.value;
        const lineHeight = ctrlLineHeight.value / 100;
        const letterSpacing = ctrlLetterSpacing.value;

        ansiTerminal.style.setProperty('--preview-font-size', fontSize + 'px');
        ansiTerminal.style.setProperty('--preview-line-height', lineHeight);
        ansiTerminal.style.setProperty('--preview-letter-spacing', letterSpacing + 'px');

        ctrlFontSizeVal.textContent = fontSize + 'px';
        ctrlLineHeightVal.textContent = lineHeight.toFixed(2);
        ctrlLetterSpacingVal.textContent = letterSpacing + 'px';

        ansiTerminal.classList.toggle('no-wrap', ctrlNoWrap.checked);
    }

    ctrlFontSize.addEventListener('input', updatePreviewStyles);
    ctrlLineHeight.addEventListener('input', updatePreviewStyles);
    ctrlLetterSpacing.addEventListener('input', updatePreviewStyles);
    ctrlNoWrap.addEventListener('change', updatePreviewStyles);

    // Initialize
    updatePreviewStyles();

    // ============================================================
    // Pixel Font Tab
    // ============================================================

    const fontPreview = document.getElementById('font-preview');
    const fontText = document.getElementById('font-text');
    const fontTerminal = document.getElementById('font-terminal');
    const fontOutput = document.getElementById('font-output');
    const fontSelect = document.getElementById('font-select');

    let currentFontAnsi = '';
    let currentFontPrintf = '';
    let fontIndex = [];

    function renderFontPreview() {
        const letters = PixelFont.getLetters();
        const meta = PixelFont.getMeta();
        const glyphKeys = Object.keys(PixelFont.getFontData());
        const charset = (meta && meta.charset)
            ? meta.charset.split('')
            : glyphKeys.sort((a, b) => a.localeCompare(b));

        let previewHtml = '<div class="font-letter-grid">';
        for (const char of charset) {
            if (!letters[char]) continue;
            previewHtml += `<div class="font-letter" data-letter="${char}">
                <code class="font-letter-ansi">${letters[char].html}</code>
                <span class="font-letter-label">${char}</span>
            </div>`;
        }
        previewHtml += '</div>';
        fontPreview.innerHTML = previewHtml;

        // Setup letter click to copy
        fontPreview.querySelectorAll('.font-letter').forEach(el => {
            el.addEventListener('click', async () => {
                const char = el.dataset.letter;
                const escape = letters[char].ansi;
                await copyToClipboard(escape);
                showToast(`Copied letter ${char}`);
            });
        });
    }

    async function loadFontByPath(path) {
        await PixelFont.loadFont(path);
        renderFontPreview();
        renderFontText();
    }

    async function loadFontIndex() {
        const response = await fetch('fonts/index.json');
        if (!response.ok) {
            throw new Error('Failed to load fonts index');
        }
        return response.json();
    }

    function populateFontSelect() {
        fontSelect.innerHTML = '';
        fontIndex.forEach((font, idx) => {
            const option = document.createElement('option');
            option.value = font.id;
            option.textContent = font.name || font.id;
            if (idx === 0) option.selected = true;
            fontSelect.appendChild(option);
        });
    }

    // Auto-load font on page load
    loadFontIndex().then((fonts) => {
        fontIndex = Array.isArray(fonts) ? fonts : [];
        if (fontIndex.length === 0) {
            throw new Error('No fonts found in index');
        }
        populateFontSelect();
        return loadFontByPath(fontIndex[0].path);
    }).catch(err => {
        fontPreview.innerHTML = '<div class="font-error">Failed to load font</div>';
        console.error('Font load error:', err);
    });

    fontSelect.addEventListener('change', async () => {
        const selected = fontIndex.find(f => f.id === fontSelect.value);
        if (!selected) return;
        try {
            await loadFontByPath(selected.path);
        } catch (err) {
            fontPreview.innerHTML = '<div class="font-error">Failed to load font</div>';
            console.error('Font load error:', err);
        }
    });

    // Render text helper
    function renderFontText() {
        if (!PixelFont.isLoaded()) return;

        const text = fontText.value;
        if (!text) {
            fontTerminal.innerHTML = '';
            fontOutput.classList.remove('visible');
            return;
        }

        const result = PixelFont.renderText(text);
        currentFontAnsi = result.ansi;
        currentFontPrintf = `printf "${escapeForPrintf(result.ansi)}"`;

        fontTerminal.innerHTML = `<code>${result.html}</code>`;
        fontOutput.classList.add('visible');
    }

    // Render text on input or toggle change
    fontText.addEventListener('input', renderFontText);

    function escapeForPrintf(ansi) {
        return ansi
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\x1b/g, '\\033');
    }

    // Copy buttons for font tab
    document.getElementById('copy-font-ansi').addEventListener('click', async () => {
        if (currentFontAnsi) {
            await copyToClipboard(currentFontAnsi);
            showToast('ANSI copied!');
        }
    });

    document.getElementById('copy-font-printf').addEventListener('click', async () => {
        if (currentFontPrintf) {
            await copyToClipboard(currentFontPrintf);
            showToast('printf command copied!');
        }
    });

})();
