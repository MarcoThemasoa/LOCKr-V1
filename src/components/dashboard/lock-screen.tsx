'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import {
  generateKey,
  decrypt,
  base64ToUint8Array,
} from '@/lib/crypto';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { showGameToast } from '@/components/game-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(1, 'Password is required.'),
});

/**
 * LockScreen — full-screen vault lock shown after idle timeout.
 *
 * - Regular users: unlock with their master password (decrypts the stored
 *   verification string). The Supabase session is untouched, so they stay
 *   logged in.
 * - Demo admin (no master password): unlock with the account password via
 *   signInWithPassword. This re-validates the session without logging out.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { user, setMasterKey } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin] = useState(() => user?.email === 'admin@example.com');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    try {
      if (isAdmin) {
        // Admin: verify the account password. signInWithPassword refreshes the
        // session in place — the user stays logged in, just unlocked.
        const { error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: values.password,
        });
        if (error) throw error;
        showGameToast('Unlocked!');
        onUnlock();
        return;
      }

      // Regular user: verify the master password against the stored
      // verification ciphertext.
      const { data: userRows, error } = await supabase
        .from('users')
        .select('salt, iv, verification')
        .eq('id', user.id)
        .single();

      if (error || !userRows) {
        throw new Error('User data not found.');
      }

      const salt = base64ToUint8Array(userRows.salt);
      const iv = base64ToUint8Array(userRows.iv);
      const verificationData = base64ToUint8Array(userRows.verification);

      const key = await generateKey(values.password, salt);
      const decrypted = await decrypt(verificationData.buffer, key, iv);

      if (decrypted !== 'LOCKrVerification') {
        throw new Error('Incorrect master password.');
      }

      setMasterKey(key);
      showGameToast('Unlocked!');
      onUnlock();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Unlock Failed',
        description: isAdmin
          ? 'Incorrect password. Please try again.'
          : 'Incorrect master password. Please try again.',
      });
      form.reset();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-bold">Vault Locked</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Enter your account password to continue.'
              : 'Enter your master password to unlock your vault.'}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={isAdmin ? 'Account password' : 'Master password'}
              autoFocus
              {...form.register('password')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Unlocking...' : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  );
}