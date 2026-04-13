// Pure computation module — no DOM APIs allowed

import {
  ALPHA_THRESHOLD, TEXT_SATURATION_MAX, PREVIEW_SCALE_FACTOR,
  MASK_TRANSPARENT, MASK_MAP, MASK_DATA, MASK_LABEL,
} from '../constants.js';

import {
  hslToRgb, saturation,
  otsuThresholdInt, downscaleNN,
} from './utils.js';

// ── Classification ───────────────────────────────────────────────────────────

// Union-Find with path compression and union by rank
function makeUnionFind(n) {
  const parent = new Int32Array(n);
  const rank = new Uint8Array(n);
  parent.fill(-1); // -1 = not in any set

  function init(x) { parent[x] = x; rank[x] = 0; }

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a, b) {
    a = find(a); b = find(b);
    if (a === b) return;
    if (rank[a] < rank[b]) { const t = a; a = b; b = t; }
    parent[b] = a;
    if (rank[a] === rank[b]) rank[a]++;
  }

  return { init, find, union };
}

function classify(pixelData, width, height) {
  const numPixels = width * height;
  const mask = new Uint8Array(numPixels);

  // Temporary sentinel for low-saturation pixels awaiting component analysis.
  // Must not collide with any MASK_* constant (0–3).
  const MASK_PENDING = 255;

  // ── Pass 1: classify pixels and build connected components in one pass ────
  // Strava images have a transparent background, a colored route, and white text.
  // - transparent (alpha ≤ threshold) → MASK_TRANSPARENT
  // - high saturation                 → MASK_MAP (route)
  // - low saturation, visible         → text (marked MASK_PENDING, split later)
  const uf = makeUnionFind(numPixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const base = i * 4;
      const a = pixelData[base + 3];

      if (a <= ALPHA_THRESHOLD) {
        mask[i] = MASK_TRANSPARENT;
        continue;
      }

      const s = saturation(pixelData[base], pixelData[base + 1], pixelData[base + 2]);

      if (s >= TEXT_SATURATION_MAX) {
        mask[i] = MASK_MAP;
      } else {
        mask[i] = MASK_PENDING;
        uf.init(i);
        if (x > 0 && mask[i - 1] === MASK_PENDING) uf.union(i, i - 1);
        if (y > 0 && mask[i - width] === MASK_PENDING) uf.union(i, i - width);
      }
    }
  }

  // Compute bounding-box and pixel count per component
  const compMinY = new Map();
  const compMaxY = new Map();
  const compMinX = new Map();
  const compMaxX = new Map();
  const compSize = new Map();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i] !== MASK_PENDING) continue;
      const root = uf.find(i);

      const prevMin = compMinY.get(root);
      if (prevMin === undefined) {
        compMinY.set(root, y);
        compMaxY.set(root, y);
        compMinX.set(root, x);
        compMaxX.set(root, x);
        compSize.set(root, 1);
      } else {
        if (y < prevMin) compMinY.set(root, y);
        if (y > compMaxY.get(root)) compMaxY.set(root, y);
        if (x < compMinX.get(root)) compMinX.set(root, x);
        if (x > compMaxX.get(root)) compMaxX.set(root, x);
        compSize.set(root, compSize.get(root) + 1);
      }
    }
  }

  // Determine per-component label: data (tall/wide) vs label (short text)
  // Uses Otsu's method on height distribution to find optimal threshold
  const heights = [];
  for (const [root, size] of compSize) {
    if (size < MIN_COMPONENT_PIXELS) continue; // ignore noise
    const h = compMaxY.get(root) - compMinY.get(root) + 1;
    heights.push(h);
  }

  // Otsu threshold to split text into DATA vs LABEL
  const heightThreshold = heights.length > 0 ? otsuThresholdInt(heights, Math.max(...heights)) : 10;

  // Mark each component
  const rootToLabel = new Map();
  for (const [root, size] of compSize) {
    if (size < MIN_COMPONENT_PIXELS) {
      rootToLabel.set(root, MASK_TRANSPARENT);
      continue;
    }
    const h = compMaxY.get(root) - compMinY.get(root) + 1;
    rootToLabel.set(root, h > heightThreshold ? MASK_DATA : MASK_LABEL);
  }

  // Finalize mask: replace MASK_PENDING with actual labels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i] === MASK_PENDING) {
        const root = uf.find(i);
        mask[i] = rootToLabel.get(root) ?? MASK_TRANSPARENT;
      }
    }
  }

  return mask;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

