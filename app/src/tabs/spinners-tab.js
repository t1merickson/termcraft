/**
 * CLI Spinners Tab
 *
 * Browse and preview CLI spinner / loading animations.
 * Each card shows a live animated preview, spinner name, frame count, and
 * interval. Click to copy frames or ANSI escape sequences.
 */

import { getSpinnersByCategory, getCategories, getCategoryOrder } from '../engines/spinners.js';
import { showToast, copyToClipboard, escapeForPrintf, noteHTML } from '../utils.js';
import { icon } from '../icons.js';

const template = `
<div class="mx-auto max-w-[900px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">CLI Spinners</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Browse and copy animated terminal spinners</p>

    <!-- Filter row -->
    <div class="mb-6 flex items-center gap-3">
        <div class="relative flex-1">
            ${icon('magnifyingGlass', 16, 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600')}
            <input type="text" id="spinner-search" placeholder="Search spinners…"
                class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 pl-9 pr-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring">
        </div>
        <div class="relative">
            <select id="spinner-category"
                class="h-10 cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                <option value="all">All Categories</option>
            </select>
            ${icon('chevronDown', 16, 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900')}
        </div>
        <div class="flex items-center gap-2.5">
            <label for="spinner-speed" class="text-sm text-gray-900 whitespace-nowrap">Speed</label>
            <input type="range" id="spinner-speed" min="0.25" max="3" step="0.25" value="1" class="w-20">
            <span class="text-xs tabular-nums text-gray-600 w-8" id="spinner-speed-label">1×</span>
        </div>
    </div>

    <!-- Spinner grid -->
    <div id="spinner-grid"></div>

    <!-- Detail panel (shown when a spinner is selected) -->
    <div class="panel-hideable mt-6 overflow-hidden rounded-md border border-gray-400 bg-background-200" id="spinner-detail">
        <div class="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
            <h4 class="text-[13px] font-medium text-gray-1000" id="detail-name">dots</h4>
            <div class="flex gap-2">
                <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-frames-json">Copy Frames (JSON)</button>
                <button class="flex h-8 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="copy-printf">Copy printf</button>
            </div>
        </div>
        <div class="p-5">
            <!-- Large preview -->
            <div class="mb-5 flex items-center justify-center rounded-sm border border-gray-400 bg-background-100 py-8">
                <span class="font-mono text-5xl text-gray-1000" id="detail-preview"></span>
            </div>
            <!-- Info -->
            <div class="grid grid-cols-3 gap-4 mb-5 text-sm">
                <div>
                    <span class="text-gray-600">Interval</span>
                    <span class="ml-2 font-mono text-gray-1000" id="detail-interval"></span>
                </div>
                <div>
                    <span class="text-gray-600">Frames</span>
                    <span class="ml-2 font-mono text-gray-1000" id="detail-frame-count"></span>
                </div>
                <div>
                    <span class="text-gray-600">Category</span>
                    <span class="ml-2 font-mono text-gray-1000" id="detail-category"></span>
                </div>
            </div>
            <!-- Frame strip -->
            <div>
                <div class="mb-2 text-xs text-gray-600">All frames</div>
                <div class="flex flex-wrap gap-1.5" id="detail-frames"></div>
            </div>
        </div>
    </div>

    <div class="mt-8">
    ${noteHTML('Spinner data curated from <a href="https://github.com/sindresorhus/cli-spinners" target="_blank" rel="noopener" class="text-blue-900 hover:underline">cli-spinners</a> by sindresorhus and <a href="https://www.npmjs.com/package/unicode-animations" target="_blank" rel="noopener" class="text-blue-900 hover:underline">unicode-animations</a> by gunnargray-dev')}
    </div>
</div>
`;

