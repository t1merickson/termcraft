#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "app", "public", "samples");
const SS = 2;
const SEED = 0x5445524d;

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);
const permutation = Array.from({ length: 256 }, (_, index) => index);
for (let index = permutation.length - 1; index > 0; index--) {
  const swap = Math.floor(random() * (index + 1));
  [permutation[index], permutation[swap]] = [
    permutation[swap],
    permutation[index],
  ];
}
const perm = Array.from(
  { length: 512 },
  (_, index) => permutation[index & 255],
);

const clamp = (value, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length3 = (v) => Math.hypot(v[0], v[1], v[2]);
const normalize = (v) => {
  const length = length3(v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (v, amount) => [v[0] * amount, v[1] * amount, v[2] * amount];

function hash2(x, y) {
  return perm[(perm[x & 255] + y) & 255] / 255;
}

function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return mix(
    mix(hash2(ix, iy), hash2(ix + 1, iy), ux),
    mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux),
    uy,
  );
}

function fbm(x, y, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    total += amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return sum / total;
}

function palette(stops, t) {
  const position = clamp(t) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const local = position - index;
  return stops[index].map((channel, channelIndex) =>
    mix(channel, stops[index + 1][channelIndex], local),
  );
}

function hslToRgb(h, s, l) {
  const hue = ((h % 1) + 1) % 1;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = l - chroma / 2;
  let rgb;
  if (hue < 1 / 6) rgb = [chroma, x, 0];
  else if (hue < 2 / 6) rgb = [x, chroma, 0];
  else if (hue < 3 / 6) rgb = [0, chroma, x];
  else if (hue < 4 / 6) rgb = [0, x, chroma];
  else if (hue < 5 / 6) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return rgb.map((channel) => channel + m);
}

function sphereSdf(point) {
  return length3(sub(point, [0, 0.05, 0])) - 1.12;
}

function renderSphere(u, v) {
  const aspect = 1.5;
  const origin = [0, 0.25, 4.2];
  const direction = normalize([
    (u - 0.5) * 3.4 * aspect,
    (0.5 - v) * 3.4,
    -4.2,
  ]);
  let travel = 0;
  let hit = false;
  let point = origin;
  for (let step = 0; step < 56 && travel < 8; step++) {
    point = add(origin, scale(direction, travel));
    const distance = sphereSdf(point);
    if (distance < 0.0015) {
      hit = true;
      break;
    }
    travel += Math.max(distance * 0.72, 0.008);
  }

  const skyT = smoothstep(0, 1, v);
  let color = palette(
    [
      [0.2, 0.31, 0.48],
      [0.63, 0.67, 0.68],
      [0.17, 0.2, 0.25],
    ],
    skyT,
  );
  const planeY = -1.08;
  if (direction[1] < -0.001) {
    const planeT = (planeY - origin[1]) / direction[1];
    if (planeT > 0) {
      const ground = add(origin, scale(direction, planeT));
      const radial = Math.hypot(ground[0], ground[2] + 0.1);
      const contact = Math.exp(-0.9 * radial * radial) * 0.52;
      const groundBase = 0.36 + 0.1 * smoothstep(-1.5, 3, ground[2]);
      color = [0.76, 0.75, 0.7].map(
        (channel) => channel * (groundBase + 0.35) * (1 - contact),
      );
    }
  }

  if (hit) {
    const normal = normalize(sub(point, [0, 0.05, 0]));
    const key = normalize([-0.75, 0.9, 0.65]);
    const rim = normalize([0.9, 0.25, -0.35]);
    const view = scale(direction, -1);
    const halfVector = normalize(add(key, view));
    const diffuse = Math.max(0, dot(normal, key));
    const rimAmount =
      Math.pow(Math.max(0, dot(normal, rim)), 2) *
      Math.pow(1 - Math.max(0, dot(normal, view)), 1.5);
    const specular = Math.pow(Math.max(0, dot(normal, halfVector)), 72);
    const light = 0.08 + 0.78 * diffuse + 0.45 * rimAmount;
    color = [0.48, 0.67, 0.84].map(
      (channel, index) =>
        channel * light + specular * [1, 0.94, 0.82][index] * 0.85,
    );
  }
  return color;
}

function ellipsoidDepth(x, y, cx, cy, rx, ry, depth) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const radius = 1 - dx * dx - dy * dy;
  return radius > 0 ? Math.sqrt(radius) * depth : -Infinity;
}

