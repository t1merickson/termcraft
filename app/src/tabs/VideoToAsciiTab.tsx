import { useState, useRef, useCallback, useEffect } from "react";
import * as VideoToAscii from "@/engines/video-to-ascii.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Upload, Camera, Play, Pause, Square } from "lucide-react";

const CHARSETS = [
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
  { value: "blocks", label: "Blocks" },
  { value: "simple", label: "Simple" },
  { value: "extended", label: "Extended" },
];

const COLOR_MODES = [
  { value: "none", label: "None" },
  { value: "256", label: "ANSI 256" },
  { value: "24bit", label: "24-bit" },
];

const MODES = [
  { value: "brightness", label: "Brightness" },
  { value: "shape", label: "Shape-Aware" },
];

export function VideoToAsciiTab() {
  const { copy } = useClipboard();
  const videoRef = useRef<HTMLVideoElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<any>(null);

  const [maxWidth, setMaxWidth] = useState(80);
  const [maxHeight, setMaxHeight] = useState(40);
  const [fps, setFps] = useState(15);
  const [mode, setMode] = useState("brightness");
  const [charset, setCharset] = useState("standard");
  const [colorMode, setColorMode] = useState("none");
  const [invert, setInvert] = useState(false);
  const [greyscale, setGreyscale] = useState(false);
  const [contrast, setContrast] = useState(20);
  const [directional, setDirectional] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSource, setHasSource] = useState(false);
  const [actualFps, setActualFps] = useState("0");
  const [autoReduced, setAutoReduced] = useState(false);
  const [fileName, setFileName] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getOptions = useCallback(
    () => ({
      maxWidth,
      maxHeight,
      charset,
      colorMode,
      invert,
      greyscale,
      mode,
      contrastExponent: contrast / 10,
      directionalContrast: directional,
    }),
    [maxWidth, maxHeight, charset, colorMode, invert, greyscale, mode, contrast, directional],
  );

  const ensureCtrl = useCallback(() => {
    if (!ctrlRef.current && videoRef.current && terminalRef.current) {
      ctrlRef.current = VideoToAscii.create({
        video: videoRef.current,
        terminal: terminalRef.current,
        getOptions,
        onFps(fpsVal: number) {
          setActualFps(String(fpsVal));
          const factor = ctrlRef.current?.getAutoReduceFactor() || 1;
          setAutoReduced(factor > 1);
        },
      });
    }
    return ctrlRef.current;
  }, [getOptions]);

  const resetUI = useCallback(() => {
    setIsPlaying(false);
    setHasSource(false);
    setActualFps("0");
    setAutoReduced(false);
    setFileName("");
    setCameras([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctrlRef.current?.stop();
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const ctrl = ensureCtrl();
    if (!ctrl) return;
    ctrl.stop();
    try {
      await ctrl.loadFile(file);
      setFileName(file.name);
      setHasSource(true);
      ctrl.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Video load error:", err);
    }
  };

  const handleWebcam = async () => {
    const ctrl = ensureCtrl();
    if (!ctrl) return;

    // Toggle off
    if (videoRef.current?.srcObject) {
      ctrl.stop();
      resetUI();
      return;
    }

    try {
      await ctrl.startWebcam();
      setHasSource(true);
      ctrl.play();
      setIsPlaying(true);

      const cams = await ctrl.listCameras();
      if (cams.length > 1) setCameras(cams);
    } catch (err) {
      console.error("Webcam error:", err);
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (!ctrlRef.current) return;
    ctrlRef.current.stopWebcam();
    try {
      await ctrlRef.current.startWebcam(deviceId);
      ctrlRef.current.play();
    } catch (err) {
      console.error("Camera switch error:", err);
    }
  };

  const togglePlayPause = () => {
    if (!ctrlRef.current) return;
    if (ctrlRef.current.isRunning()) {
      ctrlRef.current.pause();
      setIsPlaying(false);
    } else {
      ctrlRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    ctrlRef.current?.stop();
    resetUI();
  };

  const handleFpsChange = (value: number) => {
    setFps(value);
    ctrlRef.current?.setTargetFps(value);
  };

  const chevronSvg = (
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 5.75L8 9.25L11.5 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">
        Video to ASCII
      </h1>
      <p className="mb-8 text-xl leading-[30px] text-gray-900">
        Convert video or webcam to real-time ASCII art
      </p>

      {/* Source selection */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div
          className="upload-area flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-500 bg-background-200 px-4 text-sm text-gray-900 transition-colors hover:border-gray-700 hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} className="shrink-0" />
          <span>{fileName || "Upload video"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>
        <Button
          variant="outline"
          className="h-11 gap-2 border-gray-400 bg-transparent text-sm text-gray-1000 hover:bg-gray-100"
          onClick={handleWebcam}
        >
          <Camera size={16} className="shrink-0" />
          Webcam
        </Button>
        {cameras.length > 1 && (
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="h-11 rounded-md border border-gray-400 bg-background-100 px-3 text-sm text-gray-1000 outline-none"
          >
            {cameras.map((cam, i) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Options */}
      <div className="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Max Width</label>
            <Input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(parseInt(e.target.value) || 80)}
              min={20} max={300}
              className="h-10 border-gray-400 bg-background-100 text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Max Height</label>
            <Input
              type="number"
              value={maxHeight}
              onChange={(e) => setMaxHeight(parseInt(e.target.value) || 40)}
              min={10} max={150}
              className="h-10 border-gray-400 bg-background-100 text-sm text-gray-1000 focus:border-blue-700 focus:shadow-focus-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">FPS</label>
            <div className="flex h-10 items-center gap-2">
              <Slider
                value={[fps]}
                onValueChange={([v]) => handleFpsChange(v)}
                min={5} max={30} step={1}
                className="flex-1"
              />
              <span className="w-6 text-center font-mono text-xs text-gray-900">
                {fps}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Mode</label>
            <div className="relative">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {chevronSvg}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Charset</label>
            <div className="relative">
              <select
                value={charset}
                onChange={(e) => setCharset(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {CHARSETS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {chevronSvg}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-900">Color</label>
            <div className="relative">
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
              >
                {COLOR_MODES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {chevronSvg}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Switch checked={invert} onCheckedChange={setInvert} />
            <span className="text-sm text-gray-1000">Invert</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch checked={greyscale} onCheckedChange={setGreyscale} />
            <span className="text-sm text-gray-1000">Greyscale</span>
          </div>
        </div>
        {mode === "shape" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-900">Contrast</label>
              <div className="flex h-10 items-center gap-2">
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={10} max={40} step={1}
                  className="flex-1"
                />
                <span className="w-8 text-center font-mono text-xs text-gray-900">
                  {(contrast / 10).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex h-10 items-center self-end">
              <div className="flex items-center gap-2.5">
                <Switch checked={directional} onCheckedChange={setDirectional} />
                <span className="text-xs text-gray-1000">Directional Contrast</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden video */}
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* Terminal preview */}
      <div
        ref={terminalRef}
        className="ansi-terminal mb-4 overflow-auto rounded-md border border-gray-400 bg-[#0a0a0a] p-4 font-mono text-[10px] leading-none text-gray-300 no-wrap"
        style={{
          minHeight: 200,
          "--preview-font-size": "10px",
          "--preview-line-height": "1.0",
          "--preview-letter-spacing": "0px",
        } as React.CSSProperties}
      >
        {!hasSource && (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-600">
            Upload a video or start webcam to begin
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSource}
            className="h-9 gap-1.5 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40"
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSource}
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-100 disabled:cursor-default disabled:opacity-40"
            onClick={handleStop}
          >
            Stop
          </Button>
          <span className="font-mono text-xs text-gray-600">
            {actualFps} fps
          </span>
          {autoReduced && (
            <span className="font-mono text-xs text-amber-500">
              auto-reduced
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSource}
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500 disabled:cursor-default disabled:opacity-40"
            onClick={() => {
              const text = ctrlRef.current?.getLastPlainText();
              if (text) copy(text, "ASCII frame copied!");
            }}
          >
            Copy Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSource}
            className="h-9 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500 disabled:cursor-default disabled:opacity-40"
            onClick={() => {
              const ansi = ctrlRef.current?.getLastAnsi();
              if (ansi) copy(ansi, "ANSI frame copied!");
            }}
          >
            Copy ANSI
          </Button>
        </div>
      </div>
    </div>
  );
}

// Exposed for tab switch pause behavior
export function pause() {
  // Handled by parent TabContent via ref if needed
}

export function isInitialized() {
  return false;
}
