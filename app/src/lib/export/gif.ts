import type { Grid } from "@/lib/ansi-parse";
import { rasterize, type RasterOptions } from "@/lib/export/png";

type RGB = [number, number, number];
type Bucket = { colors: RGB[]; range: number; channel: number };

function bucket(colors: RGB[]): Bucket {
  let channel = 0;
  let range = -1;
  for (let c = 0; c < 3; c += 1) {
    let lo = 255;
    let hi = 0;
    for (const color of colors) { lo = Math.min(lo, color[c]); hi = Math.max(hi, color[c]); }
    if (hi - lo > range) { range = hi - lo; channel = c; }
  }
  return { colors, range, channel };
}

function quantize(colors: RGB[], limit: number): RGB[] {
  if (!colors.length) return [[0, 0, 0]];
  const counts = new Map<string, { color: RGB; count: number }>();
  for (const color of colors) {
    const key = color.join(",");
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { color, count: 1 });
  }
  if (counts.size <= limit) return [...counts.values()].map((entry) => entry.color);

  // Expand weighted samples only after reducing exact duplicates. This is a
  // straightforward median cut, favouring common colours while splitting.
  let boxes = [bucket([...counts.values()].flatMap(({ color, count }) =>
    Array.from({ length: Math.min(count, 64) }, () => color)))];
  while (boxes.length < limit) {
    boxes.sort((a, b) => b.range * b.colors.length - a.range * a.colors.length);
    const candidate = boxes.shift()!;
    if (candidate.colors.length < 2) { boxes.unshift(candidate); break; }
    candidate.colors.sort((a, b) => a[candidate.channel] - b[candidate.channel]);
    const middle = Math.floor(candidate.colors.length / 2);
    boxes.push(bucket(candidate.colors.slice(0, middle)), bucket(candidate.colors.slice(middle)));
  }
  return boxes.map(({ colors: values }) => [0, 1, 2].map((channel) =>
    Math.round(values.reduce((sum, color) => sum + color[channel], 0) / values.length)) as RGB);
}

class Bytes {
  data: number[] = [];
  byte(...values: number[]) { this.data.push(...values.map((value) => value & 255)); }
  word(value: number) { this.byte(value, value >> 8); }
  ascii(value: string) { for (const ch of value) this.byte(ch.charCodeAt(0)); }
}

function lzw(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = end + 1;
  let dictionary = new Map<string, number>();
  const output: number[] = [];
  let bits = 0;
  let bitCount = 0;
  const write = (code: number) => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) { output.push(bits & 255); bits >>>= 8; bitCount -= 8; }
  };
  const reset = () => { dictionary = new Map(); codeSize = minCodeSize + 1; nextCode = end + 1; };
  write(clear);
  if (indices.length) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i += 1) {
      const suffix = indices[i];
      const key = `${prefix},${suffix}`;
      const found = dictionary.get(key);
      if (found !== undefined) {
        prefix = found;
      } else {
        write(prefix);
        if (nextCode < 4096) {
          dictionary.set(key, nextCode++);
          // The encoder's dictionary is one entry ahead of the decoder's.
          // Advance only after crossing the boundary so both sides read the
          // next emitted code at the same width.
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize += 1;
        } else {
          write(clear);
          reset();
        }
        prefix = suffix;
      }
    }
    write(prefix);
  }
  write(end);
  if (bitCount) output.push(bits & 255);
  return Uint8Array.from(output);
}

function subBlocks(out: Bytes, data: Uint8Array) {
  for (let offset = 0; offset < data.length; offset += 255) {
    const block = data.slice(offset, offset + 255);
    out.byte(block.length, ...block);
  }
  out.byte(0);
}

export async function framesToGif(
  frames: Grid[], opts: RasterOptions & { delayMs?: number; loop?: boolean },
): Promise<Blob> {
  if (!frames.length) throw new Error("At least one frame is required");
  const canvases = frames.map((frame) => rasterize(frame, opts));
  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = Math.max(...canvases.map((canvas) => canvas.height));
  if (width > 65535 || height > 65535) throw new Error("GIF dimensions exceed 65535 pixels");

  const images = canvases.map((canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D rendering is unavailable");
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
  const hasTransparency = images.some(({ data }) => {
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) return true;
    return false;
  });
  const samples: RGB[] = [];
  for (const { data } of images) for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  const palette = quantize(samples, hasTransparency ? 255 : 256);
  if (hasTransparency) palette.push([0, 0, 0]);
  const transparentIndex = hasTransparency ? palette.length - 1 : 0;
  let tableSize = 2;
  while (tableSize < palette.length) tableSize *= 2;
  const sizeBits = Math.max(0, Math.log2(tableSize) - 1);
  const minCodeSize = Math.max(2, Math.ceil(Math.log2(tableSize)));
  const nearest = (r: number, g: number, b: number) => {
    let best = 0;
    let distance = Infinity;
    const limit = hasTransparency ? palette.length - 1 : palette.length;
    for (let i = 0; i < limit; i += 1) {
      const color = palette[i];
      const next = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (next < distance) { distance = next; best = i; }
    }
    return best;
  };

  const out = new Bytes();
  out.ascii("GIF89a");
  out.word(width); out.word(height);
  out.byte(0x80 | 0x70 | sizeBits, 0, 0);
  for (let i = 0; i < tableSize; i += 1) out.byte(...(palette[i] ?? [0, 0, 0]));
  if (opts.loop !== false) {
    out.byte(0x21, 0xff, 0x0b); out.ascii("NETSCAPE2.0");
    out.byte(3, 1); out.word(0); out.byte(0);
  }

  images.forEach((image) => {
    const delay = Math.max(0, Math.min(65535, Math.round((opts.delayMs ?? 100) / 10)));
    out.byte(0x21, 0xf9, 4, hasTransparency ? 1 : 0); out.word(delay);
    out.byte(hasTransparency ? transparentIndex : 0, 0);
    out.byte(0x2c); out.word(0); out.word(0); out.word(image.width); out.word(image.height); out.byte(0);
    const indices = new Uint8Array(image.width * image.height);
    for (let pixel = 0; pixel < indices.length; pixel += 1) {
      const offset = pixel * 4;
      indices[pixel] = image.data[offset + 3] < 128 ? transparentIndex
        : nearest(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
    }
    out.byte(minCodeSize);
    subBlocks(out, lzw(indices, minCodeSize));
  });
  out.byte(0x3b);
  return new Blob([Uint8Array.from(out.data)], { type: "image/gif" });
}
