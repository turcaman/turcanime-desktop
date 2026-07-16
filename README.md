# Turcanime Desktop

**Anime streaming app for desktop** — no ads, no accounts, no limits.

Port of the Android app [turcaman/turcanime](https://github.com/turcaman/turcanime) built with **Electron 43** + **React 18**.

> Download the latest installer for your platform from the [releases page](https://github.com/turcaman/turcanime-desktop/releases).

## Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 43 |
| UI | React 18 + TypeScript 5.5 (strict) |
| Build | Vite 5 (via `@electron-forge/plugin-vite`) |
| State | Zustand 5 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Persistence | electron-store |
| Crypto | @noble/ciphers (AES-GCM) |
| Packaging | Electron Forge |

## Requirements

- **Node.js** >= 20
- **npm** >= 9
- **OS**: Windows 10+, macOS 12+, or Linux (x86_64)

## Setup

```bash
npm install
npm start              # dev server with hot reload (Electron + Vite HMR)
npm run make           # build installers for the current platform
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (Electron + Vite HMR) |
| `npm run package` | Package the app for the current platform |
| `npm run make` | Generate installers (.exe, .zip, .deb, .rpm) |
| `npm run publish` | Publish a release |
| `npm run lint` | ESLint |

## Features

- **Home** — Recently added anime + "Continue Watching" from your history
- **Search** — Search with autocomplete suggestions + search history
- **Detail** — Synopsis, genres, related anime (prequel/sequel), episode list with range pagination and asc/desc order
- **Player** — Native HTML5 video with overlay controls, seek, server switching, auto-resume, fullscreen (F / Esc) and keyboard shortcuts
- **No login** — No account needed; the scraper handles source authentication automatically via a hidden BrowserWindow
- **Smart cache** — Cached results with per-type TTLs (home: 6h, details: 12h, stream: 5min)
- **Cross-platform** — Windows, macOS and Linux from a single codebase

## Project Structure

```
src/
  main.ts                 → Entry point (main process)
  preload.ts              → contextBridge (electronAPI)
  renderer.tsx            → Entry point (renderer) → App.tsx
  types.ts                → TypeScript types
  config/
    cache.ts              → Cache TTLs, prefixes, limits
  main/
    ipcHandlers.ts        → IPC handlers (session, store, fetch)
    logger.ts             → Main process logger
    sessionHidden.ts      → Hidden window for Cloudflare bypass + cookies
    sessionPreload.ts     → Preload for hidden window
  renderer/
    pages/                → Screens (Home, Detail, Player, Search, Settings)
    components/           → UI components (AnimeCard, PlayerControls, etc.)
    hooks/                → Custom hooks (useHomeScreen, useAnimeDetail, etc.)
    stores/               → Zustand stores (home, search, player, history, settings)
    services/             → HTTP, session, parsers, extractors
    config/               → Source URLs, layout constants
    utils/                → Cache, storage, logger, history helpers
```

## Deployment

Packaging via Electron Forge:

```bash
npm run make             # generates installers in out/
npm run package          # generates packaged folder in out/
```

Makers configured:

- **Windows**: Squirrel (`.exe` installer)
- **macOS**: ZIP (`.zip`)
- **Linux**: Deb (`.deb`) + RPM (`.rpm`)

**Version bumps**: Edit `version` in `package.json`. There is no `app.json`.

CI/CD via GitHub Actions:

1. `validate` — ESLint + TypeScript check
2. `build` — Package per platform
3. `release` — Draft GitHub Release, locating assets by extension (not by hardcoded path)

## Conventions

- **Dark theme** — UI in `#0f0f11` with purple accent (`#A855F7`)
- **Spanish UI** — All user-facing strings in Spanish
- **Desktop-only** — No mobile/web support
- **No tests** — No test framework configured
- **Minimal comments** — Only for non-obvious workarounds and race conditions
