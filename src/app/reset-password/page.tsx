import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Logo } from '@/components/logo';

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center space-y-8">
        <Logo />
        <ResetPasswordForm />
      </div>
    </main>
  );
}
