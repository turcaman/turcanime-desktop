# AGENTS.md — Turcanime Desktop

## Quick Commands

```bash
npm start             # Start dev server (Electron + Vite HMR)
npm run package       # Package for current platform
npm run make          # Generate installers (.exe, .dmg, .deb, .rpm)
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
```

No test framework configured — no test script.

## Project

Electron 43 + React 18 + TypeScript 5.5 app. Cross-platform (Windows, macOS, Linux).

Version in `package.json` only (no `app.json`). Current: 1.0.0.

Entry (main process): `src/main.ts`.
Entry (renderer): `src/renderer.tsx` → `src/App.tsx`.

Navigation: manual stack in `App.tsx` (`navStack: NavEntry[]`). No router.
Screens: `'home' | 'search' | 'detail' | 'player' | 'settings'`.

State: Zustand stores in `src/renderer/stores/`. Use individual selectors (`useStore(s => s.field)`) — never full store subscription.

Imports: relative from `src/`.

Styling: Tailwind CSS v3. Entry: `src/index.css` with `@tailwind` directives.

TypeScript: strict mode, noUnusedLocals, noUnusedParameters.

## Architecture

### Source & Streaming

Source config at `src/renderer/config/source.ts`. TMDB images for posters.

Stream: HTTP fetch via `fetchWithSession()` in `src/renderer/services/source.ts`. No WebView for streaming.

Bridge page fetched → iframe URL extracted → `extractBest()` decrypts Byse payload via `@noble/ciphers` AES-GCM.

Decryption: `gcm()` from `@noble/ciphers/aes.js`, key assembled from `key_parts` using version-based index selection (`selectIndexes()`).

`parseMaster()` resolves HLS master playlist → `bestStream()` selects highest resolution.

Hidden BrowserWindow (`src/main/sessionHidden.ts`): only for session init + refresh (Cloudflare bypass, cookie acquisition).

JS injected via `sessionPreload.ts`: polls `document.cookie`, reports via `ipcRenderer.send('session-from-hidden', ...)`.

Video: native HTML5 `<video>` element. Custom overlay controls with `PlayerControls.tsx`. No expo-video or WebView.

### Session Management (`src/renderer/services/session.ts`)

`sessionManager` object with `sessionReadyPromise` for synchronization.

`initialize()`: checks existing session via `electronAPI.session.get()`.

`waitForCookies()`: 60s timeout, races against `sessionReadyPromise`.

`refreshSession()`: calls `electronAPI.session.refresh()` → hidden window navigates → cookies extracted → `readyResolve()`.

In main process (`src/main/sessionHidden.ts`):

- `refreshSession()`: navigates to wash URL, waits 3s, injects JS polling (`getCookie()`), waits up to 7s for cookies.
- Cookies received via `ipcRenderer.on('session-from-hidden', ...)` in `ipcHandlers.ts`.
- `fetchInPage()`: runs `fetch()` via `webContents.executeJavaScript()` inside the hidden window, using its real session cookies and headers.

`fetchWithSession` in `src/renderer/services/source.ts`:

- Waits for cookies via `sessionManager.waitForCookies()`.
- Attaches browser-like headers.
- Supports retry: 1 retry with 1s delay for non-401/403 HTTP errors and network errors.
- Auth errors (401/403): throws `error.type = "AUTH_ERROR"`.

### Cache (`src/renderer/utils/cache.ts` + `src/config/cache.ts`)

`withCache()` utility: returns cached value if available and not expired.

Stale threshold: 30% of TTL — when remaining TTL falls below 30%, the cached entry is considered stale and a fresh fetch is performed (the stale entry is discarded, not returned).

Max entry size: 1MB (`LIMITS.CACHE_MAX_ENTRY_SIZE`). Larger entries are logged and skipped.

Prefix-based TTLs:

| Prefix (CACHE_PREFIXES) | Cache key pattern | TTL  |
|-------------------------|-------------------|------|
| `HOME = 'ch_home'`      | `ch_home`         | 6h   |
| `SEARCH = 'search'`     | `search_{query}`  | 30m  |
| `SUGGESTIONS = 'suggestions'` | `suggestions_{query}` | 5m |
| `ANIME = 'anime'`       | `anime_{slug}`    | 12h  |
| `SERVERS = 'servers'`   | `servers_{slug}_{num}` | 10m |
| `STREAM = 'stream'`     | `stream_{serverId}` | 5m  |

