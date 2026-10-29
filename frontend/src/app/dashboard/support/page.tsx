'use client';
import {useEffect,useState} from 'react';
type Support={id:string;source_id:string;kind:string;student_email:string;registration_number:string|null;title:string;body:string;status:string;is_sensitive:boolean;staff_status:string;staff_note:string;received_at:string};
export default function SupportInbox(){
 const [items,setItems]=useState<Support[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState<string|null>(null),[kind,setKind]=useState('all');
 const [page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [demoMode,setDemoMode]=useState(false);
 const load=async()=>{const response=await fetch(`/api/v1/support?page=${page}&kind=${kind}`,{cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error);setDemoMode(data.mode==='demo');setItems(data.data);setHasMore(Boolean(data.has_more));};
 useEffect(()=>{setLoading(true);void load().catch(error=>setError(error.message)).finally(()=>setLoading(false));},[page,kind]);
 const review=async(event:React.FormEvent<HTMLFormElement>,id:string)=>{event.preventDefault();const form=new FormData(event.currentTarget);setBusy(id);setError('');setNotice('');
  try{const response=await fetch('/api/v1/support',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:form.get('status'),staff_note:form.get('staff_note')})}),data=await response.json();if(!response.ok)throw new Error(data.error);setNotice('Review saved. The outcome will return to the Student Hub during synchronization.');await load();}
  catch(error){setError(error instanceof Error?error.message:'Review failed.');}finally{setBusy(null);}};
 return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Student Support Inbox</h1><p className="text-sm text-slate-600">Help requests, pilot feedback and attendance reports sent by the Student Hub.</p></div>
  {error&&<p role="alert" className="text-rose-700">{error}</p>}{notice&&<p role="status" className="text-emerald-700">{notice}</p>}
  <label className="block text-sm">Record type <select value={kind} onChange={event=>{setKind(event.target.value);setPage(0);}} className="rounded border px-3 py-2"><option value="all">All records</option><option value="ticket">Help requests</option><option value="feedback">Feedback</option><option value="attendance">Attendance</option></select></label>
  {loading?<p>Loading inbox…</p>:items.filter(item=>kind==='all'||item.kind===kind).length===0?<p>{demoMode?'Demo sessions show an empty inbox by design: this inbox reads live Student Hub records for institutional accounts, and demo sessions return no records. No sample requests have been seeded here; that needs a product decision before any are added.':'No requests match this view.'}</p>:items.filter(item=>kind==='all'||item.kind===kind).map(item=><article key={item.id} className="space-y-3 rounded-lg border bg-white p-5">
   <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{item.title}</h2><span className="text-xs">{item.kind} · {item.staff_status}{item.is_sensitive?' · Restricted':''}</span></div>
   <p className="text-xs text-slate-500">{item.student_email}{item.registration_number?` · ${item.registration_number}`:''} · {new Date(item.received_at).toLocaleString('en-KE')}</p><p className="whitespace-pre-wrap text-sm">{item.body}</p>
   <form className="space-y-3 border-t pt-3" onSubmit={event=>void review(event,item.id)}>
    <label className="block text-sm">Staff action <select name="status" defaultValue={item.staff_status==='open'?'in_review':item.staff_status} className="rounded border p-2"><option value="in_review">In review</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
    <label className="block text-sm">Reply visible to the student<textarea name="staff_note" required minLength={2} maxLength={4000} defaultValue={item.staff_note} rows={3} className="mt-1 block w-full rounded border p-2"/></label>
    <button disabled={busy!==null} className="rounded bg-academic-navy-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy===item.id?'Saving…':'Save action and reply'}</button>
   </form>
  </article>)}
  <div className="flex items-center gap-4"><button disabled={page===0||loading} onClick={()=>setPage(value=>value-1)} className="rounded border px-3 py-2 disabled:opacity-50">Previous</button><span className="text-sm">Page {page+1}</span><button disabled={!hasMore||loading} onClick={()=>setPage(value=>value+1)} className="rounded border px-3 py-2 disabled:opacity-50">Next</button></div>
 </div>;
}
