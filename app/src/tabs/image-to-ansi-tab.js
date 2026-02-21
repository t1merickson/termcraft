/**
 * Image to ANSI Tab
 */

import * as ImageToAnsi from '../engines/image-to-ansi.js';
import { showToast, copyToClipboard, loadImage, readFileAsDataURL, toggleHTML } from '../utils.js';
import { terminalControlsHTML, initTerminalControls } from '../terminal-controls.js';
import { icon } from '../icons.js';

const template = `
<div class="mx-auto max-w-[1400px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Image to ANSI</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Convert images to ANSI 256 color terminal art</p>

    <!-- Upload Area -->
    <div class="upload-area mb-5 cursor-pointer rounded-md border-2 border-dashed border-gray-400 bg-background-200 p-12 text-center transition-colors hover:border-gray-600 hover:bg-gray-100" id="upload-area">
        <div class="upload-prompt" id="upload-prompt">
            <div class="mb-4 flex justify-center opacity-50">${icon('arrowCircleUp', 48)}</div>
            <p class="mb-2 text-gray-900">Drop an image here or click to upload</p>
            <p class="inline-flex items-center gap-1.5 text-xs text-gray-600">
                ${icon('informationFill', 16, 'shrink-0 text-gray-900')}
                <span>Supports PNG, JPG, GIF, WebP</span>
            </p>
        </div>
        <div class="flex items-center gap-4" id="upload-loaded" style="display:none">
            <img id="source-image" alt="Source image" class="max-h-20 max-w-[120px] rounded-sm object-contain">
            <div class="flex flex-col gap-1">
                <div class="text-[13px] text-gray-900" id="source-info"></div>
                <p class="text-xs text-gray-600">Click or drop to change image</p>
            </div>
        </div>
        <input type="file" id="file-input" accept="image/*" class="hidden">
    </div>

    <!-- Options Panel -->
    <div class="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 class="text-[13px] font-medium text-gray-900">Options</h3>
        <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
                <label for="opt-width" class="text-xs text-gray-900">Max Width</label>
                <input type="number" id="opt-width" value="80" min="10" max="300"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="opt-height" class="text-xs text-gray-900">Max Height</label>
                <input type="number" id="opt-height" value="40" min="10" max="150"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-xs text-gray-900">Scale</label>
                <div class="flex gap-1.5">
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="btn-half" disabled>½×</button>
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="btn-full" disabled>1×</button>
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="btn-double" disabled>2×</button>
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="btn-1to1" disabled>1:1</button>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
                <label for="opt-render" class="text-xs text-gray-900">Render Mode</label>
                <div class="relative">
                    <select id="opt-render"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="half">▀▄ Half Blocks (fg+bg)</option>
                        <option value="halffg">▀▄ Half Blocks (fg only)</option>
                        <option value="quad">▚ Quadrant (fg only)</option>
                        <option value="block">█ Full Block (fg only)</option>
                        <option value="full">██ Spaces (bg only)</option>
                        <option value="binary">Binary (no color)</option>
                    </select>
                    ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="opt-color" class="text-xs text-gray-900">Color Depth</label>
                <div class="relative">
                    <select id="opt-color"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="24bit">24-bit True Color</option>
                        <option value="256">256 Color</option>
                    </select>
                    ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-6">
            ${toggleHTML('opt-invert', 'Invert Brightness')}
            ${toggleHTML('opt-greyscale', 'Greyscale')}
        </div>
    </div>

    <!-- Processing Indicator -->
    <div class="processing" id="processing">
        <div class="geist-loading-dots">
            <span></span><span></span><span></span>
        </div>
        <p>Processing image...</p>
    </div>

    <!-- Preview Area -->
    <div class="preview-area mb-5" id="preview-area">
        <div class="overflow-hidden rounded-md border border-gray-400 bg-background-200">
            <div class="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
                <h4 class="text-[13px] font-medium text-gray-900">ANSI Output</h4>
                <div class="flex gap-2">
                    <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-printf">Copy printf</button>
                    <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-ansi">Copy ANSI</button>
                </div>
            </div>
            ${terminalControlsHTML('ansi', { noWrap: true })}
            <div class="ansi-terminal min-h-[200px] max-h-[700px] overflow-auto p-4" id="ansi-terminal"></div>
        </div>
    </div>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const uploadArea = container.querySelector('#upload-area');
    const fileInput = container.querySelector('#file-input');
    const processing = container.querySelector('#processing');
    const previewArea = container.querySelector('#preview-area');
    const sourceImage = container.querySelector('#source-image');
    const sourceInfo = container.querySelector('#source-info');
    const ansiTerminal = container.querySelector('#ansi-terminal');
    const optWidth = container.querySelector('#opt-width');
    const optHeight = container.querySelector('#opt-height');
    const optRender = container.querySelector('#opt-render');
    const optColor = container.querySelector('#opt-color');
    const optInvert = container.querySelector('#opt-invert');
    const optGreyscale = container.querySelector('#opt-greyscale');
    const btnHalf = container.querySelector('#btn-half');
    const btnFull = container.querySelector('#btn-full');
    const btnDouble = container.querySelector('#btn-double');
    const btn1to1 = container.querySelector('#btn-1to1');

    let currentAnsiOutput = '';
    let currentPrintfOutput = '';
    let sourceWidth = 0;
    let sourceHeight = 0;
    let is1to1Mode = false;

    function getRenderMode() {
        const base = optRender.value;
        if (base === 'binary') return 'binary';
        const color = optColor.value;
        const suffix = is1to1Mode ? '-1x' : '';
        return `${base}-${color}${suffix}`;
    }

    function set1to1Mode(enabled) {
        is1to1Mode = enabled;
        optWidth.disabled = enabled;
        optHeight.disabled = enabled;
        btn1to1.classList.toggle('active', enabled);
        optWidth.style.opacity = enabled ? '0.5' : '1';
        optHeight.style.opacity = enabled ? '0.5' : '1';
    }

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
        try {
            const dataUrl = await readFileAsDataURL(file);
            const img = await loadImage(dataUrl);

            sourceImage.src = dataUrl;
            sourceWidth = img.width;
            sourceHeight = img.height;
            sourceInfo.textContent = `${img.width} × ${img.height} pixels`;

            container.querySelector('#upload-prompt').style.display = 'none';
            container.querySelector('#upload-loaded').style.display = 'flex';
            uploadArea.classList.add('has-image');

            btnHalf.disabled = false;
            btnFull.disabled = false;
            btnDouble.disabled = false;
            btn1to1.disabled = false;

            const result = ImageToAnsi.processImage(img, {
                maxWidth: parseInt(optWidth.value) || 80,
                maxHeight: parseInt(optHeight.value) || 40,
                renderMode: getRenderMode(),
                invert: optInvert.checked,
                greyscale: optGreyscale.checked
            });

            currentAnsiOutput = result.ansi;
            currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;

            ansiTerminal.innerHTML = `<code>${result.html}</code>`;

            processing.classList.remove('visible');
            previewArea.classList.add('visible');

        } catch (error) {
            console.error('Error processing image:', error);
            processing.classList.remove('visible');
            showToast('Error processing image');
        }
    }

    function reprocessImage() {
        if (sourceImage.src && sourceImage.src !== window.location.href) {
            loadImage(sourceImage.src).then(img => {
                const result = ImageToAnsi.processImage(img, {
                    maxWidth: parseInt(optWidth.value) || 80,
                    maxHeight: parseInt(optHeight.value) || 40,
                    renderMode: getRenderMode(),
                    invert: optInvert.checked,
                    greyscale: optGreyscale.checked
                });

                currentAnsiOutput = result.ansi;
                currentPrintfOutput = `printf "${ImageToAnsi.escapeForPrintf(result.ansi)}"`;
                ansiTerminal.innerHTML = `<code>${result.html}</code>`;
            });
        }
    }

    [optWidth, optHeight, optRender, optColor, optInvert, optGreyscale].forEach(opt => {
        opt.addEventListener('change', reprocessImage);
    });

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

    container.querySelector('#copy-ansi').addEventListener('click', async () => {
        if (currentAnsiOutput) {
            await copyToClipboard(currentAnsiOutput);
            showToast('ANSI codes copied!');
        }
    });

    container.querySelector('#copy-printf').addEventListener('click', async () => {
        if (currentPrintfOutput) {
            await copyToClipboard(currentPrintfOutput);
            showToast('printf command copied!');
        }
    });

    const previewControls = initTerminalControls(container, ansiTerminal, 'ansi');
    previewControls.update();
}
