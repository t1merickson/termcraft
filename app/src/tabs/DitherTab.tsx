import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ChevronDown } from "lucide-react";
import {
  dither,
  DITHER_ALGORITHMS,
  PALETTES,
  type DitherName,
} from "@/engines/dither";
import { renderBraille } from "@/engines/braille";
import { renderBlockChars } from "@/engines/image-to-ansi.js";
import { RAMPS, rampFor } from "@/engines/ramps";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useDefaultSample } from "@/hooks/use-default-sample";
import { SamplePicker } from "@/components/shared/SamplePicker";
import { useClipboard } from "@/hooks/use-clipboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TerminalControls } from "@/components/shared/TerminalControls";

type OutputMode = "blocks" | "braille" | "ramp";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function renderRamp(imageData: ImageData, rampId: string) {
  const chars = rampFor(rampId);
  let ansi = "",
    html = "",
    text = "";
  for (let y = 0; y < imageData.height; y++) {
    let last = "";
    for (let x = 0; x < imageData.width; x++) {
      const p = (y * imageData.width + x) * 4;
      const r = imageData.data[p],
        g = imageData.data[p + 1],
        b = imageData.data[p + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const char =
        chars[
          Math.min(
            chars.length - 1,
            Math.floor((luminance / 256) * chars.length),
          )
        ];
      const code = `38;2;${r};${g};${b}`;
      if (code !== last) {
        ansi += `\x1b[${code}m`;
        last = code;
      }
      ansi += char;
      html += `<span style="color:rgb(${r},${g},${b})">${escapeHtml(char)}</span>`;
      text += char;
    }
    ansi += "\x1b[0m\n";
    html += "\n";
    text += "\n";
  }
  return { ansi, html, text };
}

export function DitherTab() {
  const upload = useImageUpload();
  useDefaultSample(upload.loadFromUrl, {
    id: "portrait-bust",
    name: "Portrait Bust",
  });
  const { copy } = useClipboard();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [algorithm, setAlgorithm] = useState<DitherName>("floyd-steinberg");
  const [palette, setPalette] = useState("mono-1bit");
  const [strength, setStrength] = useState(100);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [serpentine, setSerpentine] = useState(true);
  const [outputMode, setOutputMode] = useState<OutputMode>("blocks");
  const [ramp, setRamp] = useState("standard");
  const [maxWidth, setMaxWidth] = useState(80);
  const [processing, setProcessing] = useState(false);
  const [outputHtml, setOutputHtml] = useState("");
  const [plainText, setPlainText] = useState("");
  const [ansiText, setAnsiText] = useState("");

  const processImage = useCallback(
    (img: HTMLImageElement) => {
      const cols = Math.max(10, maxWidth);
      const pixelWidth = outputMode === "braille" ? cols * 2 : cols;
      const cellPixelHeight = outputMode === "braille" ? 4 : 1;
      const rawHeight = Math.max(
        cellPixelHeight,
        Math.round(pixelWidth / (img.width / img.height) / 2),
      );
      const pixelHeight =
        outputMode === "braille"
          ? Math.max(4, Math.round(rawHeight / 4) * 4)
          : rawHeight;
      const canvas = document.createElement("canvas");
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
      const result = dither(ctx.getImageData(0, 0, pixelWidth, pixelHeight), {
        algorithm,
        palette,
        strength: strength / 100,
        serpentine,
        brightness: brightness / 100,
        contrast: contrast / 100,
      });
      if (outputMode === "braille") {
        const rendered = renderBraille(result, cols, pixelHeight / 4, {
          threshold: 128,
          color: "24bit",
        });
        setOutputHtml(rendered.html);
        setPlainText(rendered.text);
        setAnsiText(rendered.ansi);
      } else if (outputMode === "ramp") {
        const rendered = renderRamp(result, ramp);
        setOutputHtml(rendered.html);
        setPlainText(rendered.text);
        setAnsiText(rendered.ansi);
      } else {
        const rendered = renderBlockChars(
          result.data,
          result.width,
          result.height,
          true,
        );
        setOutputHtml(rendered.html);
        setPlainText(
          rendered.cells
            .map((row: { char: string }[]) =>
              row.map((cell) => cell.char).join(""),
            )
            .join("\n") + "\n",
        );
        setAnsiText(rendered.ansi);
      }
    },
    [
      algorithm,
      palette,
      strength,
      serpentine,
      brightness,
      contrast,
      outputMode,
      ramp,
      maxWidth,
    ],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setProcessing(true);
      try {
        const img = await upload.processFile(file);
        processImage(img);
      } catch (error) {
        console.error("Error processing image:", error);
      } finally {
        setProcessing(false);
      }
    },
    [upload, processImage],
  );

  useEffect(() => {
    if (upload.image) processImage(upload.image);
  }, [upload.image, processImage]);
  const isDiffusion =
    DITHER_ALGORITHMS.find((item) => item.id === algorithm)?.kind ===
    "diffusion";
  const chevron = (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
      size={16}
    />
  );
  const selectClass =
    "h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 text-sm text-gray-1000 outline-none focus:border-blue-700 focus:shadow-focus-ring";

  return (
    <div className="mx-auto max-w-[1400px]">
      <div
        className={`upload-area mb-5 cursor-pointer rounded-md border-2 border-dashed border-gray-400 bg-background-200 p-12 text-center transition-colors hover:border-gray-600 hover:bg-gray-100${upload.isDragging ? " drag-over" : ""}${upload.image ? " has-image" : ""}`}
        onClick={upload.openFilePicker}
        onDragOver={upload.onDragOver}
        onDragLeave={upload.onDragLeave}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) handleFileUpload(file);
        }}
      >
        {!upload.image ? (
          <div>
            <div className="mb-4 flex justify-center opacity-50">
              <Upload size={48} />
            </div>

            <p className="mb-2 text-gray-900">
              Drop an image here or click to upload
            </p>
            <p className="text-xs text-gray-600">
              Supports PNG, JPG, GIF, WebP
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <img
              src={upload.dataUrl!}
              alt="Source"
              className="max-h-20 max-w-[120px] rounded-sm object-contain"
            />
            <div className="flex flex-col gap-1">
              <div className="text-[13px] text-gray-900">
                {upload.image.width} &times; {upload.image.height} pixels
              </div>
              <p className="text-xs text-gray-600">
                Click or drop to change image
              </p>
            </div>
          </div>
        )}
        <input
          ref={upload.fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      <SamplePicker
        tool="dither"
        className="mb-5"
        onPick={(src, name) => {
          upload.loadFromUrl(src, name).catch(() => {});
        }}
      />

      <Card className="mb-5 gap-4 rounded-md border-gray-400 bg-background-200 p-5 py-5 shadow-none">
        <h3 className="text-[13px] font-medium text-gray-900">Options</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Algorithm</label>
            <div className="relative">
              <select
                value={algorithm}
                onChange={(event) =>
                  setAlgorithm(event.target.value as DitherName)
                }
                className={selectClass}
              >
                {DITHER_ALGORITHMS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              {chevron}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Palette</label>
            <div className="relative">
              <select
                value={palette}
                onChange={(event) => setPalette(event.target.value)}
                className={selectClass}
              >
                {Object.entries(PALETTES).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.label} ({item.colors.length})
                  </option>
                ))}
              </select>
              {chevron}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Max Width</label>
            <Input
              type="number"
              min={10}
              max={200}
              value={maxWidth}
              onChange={(event) =>
                setMaxWidth(Number.parseInt(event.target.value) || 80)
              }
              className="h-10 border-gray-400 bg-background-100"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Strength", value: strength, set: setStrength },
            { label: "Brightness", value: brightness, set: setBrightness },
            { label: "Contrast", value: contrast, set: setContrast },
          ].map((control) => (
            <div key={control.label} className="flex flex-col gap-2">
              <label className="text-xs text-gray-900">{control.label}</label>
              <div className="flex h-8 items-center gap-2">
                <Slider
                  value={[control.value]}
                  onValueChange={([value]) => control.set(value)}
                  min={control.label === "Strength" ? 0 : -100}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="min-w-[38px] text-right text-xs text-gray-700">
                  {control.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Output Mode</label>
            <ToggleGroup
              type="single"
              value={outputMode}
              onValueChange={(value) =>
                value && setOutputMode(value as OutputMode)
              }
              variant="outline"
            >
              <ToggleGroupItem value="blocks">Block characters</ToggleGroupItem>
              <ToggleGroupItem value="braille">Braille</ToggleGroupItem>
              <ToggleGroupItem value="ramp">Character ramp</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {outputMode === "ramp" && (
            <div className="flex min-w-[220px] flex-col gap-1.5">
              <label className="text-xs text-gray-900">Character Ramp</label>
              <div className="relative">
                <select
                  value={ramp}
                  onChange={(event) => setRamp(event.target.value)}
                  className={selectClass}
                >
                  {RAMPS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.chars}
                    </option>
                  ))}
                </select>
                {chevron}
              </div>
            </div>
          )}
          <div className="flex h-10 items-center gap-2.5">
            <Switch
              checked={serpentine}
              disabled={!isDiffusion}
              onCheckedChange={setSerpentine}
            />
            <span className="text-sm text-gray-1000">Serpentine diffusion</span>
          </div>
        </div>
      </Card>

      {processing && (
        <div className="processing visible">
          <div className="geist-loading-dots">
            <span />
            <span />
            <span />
          </div>
          <p>Processing image...</p>
        </div>
      )}
      {outputHtml && !processing && (
        <div className="mb-5 overflow-hidden rounded-md border border-gray-400 bg-background-200">
          <div className="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
            <h4 className="text-[13px] font-medium text-gray-900">
              Dithered Output
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-gray-400 bg-transparent text-xs"
                onClick={() => copy(plainText, "Plain text copied!")}
              >
                Copy text
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-gray-400 bg-transparent text-xs"
                onClick={() => copy(ansiText, "ANSI copied!")}
              >
                Copy ANSI
              </Button>
            </div>
          </div>
          <TerminalControls terminalRef={terminalRef} noWrap />
          <div ref={terminalRef}>
            <pre
              className="ansi-terminal min-h-[200px] max-h-[700px] overflow-auto p-4 no-wrap"
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
