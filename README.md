# Turcanime Desktop

App de anime para escritorio — sin anuncios, sin cuentas, sin límites.

Port de la app Android [turcaman/turcanime](https://github.com/turcaman/turcanime) construido con **Electron 43** + **React 18**.

> Descarga el instalador para tu plataforma en la [página de releases](https://github.com/turcaman/turcanime-desktop/releases).

## Stack

| Capa | Tecnología |
|------|-----------|
| Shell | Electron 43 |
| UI | React 18 + TypeScript 5.5 (strict) |
| Build | Vite 5 (via `@electron-forge/plugin-vite`) |
| Estado | Zustand 5 |
| Estilos | Tailwind CSS 3 |
| Iconos | lucide-react |
| Persistencia | electron-store |
| Cifrado | @noble/ciphers (AES-GCM) |
| Empaquetado | Electron Forge |

## Requirements

- **Node.js** >= 20
- **npm** >= 9
- Sistema operativo: Windows 10+, macOS 12+, o Linux (x86_64)

## Setup

```bash
npm install
npm start              # desarrollo con recarga en caliente
npm run make           # generar instaladores
```

## Available Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar dev server (Electron + Vite HMR) |
| `npm run package` | Empaquetar app para plataforma actual |
| `npm run make` | Generar instaladores (.exe, .dmg, .deb, .rpm) |
| `npm run publish` | Publicar release |
| `npm run lint` | ESLint |

## Project Structure

```
src/
├── main.ts              → Entry point (main process)
├── preload.ts           → contextBridge (electronAPI)
├── renderer.tsx         → Entry point (renderer)
├── App.tsx              → Root + nav stack
├── types.ts             → TypeScript types
├── config/
│   └── cache.ts         → Cache TTLs, prefixes, limits
├── main/
│   ├── ipcHandlers.ts   → IPC handlers (session, store, fetch)
│   ├── logger.ts        → Main process logger
│   ├── sessionHidden.ts → Hidden window for Cloudflare bypass + cookies
│   └── sessionPreload.ts → Preload for hidden window
├── renderer/
│   ├── pages/           → Screens (Home, Detail, Player, Search, Settings)
│   ├── components/      → UI components (AnimeCard, PlayerControls, etc.)
│   ├── hooks/           → Custom hooks (useHomeScreen, useAnimeDetail, etc.)
│   ├── stores/          → Zustand stores (home, search, player, history, settings)
│   ├── services/        → HTTP, session, parsers, extractors
│   ├── config/          → Source URLs, layout constants
│   └── utils/           → Cache, storage, logger, history helpers
```

## Features

- **Home** — Animes recién agregados, "Continue Watching" desde tu historial
- **Search** — Búsqueda con sugerencias automáticas + historial de búsquedas
- **Detail** — Sinopsis, géneros, animes relacionados (precuelas/secuelas), episodios con paginación y orden ascendente/descendente
- **Player** — Reproductor nativo HTML5 con controles overlay, seek, cambio de servidores, reanudación automática, pantalla completa y atajos de teclado
- **Sin sesión** — No necesitas cuenta, el scraper maneja la autenticación del source automáticamente via hidden BrowserWindow
- **Cache inteligente** — Resultados cacheados con TTLs por tipo (home: 6h, details: 12h, stream: 5min)
- **Multiplataforma** — Windows, macOS y Linux con un solo codebase

## Deployment

Empaquetado via Electron Forge:

```bash
npm run make             # genera instaladores en out/
npm run package          # genera carpeta empaquetada en out/
```

Makers configurados:
- **Windows**: Squirrel (`.exe` installer)
- **macOS**: ZIP (`.zip`)
- **Linux**: Deb (`.deb`) + RPM (`.rpm`)

**Version bumps**: Editar `version` en `package.json`. No hay `app.json`.

## Conventions

- **Dark theme** — UI en `#0f0f11` con acento morado (`#A855F7`)
- **Español** — Todos los strings de UI en español
- **Desktop-only** — Sin soporte mobile/web
- **No tests** — Sin framework de testing configurado
- **Sin JSDocs** — Comentarios solo para workarounds no obvios
