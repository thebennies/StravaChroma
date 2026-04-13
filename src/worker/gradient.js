/**
 * Gradient color calculation for tilted gradient effect
 * Projects pixels onto a 105° axis for lighting simulation
 */

import { hslToRgb } from './utils.js';

// Cosine/sine of 105° gradient angle, computed once.
const GRAD_COS = Math.cos(105 * (Math.PI / 180));
const GRAD_SIN = Math.sin(105 * (Math.PI / 180));

// Luminance below which gradient is skipped (near-black colors have no room to darken).
const GRADIENT_BLACK_THRESHOLD = 0.10;

/**
 * Build gradient stops for one layer from HSL values.
 * Uses luminance scaling to preserve hue and saturation across all stops.
 *
 * Pattern: slightly-darker → selected color → notably-darker (left → right at 0°).
 *   start  = L × 0.82  (~18% darker than selected)
 *   middle = L          (selected color)
 *   end    = L × 0.55  (~45% darker than selected)
 *
 * Returns null when the color is near-black (no gradient applied).
 *
 * @param {number} hue - Hue (0–360)
 * @param {number} sat - Saturation (0–1)
 * @param {number} luminance - Luminance (0–1)
 * @returns {Object|null} Gradient stops { start, middle, end } each with { r, g, b }
 */
export function buildLayerGradient(hue, sat, luminance) {
  if (luminance < GRADIENT_BLACK_THRESHOLD) return null;

  const startL = luminance * 0.82;
  const endL   = luminance * 0.55;

  const [startR, startG, startB] = hslToRgb(hue, sat, startL);
  const [midR,   midG,   midB]   = hslToRgb(hue, sat, luminance);
  const [endR,   endG,   endB]   = hslToRgb(hue, sat, endL);

  return {
    start:  { r: startR, g: startG, b: startB },
    middle: { r: midR,   g: midG,   b: midB   },
    end:    { r: endR,   g: endG,   b: endB   },
  };
}

/**
 * Sample the gradient for a single pixel.
 * t is computed by projecting (x, y) onto the 105° gradient axis and
 * normalising to [0, 1] across the image diagonal in that direction.
 * A smoothstep curve is applied so transitions feel natural.
 *
 * Four-stop mapping with a plateau in the middle:
 *   s ∈ [0,   0.2]  → start  → middle  (leading ramp)
 *   s ∈ [0.2, 0.8]  → middle plateau   (selected color)
 *   s ∈ [0.8, 1]    → middle → end     (trailing ramp)
 *
 * Writes result into `out` array to avoid per-pixel object allocation.
 *
 * @param {Object} grad - Gradient stops { start, middle, end } with { r, g, b }
 * @param {number} pixelIndex - Linear pixel index in the image
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {Uint8Array} out - Output array [r, g, b] to write result into
 */
export function getGradientColor(grad, pixelIndex, width, height, out) {
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);

  // Normalise projection to [0, 1] — works for any angle, including ones
  // where cos or sin is negative (e.g. 105° where cos < 0).
  const minProj = Math.min(0, (width - 1) * GRAD_COS) + Math.min(0, (height - 1) * GRAD_SIN);
  const range   = (width - 1) * Math.abs(GRAD_COS) + (height - 1) * Math.abs(GRAD_SIN);
  const proj    = x * GRAD_COS + y * GRAD_SIN;
  const t       = Math.max(0, Math.min(1, (proj - minProj) / range));

  // Smoothstep for ease-in-out
  const s = t * t * (3 - 2 * t);

  const RAMP_IN  = 0.2;
  const RAMP_OUT = 0.8;
  const { start, middle, end } = grad;

  if (s <= RAMP_IN) {
    const lt = s / RAMP_IN; // 0→1 over leading ramp
    out[0] = (start.r + (middle.r - start.r) * lt) | 0;
    out[1] = (start.g + (middle.g - start.g) * lt) | 0;
    out[2] = (start.b + (middle.b - start.b) * lt) | 0;
  } else if (s <= RAMP_OUT) {
    // flat plateau — pure selected color
    out[0] = middle.r;
    out[1] = middle.g;
    out[2] = middle.b;
  } else {
    const lt = (s - RAMP_OUT) / (1 - RAMP_OUT); // 0→1 over trailing ramp
    out[0] = (middle.r + (end.r - middle.r) * lt) | 0;
    out[1] = (middle.g + (end.g - middle.g) * lt) | 0;
    out[2] = (middle.b + (end.b - middle.b) * lt) | 0;
  }
}
