'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BottomNav — mobile-only bottom navigation bar.
 *
 * Provides quick access to the Vault and Settings.
 * Hidden on md+ screens where the sidebar is used instead.
 */
export function BottomNav() {
  const pathname = usePathname();

  const items = [
    {
      href: '/dashboard',
      label: 'Vault',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs font-medium transition-colors',
              item.active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}