import { useState, useCallback, useEffect, type RefObject } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const MONO_FONTS = [
  { value: "'Geist Mono', monospace", label: "Geist Mono" },
  { value: "'SF Mono', monospace", label: "SF Mono" },
  { value: "Monaco, monospace", label: "Monaco" },
  { value: "'Menlo', monospace", label: "Menlo" },
  { value: "'Cascadia Code', monospace", label: "Cascadia Code" },
  { value: "'Fira Code', monospace", label: "Fira Code" },
  { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
  { value: "monospace", label: "System Monospace" },
];

interface TerminalControlsProps {
  terminalRef: RefObject<HTMLDivElement | null>;
  noWrap?: boolean;
}

export function TerminalControls({
  terminalRef,
  noWrap,
}: TerminalControlsProps) {
  const [font, setFont] = useState(MONO_FONTS[0].value);
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(100);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [wrap, setWrap] = useState(true);

  const applyStyles = useCallback(() => {
    const el = terminalRef.current;
    if (!el) return;
    el.style.setProperty("--preview-font-family", font);
    el.style.setProperty("--preview-font-size", fontSize + "px");
    el.style.setProperty("--preview-line-height", String(lineHeight / 100));
    el.style.setProperty("--preview-letter-spacing", letterSpacing + "px");
    if (noWrap !== undefined) {
      el.classList.toggle("no-wrap", !wrap);
    }
  }, [terminalRef, font, fontSize, lineHeight, letterSpacing, wrap, noWrap]);

  useEffect(() => {
    applyStyles();
  }, [applyStyles]);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-400 px-4 py-3">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-900">Terminal Font</label>
        <div className="geist-select-sm">
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            {MONO_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 5.75L8 9.25L11.5 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-900">Font Size</label>
        <div className="flex h-8 items-center gap-2">
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            min={4}
            max={24}
            step={1}
            className="flex-1"
          />
          <span className="min-w-[35px] text-right text-xs text-gray-700">
            {fontSize}px
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-900">Line Height</label>
        <div className="flex h-8 items-center gap-2">
          <Slider
            value={[lineHeight]}
            onValueChange={([v]) => setLineHeight(v)}
            min={50}
            max={150}
            step={1}
            className="flex-1"
          />
          <span className="min-w-[35px] text-right text-xs text-gray-700">
            {(lineHeight / 100).toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-900">Letter Spacing</label>
        <div className="flex h-8 items-center gap-2">
          <Slider
            value={[letterSpacing]}
            onValueChange={([v]) => setLetterSpacing(v)}
            min={-5}
            max={5}
            step={1}
            className="flex-1"
          />
          <span className="min-w-[35px] text-right text-xs text-gray-700">
            {letterSpacing}px
          </span>
        </div>
      </div>
      {noWrap !== undefined && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-900">&nbsp;</label>
          <div className="flex h-8 items-center gap-2.5">
            <Switch
              checked={!wrap}
              onCheckedChange={(checked) => setWrap(!checked)}
            />
            <span className="text-xs text-gray-1000">No Wrap</span>
          </div>
        </div>
      )}
    </div>
  );
}
