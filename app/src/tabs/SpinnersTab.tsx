import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  getSpinnersByCategory,
  getCategories,
  getCategoryOrder,
} from "@/engines/spinners.js";
import { useClipboard } from "@/hooks/use-clipboard";
import { Note } from "@/components/shared/Note";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Search, ChevronDown } from "lucide-react";

interface Spinner {
  name: string;
  frames: string[];
  interval: number;
  cat: string;
}

function SpinnerPreview({
  spinner,
  speed,
}: {
  spinner: Spinner;
  speed: number;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % spinner.frames.length);
    }, spinner.interval / speed);
    return () => clearInterval(timer);
  }, [spinner, speed]);

  return <>{spinner.frames[frame]}</>;
}

function DetailPanel({
  spinner,
  speed,
  onClose,
}: {
  spinner: Spinner;
  speed: number;
  onClose: () => void;
}) {
  const { copy } = useClipboard();
  const [frame, setFrame] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const categories = getCategories() as Record<string, string>;

  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % spinner.frames.length);
    }, spinner.interval / speed);
    return () => clearInterval(timer);
  }, [spinner, speed]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [spinner]);

  const copyFramesJson = () => {
    const json = JSON.stringify(
      { name: spinner.name, interval: spinner.interval, frames: spinner.frames },
      null,
      2,
    );
    copy(json, "Frames JSON copied!");
  };

  const copyBashScript = () => {
    const frames = spinner.frames.map((f) => `"${f}"`).join(" ");
    const script = `#!/bin/bash\nframes=(${frames})\nwhile true; do\n  for f in "\${frames[@]}"; do\n    printf "\\r%s" "$f"\n    sleep ${(spinner.interval / 1000).toFixed(3)}\n  done\ndone`;
    copy(script, "Bash script copied!");
  };

  return (
    <div
      ref={panelRef}
      className="mt-6 overflow-hidden rounded-md border border-gray-400 bg-background-200"
    >
      <div className="flex items-center justify-between border-b border-gray-400 bg-gray-100 px-4 py-3">
        <h4 className="text-[13px] font-medium text-gray-1000">
          {spinner.name}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
            onClick={copyFramesJson}
          >
            Copy Frames (JSON)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-gray-400 bg-transparent text-xs text-gray-1000 hover:bg-gray-200 hover:border-gray-500"
            onClick={copyBashScript}
          >
            Copy printf
          </Button>
        </div>
      </div>
      <div className="p-5">
        {/* Large preview */}
        <div className="mb-5 flex items-center justify-center rounded-sm border border-gray-400 bg-background-100 py-8">
          <span className="font-mono text-5xl text-gray-1000">
            {spinner.frames[frame]}
          </span>
        </div>
        {/* Info */}
        <div className="mb-5 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Interval</span>
            <span className="ml-2 font-mono text-gray-1000">
              {spinner.interval}ms
            </span>
          </div>
          <div>
            <span className="text-gray-600">Frames</span>
            <span className="ml-2 font-mono text-gray-1000">
              {spinner.frames.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Category</span>
            <span className="ml-2 font-mono text-gray-1000">
              {categories[spinner.cat] || spinner.cat}
            </span>
          </div>
        </div>
        {/* Frame strip */}
        <div>
          <div className="mb-2 text-xs text-gray-600">All frames</div>
          <div className="flex flex-wrap gap-1.5">
            {spinner.frames.map((f, i) => (
              <span
                key={i}
                className={`spinner-frame-chip${i === frame ? " active" : ""}`}
                title={`Frame ${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  copy(f, "Frame copied!");
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpinnersTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<Spinner | null>(null);
  const { copy } = useClipboard();

  const categories = useMemo(() => getCategories() as Record<string, string>, []);
  const categoryOrder = useMemo(() => getCategoryOrder() as string[], []);
  const grouped = useMemo(
    () => getSpinnersByCategory() as Record<string, Spinner[]>,
    [],
  );

  const filteredGroups = useMemo(() => {
    const query = search.toLowerCase().trim();
    const result: { cat: string; spinners: Spinner[] }[] = [];
    for (const cat of categoryOrder) {
      if (category !== "all" && category !== cat) continue;
      const spinners = grouped[cat].filter(
        (s) => !query || s.name.toLowerCase().includes(query),
      );
      if (spinners.length > 0) result.push({ cat, spinners });
    }
    return result;
  }, [search, category, categoryOrder, grouped]);

  const toggleSpinner = useCallback(
    (spinner: Spinner) => {
      if (selected?.name === spinner.name) {
        setSelected(null);
      } else {
        setSelected(spinner);
      }
    },
    [selected],
  );

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">
        CLI Spinners
      </h1>
      <p className="mb-8 text-xl leading-[30px] text-gray-900">
        Browse and copy animated terminal spinners
      </p>

      {/* Filter row */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-600" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spinners…"
            className="h-10 border-gray-400 bg-background-100 pl-9 pr-3 font-sans text-sm text-gray-1000 placeholder:text-gray-600 focus:border-blue-700 focus:shadow-focus-ring"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring"
          >
            <option value="all">All Categories</option>
            {categoryOrder.map((key) => (
              <option key={key} value={key}>
                {categories[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-900" size={16} />
        </div>
        <div className="flex items-center gap-2.5">
          <label className="whitespace-nowrap text-sm text-gray-900">
            Speed
          </label>
          <Slider
            value={[speed]}
            onValueChange={([v]) => setSpeed(v)}
            min={0.25}
            max={3}
            step={0.25}
            className="w-20"
          />
          <span className="w-8 text-xs tabular-nums text-gray-600">
            {speed}&times;
          </span>
        </div>
      </div>

      {/* Spinner grid */}
      <div>
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-gray-600">
            No spinners match your search
          </div>
        ) : (
          filteredGroups.map(({ cat, spinners }) => (
            <div key={cat} className="mb-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                {categories[cat]}
              </h3>
              <div className="spinner-grid-cards">
                {spinners.map((s) => (
                  <div
                    key={s.name}
                    className={`spinner-card${selected?.name === s.name ? " active" : ""}`}
                    onClick={() => toggleSpinner(s)}
                  >
                    <span className="spinner-card-preview font-mono">
                      <SpinnerPreview spinner={s} speed={speed} />
                    </span>
                    <span className="spinner-card-name">{s.name}</span>
                    <span className="spinner-card-meta">
                      {s.frames.length}f &middot; {s.interval}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          spinner={selected}
          speed={speed}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="mt-8">
        <Note>
          Spinner data curated from{" "}
          <a
            href="https://github.com/sindresorhus/cli-spinners"
            target="_blank"
            rel="noopener"
            className="text-blue-900 hover:underline"
          >
            cli-spinners
          </a>{" "}
          by sindresorhus and{" "}
          <a
            href="https://www.npmjs.com/package/unicode-animations"
            target="_blank"
            rel="noopener"
            className="text-blue-900 hover:underline"
          >
            unicode-animations
          </a>{" "}
          by gunnargray-dev
        </Note>
      </div>
    </div>
  );
}
