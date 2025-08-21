'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';

const formSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [allowReset, setAllowReset] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        setAllowReset(!!session);
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    init();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // When arriving from the email link, Supabase sets a recovery session
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setAllowReset(true);
      }
      if (event === 'SIGNED_OUT') {
        setAllowReset(false);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!allowReset) {
      toast({
        variant: 'destructive',
        title: 'Invalid or expired link',
        description: 'Open this page using the reset link sent to your email.',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) throw error;

      toast({ title: 'Password updated. Please sign in with your new password.' });
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      let message = 'Failed to update password. Please try again.';
      if (error instanceof Error) message = error.message;
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  }

  if (checking) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-dashed border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="mb-4 text-center font-headline text-2xl font-bold">Reset Password</h2>

      {!allowReset && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Invalid or expired link</AlertTitle>
          <AlertDescription>
            This page must be opened from the password reset link sent to your email. Request a new link from the{' '}
            <Button asChild variant="link" className="px-1">
              <Link href="/forgot-password">Forgot Password</Link>
            </Button>{' '}
            page.
          </AlertDescription>
        </Alert>
      )}

      {allowReset && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showNewPassword ? 'text' : 'password'} {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showConfirmPassword ? 'text' : 'password'} {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
