import { describe, it, expect, vi, beforeAll } from 'vitest';

// Set up global mock for document before importing modules that use it
global.document = {
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    append: vi.fn(),
    className: '',
    id: '',
    style: {},
    addEventListener: vi.fn(),
    parentNode: null,
  })),
  body: {
    appendChild: vi.fn(),
  },
  getElementById: vi.fn(() => null),
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => cb());

// Mock setTimeout to execute immediately for tests  
global.setTimeout = vi.fn((cb) => cb());

import { checkMemoryConstraints } from './error-boundary.js';

describe('checkMemoryConstraints', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  it('allows small images (<500MB)', () => {
    // Small image: 1000x1000 pixels = ~11.4MB
    const result = checkMemoryConstraints(1, 1000, 1000);
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('returns warning=true for medium images (500-2000MB)', () => {
    // Medium image: 10000x10000 = ~1144MB
    const result = checkMemoryConstraints(10, 10000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(true);
  });

  it('rejects large images (>2000MB)', () => {
    // Large image: 15000x15000 pixels = ~2574MB
    const result = checkMemoryConstraints(50, 15000, 15000);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('correctly rejects images just above 2000MB threshold', () => {
    // Image that estimates to ~2100MB
    const result = checkMemoryConstraints(20, 13500, 13500);
    expect(result.allowed).toBe(false);
  });

  it('allows images just under 2000MB threshold with warning', () => {
    // Image that estimates to ~1900MB
    const result = checkMemoryConstraints(20, 12800, 12800);
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(true);
  });
});