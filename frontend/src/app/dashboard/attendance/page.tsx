'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { CalendarCheck, Plus, QrCode, CheckCircle2, XCircle, Clock, AlertTriangle, X, Check, Users, Sparkles } from 'lucide-react';

export default function AttendancePage() {
  const { role,id:actorId } = useAuth();
  const institutional=!actorId.startsWith('usr-');
  const [courses,setCourses]=useState<{code:string;title:string}[]>([]);
  const canWrite = role === 'lecturer' || role === 'super_admin';
  const [error,setError]=useState('');
  const [sessions, setSessions] = useState<{ id: string; date: string; course: string; courseTitle: string; topic: string; lecturer: string; present: number; total: number; percentage: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(600); // 10 minutes
  const [liveCheckins, setLiveCheckins] = useState<string[]>([]);

  const [sessionForm, setSessionForm] = useState({
    course: 'BCS 311',
    courseTitle: 'Advanced Database Systems',
    topic: '',
    lecturer: 'Dr. Jane Mwangi',
    date: new Date().toISOString().split('T')[0],
  });

  const [studentRoll,setStudentRoll]=useState<{id:string;adm:string;name:string;status:'present'|'absent'|'late'|'excused'}[]>([]);
  useEffect(() => { fetch('/api/v1/attendance').then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setSessions(d.data.sessions); setStudentRoll(d.data.roster); }).catch(e => setError(e.message)).finally(() => setSessionsLoading(false)); }, []);
  useEffect(()=>{if(institutional)fetch('/api/v1/courses').then(r=>r.json()).then(d=>{if(d.success){setCourses(d.data);if(d.data[0])setSessionForm(p=>({...p,course:d.data[0].code,courseTitle:d.data[0].title}));}});},[institutional]);
  useEffect(()=>{if(institutional&&sessionForm.course)fetch('/api/v1/attendance?course_code='+encodeURIComponent(sessionForm.course)).then(r=>r.json()).then(d=>{if(d.success)setStudentRoll(d.data.roster);else setError(d.error);});},[institutional,sessionForm.course]);
  // Simulate QR Code countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQrModalOpen && qrCountdown > 0) {
      timer = setInterval(() => {
        setQrCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isQrModalOpen, qrCountdown]);

  const toggleStudentStatus = (id: string, newStatus: 'present' | 'absent' | 'late' | 'excused') => {
    if (!canWrite) return;
    setStudentRoll((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudentRoll((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    setLiveCheckins([
      'Faith Wanjiku (BIT/2023/8849)',
      'Kevin Otieno (BCS/2023/1204)',
      'Brian Kiprono (BBA/2022/4412)',
    ]);
  };

  const handleSaveAttendance=async(e:React.FormEvent)=>{
    e.preventDefault();if(!canWrite)return;
    try{const r=await fetch('/api/v1/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sessionForm,roster:studentRoll})});const d=await r.json();if(!r.ok)throw new Error(d.error);setSessions(prev=>[d.data,...prev]);setIsModalOpen(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Attendance submission failed.');}
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {institutional&&canWrite&&<label>Course attendance roster<select aria-label="Course attendance roster" className="border rounded p-2" value={sessionForm.course} onChange={e=>setSessionForm({...sessionForm,course:e.target.value,courseTitle:courses.find(c=>c.code===e.target.value)?.title||e.target.value})}>{courses.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</select></label>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Class Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Attendance rosters and exam sitting threshold tracking. Live QR check-in is not configured.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            hidden
            style={{display:'none'}}
            disabled
            title="Live QR check-in is not configured"
            onClick={() => {
              setQrCountdown(600);
              setIsQrModalOpen(true);
            }}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <QrCode className="h-4 w-4 text-academic-navy-900" />
            <span>Project Live QR Code</span>
          </button>

          <button
            hidden={!canWrite} style={{display:canWrite ? undefined : 'none'}}
            onClick={() => setIsModalOpen(true)}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4 text-academic-gold-400" />
            <span>Take Roll-Call</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Average Attendance Rate</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{sessionsLoading ? 'Loading…' : sessions.length === 0 ? 'No sessions yet' : (sessions.reduce((sum, s) => sum + s.present, 0) / sessions.reduce((sum, s) => sum + s.total, 0) * 100).toFixed(1) + '%'}</p>
          <p className="text-xs text-slate-400 mt-1">{sessionsLoading ? 'Reading recorded sessions…' : sessions.length === 0 ? 'Derived from recorded sessions' : `Derived from ${sessions.length} recorded session${sessions.length === 1 ? '' : 's'}`}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Exam Sitting Threshold</p>
          <p className="text-2xl font-black text-academic-navy-950 mt-1">&ge; 75.0%</p>
          <p className="text-xs text-amber-600 mt-1 font-semibold">Strict Senate Regulation</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Sessions Conducted</p>
          <p className="text-2xl font-black text-academic-navy-900 mt-1">{sessionsLoading ? 'Loading…' : `${sessions.length} Lecture${sessions.length === 1 ? '' : 's'}`}</p>
          <p className="text-xs text-slate-400 mt-1">All units accounted for</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Conducted Lecture Sessions & Registers</h2>
          <span className="text-xs font-medium text-slate-500">{sessionsLoading ? 'Loading sessions…' : `${sessions.length} Recorded Session${sessions.length === 1 ? '' : 's'}`}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Course Unit</th>
                <th className="px-5 py-3.5">Topic Covered</th>
                <th className="px-5 py-3.5">Lecturer</th>
                <th className="px-5 py-3.5 text-center">Turnout</th>
                <th className="px-5 py-3.5 text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.date}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-academic-navy-800">{s.course}</span>
                    <p className="text-xs text-slate-500">{s.courseTitle}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{s.topic}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{s.lecturer}</td>
                  <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                    {s.present} / {s.total}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2.5 py-1 rounded font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {s.percentage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic QR Code Projector Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-left">
                <QrCode className="h-6 w-6 text-academic-gold-500" />
                <div>
                  <h3 className="text-lg font-black text-academic-navy-950">Live Class Check-in QR Projector</h3>
                  <p className="text-xs text-slate-500">BCS 311 - Advanced Database Systems (Lecture Hall 04)</p>
                </div>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center">
              {/* Animated QR Mockup */}
              <div className="relative p-6 bg-slate-50 border-4 border-academic-navy-900 rounded-3xl shadow-inner inline-block">
                <svg className="w-52 h-52 text-academic-navy-950" viewBox="0 0 100 100" fill="currentColor">
                  {/* Outer corner squares */}
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="10" y="10" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="14" y="14" width="10" height="10" rx="1" fill="#d97706" />

                  <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="72" y="10" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="76" y="14" width="10" height="10" rx="1" fill="#d97706" />

                  <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="10" y="72" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="14" y="76" width="10" height="10" rx="1" fill="#d97706" />

                  {/* QR Data Pattern Matrix */}
                  <rect x="38" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="48" y="16" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="38" y="24" width="6" height="6" fill="#0f172a" />
                  <rect x="48" y="32" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="24" width="6" height="6" fill="#0f172a" />

                  <rect x="8" y="38" width="6" height="6" fill="#0f172a" />
                  <rect x="18" y="46" width="6" height="6" fill="#0f172a" />
                  <rect x="28" y="38" width="6" height="6" fill="#0f172a" />
                  <rect x="8" y="54" width="6" height="6" fill="#0f172a" />

                  <rect x="38" y="44" width="12" height="12" rx="2" fill="#d97706" />
                  <rect x="54" y="44" width="6" height="6" fill="#0f172a" />
                  <rect x="64" y="52" width="6" height="6" fill="#0f172a" />
                  <rect x="74" y="44" width="6" height="6" fill="#0f172a" />
                  <rect x="84" y="52" width="6" height="6" fill="#0f172a" />

                  <rect x="38" y="68" width="6" height="6" fill="#0f172a" />
                  <rect x="48" y="76" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="68" width="6" height="6" fill="#0f172a" />
                  <rect x="68" y="76" width="6" height="6" fill="#0f172a" />
                  <rect x="78" y="68" width="6" height="6" fill="#0f172a" />
                  <rect x="88" y="76" width="6" height="6" fill="#0f172a" />
                </svg>

                <div className="mt-3 flex items-center justify-center space-x-2 text-xs font-mono font-bold text-academic-navy-950">
                  <span>Passcode:</span>
                  <span className="bg-amber-100 text-academic-gold-800 px-2 py-0.5 rounded border border-amber-300">
                    ATT-9842
                  </span>
                </div>
              </div>

              {/* Timer Bar */}
              <div className="mt-4 flex items-center space-x-2 text-xs font-bold text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full">
                <Clock className="h-4 w-4 text-academic-gold-600 animate-spin" />
                <span>QR Code Expires in: {formatCountdown(qrCountdown)}</span>
              </div>
            </div>

            {/* Live Student Check-in Feed */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-academic-navy-800" />
                  Live Mobile Scanned ({liveCheckins.length} Students)
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  GPS & Bluetooth Beacon Verified
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {liveCheckins.map((student, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 text-xs font-medium bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg shadow-2xs animate-in fade-in duration-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{student}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-academic-gold-600" />
                <span>Simulate All Students Scanned</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close Projector
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-xs font-bold shadow"
                >
                  End & Save Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Roll-Call Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Roll-Call Session Register</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit</label>
                  <select
                    value={sessionForm.course}
                    onChange={(e) => {
                      const code = e.target.value;
                      const titles: Record<string, string> = {
                        'BCS 311': 'Advanced Database Systems',
                        'BIT 312': 'Distributed Systems & Cloud Computing',
                        'BCS 314': 'Software Engineering Architecture',
                        'BCS 316': 'Network & System Security',
                        'BBA 201': 'Principles of Financial Accounting',
                      };
                      setSessionForm({ ...sessionForm, course: code, courseTitle: titles[code] || code });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="BCS 311">BCS 311 - Advanced Database Systems</option>
                    <option value="BIT 312">BIT 312 - Distributed Systems</option>
                    <option value="BCS 314">BCS 314 - Software Architecture</option>
                    <option value="BCS 316">BCS 316 - Network & System Security</option>
                    <option value="BBA 201">BBA 201 - Principles of Financial Accounting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Topic Covered</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Transactions & 2-Phase Commit"
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              {/* Student Roll Call Toggles */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Enrolled Students Roll Call ({studentRoll.length} Students)
                </label>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {studentRoll.map((s) => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-slate-500 font-mono">{s.adm}</p>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(s.id, 'present')}
                          className={`px-2 py-1 rounded font-semibold transition ${
                            s.status === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(s.id, 'late')}
                          className={`px-2 py-1 rounded font-semibold transition ${
                            s.status === 'late'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(s.id, 'absent')}
                          className={`px-2 py-1 rounded font-semibold transition ${
                            s.status === 'absent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow"
                >
                  Save Register Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
