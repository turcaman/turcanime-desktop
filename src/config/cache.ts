export const LOG_LIMITS = {
  MAX_ENTRIES: 1000,
};

export const CACHE_PREFIXES = {
  HOME: 'ch_home',
  SEARCH: 'search',
  SUGGESTIONS: 'suggestions',
  ANIME: 'anime',
  STREAM: 'stream',
  SERVERS: 'servers',
};

export const CACHE_TTL = {
  HOME: 6 * 60 * 60 * 1000,
  DETAILS: 12 * 60 * 60 * 1000,
  SEARCH: 30 * 60 * 1000,
  SUGGESTIONS: 5 * 60 * 1000,
  SERVERS: 10 * 60 * 1000,
  STREAM: 5 * 60 * 1000,
};

export const LIMITS = {
  CACHE_MAX_ENTRY_SIZE: 1024 * 1024,
};

export const TIMEOUTS = {
  SEARCH: 15_000,
  SESSION_INIT: 30_000,
  RETRY_DELAY: 1_000,
};
