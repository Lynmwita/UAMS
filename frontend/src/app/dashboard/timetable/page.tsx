'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  Calendar, Plus, Clock, MapPin, User, X, LayoutGrid, List,
  Download, CalendarPlus, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { generateTimetablePDF } from '@/lib/pdf/generator';

type Slot = {
  id: string; day: string; time: string; courseCode: string;
  courseTitle: string; room: string; lecturer: string;
};
type Venue = { id: string; name: string; building?: string; capacity: number | null };
type Course = { code: string; title: string; department: string; enrolled?: number };
type StaffMember = { first_name: string; last_name: string; job_title?: string };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_BLOCKS = [
  { label: '08:00 – 11:00', start: 8 * 60, end: 11 * 60 },
  { label: '11:00 – 14:00', start: 11 * 60, end: 14 * 60 },
  { label: '14:00 – 17:00', start: 14 * 60, end: 17 * 60 },
  { label: '17:30 – 20:30', start: 17 * 60 + 30, end: 20 * 60 + 30 },
];

const DEPT_COLORS: Record<string, string> = {
  'Computer Science': 'bg-blue-50 border-blue-200 text-blue-900',
  'Information Technology': 'bg-emerald-50 border-emerald-200 text-emerald-900',
  'Information Systems': 'bg-teal-50 border-teal-200 text-teal-900',
  'Business Administration': 'bg-amber-50 border-amber-200 text-amber-900',
  Economics: 'bg-orange-50 border-orange-200 text-orange-900',
};
const DEFAULT_CELL_COLOR = 'bg-slate-50 border-slate-200 text-slate-800';

function parseInterval(time: string): { start: number; end: number } | null {
  const m = time.match(/(\d{1,2}):(\d{2})\s*([AP])M?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*([AP])M?/i);
  if (!m) return null;
  const toMin = (h: string, mi: string, ap: string) => {
    let hh = parseInt(h, 10);
    if (ap.toUpperCase() === 'P' && hh !== 12) hh += 12;
    if (ap.toUpperCase() === 'A' && hh === 12) hh = 0;
    return hh * 60 + parseInt(mi, 10);
  };
  const s = toMin(m[1], m[2], m[3]);
  const e = toMin(m[4], m[5], m[6]);
  return s < e ? { start: s, end: e } : null;
}

