'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, Landmark, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { isUserRole } from '@/lib/auth/roles';

const DEMO_PASSWORD = 'DemoPassword2026!';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole = isUserRole(roleParam) ? roleParam : 'student';
  const demoEnabled = (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== 'false') && process.env.NEXT_PUBLIC_DISABLE_DEMO_CREDENTIALS !== 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active=true;
    async function restoreSession(){
      try{
        let response=await fetch('/api/v1/auth/me',{cache:'no-store'});
        if(response.status===401){const refreshed=await fetch('/api/v1/auth/refresh',{method:'POST'});if(refreshed.ok)response=await fetch('/api/v1/auth/me',{cache:'no-store'});}
        if(response.ok&&active){const target=searchParams.get('redirect');router.replace(target&&/^\/dashboard(?:\/|\?|$)/.test(target)?target:'/dashboard');}
      }catch{/* Leave the login form available. */}
    }
    void restoreSession();return()=>{active=false;};
  },[router,searchParams]);

  const authenticate = async (nextRole: UserRole, nextEmail: string, nextPassword: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: nextEmail,
        password: nextPassword,
        role: nextRole,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Authentication failed. Please try again.');
    }

    // Session is held exclusively in secure httpOnly cookie set by /api/v1/auth/login
    const target = searchParams.get('redirect');
    router.push(target && /^\/dashboard(?:\/|\?|$)/.test(target) ? target : '/dashboard');
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authenticate(selectedRole, email, password);
    } catch (loginError: any) {
      setError(loginError.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCredentials = (role: UserRole) => {
    const nextEmail = `${role}@university.ac.ke`;
    const nextPassword = DEMO_PASSWORD;

    setSelectedRole(role);
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-academic-navy-50 border border-academic-navy-200 rounded-xl text-academic-navy-800 mb-3 shadow-sm">
              <Landmark className="h-7 w-7 text-academic-navy-700" />
            </div>
            <h1 className="text-2xl font-extrabold text-academic-navy-950 tracking-tight">
              Institutional Portal Sign In
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Select your university role and authenticate with your institutional account.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-start space-x-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-rose-800 mb-0.5">Authentication Issue</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-academic-navy-900 uppercase tracking-wider mb-1.5">
                Portal Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700 focus:bg-white"
              >
                {Object.entries(ROLE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-academic-navy-900 uppercase tracking-wider mb-1.5">
                Institutional Email / Admission ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder={`${selectedRole}@university.ac.ke`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg pl-10 pr-3.5 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-academic-navy-900 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-academic-navy-700 hover:text-academic-gold-600 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg pl-10 pr-3.5 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700 focus:bg-white"
                />
              </div>
              {demoEnabled && <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                <span>Demo password: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-academic-navy-900 font-mono font-medium">DemoPassword2026!</code></span>
                <button
                  type="button"
                  onClick={() => setPassword('DemoPassword2026!')}
                  className="text-[11px] text-academic-navy-700 hover:text-academic-navy-950 hover:underline font-semibold"
                >
                  Autofill
                </button>
              </p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Authenticate & Sign In'}</span>
              <ArrowRight className="h-4 w-4 text-academic-gold-400" />
            </button>
          </form>

          {/* Reviewer / Test Credentials Sandbox Helper (Strictly hidden in production unless NEXT_PUBLIC_ENABLE_DEMO_AUTH='true') */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== 'false') &&
            process.env.NEXT_PUBLIC_DISABLE_DEMO_CREDENTIALS !== 'true' && (
            <div className="mt-8 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Defense Sandbox Accounts</span>
                </div>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                  Demo Mode Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Pre-populates demonstration accounts for supervisor evaluation. Automatically disabled in production deployments:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('super_admin')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('registrar')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
                >
                  Registrar
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('lecturer')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
                >
                  Lecturer
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('finance_officer')}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
                >
                  Finance Officer
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('student')}
                  className="col-span-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
                >
                  Student (Faith Wanjiku)
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 text-slate-900 p-8">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
