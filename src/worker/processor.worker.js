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

  // Filter noise
  const MIN_COMPONENT_PIXELS = 10;
  const validRoots = new Set();

  for (const [root, size] of compSize) {
    if (size < MIN_COMPONENT_PIXELS) continue;
    validRoots.add(root);
  }

  // ── Proximity-based merging ─────────────────────────────────────────────────
  // Merge nearby text components so punctuation (., :) inherits the height
  // classification of neighboring characters.
  const rootList = Array.from(validRoots);
  rootList.sort((a, b) => compMinX.get(a) - compMinX.get(b));

  const uf2 = makeUnionFind(rootList.length);
  for (let idx = 0; idx < rootList.length; idx++) uf2.init(idx);

  for (let i = 0; i < rootList.length; i++) {
    const ri = rootList[i];
    const hi = compMaxY.get(ri) - compMinY.get(ri) + 1;
    const maxXi = compMaxX.get(ri);
    const centerYi = (compMinY.get(ri) + compMaxY.get(ri)) / 2;

    for (let j = i + 1; j < rootList.length; j++) {
      const rj = rootList[j];
      const hj = compMaxY.get(rj) - compMinY.get(rj) + 1;
      const maxH2 = Math.max(hi, hj);
      const gapThreshold = 0.5 * maxH2;

      // Horizontal gap (sorted by minX, so minX_j >= minX_i)
      const gapX = Math.max(0, compMinX.get(rj) - maxXi);
      if (gapX > gapThreshold) break;

      // Vertical compatibility: Y-centers within maxH of each other
      const centerYj = (compMinY.get(rj) + compMaxY.get(rj)) / 2;
      if (Math.abs(centerYi - centerYj) > maxH2) continue;

      uf2.union(i, j);
    }
  }

  // Compute merged-group bounding boxes
  const groupMinY = new Map();
  const groupMaxY = new Map();
  for (let idx = 0; idx < rootList.length; idx++) {
    const gRoot = uf2.find(idx);
    const r = rootList[idx];
    const prevMin = groupMinY.get(gRoot);
    if (prevMin === undefined) {
      groupMinY.set(gRoot, compMinY.get(r));
      groupMaxY.set(gRoot, compMaxY.get(r));
    } else {
      if (compMinY.get(r) < prevMin) groupMinY.set(gRoot, compMinY.get(r));
      if (compMaxY.get(r) > groupMaxY.get(gRoot)) groupMaxY.set(gRoot, compMaxY.get(r));
    }
  }

  // Map each component root to its merged group height
  const rootToMergedHeight = new Map();
  for (let idx = 0; idx < rootList.length; idx++) {
    const gRoot = uf2.find(idx);
    rootToMergedHeight.set(rootList[idx], groupMaxY.get(gRoot) - groupMinY.get(gRoot) + 1);
  }

  // Collect merged heights for Otsu
  const mergedHeights = [];
  for (const [gRoot] of groupMinY) {
    mergedHeights.push(groupMaxY.get(gRoot) - groupMinY.get(gRoot) + 1);
  }

  // ── Pass 3: split components by height — tall = DATA, short = LABEL ───────
  let maxH = 0;
  for (const h of mergedHeights) if (h > maxH) maxH = h;

  const heightThreshold = maxH > 0
    ? otsuThresholdInt(mergedHeights, maxH)
    : 0;

  // Build root → DATA/LABEL lookup using merged group heights
  const compClass = new Map();
  for (const root of validRoots) {
    const h = rootToMergedHeight.get(root) || (compMaxY.get(root) - compMinY.get(root) + 1);
    compClass.set(root, h >= heightThreshold ? MASK_DATA : MASK_LABEL);
  }

  // Final assignment
  for (let i = 0; i < numPixels; i++) {
    if (mask[i] !== 255) continue;
    const root = uf.find(i);
    const cls = compClass.get(root);
    mask[i] = cls !== undefined ? cls : MASK_MAP;
  }

  return mask;
}

// ── Render pass ──────────────────────────────────────────────────────────────

