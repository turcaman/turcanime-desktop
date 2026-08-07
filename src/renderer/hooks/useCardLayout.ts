import { useEffect, useState, type RefObject } from 'react';
import { calcCardLayout, type CardLayout } from '../config/layout';

// Keeps the responsive card grid in sync with the container size.
export function useCardLayout(containerRef: RefObject<HTMLDivElement | null>): CardLayout {
  const [layout, setLayout] = useState<CardLayout>(() => calcCardLayout(800));

  useEffect(() => {
    const update = () => setLayout(calcCardLayout(containerRef.current?.offsetWidth ?? 800));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [containerRef]);

  return layout;
}