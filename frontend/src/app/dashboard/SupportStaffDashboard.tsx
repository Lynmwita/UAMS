'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { describeSupportAssignment } from '@/lib/hr/support-assignment';
import { StaffAvatar, StaffIdCardModal } from '@/components/StaffIdCard';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  IdCard,
  Megaphone,
  User,
} from 'lucide-react';

type Notice = {
  id?: string;
  title?: string;
  message?: string;
  created_at?: string;
};

type CampusEvent = {
  id?: string;
  title?: string;
  description?: string;
  starts_at?: string;
  location?: string;
};

/**
 * Support staff dashboard. Shows only what a support staff member needs:
 * their own duty roster, general announcements, campus events, and their
 * own profile. It never renders institutional totals, academic records,
 * money figures, or administration screens: support staff have no access
 * to those modules, and this dashboard must not link to them either.
 *
 * The roster card is personalised by the person's own assignment (job
 * title + department from their own staff record): cleaners see cleaning
 * zones, cooks see kitchen shifts, drivers see routes, security see
 * posts, gardeners see grounds zones, library attendants see library
 * desk shifts. There is no roster data source in the codebase yet, so
 * every category shows its honest empty state instead of invented
 * shifts; the labels only change what the empty card is called.
 */
export default function SupportStaffDashboard() {
  const { firstName, lastName, email } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [assignment, setAssignment] = useState<{
    job_title?: string | null;
    department_name?: string | null;
    staff_number?: string | null;
    photo_url?: string | null;
    phone?: string | null;
    joined_date?: string | null;
  } | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    async function read(path: string) {
      const res = await fetch(path, { signal: abort.signal });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Records could not be loaded.');
      return json.data;
    }
    // Own staff record only (job title + department drive the roster
    // labels). A missing record is not an error: the dashboard falls
    // back to generic labels and the session profile.
    read('/api/v1/staff/me')
      .then((data) => { if (!abort.signal.aborted) setAssignment(data); })
      .catch(() => { /* generic labels below */ });
    Promise.all([read('/api/v1/announcements'), read('/api/v1/events')])
      .then(([noticeData, eventData]) => {
        if (abort.signal.aborted) return;
        setNotices(Array.isArray(noticeData) ? noticeData : []);
        setEvents(Array.isArray(eventData) ? eventData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        setError(err?.message || 'Records could not be loaded.');
        setLoading(false);
      });
    return () => abort.abort();
  }, []);

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Support staff member';
  // Roster labels personalised by the person's own assignment (job title
  // + department from their own staff record). No shifts are invented:
  // when no roster data exists, every category shows its honest empty
  // state below.
  const roster = describeSupportAssignment(assignment?.job_title, assignment?.department_name);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-3xl font-bold text-academic-navy-950 mt-2">Welcome back, {displayName}</h1>
        <p className="text-slate-600 mt-2">
          Support staff workspace. This page shows only your own roster, general notices and campus events.
        </p>
      </header>

      <section aria-label="My profile" className="border rounded-xl p-5 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <StaffAvatar name={displayName} photoUrl={assignment?.photo_url || undefined} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-slate-900">{displayName}</h2>
              </div>
              <p className="text-sm text-slate-500">{email}</p>
              <p className="text-sm text-slate-600 font-medium">Role: Support Staff</p>
              {roster.assignmentLine && (
                <p className="text-sm text-slate-600">Assignment: {roster.assignmentLine}</p>
              )}
              {assignment?.staff_number && (
                <p className="text-xs font-mono font-bold text-academic-navy-900 mt-1">
                  Staff ID: {assignment.staff_number}
                </p>
              )}
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowIdCard(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-academic-navy-950 hover:bg-academic-navy-900 text-white rounded-xl text-xs font-bold shadow-sm transition border border-academic-gold-500/40"
            >
              <IdCard className="w-4 h-4 text-academic-gold-400" />
              <span>View My Staff ID Card</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          Profile details and photo are managed by the registrar or an administrator. Ask them if anything here needs updating.
        </p>
      </section>

      {showIdCard && (
        <StaffIdCardModal
          staff={{
            name: displayName,
            staffNumber: assignment?.staff_number || 'EUC/STAFF/000',
            jobTitle: assignment?.job_title || 'Support Staff',
            department: assignment?.department_name || 'General Campus Support & Operations',
            email: email || '',
            phone: assignment?.phone || '',
            photoUrl: assignment?.photo_url || undefined,
            joinedDate: assignment?.joined_date || undefined,
            isActive: true,
          }}
          onClose={() => setShowIdCard(false)}
        />
      )}

      <section aria-label="My duty roster" className="border rounded-xl p-5 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold">{roster.title}</h2>
        </div>
        <p className="text-sm text-slate-600">
          {roster.empty} {roster.hint}
        </p>
      </section>

      <section aria-label="Announcements" className="border rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold">Announcements</h2>
          </div>
          <Link href="/dashboard/announcements" className="text-sm text-academic-navy-700 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading notices…</p>}
        {error && <p role="alert" className="text-sm text-amber-900">{error}</p>}
        {!loading && !error && notices.length === 0 && (
          <p className="text-sm text-slate-500">No announcements right now.</p>
        )}
        <ul className="space-y-2">
          {notices.slice(0, 5).map((n, i) => (
            <li key={n.id || i} className="text-sm">
              <span className="font-medium text-slate-800">{n.title || 'Notice'}</span>
              {n.created_at && <span className="text-slate-500"> — {new Date(n.created_at).toLocaleDateString('en-KE')}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Campus events" className="border rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold">Campus events</h2>
          </div>
          <Link href="/dashboard/events" className="text-sm text-academic-navy-700 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading events…</p>}
        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-slate-500">No campus events right now.</p>
        )}
        <ul className="space-y-2">
          {events.slice(0, 5).map((e, i) => (
            <li key={e.id || i} className="text-sm">
              <span className="font-medium text-slate-800">{e.title || 'Event'}</span>
              {e.starts_at && <span className="text-slate-500"> — {new Date(e.starts_at).toLocaleDateString('en-KE')}</span>}
              {e.location && <span className="text-slate-500"> · {e.location}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
