import { useCallback, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

// Episode range index persisted per anime (mirrors the mobile app's
// usePersistedRange). Resets to 0 when the slug changes, then restores the
// saved index for the new slug once available.
export function usePersistedRange(slug: string) {
  const [activeRangeIdx, setActiveRangeIdxState] = useState(0);

  useEffect(() => {
    setActiveRangeIdxState(0);
    let cancelled = false;
    storage.get<number>(`range_${slug}`).then((idx) => {
      if (!cancelled && idx != null) setActiveRangeIdxState(idx);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setActiveRangeIdx = useCallback((idx: number) => {
    setActiveRangeIdxState(idx);
    storage.set(`range_${slug}`, idx).catch((err) => {
      logger.error('usePersistedRange', 'Failed to persist range', err);
    });
  }, [slug]);

  return { activeRangeIdx, setActiveRangeIdx };
}
