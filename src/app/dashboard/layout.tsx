'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth } from '@/contexts/auth-provider';
import { LayoutDashboard, LogOut, Settings, ChevronLeft } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { supabase } from '@/lib/supabaseClient';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, setUser, setMasterKey } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  // Determine page context
  const isDashboard = pathname === '/dashboard';
  const pageName = isDashboard ? 'Vault' : 
                   pathname === '/settings' ? 'Settings' : 
                   pathname.split('/').filter(Boolean).pop() || 'Dashboard';

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        className="!bg-card dark:!bg-background shadow-lg border-r border-border/50" 
        collapsible="offcanvas"
      >
        <SidebarHeader className="p-4 mt-2 flex items-center justify-between">
          <Logo />
        </SidebarHeader>
        <SidebarContent className='p-2 ml-4'>
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isDashboard} className="rounded-xl transition-all data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium">
                <Link href="/dashboard">
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/settings"} className="rounded-xl transition-all data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium">
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                  <span className="text-base">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-background">
        
        {/* === ENHANCED NAVBAR HEADER === */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 px-4 shadow-sm backdrop-blur-md transition-all">
          <div className="flex flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Separator orientation="vertical" className="h-6 hidden md:block bg-border/50" />
            
            <div className="flex items-center gap-1 md:gap-2">
              {/* Dynamic Back Button */}
              {!isDashboard && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => router.back()}
                  className="h-8 w-8 rounded-full shrink-0 mr-1 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <span className="text-sm font-semibold capitalize text-foreground/80 tracking-wide">
                {pageName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 w-9 rounded-full bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/20 transition-all p-0 overflow-hidden"
                >
                  <span className="text-sm font-bold text-primary uppercase">
                    {user.email?.[0] || 'U'}
                  </span>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/50 bg-card/95 backdrop-blur-md p-2 shadow-xl">
                <div className="flex flex-col space-y-1 p-2 pb-3 mb-1 border-b border-border/50">
                  <p className="text-sm font-medium leading-none truncate text-foreground">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">Personal Account</p>
                </div>
                
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg mt-1 transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary">
                  <Link href="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-border/50 my-1" />
                
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* === END NAVBAR HEADER === */}

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}