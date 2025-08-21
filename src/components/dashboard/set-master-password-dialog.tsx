'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { generateKey, encrypt, arrayBufferToBase64 } from '@/lib/crypto';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  masterPassword: z.string().min(8, 'Master password must be at least 8 characters.'),
});

export function SetMasterPasswordDialog({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
      // Generate salt and iv
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      // Generate key
      const key = await generateKey(values.masterPassword, salt);
      // Encrypt verification string WITH IV
      const verificationPlain = 'LOCKrVerification';
      const encrypted = await encrypt(verificationPlain, key, iv);

      // Insert into users table
      const { error } = await supabase.from('users').insert([
        {
          id: user.id,
          salt: arrayBufferToBase64(salt.buffer),
          iv: arrayBufferToBase64(iv.buffer),
          verification: arrayBufferToBase64(encrypted.encryptedData),
        },
      ]);

      if (error) {
        throw error;
      }

      toast({ title: 'Master Password Set', description: 'Your vault is now protected.' });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: 'Could not set master password. Please try again.',
      });
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Your Master Password</DialogTitle>
          <DialogDescription>
            Create a strong master password to protect your vault. You will use this to unlock your credentials.
            PLEASE REMEMBER THIS PASSWORD CANNOT BE CHANGED IF YOU FORGET IT!
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
                      <Input type={showPassword ? 'text' : 'password'} {...field} />
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
              {form.formState.isSubmitting ? 'Saving...' : 'Save Master Password'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}