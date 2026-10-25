'use client';

import { useEffect, useState } from 'react';
import { IdCard, Search, Plus, ShieldX, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

type StaffMember = {
  id: string;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department_name: string;
  job_title: string;
  qualification: string;
  is_active: boolean;
  joined_date: string;
};

const DEFAULT_ROLES = [
  // Academic & Instruction
  { value: 'lecturer', label: 'Lecturer / Professor', group: 'Academic & Teaching' },
  { value: 'tutorial_fellow', label: 'Tutorial Fellow / Teaching Assistant', group: 'Academic & Teaching' },
  { value: 'hod', label: 'Head of Department (HOD)', group: 'Academic & Teaching' },
  { value: 'dean', label: 'Dean of Faculty / School', group: 'Academic & Teaching' },
  { value: 'registrar', label: 'Registrar / Academic Affairs', group: 'Academic & Teaching' },
  { value: 'examinations_officer', label: 'Examinations Officer', group: 'Academic & Teaching' },
  { value: 'lab_technician', label: 'Laboratory Technician', group: 'Academic & Teaching' },

  // Technology & Systems
  { value: 'data_architect', label: 'Data Architect / Systems Analyst', group: 'Technology & IT' },
  { value: 'systems_admin', label: 'Systems & Cloud Administrator', group: 'Technology & IT' },
  { value: 'it_support', label: 'IT Support / Network Engineer', group: 'Technology & IT' },
  { value: 'software_developer', label: 'Software Developer / Webmaster', group: 'Technology & IT' },

  // Administration, HR & Legal
  { value: 'admin', label: 'University Administrator', group: 'Administration & Operations' },
  { value: 'admissions_officer', label: 'Admissions Officer', group: 'Administration & Operations' },
  { value: 'hr_officer', label: 'Human Resources (HR) Officer', group: 'Administration & Operations' },
  { value: 'procurement_officer', label: 'Procurement & Supplies Officer', group: 'Administration & Operations' },
  { value: 'legal_officer', label: 'Legal & Compliance Officer', group: 'Administration & Operations' },

  // Finance & Accounts
  { value: 'finance_officer', label: 'Finance Officer / Bursar', group: 'Finance & Accounts' },
  { value: 'accountant', label: 'Accountant / Cashier', group: 'Finance & Accounts' },

  // Student Welfare & Services
  { value: 'library', label: 'Librarian / Library Staff', group: 'Student Welfare & Services' },
  { value: 'hostel_warden', label: 'Hostel Warden / Residence Manager', group: 'Student Welfare & Services' },
  { value: 'counselor', label: 'Student Counselor / Welfare Officer', group: 'Student Welfare & Services' },
  { value: 'nurse', label: 'Campus Nurse / Medical Officer', group: 'Student Welfare & Services' },
  { value: 'sports_coach', label: 'Sports Coach / Director of Sports', group: 'Student Welfare & Services' },

  // Facilities, Hospitality & Operations
  { value: 'chef_cook', label: 'Head Chef / Cook (Catering)', group: 'Facilities, Hospitality & Services' },
  { value: 'catering_assistant', label: 'Catering Assistant / Dining Staff', group: 'Facilities, Hospitality & Services' },
  { value: 'cleaner', label: 'Cleaner / Janitor / Housekeeper', group: 'Facilities, Hospitality & Services' },
  { value: 'security_officer', label: 'Security Officer / Guard', group: 'Facilities, Hospitality & Services' },
  { value: 'maintenance_technician', label: 'Maintenance Technician (Electrician/Plumber)', group: 'Facilities, Hospitality & Services' },
  { value: 'driver', label: 'Driver / Transport Logistics', group: 'Facilities, Hospitality & Services' },
  { value: 'storekeeper', label: 'Storekeeper / Inventory Clerk', group: 'Facilities, Hospitality & Services' },
];

export default function StaffPage() {
  const {role}=useAuth();
  const canManage=['admin','super_admin'].includes(role);
  const [departments,setDepartments]=useState<{id:string;name:string;category?:string;school_id?:string}[]>([]);
  const [notice,setNotice]=useState('');
  const [allocation,setAllocation]=useState({lecturer_staff_id:'',course_code:''});
  const [courses,setCourses]=useState<{code:string;title:string}[]>([]);
  useEffect(()=>{fetch('/api/v1/courses').then(r=>r.json()).then(d=>{if(d.success)setCourses(d.data);});},[]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rolesList, setRolesList] = useState(DEFAULT_ROLES);
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'lecturer',
    department_id: '',
    job_title: '',
    qualification: '',
  });

  const load = () =>
    fetch('/api/v1/staff')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setStaff(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    fetch('/api/v1/departments').then(r=>r.json()).then(d=>{if(d.success)setDepartments(d.data);});
  }, []);

  const invite=async(email:string)=>{setError('');setNotice('');try{const r=await fetch('/api/v1/staff/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const d=await r.json();if(!r.ok)throw new Error(d.error);setNotice(d.message);}catch(e:any){setError(e.message);}};

  const handleAddCustomRole = () => {
    const trimmed = customRoleInput.trim();
    if (!trimmed) return;
    const value = trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newRole = { value, label: trimmed, group: 'Custom Roles' };
    if (!rolesList.some((r) => r.value === value)) {
      setRolesList((prev) => [...prev, newRole]);
    }
    setForm((prev) => ({ ...prev, role: value, job_title: prev.job_title || trimmed }));
    setIsCustomRole(false);
    setCustomRoleInput('');
  };

  const filtered = staff.filter(
    (s) =>
      (!roleFilter || s.role === roleFilter) &&
      (!search || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) || s.staff_number.includes(search))
  );

  const createStaff = async () => {
    const r = await fetch('/api/v1/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setShowForm(false);
    setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'lecturer', department_id: '', job_title: '', qualification: '' });
    setError('');
    load();
  };

  const toggleActive = async (staff_id: string, is_active: boolean) => {
    const r = await fetch('/api/v1/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id, is_active }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setStaff((prev) => prev.map((s) => (s.id === staff_id ? d.data : s)));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IdCard className="w-7 h-7 text-sky-600" />
          <div>
            <h1 className="text-xl font-bold">Faculty & Staff Management</h1>
            <p className="text-sm text-muted-foreground">Register staff, assign roles, and manage employment status.</p>
          </div>
        </div>
        <button className="bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-sky-800 flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-md">{error}</p>}
      {notice&&<p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {['admin','super_admin','registrar','hod'].includes(role)&&<form className="border rounded p-3 flex flex-wrap gap-3" onSubmit={async e=>{e.preventDefault();setError('');try{const r=await fetch('/api/v1/staff/allocations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(allocation)});const d=await r.json();if(!r.ok)throw new Error(d.error);setNotice('Teaching allocation saved for the current semester.');}catch(err:any){setError(err.message);}}}><label>Lecturer<select required aria-label="Allocate lecturer" className="block border p-2" value={allocation.lecturer_staff_id} onChange={e=>setAllocation({...allocation,lecturer_staff_id:e.target.value})}><option value="">Choose lecturer</option>{staff.filter(s=>s.role==='lecturer'&&s.is_active).map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></label><label>Course<select required aria-label="Allocated course" className="block border p-2" value={allocation.course_code} onChange={e=>setAllocation({...allocation,course_code:e.target.value})}><option value="">Choose course</option>{courses.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</select></label><button className="border rounded px-3">Save teaching allocation</button></form>}

      {showForm && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Register New University Staff Member</h3>
            <span className="text-xs text-slate-500">Academic, Technical, Administrative, and Support Roles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                required
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="email@university.ac.ke"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="+2547..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Role</label>
                <button
                  type="button"
                  onClick={() => setIsCustomRole((v) => !v)}
                  className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold underline"
                >
                  {isCustomRole ? 'Close' : '+ Other'}
                </button>
              </div>
              <select
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                value={form.role}
                onChange={(e) => {
                  if (e.target.value === '__other__') {
                    setIsCustomRole(true);
                  } else {
                    setForm({ ...form, role: e.target.value });
                    setIsCustomRole(false);
                  }
                }}
              >
                {Array.from(new Set(rolesList.map((r) => r.group))).map((group) => (
                  <optgroup key={group} label={group}>
                    {rolesList
                      .filter((r) => r.group === group)
                      .map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <option value="__other__">➕ Other (Define Custom Role...)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Unit</label>
              <select
                aria-label="Department"
                required
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">Choose department / service</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.category === 'non_academic' || d.school_id === 'central' ? '🌐 (Whole University)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Lead Data Architect, Senior Cook"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. BSc, Diploma, Certificate"
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              />
            </div>
          </div>

          {isCustomRole && (
            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-end gap-3 animate-in fade-in">
              <div className="flex-1">
                <label className="block text-xs font-bold text-sky-950 mb-1">
                  Specify Custom Role Title (e.g. Cleaner, Data Architect, Radiologist, Electrician):
                </label>
                <input
                  className="w-full border border-sky-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter role name..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomRole();
                    }
                  }}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5"
                onClick={handleAddCustomRole}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Roles</span>
              </button>
              <button
                type="button"
                className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-2.5 rounded-lg transition"
                onClick={() => {
                  setIsCustomRole(false);
                  setForm({ ...form, role: 'lecturer' });
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition"
              onClick={createStaff}
            >
              Save Staff Member
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-xs" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 bg-background text-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles ({staff.length})</option>
          {rolesList.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading staff registry...</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="text-left p-3">Staff No.</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="p-3 font-mono text-xs font-bold text-slate-700">{s.staff_number}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-800">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200">
                      {rolesList.find((r) => r.value === s.role)?.label || s.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{s.department_name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    {canManage&&<button className="text-xs border rounded px-2 py-1 hover:bg-slate-50" onClick={()=>invite(s.email)}>Invite / link account</button>}
                    <button
                      hidden={!canManage}
                      className="text-xs border rounded px-2 py-1 ml-1 hover:bg-slate-50 inline-flex items-center gap-1"
                      onClick={() => toggleActive(s.id, !s.is_active)}
                    >
                      {s.is_active ? <ShieldX className="w-3 h-3 text-rose-500" /> : <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                      {s.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
