'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Mail, ArrowLeft, Send, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error,setError]=useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);setError('');
    try { const response=await fetch('/api/v1/auth/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.error);setSubmitted(true); } catch(e) { setError(e instanceof Error?e.message:'Recovery request failed.'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset Credentials</h1>
            <p className="text-sm text-slate-500">
              Enter your institutional university email address to receive password reset instructions.
            </p>
          </div>

          {error && <p role="alert" className="text-rose-700">{error}</p>}
          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-sm font-semibold text-emerald-900">Recovery Instructions Sent</h2>
              <p className="text-xs text-emerald-700 leading-relaxed">
                If an institutional account matching <strong className="font-semibold">{email}</strong> exists,
                a secure password reset link has been dispatched.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@university.ac.ke"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-900 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold text-sm transition shadow-sm hover:shadow disabled:opacity-50"
              >
                <span>{loading ? 'Transmitting...' : 'Send Reset Link'}</span>
                <Send className="w-4 h-4 text-academic-gold-400" />
              </button>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-academic-gold-600 shrink-0 mt-0.5" />
                <span>
                  For security reasons, password recovery tokens expire in 15 minutes. For immediate account unlocks,
                  reach the ICT Helpdesk at <span className="font-medium text-slate-700">ict@university.ac.ke</span>.
                </span>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
