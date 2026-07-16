# AGENTS.md — Turcanime Desktop

Instructions for AI coding agents working on this project. Complement to README.md — read that first for project overview.

## Quick Commands

```bash
npm start             # Start dev server (Electron + Vite HMR)
npm run package       # Package for current platform
npm run make          # Generate installers (.exe, .zip, .deb, .rpm)
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
```

No test framework configured — no `test` script.

## Project Overview

Electron 43 + React 18 + TypeScript 5.5 app. Cross-platform (Windows, macOS, Linux).

- **Version**: `package.json` only (no `app.json`). Current: 1.0.6.
- **Entry (main)**: `src/main.ts`.
- **Entry (renderer)**: `src/renderer.tsx` → `src/App.tsx`.
- **Navigation**: manual stack in `App.tsx` (`navStack: NavEntry[]`). No router.
- **Screens**: `'home' | 'search' | 'detail' | 'player' | 'settings'`.
- **State**: Zustand stores in `src/renderer/stores/`. Use **individual selectors** (`useStore(s => s.field)`) — never full store subscription.
- **Imports**: relative from `src/`.
- **Styling**: Tailwind CSS v3. Entry: `src/index.css` with `@tailwind` directives (no `@layer` wrappers, no NativeWind).
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`.

## Key Files Reference

| Purpose | File |
|---------|------|
| Source config (base URL, endpoints) | `src/renderer/config/source.ts` |
| Cache prefixes & TTLs | `src/config/cache.ts` |
| Session management (renderer side) | `src/renderer/services/session.ts` |
| HTTP fetcher with session | `src/renderer/services/source.ts` |
| HTML/RSC parser | `src/renderer/services/parsers.ts` |
| Stream decryption (Byse AES-GCM) | `src/renderer/services/extractors.ts` |
| Hidden window (Cloudflare + cookies) | `src/main/sessionHidden.ts` |
| Hidden window preload | `src/main/sessionPreload.ts` |
| IPC handlers | `src/main/ipcHandlers.ts` |
| contextBridge preload | `src/preload.ts` |
| Main process logger | `src/main/logger.ts` |
| Cache utility | `src/renderer/utils/cache.ts` |
| Renderer logger | `src/renderer/utils/logger.ts` |
| Error types | `src/types.ts` |
| Root navigation | `src/App.tsx` |

## Architecture

### Source & Streaming

- **Source:** `src/renderer/config/source.ts` — scraper configuration. TMDB images for posters.
- **Stream:** HTTP fetch via `fetchWithSession()` in `src/renderer/services/source.ts`. No WebView for streaming.
  - Bridge page fetched → iframe URL extracted → `extractBest()` decrypts Byse payload via `@noble/ciphers` AES-GCM.
  - `gcm()` from `@noble/ciphers/aes.js`, key assembled from `key_parts` using version-based index selection (`selectIndexes()`).
  - `parseMaster()` resolves HLS master playlist → `bestStream()` selects highest resolution.
- **Hidden BrowserWindow (`src/main/sessionHidden.ts`):** only for session init + refresh (Cloudflare bypass, cookie acquisition).
- **Video:** native HTML5 `<video>` element. Custom overlay controls with `PlayerControls.tsx`. No expo-video or WebView.

### Session Management (`src/renderer/services/session.ts` + `src/main/sessionHidden.ts`)

- `sessionManager` object with `sessionReadyPromise` for synchronization.
- `initialize()`: checks existing session via `electronAPI.session.get()`.
- `waitForCookies()`: 60s timeout, races against `sessionReadyPromise`.
- `refreshSession()`: calls `electronAPI.session.refresh()` → hidden window navigates → cookies extracted → `readyResolve()`.
- In main process (`src/main/sessionHidden.ts`):
  - `refreshSession()`: navigates to wash URL, waits 3s, injects JS polling (`getCookie()`), waits up to 7s for cookies.
  - Cookies received via `ipcRenderer.on('session-from-hidden', ...)` in `ipcHandlers.ts`.
  - `fetchInPage()`: runs `fetch()` via `webContents.executeJavaScript()` inside the hidden window, using its real session cookies and headers.
- `fetchWithSession` in `src/renderer/services/source.ts`:
  - Waits for cookies via `sessionManager.waitForCookies()`.
  - Attaches browser-like headers.
  - Supports retry: 1 retry with 1s delay for non-401/403 HTTP errors and network errors.
  - Auth errors (401/403): throws `error.type = "AUTH_ERROR"`.

### Cache (`src/renderer/utils/cache.ts` + `src/config/cache.ts`)

- `withCache()` utility: returns cached value if available and not expired.
- **Stale threshold:** 30% of TTL — when remaining TTL falls below 30%, the entry is considered stale and a fresh fetch is performed (the stale entry is discarded).
- **Max entry size:** 1MB (`LIMITS.CACHE_MAX_ENTRY_SIZE`). Larger entries are logged and skipped.
- **Prefix-based TTLs:**

| Prefix (CACHE_PREFIXES) | Cache key pattern | TTL  |
|-------------------------|-------------------|------|
| `HOME = 'ch_home'`      | `ch_home`         | 6h   |
| `SEARCH = 'search'`     | `search_{query}`  | 30m  |
| `SUGGESTIONS = 'suggestions'` | `suggestions_{query}` | 5m |
| `ANIME = 'anime'`       | `anime_{slug}`    | 12h  |
| `SERVERS = 'servers'`   | `servers_{slug}_{num}` | 10m |
| `STREAM = 'stream'`     | `stream_{serverId}` | 5m  |

- **Cache invalidation:** `clearAllCache()` deletes all keys matching known prefixes. Called from `SettingsPage` on "Actualizar datos".
- Servers and stream use manual cache (direct `electronAPI.store` get/set), not `withCache()`.

### Parser (`src/renderer/services/parsers.ts`)

- `HtmlParser` class with multiple extraction strategies (fallback chain per method).
- **Episode extraction:** RSC payload → script JSON → HTML regex fallback.
- **Detail extraction:** scripts (RSC) → jsonLd → DOM → meta tags.
- RSC (React Server Components) payload parsing via `self.__next_f.push` script detection.
- `parseEpisodeServers()`: extracts players from RSC payload, filters "Delta" servers as preferred.
- `extractRelations()`: parses `relations` object (prequel, sequel, related) from RSC payload.

## Auth Error Auto-Retry Pattern

Used across all data stores when `AUTH_ERROR` (session expired) is detected:

```typescript
// homeStore.ts — recursive retry with exponential backoff
const result = await withCache(...);
const isAuth = result.error?.type === 'AUTH_ERROR';
if (isAuth && retryCount < 3) {
  const backoff = Math.min(1000 * Math.pow(2, retryCount), 8000);
  await sessionManager.refreshSession();
  await new Promise(r => setTimeout(r, backoff));
  return get().fetchHome(true, retryCount + 1);
}
```

- `homeStore`: up to 2 retries (auth), up to 1 retry (other), backoff 1s→2s→4s, `force: true` on retry.
- `detailsStore`: up to 2 retries (auth), up to 1 retry (other), same backoff.
- `playerStore.fetchServers`: up to 2 retries (auth), up to 1 retry (other).
- `playerStore.resolveStream`: up to 2 retries (auth), up to 1 retry (other).
- `searchStore.fetchSearch`: up to 2 retries (auth), up to 1 retry (other).

## Session Refresh Flow (`src/App.tsx` + Settings)

Triggers: app startup (automatic in `useEffect` of `App.tsx`), manual "Actualizar datos" in Settings.

Flow:
1. `clearAllCache()` — clears all cache.
2. `sessionManager.refreshSession()` — hidden window navigates, acquires fresh cookies.
3. Refresh data (fetchHome with `force: true`).

## Screen & Hook Architecture

### Screen Layer (`src/renderer/pages/`)

| File                        | Hook                   | Store(s)                            |
|-----------------------------|------------------------|-------------------------------------|
| `HomePage.tsx`              | `useHomeScreen`        | homeStore, historyStore             |
| `SearchPage.tsx`            | `useSearchScreen`      | searchStore, searchHistoryStore     |
| `DetailPage.tsx`            | `useAnimeDetail`       | detailsStore, playerStore, settingsStore |
| `PlayerPage.tsx`            | `usePlayer`            | playerStore, historyStore, detailsStore |
| `SettingsPage.tsx`          | (direct store access)  | uiStore                             |

### Hook Composition Pattern

```
useAnimeDetail(slug)           // orchestrator hook
  ├── useDetailsStore.fetchDetails()  → fetch anime data
  ├── useSettingsStore.episodeOrder   → sort direction
  ├── useState for selectedEpisode, expanded, activeRangeIdx
  ├── useMemo for sortedEpisodes, ranges, visibleEpisodes
  └── useEffect to persist range index

