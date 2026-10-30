'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Bell, Plus, AlertCircle, Bookmark, Megaphone, Calendar, X, Filter } from 'lucide-react';

export default function AnnouncementsPage() {
  const {role}=useAuth();
  const canPost=['super_admin','admin','registrar','librarian'].includes(role);
  const [filterAudience, setFilterAudience] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [notices,setNotices]=useState<{id:string;title:string;audience:string;category:string;priority:string;date:string;author:string;body:string;is_published?:boolean}[]>([]);
  const loadNotices = () => {
    fetch('/api/v1/announcements').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setNotices(d.data);}).catch(e=>setError(e.message));
  };
  useEffect(()=>{ loadNotices(); },[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [newNotice, setNewNotice] = useState({
    title: '',
    audience: 'All Campus',
    category: role === 'librarian' ? 'Library & Books' : 'Academic',
    priority: 'Normal',
    author: role === 'librarian' ? 'University Librarian' : 'Registrar Academic Affairs',
    body: '',
  });

  const handleTogglePublish = async (noticeItem: { id: string; title: string; audience: string; category: string; priority: string; body: string; is_published?: boolean }) => {
    if (!canPost) return;
    setWithdrawingId(noticeItem.id);
    setError('');
    setSuccess('');
    const targetState = noticeItem.is_published === false;
    try {
      const r = await fetch('/api/v1/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noticeItem.id,
          title: noticeItem.title,
          audience: noticeItem.audience,
          category: noticeItem.category,
          priority: noticeItem.priority,
          body: noticeItem.body,
          is_published: targetState,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to update notice status.');
      setNotices(prev => prev.map(n => n.id === noticeItem.id ? { ...n, is_published: targetState } : n));
      setSuccess(`Notice ${targetState ? 'published' : 'withdrawn'} successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const handlePublish=async(e:React.FormEvent)=>{
    e.preventDefault();if(!canPost)return;
    try{const r=await fetch('/api/v1/announcements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newNotice)});const d=await r.json();if(!r.ok)throw new Error(d.error);setNotices(prev=>[d.data,...prev]);setIsModalOpen(false);setError('');setSuccess('Notice published successfully.');}catch(e){setError(e instanceof Error?e.message:'Publishing failed.');}
  };

  const filteredNotices = notices.filter((n) => {
    const matchAudience = filterAudience === 'All' || n.audience === filterAudience || n.audience === 'All Campus';
    const matchCategory = filterCategory === 'All' || n.category.toLowerCase().includes(filterCategory.toLowerCase());
    return matchAudience && matchCategory;
  });

  return (
    <div className="space-y-6">
      {error&&<p role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg text-sm">{error}</p>}
      {success&&<p role="status" className="text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">{success}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Official University Announcements & Bulletins
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Targeted notifications, academic calendar notices, fee advisories, and institutional circulars.
          </p>
        </div>

        <button
          hidden={!canPost} style={{display:canPost ? undefined : 'none'}}
            onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>{role === 'librarian' ? 'Publish Library Notice' : 'Publish Notice'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {['All', 'Students', 'Faculty & Lecturers', 'All Campus'].map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                filterAudience === aud
                  ? 'bg-academic-navy-900 text-white shadow'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {aud === 'All' ? 'All Bulletins' : aud}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold px-1 text-[11px] uppercase tracking-wider">Category:</span>
          {['All', 'Library & Books', 'Academic', 'Fee Advisories'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-academic-gold-500 text-academic-navy-950 font-bold shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'All' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.map((n) => (
          <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 transition">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase bg-academic-navy-50 text-academic-navy-900 border border-academic-navy-200 px-2.5 py-0.5 rounded">
                  {n.audience}
                </span>

                <span
                  className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded border ${
                    n.priority === 'Urgent'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : n.priority === 'Important'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {n.priority}
                </span>

                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                  {n.category}
                </span>

                {n.is_published === false && (
                  <span className="text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded">
                    Withdrawn
                  </span>
                )}
              </div>

              <span className="text-xs text-slate-400 font-medium">{n.date}</span>
            </div>

            <h2 className="text-lg font-bold text-academic-navy-950 mb-2">{n.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{n.body}</p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span className="font-semibold text-slate-700">Issued by: {n.author}</span>
              <div className="flex items-center gap-3">
                <span className="text-academic-gold-700 font-medium">Verified Institutional Dispatch</span>
                {canPost && (
                  <button
                    type="button"
                    disabled={withdrawingId === n.id}
                    onClick={() => handleTogglePublish(n)}
                    className={`font-semibold px-2.5 py-1 rounded text-xs transition border ${
                      n.is_published === false
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    {withdrawingId === n.id ? 'Updating...' : n.is_published === false ? 'Republish Notice' : 'Withdraw Notice'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Publish Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Megaphone className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Publish University Notice</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notice Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Semester Examination Timetable Release"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Audience</label>
                  <select
                    value={newNotice.audience}
                    onChange={(e) => setNewNotice({ ...newNotice, audience: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  >
                    <option value="All Campus">All Campus</option>
                    <option value="Students">Students</option>
                    <option value="Faculty & Lecturers">Faculty & Lecturers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  >
                    <option value="Library & Books">Library & Books</option>
                    <option value="Academic">Academic</option>
                    <option value="Finance">Finance</option>
                    <option value="Examinations">Examinations</option>
                    <option value="Events">Events</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Priority</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Issuing Authority</label>
                <input
                  type="text"
                  required
                  value={newNotice.author}
                  onChange={(e) => setNewNotice({ ...newNotice, author: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notice Body / Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide comprehensive details of the official circular..."
                  value={newNotice.body}
                  onChange={(e) => setNewNotice({ ...newNotice, body: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none leading-relaxed"
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
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
