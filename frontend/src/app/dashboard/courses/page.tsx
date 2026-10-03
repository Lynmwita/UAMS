'use client';

import { BookOpen, Plus, Search } from 'lucide-react';

export default function CoursesPage() {
  const courses = [
    { code: 'CSC101', title: 'Introduction to Computer Science & Algorithms', credits: 3, level: 100, dept: 'Computer Science', prereq: 'None' },
    { code: 'CSC102', title: 'Structured Programming in C/C++', credits: 4, level: 100, dept: 'Computer Science', prereq: 'CSC101' },
    { code: 'CSC201', title: 'Object-Oriented Programming (Java/TypeScript)', credits: 3, level: 200, dept: 'Computer Science', prereq: 'CSC102' },
    { code: 'CSC301', title: 'Database Systems & Architecture', credits: 3, level: 300, dept: 'Computer Science', prereq: 'CSC201' },
    { code: 'CSC401', title: 'Distributed Systems & Cloud Computing', credits: 3, level: 400, dept: 'Computer Science', prereq: 'CSC301' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Course Catalog & Units
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curriculum management, credit hours, prerequisites, and departmental courses.
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Add New Course</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Course Title</th>
              <th className="px-5 py-3.5">Department</th>
              <th className="px-5 py-3.5">Level</th>
              <th className="px-5 py-3.5">Credits</th>
              <th className="px-5 py-3.5">Prerequisite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.code} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{c.code}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{c.title}</td>
                <td className="px-5 py-3.5 text-slate-600">{c.dept}</td>
                <td className="px-5 py-3.5 text-slate-500">{c.level} Level</td>
                <td className="px-5 py-3.5 font-bold text-academic-navy-950">{c.credits} Hrs</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{c.prereq}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
