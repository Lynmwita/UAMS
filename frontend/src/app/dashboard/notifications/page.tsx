'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, Radio, Phone, Clock, ShieldCheck, Mail, AlertTriangle, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { NotificationLog } from '@/types';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'send'>('history');
  const [meta, setMeta] = useState<{ mode?: string; airtime_brakes_active?: boolean; max_retries?: number }>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    recipient_type: 'student' as NotificationLog['recipient_type'],
    recipient_identifier: '+254712345678',
    recipient_name: 'Alex Kiptoo Kimutai',
    channel: 'sms' as 'sms' | 'email',
    subject: 'Fee & Academic Clearance Alert',
    message_content: 'UAMS NOTICE: Your fee payment has been verified. Check the student portal for your updated statement.',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        if (json.meta) setMeta(json.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: data.warning ? 'warning' : 'success',
          text: data.warning ? `${data.message} [Notice: ${data.warning}]` : data.message,
        });
        fetchLogs();
        setActiveTab('history');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to dispatch notification.' });
        fetchLogs();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred during dispatch.' });
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/notifications/${id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Retry attempt rejected.' });
      }
      fetchLogs();
    } catch {
      setMessage({ type: 'error', text: 'Failed to communicate with retry endpoint.' });
    } finally {
      setRetryingId(null);
    }
  };

  const charCount = form.message_content.length;
  const segments = charCount > 160 ? Math.ceil(charCount / 153) : (charCount > 0 ? 1 : 0);
  const estimatedCost = segments * 0.80;

  const setTemplate = (type: 'fee' | 'exam' | 'admissions') => {
    if (type === 'fee') {
      setForm(prev => ({
        ...prev,
        channel: 'sms',
        subject: 'Institutional Fee Statement Update',
        message_content: 'UAMS NOTICE: Your student fee balance has changed. Please log in to the student portal to inspect your statement.',
      }));
    } else if (type === 'exam') {
      setForm(prev => ({
        ...prev,
        channel: 'sms',
        subject: 'Examination Clearance Notification',
        message_content: 'UAMS NOTICE: Your examination clearance card for Semester 1, 2026/2027 is ready. Download it from the portal.',
      }));
    } else if (type === 'admissions') {
      setForm(prev => ({
        ...prev,
        channel: 'sms',
        subject: 'Institutional Admissions Offer',
        message_content: 'UAMS ADMISSIONS: An update has been posted to your application. Log in to the applicant portal to view your status.',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-academic-navy-900" />
            SMS & Notification Dispatch Hub
          </h1>
          <p className="text-sm text-slate-500">
            Institutional Africa&apos;s Talking Gateway & Automated Email delivery telemetry with airtime brakes.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dispatch Telemetry Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'send' ? 'bg-academic-gold-500 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Compose Notification
          </button>
        </div>
      </div>

      {/* Financial Brakes & Safety Telemetry Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
            meta.mode === 'production'
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            <span className={`h-2 w-2 rounded-full ${meta.mode === 'production' ? 'bg-rose-600 animate-ping' : 'bg-emerald-600 animate-pulse'}`} />
            {meta.mode === 'production' ? 'LIVE PRODUCTION SMS' : 'SANDBOX MODE — BRAKES ON'}
          </span>
          <span className="text-slate-600">
            {meta.mode === 'production'
              ? 'Live airtime consumption active. Only staff-authorized sends permitted.'
              : 'Zero airtime consumed. Safe simulation with provider ID and cost telemetry.'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-600 font-mono">
          <span className="flex items-center gap-1" title="Hard limit per message to avoid infinite airtime burning loops">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Max Retries: 3
          </span>
          <span className="flex items-center gap-1" title="API keys remain strictly server-side">
            <Lock className="h-4 w-4 text-slate-500" /> Keys Server-Only
          </span>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab: History / Telemetry */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">Africa&apos;s Talking Gateway Telemetry</span>
            </div>
            <span className="text-xs font-mono text-slate-500">Total Records: {logs.length}</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading delivery telemetry...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No dispatch records found.</div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Message Content</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Cost</th>
                    <th className="p-3.5">Retries</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{l.recipient_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{l.recipient_identifier}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{l.recipient_type}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {l.channel}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs md:max-w-md">
                        <p className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 truncate" title={l.message_content}>
                          {l.message_content}
                        </p>
                        {l.provider_message_id && (
                          <div className="text-[10px] font-mono text-slate-400 mt-1">ID: {l.provider_message_id}</div>
                        )}
                        {l.error_message && (
                          <div className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            {l.error_message}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          l.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : l.status === 'sent'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : l.status === 'failed'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] font-medium">
                        {l.cost ? `KES ${Number(l.cost).toFixed(2)}` : 'KES 0.00'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        <span className={(l.retry_count ?? 0) >= 3 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {l.retry_count ?? 0} / 3
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {l.status !== 'delivered' && (
                          <button
                            onClick={() => handleRetry(l.id)}
                            disabled={retryingId === l.id || (l.retry_count ?? 0) >= 3}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                              (l.retry_count ?? 0) >= 3
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-academic-navy-900 hover:bg-academic-navy-950 text-white shadow-sm'
                            }`}
                            title={(l.retry_count ?? 0) >= 3 ? 'Max retry limit (3) reached to prevent airtime drain' : 'Retry message dispatch'}
                          >
                            <RefreshCw className={`h-3 w-3 ${retryingId === l.id ? 'animate-spin' : ''}`} />
                            {(l.retry_count ?? 0) >= 3 ? 'Locked (3/3)' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Compose Notification */}
      {activeTab === 'send' && (
        <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-academic-navy-900" />
              Direct Notification Dispatch
            </h2>
            <div className="text-[11px] text-slate-500 font-medium">
              E.164 Cleaned &bull; Privacy Guard Active
            </div>
          </div>

          {/* Quick Safe Templates */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              KDPA-Compliant Minimal Templates
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTemplate('fee')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
              >
                &bull; Fee Update Notice
              </button>
              <button
                type="button"
                onClick={() => setTemplate('exam')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
              >
                &bull; Exam Clearance Card
              </button>
              <button
                type="button"
                onClick={() => setTemplate('admissions')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition"
              >
                &bull; Admissions Decision
              </button>
            </div>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value as any })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-academic-navy-900"
                >
                  <option value="sms">SMS (Africa&apos;s Talking Gateway)</option>
                  <option value="email">Institutional Email</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Recipient Scope</label>
                <select
                  value={form.recipient_type}
                  onChange={(e) => setForm({ ...form, recipient_type: e.target.value as any })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-academic-navy-900"
                >
                  <option value="student">Individual Student</option>
                  <option value="broadcast">University Broadcast</option>
                  <option value="staff">Lecturers & Staff</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  placeholder="e.g. Alex Kiptoo"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {form.channel === 'sms' ? 'Kenyan Mobile Number (E.164)' : 'Recipient Email Address'}
                </label>
                <input
                  type="text"
                  value={form.recipient_identifier}
                  onChange={(e) => setForm({ ...form, recipient_identifier: e.target.value })}
                  placeholder={form.channel === 'sms' ? '+254712345678 or 0712345678' : 'student@uams.ac.ke'}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
                {form.channel === 'sms' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Format: +254 7XX... or 07XX... (Auto-normalizes to E.164)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Header</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Institutional Alert Title"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Message Content</label>
                <div className="text-[10px] font-mono text-slate-500">
                  {charCount} characters &bull; {segments} segment{segments === 1 ? '' : 's'} (~KES {estimatedCost.toFixed(2)})
                </div>
              </div>
              <textarea
                rows={4}
                value={form.message_content}
                onChange={(e) => setForm({ ...form, message_content: e.target.value })}
                required
                placeholder="Type notice body here..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-academic-navy-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Privacy Tip: Keep text brief. Advise recipient to check the student portal rather than putting balances or credentials in clear text.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              Dispatch Institutional Notice
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