export function init(container) {
    container.innerHTML = template;

    const categories = getCategories();
    const categoryOrder = getCategoryOrder();
    const grouped = getSpinnersByCategory();

    const searchInput = container.querySelector('#spinner-search');
    const categorySelect = container.querySelector('#spinner-category');
    const speedSlider = container.querySelector('#spinner-speed');
    const speedLabel = container.querySelector('#spinner-speed-label');
    const gridEl = container.querySelector('#spinner-grid');
    const detailPanel = container.querySelector('#spinner-detail');

    let speedMultiplier = 1;
    let activeTimers = [];
    let selectedSpinner = null;
    let detailTimer = null;

    // Populate category select
    for (const key of categoryOrder) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = categories[key];
        categorySelect.appendChild(opt);
    }

    // ── Render grid ───────────────────────────────────────────────
    function renderGrid() {
        // Stop all running animations
        activeTimers.forEach(t => clearInterval(t));
        activeTimers = [];

        const query = searchInput.value.toLowerCase().trim();
        const catFilter = categorySelect.value;

        let html = '';

        for (const cat of categoryOrder) {
            if (catFilter !== 'all' && catFilter !== cat) continue;

            const spinners = grouped[cat].filter(s =>
                !query || s.name.toLowerCase().includes(query)
            );
            if (spinners.length === 0) continue;

            html += `<div class="mb-6">`;
            html += `<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">${categories[cat]}</h3>`;
            html += `<div class="spinner-grid-cards">`;

            for (const s of spinners) {
                const isSelected = selectedSpinner && selectedSpinner.name === s.name;
                html += `
                    <div class="spinner-card${isSelected ? ' active' : ''}" data-spinner="${s.name}">
                        <span class="spinner-card-preview font-mono" data-spinner-anim="${s.name}">${s.frames[0]}</span>
                        <span class="spinner-card-name">${s.name}</span>
                        <span class="spinner-card-meta">${s.frames.length}f · ${s.interval}ms</span>
                    </div>`;
            }

            html += `</div></div>`;
        }

        if (!html) {
            html = `<div class="py-12 text-center text-gray-600">No spinners match your search</div>`;
        }

        gridEl.innerHTML = html;

        // Start animations for each card preview
        gridEl.querySelectorAll('[data-spinner-anim]').forEach(el => {
            const name = el.dataset.spinnerAnim;
            const spinner = grouped[Object.keys(grouped).find(k =>
                grouped[k].some(s => s.name === name)
            )].find(s => s.name === name);
            if (!spinner) return;

            let idx = 0;
            const timer = setInterval(() => {
                idx = (idx + 1) % spinner.frames.length;
                el.textContent = spinner.frames[idx];
            }, spinner.interval / speedMultiplier);
            activeTimers.push(timer);
        });

        // Click handlers
        gridEl.querySelectorAll('.spinner-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.dataset.spinner;
                const spinner = findSpinner(name);
                if (!spinner) return;

                // Toggle selection
                if (selectedSpinner && selectedSpinner.name === name) {
                    selectedSpinner = null;
                    detailPanel.classList.remove('visible');
                    gridEl.querySelectorAll('.spinner-card').forEach(c => c.classList.remove('active'));
                    stopDetailAnim();
                    return;
                }

                selectedSpinner = spinner;
                gridEl.querySelectorAll('.spinner-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                showDetail(spinner);
            });
        });
    }

    function findSpinner(name) {
        for (const cat of categoryOrder) {
            const found = grouped[cat].find(s => s.name === name);
            if (found) return found;
        }
        return null;
    }

    // ── Detail panel ──────────────────────────────────────────────
    function stopDetailAnim() {
        if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }
    }

    function showDetail(spinner) {
        stopDetailAnim();
        detailPanel.classList.add('visible');

        container.querySelector('#detail-name').textContent = spinner.name;
        container.querySelector('#detail-interval').textContent = spinner.interval + 'ms';
        container.querySelector('#detail-frame-count').textContent = spinner.frames.length;
        container.querySelector('#detail-category').textContent = categories[spinner.cat] || spinner.cat;

        // Frame strip
        const framesEl = container.querySelector('#detail-frames');
        framesEl.innerHTML = spinner.frames.map((f, i) =>
            `<span class="spinner-frame-chip" data-idx="${i}" title="Frame ${i}">${f}</span>`
        ).join('');

        // Click to copy individual frame
        framesEl.querySelectorAll('.spinner-frame-chip').forEach(chip => {
            chip.addEventListener('click', async (e) => {
                e.stopPropagation();
                await copyToClipboard(spinner.frames[parseInt(chip.dataset.idx)]);
                showToast('Frame copied!');
            });
        });

        // Large preview animation
        const previewEl = container.querySelector('#detail-preview');
        let idx = 0;
        previewEl.textContent = spinner.frames[0];
        detailTimer = setInterval(() => {
            idx = (idx + 1) % spinner.frames.length;
            previewEl.textContent = spinner.frames[idx];

            // Highlight current frame in strip
            framesEl.querySelectorAll('.spinner-frame-chip').forEach((chip, i) => {
                chip.classList.toggle('active', i === idx);
            });
        }, spinner.interval / speedMultiplier);

        // Scroll detail into view
        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Copy buttons ──────────────────────────────────────────────
    container.querySelector('#copy-frames-json').addEventListener('click', async () => {
        if (!selectedSpinner) return;
        const json = JSON.stringify({
            name: selectedSpinner.name,
            interval: selectedSpinner.interval,
            frames: selectedSpinner.frames
        }, null, 2);
        await copyToClipboard(json);
        showToast('Frames JSON copied!');
    });

    container.querySelector('#copy-printf').addEventListener('click', async () => {
        if (!selectedSpinner) return;
        // Generate a bash spinner one-liner
        const frames = selectedSpinner.frames.map(f => `"${f}"`).join(' ');
        const script = `#!/bin/bash\nframes=(${frames})\nwhile true; do\n  for f in "\${frames[@]}"; do\n    printf "\\r%s" "$f"\n    sleep ${(selectedSpinner.interval / 1000).toFixed(3)}\n  done\ndone`;
        await copyToClipboard(script);
        showToast('Bash script copied!');
    });

    // ── Speed control ─────────────────────────────────────────────
    speedSlider.addEventListener('input', () => {
        speedMultiplier = parseFloat(speedSlider.value);
        speedLabel.textContent = speedMultiplier + '×';
        // Re-render to pick up new speed
        renderGrid();
        if (selectedSpinner) showDetail(selectedSpinner);
    });

    // ── Filter handlers ───────────────────────────────────────────
    searchInput.addEventListener('input', renderGrid);
    categorySelect.addEventListener('change', renderGrid);

    // Initial render
    renderGrid();
}
