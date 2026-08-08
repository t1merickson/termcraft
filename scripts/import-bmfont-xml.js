#!/usr/bin/env node
/*
 * Import a BMFont XML + PNG into the repo font JSON format.
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return args[name];
}

function getAttr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}="([^"]+)"`));
  return match ? match[1] : null;
}

const args = parseArgs(process.argv.slice(2));
const xmlPath = requireArg(args, "xml");
const pngPath = requireArg(args, "png");
const output = requireArg(args, "output");
const name = requireArg(args, "name");
const id = requireArg(args, "id");
const fallback = args["fallback"] || "?";

const xml = fs.readFileSync(xmlPath, "utf8");
const png = PNG.sync.read(fs.readFileSync(pngPath));

const commonMatch = xml.match(/<common[^>]+>/);
const lineHeight = commonMatch
  ? Number(getAttr(commonMatch[0], "lineHeight"))
  : null;

const charRegex = /<char\s+([^>]+)\/>/g;
let match;
const chars = [];

while ((match = charRegex.exec(xml))) {
  const attrs = match[1];
  const idVal = Number(getAttr(attrs, "id"));
  const x = Number(getAttr(attrs, "x"));
  const y = Number(getAttr(attrs, "y"));
  const width = Number(getAttr(attrs, "width"));
  const height = Number(getAttr(attrs, "height"));
  const xoffset = Number(getAttr(attrs, "xoffset")) || 0;
  const yoffset = Number(getAttr(attrs, "yoffset")) || 0;
  const xadvance = Number(getAttr(attrs, "xadvance")) || width;
  chars.push({ id: idVal, x, y, width, height, xoffset, yoffset, xadvance });
}

if (chars.length === 0) {
  console.error("No <char> entries found in XML");
  process.exit(1);
}

const glyphWidth = Math.max(...chars.map((c) => c.xadvance));
const glyphHeight =
  lineHeight || Math.max(...chars.map((c) => c.height + c.yoffset));

function getPixel(x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const idx = (y * png.width + x) * 4;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
}

const glyphs = {};

for (const ch of chars) {
  const code = ch.id;
  const char = String.fromCharCode(code);
  const rows = [];

  for (let y = 0; y < glyphHeight; y++) {
    let line = "";
    for (let x = 0; x < glyphWidth; x++) {
      const srcX = ch.x + x - ch.xoffset;
      const srcY = ch.y + y - ch.yoffset;
      const px = getPixel(srcX, srcY);
      const on = px.a >= 32;
      line += on ? "1" : "0";
    }
    rows.push(line);
  }

  glyphs[char] = rows;
}

// ── Strip empty padding ──────────────────────────────────────────

function stripPadding(glyphs) {
  const chars = Object.keys(glyphs).filter((c) => c !== " ");
  if (chars.length === 0)
    return {
      glyphs,
      topStripped: 0,
      bottomStripped: 0,
      leftStripped: 0,
      rightStripped: 0,
    };
  const h = glyphs[chars[0]].length;

  let topStrip = 0;
  for (let r = 0; r < h; r++) {
    if (chars.every((ch) => !glyphs[ch][r].includes("1"))) topStrip++;
    else break;
  }
  let bottomStrip = 0;
  for (let r = h - 1; r >= topStrip; r--) {
    if (chars.every((ch) => !glyphs[ch][r].includes("1"))) bottomStrip++;
    else break;
  }
  let leftStrip = Infinity;
  for (const ch of chars) {
    const rows = glyphs[ch];
    const w = rows[0].length;
    let cols = 0;
    for (let c = 0; c < w; c++) {
      if (rows.every((row) => row[c] === "0")) cols++;
      else break;
    }
    if (cols < leftStrip) leftStrip = cols;
  }
  if (!Number.isFinite(leftStrip)) leftStrip = 0;
  let rightStrip = Infinity;
  for (const ch of chars) {
    const rows = glyphs[ch];
    const w = rows[0].length;
    let cols = 0;
    for (let c = w - 1; c >= leftStrip; c--) {
      if (rows.every((row) => row[c] === "0")) cols++;
      else break;
    }
    if (cols < rightStrip) rightStrip = cols;
  }
  if (!Number.isFinite(rightStrip)) rightStrip = 0;

  if (
    topStrip === 0 &&
    bottomStrip === 0 &&
    leftStrip === 0 &&
    rightStrip === 0
  ) {
    return {
      glyphs,
      topStripped: 0,
      bottomStripped: 0,
      leftStripped: 0,
      rightStripped: 0,
    };
  }
  const stripped = {};
  for (const [ch, rows] of Object.entries(glyphs)) {
    const trimmedRows = rows.slice(topStrip, h - bottomStrip);
    stripped[ch] = trimmedRows.map((row) =>
      row.slice(leftStrip, row.length - rightStrip),
    );
  }
  return {
    glyphs: stripped,
    topStripped: topStrip,
    bottomStripped: bottomStrip,
    leftStripped: leftStrip,
    rightStripped: rightStrip,
  };
}

const pad = stripPadding(glyphs);
const finalGlyphs = pad.glyphs;
const finalWidth = glyphWidth - pad.leftStripped - pad.rightStripped;
const finalHeight = glyphHeight - pad.topStripped - pad.bottomStripped;
const finalSpaceW = Math.max(
  1,
  Math.floor(glyphWidth / 2) - pad.leftStripped - pad.rightStripped,
);

if (
  pad.topStripped ||
  pad.bottomStripped ||
  pad.leftStripped ||
  pad.rightStripped
) {
  console.log(
    `Stripped padding: top=${pad.topStripped} bottom=${pad.bottomStripped} left=${pad.leftStripped} right=${pad.rightStripped}`,
  );
  console.log(
    `Effective size: ${finalWidth}x${finalHeight} (was ${glyphWidth}x${glyphHeight})`,
  );
}

const font = {
  meta: {
    id,
    name,
    glyphWidth: finalWidth,
    glyphHeight: finalHeight,
    spaceWidth: finalSpaceW,
    letterGap: 1,
    fallback,
    charset: chars.map((c) => String.fromCharCode(c.id)).join(""),
    source: path.basename(pngPath),
  },
  glyphs: finalGlyphs,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(font, null, 2) + "\n");
console.log(`Wrote ${output}`);
