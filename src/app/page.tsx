import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-8">
      {/* Elegant Tech Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 dark:opacity-40"></div>

      {/* Ambient Glowing Core */}
      <div className="absolute left-1/2 top-0 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/20 blur-[120px]"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Logo Placement */}
        <div className="group relative flex items-center justify-center drop-shadow-[0_0_15px_rgba(var(--primary),0.2)]">
          <Logo />
        </div>

        {/* Form Container */}
        <div className="w-full relative group">
          {/* Subtle hover glow behind the form card */}
          <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-primary/30 to-transparent opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100 dark:from-primary/20"></div>
          
          <div className="relative w-full shadow-2xl drop-shadow-xl">
            <LoginForm />
          </div>
        </div>

      </div>
    </main>
  );
}