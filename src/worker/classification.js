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
