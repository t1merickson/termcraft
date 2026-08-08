function escaped(ansi: string) {
  return ansi.replace(/\\/g, "\\\\").replace(/\x1b/g, "\\x1b").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

export function toPrintf(ansi: string): string {
  const format = ansi.replace(/\\/g, "\\\\").replace(/'/g, "'\\''").replace(/%/g, "%%")
    .replace(/\x1b/g, "\\033").replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return `printf '${format}'`;
}

export function toShellScript(ansi: string, opts: { name?: string } = {}): string {
  const name = opts.name ? `# ${opts.name.replace(/[\r\n]/g, " ")}\n` : "";
  // A quoted heredoc would leave escape spelling uninterpreted. printf %b is
  // used so the literal heredoc is safe from expansion and decoded exactly once.
  return `#!/usr/bin/env bash\n${name}printf '%b' "$(cat <<'TERMCRAFT_ART'\n${escaped(ansi)}\nTERMCRAFT_ART\n)"\n`;
}

export function toNodeSnippet(ansi: string): string {
  return `process.stdout.write('${escaped(ansi).replace(/'/g, "\\'")}');`;
}

export function toPythonSnippet(ansi: string): string {
  const value = escaped(ansi).replace(/'/g, "\\'");
  return `import sys\nsys.stdout.write('${value}')`;
}

export function toMarkdown(text: string, opts: { lang?: string } = {}): string {
  const longest = Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${opts.lang ?? ""}\n${text}\n${fence}`;
}
