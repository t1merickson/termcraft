#!/usr/bin/env node
/**
 * Loads the landing page and every tool page in a headless browser and fails
 * if any of them throws, stays empty, or still shows a placeholder.
 *
 * This is the check that catches the things a type check cannot: a tool that
 * compiles but blows up on mount, or one whose preview silently never renders.
 *
 * Usage:
 *   npm run dev          # in one terminal
 *   npm run verify       # in another
 *
 * Set BASE_URL to point at a preview build or a deployed site instead.
 */

const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:8000";

// Keep in sync with app/src/tools/registry.ts.
const TOOLS = [
  "image-to-ascii",
  "image-to-ansi",
  "dither",
  "video",
  "editor",
  "pixel-font",
  "boxes",
  "charts",
  "spinners",
  "progress",
  "prompt",
  "color-wheel",
  "lookup",
  "gradients",
];

// A page with less text than this never really rendered.
const MIN_TEXT = 200;

async function checkPage(context, url, { minText = MIN_TEXT } = {}) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) =>
    errors.push(`uncaught: ${e.message.slice(0, 300)}`),
  );

  await page.goto(url, { waitUntil: "networkidle" });
  // Give conversions and animations a frame or two to produce something.
  await page.waitForTimeout(1500);

  const { length, placeholder } = await page.evaluate(() => ({
    length: document.body.innerText.length,
    placeholder: document.body.innerText.includes("Coming soon"),
  }));
  await page.close();

  const problems = [...errors];
  if (placeholder) problems.push("still shows a placeholder");
  if (length < minText) problems.push(`only ${length} characters of text`);
  return problems;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1100 },
  });

  const targets = [
    ["landing", `${BASE}/`],
    ...TOOLS.map((t) => [t, `${BASE}/#/t/${t}`]),
  ];

  let failed = 0;
  for (const [name, url] of targets) {
    const problems = await checkPage(context, url);
    if (problems.length) {
      failed++;
      console.log(`FAIL  ${name}`);
      for (const p of problems) console.log(`        ${p}`);
    } else {
      console.log(`ok    ${name}`);
    }
  }

  await browser.close();
  console.log(`\n${targets.length - failed}/${targets.length} pages ok`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
