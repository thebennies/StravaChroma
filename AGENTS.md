# AI Agent Guidelines

Coding conventions, build commands, testing patterns, and project rules for AI agents working on the **StravaChroma** project.

---

## 1. Project Overview

**StravaChroma** is a browser-based tool for recoloring Strava activity map screenshots. It performs pixel classification and color manipulation client-side using Web Workers — no image uploads required.

### Key Technologies

- **Vanilla JavaScript** (ES2022 modules) — no TypeScript, no framework
- **Vite 6** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **Web Workers + OffscreenCanvas** — off-thread image processing
- **IndexedDB** — session persistence
- **Vitest** — unit testing

### Purpose of This Document

This guide ensures AI agents contribute code that aligns with the project's architecture, maintains consistency, and preserves the simplicity of the vanilla JS approach.

---

## 2. Coding Conventions

### Language & Style

- **Vanilla JavaScript only** — no TypeScript, no frameworks
- **ES2022 modules** (`"type": "module"` in package.json)
- Use `const` and `let` — never `var`
- Prefer arrow functions for callbacks, named functions for exports
- Always use strict equality (`===` and `!==`)
- Always use curly braces for control flow

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Files | kebab-case | `error-boundary.js`, `processor.worker.js` |
| Functions | camelCase | `setState()`, `processFile()` |
| Constants | SCREAMING_SNAKE_CASE | `PRESETS`, `ALPHA_THRESHOLD` |
| DOM refs | camelCase, descriptive | `canvasPane`, `controlsContainer` |
| State keys | camelCase | `mapHue`, `isClassifying` |

### File Organization

```
src/
  main.js                 # Entry point, routing, state wiring
  state.js                # Centralized app state (single source of truth)
  constants.js            # All constants: presets, colorways, thresholds
  export.js               # PNG download helper
  error-boundary.js       # Global error handling
  analytics.js            # PostHog event tracking
  styles.css              # Tailwind + custom design tokens
  worker/
    processor.worker.js   # Web Worker: pixel classification & rendering
    utils.js              # Pure utility functions (HSL, Otsu, etc.)
    utils.test.js         # Unit tests for utils
  ui/
    layout.js             # DOM scaffold (desktop sidebar / mobile tabs)
    canvas.js             # Canvas element + pan/zoom interactions
    controls.js           # HSL sliders, presets, colorways carousel
    upload.js             # Drop zone, file validation
    docs.js               # Documentation page
    toast.js              # Toast notifications
    modal.js              # Image lightbox
```

### Linting Rules (ESLint)

```javascript
// Key enforced rules
'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
'no-console': 'warn'      // Allowed in worker and test files
'eqeqeq': ['error', 'always']
'curly': ['error', 'all']
'no-var': 'error'
'prefer-const': 'error'
```

### Security Rules

- **Never use `innerHTML`** with dynamic or user-controlled content
- Sanitize any DOM insertion; use `textContent` or `createElement`
- Keep the Web Worker DOM-free — no `window`, `document`, or DOM APIs

### Comments

