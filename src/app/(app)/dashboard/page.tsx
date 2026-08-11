'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/auth-provider';
import { LoadingScreen } from '@/components/loading-screen';

// Lazy-load the heavy dashboard components so their JS chunks (crypto,
// react-hook-form, zod, etc.) are only fetched when actually needed.
const MasterPasswordDialog = dynamic(
  () =>
    import('@/components/dashboard/master-password-dialog').then(
      (m) => m.MasterPasswordDialog
    ),
  { loading: () => <LoadingScreen fullScreen={false} label="Unlocking vault…" /> }
);

const CredentialsTable = dynamic(
  () =>
    import('@/components/dashboard/credentials-table').then(
      (m) => m.CredentialsTable
    ),
  { loading: () => <LoadingScreen fullScreen={false} label="Loading vault…" /> }
);

export default function DashboardPage() {
  const { user, masterKey } = useAuth();

  if (user?.email === 'admin@example.com') {
    return <CredentialsTable />;
  }

  if (!masterKey) {
    return <MasterPasswordDialog />;
  }

  return <CredentialsTable />;
}