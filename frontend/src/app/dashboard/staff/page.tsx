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

export default function StaffPage() {
  const {role}=useAuth();
  const canManage=['admin','super_admin'].includes(role);
  const [departments,setDepartments]=useState<{id:string;name:string}[]>([]);
  const [notice,setNotice]=useState('');
  const [allocation,setAllocation]=useState({lecturer_staff_id:'',course_code:''});
  const [courses,setCourses]=useState<{code:string;title:string}[]>([]);
  useEffect(()=>{fetch('/api/v1/courses').then(r=>r.json()).then(d=>{if(d.success)setCourses(d.data);});},[]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
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
        <div className="border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20">
          <input className="border rounded px-3 py-2" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="lecturer">Lecturer</option>
            <option value="registrar">Registrar</option>
            <option value="hod">Head of Department</option>
            <option value="finance_officer">Finance Officer</option>
            <option value="admin">Administrator</option>
            <option value="library">Library Staff</option>
            <option value="hostel_warden">Hostel Warden</option>
            <option value="it_support">IT Support</option>
          </select>
          <select aria-label="Department" className="border rounded px-3 py-2" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">Choose department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <input className="border rounded px-3 py-2" placeholder="Job title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          <button className="bg-sky-700 text-white text-sm px-4 py-2 rounded-md hover:bg-sky-800" onClick={createStaff}>
            Save Staff Member
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full pl-9 pr-3 py-2 rounded-md border bg-background" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 bg-background" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="lecturer">Lecturer</option>
          <option value="registrar">Registrar</option>
          <option value="hod">HOD</option>
          <option value="finance_officer">Finance Officer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {loading ? (
        <p>Loading staff...</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Staff No.</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{s.staff_number}</td>
                  <td className="p-3">
                    <div className="font-medium">
                      {s.first_name} {s.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="p-3 capitalize">{s.role.replace('_', ' ')}</td>
                  <td className="p-3">{s.department_name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    {canManage&&<button className="text-xs border rounded px-2 py-1" onClick={()=>invite(s.email)}>Invite / link account</button>}
                    <button
                      hidden={!canManage}
                      className="text-xs border rounded px-2 py-1 flex items-center gap-1"
                      onClick={() => toggleActive(s.id, !s.is_active)}
                    >
                      {s.is_active ? <ShieldX className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
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
