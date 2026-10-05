'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, Radio, Phone, Clock, ShieldCheck, Mail } from 'lucide-react';
import { NotificationLog } from '@/types';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
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
              <span className="text-xs font-bold text-slate-800">Africa&apos;s Talking Gateway: Online (Shortcode: UAMS-KENYA)</span>
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {l.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {l.message_content}
                </p>
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