function renderPortrait(u, v) {
  const x = (u - 0.5) * 2;
  const y = (0.5 - v) * 2;
  const vignette = clamp(1 - 0.42 * Math.hypot(x, y));
  let color = [0.16, 0.18, 0.22].map(
    (channel, index) => channel * vignette + [0.06, 0.07, 0.1][index],
  );

  const forms = [
    {
      z: ellipsoidDepth(x, y, 0, 0.25, 0.38, 0.5, 0.48),
      cx: 0,
      cy: 0.25,
      rx: 0.38,
      ry: 0.5,
      dz: 0.48,
      tone: [0.76, 0.58, 0.47],
    },
    {
      z: ellipsoidDepth(x, y, 0, -0.25, 0.19, 0.35, 0.25),
      cx: 0,
      cy: -0.25,
      rx: 0.19,
      ry: 0.35,
      dz: 0.25,
      tone: [0.58, 0.43, 0.36],
    },
    {
      z: ellipsoidDepth(x, y, 0, -0.72, 0.83, 0.35, 0.32),
      cx: 0,
      cy: -0.72,
      rx: 0.83,
      ry: 0.35,
      dz: 0.32,
      tone: [0.31, 0.37, 0.48],
    },
  ];
  let form = null;
  for (const candidate of forms) {
    if (candidate.z > (form ? form.z : -Infinity)) form = candidate;
  }
  if (!form || form.z === -Infinity) return color;

  const nx =
    ((x - form.cx) * form.dz) / (form.rx * form.rx * Math.max(form.z, 0.03));
  const ny =
    ((y - form.cy) * form.dz) / (form.ry * form.ry * Math.max(form.z, 0.03));
  const normal = normalize([nx, ny, 1]);
  const key = normalize([-0.75, 0.85, 0.7]);
  const rim = normalize([0.9, 0.15, 0.25]);
  const view = [0, 0, 1];
  const diffuse = Math.max(0, dot(normal, key));
  const rimAmount =
    Math.pow(Math.max(0, dot(normal, rim)), 3) *
    Math.pow(1 - Math.max(0, dot(normal, view)), 1.2);
  const specular = Math.pow(
    Math.max(0, dot(normal, normalize(add(key, view)))),
    45,
  );
  const faceModel = form === forms[0] ? 0.05 * smoothstep(-0.05, 0.25, x) : 0;
  const lighting = 0.055 + 0.9 * diffuse + 0.4 * rimAmount + faceModel;
  color = form.tone.map(
    (channel, index) =>
      channel * lighting + specular * [1, 0.9, 0.75][index] * 0.4,
  );
  return color;
}

const mandelbrotPalette = [
  [0.01, 0.02, 0.1],
  [0.12, 0.08, 0.35],
  [0.08, 0.35, 0.55],
  [0.12, 0.62, 0.55],
  [0.68, 0.78, 0.28],
  [0.98, 0.9, 0.62],
];

function renderMandelbrot(u, v) {
  const aspect = 1.5;
  const zoom = 0.018;
  const cx = -0.743643887037151 + (u - 0.5) * zoom * aspect;
  const cy = 0.13182590420533 + (v - 0.5) * zoom;
  let zx = 0;
  let zy = 0;
  let iteration = 0;
  const maxIterations = 220;
  for (; iteration < maxIterations && zx * zx + zy * zy <= 256; iteration++) {
    const nextX = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = nextX;
  }
  if (iteration === maxIterations) return [0.005, 0.008, 0.016];
  const logZn = Math.log(zx * zx + zy * zy) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
  const smoothIteration = iteration + 1 - nu;
  const t = (smoothIteration * 0.035 + 0.08) % 1;
  return palette(mandelbrotPalette, Math.pow(t, 0.82));
}

function ridgeHeight(x, layer) {
  const scaleX = 1.1 + layer * 0.45;
  const n = fbm(x * scaleX + layer * 11.7, layer * 4.3, 6);
  const detail = fbm(x * 4.7 + layer * 2.1, 18.2 + layer, 4);
  return (
    0.39 +
    layer * 0.085 +
    (n - 0.5) * (0.3 - layer * 0.025) +
    (detail - 0.5) * 0.06
  );
}

