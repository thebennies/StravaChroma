# Contributing to StravaChroma

Thanks for your interest in contributing!

## Development setup

```bash
# Requires Node 18+ and pnpm
pnpm install
pnpm dev       # http://localhost:5173
pnpm test      # run unit tests (Vitest)
pnpm build     # production build → dist/
pnpm preview   # serve production build locally
```

## Project structure

```
src/
  main.js                    # Entry point — routing, state wiring, worker setup, event handlers
  state.js                   # Centralised app state (appState, setState, subscribe)
  constants.js               # PRESETS, COLORWAYS (500+), classification thresholds, breakpoints
  export.js                  # PNG download helper (retry logic, Web Share API on mobile)
  error-boundary.js          # Global error handler with recovery UI overlay
  analytics.js               # PostHog integration (colorway selection, export events)
  version.js                 # Build-time version injection
  styles.css                 # Tailwind + custom design tokens
  worker/
    processor.worker.js      # Web Worker — classify + render pixel pipeline
    classification.js        # Pixel classification algorithms (Otsu, Union-Find)
    rendering.js             # Render pipeline and HSL shifts
    gradient.js              # Gradient overlay effects
    union-find.js            # Union-Find data structure
    message-validation.js    # Worker message validation
    utils.js                 # Pure utilities: HSL↔RGB, Otsu's threshold, downscaling
  ui/
    layout.js                # Top-level DOM scaffold (desktop sidebar / mobile tabs)
    canvas.js                # Canvas element + pan/zoom/pinch interactions
    controls.js              # Controls composer — routes between desktop sidebar and mobile tabs
    slider-controls.js       # HSL sliders and preset dropdowns per layer
    colorway-ui.js           # Colorways carousel, search, favorites, group filtering
    actions-panel.js         # Shuffle, cycle, reset, undo/redo, background, effects
    export-controls.js       # Desktop export button
    mobile-tabs.js           # Mobile tab bar and panel switching
    upload.js                # Empty-state drop zone, file validation, bitmap decode
    docs.js                  # Documentation page (Help, Troubleshooting, Changelog, About)
    toast.js                 # Toast notification system (auto-dismiss, max 3 visible)
    modal.js                 # Image lightbox for feature screenshots
    modal-manager.js         # Modal stacking manager
    save-custom-modal.js     # Save custom colorway modal
    controls-utils.js        # Shared UI constants and class helpers
    history.js               # Undo/redo color state history
```

## Coding conventions

- Vanilla JS, ES modules — no TypeScript, no framework
- All mutable app state lives in `src/state.js`; local UI state is fine in UI modules
- No `innerHTML` with dynamic or user-controlled content (XSS risk)
- Keep the worker free of DOM access; communicate via `postMessage`
- Workers communicate results back as structured data; the main thread handles all DOM updates
- New colorways go in `src/constants.js` in the appropriate group inside the `COLORWAYS` array

## Submitting changes

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes and verify `pnpm test` and `pnpm build` both pass
3. Open a pull request with a clear description of what and why

## Reporting bugs

Open an issue and include:
- Browser and OS version
- Steps to reproduce
- A sample image if the bug is image-specific (any small PNG works)
- Console errors if applicable
