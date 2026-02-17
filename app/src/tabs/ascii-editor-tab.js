/**
 * ASCII Editor Tab
 */

import * as AsciiEditor from '../engines/ascii-editor.js';
import { showToast, copyToClipboard } from '../utils.js';

const template = `
<div class="mx-auto max-w-[1400px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">ASCII Editor</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Draw and compose ASCII art on a character grid</p>

    <!-- Toolbar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="flex gap-1">
            <button class="editor-tool-btn active flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" data-tool="type" title="Type (T)">
                <span class="text-sm">I</span> Type
            </button>
            <button class="editor-tool-btn flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" data-tool="brush" title="Brush (B)">
                <span class="text-sm">+</span> Brush
            </button>
            <button class="editor-tool-btn flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" data-tool="line" title="Line (L)">
                <span class="text-sm">/</span> Line
            </button>
            <button class="editor-tool-btn flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" data-tool="fill" title="Fill (F)">
                <span class="text-sm">▧</span> Fill
            </button>
            <button class="editor-tool-btn flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" data-tool="eraser" title="Eraser (E)">
                <span class="text-sm">⌫</span> Eraser
            </button>
        </div>

        <div class="h-6 w-px bg-gray-400"></div>

        <div class="flex items-center gap-1.5">
            <label for="editor-brush-char" class="text-xs text-gray-900">Char</label>
            <input type="text" id="editor-brush-char" value="#" maxlength="1"
                class="h-9 w-10 rounded-sm border border-gray-400 bg-background-100 text-center font-mono text-sm text-gray-1000 outline-none focus:border-blue-700 focus:shadow-focus-ring">
        </div>

        <div class="h-6 w-px bg-gray-400"></div>

        <div class="flex gap-0.5">
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="#">#</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="@">@</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="*">*</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char=".">.</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="-">-</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="|">|</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="/">/</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="\\">\\</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="█">█</button>
            <button class="editor-quick-char flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100" data-char="░">░</button>
        </div>

        <div class="h-6 w-px bg-gray-400"></div>

        <div class="flex gap-1">
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-2.5 text-xs text-gray-1000 transition-colors hover:bg-gray-100" id="editor-undo" title="Undo (Cmd+Z)">↩</button>
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-2.5 text-xs text-gray-1000 transition-colors hover:bg-gray-100" id="editor-redo" title="Redo (Cmd+Shift+Z)">↪</button>
        </div>

        <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" id="editor-clear" title="Clear All">Clear</button>
    </div>

    <!-- Canvas -->
    <div class="mb-4 overflow-auto rounded-md border border-gray-400 bg-background-200 p-2">
        <canvas id="editor-canvas" style="image-rendering: pixelated; cursor: crosshair;"></canvas>
    </div>

    <!-- Bottom bar -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
                <label for="editor-cols" class="text-xs text-gray-900">Cols</label>
                <input type="number" id="editor-cols" value="80" min="10" max="200"
                    class="h-9 w-16 rounded-sm border border-gray-400 bg-background-100 px-2 font-mono text-xs text-gray-1000 outline-none focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex items-center gap-1.5">
                <label for="editor-rows" class="text-xs text-gray-900">Rows</label>
                <input type="number" id="editor-rows" value="24" min="5" max="100"
                    class="h-9 w-16 rounded-sm border border-gray-400 bg-background-100 px-2 font-mono text-xs text-gray-1000 outline-none focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100" id="editor-resize">Resize</button>
        </div>
        <div class="flex gap-2">
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="editor-copy-text">Copy Text</button>
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500" id="editor-copy-ansi">Copy ANSI</button>
        </div>
    </div>
</div>
`;

let editor = null;

export function init(container) {
    container.innerHTML = template;

    const canvas = container.querySelector('#editor-canvas');
    const cols = parseInt(container.querySelector('#editor-cols').value) || 80;
    const rows = parseInt(container.querySelector('#editor-rows').value) || 24;
    editor = AsciiEditor.create(canvas, { cols, rows });
    requestAnimationFrame(() => editor.focus());

    container.querySelectorAll('.editor-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.editor-tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (editor) editor.setTool(btn.dataset.tool);
        });
    });

    container.querySelectorAll('.editor-quick-char').forEach(btn => {
        btn.addEventListener('click', () => {
            const brushInput = container.querySelector('#editor-brush-char');
            brushInput.value = btn.dataset.char;
            if (editor) editor.setBrushChar(btn.dataset.char);
        });
    });

    container.querySelector('#editor-brush-char').addEventListener('input', (e) => {
        if (editor && e.target.value) editor.setBrushChar(e.target.value);
    });

    container.querySelector('#editor-undo').addEventListener('click', () => { if (editor) editor.undo(); });
    container.querySelector('#editor-redo').addEventListener('click', () => { if (editor) editor.redo(); });
    container.querySelector('#editor-clear').addEventListener('click', () => { if (editor) editor.clear(); });

    container.querySelector('#editor-resize').addEventListener('click', () => {
        if (!editor) return;
        const newCols = parseInt(container.querySelector('#editor-cols').value) || 80;
        const newRows = parseInt(container.querySelector('#editor-rows').value) || 24;
        editor.resize(newCols, newRows);
    });

    container.querySelector('#editor-copy-text').addEventListener('click', async () => {
        if (!editor) return;
        await copyToClipboard(editor.exportPlainText());
        showToast('ASCII text copied!');
    });

    container.querySelector('#editor-copy-ansi').addEventListener('click', async () => {
        if (!editor) return;
        await copyToClipboard(editor.exportAnsi());
        showToast('ANSI codes copied!');
    });
}
