import { useState, useMemo, useCallback } from "react";
import * as ANSI256 from "@/engines/ansi256.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { Note } from "@/components/shared/Note";

type Mode = "ansi16" | "ansi256";

interface ColorData {
  id: number;
  r: number;
  g: number;
  b: number;
  name: string;
  hsl: { h: number; s: number; l: number };
}

interface HoveredColor {
  color: ColorData;
  x: number;
  y: number;
}

export function ColorWheelTab() {
  const [mode, setMode] = useState<Mode>("ansi256");
  const [hovered, setHovered] = useState<HoveredColor | null>(null);
  const { copy } = useClipboard();

  const { chromaticColors, grayscaleColors, colorMap } = useMemo(() => {
    const all: ColorData[] = ANSI256.PALETTE.map((c: any) => ({
      ...c,
      hsl: ANSI256.rgbToHsl(c.r, c.g, c.b),
    }));
    const chromatic = all.filter((c) => !ANSI256.isGrayscale(c.r, c.g, c.b));
    const grayscale = all
      .filter((c) => ANSI256.isGrayscale(c.r, c.g, c.b))
      .sort((a, b) => a.hsl.l - b.hsl.l);
    const map: Record<number, ColorData> = {};
    all.forEach((c) => (map[c.id] = c));
    return {
      chromaticColors: chromatic,
      grayscaleColors: grayscale,
      colorMap: map,
    };
  }, []);

  const ansi16Ids = useMemo(
    () => new Set(Array.from({ length: 16 }, (_, i) => i)),
    [],
  );
  const grayscaleIds = useMemo(
    () => new Set(grayscaleColors.map((c) => c.id)),
    [grayscaleColors],
  );

  const isVisible = useCallback(
    (id: number) => {
      if (mode === "ansi256") return true;
      if (mode === "ansi16") return ansi16Ids.has(id);
      return false;
    },
    [mode, ansi16Ids],
  );

  const containerSize = 600;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;
  const minRadius = 40;
  const maxRadius = 280;

  const handleMouseMove = useCallback(
    (color: ColorData, e: React.MouseEvent) => {
      setHovered({ color, x: e.clientX + 15, y: e.clientY + 15 });
    },
    [],
  );

  const handleClick = useCallback(
    (id: number) => {
      const escapeCode = ANSI256.fgEscapeString(id);
      copy(escapeCode, `Copied: ${escapeCode}`);
    },
    [copy],
  );

  return (
    <div>
      <h1 className="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">
        Color Wheel
      </h1>
      <p className="mb-8 text-xl leading-[30px] text-gray-900">
        Explore the full ANSI 256 color palette
      </p>

      {/* Mode Selector */}
      <div className="mb-5 flex justify-center gap-2">
        {(["ansi16", "ansi256"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-3 text-[13px] transition-colors hover:bg-background-200 hover:text-gray-1000 focus-visible:shadow-focus-ring ${
              mode === m
                ? "mode-btn active text-gray-1000"
                : "mode-btn text-gray-900"
            }`}
          >
            <span
              className="size-3 rounded-[3px] border border-gray-500"
              style={{
                backgroundColor: ANSI256.rgbToHex(
                  colorMap[m === "ansi16" ? 1 : 17].r,
                  colorMap[m === "ansi16" ? 1 : 17].g,
                  colorMap[m === "ansi16" ? 1 : 17].b,
                ),
              }}
            />
            <span>{m === "ansi16" ? "ANSI 16" : "ANSI 256"}</span>
          </button>
        ))}
      </div>

      {/* Grayscale Strip */}
      <div className="mb-5 flex flex-col items-center gap-2">
        <div className="text-xs text-gray-600">
          Grayscale: Black &rarr; White
        </div>
        <div className="flex gap-0.5 rounded-sm bg-background-200 p-2">
          {grayscaleColors.map((color) => (
            <div
              key={color.id}
              className={`grayscale-cell${!isVisible(color.id) ? " hidden" : ""}`}
              style={{
                backgroundColor: ANSI256.rgbToHex(color.r, color.g, color.b),
                color: color.hsl.l > 50 ? "#000" : "#fff",
              }}
              onMouseEnter={(e) => handleMouseMove(color, e)}
              onMouseMove={(e) => handleMouseMove(color, e)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleClick(color.id)}
            >
              <span className="code">{color.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color Wheel */}
      <div className="flex justify-center">
        <div
          className="relative"
          style={{ width: containerSize, height: containerSize }}
        >
          {chromaticColors.map((color) => {
            const angle = color.hsl.h * (Math.PI / 180);
            const radius =
              minRadius + (color.hsl.l / 100) * (maxRadius - minRadius);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY - radius * Math.sin(angle);
            const visible = isVisible(color.id);

            return (
              <div
                key={color.id}
                className={`color-cell${!visible ? " hidden" : ""}`}
                style={{
                  backgroundColor: ANSI256.rgbToHex(color.r, color.g, color.b),
                  color: color.hsl.l > 50 ? "#000" : "#fff",
                  left: x,
                  top: y,
                }}
                onMouseEnter={(e) => handleMouseMove(color, e)}
                onMouseMove={(e) => handleMouseMove(color, e)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleClick(color.id)}
              >
                <span className="code">{color.id}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="tooltip visible"
          style={{
            left: Math.min(
              hovered.x,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 210,
            ),
            top: Math.min(
              hovered.y,
              (typeof window !== "undefined" ? window.innerHeight : 800) - 200,
            ),
          }}
        >
          <div
            className="mb-2.5 h-10 w-full rounded-sm"
            style={{
              backgroundColor: ANSI256.rgbToHex(
                hovered.color.r,
                hovered.color.g,
                hovered.color.b,
              ),
            }}
          />
          <div className="flex justify-between py-1">
            <span className="text-gray-900">ANSI Code:</span>
            <span className="font-mono text-gray-1000">{hovered.color.id}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-900">Name:</span>
            <span className="font-mono text-gray-1000">
              {hovered.color.name}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-900">Hex:</span>
            <span className="font-mono text-gray-1000">
              {ANSI256.rgbToHex(
                hovered.color.r,
                hovered.color.g,
                hovered.color.b,
              )}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-900">RGB:</span>
            <span className="font-mono text-gray-1000">
              {hovered.color.r}, {hovered.color.g}, {hovered.color.b}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-900">HSL:</span>
            <span className="font-mono text-gray-1000">
              {hovered.color.hsl.h}&deg;, {hovered.color.hsl.s}%,{" "}
              {hovered.color.hsl.l}%
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-900">Escape:</span>
            <span className="font-mono text-gray-1000">
              {ANSI256.fgEscapeString(hovered.color.id)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Note>Colors computed from ANSI 256 specification</Note>
      </div>
    </div>
  );
}