export default function TimetablePage() {
  const { role } = useAuth();
  const canSchedule = ['super_admin', 'admin', 'registrar'].includes(role);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedDay, setSelectedDay] = useState('All');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [schedule, setSchedule] = useState<Slot[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/timetable').then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setSchedule(d.data);
        if (Array.isArray(d.venues)) setVenues(d.venues);
      }),
      fetch('/api/v1/courses').then(async (r) => {
        const d = await r.json();
        if (r.ok && Array.isArray(d.data)) {
          setCourses(d.data.map((c: any) => ({
            code: c.code, title: c.title || c.name, department: c.department, enrolled: c.enrolled,
          })));
        }
      }).catch(() => {}),
      fetch('/api/v1/staff').then(async (r) => {
        const d = await r.json();
        if (r.ok && Array.isArray(d.data)) setStaff(d.data);
      }).catch(() => {}),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const filteredSchedule = selectedDay === 'All' ? schedule : schedule.filter((s) => s.day === selectedDay);

  // Venue capacity lookup
  const venueCapacity = (room: string): number | null => {
    const norm = room.trim().toLowerCase();
    const v = venues.find((x) => {
      const n = x.name.toLowerCase();
      return norm === n || norm.startsWith(n);
    });
    return v ? v.capacity : null;
  };
  const courseEnrolled = (code: string): number | null => {
    const c = courses.find((x) => x.code === code);
    return c && typeof c.enrolled === 'number' ? c.enrolled : null;
  };
  const courseDept = (code: string): string => courses.find((x) => x.code === code)?.department || '';

  // Grid placement: slot -> time block index (by overlap)
  const slotBlock = (s: Slot): number => {
    const p = parseInterval(s.time);
    if (!p) return -1;
    const mid = (p.start + p.end) / 2;
    return TIME_BLOCKS.findIndex((b) => mid >= b.start && mid < b.end);
  };
  const gridCell = (day: string, blockIdx: number): Slot[] =>
    schedule.filter((s) => s.day === day && slotBlock(s) === blockIdx);

  // ---- Scheduling form ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day: 'Monday',
    time: '08:00 AM – 11:00 AM',
    courseCode: courses[0]?.code || 'BCS 311',
    room: venues[0]?.name || 'Lecture Hall 04',
    lecturer: '',
  });
  const [clashWarning, setClashWarning] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const selectedCourse = courses.find((c) => c.code === newSlot.courseCode);

  const checkClash = async () => {
    setChecking(true);
    setClashWarning([]);
    try {
      const q = new URLSearchParams({
        day: newSlot.day, time: newSlot.time,
        lecturer: newSlot.lecturer, room: newSlot.room,
      });
      const r = await fetch(`/api/v1/timetable/check-clash?${q}`);
      const d = await r.json();
      if (d.success && d.data.hasClash) {
        setClashWarning(d.data.clashes.map((c: any) => c.message));
      }
    } catch {
      setClashWarning(['Could not verify clashes — the server will block on submit if unsafe.']);
    } finally {
      setChecking(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule) return;
    setError('');
    setNotice('');
    try {
      const course = courses.find((c) => c.code === newSlot.courseCode);
      const r = await fetch('/api/v1/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSlot,
          courseTitle: course?.title || newSlot.courseCode,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSchedule((prev) => [...prev, d.data]);
      setIsModalOpen(false);
      setClashWarning([]);
      setNotice(`Scheduled ${d.data.courseCode} on ${d.data.day} ${d.data.time}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Timetable update failed.');
    }
  };

  const downloadPDF = () => {
    const doc = generateTimetablePDF(filteredSchedule);
    doc.save('uams-timetable.pdf');
  };
  const downloadICS = () => {
    window.location.href = '/api/v1/timetable/export.ics';
  };

  const venueLabel = (s: Slot) => {
    const cap = venueCapacity(s.room);
    const enrolled = courseEnrolled(s.courseCode);
    const over = cap !== null && enrolled !== null && enrolled > cap;
    return { cap, enrolled, over };
  };

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Academic Timetable & Lecture Scheduling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weekly semester lecture allocations, assigned venues, and lecturer rosters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <button
            onClick={downloadICS}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> ICS Feed
          </button>
          {canSchedule && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4 text-academic-gold-400" />
              <span>Schedule Lecture Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* View toggle + day pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['All', ...DAYS].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                selectedDay === day
                  ? 'bg-academic-navy-900 text-white shadow'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${view === 'list' ? 'bg-academic-navy-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${view === 'grid' ? 'bg-academic-navy-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Weekly Grid
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Active Lecture Session Schedule</h2>
            <span className="text-xs font-medium text-slate-500">{loaded ? `${filteredSchedule.length} Scheduled Slots` : 'Loading…'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Day</th>
                  <th className="px-5 py-3.5">Time Interval</th>
                  <th className="px-5 py-3.5">Course Unit</th>
                  <th className="px-5 py-3.5">Assigned Venue / Lab</th>
                  <th className="px-5 py-3.5">Lecturer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedule.map((item) => {
                  const { cap, enrolled, over } = venueLabel(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition cursor-pointer" onClick={() => setSelectedSlot(item)}>
                      <td className="px-5 py-3.5 font-bold text-academic-navy-950">
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-xs font-bold text-academic-navy-900">{item.day}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700 font-semibold">
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />{item.time}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-academic-navy-800">{item.courseCode}</span>
                        <p className="text-xs text-slate-500">{item.courseTitle}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-academic-gold-600" />{item.room}
                        </span>
                        <span className="ml-5 text-slate-500">
                          {enrolled !== null && cap !== null ? `[${enrolled}/${cap}]` : enrolled !== null ? `[${enrolled} enrolled · capacity not set]` : cap !== null ? `[capacity ${cap}]` : '[capacity not set]'}
                        </span>
                        {over && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="h-3 w-3" /> Over capacity!
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{item.lecturer}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500 w-32">Time</th>
                {(selectedDay === 'All' ? DAYS : [selectedDay]).map((d) => (
                  <th key={d} className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_BLOCKS.map((block, bi) => (
                <tr key={block.label}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500 whitespace-nowrap">{block.label}</td>
                  {(selectedDay === 'All' ? DAYS : [selectedDay]).map((d) => {
                    const cells = gridCell(d, bi);
                    return (
                      <td key={d} className="px-2 py-2 align-top">
                        {cells.length === 0 ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          cells.map((s) => {
                            const color = DEPT_COLORS[courseDept(s.courseCode)] || DEFAULT_CELL_COLOR;
                            return (
                              <button
                                key={s.id}
                                onClick={() => setSelectedSlot(s)}
                                className={`block w-full text-left border rounded-lg px-2.5 py-2 mb-1.5 hover:shadow transition ${color}`}
                              >
                                <span className="block font-mono font-bold text-xs">{s.courseCode}</span>
                                <span className="block text-[11px] opacity-80 truncate">{s.room}</span>
                                <span className="block text-[11px] opacity-70 truncate">{s.lecturer}</span>
                              </button>
                            );
                          })
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slot detail modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedSlot(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-academic-navy-950 font-mono">{selectedSlot.courseCode}</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-2.5 text-sm">
              <p className="font-semibold text-slate-800">{selectedSlot.courseTitle}</p>
              <p className="flex items-center gap-2 text-slate-600"><Calendar className="h-4 w-4 text-slate-400" />{selectedSlot.day}</p>
              <p className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 text-slate-400" />{selectedSlot.time}</p>
              <p className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{selectedSlot.room}</p>
              <p className="flex items-center gap-2 text-slate-600"><User className="h-4 w-4 text-slate-400" />{selectedSlot.lecturer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Schedule Lecture Allocation</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
                  <select value={newSlot.day} onChange={(e) => setNewSlot({ ...newSlot, day: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Time Slot</label>
                  <select value={newSlot.time} onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value="08:00 AM – 11:00 AM">08:00 AM – 11:00 AM</option>
                    <option value="11:00 AM – 01:00 PM">11:00 AM – 01:00 PM</option>
                    <option value="02:00 PM – 05:00 PM">02:00 PM – 05:00 PM</option>
                    <option value="05:30 PM – 08:30 PM">05:30 PM – 08:30 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit (from catalogue)</label>
                <select value={newSlot.courseCode}
                  onChange={(e) => setNewSlot({ ...newSlot, courseCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                  {courses.length === 0 && <option value={newSlot.courseCode}>{newSlot.courseCode}</option>}
                  {courses.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                </select>
                {selectedCourse && <p className="text-xs text-slate-500 mt-1">{selectedCourse.department}{selectedCourse.enrolled != null && ` · ${selectedCourse.enrolled} enrolled`}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Hall / Lab</label>
                  <select value={newSlot.room} onChange={(e) => setNewSlot({ ...newSlot, room: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    {venues.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}{v.capacity !== null ? ` (cap ${v.capacity})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lecturer (from staff)</label>
                  <select value={newSlot.lecturer} onChange={(e) => setNewSlot({ ...newSlot, lecturer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value="">— Select lecturer —</option>
                    {staff.filter((s) => /lecturer|professor|dr\.|eng\./i.test(s.job_title || '') || true).map((s, i) => {
                      const name = `${s.first_name} ${s.last_name}`;
                      return <option key={i} value={name}>{name}</option>;
                    })}
                  </select>
                </div>
              </div>

              <button type="button" onClick={checkClash} disabled={checking || !newSlot.lecturer}
                className="w-full px-4 py-2 border border-amber-300 bg-amber-50 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                {checking ? 'Checking…' : 'Check for clashes before submitting'}
              </button>
              {clashWarning.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Scheduling clash detected:</p>
                  {clashWarning.map((w, i) => <p key={i}>• {w}</p>)}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow">Confirm Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
