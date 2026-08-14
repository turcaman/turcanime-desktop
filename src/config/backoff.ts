import { TIMEOUTS } from './cache';

// Full-jitter exponential backoff (AWS-style): random within
// [0, min(max, base * 2^attempt)) — mirrors the mobile app's backoffDelay so
// concurrent retries (e.g. the home sections after the network recovers) do
// not hit the server at the exact same moment.
export function backoffDelay(
  attempt: number,
  baseMs = TIMEOUTS.RETRY_BASE_DELAY,
  maxMs = TIMEOUTS.RETRY_MAX_DELAY,
): number {
  const cap = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}
