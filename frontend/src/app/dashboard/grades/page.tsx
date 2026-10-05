'use client';

import { useState } from 'react';
import { Award, CheckCircle2, FileSpreadsheet, Download, Plus, X, Printer } from 'lucide-react';
import { generateTranscriptPDF } from '@/lib/pdf/generator';
import { calculateGradePoint, getAcademicStanding } from '@/lib/academic/gpa';

export default function GradesPage() {
  const [grades, setGrades] = useState([
    { id: '1', student: 'Faith Wanjiku', adm: 'BIT/2023/8849', course: 'BCS 311', courseTitle: 'Advanced Database Systems', credits: 3, cat: 28, exam: 62, total: 90, grade: 'A', gpa: 4.0, status: 'Approved' },
    { id: '2', student: 'Faith Wanjiku', adm: 'BIT/2023/8849', course: 'BIT 312', courseTitle: 'Distributed Systems & Cloud Computing', credits: 3, cat: 26, exam: 58, total: 84, grade: 'A', gpa: 4.0, status: 'Approved' },
    { id: '3', student: 'Faith Wanjiku', adm: 'BIT/2023/8849', course: 'BCS 314', courseTitle: 'Software Engineering Architecture', credits: 4, cat: 24, exam: 52, total: 76, grade: 'B', gpa: 3.0, status: 'Approved' },
    { id: '4', student: 'Kevin Otieno', adm: 'BCS/2023/1204', course: 'BCS 311', courseTitle: 'Advanced Database Systems', credits: 3, cat: 22, exam: 48, total: 70, grade: 'B', gpa: 3.0, status: 'Submitted' },
    { id: '5', student: 'Brian Kiprono', adm: 'BBA/2022/4412', course: 'BBA 201', courseTitle: 'Principles of Financial Accounting', credits: 3, cat: 27, exam: 61, total: 88, grade: 'A', gpa: 4.0, status: 'Approved' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGrade, setNewGrade] = useState({
    student: 'Faith Wanjiku',
    adm: 'BIT/2023/8849',
    course: 'BCS 316',
    courseTitle: 'Network & System Security',
    credits: 3,
    cat: 25,
    exam: 55,
  });

  const catVal = Number(newGrade.cat) || 0;
  const examVal = Number(newGrade.exam) || 0;
  const totalVal = Math.min(100, Math.max(0, catVal + examVal));
  const { letter, points } = calculateGradePoint(totalVal);

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = {
      id: `grd-${Date.now()}`,
      student: newGrade.student,
      adm: newGrade.adm,
      course: newGrade.course,
      courseTitle: newGrade.courseTitle,
      credits: Number(newGrade.credits),
      cat: catVal,
      exam: examVal,
      total: totalVal,
      grade: letter,
      gpa: points,
      status: 'Submitted',
    };
    setGrades([entry, ...grades]);
    setIsModalOpen(false);
  };

  const handleDownloadTranscript = () => {
    const studentGrades = grades.filter((g) => g.adm === 'BIT/2023/8849');
    const totalCredits = studentGrades.reduce((sum, g) => sum + g.credits, 0);
    const totalPoints = studentGrades.reduce((sum, g) => sum + g.gpa * g.credits, 0);
    const cumulativeGpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    const standing = getAcademicStanding(cumulativeGpa);

    const doc = generateTranscriptPDF({
      student: {
        name: 'Faith Wanjiku',
        admissionNumber: 'BIT/2023/8849',
        program: 'Bachelor of Science in Information Technology',
        school: 'School of Information Communication & Technology',
        department: 'Information Technology',
        yearOfStudy: 3,
        semesterNumber: 1,
      },
      semesterResults: [
        {
          semesterLabel: 'Year 3 Semester 1',
          academicYear: '2025/2026 Academic Year',
          courses: studentGrades.map((g) => ({
            courseCode: g.course,
            courseTitle: g.courseTitle,
            creditHours: g.credits,
            catScore: g.cat,
            examScore: g.exam,
            totalScore: g.total,
            letterGrade: g.grade,
            gradePoint: g.gpa,
          })),
          gpa: cumulativeGpa,
          creditsEarned: totalCredits,
        },
      ],
      cumulativeGpa,
      totalCredits,
      academicStanding: standing,
    });

    doc.save('Zetech_Official_Transcript_BIT_2023_8849.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Examinations & Academic Grades
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous Assessment (CAT 30%), Final Exam (70%), 4.0 GPA conversion, and Senate transcript sealing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadTranscript}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Download className="h-4 w-4 text-academic-navy-700" />
            <span>Download Official Transcript PDF</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-academic-gold-400" />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Grading Scale</p>
          <p className="text-lg font-bold text-academic-navy-950 mt-1">4.0 Scale Standard</p>
          <p className="text-xs text-slate-400 mt-1">A: 70-100 (4.0) | B: 60-69 (3.0) | C: 50-59 (2.0)</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Assessment Weight</p>
          <p className="text-lg font-bold text-academic-gold-600 mt-1">30% CAT + 70% Exam</p>
          <p className="text-xs text-slate-400 mt-1">Senate validated assessment criteria</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Senate Verification</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">4 Units Sealed & Approved</p>
          <p className="text-xs text-slate-400 mt-1">Digital security signature enabled</p>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Course Assessment Master Roll</h2>
          <span className="text-xs font-medium text-slate-500">{grades.length} Grades Recorded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Student & Adm</th>
                <th className="px-5 py-3.5">Course Unit</th>
                <th className="px-5 py-3.5 text-center">CAT (30)</th>
                <th className="px-5 py-3.5 text-center">Exam (70)</th>
                <th className="px-5 py-3.5 text-center">Total (100)</th>
                <th className="px-5 py-3.5 text-center">Grade</th>
                <th className="px-5 py-3.5 text-center">Points</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900">{g.student}</p>
                    <p className="text-xs text-slate-500 font-mono">{g.adm}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-academic-navy-800">{g.course}</span>
                    <p className="text-xs text-slate-500">{g.courseTitle}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center font-medium text-slate-700">{g.cat}/30</td>
                  <td className="px-5 py-3.5 text-center font-medium text-slate-700">{g.exam}/70</td>
                  <td className="px-5 py-3.5 text-center font-bold text-academic-navy-950">{g.total}/100</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-50 text-academic-gold-700 border border-amber-200">
                      {g.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-600">{g.gpa.toFixed(1)}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                        g.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Marks Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Lecturer Grade Entry Sheet</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddGrade} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Student</label>
                <select
                  value={newGrade.adm}
                  onChange={(e) => {
                    const selectedAdm = e.target.value;
                    const name = selectedAdm === 'BIT/2023/8849' ? 'Faith Wanjiku' : selectedAdm === 'BCS/2023/1204' ? 'Kevin Otieno' : 'Brian Kiprono';
                    setNewGrade({ ...newGrade, adm: selectedAdm, student: name });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                >
                  <option value="BIT/2023/8849">Faith Wanjiku (BIT/2023/8849)</option>
                  <option value="BCS/2023/1204">Kevin Otieno (BCS/2023/1204)</option>
                  <option value="BBA/2022/4412">Brian Kiprono (BBA/2022/4412)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit</label>
                <select
                  value={newGrade.course}
                  onChange={(e) => {
                    const code = e.target.value;
                    const titles: Record<string, string> = {
                      'BCS 311': 'Advanced Database Systems',
                      'BIT 312': 'Distributed Systems & Cloud Computing',
                      'BCS 314': 'Software Engineering Architecture',
                      'BCS 316': 'Network & System Security',
                    };
                    setNewGrade({ ...newGrade, course: code, courseTitle: titles[code] || code });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                >
                  <option value="BCS 316">BCS 316 - Network & System Security (3 Cr)</option>
                  <option value="BCS 311">BCS 311 - Advanced Database Systems (3 Cr)</option>
                  <option value="BIT 312">BIT 312 - Distributed Systems (3 Cr)</option>
                  <option value="BCS 314">BCS 314 - Software Engineering (4 Cr)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CAT Score (Max 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={newGrade.cat}
                    onChange={(e) => setNewGrade({ ...newGrade, cat: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Score (Max 70)</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={newGrade.exam}
                    onChange={(e) => setNewGrade({ ...newGrade, exam: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Real-time Conversion Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Computed Result</p>
                  <p className="text-base font-bold text-academic-navy-950 mt-0.5">
                    {totalVal} / 100 Marks
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-academic-gold-800">
                    Grade {letter} ({points.toFixed(1)} Points)
                  </span>
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
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
