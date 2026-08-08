import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { createBuffer, renderTorus, type Buffer } from "./scene";
import { ENCODERS, cellAspectFor } from "./encoders";

const COLS = 96;
const ROWS = 30;
/** Geist Mono advance width as a fraction of font size. */
const CHAR_RATIO = 0.6;
/** How long each renderer holds the stage before the next one takes over. */
const MODE_MS = 5200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [fontSize, setFontSize] = useState(11);
  const [mode, setMode] = useState(0);
  const [auto, setAuto] = useState(true);

  // Keep the grid a fixed 96 columns and scale the type to fit, so the art
  // stays the same composition at every window size.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (!width) return;
      setFontSize(Math.max(4, Math.min(15, width / (COLS * CHAR_RATIO))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One buffer per renderer, since each samples the scene at its own density.
  const buffersRef = useRef<Buffer[]>([]);
  if (buffersRef.current.length === 0) {
    buffersRef.current = ENCODERS.map((e) =>
      createBuffer(COLS * e.sx, ROWS * e.sy),
    );
  }

  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let angleA = 0;
    let angleB = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;

      if (!reduced) {
        angleA += dt * 0.55;
        angleB += dt * 0.31;
      }

      const i = modeRef.current;
      const enc = ENCODERS[i];
      const buf = buffersRef.current[i];
      renderTorus(buf, angleA, angleB, cellAspectFor(enc));
      if (preRef.current) {
        preRef.current.innerHTML = enc.encode(buf, COLS, ROWS);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Rotate through the renderers until someone picks one by hand.
  useEffect(() => {
    if (!auto || prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setMode((m) => (m + 1) % ENCODERS.length),
      MODE_MS,
    );
    return () => window.clearInterval(id);
  }, [auto]);

  return (
    <div className="w-full">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-lg border border-gray-alpha-400 bg-background-200"
      >
        <pre
          ref={preRef}
          aria-hidden="true"
          className="m-0 select-none overflow-hidden p-3 font-mono text-gray-1000"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            letterSpacing: 0,
            // Reserve the height before the first frame lands so the page
            // does not jump.
            minHeight: `${ROWS * fontSize + 24}px`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background-200 to-transparent" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-gray-600">
          Same scene, five ways
        </span>
        {ENCODERS.map((enc, i) => (
          <button
            key={enc.id}
            type="button"
            onClick={() => {
              setMode(i);
              setAuto(false);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              i === mode
                ? "border-gray-alpha-500 bg-gray-alpha-200 text-gray-1000"
                : "border-gray-alpha-400 text-gray-900 hover:border-gray-alpha-500 hover:text-gray-1000",
            )}
          >
            {enc.label}
          </button>
        ))}
      </div>
    </div>
  );
}
