'use client';

import { Calendar, Plus } from 'lucide-react';

export default function TimetablePage() {
  const schedule = [
    { day: 'Monday', time: '08:00 - 11:00 AM', course: 'CSC401 (Distributed Systems)', room: 'Lecture Hall 04', lecturer: 'Dr. Evans' },
    { day: 'Tuesday', time: '11:00 - 01:00 PM', course: 'CSC403 (Machine Learning)', room: 'Computing Lab 02', lecturer: 'Dr. Omwega' },
    { day: 'Wednesday', time: '02:00 - 05:00 PM', course: 'CSC405 (Information Security)', room: 'Lecture Hall 01', lecturer: 'Prof. Kariuki' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Academic Timetable & Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weekly lecture schedules, allocated lecture halls, computing labs, and timings.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Day</th>
              <th className="px-5 py-3.5">Time Interval</th>
              <th className="px-5 py-3.5">Course Unit</th>
              <th className="px-5 py-3.5">Assigned Hall / Lab</th>
              <th className="px-5 py-3.5">Lecturer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedule.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-bold text-academic-navy-950">{item.day}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{item.time}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{item.course}</td>
                <td className="px-5 py-3.5 font-semibold text-academic-navy-800">{item.room}</td>
                <td className="px-5 py-3.5 text-slate-600">{item.lecturer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
