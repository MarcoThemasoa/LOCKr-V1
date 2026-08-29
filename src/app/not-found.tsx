import Link from 'next/link';
import { Home, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 flex items-center justify-center gap-2">
        <AlertTriangle className="h-12 w-12 text-destructive/80 animate-pulse" />
        <span className="font-headline text-5xl font-bold text-foreground">404</span>
      </div>

      <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
        Page Not Found
      </h1>

      <p className="mb-8 max-w-md text-muted-foreground">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have
        been moved, deleted, or never existed in the first place.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3',
            'text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>

        <Link
          href="/dashboard"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3',
            'text-sm font-medium transition-colors',
            'border border-border bg-background hover:bg-accent',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
        >
          <Search className="h-4 w-4" />
          Search Vault
        </Link>
      </div>
    </div>
  );
}