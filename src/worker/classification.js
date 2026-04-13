/**
 * Pixel classification module
 * Separates Strava map images into layers: map, data, labels, transparent
 */

import {
  ALPHA_THRESHOLD, TEXT_SATURATION_MAX,
  MASK_TRANSPARENT, MASK_MAP, MASK_DATA, MASK_LABEL,
} from '../constants.js';

import { saturation, otsuThresholdInt } from './utils.js';
import { makeUnionFind } from './union-find.js';

// Minimum pixels a connected component must have to be considered real text/data.
// Components smaller than this are noise (JPEG artifacts, single pixels).
const MIN_COMPONENT_PIXELS = 10;

export function classify(pixelData, width, height) {
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

  // Filter noise — collect valid roots
  const validRoots = new Set();
  for (const [root, size] of compSize) {
    if (size >= MIN_COMPONENT_PIXELS) validRoots.add(root);
  }

  // ── Proximity-based merging ─────────────────────────────────────────────────
  // Merge nearby components so punctuation (., :) inherits the height of
  // adjacent characters, preventing them from being misclassified as noise.
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
      // Merge if horizontal gap is within half the taller component's height
      const gapThreshold = 0.5 * maxH2;

      const gapX = Math.max(0, compMinX.get(rj) - maxXi);
      if (gapX > gapThreshold) break; // list is sorted by minX, no further matches

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

  // Collect merged heights for Otsu thresholding
  const mergedHeights = [];
  for (const [gRoot] of groupMinY) {
    mergedHeights.push(groupMaxY.get(gRoot) - groupMinY.get(gRoot) + 1);
  }

  // ── Pass 3: split components by height — tall = DATA, short = LABEL ────────
  let maxH = 0;
  for (const h of mergedHeights) if (h > maxH) maxH = h;

  const heightThreshold = maxH > 0 ? otsuThresholdInt(mergedHeights, maxH) : 0;

  // Build root → DATA/LABEL lookup using merged group heights
  const compClass = new Map();
  for (const root of validRoots) {
    const h = rootToMergedHeight.get(root) ?? (compMaxY.get(root) - compMinY.get(root) + 1);
    compClass.set(root, h >= heightThreshold ? MASK_DATA : MASK_LABEL);
  }

  // Mark each component
  const rootToLabel = new Map();
  for (const [root, size] of compSize) {
    if (size < MIN_COMPONENT_PIXELS) {
      rootToLabel.set(root, MASK_TRANSPARENT);
      continue;
    }
    rootToLabel.set(root, compClass.get(root) ?? MASK_LABEL);
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
