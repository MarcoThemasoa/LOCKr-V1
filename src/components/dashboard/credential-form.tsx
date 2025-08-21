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
import { PasswordGenerator } from '../password-generator';
import { ScrollArea } from '../ui/scroll-area';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  website: z.string().url({ message: 'Please enter a valid URL.' }),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  notes: z.string().optional(),
});

interface CredentialFormProps {
  credential?: Credential | null;
  onFinished: () => void;
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

    // Admin bypass for testing
    if (user.email === 'admin@example.com') {
      try {
        const dataToSave = {
          userId: user.id,
          website: values.website,
          username: values.username,
          password: values.password, // plain text for testing only
          iv: 'admin_iv',
          notes: values.notes || '',
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
        onFinished();
      } catch (err) {
        console.error('Admin save error:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not save admin credential.',
        });
      }
      return;
    }

    if (!masterKey) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unlock your vault before saving credentials.',
      });
      return;
    }

    try {
      // Encrypt password
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const { encryptedData } = await encrypt(values.password, masterKey, iv);

      const dataToSave = {
        userId: user.id,
        website: values.website,
        username: values.username,
        password: arrayBufferToBase64(encryptedData),
        iv: arrayBufferToBase64(iv.buffer),
        notes: values.notes || '',
        updatedAt: new Date().toISOString(),
      };

      console.log('Saving credential:', dataToSave);

      const { error } = credential
        ? await supabase.from('credentials').update(dataToSave).eq('id', credential.id)
        : await supabase.from('credentials').insert({
            ...dataToSave,
            createdAt: new Date().toISOString(),
          });

      if (error) throw error;

      toast({ title: credential ? 'Credential updated!' : 'Credential added!' });
      onFinished();
    } catch (err) {
      console.error('Save error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save credential. Check logs for details.',
      });
    }
  }

  return (
    <ScrollArea className="max-h-[70vh] w-full">
      <div className="p-2 pr-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
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
                  <FormLabel>Username / Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? 'text' : 'password'} {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <PasswordGenerator
              onPasswordGenerated={(p) =>
                form.setValue('password', p, { shouldValidate: true })
              }
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes, security questions, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Credential'}
            </Button>
          </form>
        </Form>
      </div>
    </ScrollArea>
  );
}
