'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { SetMasterPasswordDialog } from '../dashboard/set-master-password-dialog';

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
});

type AppUser = {
  id: string;
  email: string;
  displayName?: string;
};

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showSetMasterPasswordDialog, setShowSetMasterPasswordDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Admin login logic
    if (values.email === 'admin@example.com') {
      if (values.password === 'Usagi') {
        const masterUser: AppUser = {
          id: 'admin-user',
          email: 'admin@example.com',
          displayName: 'Admin',
        };
        localStorage.setItem('masterUser', JSON.stringify(masterUser));
        setUser(masterUser);
        toast({
          title: 'Login Successful',
          description: "Welcome back, Admin! You're now logged in.",
        });
        router.push('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Incorrect password for the admin account.',
        });
      }
      return;
    }

    // Supabase login logic
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message,
        });
        return;
      }
      // Map Supabase user to AppUser type
      const supabaseUser = data.user;
      if (supabaseUser) {
        const appUser: AppUser = {
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
        };
        setUser(appUser);

        // Check if user has set master password
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', supabaseUser.id)
          .single();

        if (userError || !userRow) {
          // No master password set, show dialog
          setCurrentUserId(supabaseUser.id);
          setShowSetMasterPasswordDialog(true);
          toast({
            title: 'Set Master Password',
            description: 'Please set your master password to protect your vault.',
          });
        } else {
          // Master password exists, go to dashboard
          toast({
            title: 'Login Successful',
            description: "Welcome back! You're now logged in.",
          });
          router.push('/dashboard');
        }
      }
    } catch (error) {
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    }
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
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
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Button variant="link" asChild className="p-0">
            <Link href="/signup">Sign up</Link>
          </Button>
        </p>
        <p className="text-muted-foreground">
          <Button variant="link" asChild className="p-0">
            <Link href="/forgot-password">Forgot your password?</Link>
          </Button>
        </p>
      </div>
      {showSetMasterPasswordDialog && (
        <SetMasterPasswordDialog
          isOpen={showSetMasterPasswordDialog}
          setIsOpen={(open) => {
            setShowSetMasterPasswordDialog(open);
            if (!open) {
              // After setting master password, go to dashboard
              router.push('/dashboard');
            }
          }}
        />
      )}
    </div>
  );
}