/**
 * ASCII Art Editor
 *
 * Grid-based canvas editor for composing ASCII art.
 * Supports typing, character brush, fill, line drawing, and export.
 */

/**
 * Create an ASCII editor instance bound to a canvas element.
 *
 * @param {HTMLCanvasElement} canvas - the canvas to render into
 * @param {object} opts
 * @param {number} opts.cols - grid columns (default 80)
 * @param {number} opts.rows - grid rows (default 24)
 */
export function create(canvas, opts = {}) {
    const cols = opts.cols || 80;
    const rows = opts.rows || 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const cellW = 9;
    const cellH = 16;

    let grid = makeGrid(cols, rows);
    let gridCols = cols;
    let gridRows = rows;

    let cursorCol = 0;
    let cursorRow = 0;

    let tool = 'type';
    let brushChar = '#';
    let brushFg = null;

    let lineStart = null;

    const undoStack = [];
    const redoStack = [];
    const MAX_UNDO = 200;

    let isMouseDown = false;
    let lastPaintCol = -1;
    let lastPaintRow = -1;

    // ============================================================
    // Grid helpers
    // ============================================================

    function makeGrid(c, r) {
        const g = [];
        for (let y = 0; y < r; y++) {
            const row = [];
            for (let x = 0; x < c; x++) {
                row.push({ char: ' ', fg: null });
            }
            g.push(row);
        }
        return g;
    }

    function resizeGrid(newCols, newRows) {
        const newGrid = makeGrid(newCols, newRows);
        const copyRows = Math.min(gridRows, newRows);
        const copyCols = Math.min(gridCols, newCols);
        for (let y = 0; y < copyRows; y++) {
            for (let x = 0; x < copyCols; x++) {
                newGrid[y][x] = { ...grid[y][x] };
            }
        }
        grid = newGrid;
        gridCols = newCols;
        gridRows = newRows;
        cursorCol = Math.min(cursorCol, newCols - 1);
        cursorRow = Math.min(cursorRow, newRows - 1);
        sizeCanvas();
        render();
    }

    function clearGrid() {
        pushUndo(snapshotAll());
        grid = makeGrid(gridCols, gridRows);
        cursorCol = 0;
        cursorRow = 0;
        render();
    }

    // ============================================================
    // Undo / Redo
    // ============================================================

    function snapshotAll() {
        const diffs = [];
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridCols; x++) {
                const c = grid[y][x];
                if (c.char !== ' ' || c.fg !== null) {
                    diffs.push({ col: x, row: y, oldChar: c.char, oldFg: c.fg, newChar: ' ', newFg: null });
                }
            }
        }
        return diffs;
    }

    function pushUndo(diffs) {
        if (diffs.length === 0) return;
        undoStack.push(diffs);
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack.length = 0;
    }

    function undo() {
        if (undoStack.length === 0) return;
        const diffs = undoStack.pop();
        const redoDiffs = [];
        for (const d of diffs) {
            const cell = grid[d.row][d.col];
            redoDiffs.push({ col: d.col, row: d.row, oldChar: cell.char, oldFg: cell.fg, newChar: d.oldChar, newFg: d.oldFg });
            cell.char = d.oldChar;
            cell.fg = d.oldFg;
        }
        redoStack.push(redoDiffs);
        render();
    }

    function redo() {
        if (redoStack.length === 0) return;
        const diffs = redoStack.pop();
        const undoDiffs = [];
        for (const d of diffs) {
            const cell = grid[d.row][d.col];
            undoDiffs.push({ col: d.col, row: d.row, oldChar: cell.char, oldFg: cell.fg, newChar: d.oldChar, newFg: d.oldFg });
            cell.char = d.oldChar;
            cell.fg = d.oldFg;
        }
        undoStack.push(undoDiffs);
        render();
    }

    // ============================================================
    // Cell operations (with diff tracking)
    // ============================================================

    function setCell(col, row, char, fg, diffs) {
        if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return;
        const cell = grid[row][col];
        if (cell.char === char && cell.fg === fg) return;
        if (diffs) {
            diffs.push({ col, row, oldChar: cell.char, oldFg: cell.fg, newChar: char, newFg: fg });
        }
        cell.char = char;
        cell.fg = fg;
    }

    // ============================================================
    // Tools
    // ============================================================

    function paintCell(col, row, diffs) {
        if (tool === 'eraser') {
            setCell(col, row, ' ', null, diffs);
        } else {
            setCell(col, row, brushChar, brushFg, diffs);
        }
    }

    function floodFill(startCol, startRow) {
        const target = grid[startRow][startCol];
        const targetChar = target.char;
        const targetFg = target.fg;
        if (targetChar === brushChar && targetFg === brushFg) return;

        const diffs = [];
        const visited = new Set();
        const queue = [[startCol, startRow]];

        while (queue.length > 0) {
            const [c, r] = queue.shift();
            const key = r * gridCols + c;
            if (visited.has(key)) continue;
            if (c < 0 || c >= gridCols || r < 0 || r >= gridRows) continue;
            const cell = grid[r][c];
            if (cell.char !== targetChar || cell.fg !== targetFg) continue;

            visited.add(key);
            setCell(c, r, brushChar, brushFg, diffs);
            queue.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]);
        }

        if (diffs.length > 0) {
            pushUndo(diffs);
            render();
        }
    }

    function drawLine(c0, r0, c1, r1) {
        const diffs = [];
        let dx = Math.abs(c1 - c0);
        let dy = Math.abs(r1 - r0);
        let sx = c0 < c1 ? 1 : -1;
        let sy = r0 < r1 ? 1 : -1;
        let err = dx - dy;
        let x = c0, y = r0;

        while (true) {
            paintCell(x, y, diffs);
            if (x === c1 && y === r1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }

        if (diffs.length > 0) {
            pushUndo(diffs);
            render();
        }
    }

    // ============================================================
    // Rendering
    // ============================================================

    function sizeCanvas() {
        canvas.width = gridCols * cellW;
        canvas.height = gridRows * cellH;
    }

    function render() {
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= gridCols; x++) {
            const px = x * cellW + 0.5;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();
        }
        for (let y = 0; y <= gridRows; y++) {
            const py = y * cellH + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();
        }

        ctx.font = '13px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const cell = grid[r][c];
                if (cell.char === ' ') continue;

                if (cell.fg) {
                    ctx.fillStyle = cell.fg;
                } else {
                    ctx.fillStyle = '#ededed';
                }
                ctx.fillText(cell.char, c * cellW + cellW / 2, r * cellH + cellH / 2);
            }
        }

        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(cursorCol * cellW, cursorRow * cellH, cellW, cellH);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cursorCol * cellW + 0.5, cursorRow * cellH + 0.5, cellW - 1, cellH - 1);
    }

    // ============================================================
    // Mouse handling
    // ============================================================

    function cellFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / cellW);
        const row = Math.floor(y / cellH);
        return {
            col: Math.max(0, Math.min(gridCols - 1, col)),
            row: Math.max(0, Math.min(gridRows - 1, row))
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const { col, row } = cellFromEvent(e);
        cursorCol = col;
        cursorRow = row;

        if (tool === 'fill') {
            floodFill(col, row);
            return;
        }

        if (tool === 'line') {
            if (lineStart === null) {
                lineStart = { col, row };
                render();
            } else {
                drawLine(lineStart.col, lineStart.row, col, row);
                lineStart = null;
            }
            return;
        }

        if (tool === 'brush' || tool === 'eraser') {
            isMouseDown = true;
            lastPaintCol = col;
            lastPaintRow = row;
            const diffs = [];
            paintCell(col, row, diffs);
            if (diffs.length > 0) pushUndo(diffs);
            render();
        } else if (tool === 'type') {
            render();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        if (tool !== 'brush' && tool !== 'eraser') return;

        const { col, row } = cellFromEvent(e);
        if (col === lastPaintCol && row === lastPaintRow) return;

        const diffs = [];
        let dx = Math.abs(col - lastPaintCol);
        let dy = Math.abs(row - lastPaintRow);
        let sx = lastPaintCol < col ? 1 : -1;
        let sy = lastPaintRow < row ? 1 : -1;
        let err = dx - dy;
        let x = lastPaintCol, y = lastPaintRow;

        while (true) {
            paintCell(x, y, diffs);
            if (x === col && y === row) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }

        if (diffs.length > 0) pushUndo(diffs);
        lastPaintCol = col;
        lastPaintRow = row;
        render();
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });

    // ============================================================
    // Keyboard handling
    // ============================================================

    function handleKeyDown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) { redo(); } else { undo(); }
            return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redo();
            return;
        }

        if (e.key === 'ArrowLeft') { e.preventDefault(); cursorCol = Math.max(0, cursorCol - 1); render(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); cursorCol = Math.min(gridCols - 1, cursorCol + 1); render(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); cursorRow = Math.max(0, cursorRow - 1); render(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); cursorRow = Math.min(gridRows - 1, cursorRow + 1); render(); return; }

        if (e.key === 'Home') { e.preventDefault(); cursorCol = 0; render(); return; }
        if (e.key === 'End') { e.preventDefault(); cursorCol = gridCols - 1; render(); return; }

        if (e.key === 'Enter') {
            e.preventDefault();
            cursorRow = Math.min(gridRows - 1, cursorRow + 1);
            cursorCol = 0;
            render();
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (cursorCol > 0) {
                cursorCol--;
            }
            const diffs = [];
            setCell(cursorCol, cursorRow, ' ', null, diffs);
            if (diffs.length > 0) pushUndo(diffs);
            render();
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            const diffs = [];
            setCell(cursorCol, cursorRow, ' ', null, diffs);
            if (diffs.length > 0) pushUndo(diffs);
            render();
            return;
        }

        if (tool === 'type' && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const diffs = [];
            setCell(cursorCol, cursorRow, e.key, brushFg, diffs);
            if (diffs.length > 0) pushUndo(diffs);
            cursorCol = Math.min(gridCols - 1, cursorCol + 1);
            render();
            return;
        }
    }

    // ============================================================
    // Export
    // ============================================================

    function exportPlainText() {
        const lines = [];
        for (let r = 0; r < gridRows; r++) {
            let line = '';
            for (let c = 0; c < gridCols; c++) {
                line += grid[r][c].char;
            }
            lines.push(line.replace(/\s+$/, ''));
        }
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        return lines.join('\n') + '\n';
    }

    function exportAnsi() {
        let out = '';
        for (let r = 0; r < gridRows; r++) {
            let line = '';
            let lastFg = null;
            for (let c = 0; c < gridCols; c++) {
                const cell = grid[r][c];
                if (cell.fg && cell.fg !== lastFg) {
                    const m = cell.fg.match(/\d+/g);
                    if (m) {
                        line += `\x1b[38;2;${m[0]};${m[1]};${m[2]}m`;
                    }
                    lastFg = cell.fg;
                } else if (!cell.fg && lastFg) {
                    line += '\x1b[0m';
                    lastFg = null;
                }
                line += cell.char;
            }
            if (lastFg) line += '\x1b[0m';
            out += line.replace(/\s+$/, '') + '\n';
        }
        return out;
    }

    function exportPrintf() {
        const ansi = exportAnsi();
        return 'printf "' + ansi
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\x1b/g, '\\033') + '"';
    }

    // ============================================================
    // Initialization
    // ============================================================

    sizeCanvas();
    render();

    canvas.tabIndex = 0;
    canvas.style.outline = 'none';
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('focus', () => render());

    // ============================================================
    // Public API
    // ============================================================

    return {
        render,
        resize: resizeGrid,
        clear: clearGrid,
        undo,
        redo,
        exportPlainText,
        exportAnsi,
        exportPrintf,
        setTool(t) { tool = t; lineStart = null; },
        getTool() { return tool; },
        setBrushChar(c) { brushChar = c; },
        getBrushChar() { return brushChar; },
        setBrushColor(c) { brushFg = c; },
        getBrushColor() { return brushFg; },
        getCols() { return gridCols; },
        getRows() { return gridRows; },
        focus() { canvas.focus(); },
    };
}
