'use client';

import { Bell, Plus } from 'lucide-react';

export default function AnnouncementsPage() {
  const notices = [
    { title: 'Semester 1 Course Add/Drop Window', audience: 'All Students', date: 'Oct 3, 2026', body: 'The add/drop portal window for Semester 1 courses will officially close on October 15, 2026.' },
    { title: 'Mid-Semester Continuous Assessment (CAT) Timetable', audience: 'All Faculty & Students', date: 'Oct 1, 2026', body: 'Mid-semester examinations commence on November 2, 2026 across all schools.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Official University Announcements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Targeted notifications, academic calendar notices, and institutional circulars.
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Publish New Notice</span>
        </button>
      </div>

      <div className="space-y-4">
        {notices.map((n, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase bg-academic-navy-50 text-academic-navy-800 border border-academic-navy-200 px-2.5 py-0.5 rounded">
                {n.audience}
              </span>
              <span className="text-xs text-slate-500">{n.date}</span>
            </div>
            <h3 className="text-lg font-bold text-academic-navy-950 mb-2">{n.title}</h3>
            <p className="text-sm text-slate-600">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
