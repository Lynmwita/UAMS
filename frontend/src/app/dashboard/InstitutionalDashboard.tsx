'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useAuth} from '@/lib/auth/context';
import {canAccessPage} from '@/lib/auth/roles';
import {ROLE_LABELS} from '@/lib/auth/rbac';
import LibrarianDashboard from './LibrarianDashboard';
import SupportStaffDashboard from './SupportStaffDashboard';

type Metric={label:string;value:string};
type Course={id?:string;code:string;title:string;department:string;is_active:boolean};
type Load<T>={data:T|null;error:string;loading:boolean};
const empty=<T,>():Load<T>=>({data:null,error:'',loading:true});
const modules=[['students','Student records'],['courses','Courses & registration'],['grades','Grades & transcripts'],['attendance','Class attendance'],['finance','Finance & invoices'],['exams','Examinations'],['timetable','Teaching timetable'],['admissions','Admissions'],['staff','Staff & teaching allocations'],['structure','Academic structure'],['announcements','Announcements'],['events','Campus events'],['reports','Institutional reports'],['support','Student support'],['library','Library'],['hostel','Accommodation'],['audit','Audit ledger']] as const;

export default function InstitutionalDashboard(){
 const {role,id,firstName}=useAuth();
 const [summary,setSummary]=useState<Load<Metric[]>>(empty);
 const [catalogue,setCatalogue]=useState<Load<Course[]>>(empty);
 const [refreshed,setRefreshed]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();
  if (role === 'librarian') return () => abort.abort();
  if (role === 'support_staff') return () => abort.abort();
  setSummary(empty());setCatalogue(empty());setRefreshed(null);
  async function read(path:string){const r=await fetch('/api/v1/'+path,{cache:'no-store',signal:abort.signal});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Institutional records could not be loaded.');return d.data;}
  async function metrics():Promise<Metric[]>{
   if(role==='student'){
    const [profiles,registrations]=await Promise.all([read('students'),read('courses/register')]);
    const self=profiles.find((s:any)=>s.user_id===id);if(!self)throw new Error('Your student profile has not been linked. Contact the Registrar.');
    return [{label:'Program',value:self.program_name},{label:'Enrollment status',value:self.status},{label:'Approved course registrations',value:String(registrations.filter((r:any)=>r.status==='approved').length)},{label:'Account balance',value:'KES '+Number(self.fee_balance).toLocaleString('en-KE')}];
   }
   if(role==='lecturer'){
    const [courses,registrations]=await Promise.all([read('courses'),read('courses/register')]);
    return [{label:'Courses in your current teaching allocation',value:String(courses.length)},{label:'Approved registrations in your course scope',value:String(registrations.filter((r:any)=>r.status==='approved').length)},{label:'Distinct students in your course scope',value:String(new Set(registrations.filter((r:any)=>r.status==='approved').map((r:any)=>r.student_id)).size)}];
   }
   const report=await read('reports');
   if(role==='finance_officer')return [{label:'Fees invoiced',value:'KES '+Number(report.financeTotals.invoiced).toLocaleString('en-KE')},{label:'Allocated fee payments',value:'KES '+Number(report.financeTotals.collected).toLocaleString('en-KE')},{label:'Outstanding invoice balances',value:'KES '+Number(report.financeTotals.outstanding).toLocaleString('en-KE')},{label:'Issued invoices',value:String(report.financeTotals.invoices_issued)}];
   return [{label:role==='hod'?'Students in your department':'Student records',value:String(report.overview.total_students)},{label:'Active students',value:String(report.overview.active_students)},{label:'Courses in your authorized scope',value:String(report.catalogTotals.courses)},{label:'Pending course registrations',value:String(report.registrationsByCourse.reduce((sum:number,c:any)=>sum+c.pending,0))}];
  }
  metrics().then(data=>{if(!abort.signal.aborted){setSummary({data,error:'',loading:false});setRefreshed(new Date().toISOString());}}).catch(e=>{if(!abort.signal.aborted)setSummary({data:null,error:e.message,loading:false});});
  if(canAccessPage(role,'courses'))read('courses').then(data=>{if(!abort.signal.aborted)setCatalogue({data,error:'',loading:false});}).catch(e=>{if(!abort.signal.aborted)setCatalogue({data:null,error:e.message,loading:false});});
  return()=>abort.abort();
 },[role,id,revision]);
 if (role === 'librarian') return <LibrarianDashboard />;
 if (role === 'support_staff') return <SupportStaffDashboard />;
 return <div className="space-y-7">
  <header className="flex flex-wrap justify-between items-start gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{new Date().toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p><h1 className="text-3xl font-bold text-academic-navy-950 mt-2">Welcome{firstName?', '+firstName:''}</h1><p className="text-slate-600 mt-2">{ROLE_LABELS[role]} workspace. Records are limited to your authorized institutional scope.</p></div><button className="border rounded-lg px-4 py-2" onClick={()=>setRevision(n=>n+1)} disabled={summary.loading}>Refresh records</button></header>
  <section aria-label="Institutional summary" aria-busy={summary.loading}>
   {summary.loading&&<p role="status">Loading institutional records…</p>}
   {summary.error&&<p role="alert" className="border border-amber-300 rounded p-4 text-amber-900">{summary.error} Open the relevant module or retry after the database is available.</p>}
   {summary.data&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.data.map(m=><article className="bg-white border rounded-xl p-5" key={m.label}><h2 className="text-sm text-slate-600">{m.label}</h2><p className="text-2xl font-semibold mt-3 break-words">{m.value}</p></article>)}</div>}
   {refreshed&&<p className="text-xs text-slate-500 mt-2">Records retrieved {new Date(refreshed).toLocaleString('en-KE')}.</p>}
  </section>
  <section aria-label="Your modules"><h2 className="text-lg font-bold mb-3">Open a module</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.filter(([module])=>canAccessPage(role,module)).map(([module,label])=><Link key={module} href={'/dashboard/'+module} className="bg-white border rounded-lg p-4 font-medium hover:border-slate-500 focus-visible:outline focus-visible:outline-2">{label}<span aria-hidden="true" className="float-right">→</span></Link>)}</div></section>
  {canAccessPage(role,'courses')&&<section className="bg-white border rounded-xl p-5" aria-busy={catalogue.loading}><div className="flex justify-between gap-3"><h2 className="text-lg font-bold">{role==='lecturer'?'Your teaching allocation':role==='hod'?'Department course catalogue':'Course catalogue'}</h2><Link href="/dashboard/courses" className="underline text-sm">Open courses</Link></div>{catalogue.loading&&<p role="status" className="mt-4">Loading courses…</p>}{catalogue.error&&<p role="alert" className="mt-4 text-amber-900">{catalogue.error}</p>}{catalogue.data&&<><div className="overflow-x-auto"><table className="w-full mt-4 text-sm text-left"><thead><tr className="border-b"><th className="py-3">Code</th><th>Course</th><th>Department</th><th>Status</th></tr></thead><tbody>{catalogue.data.slice(0,8).map(c=><tr key={c.id||c.code} className="border-b"><td className="py-3 pr-3 font-mono">{c.code}</td><td className="pr-3">{c.title}</td><td className="pr-3">{c.department}</td><td>{c.is_active?'Active':'Inactive'}</td></tr>)}</tbody></table></div>{catalogue.data.length===0&&<p className="mt-4">No course records are available in your authorized scope.</p>}{catalogue.data.length>8&&<p className="text-xs text-slate-500 mt-3">Showing 8 of {catalogue.data.length} authorized course records.</p>}</>}</section>}
 </div>;
}
