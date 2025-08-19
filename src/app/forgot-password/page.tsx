import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Logo } from '@/components/logo';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center space-y-8">
        <Logo />
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
