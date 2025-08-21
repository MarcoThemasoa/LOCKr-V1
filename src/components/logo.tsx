import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Light mode logo */}
      <Image
        src="/logo-light.png"
        alt="Logo"
        width={32}
        height={32}
        className="h-10 w-10 dark:hidden"
      />

      {/* Dark mode logo */}
      <Image
        src="/logo-dark.png"
        alt="Logo"
        width={32}
        height={32}
        className="h-10 w-10 hidden dark:block"
      />

      <h1 className="font-headline text-4xl font-bold text-foreground">
        LOCKr
      </h1>
    </div>
  );
}
