export const CACHE_PREFIXES = {
  HOME: 'ch_home',
  SEARCH: 'search',
  ANIME: 'anime',
  STREAM: 'stream',
  SERVERS: 'servers',
};

// Effective TTLs are ~70% of these values: withCache treats the last 30% of
// the window as stale and refetches (HOME expires at 4.2h, DETAILS at 8.4h).
// Set the number here to the full window you want, not the effective one.
export const CACHE_TTL = {
  HOME: 6 * 60 * 60 * 1000,
  DETAILS: 12 * 60 * 60 * 1000,
  SEARCH: 30 * 60 * 1000,
  SERVERS: 10 * 60 * 1000,
  STREAM: 5 * 60 * 1000,
};

// Caches whose content depends on the origin session and must be wiped on
// session renewal (mirrors the mobile app). Anime/servers/stream data stays
// valid across sessions.
export const SESSION_SENSITIVE_CACHE_PREFIXES = [CACHE_PREFIXES.HOME, CACHE_PREFIXES.SEARCH] as const;

export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024,
};

export const TIMEOUTS = {
  SEARCH: 15_000,
  REQUEST_TIMEOUT: 30_000,
  MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1_000,
  RETRY_MAX_DELAY: 4_000,
};
