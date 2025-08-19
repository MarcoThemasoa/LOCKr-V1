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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Eye, EyeOff } from 'lucide-react';

const formSchema = z.object({
  masterPassword: z.string().min(1, 'Master password is required.'),
});

export function MasterPasswordDialog() {
  const { user, setMasterKey } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      masterPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You are not logged in.',
      });
      return;
    }

    try {
      // Fetch user data from Supabase
      const { data: userRows, error } = await supabase
        .from('users')
        .select('salt, iv, verification')
        .eq('id', user.id)
        .single();

      if (error || !userRows) {
        throw new Error('User data not found.');
      }

      // Decode salt, iv, and verification from base64 to Uint8Array
      const salt = base64ToUint8Array(userRows.salt);
      const iv = base64ToUint8Array(userRows.iv);
      const verificationData = base64ToUint8Array(userRows.verification);

      const key = await generateKey(values.masterPassword, salt);
      const decrypted = await decrypt(verificationData.buffer, key, iv);

      if (decrypted === 'LOCKrVerification') {
        setMasterKey(key);
        setIsOpen(false);
        toast({ title: 'Vault Unlocked' });
      } else {
        throw new Error('Incorrect master password.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Unlock Failed',
        description: 'Incorrect master password. Please try again.',
      });
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unlock Your Vault</DialogTitle>
          <DialogDescription>
            Enter your master password to decrypt and access your saved
            credentials.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="masterPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Master Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                      />
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Unlocking...' : 'Unlock'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}