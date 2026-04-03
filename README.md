# StravaChroma

[![CI](https://github.com/thebennies/StravaChroma/actions/workflows/ci.yml/badge.svg)](https://github.com/thebennies/StravaChroma/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Personalize your run. Turn boring Strava share images into vibrant artworks — client-side, no uploads, no watermarks.

<table>
  <tr>
    <td align="center"><img src="public/features-01-original.png" width="180" alt="Original Strava screenshot"/><br><b>Original</b></td>
    <td align="center"><img src="public/features-02-colorways.png" width="180" alt="Colorways panel"/><br><b>Colorways</b></td>
    <td align="center"><img src="public/features-03-customize.png" width="180" alt="Customize sliders"/><br><b>Customize</b></td>
    <td align="center"><img src="public/features-04-apply.jpg" width="180" alt="Final result"/><br><b>Apply</b></td>
  </tr>
</table>

## Features

- **Pixel classification** — automatically separates map, data, and label pixels using connected-component analysis and Otsu thresholding
- **Independent layer controls** — tune hue and saturation for the map, data, and label layers separately with HSL sliders
- **60+ colorways** — curated palettes grouped by running brands, sports teams, mechanical keyboards, IDE themes, luxury brands, and more; plus 12 single-layer presets
- **Live preview** — downscaled real-time preview while adjusting; full-resolution on export
- **Off-thread processing** — classification and rendering run in a Web Worker to keep the UI responsive
- **Drag-and-drop** — drop an image anywhere on the page to load it
- **Canvas pan/zoom** — mouse wheel, pinch-to-zoom, and double-click to fit
- **Session persistence** — IndexedDB saves your loaded image across page refreshes
- **Background options** — auto (checkerboard detection), dark, light, or custom image
- **High-res export** — full-resolution PNG download; Web Share API on mobile
- **No watermarks** — your images stay clean
- **Responsive layout** — desktop sidebar + mobile collapsible panels
- **100% private** — everything runs in the browser; nothing is uploaded

## Browser compatibility

| Browser | Minimum version |
|---------|----------------|
| Chrome  | 80+            |
| Firefox | 79+            |
| Safari  | 15+            |
| Edge    | 80+            |

Requires `createImageBitmap`, Web Workers, `OffscreenCanvas`, and ES2020 modules.

## Tech stack

- Vanilla JS (ES modules) — no framework, no TypeScript
- [Vite 6](https://vitejs.dev/) — bundler and dev server
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [Lucide](https://lucide.dev/) — icons
- Web Workers + OffscreenCanvas — off-thread pixel processing
- IndexedDB — session persistence
- [PostHog](https://posthog.com/) — analytics

## Getting started

```bash
# Requires Node 18+ and pnpm
pnpm install
pnpm dev       # http://localhost:5173
pnpm test      # run unit tests
pnpm build     # output to dist/
pnpm preview   # serve the production build locally
```

## How it works

1. **Load** — drop or select a Strava map screenshot (PNG with transparency), or try the built-in demo image
2. **Classify** — a Web Worker scans every pixel and assigns it to one of four categories:
   - `transparent` — ignored
   - `map` — colored background pixels (high saturation)
   - `data` — route/activity data pixels
   - `label` — near-white, low-saturation text and label pixels
3. **Render** — the worker applies HSL shifts to each layer based on the current slider values and returns pixel data
4. **Export** — re-renders at full resolution and triggers a PNG download

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and coding conventions.

## License

[MIT](LICENSE) © thebennies