const MIN_COMPONENT_PIXELS = 10;

function render(pixelData, mask, width, height, sliders, downscale, gradientEnabled) {
  // Optional: downscale for preview
  let srcData = pixelData;
  let srcMask = mask;
  let outW = width, outH = height;
  if (downscale && PREVIEW_SCALE_FACTOR < 1) {
    const ds = downscaleNN(pixelData, width, height, PREVIEW_SCALE_FACTOR);
    // Downscale mask using nearest neighbor to maintain pixel alignment
    const dsMask = downscaleMaskNearest(srcMask, width, height, PREVIEW_SCALE_FACTOR);
    srcData = ds.data;
    srcMask = dsMask;
    outW = ds.width;
    outH = ds.height;
  }

  const numPixels = outW * outH;
  const output = new Uint8ClampedArray(numPixels * 4);

  // Precompute base RGBs from HSL sliders
  const [mapR,  mapG,  mapB]  = hslToRgb(sliders.mapHue,  sliders.mapSat,  sliders.mapLuminance);
  const [dataR, dataG, dataB] = hslToRgb(sliders.dataHue, sliders.dataSat, sliders.dataLuminance);
  const [labelR, labelG, labelB] = hslToRgb(sliders.labelHue, sliders.labelSat, sliders.labelLuminance);

  // Build gradient color ramps if enabled
  let gradientColors = null;
  if (gradientEnabled) {
    gradientColors = {
      map:   buildGradient(mapR,  mapG,  mapB),
      data:  buildGradient(dataR, dataG, dataB),
      label: buildGradient(labelR, labelG, labelB),
    };
  }

  // Reusable array for gradient color results to reduce GC pressure
  const gradResult = new Uint8Array(3);

  for (let i = 0; i < numPixels; i++) {
    const base = i * 4;
    const a = srcData[base + 3];
    const m = srcMask[i];

    if (m === MASK_TRANSPARENT) {
      output[base]     = srcData[base];
      output[base + 1] = srcData[base + 1];
      output[base + 2] = srcData[base + 2];
      output[base + 3] = a;
      continue;
    }

    let nr, ng, nb;
    if (m === MASK_MAP) {
      if (gradientColors && gradientColors.map) {
        getGradientColor(gradientColors.map, i, outW, outH, gradResult);
        nr = gradResult[0]; ng = gradResult[1]; nb = gradResult[2];
      } else {
        nr = mapR;   ng = mapG;   nb = mapB;
      }
    } else if (m === MASK_DATA) {
      if (gradientColors && gradientColors.data) {
        getGradientColor(gradientColors.data, i, outW, outH, gradResult);
        nr = gradResult[0]; ng = gradResult[1]; nb = gradResult[2];
      } else {
        nr = dataR;  ng = dataG;  nb = dataB;
      }
    } else {
      if (gradientColors && gradientColors.label) {
        getGradientColor(gradientColors.label, i, outW, outH, gradResult);
        nr = gradResult[0]; ng = gradResult[1]; nb = gradResult[2];
      } else {
        nr = labelR; ng = labelG; nb = labelB;
      }
    }

    output[base]     = nr;
    output[base + 1] = ng;
    output[base + 2] = nb;
    output[base + 3] = a;
  }

  return { data: output, width: outW, height: outH };
}

// Cosine/sine of 105° gradient angle, computed once.
const GRAD_COS = Math.cos(105 * (Math.PI / 180));
const GRAD_SIN = Math.sin(105 * (Math.PI / 180));

