// Pure utility functions shared between the worker and tests.
// No DOM APIs — safe to import in Node.js (vitest).

// ── HSL ↔ RGB ────────────────────────────────────────────────────────────────

/**
 * Converts an RGB colour to HSL.
 * @param {number} r  Red   0–255
 * @param {number} g  Green 0–255
 * @param {number} b  Blue  0–255
 * @returns {[number, number, number]} [hue 0–360, saturation 0–1, lightness 0–1]
 */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

/**
 * Converts an HSL colour to RGB.
 * @param {number} h  Hue        0–360 (wraps)
 * @param {number} s  Saturation 0–1 (clamped)
 * @param {number} l  Lightness  0–1 (clamped)
 * @returns {[number, number, number]} [r, g, b] each 0–255
 */
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h)       * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the HSL saturation of an RGB pixel.
 * @param {number} r  Red   0–255
 * @param {number} g  Green 0–255
 * @param {number} b  Blue  0–255
 * @returns {number} Saturation 0–1
 */
export function saturation(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Blends a lightness value toward 0.5 based on saturation.
 * Used to prevent fully-saturated colours from becoming too dark or bright.
 * @param {number} l    Lightness  0–1
 * @param {number} sat  Saturation 0–1
 * @returns {number} Blended lightness 0–1
 */
export function blendLightness(l, sat) {
  return l * (1 - sat) + 0.5 * sat;
}

// ── Otsu's method ────────────────────────────────────────────────────────────

/**
 * Computes an optimal threshold that separates two classes in a distribution.
 * @param {number[]} values  Integer values in [0, maxVal]
 * @param {number}   maxVal  Maximum possible value (inclusive)
 * @returns {number} Best threshold
 */
export function otsuThresholdInt(values, maxVal) {
  if (values.length === 0) return 0;

  const bins = maxVal + 1;
  const hist = new Uint32Array(bins);
  for (let i = 0; i < values.length; i++) hist[values[i]]++;

  const total = values.length;
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist[i];

  let sumBg = 0, wBg = 0;
  let maxVariance = 0, bestThreshold = 0;

  for (let t = 0; t < bins; t++) {
    wBg += hist[t];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;

    sumBg += t * hist[t];
    const meanBg = sumBg / wBg;
    const meanFg = (sumAll - sumBg) / wFg;
    const variance = wBg * wFg * (meanBg - meanFg) * (meanBg - meanFg);

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }

  return bestThreshold;
}

// ── Nearest-neighbour downscale ───────────────────────────────────────────────

/**
 * Downscales RGBA pixel data using nearest-neighbour interpolation.
 * @param {Uint8ClampedArray} src   Source RGBA pixels
 * @param {number}            srcW  Source width
 * @param {number}            srcH  Source height
 * @param {number}            scale Scale factor (e.g. 0.5 for half-size)
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function downscaleNN(src, srcW, srcH, scale) {
  const dstW = Math.max(1, Math.floor(srcW * scale));
  const dstH = Math.max(1, Math.floor(srcH * scale));
  const dst = new Uint8ClampedArray(dstW * dstH * 4);

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x / scale);
      const srcBase = (srcY * srcW + srcX) * 4;
      const dstBase = (y * dstW + x) * 4;
      dst[dstBase]     = src[srcBase];
      dst[dstBase + 1] = src[srcBase + 1];
      dst[dstBase + 2] = src[srcBase + 2];
      dst[dstBase + 3] = src[srcBase + 3];
    }
  }

  return { data: dst, width: dstW, height: dstH };
}
