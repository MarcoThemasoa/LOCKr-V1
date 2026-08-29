'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Database, AlertCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorType, setErrorType] = useState<'database' | 'network' | 'unknown'>('unknown');

  useEffect(() => {
    const message = error.message.toLowerCase();
    if (message.includes('database') || message.includes('supabase') || message.includes('connection') || message.includes('ECONNREFUSED')) {
      setErrorType('database');
    } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      setErrorType('network');
    }
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    reset();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  const getErrorContent = () => {
    switch (errorType) {
      case 'database':
        return {
          icon: Database,
          title: 'Database Unavailable',
          description: 'Unable to connect to the database. Your data is safe, but we can\'t reach the server right now.',
          actionLabel: 'Retry Connection',
        };
      case 'network':
        return {
          icon: AlertCircle,
          title: 'Network Error',
          description: 'Something went wrong with the network connection. Please check your internet and try again.',
          actionLabel: 'Try Again',
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. Our team has been notified.',
          actionLabel: 'Refresh Page',
        };
    }
  };

  const { icon: Icon, title, description, actionLabel } = getErrorContent();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="mb-8 flex items-center justify-center gap-3">
        <Icon className="h-14 w-14 text-destructive/80 animate-pulse" />
      </div>

      <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>

      <p className="mb-8 max-w-md text-muted-foreground">
        {description}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3',
            'text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : actionLabel}
        </button>

        <Link
          href="/"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3',
            'text-sm font-medium transition-colors',
            'border border-border bg-background hover:bg-accent',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
          )}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 w-full max-w-md text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Error Details (Development)</summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-4">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}
    </div>
  );
}