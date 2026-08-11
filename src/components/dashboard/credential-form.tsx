'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Credential } from '@/lib/types';
import { encrypt, arrayBufferToBase64 } from '@/lib/crypto';
import {
  sanitizeText,
  sanitizeNotes,
  normalizeUrl,
  isSafeHttpUrl,
  MAX_WEBSITE_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_NOTES_LENGTH,
} from '@/lib/security';
import { PasswordGenerator } from '../password-generator';
import { useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';

/**
 * Client-side validation schema.
 * Every field is trimmed, length-limited, and (for the website) restricted
 * to safe http/https URLs. This blocks stored-XSS payloads at the source.
 */
const formSchema = z.object({
  website: z
    .string()
    .trim()
    .min(1, 'Website is required.')
    .max(MAX_WEBSITE_LENGTH, `Website must be at most ${MAX_WEBSITE_LENGTH} characters.`)
    .refine(isSafeHttpUrl, {
      message: 'Please enter a valid http(s) URL (e.g. https://example.com).',
    }),
  username: z
    .string()
    .trim()
    .min(1, 'Username is required.')
    .max(MAX_USERNAME_LENGTH, `Username must be at most ${MAX_USERNAME_LENGTH} characters.`),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`),
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, `Notes must be at most ${MAX_NOTES_LENGTH} characters.`)
    .optional(),
});

interface CredentialFormProps {
  credential?: Credential | null;
  /** Called after a successful save (saved === true) or when the dialog is dismissed. */
  onFinished: (saved: boolean) => void;
}

export function CredentialForm({ credential, onFinished }: CredentialFormProps) {
  const { user, masterKey } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      website: credential?.website || '',
      username: credential?.username || '',
      password: '',
      notes: credential?.notes || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in.',
      });
      return;
    }

    // Sanitize every field before it is persisted (defense in depth).
    const website = normalizeUrl(values.website) ?? '';
    const username = sanitizeText(values.username, MAX_USERNAME_LENGTH);
    const notes = sanitizeNotes(values.notes ?? '', MAX_NOTES_LENGTH);

    if (!website) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid website URL.',
      });
      return;
    }

    // Demo admin account: stores plaintext for easy inspection (no encryption).
    if (user.email === 'admin@example.com') {
      try {
        const dataToSave = {
          userId: user.id,
          website,
          username,
          password: sanitizeText(values.password, MAX_PASSWORD_LENGTH),
          iv: 'admin_iv',
          notes,
          updatedAt: new Date().toISOString(),
        };

        const { error } = credential
          ? await supabase.from('credentials').update(dataToSave).eq('id', credential.id)
          : await supabase.from('credentials').insert({
              ...dataToSave,
              createdAt: new Date().toISOString(),
            });

        if (error) throw error;
        toast({ title: credential ? 'Credential updated (admin)' : 'Credential added (admin)' });
        onFinished(true);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save admin credential.' });
      }
      return;
    }

    if (!masterKey) {
      toast({ variant: 'destructive', title: 'Error', description: 'Unlock your vault before saving credentials.' });
      return;
    }

    try {
      // Encrypt the password client-side before it ever reaches the server.
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const { encryptedData } = await encrypt(values.password, masterKey, iv);

      const dataToSave = {
        userId: user.id,
        website,
        username,
        password: arrayBufferToBase64(encryptedData),
        iv: arrayBufferToBase64(iv.buffer),
        notes,
        updatedAt: new Date().toISOString(),
      };

      const { error } = credential
        ? await supabase.from('credentials').update(dataToSave).eq('id', credential.id)
        : await supabase.from('credentials').insert({
            ...dataToSave,
            createdAt: new Date().toISOString(),
          });

      if (error) throw error;
      toast({ title: credential ? 'Credential updated!' : 'Credential added!' });
      onFinished(true);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save credential.' });
    }
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Website</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Username / Email</FormLabel>
                <FormControl>
                  <Input className="h-9" placeholder="user@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input className="h-9 pr-9" type={showPassword ? 'text' : 'password'} {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-1">
            <PasswordGenerator
              onPasswordGenerated={(p) =>
                form.setValue('password', p, { shouldValidate: true })
              }
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Notes (Optional Comment)</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none min-h-[60px]"
                    placeholder="Security questions, PINs, etc."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2">
            <Button type="submit" className="w-full rounded-xl shadow-lg shadow-primary/20" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Credential
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}