'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { AuthContext } from '@/lib/auth/context';
import { canAccessPage } from '@/lib/auth/roles';
import type { AuthSession } from '@/lib/auth/session';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  useEffect(() => {
    let mounted = true;
    async function verify() {
      try {
        let res = await fetch('/api/v1/auth/me', { cache: 'no-store' });
        if (res.status === 401) {
          const refreshed = await fetch('/api/v1/auth/refresh', { method: 'POST' });
          if (refreshed.ok) res = await fetch('/api/v1/auth/me', { cache: 'no-store' });
        }
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Session expired');
        if (mounted) setSession({ ...data.user, authenticatedAt: new Date().toISOString() });
      } catch {
        if (mounted) { setSession(null); router.replace(`/login?redirect=${encodeURIComponent(pathname)}`); }
      }
    }
    void verify();
    const timer = setInterval(() => void verify(), 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, [pathname, router]);
  if (!session) return <div className="min-h-screen flex items-center justify-center">Verifying institutional credentials...</div>;
  const module = pathname.split('/')[2];
  const fullName = [session.firstName, session.lastName].filter(Boolean).join(' ');
  return (
    <AuthContext.Provider value={session}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar userEmail={session.email} userName={fullName} userRole={ROLE_LABELS[session.role]} />
        <div className="flex-1 flex flex-col md:flex-row">
          <Sidebar role={session.role} />
          <main className="min-w-0 w-full max-w-7xl mx-auto flex-1 p-4 sm:p-8 overflow-y-auto">
            {session.id.startsWith('usr-')?<p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Demonstration workspace. Academic records are sample data. Payment prompts remain pending until Safaricom confirmation.</p>:<p className="mb-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">Institutional workspace. Records load from your university database within your authorized role. Payment prompts remain pending until provider confirmation.</p>}
            {!module || canAccessPage(session.role, module) ? children : <p role="alert">Your role does not have access to this page.</p>}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
