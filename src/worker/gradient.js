/**
 * Gradient color calculation for tilted gradient effect
 * Projects pixels onto a 105° axis for lighting simulation
 */

// Cosine/sine of 105° gradient angle, computed once.
const GRAD_COS = Math.cos(105 * (Math.PI / 180));
const GRAD_SIN = Math.sin(105 * (Math.PI / 180));

/**
 * Build a 4-stop gradient ramp: darker → selected → selected → darker
 * Returns objects with {start, middle, end} RGB values
 * 
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} Gradient definition with start, middle, end RGB
 */
export function buildGradient(r, g, b) {
  // Darken by 30% for shadow side, lighten by 10% for highlight side
  const shadowR   = Math.max(0, (r * 0.7) | 0);
  const shadowG   = Math.max(0, (g * 0.7) | 0);
  const shadowB   = Math.max(0, (b * 0.7) | 0);
  const highlightR = Math.min(255, (r * 1.1) | 0);
  const highlightG = Math.min(255, (g * 1.1) | 0);
  const highlightB = Math.min(255, (b * 1.1) | 0);

  return {
    start:  { r: shadowR,   g: shadowG,   b: shadowB },
    middle: { r,           g,           b },
    end:    { r: highlightR, g: highlightG, b: highlightB },
  };
}

/**
 * Calculate gradient color for a given pixel by projecting onto the 105° axis.
 * Writes result to the provided output array to avoid object allocation.
 * 
 * The gradient goes from darker (start) → selected color (middle) → lighter (end)
 * with a smooth plateau transition using smoothstep interpolation.
 * 
 * @param {Object} grad - Gradient definition with start, middle, end RGB
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
  // minProj is the projection at the "dark" corner; range spans the full diagonal.
  const minProj = Math.min(0, (width - 1) * GRAD_COS) + Math.min(0, (height - 1) * GRAD_SIN);
  const range   = (width - 1) * Math.abs(GRAD_COS) + (height - 1) * Math.abs(GRAD_SIN);
  const proj    = x * GRAD_COS + y * GRAD_SIN;
  const t       = Math.max(0, Math.min(1, (proj - minProj) / range));

  // Smoothstep for ease-in-out
  const s = t * t * (3 - 2 * t);

  // Four-stop: start → peak → peak → end
  // peak plateau covers 60% of the range (s: 0.2 → 0.8)
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
