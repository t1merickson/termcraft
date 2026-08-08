export function toAsciicast(
  frames: string[],
  opts: { cols: number; rows: number; delayMs: number; title?: string; timestamp?: number },
): string {
  const header = {
    version: 2,
    width: opts.cols,
    height: opts.rows,
    timestamp: opts.timestamp ?? Math.floor(Date.now() / 1000),
    ...(opts.title === undefined ? {} : { title: opts.title }),
  };
  const lines = [JSON.stringify(header)];
  frames.forEach((frame, index) => {
    lines.push(JSON.stringify([index * opts.delayMs / 1000, "o", `${index ? "\x1b[H" : ""}${frame}`]));
  });
  lines.push(JSON.stringify([frames.length * opts.delayMs / 1000, "o", "\x1b[0m"]));
  return `${lines.join("\n")}\n`;
}