usePlayer(slug, episodeNumber, anime, videoRef)
  ├── usePlayerStore → streamUrl, isLoading, error
  ├── useHistoryStore → addToHistory, lastViewed
  ├── useState for playing, currentTime, duration, offline
  ├── useRef for progressTimer, lastSavedEp
  └── useEffect for: stream src, progress interval, keyboard, online/offline
```

### Custom Screen Hook Pattern

- Each screen has a dedicated `use<Name>()` hook.
- Selects individual fields from multiple stores via individual selectors.
- Composes UI state (loading, error, content) into a single return value.
- Computes derived data via `useMemo`.

## Store Patterns (Zustand)

- **Individual selectors:** `useStore((s) => s.field)` — never `useStore()` with whole state.
- **AbortController per store:** `homeController`, `detailsController`, `searchController`, `suggestionsController` — cancelled on new fetch or reset.
- **State fields follow:** `{ data[], isLoading, error }` shape.
- **Optimistic rollback:** history stores capture `previous` state before mutation, revert on persistence failure.
- **Auth error recovery:** detect `error.type === "AUTH_ERROR"` → `refreshSession()` → retry operation.
- **Cache:** `withCache()` for cached fetches, manual cache key construction for `servers_`/`stream_` prefixes.

## Loading States & Transitions

- **Home/Detail/Search**: Skeleton while loading, content when ready, ErrorState on error.
- Pattern:
  ```
  isLoading && !hasContent && !error → Skeleton
  hasContent && !error               → Content
  !hasContent && error               → ErrorState
  ```
- Skeleton fidelity: Read the real component first, mirror structure exactly. No invented layout elements.
- Transitions: Native CSS transitions (Tailwind `transition-all`, `transition-colors`, `transition-transform`). No react-native-reanimated.
- Search: simple fade-in (no skeleton overlay, content replaces directly).

## Player Architecture (`PlayerPage.tsx` + `usePlayer.ts`)

- **Video:** native HTML5 `<video>` element — `videoRef` in `useRef`.
- **Stream switching:** `video.src = streamUrl; video.load();`. Cancel flag guards seek/play after unmount.
- **Progress save:** 250ms interval via `setInterval` + save on unmount via `useEffect` cleanup. Seek resume if progress has value.
- **Network-aware:** `online`/`offline` event listeners → pause on disconnect, resume on reconnect.
- **Episode navigation:** `navigatePrev()` / `navigateNext()` — saves current progress before switching.
- **Keyboard shortcuts:** Space (play/pause), ArrowLeft (seek back 10s), ArrowRight (seek forward 10s), F (fullscreen), Esc (exit fullscreen).
- **Auto-hide controls:** `useAutoHide` hook — 3s of inactivity hides controls overlay.
- **Fullscreen API:** `containerRef.requestFullscreen()` / `document.exitFullscreen()`. Cursor hidden via `cursor: none` in fullscreen.

## Component Patterns

- All functional components with typed `React.FC`.
- No ErrorBoundary wrapper.
- No React.memo on screens (stack-based navigation already prevents unnecessary re-renders).
- Navbar: buttons with active state (conditional classes `bg-purple-500/10`).
- `AnimeCard`: reusable base component with hover scale, gradient overlay, episode badge.
- `ContinueWatching`: horizontal scroll with progress bar.
- ui/ components: `Skeleton`, `ErrorState`, `SectionTitle`, `ImageWithLoader`.
- Color scheme: `bg-[#0f0f11]` backgrounds, `bg-neutral-800/900` elevated surfaces, `border-neutral-800/40` borders. Purple accent (`purple-400/500`) for interactive elements.

## Navigation (`src/App.tsx`)

- `navStack` array of `NavEntry[]` — no router, no expo-router.
- `push(screen, slug?, episodeNumber?)` → appends to stack.
- `goBack()` → pops stack (if more than 1 entry).
- `replaceCurrentDetail(slug)` → replaces the last detail screen in-place (for related anime).
- `updatePlayerEpisode(number)` → updates episodeNumber on the current player screen.
- No stack animation — instant switch (desktop app, no screen transitions).

## IPC Layer (`src/main/ipcHandlers.ts` + `src/preload.ts`)

`contextBridge.exposeInMainWorld('electronAPI', ...)` exposes:

- `session.get()` / `session.refresh()` → invokes handlers in main process.
- `store.get(key)` / `store.set(key, value)` / `store.delete(key)` / `store.clear()` → `electron-store`.
- `fetch(url, options)` → hidden session `fetchInPage()` (with real cookies).
- `bridgeFetch(url, headers)` → `net.fetch()` directly for bridge pages.
- `proxyFetch(url, opts)` → `net.fetch()` with options for extraction API.

## Logger (`src/renderer/utils/logger.ts` + `src/main/logger.ts`)

Two separate loggers: one in main process, one in renderer.

- Renderer logger: leveled logging (DEBUG/INFO/WARN/ERROR) with optional persistence to `electron-store`.
- Main logger: writes via `electron-store`.
- Usage: `logger.info(tag, msg)`, `logger.warn(tag, msg, error)`, `logger.error(tag, msg, error)`.

## ESLint

Config at `.eslintrc.json` (no flat config). Extends:

- `eslint:recommended`
- `plugin:@typescript-eslint/eslint-recommended`
- `plugin:@typescript-eslint/recommended`
- `plugin:import/recommended`
- `plugin:import/electron`
- `plugin:import/typescript`

Parser: `@typescript-eslint/parser`. No type-aware rules (no `no-floating-promises`, etc.). `import/order` is enforced via `plugin:import/recommended`.

## Workflows

### Add a new store
1. Create file in `src/renderer/stores/` following the pattern: Zustand `create()` with `{ data[], isLoading, error }` shape.
2. If the store fetches data, add an AbortController variable at module level (cancelled on new fetch or reset).
3. Export `use<Name>Store` with individual selectors.
4. If it needs initialization from storage, add it to the init block in `App.tsx`.

### Add a new cache prefix
1. Add entry to `CACHE_PREFIXES` and `CACHE_TTL` in `src/config/cache.ts`.
2. Add the prefix to the cache-clearing filter in `SettingsPage` / `clearAllCache()`.

### Bump version
1. Edit `version` in `package.json`.
2. Do NOT edit `app.json` — there is none.
3. Do NOT edit generated `out/` artifacts.

### Add a new screen
1. Create file in `src/renderer/pages/` following the existing pattern (`HomePage`, `DetailPage`, etc.).
2. Create a `use<Screen>()` hook in `src/renderer/hooks/`.
3. Register the screen in the `navStack` / `NavEntry` type in `App.tsx` if it is a new route.
4. Add skeleton + ErrorState if it is a data-loading screen.

## CI/CD — Critical Gotchas

- Release assets are located **by extension** (`*.exe`, `*.zip`, `*.deb`, `*.rpm`), not by hardcoded `out/make` path.
- `validate` job runs `npm run lint` + `npx tsc --noEmit` before building.
- Fuses enabled: cookie encryption, ASAR integrity, `RunAsNode`/`NodeOptions`/`NodeCliInspect` disabled, `OnlyLoadAppFromAsar`.
- `asar: true` in `packagerConfig` — do not assume raw file access at runtime; use `extraResource` for `assets/`.
- No test framework — CI does not run tests.

## Conventions

- **Dark theme only.** Background `#0f0f11`, accent purple `#A855F7`.
- **Directory layout:** `src/{main,renderer}/` → `pages/`, `components/`, `hooks/`, `stores/`, `services/`, `config/`, `utils/`. Types in `src/types.ts`.
- **Skeleton components:** `src/renderer/components/skeletons/` — one per screen.
- **Base skeleton:** `src/renderer/components/ui/Skeleton.tsx` — CSS `animate-pulse` (native Tailwind).
- **Logger:** `src/renderer/utils/logger.ts` — leveled logging with optional persistence.
- **AppError:** type `{ type: AppErrorType, message: string }` in `src/types.ts`.
- **Comments:** No section headers, no "what" comments, no JSDocs on self-explanatory code. Allowed: `// why` for workarounds, race conditions, platform bugs.
- **i18n:** Spanish UI strings throughout ("Inicio", "Buscar", "Ajustes", "Episodio", "Reintentar", "Error al cargar", etc.).

## 🚫 Rules — What NOT to Do

- Do NOT modify `src/renderer/services/source.ts` or `src/renderer/services/session.ts` without understanding the full session/cache/auth flow.
- Do NOT touch `src/main/sessionHidden.ts` or `src/main/sessionPreload.ts` — they handle Cloudflare bypass and cookie acquisition.
- Do NOT change the crypto stack (`@noble/ciphers` AES-GCM) or the Byse key assembly without understanding `selectIndexes()`.
- Do NOT add iOS or web-specific code — this is desktop-only (Windows/macOS/Linux).
- Do NOT add a test framework — there is none configured and CI does not run tests.
- Do NOT use full store subscriptions (`useStore()` without selector) — always use individual selectors.
- Do NOT add JSDoc or comments to self-explanatory code.
- Do NOT change the color scheme (dark theme, purple accent) without explicit request.
- Do NOT add new dependencies without checking if the existing stack (React, Zustand, Tailwind, lucide-react, electron-store, @noble/ciphers) already covers the need.
- Do NOT edit generated `out/` or `node_modules/` — they are build artifacts.
