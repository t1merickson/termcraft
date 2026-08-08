#!/usr/bin/env node
/**
 * Renders the social preview card to app/public/og.png.
 *
 * The card is made of the same thing the site makes: a torus drawn as
 * characters. It runs the real hero renderer through esbuild so the image can
 * never drift from what the site actually produces.
 *
 * Usage: npm run gen:og   (needs the dev server to be stopped or running,
 *                          it does not matter — nothing is fetched)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "app", "public", "og.png");
const BUNDLE = path.join(ROOT, "node_modules", ".cache", "termcraft-og.cjs");

const COLS = 104;
const ROWS = 30;

function buildRenderer() {
  fs.mkdirSync(path.dirname(BUNDLE), { recursive: true });
  const entry = path.join(path.dirname(BUNDLE), "og-entry.ts");
  fs.writeFileSync(
    entry,
    `
    import { createBuffer, renderTorus } from ${JSON.stringify(path.join(ROOT, "app/src/landing/scene"))};
    import { shadeEncoder, cellAspectFor } from ${JSON.stringify(path.join(ROOT, "app/src/landing/encoders"))};
    const cols = ${COLS}, rows = ${ROWS};
    const buf = createBuffer(cols * shadeEncoder.sx, rows * shadeEncoder.sy);
    renderTorus(buf, 1.05, 0.62, cellAspectFor(shadeEncoder));
    module.exports = { html: shadeEncoder.encode(buf, cols, rows) };
    `,
  );
  execFileSync(
    path.join(ROOT, "node_modules", ".bin", "esbuild"),
    [
      entry,
      "--bundle",
      "--platform=node",
      "--format=cjs",
      `--outfile=${BUNDLE}`,
      "--log-level=error",
    ],
    { stdio: "inherit" },
  );
  return require(BUNDLE).html;
}

const page = (art) => `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: 'Geist'; src: url('file://${ROOT}/assets/geist/Geist-Variable.woff2') format('woff2'); font-weight: 100 900; }
  @font-face { font-family: 'GeistMono'; src: url('file://${ROOT}/assets/geist/GeistMono-Variable.woff2') format('woff2'); font-weight: 100 900; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #000; color: #ededed;
         font-family: Geist, sans-serif; display: flex; overflow: hidden; }
  .left { padding: 64px; display: flex; flex-direction: column; justify-content: center; width: 560px; }
  h1 { font-size: 60px; line-height: 1.03; letter-spacing: -0.025em; font-weight: 600; }
  p { margin-top: 20px; font-size: 21px; line-height: 1.45; color: #a1a1a1; }
  .tag { font-family: GeistMono, monospace; font-size: 15px; color: #878787;
         border: 1px solid #ffffff24; border-radius: 999px; padding: 7px 15px;
         align-self: flex-start; margin-bottom: 26px; }
  .art { flex: 1; position: relative; overflow: hidden; display: flex;
         align-items: center; justify-content: center; }
  pre { font-family: GeistMono, monospace; font-size: 13px; line-height: 1; margin: 0; }
  .fade { position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, #000 92%); }
</style>
<div class="left">
  <div class="tag">14 tools · runs in your browser</div>
  <h1>Everything you can make out of characters.</h1>
  <p>ASCII, ANSI, braille, dithering, charts,<br>spinners, prompts. Free and local.</p>
</div>
<div class="art"><pre>${art}</pre><div class="fade"></div></div>`;

async function main() {
  const art = buildRenderer();
  const browser = await chromium.launch();
  const p = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await p.setContent(page(art), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: OUT });
  await browser.close();
  console.log(
    `Wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
