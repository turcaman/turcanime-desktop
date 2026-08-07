import { useCallback, useEffect, useRef } from 'react';

export function useAutoHide(
  visible: boolean,
  isPlaying: boolean,
  timeoutMs = 3000,
  onHide?: () => void,
) {
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  const restartTimer = useCallback(() => {
    clearTimer();
    if (visible && isPlaying) {
      hideTimer.current = setTimeout(() => { onHideRef.current?.(); }, timeoutMs);
    }
  }, [clearTimer, isPlaying, visible, timeoutMs]);

  useEffect(() => {
    if (visible && isPlaying) {
      hideTimer.current = setTimeout(() => { onHideRef.current?.(); }, timeoutMs);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [visible, isPlaying, clearTimer, timeoutMs]);

  return { restartTimer, clearTimer };
}