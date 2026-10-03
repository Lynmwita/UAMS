'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') as UserRole) || 'super_admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar userEmail={`${role}@university.ac.ke`} userRole={ROLE_LABELS[role]} />
      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar role={role} />
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