function renderLandscape(u, v) {
  const sky = palette(
    [
      [0.08, 0.15, 0.28],
      [0.42, 0.58, 0.69],
      [0.9, 0.72, 0.48],
    ],
    Math.pow(v, 0.8),
  );
  let color = sky;
  for (let layer = 0; layer < 6; layer++) {
    const height = ridgeHeight(u * 5.2, layer);
    if (v > height) {
      const distance = 1 - layer / 6;
      const ridge = palette(
        [
          [0.07, 0.1, 0.13],
          [0.38, 0.45, 0.48],
        ],
        distance,
      );
      const texture =
        (fbm(u * 19 + layer * 7, v * 13, 3) - 0.5) * 0.07 * (1 - distance);
      color = ridge.map((channel, index) =>
        clamp(channel + texture + sky[index] * distance * 0.18),
      );
    }
  }
  return color;
}

function renderTestRamp(u, v) {
  if (v < 0.24) return [u, u, u];
  if (v < 0.43) {
    const step = Math.min(15, Math.floor(u * 16)) / 15;
    const gutter = (u * 16) % 1;
    if (gutter < 0.025 || gutter > 0.975 || v < 0.25 || v > 0.42)
      return [0.04, 0.04, 0.04];
    return [step, step, step];
  }
  if (v < 0.57) {
    const colors = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    return colors[Math.min(colors.length - 1, Math.floor(u * colors.length))];
  }
  const x = (u - 0.5) * 2.1;
  const y = (v - 0.785) * 4.4;
  const radius2 = x * x + y * y;
  const aperture = 1 - smoothstep(0.78, 0.95, Math.sqrt(radius2));
  const zone = 0.5 + 0.5 * Math.cos(95 * radius2);
  const background = 0.5 + 0.1 * Math.cos(u * Math.PI * 8);
  const luminance = mix(background, zone, aperture);
  return [luminance, luminance, luminance];
}

function torusSdf(point) {
  const qx = Math.hypot(point[0], point[2]) - 0.92;
  return Math.hypot(qx, point[1]) - 0.34;
}

function rotateTorus(point) {
  const ay = -0.45;
  const ax = 0.48;
  const cy = Math.cos(ay),
    sy = Math.sin(ay);
  const cx = Math.cos(ax),
    sx = Math.sin(ax);
  const px = cy * point[0] - sy * point[2];
  const pz = sy * point[0] + cy * point[2];
  return [px, cx * point[1] + sx * pz, -sx * point[1] + cx * pz];
}

function renderTorus(u, v) {
  const origin = [0, 0.05, 3.5];
  const direction = normalize([(u - 0.5) * 3.1, (0.5 - v) * 2.25, -3.5]);
  let travel = 0;
  let point = origin;
  let local = point;
  let hit = false;
  for (let step = 0; step < 72 && travel < 7; step++) {
    point = add(origin, scale(direction, travel));
    local = rotateTorus(point);
    const distance = torusSdf(local);
    if (distance < 0.0018) {
      hit = true;
      break;
    }
    travel += Math.max(distance * 0.72, 0.006);
  }
  const background = palette(
    [
      [0.07, 0.08, 0.12],
      [0.32, 0.35, 0.39],
    ],
    v,
  );
  if (!hit) return background;
  const epsilon = 0.003;
  const normalLocal = normalize([
    torusSdf([local[0] + epsilon, local[1], local[2]]) -
      torusSdf([local[0] - epsilon, local[1], local[2]]),
    torusSdf([local[0], local[1] + epsilon, local[2]]) -
      torusSdf([local[0], local[1] - epsilon, local[2]]),
    torusSdf([local[0], local[1], local[2] + epsilon]) -
      torusSdf([local[0], local[1], local[2] - epsilon]),
  ]);
  const angleMajor = Math.atan2(local[2], local[0]);
  const radial = Math.hypot(local[0], local[2]);
  const angleMinor = Math.atan2(local[1], radial - 0.92);
  const checker =
    (Math.floor(((angleMajor + Math.PI) * 8) / Math.PI) +
      Math.floor(((angleMinor + Math.PI) * 6) / Math.PI)) &
    1;
  const base = checker ? [0.88, 0.84, 0.68] : [0.08, 0.12, 0.18];
  const light = normalize([-0.7, 0.9, 0.6]);
  const diffuse = Math.max(0, dot(normalLocal, light));
  const edge = Math.pow(1 - Math.abs(dot(normalLocal, [0, 0, 1])), 2);
  return base.map((channel) => channel * (0.14 + 0.82 * diffuse) + edge * 0.08);
}

function insideRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/**
 * A hard-edged black-and-white test plate, in four panels. Every panel is
 * something that shows up a 1-bit or dithered conversion in a different way:
 * concentric rings expose moiré, the wedge shows how fine a line survives,
 * the shrinking checkerboard finds the point where detail collapses, and the
 * solid shapes show whether edges stay crisp.
 */
