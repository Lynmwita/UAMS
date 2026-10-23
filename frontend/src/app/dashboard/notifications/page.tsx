'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, Radio, Phone, Clock, ShieldCheck, Mail, RefreshCcw, AlertTriangle } from 'lucide-react';
import { NotificationLog } from '@/types';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [providers, setProviders] = useState<any>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const statusStyle = (status: string) =>
    status === 'delivered' || status === 'sent'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'failed'
        ? 'bg-rose-100 text-rose-800'
        : 'bg-amber-100 text-amber-800';

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'retry' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: data.error || 'Retry failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setRetryingId(null);
    }
  };
  const [activeTab, setActiveTab] = useState<'history' | 'send'>('history');

  const [form, setForm] = useState({
    recipient_type: 'student',
    recipient_identifier: '+254712345678',
    recipient_name: 'Alex Kiptoo Kimutai',
    channel: 'sms',
    subject: 'Fee & Academic Clearance Alert',
    message_content: 'UAMS NOTIFICATION: Your examination card for Semester 1 has been approved. Log in to your portal to download.',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        if (json.meta?.providers) setProviders(json.meta.providers);
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
        setMessage({ type: 'success', text: data.message });
        fetchLogs();
        setActiveTab('history');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to dispatch.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-academic-navy-900" />
            SMS & Notification Dispatch Hub
          </h1>
          <p className="text-sm text-slate-500">
            Institutional Africa&apos;s Talking SMS Gateway & Automated Email notification delivery telemetry.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dispatch Audit Log
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'send' ? 'bg-academic-gold-500 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Compose SMS / Broadcast
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                {providers
                  ? providers.sms.configured
                    ? `Africa's Talking SMS: Live${providers.sms.sandbox ? ' (Sandbox)' : ''}${providers.sms.senderId ? ` - Sender: ${providers.sms.senderId}` : ''} - Email: ${providers.email.configured ? providers.email.provider : 'not configured'}`
                    : 'No live SMS/email provider configured - MOCK mode: messages are simulated inside UAMS only'
                  : 'Delivery provider status loads with the log'}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">Total Dispatched: {logs.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.map((l) => (
              <div key={l.id} className="p-4 hover:bg-slate-50 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-academic-navy-900">{l.recipient_name}</span>
                    <span className="text-xs font-mono text-slate-500">({l.recipient_identifier})</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded uppercase bg-slate-100 text-slate-700">
                      {l.channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{l.created_at}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyle(l.status)}`}>
                      {l.status}
                    </span>
                    {(l.status === 'failed' || l.status === 'queued') && (
                      <button
                        type="button"
                        onClick={() => handleRetry(l.id)}
                        disabled={retryingId === l.id || (l.attempts || 0) >= 3}
                        title={(l.attempts || 0) >= 3 ? 'Maximum retry limit of 3 reached - permanently failed to prevent airtime exhaustion' : 'Retry this notification'}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-academic-navy-900 text-white hover:bg-academic-navy-800 disabled:opacity-50 transition"
                      >
                        <RefreshCcw className="h-3 w-3" />
                        {(l.attempts || 0) >= 3 ? 'Max retries' : retryingId === l.id ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-700 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {l.message_content}
                </p>
                {(l.delivery_error || (l as any).error_message) && (
                  <p className="flex items-start gap-1.5 text-[11px] font-medium text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{l.delivery_error || (l as any).error_message}</span>
                  </p>
                )}
                {(l.provider || l.cost || l.provider_message_id || l.attempts) && (
                  <p className="text-[10px] font-mono text-slate-400">
                    via {l.provider}
                    {l.dispatch_mode ? ` (${l.dispatch_mode})` : ''}
                    {l.cost ? ` - cost ${typeof l.cost === 'number' ? `KES ${l.cost}` : l.cost}` : ''}
                    {l.provider_message_id ? ` - id ${l.provider_message_id}` : ''}
                    {l.attempts ? ` - attempts ${l.attempts}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-academic-navy-900" />
            Direct Notification Dispatch
          </h2>
          <form onSubmit={handleDispatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-academic-navy-900"
                >
                  <option value="sms">SMS (Africa&apos;s Talking Gateway)</option>
                  <option value="email">Institutional Email</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Recipient Type</label>
                <select
                  value={form.recipient_type}
                  onChange={(e) => setForm({ ...form, recipient_type: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-academic-navy-900"
                >
                  <option value="student">Individual Student</option>
                  <option value="broadcast">University Broadcast</option>
                  <option value="staff">Lecturers & Staff</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number / Email</label>
                <input
                  type="text"
                  value={form.recipient_identifier}
                  onChange={(e) => setForm({ ...form, recipient_identifier: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quick Templates (privacy-safe: details stay in the portal)</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Fee Update', text: 'UAMS FEE UPDATE: A change was made to your fee statement. Please log into the Student Portal to view your balance and details. Do not share your password or PIN with anyone.' },
                  { name: 'Exam Card Ready', text: 'UAMS NOTICE: Your examination clearance card is ready. Please log into the Student Portal to download it. Do not share your password or PIN with anyone.' },
                  { name: 'Admissions', text: 'UAMS ADMISSIONS: There is an update on your application. Please log into the portal to view it and complete any next steps. Do not share your password or PIN with anyone.' },
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => setForm({ ...form, message_content: tpl.text })}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-academic-navy-100 text-slate-700 border border-slate-200 transition"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">SMS is plain text: never include passwords, PINs or account numbers - the content guard will block them.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
              <textarea
                rows={4}
                value={form.message_content}
                onChange={(e) => setForm({ ...form, message_content: e.target.value })}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-academic-navy-900"
              />
              <span className="text-[10px] text-slate-400">Length: {form.message_content.length} characters (1 SMS segment)</span>
            </div>

            <button
              type="submit"
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Institutional Notification
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
