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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar userEmail={`${role}@university.ac.ke`} userRole={ROLE_LABELS[role]} />
      <div className="flex-1 flex">
        <Sidebar role={role} />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl">
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Loading dashboard shell...</div>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
