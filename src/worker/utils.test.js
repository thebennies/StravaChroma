import { describe, it, expect } from 'vitest';
import { rgbToHsl, hslToRgb, otsuThresholdInt, downscaleNN } from './utils.js';

// ── rgbToHsl ─────────────────────────────────────────────────────────────────

describe('rgbToHsl', () => {
  it('converts black', () => {
    const [, s, l] = rgbToHsl(0, 0, 0);
    expect(l).toBeCloseTo(0);
    expect(s).toBeCloseTo(0);
  });

  it('converts white', () => {
    const [, s, l] = rgbToHsl(255, 255, 255);
    expect(l).toBeCloseTo(1);
    expect(s).toBeCloseTo(0);
  });

  it('converts pure red', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0);
    expect(s).toBeCloseTo(1);
    expect(l).toBeCloseTo(0.5);
  });

  it('converts pure green', () => {
    const [h, s, l] = rgbToHsl(0, 255, 0);
    expect(h).toBeCloseTo(120);
    expect(s).toBeCloseTo(1);
    expect(l).toBeCloseTo(0.5);
  });

  it('converts pure blue', () => {
    const [h, s, l] = rgbToHsl(0, 0, 255);
    expect(h).toBeCloseTo(240);
    expect(s).toBeCloseTo(1);
    expect(l).toBeCloseTo(0.5);
  });

  it('converts mid-grey', () => {
    const [, s, l] = rgbToHsl(128, 128, 128);
    expect(s).toBeCloseTo(0);
    expect(l).toBeCloseTo(128 / 255 / 1, 1);
  });
});

// ── hslToRgb ─────────────────────────────────────────────────────────────────

describe('hslToRgb', () => {
  it('converts black', () => {
    expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0]);
  });

  it('converts white', () => {
    expect(hslToRgb(0, 0, 1)).toEqual([255, 255, 255]);
  });

  it('converts pure red', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
  });

  it('converts pure green', () => {
    expect(hslToRgb(120, 1, 0.5)).toEqual([0, 255, 0]);
  });

  it('converts pure blue', () => {
    expect(hslToRgb(240, 1, 0.5)).toEqual([0, 0, 255]);
  });

  it('wraps hue > 360', () => {
    expect(hslToRgb(360, 1, 0.5)).toEqual(hslToRgb(0, 1, 0.5));
    expect(hslToRgb(480, 1, 0.5)).toEqual(hslToRgb(120, 1, 0.5));
  });

  it('clamps saturation above 1', () => {
    expect(hslToRgb(0, 2, 0.5)).toEqual(hslToRgb(0, 1, 0.5));
  });
});

// ── round-trip ───────────────────────────────────────────────────────────────

describe('rgbToHsl / hslToRgb round-trip', () => {
  const samples = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255],
    [128, 64, 192], [200, 150, 50], [10, 10, 10],
  ];

  for (const [r, g, b] of samples) {
    it(`round-trips (${r}, ${g}, ${b})`, () => {
      const [h, s, l] = rgbToHsl(r, g, b);
      const [r2, g2, b2] = hslToRgb(h, s, l);
      expect(r2).toBeCloseTo(r, -1);
      expect(g2).toBeCloseTo(g, -1);
      expect(b2).toBeCloseTo(b, -1);
    });
  }
});

// ── otsuThresholdInt ──────────────────────────────────────────────────────────

describe('otsuThresholdInt', () => {
  it('returns 0 for empty array', () => {
    expect(otsuThresholdInt([], 255)).toBe(0);
  });

  it('returns 0 for single value', () => {
    expect(otsuThresholdInt([5], 10)).toBe(0);
  });

  it('finds threshold between two clusters', () => {
    // Two tight clusters: [1,2,3] and [8,9,10]
    const values = [1, 2, 3, 1, 2, 3, 8, 9, 10, 9, 8];
    const t = otsuThresholdInt(values, 10);
    expect(t).toBeGreaterThanOrEqual(3);
    expect(t).toBeLessThanOrEqual(8);
  });

  it('handles uniform distribution', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const t = otsuThresholdInt(values, 10);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(10);
  });
});

// ── downscaleNN ───────────────────────────────────────────────────────────────

describe('downscaleNN', () => {
  it('halves a 2×2 image to 1×1, picking top-left pixel', () => {
    // R pixel at (0,0): [255,0,0,255]; others different
    const src = new Uint8ClampedArray([
      255, 0,   0,   255,  // (0,0) red
      0,   255, 0,   255,  // (1,0) green
      0,   0,   255, 255,  // (0,1) blue
      128, 128, 128, 255,  // (1,1) grey
    ]);
    const { data, width, height } = downscaleNN(src, 2, 2, 0.5);
    expect(width).toBe(1);
    expect(height).toBe(1);
    expect(data[0]).toBe(255); // red channel of (0,0)
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  it('halves a 4×4 image to 2×2', () => {
    const src = new Uint8ClampedArray(4 * 4 * 4).fill(0);
    // Set (0,0) to red
    src[0] = 200; src[1] = 0; src[2] = 0; src[3] = 255;
    const { data, width, height } = downscaleNN(src, 4, 4, 0.5);
    expect(width).toBe(2);
    expect(height).toBe(2);
    // Top-left output pixel should map to source (0,0)
    expect(data[0]).toBe(200);
  });

  it('preserves alpha', () => {
    const src = new Uint8ClampedArray([100, 150, 200, 127]);
    const { data } = downscaleNN(src, 1, 1, 1);
    expect(data[3]).toBe(127);
  });

  it('clamps output to at least 1×1', () => {
    const src = new Uint8ClampedArray([0, 0, 0, 255]);
    const { width, height } = downscaleNN(src, 1, 1, 0.1);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});
