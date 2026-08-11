'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageTransition — smooth fade-out / fade-in when page content changes.
 *
 * Animates only when the actual children content changes (i.e. the new
 * route's content has arrived). This avoids the double-flash that happens
 * when a timer-based fade-out runs before the new page chunk is ready.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // New content arrived → fade out the old content, swap, then fade in.
    setPhase('out');
    const t = setTimeout(() => {
      setDisplayChildren(children);
      setPhase('in');
    }, 150);
    return () => clearTimeout(t);
  }, [children]);

  return (
    <div
      className={cn(
        phase === 'in'
          ? 'animate-in fade-in duration-200 ease-out'
          : 'animate-out fade-out duration-150 ease-in'
      )}
    >
      {displayChildren}
    </div>
  );
}