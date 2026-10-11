'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import { BookOpen, Plus, Search, Filter, X, Check, Layers } from 'lucide-react';

export default function CoursesPage() {
  const { role } = useAuth();
  const canWrite = roleHasPermission(role, 'courses:write');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  type CourseRow = {id:string;code:string;title:string;credits:number;level:number;dept:string;prereq:string;lecturer:string};
  const [courses,setCourses]=useState<CourseRow[]>([]);
  const mapCourse=(c:any):CourseRow=>({id:c.id,code:c.code,title:c.title,credits:c.credit_hours,level:c.level,dept:c.department,prereq:c.prerequisites.join(', ') || 'None',lecturer:c.lecturer});
  useEffect(()=>{fetch('/api/v1/courses').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setCourses(d.data.map(mapCourse));}).catch(e=>setError(e.message));},[]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    title: '',
    dept: 'Computer Science',
    credits: 3,
    level: 100,
    prereq: 'None',
    lecturer: 'Staff Assigned',
  });

  const handleAddCourse=async(e:React.FormEvent)=>{
    e.preventDefault();if(!canWrite)return;
    try{const r=await fetch('/api/v1/courses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:newCourse.code,title:newCourse.title,credit_hours:newCourse.credits,level:newCourse.level,department:newCourse.dept,prerequisites:newCourse.prereq==='None'?[]:newCourse.prereq.split(',').map(p=>p.trim()),lecturer:newCourse.lecturer})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCourses(prev=>[mapCourse(d.data),...prev]);setIsModalOpen(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Course creation failed.');}
  };

  const registerCourse=async(c:CourseRow)=>{try{const r=await fetch('/api/v1/courses/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({course_code:c.code,course_title:c.title})});const d=await r.json();if(!r.ok)throw new Error(d.error);setError('Registration request submitted for '+c.code);void loadRegistrations();}catch(e){setError(e instanceof Error?e.message:'Registration failed.');}};
  const [registrations,setRegistrations]=useState<{id:string;course_code:string;admission_number:string;status:string}[]>([]);
  const loadRegistrations=()=>fetch('/api/v1/courses/register').then(async r=>{const d=await r.json();if(r.ok)setRegistrations(d.data);});
  useEffect(()=>{void loadRegistrations();},[]);
  const approveRegistration=async(id:string)=>{try{const r=await fetch('/api/v1/courses/register',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({registration_id:id})});const d=await r.json();if(!r.ok)throw new Error(d.error);await loadRegistrations();}catch(e){setError(e instanceof Error?e.message:'Approval failed.');}};
  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.dept.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'all' || c.level.toString() === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Course Catalog & Units
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curriculum management, credit hours, prerequisites, and departmental course unit allocations.
          </p>
        </div>

        <button
          disabled={!canWrite}
          hidden={!canWrite} style={{display:canWrite ? undefined : 'none'}}
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Add New Course Unit</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search course code, title, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium"
        >
          <option value="all">All Academic Levels</option>
          <option value="100">100 Level (Year 1)</option>
          <option value="200">200 Level (Year 2)</option>
          <option value="300">300 Level (Year 3)</option>
          <option value="400">400 Level (Year 4)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Accredited Course Inventory</h2>
          <span className="text-xs font-semibold text-slate-500">{filtered.length} Units Available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Course Title</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Level</th>
                <th className="px-5 py-3.5">Credits</th>
                <th className="px-5 py-3.5">Prerequisite</th>
                <th className="px-5 py-3.5">Lecturer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id || c.code} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{c.code}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{c.title}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{c.dept}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                      {c.level} Level
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-950">{c.credits} Cr</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{c.prereq}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{c.lecturer}{role === 'student' && <button onClick={()=>registerCourse(c)} className="ml-3 underline text-academic-navy-800">Register</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="bg-white rounded border p-4"><h2 className="font-bold mb-3">Course registrations</h2>{registrations.map(r=><div key={r.id} className="flex gap-3 py-2"><span>{r.admission_number}: {r.course_code} — {r.status}</span>{r.status==='pending'&&['super_admin','admin','registrar'].includes(role)&&<button onClick={()=>approveRegistration(r.id)} className="underline">Approve registration</button>}</div>)}</section>
      {/* Add Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Add New Course Unit</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BCS 402"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence & Robotics"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={newCourse.dept}
                    onChange={(e) => setNewCourse({ ...newCourse, dept: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Business Administration">Business Administration</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Level</label>
                  <select
                    value={newCourse.level}
                    onChange={(e) => setNewCourse({ ...newCourse, level: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value={100}>100 Level (Year 1)</option>
                    <option value={200}>200 Level (Year 2)</option>
                    <option value={300}>300 Level (Year 3)</option>
                    <option value={400}>400 Level (Year 4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Credit Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prerequisite Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BCS 211 or None"
                    value={newCourse.prereq}
                    onChange={(e) => setNewCourse({ ...newCourse, prereq: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Lecturer</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Mwangi"
                  value={newCourse.lecturer}
                  onChange={(e) => setNewCourse({ ...newCourse, lecturer: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
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
                  Add Course Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
