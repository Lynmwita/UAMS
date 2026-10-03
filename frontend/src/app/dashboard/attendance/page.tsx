'use client';

import { CalendarCheck, Plus } from 'lucide-react';

export default function AttendancePage() {
  const sessions = [
    { date: '2026-10-03', course: 'CSC401', topic: 'Distributed Consensus & Raft Protocol', lecturer: 'Dr. Evans', present: 74, absent: 6, percentage: '92.5%' },
    { date: '2026-10-02', course: 'CSC301', topic: 'B-Tree Indexing and Query Plans', lecturer: 'Dr. Evans', present: 82, absent: 3, percentage: '96.4%' },
    { date: '2026-10-01', course: 'CSC102', topic: 'Pointers and Memory Allocation in C', lecturer: 'Mr. Otieno', present: 110, absent: 10, percentage: '91.6%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Class Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lecture session registers, attendance rosters, and student exam eligibility threshold (75%).
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Take New Session Attendance</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Session Date</th>
              <th className="px-5 py-3.5">Course</th>
              <th className="px-5 py-3.5">Topic Covered</th>
              <th className="px-5 py-3.5">Lecturer</th>
              <th className="px-5 py-3.5">Present / Total</th>
              <th className="px-5 py-3.5">Attendance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.date}</td>
                <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{s.course}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{s.topic}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.lecturer}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.present} / {s.present + s.absent}</td>
                <td className="px-5 py-3.5 font-bold text-emerald-700">{s.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
