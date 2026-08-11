'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useAuth } from '@/contexts/auth-provider';
import { LayoutDashboard, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { BottomNav } from '@/components/bottom-nav';
import { UserMenu } from '@/components/user-menu';
import { useIdleLock } from '@/hooks/use-idle-lock';
import { supabase } from '@/lib/supabaseClient';
import { LoadingScreen } from '@/components/loading-screen';
import { PageTransition } from '@/components/page-transition';
import { cn } from '@/lib/utils';

// Lazy-load the lock screen so react-hook-form, zod and the crypto helpers
// are only fetched when the vault is actually locked.
const LockScreen = dynamic(
  () => import('@/components/dashboard/lock-screen').then((m) => m.LockScreen),
  { loading: () => <LoadingScreen label="Locking vault…" /> }
);

// Vault auto-locks after this many milliseconds of inactivity.
const IDLE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, setUser, setMasterKey } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMasterKey(null);
    router.push('/');
  };

  // Auto-lock: after 5 minutes of inactivity, show the lock screen. The
  // Supabase session is preserved — nobody is logged out, they just need to
  // re-enter their master password (or account password for the demo admin).
  const handleIdleLock = () => {
    setMasterKey(null);
    setLocked(true);
  };
  useIdleLock(IDLE_LOCK_TIMEOUT_MS, handleIdleLock, !!user && !locked);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  // Vault is locked — show the unlock screen instead of the app.
  // (GameToast lives in the root layout, so it stays mounted either way.)
  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  // Determine if we are on the main dashboard to conditionally show the back button
  const isDashboard = pathname === '/dashboard';

  const navItems = [
    {
      href: '/dashboard',
      label: 'Vault',
      icon: LayoutDashboard,
      active: isDashboard,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* === MOBILE HEADER: theme (left) · LOCKr (center) · profile (right) === */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-4 shadow-sm backdrop-blur-md transition-all md:hidden">
        <div className="flex w-12 items-center justify-start">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <span className="font-headline text-2xl font-bold tracking-tight text-foreground">
            LOCKr
          </span>
        </div>

        <div className="flex w-16 items-center justify-end">
          <UserMenu email={user.email ?? ''} onLogout={handleLogout} />
        </div>
      </header>
      {/* === END MOBILE HEADER === */}

      {/* === DESKTOP TOP NAV: links (left) · LOCKr logo (center) · theme/profile (right) === */}
      <header className="sticky top-0 z-40 hidden h-16 shrink-0 items-center border-b border-border/50 bg-background/80 px-4 shadow-sm backdrop-blur-md transition-all md:flex">
        {/* Left: primary navigation links */}
        <nav className="flex flex-1 items-center gap-1" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Center: LOCKr brand logo (truly centered regardless of side widths) */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/dashboard" prefetch aria-label="LOCKr home">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Right: theme toggle + profile menu */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeToggle />
          <UserMenu email={user.email ?? ''} onLogout={handleLogout} />
        </div>
      </header>
      {/* === END DESKTOP TOP NAV === */}

      {/* pb-20 keeps content clear of the mobile bottom nav */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden pb-20 md:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Mobile-only bottom navigation */}
      <BottomNav />
    </div>
  );
}