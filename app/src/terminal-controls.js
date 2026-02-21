/**
 * Shared terminal preview controls (font, size, line-height, letter-spacing).
 * Used by any tab that renders ANSI/ASCII into an .ansi-terminal element.
 */

import { toggleHTML } from './utils.js';
import { icon } from './icons.js';

const MONO_FONTS = [
    { value: "'Geist Mono', monospace", label: 'Geist Mono' },
    { value: "'SF Mono', monospace",    label: 'SF Mono' },
    { value: "Monaco, monospace",       label: 'Monaco' },
    { value: "'Menlo', monospace",      label: 'Menlo' },
    { value: "'Cascadia Code', monospace", label: 'Cascadia Code' },
    { value: "'Fira Code', monospace",  label: 'Fira Code' },
    { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
    { value: "monospace",               label: 'System Monospace' },
];

/**
 * Return the HTML string for the controls bar.
 * @param {string} prefix  – unique id prefix, e.g. "pf" or "ansi"
 * @param {object} [opts]
 * @param {boolean} [opts.noWrap] – include a No Wrap toggle (default false)
 */
export function terminalControlsHTML(prefix, opts = {}) {
    const fontOptions = MONO_FONTS
        .map(f => `<option value="${f.value}">${f.label}</option>`)
        .join('\n                        ');

    const noWrapCell = opts.noWrap ? `
            <div class="flex flex-col gap-2">
                <label class="text-xs text-gray-900">&nbsp;</label>
                <div class="flex h-8 items-center">
                    ${toggleHTML(`${prefix}-no-wrap`, 'No Wrap', { checked: true, size: 'sm' })}
                </div>
            </div>` : '';

    return `
        <div class="terminal-controls grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-400 px-4 py-3">
            <div class="flex flex-col gap-2">
                <label for="${prefix}-mono-font" class="text-xs text-gray-900">Terminal Font</label>
                <div class="geist-select-sm">
                    <select id="${prefix}-mono-font">
                        ${fontOptions}
                    </select>
                    ${icon('chevronDown', 16)}
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <label for="${prefix}-font-size" class="text-xs text-gray-900">Font Size</label>
                <div class="flex h-8 items-center gap-2">
                    <input type="range" id="${prefix}-font-size" min="4" max="24" value="12" class="flex-1">
                    <span class="min-w-[35px] text-right text-xs text-gray-700" id="${prefix}-font-size-val">12px</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <label for="${prefix}-line-height" class="text-xs text-gray-900">Line Height</label>
                <div class="flex h-8 items-center gap-2">
                    <input type="range" id="${prefix}-line-height" min="50" max="150" value="100" class="flex-1">
                    <span class="min-w-[35px] text-right text-xs text-gray-700" id="${prefix}-line-height-val">1.00</span>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <label for="${prefix}-letter-spacing" class="text-xs text-gray-900">Letter Spacing</label>
                <div class="flex h-8 items-center gap-2">
                    <input type="range" id="${prefix}-letter-spacing" min="-5" max="5" value="0" class="flex-1">
                    <span class="min-w-[35px] text-right text-xs text-gray-700" id="${prefix}-letter-spacing-val">0px</span>
                </div>
            </div>${noWrapCell}
        </div>`;
}

/**
 * Wire up the controls to drive CSS custom properties on a terminal element.
 * @param {HTMLElement} container – parent that contains the controls
 * @param {HTMLElement} terminalEl – the .ansi-terminal element to style
 * @param {string} prefix – same prefix used in terminalControlsHTML
 * @returns {{ update: () => void }} – call update() to sync styles imperatively
 */
export function initTerminalControls(container, terminalEl, prefix) {
    const monoFont      = container.querySelector(`#${prefix}-mono-font`);
    const fontSize      = container.querySelector(`#${prefix}-font-size`);
    const fontSizeVal   = container.querySelector(`#${prefix}-font-size-val`);
    const lineHeight    = container.querySelector(`#${prefix}-line-height`);
    const lineHeightVal = container.querySelector(`#${prefix}-line-height-val`);
    const letterSpacing    = container.querySelector(`#${prefix}-letter-spacing`);
    const letterSpacingVal = container.querySelector(`#${prefix}-letter-spacing-val`);
    const noWrap        = container.querySelector(`#${prefix}-no-wrap`);

    function update() {
        const fs = fontSize.value;
        const lh = lineHeight.value / 100;
        const ls = letterSpacing.value;

        terminalEl.style.setProperty('--preview-font-family', monoFont.value);
        terminalEl.style.setProperty('--preview-font-size', fs + 'px');
        terminalEl.style.setProperty('--preview-line-height', lh);
        terminalEl.style.setProperty('--preview-letter-spacing', ls + 'px');

        fontSizeVal.textContent = fs + 'px';
        lineHeightVal.textContent = lh.toFixed(2);
        letterSpacingVal.textContent = ls + 'px';

        if (noWrap) {
            terminalEl.classList.toggle('no-wrap', noWrap.checked);
        }
    }

    monoFont.addEventListener('change', update);
    fontSize.addEventListener('input', update);
    lineHeight.addEventListener('input', update);
    letterSpacing.addEventListener('input', update);
    if (noWrap) noWrap.addEventListener('change', update);

    return { update };
}
