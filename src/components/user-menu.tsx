'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

interface UserMenuProps {
  email: string;
  onLogout: () => void;
}

/**
 * UserMenu — avatar button + dropdown (account email, settings link, logout).
 * Shared by the mobile and desktop headers in the app layout.
 */
export function UserMenu({ email, onLogout }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/20 transition-all p-0 overflow-hidden"
        >
          <span className="text-sm font-bold text-primary uppercase">
            {email?.[0] || 'U'}
          </span>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border-border/50 bg-card/95 backdrop-blur-md p-2 shadow-xl"
      >
        <div className="flex flex-col space-y-1 p-2 pb-3 mb-1 border-b border-border/50">
          <p className="text-sm font-medium leading-none truncate text-foreground">{email}</p>
          <p className="text-xs leading-none text-muted-foreground mt-1">Personal Account</p>
        </div>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-lg mt-1 transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
        >
          <Link href="/settings" className="flex items-center w-full">
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/50 my-1" />

        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}