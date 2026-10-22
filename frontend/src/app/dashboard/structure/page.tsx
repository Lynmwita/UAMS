'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, School, BookOpen, Layers, X, Check } from 'lucide-react';

export default function StructurePage() {
  const [createKind,setCreateKind]=useState<'departments'|'programs'>('departments');
  const [entry,setEntry]=useState({code:'',name:'',school_id:'',department_id:'',duration_years:'4',credit_limit:'48'});
  const createEntry=async(e:React.FormEvent)=>{e.preventDefault();try{const r=await fetch('/api/v1/'+createKind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...entry,duration_years:Number(entry.duration_years),credit_limit:Number(entry.credit_limit)})});const d=await r.json();if(!r.ok)throw new Error(d.error);window.location.reload();}catch(e:any){setError(e.message);}};
  const [activeTab, setActiveTab] = useState<'schools' | 'departments' | 'programs'>('schools');

  const [error,setError]=useState('');
  const [schools,setSchools]=useState<{id:string;code:string;name:string;dean:string;deanEmail:string;depts:number;programs:number}[]>([]);
  const mapSchool=(s:any)=>({id:s.id,code:s.code,name:s.name,dean:s.dean,deanEmail:s.dean_email,depts:s.departments_count,programs:s.programs_count});
  useEffect(()=>{fetch('/api/v1/schools').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setSchools(d.data.map(mapSchool));}).catch(e=>setError(e.message));},[]);
  const [departments,setDepartments]=useState<{id:string;code:string;name:string;school:string;hod:string;lecturers:number;programs:number}[]>([]);
  const [programs,setPrograms]=useState<{id:string;code:string;name:string;level:string;duration:string;department:string;credits:number}[]>([]);

  useEffect(() => {
    fetch('/api/v1/departments')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDepartments(
          d.data.map((dep: any) => ({ id: dep.id, code: dep.code, name: dep.name, school: dep.school_id, hod: dep.hod, lecturers: 0, programs: dep.programs_count }))
        );
      })
      .catch(e=>setError(e.message));
    fetch('/api/v1/programs')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setPrograms(
          d.data.map((p: any) => ({ id: p.id, code: p.code, name: p.name, level: p.level, duration: `${p.duration_years} Years`, department: p.department_id, credits: p.credit_limit }))
        );
      })
      .catch(e=>setError(e.message));
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({
    code: '',
    name: '',
    dean: '',
    deanEmail: '',
  });

  const handleAddSchool=async(e:React.FormEvent)=>{
    e.preventDefault();
    try{const r=await fetch('/api/v1/schools',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:newSchool.code,name:newSchool.name,dean:newSchool.dean,dean_email:newSchool.deanEmail})});const d=await r.json();if(!r.ok)throw new Error(d.error);setSchools(prev=>[...prev,mapSchool(d.data)]);setIsModalOpen(false);setError('');}catch(e){setError(e instanceof Error?e.message:'School creation failed.');}
  };

  return (
    <div className="space-y-6">
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Academic Hierarchy & Structure
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional academic organization, faculties, academic departments, and accredited degree programs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Add School / Faculty</span>
        </button>
      </div>

      {/* Tabs */}
      <form onSubmit={createEntry} className="border rounded p-4 flex flex-wrap gap-3"><label>Create<select aria-label="Record type" value={createKind} onChange={e=>setCreateKind(e.target.value as 'departments'|'programs')} className="block border p-2"><option value="departments">Department</option><option value="programs">Program</option></select></label><label>Code<input required className="block border p-2" value={entry.code} onChange={e=>setEntry({...entry,code:e.target.value})}/></label><label>Name<input required className="block border p-2" value={entry.name} onChange={e=>setEntry({...entry,name:e.target.value})}/></label>{createKind==='departments'?<label>School<select required className="block border p-2" value={entry.school_id} onChange={e=>setEntry({...entry,school_id:e.target.value})}><option value="">Choose school</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:<><label>Department<select required className="block border p-2" value={entry.department_id} onChange={e=>setEntry({...entry,department_id:e.target.value})}><option value="">Choose department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Duration (years)<input required type="number" min="1" max="8" className="block border p-2" value={entry.duration_years} onChange={e=>setEntry({...entry,duration_years:e.target.value})}/></label><label>Semester credit limit<input required type="number" min="1" className="block border p-2" value={entry.credit_limit} onChange={e=>setEntry({...entry,credit_limit:e.target.value})}/></label></>}<button className="border rounded px-3">Save {createKind==='departments'?'department':'program'}</button></form>
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'schools'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Schools & Faculties ({schools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'departments'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'programs'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Degree Programs ({programs.length})</span>
        </button>
      </div>

      {/* View 1: Schools */}
      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schools.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-academic-navy-800 bg-academic-navy-50 border border-academic-navy-200 px-2.5 py-1 rounded">
                    {s.code}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Faculty
                  </span>
                </div>
                <h2 className="text-lg font-bold text-academic-navy-950">{s.name}</h2>
                <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                  <p>Dean: <strong className="text-slate-800">{s.dean}</strong></p>
                  {s.deanEmail && <p className="text-slate-400 font-mono">{s.deanEmail}</p>}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>{s.depts} Academic Departments</span>
                <span className="text-academic-gold-700 font-bold">{s.programs} Accredited Programs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Departments */}
      {activeTab === 'departments' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Department Name</th>
                <th className="px-5 py-3.5">Faculty / School</th>
                <th className="px-5 py-3.5">Head of Department (HOD)</th>
                <th className="px-5 py-3.5 text-center">Faculty Members</th>
                <th className="px-5 py-3.5 text-center">Programs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{d.code}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{d.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-bold">{d.school}</td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{d.hod}</td>
                  <td className="px-5 py-3.5 text-center font-mono text-slate-600">{d.lecturers} Lecturers</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-academic-navy-50 text-academic-navy-900">
                      {d.programs} Programs
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View 3: Programs */}
      {activeTab === 'programs' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Program Code</th>
                <th className="px-5 py-3.5">Degree Title</th>
                <th className="px-5 py-3.5">Level</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-center">Credit Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{p.code}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{p.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {p.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.duration}</td>
                  <td className="px-5 py-3.5 text-slate-700">{p.department}</td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-academic-navy-950">
                    {p.credits} Credits
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add School Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Add School / Faculty</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchool} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Faculty Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOHS"
                    value={newSchool.code}
                    onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full School Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School of Health Sciences"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean of Faculty</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Catherine Muthoni"
                  value={newSchool.dean}
                  onChange={(e) => setNewSchool({ ...newSchool, dean: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean Official Email</label>
                <input
                  type="email"
                  placeholder="dean.sohs@university.ac.ke"
                  value={newSchool.deanEmail}
                  onChange={(e) => setNewSchool({ ...newSchool, deanEmail: e.target.value })}
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
                  Create School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