Cache invalidation: `clearAllCache()` deletes all keys matching known prefixes. Called from `SettingsPage` on "Actualizar datos".

### Parser (`src/renderer/services/parsers.ts`)

`HtmlParser` class with multiple extraction strategies (fallback chain documented per method).

Episode extraction: RSC payload → script JSON → HTML regex fallback.

Detail extraction: scripts (RSC) → jsonLd → DOM → meta tags.

RSC (React Server Components) payload parsing via `self.__next_f.push` script detection.

`ParserUtils.extractJson()` handles balanced bracket JSON extraction.

`parseEpisodeServers()`: extracts players from RSC payload, filters "Delta" servers as preferred.

`parseAllFromScripts()`: extracts poster and relations from all RSC scripts.

`extractRelations()`: parses `relations` object (prequel, sequel, related) from RSC payload.

### Auth Error Auto-Retry Pattern

This pattern is used across all data stores to handle `AUTH_ERROR` (session expired):

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

### Session Refresh Flow (`src/App.tsx` + Settings)

Triggers: app startup (automatic in `useEffect` of `App.tsx`), manual "Actualizar datos" in Settings.

Flow:
1. `clearAllCache()` — clears all cache.
2. `sessionManager.refreshSession()` — hidden window navigates, acquires fresh cookies.
3. Refresh data (fetchHome with `force: true`).

### Loading States & Transitions

**Home/Detail/Search**: Skeleton while loading, content when ready, ErrorState on error.

Pattern:
```
isLoading && !hasContent && !error → Skeleton
hasContent && !error               → Content
!hasContent && error               → ErrorState
```

Skeleton fidelity: Read the real component first, mirror structure exactly. No invented layout elements.

Transitions: Native CSS transitions (Tailwind `transition-all`, `transition-colors`, `transition-transform`). No react-native-reanimated.

Search: simple fade-in (no skeleton overlay, content replaces directly).

### Screen & Hook Architecture

#### Screen Layer (`src/renderer/pages/`)

| File                        | Hook                   | Store(s)                            |
|-----------------------------|------------------------|-------------------------------------|
| `HomePage.tsx`              | `useHomeScreen`        | homeStore, historyStore             |
| `SearchPage.tsx`            | `useSearchScreen`      | searchStore, searchHistoryStore     |
| `DetailPage.tsx`            | `useAnimeDetail`       | detailsStore, playerStore, settingsStore |
| `PlayerPage.tsx`            | `usePlayer`            | playerStore, historyStore, detailsStore |
| `SettingsPage.tsx`          | (direct store access)  | uiStore                             |

#### Hook Composition Pattern

`useAnimeDetail(slug)`:
```
├── useDetailsStore.fetchDetails()  → fetch anime data
├── useSettingsStore.episodeOrder   → sort direction
├── useState for selectedEpisode, expanded, activeRangeIdx
├── useMemo for sortedEpisodes, ranges, visibleEpisodes
└── useEffect to persist range index
```

`usePlayer(slug, episodeNumber, anime, videoRef)`:
```
├── usePlayerStore → streamUrl, isLoading, error
├── useHistoryStore → addToHistory, lastViewed
├── useState for playing, currentTime, duration, offline
├── useRef for progressTimer, lastSavedEp
└── useEffect for: stream src assignment, progress interval, keyboard events, online/offline
```

#### Custom Screen Hook Pattern

Each screen has a dedicated `use<Name>()` hook.

Selects individual fields from multiple stores via individual selectors.

Composes UI state (loading, error, content) into a single return value.

Computes derived data via `useMemo`.

### Store Patterns (Zustand)

Individual selectors: `useStore((s) => s.field)` — never `useStore()` with whole state.

AbortController per store: `homeController`, `detailsController`, `searchController`, `suggestionsController` — cancelled on new fetch or reset.

State fields follow: `{ data[], isLoading, error }` shape.

Optimistic rollback: history stores capture previous state before mutation, revert on persistence failure.

`withCache()` for cached fetches, manual cache key construction for `servers_`/`stream_` prefixes.

Auth error recovery: detect `error.type === "AUTH_ERROR"` → `refreshSession()` → retry operation.

### Player Architecture (`PlayerPage.tsx` + `usePlayer.ts`)

Video: native HTML5 `<video>` element — `videoRef` in `useRef`.

