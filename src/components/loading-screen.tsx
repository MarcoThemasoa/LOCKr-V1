'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingScreen — branded loading state used during auth restore and
 * route transitions. A sleek gradient ring spinner with the LOCKr lock
 * icon at its center, plus a subtle pulsing status line.
 *
 * @param fullScreen When true (default), fills the viewport. When false,
 *                   renders as an inline centered block (for page content).
 * @param label      Optional status text shown under the spinner.
 */
export function LoadingScreen({
  fullScreen = true,
  label = 'Securing your vault…',
  className,
}: {
  fullScreen?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        fullScreen ? 'h-screen w-full' : 'py-20',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-16 w-16">
          {/* Static track ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
          {/* Spinning gradient ring */}
          <div
            className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary/40"
            style={{ animationDuration: '0.9s' }}
          />
          {/* Center lock icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="font-headline text-2xl font-bold tracking-tight text-foreground">
            LOCKr
          </p>
          <p className="animate-pulse text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}