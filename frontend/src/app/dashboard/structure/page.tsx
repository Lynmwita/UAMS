'use client';

import { useState } from 'react';
import { Building2, Plus, School, BookOpen, Layers, X, Check } from 'lucide-react';

export default function StructurePage() {
  const [activeTab, setActiveTab] = useState<'schools' | 'departments' | 'programs'>('schools');

  const [schools, setSchools] = useState([
    { id: '1', code: 'SOICT', name: 'School of Information Communication & Technology', dean: 'Prof. Alice Njuguna', deanEmail: 'dean.soict@university.ac.ke', depts: 3, programs: 7 },
    { id: '2', code: 'SOBE', name: 'School of Business & Economics', dean: 'Dr. Martin Omondi', deanEmail: 'dean.sobe@university.ac.ke', depts: 2, programs: 5 },
    { id: '3', code: 'SOET', name: 'School of Engineering & Technology', dean: 'Eng. Samuel Githae', deanEmail: 'dean.soet@university.ac.ke', depts: 3, programs: 6 },
    { id: '4', code: 'SOEAS', name: 'School of Education, Arts & Social Sciences', dean: 'Dr. Beatrice Wanyama', deanEmail: 'dean.soeas@university.ac.ke', depts: 2, programs: 4 },
  ]);

  const [departments, setDepartments] = useState([
    { id: 'd1', code: 'DCS', name: 'Department of Computer Science', school: 'SOICT', hod: 'Dr. Jane Mwangi', lecturers: 14, programs: 3 },
    { id: 'd2', code: 'DIT', name: 'Department of Information Technology', school: 'SOICT', hod: 'Prof. David Kamau', lecturers: 12, programs: 2 },
    { id: 'd3', code: 'DBA', name: 'Department of Business Administration', school: 'SOBE', hod: 'Dr. Lucy Wambui', lecturers: 18, programs: 3 },
    { id: 'd4', code: 'DEE', name: 'Department of Electrical & Electronic Engineering', school: 'SOET', hod: 'Eng. Eric Ochieng', lecturers: 10, programs: 2 },
  ]);

  const [programs, setPrograms] = useState([
    { id: 'p1', code: 'BCS', name: 'Bachelor of Science in Computer Science', level: 'Undergraduate', duration: '4 Years', department: 'Computer Science', credits: 128 },
    { id: 'p2', code: 'BIT', name: 'Bachelor of Science in Information Technology', level: 'Undergraduate', duration: '4 Years', department: 'Information Technology', credits: 124 },
    { id: 'p3', code: 'BBA', name: 'Bachelor of Business Administration', level: 'Undergraduate', duration: '4 Years', department: 'Business Administration', credits: 120 },
    { id: 'p4', code: 'BSE', name: 'Bachelor of Science in Software Engineering', level: 'Undergraduate', duration: '4 Years', department: 'Computer Science', credits: 132 },
    { id: 'p5', code: 'MIT', name: 'Master of Science in Information Technology', level: 'Postgraduate', duration: '2 Years', department: 'Information Technology', credits: 64 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({
    code: '',
    name: '',
    dean: '',
    deanEmail: '',
  });

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool.code || !newSchool.name) return;

    const entry = {
      id: `sch-${Date.now()}`,
      code: newSchool.code.toUpperCase(),
      name: newSchool.name,
      dean: newSchool.dean || 'Pending Appointment',
      deanEmail: newSchool.deanEmail || '',
      depts: 1,
      programs: 1,
    };

    setSchools([...schools, entry]);
    setIsModalOpen(false);
    setNewSchool({ code: '', name: '', dean: '', deanEmail: '' });
  };

  return (
    <div className="space-y-6">
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
