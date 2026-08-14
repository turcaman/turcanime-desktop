export const CACHE_PREFIXES = {
  HOME: 'ch_home',
  SEARCH: 'search',
  ANIME: 'anime',
  STREAM: 'stream',
  SERVERS: 'servers',
};

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
};
