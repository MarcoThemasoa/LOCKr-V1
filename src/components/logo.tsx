import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Lock className="h-8 w-8 text-primary" />
      <h1 className="font-headline text-4xl font-bold text-foreground">
        LOCKr
      </h1>
    </div>
  );
}
