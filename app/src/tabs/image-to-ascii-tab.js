/**
 * Image to ASCII Tab
 */

import * as ImageToAscii from '../engines/image-to-ascii.js';
import { showToast, copyToClipboard, loadImage, readFileAsDataURL } from '../utils.js';

const template = `
<div class="mx-auto max-w-[1400px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Image to ASCII</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Convert images to ASCII art using character brightness mapping</p>

    <!-- Upload Area -->
    <div class="upload-area mb-5 cursor-pointer rounded-md border-2 border-dashed border-gray-400 bg-background-200 p-12 text-center transition-colors hover:border-gray-600 hover:bg-gray-100" id="ascii-upload-area">
        <div class="upload-prompt" id="ascii-upload-prompt">
            <div class="mb-4 text-5xl opacity-50">A</div>
            <p class="mb-2 text-gray-900">Drop an image here or click to upload</p>
            <p class="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <svg class="size-4 shrink-0 text-gray-900" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
                </svg>
                <span>Supports PNG, JPG, GIF, WebP</span>
            </p>
        </div>
        <div class="flex items-center gap-4" id="ascii-upload-loaded" style="display:none">
            <img id="ascii-source-image" alt="Source image" class="max-h-20 max-w-[120px] rounded-sm object-contain">
            <div class="flex flex-col gap-1">
                <div class="text-[13px] text-gray-900" id="ascii-source-info"></div>
                <p class="text-xs text-gray-600">Click or drop to change image</p>
            </div>
        </div>
        <input type="file" id="ascii-file-input" accept="image/*" class="hidden">
    </div>

    <!-- Options Panel -->
    <div class="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 class="text-[13px] font-medium text-gray-900">Options</h3>
        <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
                <label for="ascii-opt-width" class="text-xs text-gray-900">Max Width</label>
                <input type="number" id="ascii-opt-width" value="80" min="10" max="300"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="ascii-opt-height" class="text-xs text-gray-900">Max Height</label>
                <input type="number" id="ascii-opt-height" value="40" min="10" max="150"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-xs text-gray-900">Scale</label>
                <div class="flex gap-1.5">
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="ascii-btn-half" disabled>½×</button>
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="ascii-btn-full" disabled>1×</button>
                    <button class="btn-small flex h-10 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-900 transition-colors hover:bg-background-200" id="ascii-btn-double" disabled>2×</button>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
                <label for="ascii-opt-charset" class="text-xs text-gray-900">Character Set</label>
                <div class="relative">
                    <select id="ascii-opt-charset"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="standard">Standard ( .:-=+*#%@)</option>
                        <option value="detailed">Detailed ( .'&grave;:;-~=+*!?#%@)</option>
                        <option value="blocks">Blocks ( ░▒▓█)</option>
                        <option value="simple">Simple ( .*#)</option>
                        <option value="extended">Extended (70 chars)</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="ascii-opt-color" class="text-xs text-gray-900">Color Mode</label>
                <div class="relative">
                    <select id="ascii-opt-color"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="none">None (Plain ASCII)</option>
                        <option value="24bit">24-bit True Color</option>
                        <option value="256">256 Color</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="ascii-opt-mode" class="text-xs text-gray-900">Matching Mode</label>
                <div class="relative">
                    <select id="ascii-opt-mode"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="brightness">Brightness</option>
                        <option value="shape">Shape-Aware</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-6" id="ascii-shape-controls" style="display: none;">
            <div class="flex flex-1 items-center gap-1.5">
                <label for="ascii-opt-contrast" class="whitespace-nowrap text-xs text-gray-900">Contrast</label>
                <input type="range" id="ascii-opt-contrast" min="10" max="40" value="20" class="flex-1">
                <span class="min-w-[35px] text-xs text-gray-700" id="ascii-contrast-val">2.0</span>
            </div>
            <div class="flex items-center gap-2.5">
                <label class="relative inline-block h-[22px] w-10 cursor-pointer">
                    <input type="checkbox" id="ascii-opt-directional" class="peer absolute h-0 w-0 opacity-0">
                    <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[18px]"></span>
                </label>
                <span class="text-xs text-gray-1000">Directional Contrast</span>
            </div>
        </div>
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-2.5">
                <label class="relative inline-block h-[22px] w-10 cursor-pointer">
                    <input type="checkbox" id="ascii-opt-invert" class="peer absolute h-0 w-0 opacity-0">
                    <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[18px]"></span>
                </label>
                <span class="text-sm text-gray-1000">Invert Brightness</span>
            </div>
            <div class="flex items-center gap-2.5">
                <label class="relative inline-block h-[22px] w-10 cursor-pointer">
                    <input type="checkbox" id="ascii-opt-greyscale" class="peer absolute h-0 w-0 opacity-0">
                    <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[18px]"></span>
                </label>
                <span class="text-sm text-gray-1000">Greyscale</span>
            </div>
        </div>
    </div>

    <!-- Processing Indicator -->
    <div class="processing" id="ascii-processing">
        <div class="geist-loading-dots">
            <span></span><span></span><span></span>
        </div>
        <p>Processing image...</p>
    </div>

    <!-- Preview Area -->
    <div class="preview-area mb-5" id="ascii-preview-area">
        <div class="overflow-hidden rounded-md border border-gray-400 bg-background-200">
            <div class="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
                <h4 class="text-[13px] font-medium text-gray-900">ASCII Output</h4>
                <div class="flex gap-2">
                    <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="ascii-copy-ansi">Copy ASCII</button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-gray-400 bg-gray-100 px-4 py-2.5 text-xs text-gray-900">
                <div class="flex items-center gap-1.5">
                    <label for="ascii-ctrl-font-size" class="whitespace-nowrap">Font Size</label>
                    <input type="range" id="ascii-ctrl-font-size" min="4" max="24" value="12">
                    <span class="min-w-[35px] text-gray-700" id="ascii-ctrl-font-size-val">12px</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <label for="ascii-ctrl-line-height" class="whitespace-nowrap">Line Height</label>
                    <input type="range" id="ascii-ctrl-line-height" min="50" max="150" value="100">
                    <span class="min-w-[35px] text-gray-700" id="ascii-ctrl-line-height-val">1.0</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <label for="ascii-ctrl-letter-spacing" class="whitespace-nowrap">Letter Spacing</label>
                    <input type="range" id="ascii-ctrl-letter-spacing" min="-5" max="5" value="0">
                    <span class="min-w-[35px] text-gray-700" id="ascii-ctrl-letter-spacing-val">0px</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <label class="relative inline-block h-[18px] w-8 cursor-pointer">
                        <input type="checkbox" id="ascii-ctrl-no-wrap" checked class="peer absolute h-0 w-0 opacity-0">
                        <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[14px] after:w-[14px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[14px]"></span>
                    </label>
                    <span class="text-xs text-gray-1000">No Wrap</span>
                </div>
            </div>
            <div class="ansi-terminal min-h-[200px] max-h-[700px] overflow-auto p-4" id="ascii-terminal"></div>
        </div>
    </div>

    <!-- Escape Code Output -->
    <div class="panel-hideable mt-5 overflow-hidden rounded-md border border-gray-400 bg-background-200" id="ascii-escape-output">
        <div class="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
            <h4 class="text-[13px] font-medium text-gray-900">Shell Command (printf)</h4>
            <div class="flex gap-2">
                <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="ascii-copy-printf">Copy printf</button>
            </div>
        </div>
        <pre class="max-h-[200px] overflow-auto whitespace-pre-wrap break-all bg-background-100 p-4 font-mono text-[13px] leading-relaxed text-gray-900" id="ascii-escape-code"></pre>
    </div>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const asciiUploadArea = container.querySelector('#ascii-upload-area');
    const asciiFileInput = container.querySelector('#ascii-file-input');
    const asciiProcessing = container.querySelector('#ascii-processing');
    const asciiPreviewArea = container.querySelector('#ascii-preview-area');
    const asciiSourceImage = container.querySelector('#ascii-source-image');
    const asciiSourceInfo = container.querySelector('#ascii-source-info');
    const asciiTerminal = container.querySelector('#ascii-terminal');
    const asciiEscapeOutput = container.querySelector('#ascii-escape-output');
    const asciiEscapeCode = container.querySelector('#ascii-escape-code');

    const asciiOptWidth = container.querySelector('#ascii-opt-width');
    const asciiOptHeight = container.querySelector('#ascii-opt-height');
    const asciiOptCharset = container.querySelector('#ascii-opt-charset');
    const asciiOptColor = container.querySelector('#ascii-opt-color');
    const asciiOptInvert = container.querySelector('#ascii-opt-invert');
    const asciiOptGreyscale = container.querySelector('#ascii-opt-greyscale');
    const asciiOptMode = container.querySelector('#ascii-opt-mode');
    const asciiShapeControls = container.querySelector('#ascii-shape-controls');
    const asciiOptContrast = container.querySelector('#ascii-opt-contrast');
    const asciiContrastVal = container.querySelector('#ascii-contrast-val');
    const asciiOptDirectional = container.querySelector('#ascii-opt-directional');
    const asciiBtnHalf = container.querySelector('#ascii-btn-half');
    const asciiBtnFull = container.querySelector('#ascii-btn-full');
    const asciiBtnDouble = container.querySelector('#ascii-btn-double');

    asciiOptMode.addEventListener('change', () => {
        asciiShapeControls.style.display = asciiOptMode.value === 'shape' ? '' : 'none';
        reprocessAsciiImage();
    });

    asciiOptContrast.addEventListener('input', () => {
        asciiContrastVal.textContent = (parseInt(asciiOptContrast.value) / 10).toFixed(1);
    });

    let currentAsciiOutput = '';
    let currentAsciiPrintf = '';
    let asciiSourceWidth = 0;
    let asciiSourceHeight = 0;

    asciiUploadArea.addEventListener('click', () => asciiFileInput.click());

    asciiUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        asciiUploadArea.classList.add('drag-over');
    });

    asciiUploadArea.addEventListener('dragleave', () => {
        asciiUploadArea.classList.remove('drag-over');
    });

    asciiUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        asciiUploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processAsciiFile(file);
        }
    });

    asciiFileInput.addEventListener('change', () => {
        const file = asciiFileInput.files[0];
        if (file) processAsciiFile(file);
    });

    async function processAsciiFile(file) {
        asciiProcessing.classList.add('visible');
        asciiPreviewArea.classList.remove('visible');
        asciiEscapeOutput.classList.remove('visible');

        try {
            const dataUrl = await readFileAsDataURL(file);
            const img = await loadImage(dataUrl);

            asciiSourceImage.src = dataUrl;
            asciiSourceWidth = img.width;
            asciiSourceHeight = img.height;
            asciiSourceInfo.textContent = `${img.width} × ${img.height} pixels`;

            container.querySelector('#ascii-upload-prompt').style.display = 'none';
            container.querySelector('#ascii-upload-loaded').style.display = 'flex';
            asciiUploadArea.classList.add('has-image');

            asciiBtnHalf.disabled = false;
            asciiBtnFull.disabled = false;
            asciiBtnDouble.disabled = false;

            const result = ImageToAscii.processImage(img, getAsciiOptions());

            currentAsciiOutput = result.ansi;
            currentAsciiPrintf = `printf "${ImageToAscii.escapeForPrintf(result.ansi)}"`;

            asciiTerminal.innerHTML = `<code>${result.html}</code>`;
            asciiEscapeCode.textContent = currentAsciiPrintf;

            asciiProcessing.classList.remove('visible');
            asciiPreviewArea.classList.add('visible');
            asciiEscapeOutput.classList.add('visible');

        } catch (error) {
            console.error('Error processing image:', error);
            asciiProcessing.classList.remove('visible');
            showToast('Error processing image');
        }
    }

    function getAsciiOptions() {
        return {
            maxWidth: parseInt(asciiOptWidth.value) || 80,
            maxHeight: parseInt(asciiOptHeight.value) || 40,
            charset: asciiOptCharset.value,
            colorMode: asciiOptColor.value,
            invert: asciiOptInvert.checked,
            greyscale: asciiOptGreyscale.checked,
            mode: asciiOptMode.value,
            contrastExponent: parseInt(asciiOptContrast.value) / 10,
            directionalContrast: asciiOptDirectional.checked
        };
    }

    function reprocessAsciiImage() {
        if (asciiSourceImage.src && asciiSourceImage.src !== window.location.href) {
            loadImage(asciiSourceImage.src).then(img => {
                const result = ImageToAscii.processImage(img, getAsciiOptions());

                currentAsciiOutput = result.ansi;
                currentAsciiPrintf = `printf "${ImageToAscii.escapeForPrintf(result.ansi)}"`;
                asciiTerminal.innerHTML = `<code>${result.html}</code>`;
                asciiEscapeCode.textContent = currentAsciiPrintf;
            });
        }
    }

    [asciiOptWidth, asciiOptHeight, asciiOptCharset, asciiOptColor, asciiOptInvert, asciiOptGreyscale].forEach(opt => {
        opt.addEventListener('change', reprocessAsciiImage);
    });

    asciiOptContrast.addEventListener('change', reprocessAsciiImage);
    asciiOptDirectional.addEventListener('change', reprocessAsciiImage);

    asciiBtnHalf.addEventListener('click', () => {
        if (asciiSourceWidth && asciiSourceHeight) {
            asciiOptWidth.value = Math.floor(asciiSourceWidth / 2);
            asciiOptHeight.value = Math.floor(asciiSourceHeight / 2);
            reprocessAsciiImage();
        }
    });

    asciiBtnFull.addEventListener('click', () => {
        if (asciiSourceWidth && asciiSourceHeight) {
            asciiOptWidth.value = asciiSourceWidth;
            asciiOptHeight.value = asciiSourceHeight;
            reprocessAsciiImage();
        }
    });

    asciiBtnDouble.addEventListener('click', () => {
        if (asciiSourceWidth && asciiSourceHeight) {
            asciiOptWidth.value = asciiSourceWidth * 2;
            asciiOptHeight.value = asciiSourceHeight * 2;
            reprocessAsciiImage();
        }
    });

    container.querySelector('#ascii-copy-ansi').addEventListener('click', async () => {
        if (currentAsciiOutput) {
            await copyToClipboard(currentAsciiOutput);
            showToast('ASCII art copied!');
        }
    });

    container.querySelector('#ascii-copy-printf').addEventListener('click', async () => {
        if (currentAsciiPrintf) {
            await copyToClipboard(currentAsciiPrintf);
            showToast('printf command copied!');
        }
    });

    const asciiCtrlFontSize = container.querySelector('#ascii-ctrl-font-size');
    const asciiCtrlFontSizeVal = container.querySelector('#ascii-ctrl-font-size-val');
    const asciiCtrlLineHeight = container.querySelector('#ascii-ctrl-line-height');
    const asciiCtrlLineHeightVal = container.querySelector('#ascii-ctrl-line-height-val');
    const asciiCtrlLetterSpacing = container.querySelector('#ascii-ctrl-letter-spacing');
    const asciiCtrlLetterSpacingVal = container.querySelector('#ascii-ctrl-letter-spacing-val');
    const asciiCtrlNoWrap = container.querySelector('#ascii-ctrl-no-wrap');

    function updateAsciiPreviewStyles() {
        const fontSize = asciiCtrlFontSize.value;
        const lineHeight = asciiCtrlLineHeight.value / 100;
        const letterSpacing = asciiCtrlLetterSpacing.value;

        asciiTerminal.style.setProperty('--preview-font-size', fontSize + 'px');
        asciiTerminal.style.setProperty('--preview-line-height', lineHeight);
        asciiTerminal.style.setProperty('--preview-letter-spacing', letterSpacing + 'px');

        asciiCtrlFontSizeVal.textContent = fontSize + 'px';
        asciiCtrlLineHeightVal.textContent = lineHeight.toFixed(2);
        asciiCtrlLetterSpacingVal.textContent = letterSpacing + 'px';

        asciiTerminal.classList.toggle('no-wrap', asciiCtrlNoWrap.checked);
    }

    asciiCtrlFontSize.addEventListener('input', updateAsciiPreviewStyles);
    asciiCtrlLineHeight.addEventListener('input', updateAsciiPreviewStyles);
    asciiCtrlLetterSpacing.addEventListener('input', updateAsciiPreviewStyles);
    asciiCtrlNoWrap.addEventListener('change', updateAsciiPreviewStyles);

    updateAsciiPreviewStyles();
}
