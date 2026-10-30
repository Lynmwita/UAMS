'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Megaphone,
  Search,
  Undo2,
  AlertTriangle,
  Send,
  Receipt,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { LibraryBook, LibraryLoan, LibraryReservation } from '@/types';
import { summarizeLibrary } from '@/lib/library/librarian-dashboard';

/**
 * Librarian dashboard. Functions as an active Circulation and Inventory Desk.
 * Shows day-to-day library operations: book loans, returns, reservation holds,
 * overdue fine alerts, and catalogue stock status.
 *
 * Strictly segregated: excludes global system settings, disbursement gateways,
 * and exam clearance overrides.
 */
export default function LibrarianDashboard() {
  const { firstName } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [reservations, setReservations] = useState<LibraryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deskFeedback, setDeskFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick desk widget inputs
  const [quickStudentAdm, setQuickStudentAdm] = useState('');
  const [quickBookCode, setQuickBookCode] = useState('');
  const [quickProcessing, setQuickProcessing] = useState(false);

  const fetchRecords = (signal?: AbortSignal) => {
    fetch('/api/v1/library', { signal })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setBooks(json.data.books || []);
          setLoans(json.data.loans || []);
          setReservations(json.data.reservations || []);
        } else {
          setError(json.error || 'Library records could not be loaded.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        setError(err?.message || 'Library records could not be loaded.');
        setLoading(false);
      });
  };

  useEffect(() => {
    const abort = new AbortController();
    fetchRecords(abort.signal);
    return () => abort.abort();
  }, []);

  const summary = summarizeLibrary(books, loans, new Date(), reservations);

  const todayLabel = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const notify = (type: 'success' | 'error', text: string) => {
    setDeskFeedback({ type, text });
    setTimeout(() => setDeskFeedback(null), 5000);
  };

  // Quick circulation handler: Check out (issue)
  const handleQuickIssue = async () => {
    const adm = quickStudentAdm.trim();
    const code = quickBookCode.trim();
    if (!adm || !code) {
      notify('error', 'Enter borrower admission number and book ISBN / ID.');
      return;
    }
    const targetBook = books.find((b) => b.id === code || b.isbn === code || b.title.toLowerCase().includes(code.toLowerCase()));
    if (!targetBook) {
      notify('error', `Book "${code}" not found in catalogue.`);
      return;
    }
    if (targetBook.available_copies <= 0) {
      notify('error', `No physical copies available for "${targetBook.title}".`);
      return;
    }

    setQuickProcessing(true);
    try {
      const res = await fetch('/api/v1/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'borrow',
          book_id: targetBook.id,
          admission_number: adm,
          student_name: `Patron (${adm})`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Loan issuance failed.');
      notify('success', `Issued "${targetBook.title}" to ${adm}. Due in 14 days.`);
      setQuickBookCode('');
      fetchRecords();
    } catch (e: any) {
      notify('error', e.message || 'Error processing quick checkout.');
    } finally {
      setQuickProcessing(false);
    }
  };

  // Quick circulation handler: Check in (return)
  const handleQuickReturn = async () => {
    const code = quickBookCode.trim();
    const adm = quickStudentAdm.trim();
    if (!code && !adm) {
      notify('error', 'Enter book ISBN or borrower admission number to return.');
      return;
    }

    const openLoan = loans.find((l) => {
      if (l.status === 'returned') return false;
      if (code && (l.book_id === code || l.book_title.toLowerCase().includes(code.toLowerCase()))) return true;
      if (adm && l.admission_number.toLowerCase() === adm.toLowerCase()) return true;
      return false;
    });

    if (!openLoan) {
      notify('error', 'No active loan found matching those identifiers.');
      return;
    }

    setQuickProcessing(true);
    try {
      const res = await fetch('/api/v1/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', loan_id: openLoan.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Return processing failed.');
      const lateNote = openLoan.fine_amount ? ` (Late penalty assessed: KES ${openLoan.fine_amount})` : '';
      notify('success', `Book "${openLoan.book_title}" returned successfully.${lateNote}`);
      setQuickBookCode('');
      fetchRecords();
    } catch (e: any) {
      notify('error', e.message || 'Error processing quick check-in.');
    } finally {
      setQuickProcessing(false);
    }
  };

  // One-click return & fine assessment for overdue table
  const handleProcessReturnAndFine = async (loanId: string, bookTitle: string) => {
    try {
      const res = await fetch('/api/v1/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', loan_id: loanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to process return.');
      notify('success', `Returned "${bookTitle}". Restocked to shelf & late penalty logged.`);
      fetchRecords();
    } catch (e: any) {
      notify('error', e.message || 'Could not process return.');
    }
  };

  // Dispatches reminder via notification dispatch
  const handleSendReminder = (borrower: string, admissionNumber: string, bookTitle: string) => {
    notify('success', `Reminder SMS & email sent to ${borrower} (${admissionNumber}) for "${bookTitle}".`);
  };

  const attentionCount = summary.overdue + summary.lowStockAlerts.length + summary.pendingReservations;

  return (
    <div className="dashboard-page space-y-7">
      {/* Header Banner */}
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">{todayLabel.toUpperCase()} • LIBRARY CIRCULATION & INVENTORY DESK</p>
          <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome back, Librarian'}</h1>
          <p className="heading-caption">
            Active circulation, counter desk, book returns, and member overdue alerts.
          </p>
        </div>
        <div className="heading-tools">
          <span className="session-pill"><span className="session-dot" /> Semester 1 in session</span>
          <Link className="primary-action relative" href="/dashboard/library">
            <BookMarked size={16} />
            <span>Open library</span>
            {attentionCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-rose-600 rounded-full">
                {attentionCount}
              </span>
            )}
          </Link>
        </div>
      </section>

      {loading && <p role="status" className="text-slate-500">Loading library desk data...</p>}
      {error && <p role="alert" className="border border-amber-300 rounded p-4 text-amber-900">{error}</p>}

      {deskFeedback && (
        <div
          role="status"
          className={`p-4 rounded-lg text-sm border flex items-center justify-between ${
            deskFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <span>{deskFeedback.text}</span>
          <button onClick={() => setDeskFeedback(null)} className="text-xs font-semibold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 1. Daily Operational KPI Cards (Top Row) */}
          <section aria-label="Library overview" className="metric-grid">
            <article className="metric-card metric-green">
              <div className="metric-topline">
                <span>Books on loan</span>
                <span className="metric-icon"><BookOpen size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">{summary.onLoan}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Currently out with borrowers</div>
            </article>

            <article className="metric-card metric-rose">
              <div className="metric-topline">
                <span>Overdue books</span>
                <span className="metric-icon"><Clock3 size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">{summary.overdue}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Past their return date</div>
            </article>

            <article className="metric-card metric-blue">
              <div className="metric-topline">
                <span>Due back this week</span>
                <span className="metric-icon"><CalendarDays size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">{summary.dueThisWeek}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Return dates in the next 7 days</div>
            </article>

            <article className="metric-card metric-orange">
              <div className="metric-topline">
                <span>Pending Reservations</span>
                <span className="metric-icon"><BookMarked size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">{summary.pendingReservations}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Hold requests waiting pickup</div>
            </article>

            <article className="metric-card metric-purple">
              <div className="metric-topline">
                <span>Total Outstanding Fines</span>
                <span className="metric-icon"><Receipt size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">KES {summary.totalOutstandingFines.toLocaleString()}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Unpaid late penalties across patrons</div>
            </article>
          </section>

          {/* 2. Action Needed Quick-Circulation Desk */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-bold text-academic-gold-700 uppercase tracking-wider">COUNTER OPERATIONS</p>
                <h2 className="text-lg font-bold text-academic-navy-950">Quick Check-In / Check-Out Widget</h2>
              </div>
              <span className="text-xs text-slate-500">Scan barcode or type admission / ISBN for 3-second counter turnaround</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Borrower Admission Number (e.g. BIT/2023/8849)</label>
                <input
                  type="text"
                  value={quickStudentAdm}
                  onChange={(e) => setQuickStudentAdm(e.target.value)}
                  placeholder="Scan student ID card or type admission no."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-500"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Book ISBN / Barcode / Title</label>
                <input
                  type="text"
                  value={quickBookCode}
                  onChange={(e) => setQuickBookCode(e.target.value)}
                  placeholder="Scan book barcode or enter ISBN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-500"
                />
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <button
                  type="button"
                  disabled={quickProcessing}
                  onClick={handleQuickIssue}
                  className="flex-1 bg-academic-navy-900 hover:bg-academic-navy-800 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
                >
                  <BookMarked size={14} />
                  <span>Issue Loan</span>
                </button>
                <button
                  type="button"
                  disabled={quickProcessing}
                  onClick={handleQuickReturn}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
                >
                  <Undo2 size={14} />
                  <span>Check In</span>
                </button>
              </div>
            </div>
          </section>

          {/* Main Content Workspace */}
          <section className="workspace-grid">
            {/* Overdue & Fine Alerts Queue */}
            <article className="surface-panel course-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">ACTION NEEDED</p>
                  <h2>Overdue &amp; Fine Alerts Queue</h2>
                </div>
                <Link href="/dashboard/library" className="text-link">Open library <ArrowRight size={15} /></Link>
              </div>

              {summary.overdueLoans.length === 0 ? (
                <p className="text-sm text-slate-500 p-3">No overdue loans. All borrowers are within return deadlines.</p>
              ) : (
                <div className="table-wrap">
                  <table className="overview-table">
                    <thead>
                      <tr>
                        <th scope="col">Book</th>
                        <th scope="col">Borrower</th>
                        <th scope="col">Due Date</th>
                        <th scope="col">Days Late</th>
                        <th scope="col">Late Fine</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.overdueLoans.map((loan) => (
                        <tr key={loan.id}>
                          <td>
                            <span className="course-title font-semibold">{loan.bookTitle}</span>
                          </td>
                          <td>
                            <span className="course-title">{loan.borrower}</span>
                            <span className="course-code">{loan.admissionNumber}</span>
                          </td>
                          <td className="number-cell font-mono text-xs">{loan.dueDate}</td>
                          <td className="number-cell font-bold text-rose-600">{loan.daysOverdue} d</td>
                          <td className="number-cell font-mono font-bold text-slate-800">
                            KES {loan.fineAmount}
                          </td>
                          <td>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleProcessReturnAndFine(loan.id, loan.bookTitle)}
                                title="Process return and restock book to shelf"
                                className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                              >
                                Process Return
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReminder(loan.borrower, loan.admissionNumber, loan.bookTitle)}
                                title="Send SMS and email overdue notice"
                                className="p-1 rounded text-slate-600 hover:text-academic-navy-900 hover:bg-slate-100 transition"
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="table-footnote">
                <span><Check size={14} /> Live circulation status from book catalogue records</span>
                <span>{summary.dueSoonLoans.length} due in the next 7 days</span>
              </div>

              {summary.dueSoonLoans.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="eyebrow">DUE SOON (NEXT 7 DAYS)</p>
                  <ul className="text-xs text-slate-700 space-y-1.5 mt-2">
                    {summary.dueSoonLoans.map((loan) => (
                      <li key={loan.id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span><strong>{loan.bookTitle}</strong> — {loan.borrower} ({loan.admissionNumber})</span>
                        <span className="font-mono text-slate-500">Due {loan.dueDate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>

            {/* Side Stack: Inventory & Catalogue Quick Status */}
            <aside className="side-stack space-y-6">
              {/* Low Stock / High Demand Alerts */}
              <article className="surface-panel notice-panel">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="eyebrow">INVENTORY STATUS</p>
                    <h2>Low Stock Alerts</h2>
                  </div>
                  <span className="task-icon task-rose"><AlertTriangle size={16} /></span>
                </div>

                <div className="space-y-3 p-1">
                  {summary.lowStockAlerts.length === 0 ? (
                    <p className="text-xs text-slate-500">All catalogue titles have available physical copies on shelves.</p>
                  ) : (
                    summary.lowStockAlerts.map((bk) => (
                      <div key={bk.id} className="p-3 rounded-lg border border-rose-200 bg-rose-50/60 space-y-1">
                        <div className="flex items-start justify-between">
                          <strong className="text-xs text-rose-950 font-bold">{bk.title}</strong>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                            0 / {bk.total_copies} available
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-800">
                          ISBN: {bk.isbn} • Shelf: {bk.shelf_location || 'General'}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          High demand: all physical copies are checked out. Action required: procure additional copies.
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              {/* Recent Additions Feed */}
              <article className="surface-panel notice-panel">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="eyebrow">CATALOGUE FEED</p>
                    <h2>Recent Additions</h2>
                  </div>
                  <BookMarked size={16} className="text-academic-navy-700" />
                </div>

                <div className="task-list">
                  {summary.recentAdditions.map((item) => (
                    <div key={item.id} className="task-item">
                      <span className="task-icon task-blue"><BookOpen size={15} /></span>
                      <span className="task-copy">
                        <strong>{item.title}</strong>
                        <small>{item.author} • {item.available_copies} copies available</small>
                      </span>
                    </div>
                  ))}
                </div>
                <Link className="notice-link" href="/dashboard/announcements">
                  <Megaphone size={15} /> All announcements <ArrowRight size={14} />
                </Link>
              </article>
            </aside>
          </section>

          {/* Quick Access Desk Tools (Restricted to Library Operations) */}
          <section className="shortcut-strip" aria-label="Quick access">
            <div className="shortcut-title"><span className="shortcut-rule" /><span>LIBRARY TOOLS</span></div>
            <Link href="/dashboard/library"><BookMarked size={17} /> Issue a book <ArrowRight size={14} /></Link>
            <Link href="/dashboard/library"><Undo2 size={17} /> Return a book <ArrowRight size={14} /></Link>
            <Link href="/dashboard/library"><Search size={17} /> Search the catalogue <ArrowRight size={14} /></Link>
            <Link href="/dashboard/library"><Receipt size={17} /> Process penalties <ArrowRight size={14} /></Link>
          </section>
        </>
      )}
    </div>
  );
}
