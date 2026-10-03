'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'student';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Mock auth transition for demo / verification
    setTimeout(() => {
      setLoading(false);
      router.push(`/dashboard?role=${selectedRole}`);
    }, 600);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(`${role}@university.ac.ke`);
    setPassword('DemoPassword2026!');
    router.push(`/dashboard?role=${role}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-950 border border-blue-800 rounded-xl text-blue-400 mb-3">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sign In to UAMS
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select your university role and enter your credentials.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Portal Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ROLE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Institutional Email / ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder={`${selectedRole}@university.ac.ke`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-3.5 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-3.5 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Fast Role Simulator */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>Quick Test Role Selector</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('super_admin')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-left transition"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('registrar')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-left transition"
              >
                Registrar
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('lecturer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-left transition"
              >
                Lecturer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('finance_officer')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-left transition"
              >
                Finance Officer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                className="col-span-2 p-2 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 rounded text-blue-300 text-center transition font-medium"
              >
                Student Demo Portal
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
