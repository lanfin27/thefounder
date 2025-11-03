'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAdminStatus } from '@/lib/auth-utils';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function verifyAdmin() {
      const adminStatus = await checkAdminStatus();

      if (!adminStatus) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ink-200 border-t-green-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
