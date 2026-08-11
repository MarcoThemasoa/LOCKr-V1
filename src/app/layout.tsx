import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-provider';
import { GameToast } from '@/components/game-toast';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/theme-provider';

// Body font: Inter (Google Fonts, self-hosted via next/font).
const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

// Code font: Source Code Pro (Google Fonts, self-hosted via next/font).
const fontCode = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-code',
});

// Headline/brand font: Telma (script font from Indian Type Foundry).
// Loaded at runtime from the Fontshare CDN (see <head> below) and exposed
// through the --font-headline CSS variable defined in globals.css.


export const metadata: Metadata = {
  title: 'LOCKr - Secure Password Manager',
  description: 'Your secure and private password manager.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inter & Source Code Pro are self-hosted via next/font (see above).
            Only the Telma brand font is loaded at runtime from Fontshare. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=telma@400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased", fontBody.variable, fontCode.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            {/* Always-mounted game-style notifications (e.g. "Unlocked!") */}
            <GameToast />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
