# Turcanime Desktop

Aplicacion de escritorio para ver anime. Port de turcaman/turcanime para Windows y Linux.

## Stack

Electron 43 · React 18 · TypeScript 5.5 (strict) · Vite 5 · Zustand 5 · Tailwind CSS 3 · lucide-react · electron-store · @noble/ciphers

## Setup

```bash
npm install
npm start              # servidor de desarrollo con HMR (Electron + Vite)
npm run make           # genera instaladores para la plataforma actual
```

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Servidor de desarrollo con HMR |
| `npm run package` | Empaqueta la app para la plataforma actual |
| `npm run make` | Genera instaladores (.exe, .zip, .deb, .rpm) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificacion de tipos |

## Estructura

```
src/
  main.ts              Punto de entrada (proceso principal)
  preload.ts           contextBridge (electronAPI)
  renderer.tsx         Punto de entrada (renderer)
  App.tsx              Navegacion (stack manual, sin router)
  types.ts             Tipos compartidos
  config/
    cache.ts           TTLs, prefijos y limites de cache
  main/
    ipcHandlers.ts     Manejadores IPC (sesion, store, fetch)
    logger.ts          Logger del proceso principal
    sessionHidden.ts   Ventana oculta para Cloudflare + cookies
    sessionPreload.ts  Preload de la ventana oculta
  renderer/
    pages/             Pantallas (Home, Detail, Player, Search, Settings)
    components/        Componentes UI (AnimeCard, PlayerControls, etc.)
    hooks/             Hooks personalizados (useHomeScreen, useAnimeDetail, etc.)
    stores/            Stores Zustand (home, search, player, history, settings)
    services/          HTTP, sesion, parsers, extractors
    config/            URLs de fuente, constantes de layout
    utils/             Cache, storage, logger, helpers de historial
```

## Convenciones

- Tema oscuro (#0f0f11) con acento purpura (#A855F7). Sin modo claro.
- Interfaz en espanol. Sin internacionalizacion.
- Sin framework de tests -- no hay script npm test.
- Comentarios minimos: solo para workarounds no obvios y condiciones de carrera.
