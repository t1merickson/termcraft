/**
 * A rotating torus, rendered to a luminance buffer.
 *
 * This exists so the landing page can demonstrate the toolkit with something
 * live rather than a screenshot. It is deliberately self-contained: no image
 * loading, no canvas, no engine imports — just a z-buffered scan of the torus
 * surface into a float buffer that the encoders in `encoders.ts` turn into
 * characters.
 *
 * The maths is the classic donut: a circle of radius R1 offset R2 from the
 * origin, swept around the Y axis, then spun by two more angles.
 */

export interface Buffer {
  width: number;
  height: number;
  /** Surface brightness, 0..1. Zero means background. */
  lum: Float32Array;
  /** Hue in degrees, 0..360, one per sample. Only meaningful where lum > 0. */
  hue: Float32Array;
  /** True where the surface was hit. */
  hit: Uint8Array;
}

export function createBuffer(width: number, height: number): Buffer {
  return {
    width,
    height,
    lum: new Float32Array(width * height),
    hue: new Float32Array(width * height),
    hit: new Uint8Array(width * height),
  };
}

const R1 = 1; // tube radius
const R2 = 2; // ring radius
const K2 = 5; // camera distance

/**
 * Scan the torus into `buf` for rotation angles A and B.
 *
 * `cellAspect` is how much taller one buffer sample is than it is wide, once
 * on screen. A terminal cell is about twice as tall as it is wide, so a buffer
 * with one sample per character passes 2 here; a braille buffer, whose samples
 * are already square, passes 1. Without it the torus comes out squashed.
 */
export function renderTorus(
  buf: Buffer,
  a: number,
  b: number,
  cellAspect = 1,
): void {
  const { width, height, lum, hue, hit } = buf;

  lum.fill(0);
  hit.fill(0);
  // Reused z-buffer; 0 is infinitely far because we store inverse depth.
  const zbuf = getZBuffer(width * height);
  zbuf.fill(0);

  // Pick the scale so the torus fills whichever axis is tighter. The widest
  // the surface reaches is R1 + R2 from the axis, at a typical depth of K2.
  const fill = 0.86;
  const k1 =
    (fill * K2 * Math.min(height, width / cellAspect)) / (2 * (R1 + R2));

  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  const cosB = Math.cos(b);
  const sinB = Math.sin(b);

  const cx = width / 2;
  const cy = height / 2;

  // Step sizes trade detail for frame time. These fill the surface without
  // holes at the buffer sizes the landing page uses.
  const thetaStep = 0.06;
  const phiStep = 0.015;

  for (let phi = 0; phi < Math.PI * 2; phi += phiStep) {
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    for (let theta = 0; theta < Math.PI * 2; theta += thetaStep) {
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // Point on the tube circle, before the sweep.
      const circleX = R2 + R1 * cosTheta;
      const circleY = R1 * sinTheta;

      // Sweep around Y, then spin by A (about X) and B (about Z).
      const x =
        circleX * (cosB * cosPhi + sinA * sinB * sinPhi) -
        circleY * cosA * sinB;
      const y =
        circleX * (sinB * cosPhi - sinA * cosB * sinPhi) +
        circleY * cosA * cosB;
      const z = K2 + cosA * circleX * sinPhi + circleY * sinA;
      const ooz = 1 / z; // one over z, so bigger means nearer

      const sx = Math.round(cx + k1 * ooz * x * cellAspect);
      const sy = Math.round(cy - k1 * ooz * y);

      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

      const idx = sy * width + sx;
      if (ooz <= zbuf[idx]) continue;

      // Surface normal, put through the same rotations as the point.
      const nx =
        cosTheta * (cosB * cosPhi + sinA * sinB * sinPhi) -
        sinTheta * cosA * sinB;
      const ny =
        cosTheta * (sinB * cosPhi - sinA * cosB * sinPhi) +
        sinTheta * cosA * cosB;
      const nz = cosA * cosTheta * sinPhi + sinTheta * sinA;

      // Key light from up and behind the camera, plus a little ambient so the
      // dark side still carries some texture instead of going flat.
      const diffuse = ny * 0.7071 - nz * 0.7071;
      const l = Math.max(0, diffuse) * 0.85 + 0.15;

      // A specular pop keeps the highlight readable once it is quantised down
      // to a handful of characters.
      const spec = Math.pow(Math.max(0, diffuse), 12) * 0.35;

      zbuf[idx] = ooz;
      lum[idx] = Math.min(1, l + spec);
      hue[idx] = ((((phi / (Math.PI * 2)) * 300 + 190) % 360) + 360) % 360;
      hit[idx] = 1;
    }
  }
}

let zbufCache: Float32Array | null = null;
function getZBuffer(size: number): Float32Array {
  if (!zbufCache || zbufCache.length < size) {
    zbufCache = new Float32Array(size);
  }
  return zbufCache.length === size ? zbufCache : zbufCache.subarray(0, size);
}

/** Sample the buffer with bounds checking. Returns 0 outside. */
export function lumAt(buf: Buffer, x: number, y: number): number {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return 0;
  return buf.lum[y * buf.width + x];
}

export function hueAt(buf: Buffer, x: number, y: number): number {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return 0;
  return buf.hue[y * buf.width + x];
}
