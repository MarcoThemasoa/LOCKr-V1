'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * useIdleLock — locks the vault after a period of user inactivity.
 *
 * The timer resets on any user interaction (pointer, keyboard, touch,
 * scroll, wheel, click). When the timeout elapses, `onIdle` is fired once.
 * The caller typically clears the vault key and reloads the page so the
 * Master Password dialog is shown again.
 *
 * @param timeoutMs Inactivity threshold in milliseconds (default 5 minutes).
 * @param onIdle    Callback invoked when the user has been idle too long.
 * @param enabled   When false, the timer is not armed (e.g. vault locked).
 */
export function useIdleLock(
  timeoutMs: number = 5 * 60 * 1000,
  onIdle: () => void,
  enabled: boolean = true
) {
  const onIdleRef = useRef(onIdle);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  // Keep the latest callback without re-arming the timer.
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const armTimer = useCallback(() => {
    clearTimer();
    firedRef.current = false;
    timeoutRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onIdleRef.current();
      }
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  // Reset the timer whenever the user interacts with the page.
  const handleActivity = useCallback(() => {
    if (enabled) armTimer();
  }, [enabled, armTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    armTimer();

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'touchstart',
      'click',
      'wheel',
      'scroll',
    ];

    // mousemove is noisy — debounce it so we don't re-arm on every pixel.
    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    const onMouseMove = () => {
      if (moveTimer) return;
      moveTimer = setTimeout(() => {
        moveTimer = null;
        handleActivity();
      }, 500);
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      clearTimer();
      if (moveTimer) clearTimeout(moveTimer);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled, armTimer, clearTimer, handleActivity]);

  // Manual lock trigger (used by the bottom-nav "Lock" button).
  const lockNow = useCallback(() => {
    clearTimer();
    if (!firedRef.current) {
      firedRef.current = true;
      onIdleRef.current();
    }
  }, [clearTimer]);

  return { lockNow };
}