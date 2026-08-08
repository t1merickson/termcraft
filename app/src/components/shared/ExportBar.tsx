import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClipboard } from "@/hooks/use-clipboard";
import { parseAnsi } from "@/lib/ansi-parse";
import { toAsciicast } from "@/lib/export/cast";
import { download, timestampedName } from "@/lib/export/download";
import { framesToGif } from "@/lib/export/gif";
import { toPngBlob, type RasterOptions } from "@/lib/export/png";
import { toMarkdown, toNodeSnippet, toPrintf, toPythonSnippet, toShellScript } from "@/lib/export/shell";
import { toSvg } from "@/lib/export/svg";

export interface ExportBarProps {
  /** Raw ANSI text of the current output. Required. */
  ansi: string;
  /** Plain text without escapes. Defaults to ansi with escapes stripped. */
  text?: string;
  /** Base filename, no extension. */
  filename?: string;
  /** Recipe share info from useRecipe, if the tool supports recipes. */
  share?: { shareUrl: string; shareCode: string };
  /** Extra formats to offer, e.g. GIF for animated tools. */
  frames?: string[];
  /** Rendering options passed through to the raster/svg exporters. */
  raster?: RasterOptions;
}

const stripAnsi = (value: string) => value
  .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
  .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
  .replace(/\x1b[ -\/]*[@-~]/g, "");

export function ExportBar({ ansi, text, filename = "termcraft-art", share, frames, raster }: ExportBarProps) {
  const { copy } = useClipboard();
  const [busy, setBusy] = useState(false);
  const [copySelection, setCopySelection] = useState("");
  const [downloadSelection, setDownloadSelection] = useState("");
  const plain = text ?? stripAnsi(ansi);
  const grid = parseAnsi(ansi);
  const name = (ext: string) => timestampedName(filename, ext);

  const copyAs = async (format: string) => {
    const formats: Record<string, [string, string]> = {
      printf: [toPrintf(ansi), "printf command copied"],
      shell: [toShellScript(ansi, { name: filename }), "Shell script copied"],
      node: [toNodeSnippet(ansi), "Node snippet copied"],
      python: [toPythonSnippet(ansi), "Python snippet copied"],
      markdown: [toMarkdown(plain), "Markdown copied"],
    };
    const selected = formats[format];
    if (selected) await copy(...selected);
  };

  const runDownload = async (format: string) => {
    setBusy(true);
    try {
      if (format === "png") download(await toPngBlob(grid, raster), name("png"));
      else if (format === "svg") download(toSvg(grid, raster), name("svg"), "image/svg+xml");
      else if (format === "txt") download(plain, name("txt"), "text/plain;charset=utf-8");
      else if (format === "ans") download(ansi, name("ans"), "text/plain;charset=utf-8");
      else if (format === "gif" && frames) {
        download(await framesToGif(frames.map(parseAnsi), { ...raster }), name("gif"));
      } else if (format === "cast" && frames) {
        const first = parseAnsi(frames[0] ?? "");
        download(toAsciicast(frames, { cols: first.cols, rows: first.rows, delayMs: 100, title: filename }), name("cast"), "application/x-asciicast");
      }
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not export ${format.toUpperCase()}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => copy(plain, "Text copied")}>Copy text</Button>
      <Button variant="outline" size="sm" onClick={() => copy(ansi, "ANSI copied")}>Copy ANSI</Button>
      <Select value={copySelection} onValueChange={(value) => { setCopySelection(""); void copyAs(value); }} disabled={busy}>
        <SelectTrigger size="sm" className="border-gray-400 bg-transparent"><SelectValue placeholder="Copy as" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="printf">printf</SelectItem>
          <SelectItem value="shell">Shell script</SelectItem>
          <SelectItem value="node">Node</SelectItem>
          <SelectItem value="python">Python</SelectItem>
          <SelectItem value="markdown">Markdown</SelectItem>
        </SelectContent>
      </Select>
      <Select value={downloadSelection} onValueChange={(value) => { setDownloadSelection(""); void runDownload(value); }} disabled={busy}>
        <SelectTrigger size="sm" className="border-gray-400 bg-transparent">
          {busy && <LoaderCircle className="animate-spin" />}<SelectValue placeholder={busy ? "Exporting…" : "Download"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="svg">SVG</SelectItem>
          <SelectItem value="txt">Plain text</SelectItem>
          <SelectItem value="ans">ANSI</SelectItem>
          {frames && <SelectItem value="gif">Animated GIF</SelectItem>}
          {frames && <SelectItem value="cast">asciinema cast</SelectItem>}
        </SelectContent>
      </Select>
      {share && <Button variant="outline" size="sm" onClick={() => copy(share.shareUrl, "Share link copied")}>Share</Button>}
    </div>
  );
}
