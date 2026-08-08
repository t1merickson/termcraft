import { useState, useEffect, useRef, useCallback } from "react";
import * as PixelFont from "@/engines/pixel-font.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BlockCanvas, type BlockCell } from "@/components/shared/BlockCanvas";
import { Button } from "@/components/ui/button";
import { TerminalControls } from "@/components/shared/TerminalControls";
import { LayoutGrid, ChevronDown } from "lucide-react";

interface FontEntry {
  id: string;
  name: string;
  path: string;
  featured?: boolean;
}

const DOT_STYLES = [
  { value: "█", label: "█ Full Block" },
  { value: "■", label: "■ Square" },
  { value: "●", label: "● Circle" },
  { value: "◆", label: "◆ Diamond" },
  { value: "▮", label: "▮ Rectangle" },
  { value: "⬤", label: "⬤ Large Circle" },
  { value: "▪", label: "▪ Small Square" },
  { value: "◼", label: "◼ Medium Square" },
  { value: "⏹", label: "⏹ Stop" },
  { value: "custom", label: "Custom…" },
];

const SHADOW_DIRECTIONS = [
  { value: "none", label: "None" },
  { value: "br", label: "Bottom Right ↘" },
  { value: "bl", label: "Bottom Left ↙" },
  { value: "tl", label: "Top Left ↖" },
  { value: "tr", label: "Top Right ↗" },
];

const SHADOW_INTENSITIES = [
  { value: "1", label: "░ Light" },
  { value: "2", label: "▒ Medium" },
  { value: "3", label: "▓ Dense" },
];

function escapeForPrintf(ansi: string): string {
  return ansi
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\x1b/g, "\\033");
}

