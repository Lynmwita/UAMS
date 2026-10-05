'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Search, BookOpen, CheckCircle2, AlertCircle, ArrowUpRight, Check, BookMarked } from 'lucide-react';
import { LibraryBook, LibraryLoan } from '@/types';

export default function LibraryPage() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [borrowModalBook, setBorrowModalBook] = useState<LibraryBook | null>(null);
  const [studentAdmission, setStudentAdmission] = useState('BIT/2023/8849');
  const [studentName, setStudentName] = useState('Alex Kiptoo Kimutai');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      const res = await fetch('/api/v1/library');
      const json = await res.json();
      if (json.success) {
        setBooks(json.data.books);
        setLoans(json.data.loans);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBorrow = async () => {
    if (!borrowModalBook) return;
    setMessage(null);
    try {
      const res = await fetch('/api/v1/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'borrow',
          book_id: borrowModalBook.id,
          student_name: studentName,
          admission_number: studentAdmission,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setBorrowModalBook(null);
        fetchLibraryData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Borrowing failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  const handleReturn = async (loanId: string) => {
    setMessage(null);
    try {
      const res = await fetch('/api/v1/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'return',
          loan_id: loanId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchLibraryData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-academic-navy-900" />
            Digital Library & Resource Center
          </h1>
          <p className="text-sm text-slate-500">
            Search physical and digital library catalogue, track book loans, circulation, and fines.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'catalog' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Book Catalogue
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'loans' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Circulation ({loans.filter((l) => l.status === 'borrowed').length})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, category, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBooks.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-academic-navy-600 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {b.category}
                    </span>
                    <span className="text-xs font-mono text-slate-500">ISBN: {b.isbn}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{b.title}</h3>
                  <p className="text-xs text-slate-600">By {b.author}</p>
                  <p className="text-xs text-slate-400 font-mono">Location: {b.shelf_location} | Publisher: {b.publisher}</p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold ${b.available_copies > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {b.available_copies} of {b.total_copies} Copies Available
                    </span>
                  </div>
                  <button
                    disabled={b.available_copies === 0}
                    onClick={() => setBorrowModalBook(b)}
                    className="bg-academic-navy-900 hover:bg-academic-navy-950 disabled:bg-slate-300 text-academic-gold-400 font-bold py-1.5 px-3 rounded-lg text-xs transition shadow flex items-center gap-1"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    Issue Loan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="p-3">Book Title</th>
                  <th className="p-3">Borrower</th>
                  <th className="p-3">Borrow Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{l.book_title}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{l.student_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{l.admission_number}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{l.borrow_date}</td>
                    <td className="p-3 font-mono text-slate-600">{l.due_date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === 'returned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {l.status !== 'returned' && (
                        <button
                          onClick={() => handleReturn(l.id)}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1 px-2.5 rounded text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Check In / Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {borrowModalBook && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Issue Book Loan</h3>
            <p className="text-xs text-slate-600">
              Issuing <strong>{borrowModalBook.title}</strong> (ISBN: {borrowModalBook.isbn})
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
                <input
                  type="text"
                  value={studentAdmission}
                  onChange={(e) => setStudentAdmission(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBorrowModalBook(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBorrow}
                className="px-4 py-1.5 text-xs bg-academic-navy-900 text-academic-gold-400 font-bold rounded-lg shadow"
              >
                Confirm Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