function renderTextPlate(u, v) {
  // Half-open panels with a gutter, so the divisions themselves are crisp.
  const inPanel = (x0, y0, x1, y1) => u >= x0 && u < x1 && v >= y0 && v < y1;
  const gutter = 0.012;
  let ink = false;

  // Top left: concentric rings.
  if (inPanel(0, 0, 0.5 - gutter, 0.5 - gutter)) {
    const r = Math.hypot((u - 0.25) * 2, (v - 0.25) * 2);
    ink = Math.floor(r * 26) % 2 === 0;
  }

  // Top right: a resolution wedge — line pairs that get finer to the right.
  else if (inPanel(0.5 + gutter, 0, 1, 0.5 - gutter)) {
    const t = (u - 0.5 - gutter) / (0.5 - gutter);
    // Quadratic so the fine end gets more of the panel.
    const period = 0.055 * Math.pow(1 - t * 0.94, 2) + 0.0016;
    ink = Math.floor((u - 0.5) / period) % 2 === 0;
    // Leave the bottom strip solid as a reference black.
    if (v > 0.42) ink = true;
  }

  // Bottom left: a checkerboard whose cells halve across the panel.
  else if (inPanel(0, 0.5 + gutter, 0.5 - gutter, 1)) {
    const t = (u - 0) / (0.5 - gutter);
    const cell = 0.075 / Math.pow(2, Math.floor(t * 4));
    ink =
      (Math.floor(u / cell) + Math.floor((v - 0.5 - gutter) / cell)) % 2 === 0;
  }

  // Bottom right: solid shapes with straight, curved and diagonal edges.
  else if (inPanel(0.5 + gutter, 0.5 + gutter, 1, 1)) {
    const x = u - 0.75;
    const y = v - 0.75;
    ink =
      Math.hypot(x + 0.11, y + 0.08) < 0.1 || // circle
      Math.abs(x - 0.12) + Math.abs(y + 0.08) < 0.11 || // diamond
      insideRect(u, v, 0.56, 0.79, 0.94, 0.86) || // bar
      // Triangle, pointing up.
      (v > 0.9 && v < 0.97 && Math.abs(x) < (0.97 - v) * 2.2);
  }

  return ink ? [0.02, 0.02, 0.025] : [0.97, 0.97, 0.95];
}

function renderNebula(u, v) {
  const x = (u - 0.5) * 3.2;
  const y = (v - 0.5) * 2.2;
  const warpX = fbm(x * 0.7 + 7, y * 0.7 + 2, 5) - 0.5;
  const warpY = fbm(x * 0.8 + 17, y * 0.8 + 23, 5) - 0.5;
  const cloud = fbm(x * 1.25 + warpX * 2.2, y * 1.25 + warpY * 2.2, 7);
  const wisps = 1 - Math.abs(fbm(x * 2.1 - warpY, y * 2.1 + warpX, 6) * 2 - 1);
  const radial = Math.exp(-0.56 * (x * x + y * y));
  const density = clamp((cloud - 0.34) * 1.9 + wisps * 0.5) * radial;
  const hue = 0.62 + 0.65 * fbm(x * 0.55 + 31, y * 0.55 + 9, 5) + x * 0.09;
  const color = hslToRgb(hue, 0.82, 0.22 + density * 0.46);
  const stars = hash2(Math.floor(u * 960), Math.floor(v * 640));
  const star = stars > 0.996 ? Math.pow((stars - 0.996) / 0.004, 2) : 0;
  return color.map((channel, index) =>
    clamp(channel * density * 1.5 + [0.008, 0.012, 0.03][index] + star),
  );
}

