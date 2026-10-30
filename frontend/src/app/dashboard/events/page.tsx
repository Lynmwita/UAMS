'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Plus, MapPin, Clock3, Building } from 'lucide-react';
import {useAuth} from '@/lib/auth/context';

type CampusEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  starts_at: string;
  ends_at: string;
  location: string;
  scope_type: string;
  scope_name: string | null;
  created_by: string;
  scope_id:string|null;
  is_active:boolean;
};

const CATEGORY_COLOR: Record<string, string> = {
  academic: 'bg-sky-100 text-sky-700',
  sports: 'bg-emerald-100 text-emerald-700',
  cultural: 'bg-fuchsia-100 text-fuchsia-700',
  orientation: 'bg-amber-100 text-amber-700',
  exam: 'bg-rose-100 text-rose-700',
  holiday: 'bg-teal-100 text-teal-700',
  meeting: 'bg-indigo-100 text-indigo-700',
  other: 'bg-slate-100 text-slate-700',
};

export default function EventsPage() {
  const {role}=useAuth();const canWrite=['admin','super_admin','registrar','hod','librarian'].includes(role);
  const [editingId,setEditingId]=useState('');
  const [scopes,setScopes]=useState<Record<string,{id:string;name:string}[]>>({});
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'academic',
    starts_at: '',
    ends_at: '',
    location: '',
    scope_type: 'university',
    scope_id: '',
    scope_name: '',
  });

  const load = () =>
    fetch('/api/v1/events?upcoming=true')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setEvents(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    Promise.all(['schools','departments','programs'].map(async module=>{const r=await fetch('/api/v1/'+module);const d=await r.json();return [module,d.success?d.data:[]] as const;})).then(entries=>setScopes(Object.fromEntries(entries)));
  }, []);

  const createEvent = async () => {
    const r = await fetch('/api/v1/events', {
      method: editingId?'PATCH':'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...form,...(editingId?{id:editingId}:{})}),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setShowForm(false);
    setEditingId('');
    setError('');
    setForm({ ...form, title: '', description: '', starts_at: '', ends_at: '', location: '', scope_id: '', scope_name: '' });
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarPlus className="w-7 h-7 text-violet-600" />
          <div>
            <h1 className="text-xl font-bold">Campus Events</h1>
            <p className="text-sm text-muted-foreground">Publish and update the campus calendar. Student Hub imports changes through the configured synchronization job.</p>
          </div>
        </div>
        <button hidden={!canWrite} className="bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-violet-800 flex items-center gap-2" onClick={() => {setEditingId('');setShowForm((v) => !v);}}>
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-md">{error}</p>}

      {showForm && (
        <div className="border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20">
          <input className="border rounded px-3 py-2 col-span-2" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['academic', 'sports', 'cultural', 'orientation', 'exam', 'holiday', 'meeting', 'other'].map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <select className="border rounded px-3 py-2" value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value })}>
            <option value="university">Whole University</option>
            <option value="school">School</option>
            <option value="department">Department</option>
            <option value="program">Program</option>
          </select>
          <input className="border rounded px-3 py-2 col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="border rounded px-3 py-2" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <input className="border rounded px-3 py-2" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          {form.scope_type !== 'university' && (
            <>
              <select aria-label="Event scope" className="border rounded px-3 py-2" value={form.scope_id} onChange={e=>{const entries=scopes[form.scope_type==='school'?'schools':form.scope_type==='department'?'departments':'programs']||[];setForm({...form,scope_id:e.target.value,scope_name:entries.find(s=>s.id===e.target.value)?.name||''});}}><option value="">Choose scope</option>{(scopes[form.scope_type==='school'?'schools':form.scope_type==='department'?'departments':'programs']||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <input className="border rounded px-3 py-2" placeholder="Scope name" value={form.scope_name} onChange={(e) => setForm({ ...form, scope_name: e.target.value })} />
            </>
          )}
          <button className="bg-violet-700 text-white text-sm px-4 py-2 rounded-md hover:bg-violet-800" onClick={createEvent}>
            Publish Event
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading events...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <div key={e.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${CATEGORY_COLOR[e.category] || 'bg-slate-100'}`}>{e.category}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="w-3 h-3" /> {e.scope_type === 'university' ? 'All students' : e.scope_name || e.scope_type}
                </span>
              </div>
              <h3 className="font-semibold">{e.title}</h3>
              {canWrite&&<div className="flex gap-2"><button className="border rounded px-2 py-1 text-xs" onClick={()=>{setEditingId(e.id);setForm({title:e.title,description:e.description,category:e.category,starts_at:e.starts_at.slice(0,16),ends_at:e.ends_at.slice(0,16),location:e.location,scope_type:e.scope_type,scope_id:e.scope_id||'',scope_name:e.scope_name||''});setShowForm(true);}}>Edit</button><button className="border rounded px-2 py-1 text-xs" disabled={!e.is_active} onClick={async()=>{try{const r=await fetch('/api/v1/events',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...e,is_active:false})});const d=await r.json();if(!r.ok)throw new Error(d.error);load();}catch(err:any){setError(err.message);}}}>{e.is_active?'Withdraw':'Withdrawn'}</button></div>}
              {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Clock3 className="w-3 h-3" /> {fmt(e.starts_at)} → {fmt(e.ends_at)}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {e.location}
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-muted-foreground">No upcoming events.</p>}
        </div>
      )}
    </div>
  );
}
