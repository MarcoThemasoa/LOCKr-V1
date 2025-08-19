import { SignupForm } from '@/components/auth/signup-form';
import { Logo } from '@/components/logo';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center space-y-8">
        <Logo />
        <SignupForm />
      </div>
    </main>
  );
}
