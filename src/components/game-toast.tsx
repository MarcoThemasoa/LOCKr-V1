'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const GAME_TOAST_EVENT = 'lockr:game-toast';

/**
 * showGameToast — fire a centered, game-style notification (e.g. "Unlocked!").
 * The GameToast component must be mounted somewhere in the tree (it is, in the
 * root layout) to receive the event.
 */
export function showGameToast(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GAME_TOAST_EVENT, { detail: { message } })
  );
}

/**
 * GameToast — a big, centered popup that scales + fades in, holds, then
 * fades out, like an achievement notification in a game.
 *
 * Renders nothing until showGameToast() is called. Mounted once in the root
 * layout so it survives route changes and the locked/unlocked state switch.
 */
export function GameToast() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null
  );
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      setLeaving(false);
      setToast({ message, id: Date.now() });
      timers.current.push(setTimeout(() => setLeaving(true), 1400));
      timers.current.push(setTimeout(() => setToast(null), 1700));
    };

    window.addEventListener(GAME_TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(GAME_TOAST_EVENT, handler);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      <div
        key={toast.id}
        className={cn(
          leaving
            ? 'animate-out fade-out zoom-out-95 duration-300 ease-in'
            : 'animate-in zoom-in-95 fade-in duration-300 ease-out'
        )}
      >
        <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-card/95 px-10 py-5 shadow-2xl shadow-primary/25 backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <p className="font-headline text-3xl font-bold tracking-tight text-foreground">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
}