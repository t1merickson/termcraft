/**
 * Color Wheel Tab
 */

import * as ANSI256 from '../ansi256.js';
import { showToast, copyToClipboard } from '../utils.js';

const template = `
<h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Color Wheel</h1>
<p class="mb-8 text-xl leading-[30px] text-gray-900">Explore the full ANSI 256 color palette</p>

<!-- Mode Selector -->
<div class="mb-5 flex justify-center gap-2" id="mode-selector">
    <button class="mode-btn flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-[13px] text-gray-900 transition-colors hover:bg-background-200 hover:text-gray-1000 focus-visible:shadow-focus-ring" data-mode="ansi16">
        <span class="size-3 rounded-[3px] border border-gray-500" id="mode-swatch-ansi16"></span>
        <span>ANSI 16</span>
    </button>
    <button class="mode-btn active flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-[13px] text-gray-900 transition-colors hover:bg-background-200 hover:text-gray-1000 focus-visible:shadow-focus-ring" data-mode="ansi256">
        <span class="size-3 rounded-[3px] border border-gray-500" id="mode-swatch-ansi256"></span>
        <span>ANSI 256</span>
    </button>
</div>

<!-- Grayscale Strip -->
<div class="mb-5 flex flex-col items-center gap-2">
    <div class="text-xs text-gray-600">Grayscale: Black → White</div>
    <div class="flex gap-0.5 rounded-sm bg-background-200 p-2" id="grayscale-strip"></div>
</div>

<!-- Color Wheel -->
<div class="flex justify-center">
    <div class="relative h-[600px] w-[600px]" id="wheel-container"></div>
</div>

<div class="mt-8 flex items-center gap-3 rounded-sm border border-gray-400 px-3 py-2 text-sm text-gray-900">
    <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
    </svg>
    <span>Colors computed from ANSI 256 specification</span>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const colorData = ANSI256.PALETTE.map(c => ({
        ...c,
        hsl: ANSI256.rgbToHsl(c.r, c.g, c.b)
    }));

    const chromaticColors = colorData.filter(c => !ANSI256.isGrayscale(c.r, c.g, c.b));
    const grayscaleColors = colorData.filter(c => ANSI256.isGrayscale(c.r, c.g, c.b));
    grayscaleColors.sort((a, b) => a.hsl.l - b.hsl.l);

    const colorMap = {};
    colorData.forEach(c => { colorMap[c.id] = c; });

    const wheelContainer = container.querySelector('#wheel-container');
    const grayscaleStrip = container.querySelector('#grayscale-strip');
    const tooltip = document.getElementById('tooltip');

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
        div.style.backgroundColor = ANSI256.rgbToHex(color.r, color.g, color.b);
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.innerHTML = `<span class="code">${color.id}</span>`;
        div.dataset.code = color.id;
        wheelContainer.appendChild(div);
    });

    grayscaleColors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'grayscale-cell';
        div.style.backgroundColor = ANSI256.rgbToHex(color.r, color.g, color.b);
        div.style.color = color.hsl.l > 50 ? '#000' : '#fff';
        div.innerHTML = `<span class="code">${color.id}</span>`;
        div.dataset.code = color.id;
        grayscaleStrip.appendChild(div);
    });

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

    container.querySelectorAll('.color-cell').forEach(setupTooltip);
    container.querySelectorAll('.grayscale-cell').forEach(setupTooltip);

    const grayscaleIds = new Set(grayscaleColors.map(c => c.id));
    const ansi16Ids = new Set(Array.from({ length: 16 }, (_, i) => i));

    container.querySelector('#mode-swatch-ansi16').style.backgroundColor =
        ANSI256.rgbToHex(colorMap[1].r, colorMap[1].g, colorMap[1].b);
    container.querySelector('#mode-swatch-ansi256').style.backgroundColor =
        ANSI256.rgbToHex(colorMap[17].r, colorMap[17].g, colorMap[17].b);

    function setMode(mode) {
        container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        container.querySelectorAll('.color-cell, .grayscale-cell').forEach(cell => {
            const id = parseInt(cell.dataset.code);
            const visible = mode === 'ansi256' ||
                (mode === 'grayscale' && grayscaleIds.has(id)) ||
                (mode === 'ansi16' && ansi16Ids.has(id));
            cell.classList.toggle('hidden', !visible);
        });
    }

    container.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
}
