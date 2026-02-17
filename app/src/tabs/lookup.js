/**
 * Lookup & Convert Tab
 */

import * as ANSI256 from '../engines/ansi256.js';

const template = `
<div class="max-w-[600px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Color Lookup &amp; Convert</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Find the nearest ANSI 256 color from HEX, RGB, or HSL</p>

    <!-- HEX Input -->
    <div class="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 class="mb-4 text-sm font-medium text-gray-900">HEX Color</h3>
        <div class="mb-4 flex flex-col gap-2">
            <label for="lookup-hex" class="text-sm text-gray-1000">HEX</label>
            <div class="flex items-center gap-2.5">
                <input type="text" id="lookup-hex" placeholder="#FF5733 or FF5733" maxlength="7"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
                <div class="size-10 shrink-0 rounded-sm border border-gray-500" id="preview-hex"></div>
            </div>
        </div>
        <button class="flex h-10 w-full cursor-pointer items-center justify-center rounded-sm bg-gray-1000 font-sans text-sm font-medium text-background-200 transition-colors hover:bg-gray-alpha-1000" id="lookup-hex-btn">Find Nearest ANSI Color</button>
    </div>

    <!-- RGB Input -->
    <div class="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 class="mb-4 text-sm font-medium text-gray-900">RGB Color</h3>
        <div class="mb-4 flex items-end gap-3">
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-r" class="text-[13px] text-gray-1000">R</label>
                <input type="number" id="lookup-r" placeholder="0-255" min="0" max="255"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-g" class="text-[13px] text-gray-1000">G</label>
                <input type="number" id="lookup-g" placeholder="0-255" min="0" max="255"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-b" class="text-[13px] text-gray-1000">B</label>
                <input type="number" id="lookup-b" placeholder="0-255" min="0" max="255"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="size-10 shrink-0 rounded-sm border border-gray-500" id="preview-rgb"></div>
        </div>
        <button class="flex h-10 w-full cursor-pointer items-center justify-center rounded-sm bg-gray-1000 font-sans text-sm font-medium text-background-200 transition-colors hover:bg-gray-alpha-1000" id="lookup-rgb-btn">Find Nearest ANSI Color</button>
    </div>

    <!-- HSL Input -->
    <div class="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 class="mb-4 text-sm font-medium text-gray-900">HSL Color</h3>
        <div class="mb-4 flex items-end gap-3">
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-h" class="text-[13px] text-gray-1000">H</label>
                <input type="number" id="lookup-h" placeholder="0-360" min="0" max="360"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-s" class="text-[13px] text-gray-1000">S</label>
                <input type="number" id="lookup-s" placeholder="0-100" min="0" max="100"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-1 flex-col gap-2">
                <label for="lookup-l" class="text-[13px] text-gray-1000">L</label>
                <input type="number" id="lookup-l" placeholder="0-100" min="0" max="100"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-mono text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="size-10 shrink-0 rounded-sm border border-gray-500" id="preview-hsl"></div>
        </div>
        <button class="flex h-10 w-full cursor-pointer items-center justify-center rounded-sm bg-gray-1000 font-sans text-sm font-medium text-background-200 transition-colors hover:bg-gray-alpha-1000" id="lookup-hsl-btn">Find Nearest ANSI Color</button>
    </div>

    <!-- Result -->
    <div class="panel-hideable rounded-md border border-gray-400 bg-background-200 p-6" id="lookup-result">
        <div class="mb-5 text-center">
            <div class="mb-5 flex items-center justify-center gap-5">
                <div class="flex size-20 flex-col items-center justify-end rounded-md border border-gray-500 pb-2" id="result-input-swatch">
                    <span class="rounded-[3px] bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">Input</span>
                </div>
                <span class="text-2xl text-gray-600">→</span>
                <div class="flex size-20 flex-col items-center justify-end rounded-md border border-gray-500 pb-2" id="result-ansi-swatch">
                    <span class="rounded-[3px] bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80" id="result-ansi-label">ANSI 0</span>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">ANSI Code</div>
                <div class="font-mono text-sm text-gray-1000" id="result-code">0</div>
            </div>
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">Name</div>
                <div class="font-mono text-sm text-gray-1000" id="result-name">Black</div>
            </div>
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">HEX</div>
                <div class="font-mono text-sm text-gray-1000" id="result-hex">#000000</div>
            </div>
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">RGB</div>
                <div class="font-mono text-sm text-gray-1000" id="result-rgb">0, 0, 0</div>
            </div>
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">HSL</div>
                <div class="font-mono text-sm text-gray-1000" id="result-hsl">0°, 0%, 0%</div>
            </div>
            <div class="rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">Distance</div>
                <div class="font-mono text-sm text-gray-1000" id="result-distance">0.00</div>
            </div>
            <div class="col-span-2 rounded-sm bg-gray-100 p-3">
                <div class="mb-1 text-xs text-gray-600">Escape Code</div>
                <div class="font-mono text-sm text-gray-1000" id="result-escape">\\e[38;5;0m</div>
            </div>
        </div>
    </div>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const lookupResult = container.querySelector('#lookup-result');

    function showLookupResult(r, g, b) {
        const result = ANSI256.findNearest(r, g, b, 'euclidean');
        const ansi = result.color;
        const inputHex = ANSI256.rgbToHex(r, g, b);
        const ansiHex = ANSI256.rgbToHex(ansi.r, ansi.g, ansi.b);
        const ansiHsl = ANSI256.rgbToHsl(ansi.r, ansi.g, ansi.b);

        container.querySelector('#result-input-swatch').style.backgroundColor = inputHex;
        container.querySelector('#result-ansi-swatch').style.backgroundColor = ansiHex;
        container.querySelector('#result-ansi-label').textContent = `ANSI ${ansi.id}`;
        container.querySelector('#result-code').textContent = ansi.id;
        container.querySelector('#result-name').textContent = ansi.name;
        container.querySelector('#result-hex').textContent = ansiHex;
        container.querySelector('#result-rgb').textContent = `${ansi.r}, ${ansi.g}, ${ansi.b}`;
        container.querySelector('#result-hsl').textContent = `${ansiHsl.h}°, ${ansiHsl.s}%, ${ansiHsl.l}%`;
        container.querySelector('#result-distance').textContent = result.distance.toFixed(2);
        container.querySelector('#result-escape').textContent = ANSI256.fgEscapeString(ansi.id);

        lookupResult.classList.add('visible');
    }

    const hexInput = container.querySelector('#lookup-hex');
    const hexPreview = container.querySelector('#preview-hex');

    hexInput.addEventListener('input', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{3}$/.test(val) || /^#[0-9A-Fa-f]{6}$/.test(val)) {
            hexPreview.style.backgroundColor = val;
        }
    });

    container.querySelector('#lookup-hex-btn').addEventListener('click', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (!/^#[0-9A-Fa-f]{6}$/.test(val) && !/^#[0-9A-Fa-f]{3}$/.test(val)) return;
        const rgb = ANSI256.hexToRgb(val);
        showLookupResult(rgb.r, rgb.g, rgb.b);
    });

    const rInput = container.querySelector('#lookup-r');
    const gInput = container.querySelector('#lookup-g');
    const bInput = container.querySelector('#lookup-b');
    const rgbPreview = container.querySelector('#preview-rgb');

    function updateRgbPreview() {
        const r = parseInt(rInput.value) || 0;
        const g = parseInt(gInput.value) || 0;
        const b = parseInt(bInput.value) || 0;
        rgbPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    [rInput, gInput, bInput].forEach(inp => inp.addEventListener('input', updateRgbPreview));

    container.querySelector('#lookup-rgb-btn').addEventListener('click', () => {
        const r = Math.min(255, Math.max(0, parseInt(rInput.value) || 0));
        const g = Math.min(255, Math.max(0, parseInt(gInput.value) || 0));
        const b = Math.min(255, Math.max(0, parseInt(bInput.value) || 0));
        showLookupResult(r, g, b);
    });

    const hInput = container.querySelector('#lookup-h');
    const sInput = container.querySelector('#lookup-s');
    const lInput = container.querySelector('#lookup-l');
    const hslPreview = container.querySelector('#preview-hsl');

    function updateHslPreview() {
        const h = parseInt(hInput.value) || 0;
        const s = parseInt(sInput.value) || 0;
        const l = parseInt(lInput.value) || 0;
        hslPreview.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
    }

    [hInput, sInput, lInput].forEach(inp => inp.addEventListener('input', updateHslPreview));

    container.querySelector('#lookup-hsl-btn').addEventListener('click', () => {
        const h = Math.min(360, Math.max(0, parseInt(hInput.value) || 0));
        const s = Math.min(100, Math.max(0, parseInt(sInput.value) || 0));
        const l = Math.min(100, Math.max(0, parseInt(lInput.value) || 0));
        const rgb = ANSI256.hslToRgb(h, s, l);
        showLookupResult(rgb.r, rgb.g, rgb.b);
    });
}
