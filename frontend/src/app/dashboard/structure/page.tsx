'use client';

import { Building2, Plus, School, BookOpen } from 'lucide-react';

export default function StructurePage() {
  const schools = [
    { code: 'SCI', name: 'School of Computing & Informatics', dean: 'Prof. J. Kariuki', depts: 3, programs: 6 },
    { code: 'SOB', name: 'School of Business & Economics', dean: 'Dr. E. Ochieng', depts: 4, programs: 8 },
    { code: 'SOE', name: 'School of Engineering & Technology', dean: 'Prof. A. Mwangi', depts: 5, programs: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Schools & Departments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional academic hierarchy, faculties, departments, and active degree programs.
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Add School / Faculty</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {schools.map((s) => (
          <div key={s.code} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-academic-navy-800 bg-academic-navy-50 border border-academic-navy-200 px-2.5 py-1 rounded">
                  {s.code}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <h3 className="text-lg font-bold text-academic-navy-950">{s.name}</h3>
              <p className="text-xs text-slate-500 mt-2">Dean: <strong className="text-slate-700">{s.dean}</strong></p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{s.depts} Departments</span>
              <span>{s.programs} Degree Programs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
