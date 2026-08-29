'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageTransition — smooth fade-out / fade-in when page content changes.
 *
 * Fixed flashing issue by:
 * 1. Using a key-based approach to force proper remount
 * 2. Only animating when the route actually changes (not on every render)
 * 3. Using CSS animations that don't cause layout shifts
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const childrenRef = useRef(children);
  const prevChildrenRef = useRef<React.ReactNode | null>(null);

  // Track when children actually change (route change)
  useEffect(() => {
    if (prevChildrenRef.current !== null && prevChildrenRef.current !== children) {
      // Route changed - trigger transition
      setIsTransitioning(true);
      setKey((k) => k + 1);
      
      // Reset transition state after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300); // Match the CSS animation duration
      
      return () => clearTimeout(timer);
    }
    prevChildrenRef.current = children;
  }, [children]);

  return (
    <div
      key={key}
      className={cn(
        'animate-in fade-in duration-200 ease-out',
        isTransitioning && 'animate-out fade-out duration-150 ease-in'
      )}
    >
      {children}
    </div>
  );
}

/**
 * Alternative: Simple key-based transition (no flash, just smooth swap)
 * Use this if you prefer a simpler approach without the fade-out flash
 */
export function SimplePageTransition({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0);
  const prevChildrenRef = useRef<React.ReactNode | null>(null);

  useEffect(() => {
    if (prevChildrenRef.current !== null && prevChildrenRef.current !== children) {
      setKey((k) => k + 1);
    }
    prevChildrenRef.current = children;
  }, [children]);

  return (
    <div key={key} className="animate-in fade-in duration-200 ease-out">
      {children}
    </div>
  );
}