const samples = [
  {
    id: "sphere",
    name: "Sphere",
    note: "Lit sphere on a gradient",
    width: 960,
    height: 640,
    best: ["image-to-ascii", "dither"],
    render: renderSphere,
  },
  {
    id: "portrait-bust",
    name: "Portrait Bust",
    note: "Studio-lit synthetic portrait",
    width: 960,
    height: 960,
    best: ["image-to-ascii", "dither"],
    render: renderPortrait,
  },
  {
    id: "mandelbrot",
    name: "Mandelbrot",
    note: "Smooth seahorse-valley fractal",
    width: 960,
    height: 640,
    best: ["image-to-ansi", "dither"],
    render: renderMandelbrot,
  },
  {
    id: "landscape",
    name: "Landscape",
    note: "Layered mountain ridges in haze",
    width: 960,
    height: 640,
    best: ["image-to-ascii", "image-to-ansi"],
    render: renderLandscape,
  },
  {
    id: "test-ramp",
    name: "Test Ramp",
    note: "Tone, colour, and zone-plate chart",
    width: 960,
    height: 640,
    best: ["image-to-ascii", "dither"],
    render: renderTestRamp,
  },
  {
    id: "checkers-torus",
    name: "Checkers Torus",
    note: "Perspective checkerboard torus",
    width: 960,
    height: 640,
    best: ["image-to-ansi", "dither"],
    render: renderTorus,
  },
  {
    id: "text-plate",
    name: "Bitmap Plate",
    note: "Hard-edged rings, wedge, checkers, shapes",
    width: 960,
    height: 640,
    best: ["image-to-ascii", "dither"],
    render: renderTextPlate,
  },
  {
    id: "nebula",
    name: "Nebula",
    note: "Wide-gamut clouds and stars",
    width: 960,
    height: 640,
    best: ["image-to-ansi", "dither"],
    render: renderNebula,
  },
];

function renderImage(sample) {
  const png = new PNG({
    width: sample.width,
    height: sample.height,
    colorType: 6,
  });
  for (let y = 0; y < sample.height; y++) {
    if (y % 160 === 0) process.stdout.write(".");
    for (let x = 0; x < sample.width; x++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / sample.width;
          const v = (y + (sy + 0.5) / SS) / sample.height;
          const color = sample.render(u, v);
          sum[0] += color[0];
          sum[1] += color[1];
          sum[2] += color[2];
        }
      }
      const offset = (y * sample.width + x) * 4;
      png.data[offset] = Math.round(clamp(sum[0] / 4) * 255);
      png.data[offset + 1] = Math.round(clamp(sum[1] / 4) * 255);
      png.data[offset + 2] = Math.round(clamp(sum[2] / 4) * 255);
      png.data[offset + 3] = 255;
    }
  }
  return png;
}

function makeThumbnail(source) {
  const width = 320;
  const height = Math.round((source.height * width) / source.width);
  const thumbnail = new PNG({ width, height, colorType: 6 });
  const scaleX = source.width / width;
  const scaleY = source.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scaleX));
      const y0 = Math.floor(y * scaleY);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scaleY));
      const sum = [0, 0, 0];
      let count = 0;
      for (let sourceY = y0; sourceY < y1; sourceY++) {
        for (let sourceX = x0; sourceX < x1; sourceX++) {
          const sourceOffset = (sourceY * source.width + sourceX) * 4;
          sum[0] += source.data[sourceOffset];
          sum[1] += source.data[sourceOffset + 1];
          sum[2] += source.data[sourceOffset + 2];
          count++;
        }
      }
      const offset = (y * width + x) * 4;
      thumbnail.data[offset] = Math.round(sum[0] / count);
      thumbnail.data[offset + 1] = Math.round(sum[1] / count);
      thumbnail.data[offset + 2] = Math.round(sum[2] / count);
      thumbnail.data[offset + 3] = 255;
    }
  }
  return thumbnail;
}

function writePng(file, png) {
  const buffer = PNG.sync.write(png, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
    deflateLevel: 9,
    deflateStrategy: 3,
  });
  fs.writeFileSync(file, buffer);
  return buffer.length;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
let totalBytes = 0;
for (const sample of samples) {
  process.stdout.write(`Rendering ${sample.name} `);
  const image = renderImage(sample);
  const thumbnail = makeThumbnail(image);
  const imageBytes = writePng(path.join(OUTPUT_DIR, `${sample.id}.png`), image);
  const thumbnailBytes = writePng(
    path.join(OUTPUT_DIR, `${sample.id}-thumb.png`),
    thumbnail,
  );
  totalBytes += imageBytes + thumbnailBytes;
  console.log(
    ` ${sample.width}x${sample.height} (${imageBytes + thumbnailBytes} bytes)`,
  );
}

const manifest = samples.map(({ id, name, note, width, height, best }) => ({
  id,
  name,
  note,
  src: `samples/${id}.png`,
  thumb: `samples/${id}-thumb.png`,
  width,
  height,
  best,
}));
fs.writeFileSync(
  path.join(OUTPUT_DIR, "index.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote ${samples.length} samples and thumbnails (${totalBytes} PNG bytes total)`,
);
