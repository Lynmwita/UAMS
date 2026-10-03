'use client';

import { Award, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function GradesPage() {
  const grades = [
    { student: 'Brian Kiprono (STU/2026/0001)', course: 'CSC401', cat: '27/30', exam: '61/70', total: '88/100', grade: 'A', gpa: '4.00', status: 'Approved' },
    { student: 'Mercy Achieng (STU/2026/0045)', course: 'CSC401', cat: '24/30', exam: '54/70', total: '78/100', grade: 'A', gpa: '4.00', status: 'Approved' },
    { student: 'David Mutua (STU/2026/0112)', course: 'CSC401', cat: '20/30', exam: '46/70', total: '66/100', grade: 'B', gpa: '3.00', status: 'Submitted' },
    { student: 'Faith Wanjiku (STU/2026/0189)', course: 'CSC401', cat: '28/30', exam: '64/70', total: '92/100', grade: 'A', gpa: '4.00', status: 'Approved' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Examinations & Academic Grades
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous Assessment (CAT), final exam scores, 4.0 GPA conversion, and transcript sealing.
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <FileSpreadsheet className="h-4 w-4 text-academic-gold-400" />
          <span>Enter Coursework Marks</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Course</th>
              <th className="px-5 py-3.5">CAT (30%)</th>
              <th className="px-5 py-3.5">Exam (70%)</th>
              <th className="px-5 py-3.5">Total</th>
              <th className="px-5 py-3.5">Grade</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((g, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-medium text-slate-900">{g.student}</td>
                <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{g.course}</td>
                <td className="px-5 py-3.5 text-slate-600">{g.cat}</td>
                <td className="px-5 py-3.5 text-slate-600">{g.exam}</td>
                <td className="px-5 py-3.5 font-bold text-academic-navy-950">{g.total}</td>
                <td className="px-5 py-3.5 font-mono font-bold text-academic-gold-600">{g.grade}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {g.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
