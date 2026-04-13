/**
 * Rendering module
 * Applies HSL color transformations to classified pixels
 */

import {
  PREVIEW_SCALE_FACTOR,
  MASK_TRANSPARENT, MASK_MAP, MASK_DATA, MASK_LABEL,
} from '../constants.js';

import { hslToRgb, downscaleNN } from './utils.js';
import { buildGradient, getGradientColor } from './gradient.js';

/**
 * Downscale mask using nearest-neighbor to maintain pixel alignment with image
 * 
 * @param {Uint8Array} srcMask - Source mask array
 * @param {number} srcW - Source width
 * @param {number} srcH - Source height
 * @param {number} scale - Downscale factor (0-1)
 * @returns {Uint8Array} Downscaled mask
 */
export function downscaleMaskNearest(srcMask, srcW, srcH, scale) {
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
 * Render pixels with HSL color transformations
 * 
 * @param {Uint8ClampedArray} pixelData - Original pixel data
 * @param {Uint8Array} mask - Classification mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} sliders - HSL slider values
 * @param {boolean} downscale - Whether to downscale for preview
 * @param {boolean} gradientEnabled - Whether to apply gradient effect
 * @returns {Object} Rendered image data { data, width, height }
 */
export function render(pixelData, mask, width, height, sliders, downscale, gradientEnabled) {
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