- Use `//` for single-line comments
- Use `/* */` for multi-line explanations
- Document complex algorithms (e.g., Otsu's threshold, Union-Find)
- Add section dividers in large files: `// ── Section Name ─────────`

---

## 3. Development Workflow

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (package manager enforced)

### Branch Naming

```
feat/description     # New features
fix/description      # Bug fixes
docs/description     # Documentation updates
refactor/description # Code refactoring
```

### Commit Convention (Conventional Commits)

```
feat: add new colorway group for NBA teams
fix: correct saturation calculation in HSL conversion
docs: update browser compatibility table
refactor: extract threshold logic into helper function
test: add unit tests for Otsu's method
```

---

## 4. Build & Run Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:5173)
pnpm dev

# Run unit tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build for production (outputs to dist/)
pnpm build

# Preview production build locally
pnpm preview

# Run a single test file
pnpm vitest run src/worker/utils.test.js
```

### Environment Variables

No `.env` file required. The project uses:
- Build-time constants via Vite
- Runtime configuration in `src/constants.js`
- Analytics key is hardcoded for the production domain

---

## 5. Testing Guidelines

### Framework

- **Vitest** for unit tests (Node environment)
- Tests located alongside source: `src/**/*.test.js`

### Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { hslToRgb, otsuThreshold } from './utils.js';

describe('hslToRgb', () => {
  it('converts pure red correctly', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
  });
});
```

### Testing Rules

- Test pure functions in `src/worker/utils.js`
- Do not test DOM manipulation (no browser environment)
- Do not test the Web Worker directly (test the utility functions it uses)
- Aim for high coverage on algorithmic code

---

## 6. Code Modification Rules for AI Agents

### Incremental Changes

- Make small, focused changes
- One concern per commit
- Avoid mixing feature work with refactoring

### API Compatibility

- Maintain backward compatibility
- Do not change exported function signatures without updating all callers
- If breaking changes are unavoidable, update all dependent modules

### Pattern Respect

- Follow existing code patterns before introducing new ones
- Study similar modules for conventions (e.g., how `ui/canvas.js` handles events)
- Do not refactor unrelated code while fixing a bug

### State Management

- All mutable app state belongs in `src/state.js`
- Use `setState(patch)` for mutations (shallow merge)
- Use `subscribe(fn)` to react to state changes
- Local ephemeral UI state (hover, open/closed) can stay in UI modules

### Worker Constraints

- Keep `src/worker/processor.worker.js` DOM-free
- Worker communicates via `postMessage` only
- Transfer buffers, don't copy: `postMessage(data, [buffer])`
- Handle stale responses using `requestId` checks

---

## 7. File Editing Rules

### When to Create New Files

- New feature with distinct responsibilities (e.g., new UI component)
- Utility functions that can be unit-tested independently
- New colorway groups (add to `src/constants.js`)

### When to Edit Existing Files

- Bug fixes in existing functionality
- Adding a single new colorway (extend existing array)
- Extending existing UI behavior

### DRY Principles

- Extract reusable logic into `src/worker/utils.js`
- Share constants from `src/constants.js`
- Avoid duplicating DOM manipulation patterns

### Module Focus

- Each module should have a single responsibility
- UI modules export builder functions that return refs/controls
- Worker utilities are pure functions with no side effects

---

## 8. Dependencies & Libraries

### Adding Dependencies

**Acceptable reasons:**
- Well-maintained utility library for complex calculations
- Additional icon sets (Lucide is already used)
- Analytics or monitoring tools

**Requirements:**
- Must be compatible with ES modules
- Must not require bundler plugins beyond Vite
- Prefer libraries with small bundle size
- Check browser compatibility (Chrome 80+, Firefox 79+, Safari 15+)

**Avoid:**
- Frameworks (React, Vue, Angular, Svelte)
- TypeScript
- jQuery or similar DOM utilities
- Heavy image processing libraries (we use native Canvas APIs)

### Current Dependencies

```json
"dependencies": {
  "@fontsource-variable/inter": "^5.2.8",
  "lucide": "^1.7.0",
  "posthog-js": "^1.367.0"
}
```

---

## 9. Documentation Expectations

### README Updates

Update `README.md` when:
- Adding major features
- Changing browser requirements
- Modifying the installation process
- Updating browser compatibility

### Inline Documentation

- Document complex algorithms with multi-line comments
- Explain non-obvious thresholds and magic numbers
- Add JSDoc for exported functions with non-trivial signatures

```javascript
/**
 * Apply Otsu's method to find the optimal threshold for separating
 * foreground from background in a histogram.
 * @param {Uint32Array} histogram - 256-bin grayscale histogram
 * @returns {number} Optimal threshold (0-255)
 */
export function otsuThreshold(histogram) { ... }
```

### AGENTS.md Maintenance

Update this file when:
- Build commands change
- Project structure changes significantly
- New coding conventions are established
- Dependencies or requirements change

---

## 10. Safety & Constraints

### Secrets & API Keys

- Never commit API keys, tokens, or secrets
- PostHog key is already public-facing for analytics
- No backend services require authentication

### Destructive Operations

- Do not delete files in `src/` without confirming they're unused
- Do not modify `dist/` directly (it's a build output)
- Do not delete or reset IndexedDB stores without migration path

### Database/Schema Changes

- IndexedDB schema changes require version bump in `openDB()`
- Provide backward compatibility for existing user data
- Test migration paths for IDB upgrades

### Browser APIs

- Verify browser support before using new APIs
- Maintain compatibility with Chrome 80+, Firefox 79+, Safari 15+
- Use feature detection, not user agent sniffing

---

## Quick Reference

```bash
# Standard workflow
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # verify before committing
pnpm build        # verify build succeeds

# Adding a colorway
# 1. Edit src/constants.js
# 2. Add to appropriate COLORWAYS group
# 3. Test in UI

# Adding a UI feature
# 1. Create/edit file in src/ui/
# 2. Export builder function
# 3. Import and use in src/main.js
# 4. Run pnpm test
```

---

*Last updated: Generated for StravaChroma v1.0.0*