export function PixelFontTab() {
  const { copy } = useClipboard();
  const terminalRef = useRef<HTMLDivElement>(null);

  const [fontIndex, setFontIndex] = useState<FontEntry[]>([]);
  const [selectedFont, setSelectedFont] = useState("");
  // Which characters the loaded font actually has a glyph for. Several of the
  // bundled fonts are partial — Pixel Alpha is 26 uppercase letters — and a
  // missing glyph renders as a gap, which otherwise just looks like a space.
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [dotStyle, setDotStyle] = useState("█");
  // Half blocks pack two glyph rows into one character cell. That doubles the
  // vertical detail and fixes the proportions: one cell per pixel comes out
  // twice as tall as the font was drawn, because cells are twice as tall as
  // they are wide.
  const [halfBlocks, setHalfBlocks] = useState(true);
  const [cells, setCells] = useState<BlockCell[][]>([]);
  const [customDot, setCustomDot] = useState("");
  const [shadowDir, setShadowDir] = useState("none");
  const [shadowIntensity, setShadowIntensity] = useState("2");
  const [showGlyphs, setShowGlyphs] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [glyphHtml, setGlyphHtml] = useState("");
  const [outputHtml, setOutputHtml] = useState("");
  const [currentAnsi, setCurrentAnsi] = useState("");

  // Load font index
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fonts/index.json`)
      .then((r) => r.json())
      .then((fonts: FontEntry[]) => {
        setFontIndex(fonts);
        if (fonts.length > 0) {
          setSelectedFont(fonts[0].id);
          return PixelFont.loadFont(
            `${import.meta.env.BASE_URL}${fonts[0].path}`,
          );
        }
      })
      .then(() => {
        setLoaded(true);
        renderGlyphs();
      })
      .catch((err: Error) => console.error("Font load error:", err));
  }, []);

  const renderGlyphs = useCallback(() => {
    if (!PixelFont.isLoaded()) return;
    const letters = PixelFont.getLetters();
    const meta = PixelFont.getMeta();
    const glyphKeys = Object.keys(PixelFont.getFontData());
    setAvailable(new Set(glyphKeys));
    const charset = meta?.charset
      ? meta.charset.split("")
      : glyphKeys.sort((a: string, b: string) => a.localeCompare(b));

    let html = '<div class="font-letter-grid">';
    for (const char of charset) {
      if (!letters[char]) continue;
      html += `<div class="font-letter" data-letter="${char}">
        <code class="font-letter-ansi">${letters[char].html}</code>
        <span class="font-letter-label">${char}</span>
      </div>`;
    }
    html += "</div>";
    setGlyphHtml(html);
  }, []);

  const renderText = useCallback(() => {
    if (!PixelFont.isLoaded() || !text) {
      setOutputHtml("");
      setCurrentAnsi("");
      return;
    }
    const result = PixelFont.renderText(text, {
      shadow: {
        direction: shadowDir,
        intensity: parseInt(shadowIntensity, 10),
      },
      resolution: halfBlocks ? "half" : "full",
    });
    setOutputHtml(`<code>${result.html}</code>`);
    setCurrentAnsi(result.ansi);
    setCells(result.cells || []);
  }, [text, shadowDir, shadowIntensity, halfBlocks]);

  // Re-render when settings change
  useEffect(() => {
    renderGlyphs();
    renderText();
  }, [loaded, renderGlyphs, renderText]);

  const handleFontChange = async (fontId: string) => {
    setSelectedFont(fontId);
    const font = fontIndex.find((f) => f.id === fontId);
    if (!font) return;
    try {
      await PixelFont.loadFont(`${import.meta.env.BASE_URL}${font.path}`);
      setLoaded(true);
      renderGlyphs();
      renderText();
    } catch (err) {
      console.error("Font load error:", err);
    }
  };

  const handleDotStyleChange = (value: string) => {
    setDotStyle(value);
    if (value !== "custom") {
      PixelFont.setFillChar(value);
      renderGlyphs();
      renderText();
    } else if (customDot) {
      PixelFont.setFillChar(customDot);
      renderGlyphs();
      renderText();
    }
  };

  const handleCustomDotChange = (value: string) => {
    setCustomDot(value);
    if (value) {
      PixelFont.setFillChar(value);
      renderGlyphs();
      renderText();
    }
  };

  const handleGlyphClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest(
      "[data-letter]",
    ) as HTMLElement;
    if (!el) return;
    const char = el.dataset.letter;
    if (!char) return;
    const letters = PixelFont.getLetters();
    if (letters[char]) {
      copy(letters[char].ansi, `Copied letter ${char}`);
    }
  };

  // A character counts as covered if the font has it in either case, the way
  // the renderer looks it up.
  const missing = Array.from(
    new Set(
      Array.from(text).filter(
        (ch) =>
          ch !== " " &&
          !available.has(ch) &&
          !available.has(ch.toUpperCase()) &&
          !available.has(ch.toLowerCase()),
      ),
    ),
  );

  return (
    <div className="mx-auto max-w-[900px]">
      {/* Font Preview Toggle */}
      <div className="mb-5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-gray-400 bg-transparent text-[13px] text-gray-900 hover:bg-background-200 hover:text-gray-1000"
          onClick={() => setShowGlyphs(!showGlyphs)}
        >
          <LayoutGrid className="size-4 shrink-0" />
          {showGlyphs ? "Hide All Glyphs" : "Show All Glyphs"}
        </Button>
      </div>
      {showGlyphs && (
        <div
          className="mb-8"
          onClick={handleGlyphClick}
          dangerouslySetInnerHTML={{ __html: glyphHtml }}
        />
      )}

      {/* Text Input */}
      <div className="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-1000">Text</label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="HELLO WORLD"
            maxLength={50}
            className="h-10 border-gray-400 bg-background-100 text-base text-gray-1000 placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring"
          />
          {missing.length > 0 && (
            <p className="text-xs text-gray-600">
              This font has no glyph for{" "}
              <span className="font-mono text-gray-900">
                {missing.join(" ")}
              </span>
              . Those render as a gap.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-1000">Font</label>
            <div className="relative">
              <select
                value={selectedFont}
                onChange={(e) => handleFontChange(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {fontIndex.map((font, idx) => (
                  <option key={font.id} value={font.id}>
                    {font.name || font.id}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
                size={16}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-1000">Resolution</label>
            <div className="flex h-10 items-center gap-2.5">
              <Switch checked={halfBlocks} onCheckedChange={setHalfBlocks} />
              <span className="text-sm text-gray-900">
                {halfBlocks
                  ? "Half blocks — 2\u00d7 detail, true proportions"
                  : "One cell per pixel"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-1000">
              Dot Style
              {halfBlocks && (
                <span className="ml-1.5 text-xs text-gray-600">
                  (one cell per pixel only)
                </span>
              )}
            </label>
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <select
                  value={dotStyle}
                  disabled={halfBlocks}
                  onChange={(e) => handleDotStyleChange(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {DOT_STYLES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
                  size={16}
                />
              </div>
              {dotStyle === "custom" && (
                <Input
                  value={customDot}
                  onChange={(e) => handleCustomDotChange(e.target.value)}
                  placeholder="Character"
                  maxLength={2}
                  className="h-10 w-20 border-gray-400 bg-background-100 text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
                />
              )}
            </div>
          </div>
        </div>

        {/* Shadow */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-1000">Shadow</label>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <select
                value={shadowDir}
                onChange={(e) => setShadowDir(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {SHADOW_DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
                size={16}
              />
            </div>
            {shadowDir !== "none" && (
              <div className="relative flex-1">
                <select
                  value={shadowIntensity}
                  onChange={(e) => setShadowIntensity(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
                >
                  {SHADOW_INTENSITIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
                  size={16}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rendered Output */}
      {outputHtml && (
        <div className="mt-5 overflow-hidden rounded-md border border-gray-400 bg-background-200">
          <div className="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
            <h4 className="text-[13px] font-medium text-gray-900">Output</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
                onClick={() => copy(currentAnsi, "ANSI copied!")}
              >
                Copy ANSI
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
                onClick={() =>
                  copy(
                    `printf "${escapeForPrintf(currentAnsi)}"`,
                    "printf command copied!",
                  )
                }
              >
                Copy printf
              </Button>
            </div>
          </div>
          {halfBlocks && cells.length > 0 ? (
            // Painted as rectangles rather than glyphs: no font draws a half
            // block at exactly half the cell height, and the mismatch shows up
            // as seams running through the letters.
            <div className="overflow-x-auto p-5">
              <BlockCanvas cells={cells} cellWidth={7} />
            </div>
          ) : (
            <>
              <TerminalControls terminalRef={terminalRef} />
              <div
                ref={terminalRef}
                className="ansi-terminal overflow-x-auto p-5"
                dangerouslySetInnerHTML={{ __html: outputHtml }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
