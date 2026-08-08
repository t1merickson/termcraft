import { useState, useEffect, useRef, useCallback } from "react";
import * as AsciiEditor from "@/engines/ascii-editor.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Type, PenLine, Minus, Maximize, Undo2, Redo2 } from "lucide-react";

const TOOLS = [
  { id: "type", label: "Type", icon: Type, shortcut: "T" },
  { id: "brush", label: "Draw", icon: PenLine, shortcut: "B" },
  { id: "line", label: "Line", icon: PenLine, shortcut: "L" },
  { id: "fill", label: "Fill", icon: Maximize, shortcut: "F" },
  { id: "eraser", label: "Erase", icon: Minus, shortcut: "E" },
];

const QUICK_CHARS = ["#", "@", "*", ".", "-", "|", "/", "\\", "█", "░"];

export function AsciiEditorTab() {
  const { copy } = useClipboard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<any>(null);

  const [activeTool, setActiveTool] = useState("type");
  const [brushChar, setBrushChar] = useState("#");
  const [cols, setCols] = useState(80);
  const [rows, setRows] = useState(24);

  // Initialize editor
  useEffect(() => {
    if (!canvasRef.current) return;
    editorRef.current = AsciiEditor.create(canvasRef.current, {
      cols,
      rows,
    });
    requestAnimationFrame(() => editorRef.current?.focus());

    return () => {
      editorRef.current = null;
    };
  }, []);

  const selectTool = useCallback((tool: string) => {
    setActiveTool(tool);
    editorRef.current?.setTool(tool);
  }, []);

  const selectQuickChar = useCallback((char: string) => {
    setBrushChar(char);
    editorRef.current?.setBrushChar(char);
  }, []);

  const handleResize = useCallback(() => {
    editorRef.current?.resize(cols, rows);
  }, [cols, rows]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">
        ASCII Editor
      </h1>
      <p className="mb-8 text-xl leading-[30px] text-gray-900">
        Draw and compose ASCII art on a character grid
      </p>

      {/* Toolbar Row 1: Tools + Undo/Redo */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {TOOLS.map(({ id, label, icon: Icon, shortcut }) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              className={`h-9 gap-1.5 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-100${activeTool === id ? " editor-tool-btn active" : ""}`}
              title={`${label} (${shortcut})`}
              onClick={() => selectTool(id)}
            >
              <Icon size={16} />
              {label}
            </Button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-400" />

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-400 bg-transparent px-2.5 text-xs text-gray-1000 hover:bg-gray-100"
            title="Undo (Cmd+Z)"
            onClick={() => editorRef.current?.undo()}
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-400 bg-transparent px-2.5 text-xs text-gray-1000 hover:bg-gray-100"
            title="Redo (Cmd+Shift+Z)"
            onClick={() => editorRef.current?.redo()}
          >
            <Redo2 size={16} />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-100"
          title="Clear All"
          onClick={() => editorRef.current?.clear()}
        >
          Clear
        </Button>
      </div>

      {/* Toolbar Row 2: Character palette */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-900">Char</label>
          <Input
            value={brushChar}
            onChange={(e) => {
              const val = e.target.value;
              setBrushChar(val);
              if (val) editorRef.current?.setBrushChar(val);
            }}
            maxLength={1}
            className="h-9 w-10 border-gray-400 bg-background-100 text-center font-mono text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
          />
        </div>

        <div className="h-6 w-px bg-gray-400" />

        <div className="flex gap-0.5">
          {QUICK_CHARS.map((char) => (
            <button
              key={char}
              className="flex size-9 cursor-pointer items-center justify-center rounded-sm border border-gray-400 bg-transparent font-mono text-sm text-gray-1000 hover:bg-gray-100"
              onClick={() => selectQuickChar(char)}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="mb-4 overflow-auto rounded-md border border-gray-400 bg-background-200 p-2">
        <canvas
          ref={canvasRef}
          style={{ imageRendering: "pixelated", cursor: "crosshair" }}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-900">Cols</label>
            <Input
              type="number"
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 80)}
              min={10}
              max={200}
              className="h-9 w-16 border-gray-400 bg-background-100 px-2 font-mono text-xs text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-900">Rows</label>
            <Input
              type="number"
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 24)}
              min={5}
              max={100}
              className="h-9 w-16 border-gray-400 bg-background-100 px-2 font-mono text-xs text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-100"
            onClick={handleResize}
          >
            Resize
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
            onClick={() => {
              if (editorRef.current) {
                copy(editorRef.current.exportPlainText(), "ASCII text copied!");
              }
            }}
          >
            Copy Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
            onClick={() => {
              if (editorRef.current) {
                copy(editorRef.current.exportAnsi(), "ANSI codes copied!");
              }
            }}
          >
            Copy ANSI
          </Button>
        </div>
      </div>
    </div>
  );
}
