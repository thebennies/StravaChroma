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
  constants.js               # PRESETS (12), COLORWAYS (60+), classification thresholds, breakpoints
  export.js                  # PNG download helper (retry logic, Web Share API on mobile)
  error-boundary.js          # Global error handler with recovery UI overlay
  analytics.js               # PostHog integration (colorway selection, export events)
  styles.css                 # Tailwind + custom design tokens
  worker/
    processor.worker.js      # Web Worker — classify + render pixel pipeline
    utils.js                 # Pure utilities: HSL↔RGB, Otsu's threshold, downscaling
  ui/
    layout.js                # Top-level DOM scaffold (desktop sidebar / mobile tabs)
    canvas.js                # Canvas element + pan/zoom/pinch interactions
    controls.js              # HSL sliders, preset dropdowns, colorways carousel
    upload.js                # Empty-state drop zone, file validation, bitmap decode
    docs.js                  # Documentation page (Help, Troubleshooting, Changelog, About)
    toast.js                 # Toast notification system (auto-dismiss, max 3 visible)
    modal.js                 # Image lightbox for feature screenshots
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
