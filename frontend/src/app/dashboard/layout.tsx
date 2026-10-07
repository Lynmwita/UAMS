'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { AuthSession } from '@/lib/auth/session';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (!res.ok) {
          router.replace('/login?redirect=/dashboard');
          return;
        }
        const data = await res.json();
        if (isMounted) {
          if (data?.success && data?.user) {
            setSession({
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              authenticatedAt: new Date().toISOString(),
            });
            setIsVerifying(false);
          } else {
            router.replace('/login?redirect=/dashboard');
          }
        }
      } catch {
        router.replace('/login?redirect=/dashboard');
      }
    }
    verifySession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-academic-navy-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium">Verifying institutional credentials...</p>
        </div>
      </div>
    );
  }

  // Derive role securely:
  // Administrative roles may preview subordinate views via ?role=, but standard roles cannot escalate
  const requestedRole = searchParams.get('role') as UserRole;
  let activeRole: UserRole = session?.role || 'student';

  if (requestedRole && (session?.role === 'super_admin' || session?.role === 'admin')) {
    activeRole = requestedRole;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar userEmail={session?.email || `${activeRole}@university.ac.ke`} userRole={ROLE_LABELS[activeRole]} />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar role={activeRole} />
        <main className="min-w-0 w-full max-w-7xl mx-auto flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 text-slate-900 p-8">Loading academic portal...</div>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

