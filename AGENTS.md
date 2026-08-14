# AGENTS.md

Instructions for AI coding agents. Complement to README.md.

> Before writing code, check the available skills and load the relevant one.

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript check |

Run both before committing.

## Project

- **Framework:** Electron 43 + React 18 + TypeScript 5.5 (strict)
- **Runtime/OS:** Node >= 20, Windows 10+ / Linux x86_64. No web or mobile.
- **Bundler:** Vite 5 (via @electron-forge/plugin-vite). No router -- manual stack in App.tsx.
- **State:** Zustand 5 with individual selectors only (`useStore(s => s.field)`).
- **Imports:** Relative from `src/`.
- **Styling:** Tailwind CSS 3 with `@tailwind` directives. No @layer, no NativeWind.
- **TypeScript:** strict, `noUnusedLocals`, `noUnusedParameters`.

## Key Files

| File | Purpose |
|------|---------|
| `src/config/source.ts` | Source config (base URL, endpoints) |
| `src/config/cache.ts` | Cache prefixes, TTLs, limits |
| `src/renderer/services/session.ts` | Session management (renderer) |
| `src/renderer/services/source.ts` | HTTP fetcher with session |
| `src/renderer/services/parsers.ts` | HTML/RSC parser |
| `src/renderer/services/extractors.ts` | Stream decryption (Byse AES-GCM) |
| `src/main/sessionHidden.ts` | Hidden window for Cloudflare + cookies |
| `src/main/sessionPreload.ts` | Hidden window preload |
| `src/main/ipcHandlers.ts` | IPC handlers |
| `src/preload.ts` | contextBridge |
| `src/types.ts` | Shared error types |
| `src/App.tsx` | Root navigation |

## Linting

Config at `.eslintrc.json`. Extends: `eslint:recommended`, `@typescript-eslint/*`, `import/*`. `import/order` enforced. Type-aware rules disabled.

## CI/CD Gotchas

- Assets located by extension (`*.exe`, `*.zip`, etc.) -- not by hardcoded path.
- `validate` runs lint + typecheck. No test step.
- `asar: true` -- no raw file access at runtime. Use `extraResource` for assets/.
- Fuses: `RunAsNode`/`NodeOptions`/`NodeCliInspect` disabled. `OnlyLoadAppFromAsar`.

## Conventions

- Dark theme only (`#0f0f11`, accent `#A855F7`). No light mode.
- UI strings in Spanish. No i18n.
- Comments only for non-obvious workarounds and race conditions.
- Stores: `{ data[], isLoading, error }` shape. AbortController per store.

## Rules

- Do not modify `src/renderer/services/source.ts` or `src/renderer/services/session.ts` without understanding the full session/cache/auth flow.
- Do not touch `src/main/sessionHidden.ts` or `src/main/sessionPreload.ts` -- they handle Cloudflare bypass.
- Do not change the crypto stack (`@noble/ciphers` AES-GCM).
- Do not add iOS or web-specific code -- desktop only (Windows/Linux).
- Do not add a test framework -- none configured and CI does not run tests.
- Do not use full store subscriptions -- always individual selectors.
