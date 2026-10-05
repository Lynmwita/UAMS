'use client';

import { useState } from 'react';
import { Users, Search, Plus, Filter, CheckCircle2, ShieldAlert, Download, X, Award, FileText, CreditCard } from 'lucide-react';
import { generateExamCardPDF, generateStudentIDCardPDF } from '@/lib/pdf/generator';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [students, setStudents] = useState([
    { id: '1', admissionNo: 'BIT/2023/8849', name: 'Faith Wanjiku', program: 'BSc Information Technology', year: 3, semester: 1, status: 'active', gpa: 3.82, feeBalance: 0, feeCleared: true },
    { id: '2', admissionNo: 'BCS/2023/1204', name: 'Kevin Otieno', program: 'BSc Computer Science', year: 2, semester: 2, status: 'active', gpa: 3.65, feeBalance: 18500, feeCleared: false },
    { id: '3', admissionNo: 'BBA/2022/4412', name: 'Brian Kiprono', program: 'Bachelor of Business Administration', year: 4, semester: 1, status: 'active', gpa: 3.48, feeBalance: 0, feeCleared: true },
    { id: '4', admissionNo: 'BSE/2024/0112', name: 'David Mutua', program: 'BSc Software Engineering', year: 1, semester: 2, status: 'active', gpa: 3.40, feeBalance: 25000, feeCleared: false },
    { id: '5', admissionNo: 'BDS/2023/0204', name: 'Mercy Achieng', program: 'BSc Data Science', year: 3, semester: 1, status: 'active', gpa: 3.91, feeBalance: 0, feeCleared: true },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    admissionNo: '',
    program: 'BSc Computer Science',
    year: 1,
    semester: 1,
    feeBalance: 55000,
  });

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.admissionNo) return;

    const studentObj = {
      id: `stu-${Date.now()}`,
      admissionNo: newStudent.admissionNo.trim(),
      name: newStudent.name.trim(),
      program: newStudent.program,
      year: Number(newStudent.year),
      semester: Number(newStudent.semester),
      status: 'active',
      gpa: 0.0,
      feeBalance: Number(newStudent.feeBalance),
      feeCleared: Number(newStudent.feeBalance) === 0,
    };

    setStudents([studentObj, ...students]);
    setIsModalOpen(false);
    setNewStudent({ name: '', admissionNo: '', program: 'BSc Computer Science', year: 1, semester: 1, feeBalance: 55000 });
  };

  const handleDownloadExamCard = (student: typeof students[0]) => {
    const doc = generateExamCardPDF({
      student: {
        name: student.name,
        admissionNumber: student.admissionNo,
        program: student.program,
        yearOfStudy: student.year,
        semesterNumber: student.semester,
      },
      semester: `Semester ${student.semester}`,
      academicYear: '2025/2026 Academic Year',
      feeCleared: student.feeCleared,
      clearanceCode: `EXAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      courses: [
        { code: 'BCS 311', title: 'Advanced Database Systems', attendancePercent: 92 },
        { code: 'BIT 312', title: 'Distributed Systems & Cloud Computing', attendancePercent: 88 },
        { code: 'BCS 314', title: 'Software Engineering Architecture', attendancePercent: 85 },
        { code: 'BCS 316', title: 'Network & System Security', attendancePercent: 95 },
      ],
    });

    doc.save(`Exam_Clearance_Card_${student.admissionNo.replace(/\//g, '_')}.pdf`);
  };

  const handleDownloadIDCard = (student: typeof students[0]) => {
    const doc = generateStudentIDCardPDF({
      student: {
        name: student.name,
        admissionNumber: student.admissionNo,
        program: student.program,
        yearOfStudy: student.year,
        semesterNumber: student.semester,
      },
      expiryDate: 'DECEMBER 2027',
    });

    doc.save(`Student_ID_${student.admissionNo.replace(/\//g, '_')}.pdf`);
  };

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
            Student Management & Admissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enrolled student registry, bio-profiles, fee clearance verification, and exam pass generation.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
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
          className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium"
        >
          <option value="all">All Academic Statuses</option>
          <option value="active">Active Enrolled</option>
          <option value="suspended">Suspended / Deferred</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Active Student Enrolment List</h2>
          <span className="text-xs font-semibold text-slate-500">{filtered.length} Students Listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admission No</th>
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Degree Program</th>
                <th className="px-5 py-3.5">Level</th>
                <th className="px-5 py-3.5">CGPA</th>
                <th className="px-5 py-3.5">Fee Balance</th>
                <th className="px-5 py-3.5 text-center">Student Credentials</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{s.admissionNo}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{s.program}</td>
                  <td className="px-5 py-3.5 text-slate-500">Year {s.year}, Sem {s.semester}</td>
                  <td className="px-5 py-3.5 font-bold text-academic-navy-950">{s.gpa > 0 ? s.gpa.toFixed(2) : 'N/A'}</td>
                  <td className="px-5 py-3.5 font-medium">
                    {s.feeCleared ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        KES 0 (Cleared)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        KES {s.feeBalance.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleDownloadIDCard(s)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded bg-academic-navy-50 hover:bg-academic-navy-100 text-academic-navy-800 border border-academic-navy-200 transition"
                        title="Download PVC Student ID Card PDF"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-academic-gold-600" />
                        <span>ID Card</span>
                      </button>

                      <button
                        onClick={() => handleDownloadExamCard(s)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Download Exam Clearance Card PDF"
                      >
                        <Download className="h-3.5 w-3.5 text-academic-navy-700" />
                        <span>Exam Pass</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Register New Student</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mutiso"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Admission Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCS/2026/0552"
                  value={newStudent.admissionNo}
                  onChange={(e) => setNewStudent({ ...newStudent, admissionNo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-academic-navy-900 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Degree Program</label>
                <select
                  value={newStudent.program}
                  onChange={(e) => setNewStudent({ ...newStudent, program: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                >
                  <option value="BSc Computer Science">BSc Computer Science</option>
                  <option value="BSc Information Technology">BSc Information Technology</option>
                  <option value="BSc Software Engineering">BSc Software Engineering</option>
                  <option value="Bachelor of Business Administration">Bachelor of Business Administration</option>
                  <option value="BSc Data Science">BSc Data Science</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year of Study</label>
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select
                    value={newStudent.semester}
                    onChange={(e) => setNewStudent({ ...newStudent, semester: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
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
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
