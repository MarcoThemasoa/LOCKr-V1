'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Copy,
  Edit,
  PlusCircle,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

    // Fetch credentials from Supabase
    const fetchCredentials = async () => {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('userId', user.id);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCredential(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCredential ? 'Edit Credential' : 'Add New Credential'}
                </DialogTitle>
              </DialogHeader>
              <CredentialForm
                credential={editingCredential}
                onFinished={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Website</TableHead>
              <TableHead className="hidden md:table-cell">Username</TableHead>
              <TableHead className="hidden md:table-cell">Password</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredCredentials.length > 0 ? (
              filteredCredentials.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.website}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{c.username}</div>
                  </TableCell>
                  <TableCell className="hidden font-code md:table-cell">{c.username}</TableCell>
                  <TableCell className="hidden font-code md:table-cell">
                    {visiblePasswords[c.id!] ? (
                      <span>{visiblePasswords[c.id!]}</span>
                    ) : (
                      <span>••••••••</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="hidden items-center justify-end gap-2 md:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePasswordVisibility(c)}
                      >
                        {visiblePasswords[c.id!] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPassword(c)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCredential(c);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this credential.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id!)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleTogglePasswordVisibility(c)}>
                            {visiblePasswords[c.id!] ? 'Hide' : 'View'} Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyPassword(c)}>Copy Password</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingCredential(c); setIsFormOpen(true); }}>Edit</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Delete</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this credential.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(c.id!)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  You dont have passwords yet, add some?
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}