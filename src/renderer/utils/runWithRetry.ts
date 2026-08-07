import { sessionManager } from '../services/session';
import { logger } from './logger';
import type { AppError } from '../../types';

const BACKOFF_BASE_MS = 1000;
const AUTH_MAX_RETRIES = 3;
const AUTH_BACKOFF_CAP_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_CAP_MS = 4000;

export interface RetryResult<T> {
  data: T | null;
  error: AppError | null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Single retry policy for all HTTP-backed stores: auth errors refresh the
// session and retry up to AUTH_MAX_RETRIES; transient errors retry up to
// MAX_RETRIES, both with exponential backoff. Errors are never cached, so a
// fresh attempt always re-fetches.
export async function runWithRetry<T>(
  run: (attempt: number) => Promise<RetryResult<T>>,
  context: string,
): Promise<RetryResult<T>> {
  for (let attempt = 0; ; attempt++) {
    const result = await run(attempt);
    if (!result.error) return result;

    const isAuth = result.error.type === 'AUTH_ERROR';
    if (isAuth && attempt < AUTH_MAX_RETRIES) {
      logger.info(context, `Auth error (attempt ${attempt + 1}/${AUTH_MAX_RETRIES}), refreshing session`);
      await sessionManager.refreshSession();
      await wait(Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), AUTH_BACKOFF_CAP_MS));
      continue;
    }
    if (!isAuth && attempt < MAX_RETRIES) {
      logger.info(context, `Retry ${attempt + 1}/${MAX_RETRIES} after backoff`);
      await wait(Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), RETRY_BACKOFF_CAP_MS));
      continue;
    }
    return result;
  }
}