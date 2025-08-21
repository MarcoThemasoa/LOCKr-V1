'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabaseClient';
import { generateKey, encrypt, decrypt, base64ToUint8Array, arrayBufferToBase64 } from '@/lib/crypto';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Eye, EyeOff, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const masterPasswordSchema = z
  .object({
    currentMasterPassword: z
      .string()
      .min(1, 'Current master password is required.'),
    newMasterPassword: z
      .string()
      .min(8, 'Master password must be at least 8 characters.'),
    confirmMasterPassword: z.string(),
  })
  .refine((data) => data.newMasterPassword === data.confirmMasterPassword, {
    message: "Passwords don't match",
    path: ['confirmMasterPassword'],
  });

export default function SettingsPage() {
  const { user, setUser, setMasterKey } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [showCurrentMasterPassword, setShowCurrentMasterPassword] = useState(false);
  const [showNewMasterPassword, setShowNewMasterPassword] = useState(false);
  const [showConfirmMasterPassword, setShowConfirmMasterPassword] = useState(false);

  const masterForm = useForm<z.infer<typeof masterPasswordSchema>>({
    resolver: zodResolver(masterPasswordSchema),
    defaultValues: {
      currentMasterPassword: '',
      newMasterPassword: '',
      confirmMasterPassword: '',
    },
  });

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onChangePassword(values: z.infer<typeof passwordSchema>) {
    if (!user || !user.email) return;

    // For admin user, just show a toast
    if (user.email === 'admin@example.com') {
      toast({ title: 'Password updated for admin (demo only)!' });
      form.reset();
      setCurrentPassword('');
      return;
    }

    // Supabase password update
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) {
        throw error;
      }
      toast({ title: 'Password updated successfully!' });
      form.reset();
      setCurrentPassword('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update password. Check your current password.',
      });
    }
  }

  async function onChangeMasterPassword(values: z.infer<typeof masterPasswordSchema>) {
    if (!user) return;

    // Admin demo only
    if (user.email === 'admin@example.com') {
      toast({ title: 'Master password updated (demo only)!' });
      masterForm.reset();
      return;
    }

    try {
      // Fetch current verification record
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('salt, iv, verification')
        .eq('id', user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (userRow) {
        // Verify current master password
        const salt = base64ToUint8Array(userRow.salt);
        const iv = base64ToUint8Array(userRow.iv);
        const verification = base64ToUint8Array(userRow.verification);

        const oldKey = await generateKey(values.currentMasterPassword, salt);
        // Will throw if incorrect
        await decrypt(verification.buffer, oldKey, iv);

        // Derive new key and new verification values
        const newSalt = crypto.getRandomValues(new Uint8Array(16));
        const newIv = crypto.getRandomValues(new Uint8Array(12));
        const newKey = await generateKey(values.newMasterPassword, newSalt);
        const newVerification = await encrypt('LOCKrVerification', newKey, newIv);

        // Re-encrypt all credentials with new key
        const { data: creds, error: credErr } = await supabase
          .from('credentials')
          .select('id, password, iv')
          .eq('userId', user.id);
        if (credErr) throw credErr;

        if (creds && creds.length > 0) {
          for (const c of creds) {
            const plain = await decrypt(
              base64ToUint8Array(c.password).buffer,
              oldKey,
              base64ToUint8Array(c.iv)
            );
            const rowIv = crypto.getRandomValues(new Uint8Array(12));
            const { encryptedData } = await encrypt(plain, newKey, rowIv);
            const { error: upErr } = await supabase
              .from('credentials')
              .update({
                password: arrayBufferToBase64(encryptedData),
                iv: arrayBufferToBase64(rowIv.buffer),
              })
              .eq('id', c.id);
            if (upErr) throw upErr;
          }
        }

        // Update users row with new verification
        const { error: updateUserErr } = await supabase
          .from('users')
          .update({
            salt: arrayBufferToBase64(newSalt.buffer),
            iv: arrayBufferToBase64(newIv.buffer),
            verification: arrayBufferToBase64(newVerification.encryptedData),
          })
          .eq('id', user.id);
        if (updateUserErr) throw updateUserErr;

        setMasterKey(newKey);
        toast({ title: 'Master password changed successfully.' });
        masterForm.reset();
      } else {
        // No existing master password set: set it now
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const newKey = await generateKey(values.newMasterPassword, salt);
        const verification = await encrypt('LOCKrVerification', newKey, iv);

        const { error: insertErr } = await supabase.from('users').insert([
          {
            id: user.id,
            salt: arrayBufferToBase64(salt.buffer),
            iv: arrayBufferToBase64(iv.buffer),
            verification: arrayBufferToBase64(verification.encryptedData),
          },
        ]);
        if (insertErr) throw insertErr;

        setMasterKey(newKey);
        toast({ title: 'Master password set successfully.' });
        masterForm.reset();
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'Failed to change master password. Verify your current master password and try again.',
      });
    }
  }

  async function onDeleteAccount() {
    if (!user) return;

    try {
      // Delete user's credentials
      const { error: credError } = await supabase
        .from('credentials')
        .delete()
        .eq('userId', user.id);

      // Delete user metadata
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      // Delete user from Auth
      const { error: authError } = await supabase.auth.signOut();
      setUser(null);
      setMasterKey(null);

      if (credError || userError || authError) {
        throw credError || userError || authError;
      }

      toast({ title: 'Account deleted successfully.' });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
      });
      setIsDeleteDialogOpen(false);
    }
  }

  return (
    <div className="space-y-8 p-4">
      <h1 className="font-headline text-3xl font-bold">Settings</h1>
      <Card className='bg-background border-2 border-neutral-200 dark:border-primary'>
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/5 to-transparent rounded-l-md" />
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password here. This will not change your Master Password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onChangePassword)}
              className="space-y-4"
            >
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                  >
                    {showCurrentPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormItem>
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                     <div className="relative">
                      <FormControl>
                        <Input type={showNewPassword ? "text" : "password"} {...field} />
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
                        <Input type={showConfirmPassword ? "text" : "password"} {...field} />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className='bg-background border-2 border-neutral-200 dark:border-primary'>
        <CardHeader>
          <CardTitle>Change Master Password</CardTitle>
          <CardDescription>
            Update your Master Password. This will re-encrypt all your stored credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...masterForm}>
            <form
              onSubmit={masterForm.handleSubmit(onChangeMasterPassword)}
              className="space-y-4"
            >
              <FormField
                control={masterForm.control}
                name="currentMasterPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Master Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showCurrentMasterPassword ? 'text' : 'password'} {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowCurrentMasterPassword((prev) => !prev)}
                      >
                        {showCurrentMasterPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={masterForm.control}
                name="newMasterPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Master Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showNewMasterPassword ? 'text' : 'password'} {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowNewMasterPassword((prev) => !prev)}
                      >
                        {showNewMasterPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={masterForm.control}
                name="confirmMasterPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Master Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showConfirmMasterPassword ? 'text' : 'password'} {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowConfirmMasterPassword((prev) => !prev)}
                      >
                        {showConfirmMasterPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={masterForm.formState.isSubmitting}>
                {masterForm.formState.isSubmitting ? 'Updating...' : 'Change Master Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="bg-background border-2 border-destructive">
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, all your saved credentials, and your user data. This action cannot be reversed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteAccount}>
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}