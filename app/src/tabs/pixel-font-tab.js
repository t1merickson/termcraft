/**
 * Pixel Font Tab
 */

import * as PixelFont from '../engines/pixel-font.js';
import { showToast, copyToClipboard, escapeForPrintf } from '../utils.js';
import { terminalControlsHTML, initTerminalControls } from '../terminal-controls.js';
import { icon } from '../icons.js';

const template = `
<div class="mx-auto max-w-[900px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Pixel Font</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Render text using block-character pixel art</p>

    <!-- Font Preview -->
    <div class="mb-5">
        <button class="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-[13px] text-gray-900 transition-colors hover:bg-background-200 hover:text-gray-1000" id="toggle-glyph-preview">
            ${icon('gridSquare', 16, 'shrink-0')}
            <span>Show All Glyphs</span>
        </button>
    </div>
    <div class="mb-8" id="font-preview" style="display: none;">
        <div class="p-10 text-center text-gray-900">Loading font...</div>
    </div>

    <!-- Text Input -->
    <div class="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5" id="font-input-section">
        <div class="flex flex-col gap-2">
            <label for="font-text" class="text-sm text-gray-1000">Text</label>
            <input type="text" id="font-text" placeholder="HELLO WORLD" maxlength="50"
                class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-base text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
                <label for="font-select" class="text-sm text-gray-1000">Font</label>
                <div class="relative">
                    <select id="font-select"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                    </select>
                    ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <label for="font-dot-style" class="text-sm text-gray-1000">Dot Style</label>
                <div class="flex items-center gap-2.5">
                    <div class="relative flex-1">
                        <select id="font-dot-style"
                            class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                            <option value="█" selected>█ Full Block</option>
                            <option value="■">■ Square</option>
                            <option value="●">● Circle</option>
                            <option value="◆">◆ Diamond</option>
                            <option value="▮">▮ Rectangle</option>
                            <option value="⬤">⬤ Large Circle</option>
                            <option value="▪">▪ Small Square</option>
                            <option value="◼">◼ Medium Square</option>
                            <option value="⏹">⏹ Stop</option>
                            <option value="custom">Custom…</option>
                        </select>
                        ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                    </div>
                    <input type="text" id="font-dot-custom" placeholder="Character" maxlength="2" style="display:none; width: 80px;"
                        class="h-10 rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                </div>
            </div>
        </div>

        <!-- Shadow -->
        <div class="flex flex-col gap-2">
            <label for="font-shadow-dir" class="text-sm text-gray-1000">Shadow</label>
            <div class="flex items-center gap-2.5">
                <div class="relative flex-1">
                    <select id="font-shadow-dir"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="none" selected>None</option>
                        <option value="br">Bottom Right ↘</option>
                        <option value="bl">Bottom Left ↙</option>
                        <option value="tl">Top Left ↖</option>
                        <option value="tr">Top Right ↗</option>
                    </select>
                    ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                </div>
                <div class="relative flex-1">
                    <select id="font-shadow-intensity"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="1">░ Light</option>
                        <option value="2" selected>▒ Medium</option>
                        <option value="3">▓ Dense</option>
                    </select>
                    ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
                </div>
            </div>
        </div>
    </div>

    <!-- Rendered Output -->
    <div class="panel-hideable mt-5 overflow-hidden rounded-md border border-gray-400 bg-background-200" id="font-output">
        <div class="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
            <h4 class="text-[13px] font-medium text-gray-900">Output</h4>
            <div class="flex gap-2">
                <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-font-ansi">Copy ANSI</button>
                <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-font-printf">Copy printf</button>
            </div>
        </div>
        ${terminalControlsHTML('pf')}
        <div class="ansi-terminal overflow-x-auto p-5" id="font-terminal"></div>
    </div>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const fontPreview = container.querySelector('#font-preview');
    const fontText = container.querySelector('#font-text');
    const fontTerminal = container.querySelector('#font-terminal');
    const fontOutput = container.querySelector('#font-output');
    const fontSelect = container.querySelector('#font-select');
    const fontShadowDir = container.querySelector('#font-shadow-dir');
    const fontShadowIntensity = container.querySelector('#font-shadow-intensity');
    const fontDotStyle = container.querySelector('#font-dot-style');
    const fontDotCustom = container.querySelector('#font-dot-custom');

    initTerminalControls(container, fontTerminal, 'pf');

    let currentFontAnsi = '';
    let currentFontPrintf = '';
    let fontIndex = [];

    // Toggle glyph preview
    container.querySelector('#toggle-glyph-preview').addEventListener('click', function () {
        const open = fontPreview.style.display !== 'none';
        fontPreview.style.display = open ? 'none' : '';
        this.querySelector('span').textContent = open ? 'Show All Glyphs' : 'Hide All Glyphs';
    });

    fontDotStyle.addEventListener('change', () => {
        if (fontDotStyle.value === 'custom') {
            fontDotCustom.style.display = '';
            fontDotCustom.focus();
            if (fontDotCustom.value) {
                PixelFont.setFillChar(fontDotCustom.value);
            }
        } else {
            fontDotCustom.style.display = 'none';
            PixelFont.setFillChar(fontDotStyle.value);
        }
        renderFontPreview();
        renderFontText();
    });

    fontDotCustom.addEventListener('input', () => {
        if (fontDotCustom.value) {
            PixelFont.setFillChar(fontDotCustom.value);
            renderFontPreview();
            renderFontText();
        }
    });

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
        let featuredDone = false;
        fontIndex.forEach((font, idx) => {
            if (!font.featured && !featuredDone) {
                fontSelect.appendChild(document.createElement('hr'));
                featuredDone = true;
            }
            const option = document.createElement('option');
            option.value = font.id;
            option.textContent = font.name || font.id;
            if (idx === 0) option.selected = true;
            fontSelect.appendChild(option);
        });
    }

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

    function renderFontText() {
        if (!PixelFont.isLoaded()) return;

        const text = fontText.value;
        if (!text) {
            fontTerminal.innerHTML = '';
            fontOutput.classList.remove('visible');
            return;
        }

        const shadowOpts = {
            shadow: {
                direction: fontShadowDir.value,
                intensity: parseInt(fontShadowIntensity.value, 10)
            }
        };

        const result = PixelFont.renderText(text, shadowOpts);
        currentFontAnsi = result.ansi;
        currentFontPrintf = `printf "${escapeForPrintf(result.ansi)}"`;

        fontTerminal.innerHTML = `<code>${result.html}</code>`;
        fontOutput.classList.add('visible');
    }

    fontText.addEventListener('input', renderFontText);
    fontShadowDir.addEventListener('change', () => {
        fontShadowIntensity.classList.toggle('hidden', fontShadowDir.value === 'none');
        renderFontText();
    });
    fontShadowIntensity.addEventListener('change', renderFontText);

    container.querySelector('#copy-font-ansi').addEventListener('click', async () => {
        if (currentFontAnsi) {
            await copyToClipboard(currentFontAnsi);
            showToast('ANSI copied!');
        }
    });

    container.querySelector('#copy-font-printf').addEventListener('click', async () => {
        if (currentFontPrintf) {
            await copyToClipboard(currentFontPrintf);
            showToast('printf command copied!');
        }
    });
}
