import { useEffect, useMemo, useState, type JSX } from "react";
import { Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sample {
  id: string;
  name: string;
  note: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  best: string[];
}

export interface SamplePickerProps {
  onPick: (src: string, name: string) => void;
  /** Filter to samples whose `best` list includes this tool id. */
  tool?: string;
  className?: string;
}

let samplesPromise: Promise<Sample[]> | null = null;

function getSamples(): Promise<Sample[]> {
  if (!samplesPromise) {
    samplesPromise = fetch(
      `${import.meta.env.BASE_URL}samples/index.json`,
    ).then((response) => {
      if (!response.ok)
        throw new Error(`Sample list request failed: ${response.status}`);
      return response.json() as Promise<Sample[]>;
    });
  }
  return samplesPromise;
}

export function SamplePicker({
  onPick,
  tool,
  className,
}: SamplePickerProps): JSX.Element {
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getSamples().then(
      (result) => {
        if (mounted) setSamples(result);
      },
      () => {
        if (mounted) setFailed(true);
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  const visibleSamples = useMemo(
    () =>
      samples?.filter((sample) => !tool || sample.best.includes(tool)) ?? [],
    [samples, tool],
  );

  if (failed || (samples && visibleSamples.length === 0)) return <></>;

  const pick = (sample: Sample) => {
    setSelectedId(sample.id);
    onPick(`${import.meta.env.BASE_URL}${sample.src}`, sample.name);
  };

  const surprise = () => {
    const choices = visibleSamples.filter((sample) => sample.id !== selectedId);
    const pool = choices.length > 0 ? choices : visibleSamples;
    if (pool.length === 0) return;
    pick(pool[Math.floor(Math.random() * pool.length)]);
  };

  if (!samples) {
    return (
      <div
        className={cn("flex gap-3 overflow-hidden", className)}
        aria-label="Loading sample images"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="w-24 shrink-0 animate-pulse">
            <div className="aspect-[3/2] rounded-md bg-gray-alpha-100" />
            <div className="mx-auto mt-2 h-3 w-16 rounded-sm bg-gray-alpha-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-start gap-3 overflow-x-auto pb-2", className)}
    >
      {visibleSamples.map((sample) => (
        <button
          key={sample.id}
          type="button"
          title={sample.note}
          aria-pressed={selectedId === sample.id}
          onClick={() => pick(sample)}
          className="group w-24 shrink-0 text-center outline-none"
        >
          <span
            className={cn(
              "block aspect-[3/2] overflow-hidden rounded-md border border-gray-alpha-400 bg-gray-alpha-100 transition-[border-color,box-shadow] group-hover:border-gray-700 group-focus-visible:border-blue-700 group-focus-visible:shadow-focus-ring",
              selectedId === sample.id && "border-gray-1000",
            )}
          >
            <img
              src={`${import.meta.env.BASE_URL}${sample.thumb}`}
              alt=""
              className="size-full object-cover"
              draggable={false}
            />
          </span>
          <span className="mt-1.5 block truncate text-xs text-gray-900 group-hover:text-gray-1000">
            {sample.name}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={surprise}
        className="flex w-24 shrink-0 flex-col items-center text-xs text-gray-900 outline-none hover:text-gray-1000"
      >
        <span className="flex aspect-[3/2] w-full items-center justify-center rounded-md border border-dashed border-gray-alpha-400 bg-gray-alpha-100 transition-colors hover:border-gray-700 focus-visible:border-blue-700 focus-visible:shadow-focus-ring">
          <Shuffle className="size-5" aria-hidden="true" />
        </span>
        <span className="mt-1.5">Surprise me</span>
      </button>
    </div>
  );
}
