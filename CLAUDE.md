# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server at http://localhost:5173
pnpm test         # run all Vitest unit tests (Node env)
pnpm build        # production build → dist/
pnpm preview      # serve production build locally
```

Run a single test file:
```bash
pnpm vitest run src/worker/utils.test.js
```

## Architecture

### State management

`src/state.js` holds the single `appState` object. All mutations go through `setState(patch)`, which shallow-merges and notifies all subscribers. UI modules call `subscribe(fn)` to react to state changes. Local ephemeral UI state (e.g. hover, open/closed) can live in the UI module itself; it must not be in `appState`.

### Router

`src/main.js` is the entry point and acts as the router. It manages three views (`landing` → `/`, `editor` → `/editor`, `docs` → `/docs`, plus `404`) using the History API. On each navigation, `setupXxx()` tears down the previous view and rebuilds the DOM from scratch. The `BASE` variable (`/StravaChroma/` in prod, `/` in dev) must be stripped before matching paths.

### Worker pipeline

All pixel work runs in `src/worker/processor.worker.js` off the main thread:

1. **classify** message: receives source `Uint8ClampedArray` as a transferable buffer, returns a `Uint8Array` mask (one byte per pixel: `0`=transparent, `1`=map, `2`=data, `3`=label).
2. **render** message: receives source pixels + mask + HSL sliders, returns a new `Uint8ClampedArray`. When `downscale: true` the output is 50% resolution (live preview); `downscale: false` is full-res (export).

Buffers are always transferred (not copied) via the second argument of `postMessage`. Every message carries a `requestId`; stale responses (superseded by a newer request) are silently dropped in `handleWorkerMessage`. The worker restarts up to `MAX_WORKER_RESTARTS` (2) times on crash and re-queues the pending classification.

### Classification algorithm (processor.worker.js)

Pixels are classified in two passes:
- **Pass 1** — saturation threshold splits pixels into `MASK_MAP` (high sat) vs `MASK_PENDING` (low sat, visible). Transparent pixels (alpha ≤ `ALPHA_THRESHOLD`) are skipped.
- **Pass 2** — connected-component analysis (Union-Find with path compression) on pending pixels. Components are merged by proximity, then Otsu's method on component heights separates tall `MASK_DATA` (route) from short `MASK_LABEL` (text) components.

### UI modules

| File | Role |
|---|---|
| `ui/layout.js` | Builds the top-level DOM scaffold; returns refs to `canvasPane`, `controlsContainer`, `actions`. Adapts between desktop (sidebar) and mobile (tab panels) at the 800 px breakpoint. |
| `ui/canvas.js` | Manages the `<canvas>`, pan/zoom (wheel, pinch, double-click-to-fit), checkerboard background, classify overlay, and render spinner. |
| `ui/controls.js` | HSL sliders per layer, preset dropdowns, colorways carousel, background picker. Returns updater functions (`updateMapControls`, etc.) used by the state subscriber in `main.js`. |
| `ui/upload.js` | Drop zone, file validation, `createImageBitmap` decode, drag highlighting. |
| `ui/toast.js` | Auto-dismiss toasts, max 3 visible at once. |

### Session persistence

On image load, the raw `Uint8ClampedArray` is stored in IndexedDB (`stravachroma` DB, `session` store, key `source-image`). On a hard refresh at `/editor`, `main.js` restores from IDB and re-runs classification before rendering.

### Export

`src/export.js` re-renders at full resolution (sends `downscale: false` to the worker), then draws to an offscreen `<canvas>` and calls `canvas.toBlob` to produce a PNG. On mobile it attempts the Web Share API before falling back to a download link.

## Coding conventions

- Vanilla JS, ES modules — no TypeScript, no framework
- No `innerHTML` with dynamic or user-controlled content
- The worker must remain DOM-free; all DOM updates happen on the main thread
- New colorways go in `src/constants.js` in the `COLORWAYS` array under the appropriate group
- Unit-testable pure functions live in `src/worker/utils.js` (no DOM APIs, safe to import in Node/Vitest)
