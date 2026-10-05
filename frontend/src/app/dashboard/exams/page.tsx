'use client';

import { useState, useEffect } from 'react';
import { FileCheck2, Calendar, ShieldCheck, CheckCircle2, QrCode, AlertTriangle, Printer } from 'lucide-react';
import { ExamSchedule, ExamClearanceCard } from '@/types';

export default function ExamsPage() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [cards, setCards] = useState<ExamClearanceCard[]>([]);
  const [activeTab, setActiveTab] = useState<'cards' | 'schedules' | 'new_exam'>('cards');
  const [selectedCard, setSelectedCard] = useState<ExamClearanceCard | null>(null);

  const [newExam, setNewExam] = useState({
    course_code: 'BCS 2201',
    course_title: 'Software Engineering Principles',
    exam_date: '2026-10-22',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    venue: 'Computer Science Lab 1',
    chief_invigilator: 'Dr. Evans Kiprop',
    total_candidates: 80,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchExamsData();
  }, []);

  const fetchExamsData = async () => {
    try {
      const res = await fetch('/api/v1/exams');
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data.schedules);
        setCards(json.data.cards);
        if (json.data.cards.length > 0) {
          setSelectedCard(json.data.cards[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/v1/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule_exam', ...newExam }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchExamsData();
        setActiveTab('schedules');
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
            <FileCheck2 className="h-6 w-6 text-academic-navy-900" />
            Examinations & Financial Clearance Cards
          </h1>
          <p className="text-sm text-slate-500">
            Automated examination timetable scheduling, financial clearance thresholds, and secure QR exam passes.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'cards' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clearance Cards
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'schedules' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exam Timetable
          </button>
          <button
            onClick={() => setActiveTab('new_exam')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'new_exam' ? 'bg-academic-gold-500 text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Schedule Paper
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

      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Select Student Candidate</h2>
            {cards.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCard(c)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedCard?.id === c.id
                    ? 'border-academic-navy-900 bg-academic-navy-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-academic-navy-900">{c.admission_number}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      c.is_cleared ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.is_cleared ? 'Cleared' : 'Blocked'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{c.student_name}</h4>
                <p className="text-xs text-slate-500">{c.program_name}</p>
                <div className="mt-2 text-xs flex justify-between text-slate-600 border-t border-slate-200 pt-2">
                  <span>Paid: {c.fee_paid_percentage}%</span>
                  <span>Balance: KES {c.fee_balance.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedCard ? (
              <div className="bg-white rounded-2xl border-2 border-academic-navy-900 p-6 shadow-md relative overflow-hidden space-y-5">
                <div className="flex items-center justify-between border-b border-academic-navy-100 pb-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-academic-navy-800">
                      UNIVERSITY INSTITUTION • OFFICE OF THE REGISTRAR (ACADEMIC)
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">OFFICIAL EXAMINATION CARD</h3>
                    <p className="text-xs text-slate-500">Academic Year 2026/2027 • {selectedCard.semester_name}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-slate-400 block text-[10px]">CARD SERIAL</span>
                    <span className="font-bold text-academic-navy-900">{selectedCard.card_serial_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CANDIDATE NAME</span>
                      <span className="text-sm font-bold text-slate-900">{selectedCard.student_name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ADMISSION NO</span>
                        <span className="font-mono font-bold text-academic-navy-900">{selectedCard.admission_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">REGISTERED UNITS</span>
                        <span className="font-bold text-slate-900">{selectedCard.registered_units} Courses</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DEGREE PROGRAMME</span>
                      <span className="font-medium text-slate-800">{selectedCard.program_name}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-200">
                    <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-inner">
                      <QrCode className="h-20 w-20 text-academic-navy-900" />
                    </div>
                    <span className="font-mono text-[9px] text-slate-500 mt-2 break-all">{selectedCard.security_qr_token}</span>
                    <span className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> VERIFIED SIGNATURE
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span><strong>Financial Status:</strong> Cleared ({selectedCard.fee_paid_percentage}% Paid • Bal KES {selectedCard.fee_balance.toLocaleString()})</span>
                  </div>
                  <span className="font-bold uppercase text-[10px] bg-emerald-200 px-2 py-0.5 rounded">Eligible For Exams</span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2 px-4 rounded-lg text-xs transition shadow flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Examination Pass
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border rounded-xl text-slate-500 text-xs">
                Select a student candidate to preview their examination card.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="p-3">Course</th>
                  <th className="p-3">Exam Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Venue / Hall</th>
                  <th className="p-3">Chief Invigilator</th>
                  <th className="p-3">Candidates</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-mono font-bold text-academic-navy-900">{s.course_code}</div>
                      <div className="text-slate-600">{s.course_title}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{s.exam_date}</td>
                    <td className="p-3 font-mono text-slate-600">{s.start_time} - {s.end_time}</td>
                    <td className="p-3 font-medium text-slate-800">{s.venue}</td>
                    <td className="p-3 text-slate-600">{s.chief_invigilator}</td>
                    <td className="p-3 font-mono font-semibold">{s.total_candidates}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'new_exam' && (
        <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-academic-navy-900" />
            Schedule Examination Paper
          </h2>
          <form onSubmit={handleScheduleExam} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newExam.course_code}
                  onChange={(e) => setNewExam({ ...newExam, course_code: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title</label>
                <input
                  type="text"
                  value={newExam.course_title}
                  onChange={(e) => setNewExam({ ...newExam, course_title: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Date</label>
                <input
                  type="date"
                  value={newExam.exam_date}
                  onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="text"
                  value={newExam.start_time}
                  onChange={(e) => setNewExam({ ...newExam, start_time: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="text"
                  value={newExam.end_time}
                  onChange={(e) => setNewExam({ ...newExam, end_time: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Venue</label>
                <input
                  type="text"
                  value={newExam.venue}
                  onChange={(e) => setNewExam({ ...newExam, venue: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Invigilator</label>
                <input
                  type="text"
                  value={newExam.chief_invigilator}
                  onChange={(e) => setNewExam({ ...newExam, chief_invigilator: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow"
            >
              Publish Examination Paper
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
