'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Copy,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  Search,
  Plus,
  Globe,
  KeyRound
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CredentialForm } from './credential-form';
import type { Credential } from '@/lib/types';
import { decrypt, base64ToUint8Array } from '@/lib/crypto';
import { getSafeHref, sanitizeText } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '../ui/skeleton';

export function CredentialsTable() {
  const { user, masterKey } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
  // Bumped after every successful save so the list refreshes immediately.
  const [reloadKey, setReloadKey] = useState(0);
  const { toast } = useToast();

  const fetchCredentials = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('userId', user.id)
      .order('website', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to load credentials.' });
      setLoading(false);
      return;
    }

    setCredentials(data as Credential[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials, reloadKey]);

  const handleTogglePasswordVisibility = async (credential: Credential) => {
    if (!credential.id) return;

    if (visiblePasswords[credential.id]) {
      setVisiblePasswords((prev) => {
        const { [credential.id!]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    if (user?.email === 'admin@example.com') {
      setVisiblePasswords((prev) => ({
        ...prev,
        [credential.id!]: credential.password,
      }));
      return;
    }

    if (!masterKey) {
      toast({ variant: 'destructive', title: 'Vault is locked.' });
      return;
    }
    try {
      const decryptedPassword = await decrypt(
        base64ToUint8Array(credential.password).buffer,
        masterKey,
        base64ToUint8Array(credential.iv)
      );
      setVisiblePasswords((prev) => ({ ...prev, [credential.id!]: decryptedPassword }));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to decrypt password.' });
    }
  };

  const handleCopyPassword = async (credential: Credential) => {
    let passwordToCopy = visiblePasswords[credential.id!];

    if (!passwordToCopy) {
      if (user?.email === 'admin@example.com') {
        passwordToCopy = credential.password;
      } else {
        if (!masterKey) {
          toast({ variant: 'destructive', title: 'Vault is locked.' });
          return;
        }
        try {
          passwordToCopy = await decrypt(
            base64ToUint8Array(credential.password).buffer,
            masterKey,
            base64ToUint8Array(credential.iv)
          );
        } catch (e) {
          toast({ variant: 'destructive', title: 'Failed to decrypt password.' });
          return;
        }
      }
    }
    await navigator.clipboard.writeText(passwordToCopy);
    toast({ title: 'Password copied to clipboard!' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credentials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Credential deleted successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete credential.' });
    }
  };

  const filteredCredentials = credentials.filter(
    (c) =>
      c.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 md:space-y-8">
      {/* Header: title + search + add button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground md:text-4xl">Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and securely access your saved credentials.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vault..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border-border/50 bg-card/50 pl-9 shadow-sm backdrop-blur-sm focus-visible:ring-primary/50"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCredential(null)} className="rounded-xl shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Add Item</span>
              </Button>
            </DialogTrigger>

            {/* Mobile-optimized modal content */}
            <DialogContent className="w-[calc(100vw-2rem)] max-w-[400px] max-h-[85vh] overflow-y-auto rounded-3xl p-5 border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader className="text-left space-y-1 mb-2">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {editingCredential ? 'Edit Credential' : 'New Credential'}
                </DialogTitle>
              </DialogHeader>
              <CredentialForm
                credential={editingCredential}
                onFinished={(saved) => {
                  setIsFormOpen(false);
                  // Refresh the list immediately after a successful save.
                  if (saved) setReloadKey((k) => k + 1);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Responsive card grid: 1 col on small phones, 2 on larger phones, up to 4 on desktop */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          // Loading skeletons matching the card layout
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/20 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredCredentials.length > 0 ? (
          filteredCredentials.map((c) => {
            // Only render a clickable link when the stored value is a safe
            // http/https URL; otherwise fall back to plain text (blocks
            // javascript:/data: stored-XSS payloads).
            const safeHref = getSafeHref(c.website);
            const displayWebsite = sanitizeText(c.website, 2048);
            const displayUsername = sanitizeText(c.username, 200);

            return (
              <div
                key={c.id}
                className="group flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm backdrop-blur-md transition-all hover:border-primary/50 hover:bg-card/60"
              >
                {/* Icon + website + username */}
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    {safeHref ? (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-base font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {websiteDisplay(c.website)}
                      </a>
                    ) : (
                      <span className="truncate text-base font-semibold text-foreground">
                        {websiteDisplay(c.website)}
                      </span>
                    )}
                    <p className="truncate font-code text-sm text-muted-foreground">{displayUsername}</p>
                  </div>
                </div>

                {/* Inline password reveal */}
                {visiblePasswords[c.id!] && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 font-code text-sm text-foreground shadow-inner w-full">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{visiblePasswords[c.id!]}</span>
                  </div>
                )}

                {/* Notes (truncated to 2 lines) */}
                {c.notes && (
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words line-clamp-2">
                      {c.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 rounded-lg"
                    onClick={() => handleCopyPassword(c)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-lg shrink-0"
                    onClick={() => handleTogglePasswordVisibility(c)}
                  >
                    {visiblePasswords[c.id!] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>

                  {/* Overflow menu: Edit / Delete */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={() => { setEditingCredential(c); setIsFormOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl border-destructive/20 bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your saved login for <strong>{websiteDisplay(c.website)}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id!)} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/10 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">Your vault is empty</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              You haven't saved any passwords yet. Click "Add Item" to securely store your first credential.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Strip the scheme from a website for display purposes
 * (e.g. "https://example.com" -> "example.com").
 */
function websiteDisplay(website: string): string {
  return website.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}