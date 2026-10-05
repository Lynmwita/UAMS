'use client';

import { useState } from 'react';
import { Bell, Plus, AlertCircle, Bookmark, Megaphone, Calendar, X, Filter } from 'lucide-react';

export default function AnnouncementsPage() {
  const [filterAudience, setFilterAudience] = useState('All');

  const [notices, setNotices] = useState([
    {
      id: '1',
      title: 'Semester 1 Course Registration & Add/Drop Deadline',
      audience: 'Students',
      category: 'Academic',
      priority: 'Urgent',
      date: 'Oct 3, 2026',
      author: 'Office of the Registrar',
      body: 'All students are reminded that the portal window for registering Semester 1 units will officially close on October 15, 2026 at 11:59 PM. Late registration will attract a penalty fee.',
    },
    {
      id: '2',
      title: 'Fee Payment & Examination Clearance Regulations',
      audience: 'Students',
      category: 'Finance',
      priority: 'Important',
      date: 'Oct 2, 2026',
      author: 'Bursar & Finance Directorate',
      body: 'Students must clear all outstanding semester balances via M-Pesa Paybill 522533 using their Student Admission Number as the account reference. Exam passes will be generated only for cleared students.',
    },
    {
      id: '3',
      title: 'Faculty Continuous Assessment (CAT) Marks Submission Deadline',
      audience: 'Faculty & Lecturers',
      category: 'Examinations',
      priority: 'Normal',
      date: 'Oct 1, 2026',
      author: 'Senate Examination Board',
      body: 'All course lecturers are requested to enter and submit Continuous Assessment Test (CAT 30%) scores into the UAMS portal before mid-semester moderation.',
    },
    {
      id: '4',
      title: 'University Career Fair & Tech Innovation Expo 2026',
      audience: 'All Campus',
      category: 'Events',
      priority: 'Normal',
      date: 'Sep 28, 2026',
      author: 'Dean of Students',
      body: 'Join leading tech and financial institutions at the Main Auditorium on November 10, 2026 for on-campus internship and graduate employment interviews.',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    audience: 'All Campus',
    category: 'Academic',
    priority: 'Normal',
    author: 'Registrar Academic Affairs',
    body: '',
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.body) return;

    const noticeObj = {
      id: `nt-${Date.now()}`,
      title: newNotice.title,
      audience: newNotice.audience,
      category: newNotice.category,
      priority: newNotice.priority,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: newNotice.author,
      body: newNotice.body,
    };

    setNotices([noticeObj, ...notices]);
    setIsModalOpen(false);
    setNewNotice({
      title: '',
      audience: 'All Campus',
      category: 'Academic',
      priority: 'Normal',
      author: 'Registrar Academic Affairs',
      body: '',
    });
  };

  const filteredNotices = filterAudience === 'All' ? notices : notices.filter((n) => n.audience === filterAudience || n.audience === 'All Campus');

  return (
    <div className="space-y-6">
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
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Publish Notice</span>
        </button>
      </div>

      {/* Filter Tabs */}
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
              </div>

              <span className="text-xs text-slate-400 font-medium">{n.date}</span>
            </div>

            <h2 className="text-lg font-bold text-academic-navy-950 mb-2">{n.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{n.body}</p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Issued by: {n.author}</span>
              <span className="text-academic-gold-700 font-medium">Verified Institutional Dispatch</span>
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
