import { useEffect, useState, type RefObject } from 'react';
import { calcCardLayout, type CardLayout } from '../config/layout';

// Keeps the responsive card grid in sync with the container size. Uses a
// ResizeObserver instead of a window resize listener so the grid also
// reflows when the sidebar collapses/expands (no window resize fires).
export function useCardLayout(containerRef: RefObject<HTMLDivElement | null>): CardLayout {
  const [layout, setLayout] = useState<CardLayout>(() => calcCardLayout(800));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(calcCardLayout(el.offsetWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return layout;
}
