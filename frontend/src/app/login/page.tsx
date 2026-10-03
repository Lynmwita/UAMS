'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, Landmark } from 'lucide-react';
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

    setTimeout(() => {
      setLoading(false);
      router.push(`/dashboard?role=${selectedRole}`);
    }, 500);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(`${role}@university.ac.ke`);
    setPassword('DemoPassword2026!');
    router.push(`/dashboard?role=${role}`);
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
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {error}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Authenticate'}</span>
              <ArrowRight className="h-4 w-4 text-academic-gold-400" />
            </button>
          </form>

          {/* Quick Role Tester */}
          <div className="mt-8 border-t border-slate-200 pt-5">
            <div className="flex items-center space-x-1.5 text-xs text-academic-navy-900 font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="h-4 w-4 text-academic-navy-700" />
              <span>Quick Test Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('super_admin')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('registrar')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
              >
                Registrar
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('lecturer')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
              >
                Lecturer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('finance_officer')}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-academic-navy-950 font-medium text-left transition"
              >
                Finance Officer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                className="col-span-2 p-2.5 bg-academic-gold-50 hover:bg-academic-gold-100 border border-academic-gold-300 text-academic-navy-950 text-center transition font-bold rounded-lg"
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
    <Suspense fallback={<div className="min-h-screen bg-slate-50 text-slate-900 p-8">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
