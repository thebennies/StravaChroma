# Changelog

All notable changes to StravaChroma are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.1.0] — 2026-04-10

### Added
- Client-side routing (`/` landing, `/editor` app, `/docs` help, `/404` fallback) with history API
- IndexedDB session persistence — editor state survives page refresh
- `beforeunload` guard — warns before accidental tab close with loaded image
- Reset button (ListRestart icon) beside Shuffle button to restore default colours
- Lucide icons for Shuffle and Reset buttons
- Skeleton loading animation in canvas classify overlay
- Self-hosted Inter variable font via `@fontsource-variable/inter` (no Google Fonts request)
- GitHub Pages SPA routing via `public/404.html` redirect trick
- `public/robots.txt` and `public/sitemap.xml`
- Full SEO meta tags: Open Graph, Twitter Card, canonical URL, theme-color
- Content Security Policy `<meta>` tag
- Accessibility: slider `aria-label`, `aria-valuemin/max/now/valuetext`, live value region
- Accessibility: toast `role="alert"/"status"` and `aria-live`
- Global error boundary (`src/error-boundary.js`) with recovery UI overlay
- Resilient worker with auto-restart (up to 2 retries on crash)
- Export retry logic with exponential backoff and 60s timeout
- PostHog analytics integration (`src/analytics.js`) — tracks colorway selection and exports
- `src/ui/docs.js` — in-app documentation page with Help, Troubleshooting, Changelog, and About sections
- `src/ui/modal.js` — image lightbox for the feature showcase grid
- `src/worker/utils.js` — pure utility functions (HSL↔RGB, Otsu's threshold, downscaling); JSDoc on all public functions
- ESLint config (`eslint.config.js`)
- Dependabot weekly dependency updates (`.github/dependabot.yml`)
- GitHub issue templates (bug report, feature request) and PR template
- Feature showcase grid on landing page (Original / Colorways / Customize / Apply)
- "Hide Gibberish" / "Show Gibberish" simple mode toggle on landing page
- Demo image button with `demo.png`
- 60+ curated colorways grouped by: Running brands, Mono, Mechanical Keyboards, EPL, NBA, Luxury, Sneakers, IDE themes

### Changed
- "Default Strava" colour preset renamed to "Strava Orange"
- "Randomize All" button renamed to "Shuffle"
- Upload prompt text changed to "Drag and drop your Strava share image"
- Tagline changed to "Personalize your run. Turn boring Strava share image into vibrant artworks."
- "Chroma" in all title instances uses orange→purple gradient matching favicon
- Pulse/heartbeat logo replaced with `favicon.png` image
- Save Image button uses favicon gradient (orange → magenta → purple)
- App header logo and mobile top bar use `favicon.png`
- CI badge URL corrected to `thebennies/StravaChroma`

---

## [1.0.0] — 2026-03-19

### Added
- Initial release
- Client-side PNG recolouring via Web Worker (classify + render pipeline)
- Map / Data / Label layer controls with hue and saturation sliders
- 12 colour presets with prev/next navigation
- Drag-and-drop and click-to-upload PNG support
- Full-resolution PNG export
- Mobile-responsive layout (sidebar on desktop, collapsible panel on mobile)
- Canvas pan and zoom (mouse wheel, pinch-to-zoom)
- Checkerboard background for transparency preview
- Toast notification system
