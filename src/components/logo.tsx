import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 'lg',
}: {
  className?: string;
  size?: 'sm' | 'lg';
}) {
  const imgClass = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const textClass = size === 'sm' ? 'text-2xl' : 'text-4xl';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Light mode logo */}
      <Image
        src="/logo-light.png"
        alt="Logo"
        width={32}
        height={32}
        className={cn(imgClass, "dark:hidden")}
      />

      {/* Dark mode logo */}
      <Image
        src="/logo-dark.png"
        alt="Logo"
        width={32}
        height={32}
        className={cn(imgClass, "hidden dark:block")}
      />

      <h1 className={cn("font-headline font-bold text-foreground", textClass)}>
        LOCKr
      </h1>
    </div>
  );
}
