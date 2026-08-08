import { useState, useRef, useCallback, useEffect } from "react";
import * as ImageToAnsi from "@/engines/image-to-ansi.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { useImageUpload } from "@/hooks/use-image-upload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TerminalControls } from "@/components/shared/TerminalControls";
import { Upload, ChevronDown } from "lucide-react";

const RENDER_MODES = [
  { value: "half", label: "▀▄ Half Blocks (fg+bg)" },
  { value: "halffg", label: "▀▄ Half Blocks (fg only)" },
  { value: "quad", label: "▚ Quadrant (fg only)" },
  { value: "sextant", label: "🬔 Sextant (2×3)" },
  { value: "octant", label: "𜴀 Octant (2×4, Unicode 16)" },
  { value: "block", label: "█ Full Block (fg only)" },
  { value: "full", label: "██ Spaces (bg only)" },
  { value: "binary", label: "Binary (no color)" },
];

const COLOR_DEPTHS = [
  { value: "24bit", label: "24-bit True Color" },
  { value: "256", label: "256 Color" },
];

export function ImageToAnsiTab() {
  const { copy } = useClipboard();
  const upload = useImageUpload();
  const terminalRef = useRef<HTMLDivElement>(null);

  const [maxWidth, setMaxWidth] = useState(80);
  const [maxHeight, setMaxHeight] = useState(40);
  const [renderMode, setRenderMode] = useState("half");
  const [colorDepth, setColorDepth] = useState("24bit");
  const [invert, setInvert] = useState(false);
  const [greyscale, setGreyscale] = useState(false);
  const [is1to1, setIs1to1] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [outputHtml, setOutputHtml] = useState("");
  const [currentAnsi, setCurrentAnsi] = useState("");

  const getRenderMode = useCallback(() => {
    const base = renderMode;
    if (base === "binary") return "binary";
    const suffix = is1to1 ? "-1x" : "";
    return `${base}-${colorDepth}${suffix}`;
  }, [renderMode, colorDepth, is1to1]);

  const processImage = useCallback(
    (img: HTMLImageElement) => {
      const result = ImageToAnsi.processImage(img, {
        maxWidth: is1to1 ? img.width : maxWidth,
        maxHeight: is1to1 ? img.height : maxHeight,
        renderMode: getRenderMode(),
        invert,
        greyscale,
      });
      setCurrentAnsi(result.ansi);
      setOutputHtml(`<code>${result.html}</code>`);
    },
    [maxWidth, maxHeight, getRenderMode, invert, greyscale, is1to1],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setProcessing(true);
      try {
        const img = await upload.processFile(file);
        processImage(img);
      } catch (err) {
        console.error("Error processing image:", err);
      }
      setProcessing(false);
    },
    [upload, processImage],
  );

  // Reprocess when options change
  useEffect(() => {
    if (upload.image) {
      processImage(upload.image);
    }
  }, [maxWidth, maxHeight, renderMode, colorDepth, invert, greyscale, is1to1]);

  const setScale = (factor: number) => {
    if (!upload.image) return;
    setIs1to1(false);
    setMaxWidth(Math.floor(upload.image.width * factor));
    setMaxHeight(Math.floor(upload.image.height * factor));
  };

  const chevronSvg = (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900"
      size={16}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">
        Image to ANSI
      </h1>
      <p className="mb-8 text-xl leading-[30px] text-gray-900">
        Convert images to ANSI 256 color terminal art
      </p>

      {/* Upload Area */}
      <div
        className={`upload-area mb-5 cursor-pointer rounded-md border-2 border-dashed border-gray-400 bg-background-200 p-12 text-center transition-colors hover:border-gray-600 hover:bg-gray-100${upload.isDragging ? " drag-over" : ""}${upload.image ? " has-image" : ""}`}
        onClick={upload.openFilePicker}
        onDragOver={upload.onDragOver}
        onDragLeave={upload.onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
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
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Options Panel */}
      <div className="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <h3 className="text-[13px] font-medium text-gray-900">Options</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Max Width</label>
            <Input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(parseInt(e.target.value) || 80)}
              disabled={is1to1}
              min={10}
              max={300}
              className="h-10 border-gray-400 bg-background-100 text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Max Height</label>
            <Input
              type="number"
              value={maxHeight}
              onChange={(e) => setMaxHeight(parseInt(e.target.value) || 40)}
              disabled={is1to1}
              min={10}
              max={150}
              className="h-10 border-gray-400 bg-background-100 text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Scale</label>
            <div className="flex gap-1.5">
              {[
                { label: "½×", factor: 0.5 },
                { label: "1×", factor: 1 },
                { label: "2×", factor: 2 },
              ].map(({ label, factor }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  disabled={!upload.image}
                  className="h-10 flex-1 border-gray-400 bg-transparent text-xs text-gray-900 hover:bg-background-200"
                  onClick={() => setScale(factor)}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={!upload.image}
                className={`h-10 flex-1 border-gray-400 bg-transparent text-xs text-gray-900 hover:bg-background-200${is1to1 ? " active" : ""}`}
                onClick={() => setIs1to1(!is1to1)}
              >
                1:1
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Render Mode</label>
            <div className="relative">
              <select
                value={renderMode}
                onChange={(e) => setRenderMode(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {RENDER_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {chevronSvg}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Color Depth</label>
            <div className="relative">
              <select
                value={colorDepth}
                onChange={(e) => setColorDepth(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {COLOR_DEPTHS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {chevronSvg}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Switch checked={invert} onCheckedChange={setInvert} />
            <span className="text-sm text-gray-1000">Invert Brightness</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch checked={greyscale} onCheckedChange={setGreyscale} />
            <span className="text-sm text-gray-1000">Greyscale</span>
          </div>
        </div>
      </div>

      {/* Processing */}
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

      {/* Preview Area */}
      {outputHtml && !processing && (
        <div className="mb-5">
          <div className="overflow-hidden rounded-md border border-gray-400 bg-background-200">
            <div className="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
              <h4 className="text-[13px] font-medium text-gray-900">
                ANSI Output
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
                  onClick={() =>
                    copy(
                      `printf "${ImageToAnsi.escapeForPrintf(currentAnsi)}"`,
                      "printf command copied!",
                    )
                  }
                >
                  Copy printf
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
                  onClick={() => copy(currentAnsi, "ANSI codes copied!")}
                >
                  Copy ANSI
                </Button>
              </div>
            </div>
            <TerminalControls terminalRef={terminalRef} noWrap />
            <div
              ref={terminalRef}
              className="ansi-terminal min-h-[200px] max-h-[700px] overflow-auto p-4 no-wrap"
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