/**
 * Downscale mask using nearest-neighbor to maintain pixel alignment with image
 */
function downscaleMaskNearest(srcMask, srcW, srcH, scale) {
  const dstW = Math.max(1, Math.floor(srcW * scale));
  const dstH = Math.max(1, Math.floor(srcH * scale));
  const dst = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x / scale);
      dst[y * dstW + x] = srcMask[srcY * srcW + srcX];
    }
  }
  return dst;
}

/**
 * Build a 4-stop gradient ramp: darker → selected → selected → darker
 * Returns objects with {start, middle, end} RGB values
 */
function buildGradient(r, g, b) {
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
 * @param {Object} grad - Gradient definition with start, middle, end RGB
 * @param {number} pixelIndex - Linear pixel index
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Uint8Array} out - Output array [r, g, b] to write result into
 */
function getGradientColor(grad, pixelIndex, width, height, out) {
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

// ── Message handler ───────────────────────────────────────────────────────────

/**
 * Validate classify message structure
 * @param {Object} msg - Worker message
 * @returns {boolean} True if message is valid
 */
function isValidClassifyMsg(msg) {
  return msg &&
    typeof msg.requestId === 'number' &&
    msg.pixelData instanceof Uint8ClampedArray &&
    typeof msg.width === 'number' &&
    typeof msg.height === 'number' &&
    msg.width > 0 &&
    msg.height > 0;
}

/**
 * Validate render message structure
 * @param {Object} msg - Worker message
 * @returns {boolean} True if message is valid
 */
function isValidRenderMsg(msg) {
  return msg &&
    typeof msg.requestId === 'number' &&
    msg.pixelData instanceof Uint8ClampedArray &&
    msg.mask instanceof Uint8Array &&
    typeof msg.width === 'number' &&
    typeof msg.height === 'number' &&
    msg.width > 0 &&
    msg.height > 0 &&
    typeof msg.sliders === 'object' &&
    msg.sliders !== null;
}

self.onmessage = function(e) {
  const msg = e.data;

  if (msg.type === 'classify') {
    if (!isValidClassifyMsg(msg)) {
      console.error('Invalid classify message:', msg);
      self.postMessage({ type: 'error', requestId: msg.requestId ?? 0, message: 'Invalid classify message structure' });
      return;
    }
    
    const { requestId, pixelData, width, height } = msg;
    try {
      const mask = classify(pixelData, width, height);
      let mapCount = 0, textCount = 0;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === MASK_MAP) mapCount++;
        else if (mask[i] === MASK_DATA || mask[i] === MASK_LABEL) textCount++;
      }
      self.postMessage({ type: 'classified', requestId, mask, mapCount, textCount }, [mask.buffer]);
    } catch (err) {
      console.error('Worker classify error:', err);
      self.postMessage({ type: 'error', requestId, message: err.message });
    }
    return;
  }

  if (msg.type === 'render') {
    if (!isValidRenderMsg(msg)) {
      console.error('Invalid render message:', msg);
      self.postMessage({ type: 'error', requestId: msg.requestId ?? 0, message: 'Invalid render message structure' });
      return;
    }
    
    const { requestId, pixelData, mask, width, height, sliders, downscale, gradientEnabled } = msg;
    try {
      const result = render(pixelData, mask, width, height, sliders, downscale, gradientEnabled);
      self.postMessage(
        { type: 'rendered', requestId, pixelData: result.data, width: result.width, height: result.height },
        [result.data.buffer]
      );
    } catch (err) {
      console.error('Worker render error:', err);
      self.postMessage({ type: 'error', requestId, message: err.message });
    }
    return;
  }
  
  // Unknown message type
  console.error('Unknown worker message type:', msg.type);
  self.postMessage({ type: 'error', requestId: msg.requestId ?? 0, message: `Unknown message type: ${msg.type}` });
};
