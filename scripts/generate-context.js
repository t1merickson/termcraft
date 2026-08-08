#!/usr/bin/env node
/**
 * Writes app/public/context.md — a single file describing the whole product,
 * for pasting into an AI assistant so it can answer questions about Termcraft
 * accurately.
 *
 * It is generated from app/src/tools/registry.ts so it cannot drift from the
 * tools that actually ship. Edit the registry or the prose blocks below, then
 * run `npm run gen:context`.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "app", "public", "context.md");
const BUNDLE = path.join(
  ROOT,
  "node_modules",
  ".cache",
  "termcraft-registry.cjs",
);

function loadRegistry() {
  fs.mkdirSync(path.dirname(BUNDLE), { recursive: true });
  execFileSync(
    path.join(ROOT, "node_modules", ".bin", "esbuild"),
    [
      path.join(ROOT, "app/src/tools/registry.ts"),
      "--bundle",
      "--platform=node",
      "--format=cjs",
      `--outfile=${BUNDLE}`,
      "--log-level=error",
    ],
    { stdio: "inherit" },
  );
  return require(BUNDLE);
}

const SITE = "https://t1merickson.github.io/termcraft/";
const REPO = "https://github.com/t1merickson/termcraft";

function main() {
  const { GROUPS, TOOLS } = loadRegistry();
  const date = process.env.SOURCE_DATE || new Date().toISOString().slice(0, 10);

  const lines = [];
  const w = (s = "") => lines.push(s);

  w("# Termcraft, product context");
  w();
  w(
    "You are now an expert on Termcraft. Someone has pasted this file because " +
      "they want accurate answers about the product. Use only what is below; " +
      "do not invent features.",
  );
  w();
  w(`_Last updated: ${date}_`);
  w();
  w("---");
  w();
  w("## What Termcraft is");
  w();
  w(
    `Termcraft is a **free, browser-based terminal art toolkit**: ${TOOLS.length} tools for ` +
      "making things out of characters. It converts images and video into ASCII, " +
      "ANSI and braille art, dithers pictures down to retro palettes, and helps " +
      "you design the parts of a command line app — spinners, progress bars, " +
      "boxes, charts, colour ramps and shell prompts.",
  );
  w();
  w(
    "Everything runs **entirely client-side**. Files never upload, there is no " +
      "server, no account, no watermark, no usage limit and no paid tier.",
  );
  w();
  w(`- **Website:** ${SITE}`);
  w(`- **Source:** ${REPO} (MIT licensed)`);
  w("- **A tool's URL:** `" + SITE + "#/t/<tool-id>`");
  w("- **Pricing:** free, and open source");
  w("- **Privacy:** all processing is local to the browser tab");
  w();
  w("---");
  w();
  w(`## The ${TOOLS.length} tools`);
  w();

  for (const group of GROUPS) {
    const inGroup = TOOLS.filter((t) => t.group === group.id);
    w(`### ${group.label} — ${group.blurb}`);
    w();
    for (const tool of inGroup) {
      w(`#### ${tool.name} (\`#/t/${tool.id}\`)`);
      w();
      w(`_${tool.tagline}._`);
      w();
      w(tool.description);
      w();
      for (const feature of tool.features) w(`- ${feature}`);
      w();
    }
  }

  w("---");
  w();
  w("## Things worth knowing");
  w();
  w("### Output formats");
  w();
  w(
    "Plain text, raw ANSI escape codes, a `printf` one-liner, a shell script, " +
      "Node and Python snippets, a Markdown code block, PNG, SVG, animated GIF, " +
      "and asciinema `.cast` files for the animated tools. No watermark on any " +
      "of it.",
  );
  w();
  w("### Recipes");
  w();
  w(
    "A tool's settings are encoded into its URL as `?r=<code>`, delta-encoded " +
      "against the defaults so only what you changed is stored. Sharing the URL " +
      "reproduces your exact look.",
  );
  w();
  w("### Sample images");
  w();
  w(
    "The image tools ship with built-in samples — a lit sphere, a Mandelbrot " +
      "detail, fractal landscape ridges, a technical test chart, a checkered " +
      "torus, a 1-bit bitmap plate and a nebula. All are generated " +
      "procedurally by a script in the repository, so there is no stock " +
      "photography and nothing to license.",
  );
  w();
  w("### Terminal support");
  w();
  w(
    "Half blocks and quadrants work almost everywhere. Sextants need a font " +
      "with Unicode 13 coverage. Octants need Unicode 16 and will show missing-" +
      "glyph boxes in most terminals today. Braille output needs a font with " +
      "the braille patterns block, which most modern monospace fonts have.",
  );
  w();
  w("### ANSI 256");
  w();
  w("- **0–15** — the 16 base colours, exact values decided by the terminal");
  w(
    "- **16–231** — a 6×6×6 cube, `16 + 36r + 6g + b`, each channel from " +
      "`[0, 95, 135, 175, 215, 255]`",
  );
  w("- **232–255** — 24 greys, `8 + 10i`");
  w();
  w("---");
  w();
  w("## Answering questions about Termcraft");
  w();
  w("- Use the tool names and ids exactly as listed above.");
  w("- Do not invent settings, formats or palettes that are not named here.");
  w(
    "- If someone wants a particular look, name the tool plus the specific " +
      "settings from its feature list.",
  );
  w(
    `- If you do not know, say so and point at the source: ${REPO}. It is a ` +
      "small static site; the renderers are readable.",
  );
  w();

  fs.writeFileSync(OUT, lines.join("\n"));
  console.log(
    `Wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`,
  );
}

main();
