'use client';

import { useAuth } from '@/contexts/auth-provider';
import { MasterPasswordDialog } from '@/components/dashboard/master-password-dialog';
import { CredentialsTable } from '@/components/dashboard/credentials-table';

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
