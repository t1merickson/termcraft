import { useMemo, useRef, useState } from "react";
import { BORDER_STYLES, frame, table, tree } from "@/engines/boxes";
import { useClipboard } from "@/hooks/use-clipboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TerminalControls } from "@/components/shared/TerminalControls";

type Mode = "frame" | "table" | "tree";
type Align = "auto" | "left" | "center" | "right";
const styles = Object.keys(BORDER_STYLES);
const selectClass =
  "h-9 rounded-md border border-gray-400 bg-background-100 px-3 text-sm text-gray-1000";
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs text-gray-900">{children}</label>
);
export function BoxesTab() {
  const { copy } = useClipboard(),
    terminalRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("frame");
  const [style, setStyle] = useState("rounded");
  const [padding, setPadding] = useState(1);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [title, setTitle] = useState("Termcraft");
  const [fixed, setFixed] = useState(false);
  const [width, setWidth] = useState(30);
  const [delimiter, setDelimiter] = useState(",");
  const [header, setHeader] = useState(true);
  const [inner, setInner] = useState(false);
  const [alignments, setAlignments] = useState<Align[]>([
    "auto",
    "auto",
    "auto",
  ]);
  const [content, setContent] = useState(
    "Build terminal interfaces\nwithout fighting Unicode.",
  );
  const [tableText, setTableText] = useState(
    "package,version,status\nvite,7.3.1,ready\nreact,19.2,ready\nemoji,🎨,wide",
  );
  const [treeText, setTreeText] = useState(
    "termcraft\n  app\n    src\n      engines\n      tabs\n    package.json\n  README.md",
  );
  const output = useMemo(() => {
    if (mode === "frame")
      return frame(content, {
        style,
        padding,
        align,
        title,
        width: fixed ? width : undefined,
      });
    if (mode === "tree") return tree(treeText);
    const rows = tableText
      .split(/\r?\n/)
      .filter(Boolean)
      .map((r) =>
        r.split(delimiter === "\\t" ? "\t" : delimiter).map((c) => c.trim()),
      );
    return table(rows, {
      style,
      padding,
      header,
      innerRows: inner,
      alignments,
    });
  }, [
    mode,
    content,
    style,
    padding,
    align,
    title,
    fixed,
    width,
    treeText,
    tableText,
    delimiter,
    header,
    inner,
    alignments,
  ]);
  const columns = Math.max(
    1,
    ...tableText
      .split(/\r?\n/)
      .map((r) => r.split(delimiter === "\\t" ? "\t" : delimiter).length),
  );
  return (
    <div className="mx-auto max-w-[900px]">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => v && setMode(v as Mode)}
        variant="outline"
        className="mb-5"
      >
        {["frame", "table", "tree"].map((v) => (
          <ToggleGroupItem key={v} value={v} className="capitalize">
            {v}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Card className="mb-5 gap-4 rounded-md border-gray-400 bg-background-200 py-5">
        <CardContent className="grid gap-4 px-5">
          <div className="flex flex-col gap-2">
            <Label>
              {mode === "tree"
                ? "Indented lines"
                : mode === "table"
                  ? "Rows"
                  : "Content"}
            </Label>
            <textarea
              value={
                mode === "tree"
                  ? treeText
                  : mode === "table"
                    ? tableText
                    : content
              }
              onChange={(e) =>
                mode === "tree"
                  ? setTreeText(e.target.value)
                  : mode === "table"
                    ? setTableText(e.target.value)
                    : setContent(e.target.value)
              }
              rows={7}
              className="resize-y rounded-md border border-gray-400 bg-background-100 p-3 font-mono text-sm text-gray-1000 outline-none focus:border-blue-700"
            />
          </div>
          {mode !== "tree" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Border style</Label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className={selectClass}
                  >
                    {styles.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    {mode === "table" ? "Cell padding" : "Padding"}: {padding}
                  </Label>
                  <Slider
                    value={[padding]}
                    onValueChange={([v]) => setPadding(v)}
                    min={0}
                    max={4}
                  />
                </div>
              </div>
              {mode === "frame" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Alignment</Label>
                      <ToggleGroup
                        type="single"
                        value={align}
                        onValueChange={(v) => v && setAlign(v as typeof align)}
                        variant="outline"
                      >
                        {["left", "center", "right"].map((v) => (
                          <ToggleGroupItem key={v} value={v}>
                            {v}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="border-gray-400 bg-background-100"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={fixed} onCheckedChange={setFixed} />
                    <Label>Fixed width</Label>
                    {fixed && (
                      <>
                        <Slider
                          value={[width]}
                          onValueChange={([v]) => setWidth(v)}
                          min={10}
                          max={80}
                          className="max-w-48"
                        />
                        <span className="text-xs text-gray-700">{width}</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Delimiter</Label>
                      <select
                        value={delimiter}
                        onChange={(e) => setDelimiter(e.target.value)}
                        className={selectClass}
                      >
                        <option value=",">Comma</option>
                        <option value="\t">Tab</option>
                        <option value="|">Pipe</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={header} onCheckedChange={setHeader} />
                      <Label>Header row</Label>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={inner} onCheckedChange={setInner} />
                      <Label>Inner separators</Label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label>Column alignment</Label>
                    {Array.from({ length: columns }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Column ${i + 1} alignment`}
                        onClick={() =>
                          setAlignments((a) => {
                            const n = [...a],
                              order: Align[] = [
                                "auto",
                                "left",
                                "center",
                                "right",
                              ];
                            n[i] =
                              order[
                                (order.indexOf(n[i] ?? "auto") + 1) %
                                  order.length
                              ];
                            return n;
                          })
                        }
                        className="rounded-sm border border-gray-400 bg-background-100 px-2 py-1 text-xs text-gray-900"
                      >
                        {i + 1}: {alignments[i] ?? "auto"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <div className="mb-5 overflow-hidden rounded-md border border-gray-400 bg-background-200">
        <TerminalControls terminalRef={terminalRef} noWrap />
        <div ref={terminalRef} className="ansi-terminal overflow-x-auto p-5">
          <pre className="m-0 font-mono">{output}</pre>
        </div>
        <div className="border-t border-gray-400 p-3">
          <Button
            onClick={() => copy(output, "Box output copied!")}
            className="bg-gray-1000 text-background-200"
          >
            Copy plain text
          </Button>
        </div>
      </div>
    </div>
  );
}
