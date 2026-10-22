'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import { Award, CheckCircle2, FileSpreadsheet, Download, Plus, X, Printer } from 'lucide-react';

import { calculateGradePoint } from '@/lib/academic/gpa';

export default function GradesPage() {
  const { role } = useAuth();
  const canWrite = roleHasPermission(role, 'grades:write');
  const [error, setError] = useState('');
  type GradeRow={id:string;studentId:string;student:string;adm:string;course:string;courseTitle:string;credits:number;cat:number;exam:number;total:number;grade:string;gpa:number;status:string};
  const [grades,setGrades]=useState<GradeRow[]>([]);
  const mapGrade=(g:any):GradeRow=>({id:g.id,studentId:g.student_id,student:g.student_name,adm:g.admission_number,course:g.course_code,courseTitle:g.course_title,credits:g.credit_hours,cat:g.cat_score,exam:g.exam_score,total:g.total_score,grade:g.letter_grade,gpa:g.grade_point,status:g.is_approved?'Approved':'Submitted'});
  useEffect(()=>{fetch('/api/v1/grades/enter').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setGrades(d.data.map(mapGrade));}).catch(e=>setError(e.message));},[]);
  const approveGrade=async(id:string)=>{try{const r=await fetch('/api/v1/grades/enter',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({grade_id:id})});const d=await r.json();if(!r.ok)throw new Error(d.error);setGrades(prev=>prev.map(g=>g.id===id?mapGrade(d.data):g));}catch(e){setError(e instanceof Error?e.message:'Approval failed.');}};

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

  const handleAddGrade=async(e:React.FormEvent)=>{
    e.preventDefault();if(!canWrite)return;
    try{const r=await fetch('/api/v1/grades/enter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_name:newGrade.student,admission_number:newGrade.adm,course_code:newGrade.course,course_title:newGrade.courseTitle,credit_hours:newGrade.credits,cat_score:catVal,exam_score:examVal})});const d=await r.json();if(!r.ok)throw new Error(d.error);setGrades(prev=>[mapGrade(d.data),...prev]);setIsModalOpen(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Grade entry failed.');}
  };

  const [transcriptStudent, setTranscriptStudent] = useState('');
  const [downloading, setDownloading] = useState(false);
  const transcriptOptions = [...new Map(grades.map(grade => [grade.adm, {id: grade.studentId || grade.adm, name: grade.student, admission:grade.adm}])).values()];
  const handleDownloadTranscript = async () => {
    const target = role === 'student' ? 'me' : transcriptStudent;
    if (!target || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/results/transcript/${encodeURIComponent(target)}`, {cache:'no-store'});
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Transcript download failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Academic_Transcript.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transcript download failed.');
    } finally { setDownloading(false); }
  };
  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Examinations & Academic Grades
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous Assessment (CAT 30%), Final Exam (70%), approved results, and academic transcripts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {['super_admin','admin','registrar'].includes(role) && (
            <label className="text-xs text-slate-600">
              Transcript student
              <select className="block max-w-64 rounded border border-slate-300 px-2 py-2 text-sm" value={transcriptStudent} onChange={event=>setTranscriptStudent(event.target.value)}>
                <option value="">Select student</option>
                {transcriptOptions.map(student=><option key={student.id} value={student.id}>{student.name} ({student.admission})</option>)}
              </select>
            </label>
          )}
          {['super_admin','admin','registrar','student'].includes(role) && <button
            onClick={handleDownloadTranscript}
            disabled={downloading || (role !== 'student' && !transcriptStudent)}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Download className="h-4 w-4 text-academic-navy-700" />
            <span>{downloading ? 'Preparing transcript…' : 'Download Transcript'}</span>
          </button>}

          <button
            disabled={!canWrite}
          hidden={!canWrite} style={{display:canWrite ? undefined : 'none'}}
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
          <p className="text-lg font-bold text-emerald-600 mt-1">{grades.filter(g=>g.status==='Approved').length} Approved Results</p>
          <p className="text-xs text-slate-400 mt-1">Results are limited to your permitted scope</p>
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
                        {g.status !== 'Approved' && roleHasPermission(role, 'grades:approve') && <button onClick={()=>approveGrade(g.id)} className="ml-2 underline">Approve</button>}
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