function render(pixelData, mask, width, height, sliders, downscale, gradientEnabled = false) {
  const { mapHue, mapSat, mapLuminance,
          dataHue, dataSat, dataLuminance,
          labelHue, labelSat, labelLuminance } = sliders;

  let srcData = pixelData;
  let srcMask = mask;
  let outW = width;
  let outH = height;

  if (downscale) {
    const scaled = downscaleNN(pixelData, width, height, PREVIEW_SCALE_FACTOR);
    srcData = scaled.data;
    outW = scaled.width;
    outH = scaled.height;

    // Downscale mask with nearest-neighbour (same formula as downscaleNN)
    const scaledMask = new Uint8Array(outW * outH);
    for (let y = 0; y < outH; y++) {
      const srcY = Math.floor(y / PREVIEW_SCALE_FACTOR);
      for (let x = 0; x < outW; x++) {
        const srcX = Math.floor(x / PREVIEW_SCALE_FACTOR);
        scaledMask[y * outW + x] = mask[srcY * width + srcX];
      }
    }
    srcMask = scaledMask;
  }

  const numPixels = outW * outH;
  const output = new Uint8ClampedArray(srcData.length);

  const [mapR,   mapG,   mapB]   = hslToRgb(mapHue,   mapSat,   mapLuminance);
  const [dataR,  dataG,  dataB]  = hslToRgb(dataHue,  dataSat,  dataLuminance);
  const [labelR, labelG, labelB] = hslToRgb(labelHue, labelSat, labelLuminance);

  // Pre-compute gradient colors if gradient is enabled
  const gradientColors = gradientEnabled
    ? computeGradientColors(sliders)
    : null;

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
        const gc = getGradientColor(gradientColors.map, i, outW, outH);
        nr = gc.r; ng = gc.g; nb = gc.b;
      } else {
        nr = mapR;   ng = mapG;   nb = mapB;
      }
    } else if (m === MASK_DATA) {
      if (gradientColors && gradientColors.data) {
        const gc = getGradientColor(gradientColors.data, i, outW, outH);
        nr = gc.r; ng = gc.g; nb = gc.b;
      } else {
        nr = dataR;  ng = dataG;  nb = dataB;
      }
    } else {
      if (gradientColors && gradientColors.label) {
        const gc = getGradientColor(gradientColors.label, i, outW, outH);
        nr = gc.r; ng = gc.g; nb = gc.b;
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

// Luminance below which gradient is skipped (near-black).
const GRADIENT_BLACK_THRESHOLD = 0.10;

/**
 * Build the three RGB stops for one layer's gradient.
 * Pattern: slightly-darker → selected color → notably-darker, left → right (0°).
 * Returns null when the color is near-black (no gradient applied).
 *
 * Offsets are relative to luminance so they scale correctly across all
 * brightness levels:
 *   start  = L × 0.82  (~18% darker than selected)
 *   middle = L          (selected color)
 *   end    = L × 0.55  (~45% darker than selected)
 */
function buildLayerGradient(hue, sat, luminance) {
  if (luminance < GRADIENT_BLACK_THRESHOLD) return null;

  const startL  = luminance * 0.82;
  const endL    = luminance * 0.55;

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
 * Pre-compute one gradient per active layer.  Returns an object with keys
 * map / data / label; each value is a gradient stops object or null.
 */
function computeGradientColors(sliders) {
  const { mapHue, mapSat, mapLuminance,
          dataHue, dataSat, dataLuminance,
          labelHue, labelSat, labelLuminance } = sliders;

  return {
    map:   buildLayerGradient(mapHue,   mapSat,   mapLuminance),
    data:  buildLayerGradient(dataHue,  dataSat,  dataLuminance),
    label: buildLayerGradient(labelHue, labelSat, labelLuminance),
  };
}

/**
 * Sample the gradient for a single pixel.
 * t is computed by projecting (x, y) onto the 0° gradient axis and
 * normalising to [0, 1] across the image diagonal in that direction.
 * A smoothstep curve is applied so transitions feel natural.
 *
 * Three-stop mapping:
 *   t ∈ [0, 0.4]  →  start  → middle  (slightly-darker ramps up to selected)
 *   t ∈ [0.4, 1]  →  middle → end     (selected ramps down to notably-darker)
 *
 * The midpoint is placed at t=0.4 instead of 0.5 so the selected color
 * "peaks" slightly earlier, giving a more natural highlight feel.
 */
function getGradientColor(grad, pixelIndex, width, height) {
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

  let r, g, b;
  if (s <= RAMP_IN) {
    const lt = s / RAMP_IN; // 0→1 over leading ramp
    r = (start.r + (middle.r - start.r) * lt) | 0;
    g = (start.g + (middle.g - start.g) * lt) | 0;
    b = (start.b + (middle.b - start.b) * lt) | 0;
  } else if (s <= RAMP_OUT) {
    // flat plateau — pure selected color
    r = middle.r; g = middle.g; b = middle.b;
  } else {
    const lt = (s - RAMP_OUT) / (1 - RAMP_OUT); // 0→1 over trailing ramp
    r = (middle.r + (end.r - middle.r) * lt) | 0;
    g = (middle.g + (end.g - middle.g) * lt) | 0;
    b = (middle.b + (end.b - middle.b) * lt) | 0;
  }

  return { r, g, b };
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = function(e) {
  const msg = e.data;

  if (msg.type === 'classify') {
    const { requestId, pixelData, width, height } = msg;
    const mask = classify(pixelData, width, height);
    let mapCount = 0, textCount = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === MASK_MAP) mapCount++;
      else if (mask[i] === MASK_DATA || mask[i] === MASK_LABEL) textCount++;
    }
    self.postMessage({ type: 'classified', requestId, mask, mapCount, textCount }, [mask.buffer]);
    return;
  }

  if (msg.type === 'render') {
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
};
