/**
 * Termcraft - Main Application Shell
 *
 * Thin entry point: tab navigation + lazy init of each tool tab.
 */

import * as ColorWheel from './tabs/color-wheel.js';
import * as Lookup from './tabs/lookup.js';
import * as ImageToAnsiTab from './tabs/image-to-ansi-tab.js';
import * as ImageToAsciiTab from './tabs/image-to-ascii-tab.js';
import * as AsciiEditorTab from './tabs/ascii-editor-tab.js';
import * as VideoToAsciiTab from './tabs/video-to-ascii-tab.js';
import * as PixelFontTab from './tabs/pixel-font-tab.js';
import * as SpinnersTab from './tabs/spinners-tab.js';

// Tab registry: maps data-tab attribute to { module, container id, lazy }
const tabs = {
    wheel:  { module: ColorWheel,      lazy: false },
    lookup: { module: Lookup,           lazy: false },
    image:  { module: ImageToAnsiTab,   lazy: false },
    ascii:  { module: ImageToAsciiTab,  lazy: false },
    editor: { module: AsciiEditorTab,   lazy: true },
    video:  { module: VideoToAsciiTab,  lazy: true },
    font:   { module: PixelFontTab,     lazy: false },
    spinners: { module: SpinnersTab,   lazy: true },
};

const initialized = new Set();

function initTab(name) {
    if (initialized.has(name)) return;
    const entry = tabs[name];
    if (!entry) return;
    const container = document.getElementById('tab-' + name);
    if (!container) return;
    entry.module.init(container);
    initialized.add(name);
}

// Initialize eager tabs immediately
for (const [name, entry] of Object.entries(tabs)) {
    if (!entry.lazy) initTab(name);
}

// Tab navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');

        // Lazy init on first visit
        initTab(tab);

        // Pause video when navigating away
        if (tab !== 'video' && VideoToAsciiTab.isInitialized()) {
            VideoToAsciiTab.pause();
        }
    });
});
