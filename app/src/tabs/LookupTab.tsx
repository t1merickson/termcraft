import { useState, useMemo } from "react";
import * as ANSI256 from "@/engines/ansi256.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LookupResult {
  inputHex: string;
  ansiColor: { id: number; r: number; g: number; b: number; name: string };
  ansiHex: string;
  ansiHsl: { h: number; s: number; l: number };
  distance: number;
  escapeCode: string;
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="flex size-20 flex-col items-center justify-end rounded-md border border-gray-500 pb-2"
      style={{ backgroundColor: color }}
    >
      <span className="rounded-[3px] bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
        {label}
      </span>
    </div>
  );
}

function ResultGrid({ result }: { result: LookupResult }) {
  const items = [
    { label: "ANSI Code", value: String(result.ansiColor.id) },
    { label: "Name", value: result.ansiColor.name },
    { label: "HEX", value: result.ansiHex },
    {
      label: "RGB",
      value: `${result.ansiColor.r}, ${result.ansiColor.g}, ${result.ansiColor.b}`,
    },
    {
      label: "HSL",
      value: `${result.ansiHsl.h}\u00B0, ${result.ansiHsl.s}%, ${result.ansiHsl.l}%`,
    },
    { label: "Distance", value: result.distance.toFixed(2) },
  ];

  return (
    <div className="rounded-md border border-gray-400 bg-background-200 p-6">
      <div className="mb-5 flex items-center justify-center gap-5">
        <ColorSwatch color={result.inputHex} label="Input" />
        <span className="text-2xl text-gray-600">&rarr;</span>
        <ColorSwatch
          color={result.ansiHex}
          label={`ANSI ${result.ansiColor.id}`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-sm bg-gray-100 p-3">
            <div className="mb-1 text-xs text-gray-600">{item.label}</div>
            <div className="font-mono text-sm text-gray-1000">{item.value}</div>
          </div>
        ))}
        <div className="col-span-2 rounded-sm bg-gray-100 p-3">
          <div className="mb-1 text-xs text-gray-600">Escape Code</div>
          <div className="font-mono text-sm text-gray-1000">
            {result.escapeCode}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LookupTab() {
  const [hex, setHex] = useState("");
  const [rgb, setRgb] = useState({ r: "", g: "", b: "" });
  const [hsl, setHsl] = useState({ h: "", s: "", l: "" });
  const [result, setResult] = useState<LookupResult | null>(null);

  function showResult(r: number, g: number, b: number) {
    const nearest = ANSI256.findNearest(r, g, b, "euclidean");
    const ansi = nearest.color;
    setResult({
      inputHex: ANSI256.rgbToHex(r, g, b),
      ansiColor: ansi,
      ansiHex: ANSI256.rgbToHex(ansi.r, ansi.g, ansi.b),
      ansiHsl: ANSI256.rgbToHsl(ansi.r, ansi.g, ansi.b),
      distance: nearest.distance,
      escapeCode: ANSI256.fgEscapeString(ansi.id),
    });
  }

  // Derive preview colors from current input values
  const hexPreviewColor = useMemo(() => {
    let val = hex.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#[0-9A-Fa-f]{3}$/.test(val) || /^#[0-9A-Fa-f]{6}$/.test(val)) {
      return val;
    }
    return "transparent";
  }, [hex]);

  const rgbPreviewColor = useMemo(() => {
    const r = parseInt(rgb.r) || 0;
    const g = parseInt(rgb.g) || 0;
    const b = parseInt(rgb.b) || 0;
    return `rgb(${r}, ${g}, ${b})`;
  }, [rgb]);

  const hslPreviewColor = useMemo(() => {
    const h = parseInt(hsl.h) || 0;
    const s = parseInt(hsl.s) || 0;
    const l = parseInt(hsl.l) || 0;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }, [hsl]);

  function lookupHex() {
    let val = hex.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (!/^#[0-9A-Fa-f]{6}$/.test(val) && !/^#[0-9A-Fa-f]{3}$/.test(val))
      return;
    const c = ANSI256.hexToRgb(val);
    showResult(c.r, c.g, c.b);
  }

  function lookupRgb() {
    const r = Math.min(255, Math.max(0, parseInt(rgb.r) || 0));
    const g = Math.min(255, Math.max(0, parseInt(rgb.g) || 0));
    const b = Math.min(255, Math.max(0, parseInt(rgb.b) || 0));
    showResult(r, g, b);
  }

  function lookupHsl() {
    const h = Math.min(360, Math.max(0, parseInt(hsl.h) || 0));
    const s = Math.min(100, Math.max(0, parseInt(hsl.s) || 0));
    const l = Math.min(100, Math.max(0, parseInt(hsl.l) || 0));
    const c = ANSI256.hslToRgb(h, s, l);
    showResult(c.r, c.g, c.b);
  }

  return (
    <div className="max-w-[600px]">
      {/* HEX Input */}
      <div className="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-900">HEX Color</h3>
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-sm text-gray-1000">HEX</label>
          <div className="flex items-center gap-2.5">
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupHex()}
              placeholder="#FF5733 or FF5733"
              maxLength={7}
              className="h-10 border-gray-400 bg-background-100 font-sans text-sm text-gray-1000 placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring"
            />
            <div
              className="size-10 shrink-0 rounded-sm border border-gray-500"
              style={{ backgroundColor: hexPreviewColor }}
            />
          </div>
        </div>
        <Button
          onClick={lookupHex}
          className="h-10 w-full bg-gray-1000 text-sm font-medium text-background-200 hover:bg-gray-alpha-1000"
        >
          Find Nearest ANSI Color
        </Button>
      </div>

      {/* RGB Input */}
      <div className="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-900">RGB Color</h3>
        <div className="mb-4 flex items-end gap-3">
          {(["r", "g", "b"] as const).map((channel) => (
            <div key={channel} className="flex flex-1 flex-col gap-2">
              <label className="text-[13px] text-gray-1000">
                {channel.toUpperCase()}
              </label>
              <Input
                type="number"
                value={rgb[channel]}
                onChange={(e) =>
                  setRgb((prev) => ({ ...prev, [channel]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && lookupRgb()}
                placeholder="0-255"
                min={0}
                max={255}
                className="h-10 border-gray-400 bg-background-100 font-mono text-sm text-gray-1000 placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring"
              />
            </div>
          ))}
          <div
            className="size-10 shrink-0 rounded-sm border border-gray-500"
            style={{ backgroundColor: rgbPreviewColor }}
          />
        </div>
        <Button
          onClick={lookupRgb}
          className="h-10 w-full bg-gray-1000 text-sm font-medium text-background-200 hover:bg-gray-alpha-1000"
        >
          Find Nearest ANSI Color
        </Button>
      </div>

      {/* HSL Input */}
      <div className="mb-5 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-900">HSL Color</h3>
        <div className="mb-4 flex items-end gap-3">
          {(
            [
              { key: "h", label: "H", placeholder: "0-360", max: 360 },
              { key: "s", label: "S", placeholder: "0-100", max: 100 },
              { key: "l", label: "L", placeholder: "0-100", max: 100 },
            ] as const
          ).map(({ key, label, placeholder, max }) => (
            <div key={key} className="flex flex-1 flex-col gap-2">
              <label className="text-[13px] text-gray-1000">{label}</label>
              <Input
                type="number"
                value={hsl[key]}
                onChange={(e) =>
                  setHsl((prev) => ({ ...prev, [key]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && lookupHsl()}
                placeholder={placeholder}
                min={0}
                max={max}
                className="h-10 border-gray-400 bg-background-100 font-mono text-sm text-gray-1000 placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring"
              />
            </div>
          ))}
          <div
            className="size-10 shrink-0 rounded-sm border border-gray-500"
            style={{ backgroundColor: hslPreviewColor }}
          />
        </div>
        <Button
          onClick={lookupHsl}
          className="h-10 w-full bg-gray-1000 text-sm font-medium text-background-200 hover:bg-gray-alpha-1000"
        >
          Find Nearest ANSI Color
        </Button>
      </div>

      {/* Result */}
      {result && <ResultGrid result={result} />}
    </div>
  );
}
