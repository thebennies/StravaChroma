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
    ? computeGradientColors(sliders, outW, outH)
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

/**
 * Compute gradient colors for each layer.
 * Gradient pattern: slightly darker -> selected color -> darker color
 * Tilted at 15 degrees.
 * Returns null for layers that are black or near-black (luminance < 0.08).
 */
function computeGradientColors(sliders, width, height) {
  const { mapHue, mapSat, mapLuminance,
          dataHue, dataSat, dataLuminance,
          labelHue, labelSat, labelLuminance } = sliders;

  // Black threshold - skip gradient for near-black colors
  const BLACK_THRESHOLD = 0.08;

  return {
    map: mapLuminance < BLACK_THRESHOLD ? null : buildLayerGradient(mapHue, mapSat, mapLuminance),
    data: dataLuminance < BLACK_THRESHOLD ? null : buildLayerGradient(dataHue, dataSat, dataLuminance),
    label: labelLuminance < BLACK_THRESHOLD ? null : buildLayerGradient(labelHue, labelSat, labelLuminance),
  };
}

/**
 * Build gradient lookup for a layer.
 * Creates a smooth gradient: slightly darker -> selected color -> darker.
 * Uses balanced offsets so the gradient flows naturally without a "hill" effect.
 */
function buildLayerGradient(hue, sat, luminance) {
  // Start: slightly darker than selected (5% darker)
  const startL = Math.max(0, luminance - 0.05);
  // End: noticeably darker (15% darker)
  const endL = Math.max(0, luminance - 0.15);

  const [, startR, startG, startB] = hslToRgb(hue, sat, startL);
  const [, midR, midG, midB] = hslToRgb(hue, sat, luminance);
  const [, endR, endG, endB] = hslToRgb(hue, sat, endL);

  return {
    start: { r: startR, g: startG, b: startB, l: startL },
    middle: { r: midR, g: midG, b: midB, l: luminance },
    end: { r: endR, g: endG, b: endB, l: endL },
  };
}

/**
 * Get gradient color for a pixel based on its position.
 * Gradient is tilted 15 degrees from horizontal.
 * Maps position to a smooth curve through three stops for natural shading.
 */
function getGradientColor(layerGradient, pixelIndex, width, height) {
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);

  // 15-degree tilt: angle in radians
  const angleRad = 15 * (Math.PI / 180);

  // Project (x, y) onto the gradient direction
  const gx = Math.cos(angleRad);
  const gy = Math.sin(angleRad);

  // Normalize position to 0-1 range along the gradient direction
  const maxProj = width * Math.abs(gx) + height * Math.abs(gy);
  const proj = x * gx + y * gy;
  let t = proj / maxProj;

  // Clamp to 0-1
  t = Math.max(0, Math.min(1, t));

  // Smooth step function for more natural transitions (ease-in-out)
  // This prevents sharp changes at the stops
  const smoothT = t * t * (3 - 2 * t);

  // Three-stop gradient with middle at t=0.5:
  // 0.0 -> 0.5: start to middle (slightly darker → selected)
  // 0.5 -> 1.0: middle to end (selected → darker)
  const { start, middle, end } = layerGradient;

  let r, g, b;
  if (smoothT < 0.5) {
    // First half: start -> middle
    const localT = smoothT * 2; // 0 to 1
    r = Math.round(start.r + (middle.r - start.r) * localT);
    g = Math.round(start.g + (middle.g - start.g) * localT);
    b = Math.round(start.b + (middle.b - start.b) * localT);
  } else {
    // Second half: middle -> end
    const localT = (smoothT - 0.5) * 2; // 0 to 1
    r = Math.round(middle.r + (end.r - middle.r) * localT);
    g = Math.round(middle.g + (end.g - middle.g) * localT);
    b = Math.round(middle.b + (end.b - middle.b) * localT);
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