Stream switching: `video.src = streamUrl; video.load();`. Cancel flag guards seek/play after unmount.

Progress save: 250ms interval via `setInterval` + save on unmount via `useEffect` cleanup. Seek resume if progress has value.

Network-aware: `online`/`offline` event listeners → pause on disconnect, resume on reconnect.

Episode navigation: `navigatePrev()` / `navigateNext()` — saves current progress before switching.

Keyboard shortcuts: Space (play/pause), ArrowLeft (seek back 10s), ArrowRight (seek forward 10s).

Auto-hide controls: `useAutoHide` hook — 3s of inactivity hides controls overlay.

Fullscreen API: `containerRef.requestFullscreen()` / `document.exitFullscreen()`.

### Component Patterns

- All functional components with typed React.FC.
- No ErrorBoundary wrapper.
- No React.memo on screens (stack-based navigation already prevents unnecessary re-renders).
- Navbar: buttons with active state (conditional classes `bg-purple-500/10`).
- `AnimeCard`: reusable base component with hover scale, gradient overlay, episode badge.
- `ContinueWatching`: horizontal scroll with progress bar.
- ui/ components: `Skeleton`, `ErrorState`, `SectionTitle`, `ImageWithLoader`.
- Color scheme: `bg-[#0f0f11]` backgrounds, `bg-neutral-800/900` elevated surfaces, `border-neutral-800/40` borders. Purple accent (`purple-400/500`) for interactive elements.

### Navigation (`src/App.tsx`)

`navStack` array of `NavEntry[]` — no router, no expo-router.

`push(screen, slug?, episodeNumber?)` → appends to stack.
`goBack()` → pops stack (if more than 1 entry).
`replaceCurrentDetail(slug)` → replaces the last detail screen in-place (for related anime).
`updatePlayerEpisode(number)` → updates episodeNumber on the current player screen.

No stack animation — instant switch (desktop app, no screen transitions).

### IPC Layer (`src/main/ipcHandlers.ts` + `src/preload.ts`)

`contextBridge.exposeInMainWorld('electronAPI', ...)` exposes:

- `session.get()` / `session.refresh()` → invokes handlers in main process.
- `store.get(key)` / `store.set(key, value)` / `store.delete(key)` / `store.clear()` → `electron-store`.
- `fetch(url, options)` → hidden session `fetchInPage()` (with real cookies).
- `bridgeFetch(url, headers)` → `net.fetch()` directly for bridge pages.
- `proxyFetch(url, opts)` → `net.fetch()` with options for extraction API.

### Logger (`src/renderer/utils/logger.ts` + `src/main/logger.ts`)

Two separate loggers: one in main process, one in renderer.

Renderer logger: leveled logging (DEBUG/INFO/WARN/ERROR) with optional persistence to `electron-store`.

Main logger: writes via `electron-store`.

Usage: `logger.info(tag, msg)`, `logger.warn(tag, msg, error)`, `logger.error(tag, msg, error)`.

### ESLint

Config at `.eslintrc.json`. Basic rules:
- `@typescript-eslint` recommended.
- `import/order`.
- No type-aware rules (no flat config).

### Forge Configuration

`forge.config.ts` with:
- Makers: Squirrel (Windows), ZIP (macOS), Deb (Linux), RPM (Linux).
- Vite Plugin: 3 builds (main, preload, sessionPreload) + 1 renderer.
- Fuses: cookie encryption, ASAR integrity, Node options disabled.

### Conventions

- **Dark theme only** — background `#0f0f11`, accent purple `#A855F7`.
- **Directory layout**: `src/{main,renderer}/` → `pages/`, `components/`, `hooks/`, `stores/`, `services/`, `config/`, `utils/`. Types in `src/types.ts`.
- **Skeleton components**: `src/renderer/components/skeletons/` — one per screen.
- **Base skeleton**: `src/renderer/components/ui/Skeleton.tsx` — CSS `animate-pulse` (native Tailwind).
- **Logger**: `src/renderer/utils/logger.ts` — leveled logging with optional persistence.
- **AppError**: type `{ type: AppErrorType, message: string }` in `src/types.ts`.
- **Comments**: No section headers, no "what" comments, no JSDocs on self-explanatory code. Allowed: `// why` for workarounds, race conditions, platform bugs.
- **i18n**: Spanish UI strings throughout ("Inicio", "Buscar", "Ajustes", "Episodio", "Reintentar", "Error al cargar", etc.).
