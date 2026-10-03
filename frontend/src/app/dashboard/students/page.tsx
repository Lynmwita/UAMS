'use client';

import { useState } from 'react';
import { Users, Search, Plus, Filter, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const students = [
    { id: '1', admissionNo: 'STU/2026/0001', name: 'Brian Kiprono', program: 'BSc Computer Science', year: 'Year 4', semester: 'Sem 1', status: 'active', gpa: '3.82', feeBalance: 'KSh 0' },
    { id: '2', admissionNo: 'STU/2026/0045', name: 'Mercy Achieng', program: 'Bachelor of Business IT', year: 'Year 3', semester: 'Sem 1', status: 'active', gpa: '3.65', feeBalance: 'KSh 15,000' },
    { id: '3', admissionNo: 'STU/2026/0112', name: 'David Mutua', program: 'BSc Software Engineering', year: 'Year 2', semester: 'Sem 1', status: 'active', gpa: '3.40', feeBalance: 'KSh 25,000' },
    { id: '4', admissionNo: 'STU/2026/0189', name: 'Faith Wanjiku', program: 'BSc Computer Science', year: 'Year 1', semester: 'Sem 1', status: 'active', gpa: '3.91', feeBalance: 'KSh 0' },
    { id: '5', admissionNo: 'STU/2026/0204', name: 'Kevin Omondi', program: 'BSc Data Science', year: 'Year 3', semester: 'Sem 1', status: 'suspended', gpa: '2.10', feeBalance: 'KSh 50,000' },
  ];

  const filtered = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.admissionNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Student Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enrolled student roster, admission numbers, academic status, and profiles.
          </p>
        </div>

        <button className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
        >
          <option value="all">All Academic Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Admission No</th>
              <th className="px-5 py-3.5">Full Name</th>
              <th className="px-5 py-3.5">Degree Program</th>
              <th className="px-5 py-3.5">Level</th>
              <th className="px-5 py-3.5">GPA</th>
              <th className="px-5 py-3.5">Fee Balance</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{s.admissionNo}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.program}</td>
                <td className="px-5 py-3.5 text-slate-500">{s.year} &bull; {s.semester}</td>
                <td className="px-5 py-3.5 font-semibold text-academic-navy-950">{s.gpa}</td>
                <td className="px-5 py-3.5 font-medium text-slate-800">{s.feeBalance}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {s.status}
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
