'use client';

import React, { useEffect, useState } from 'react';
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
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchCredentials = async () => {
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
    };

    fetchCredentials();
  }, [user, toast]);

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
    <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8">
      {/* Mobile-Friendly Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Vault</h1>
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
            
            {/* === MOBILE OPTIMIZED MODAL CONTENT === */}
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] p-5 sm:p-8 border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader className="text-left space-y-2 mb-2">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {editingCredential ? 'Edit Credential' : 'New Credential'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="px-1 pb-1">
                <CredentialForm
                  credential={editingCredential}
                  onFinished={() => setIsFormOpen(false)}
                />
              </div>
            </DialogContent>
            {/* === END MOBILE OPTIMIZED MODAL CONTENT === */}
            
          </Dialog>
        </div>
      </div>

      {/* List / Grid View */}
      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          // Sleek Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/20 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32 md:w-48" />
                  <Skeleton className="h-4 w-24 md:w-32" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-full sm:w-24 rounded-lg" />
                <Skeleton className="h-9 w-10 rounded-lg hidden sm:block" />
              </div>
            </div>
          ))
        ) : filteredCredentials.length > 0 ? (
          filteredCredentials.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm backdrop-blur-md transition-all hover:border-primary/50 hover:bg-card/60 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              {/* Left Side: Info */}
              <div className="flex items-start gap-4 overflow-hidden">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <a
                    href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-base font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {c.website}
                  </a>
                  <p className="truncate font-code text-sm text-muted-foreground">{c.username}</p>
                  
                  {/* Notes & Revealed Password Container */}
                  <div className="mt-1 flex flex-col gap-2">
                    {c.notes && (
                      <p className="line-clamp-2 text-xs italic text-muted-foreground/70">
                        "{c.notes}"
                      </p>
                    )}
                    {/* Inline password reveal for mobile friendliness */}
                    {visiblePasswords[c.id!] && (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 font-code text-sm text-foreground shadow-inner">
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        <span className="break-all">{visiblePasswords[c.id!]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="flex shrink-0 items-center gap-2 sm:mt-0">
                {/* Primary Quick Action */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 rounded-lg sm:flex-none"
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

                {/* Desktop & Mobile Overflow Menu */}
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
                            This action cannot be undone. This will permanently delete your saved login for <strong>{c.website}</strong>.
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/10 py-20 text-center">
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