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
  Sparkles,
  Undo2,
} from 'lucide-react';
import type { LibraryBook, LibraryLoan } from '@/types';
import { summarizeLibrary } from '@/lib/library/librarian-dashboard';

/**
 * Librarian dashboard. Shows only library work: loans, returns, and the book
 * catalogue, plus general notices and events. It never renders institution
 * totals, course lists, or money figures, because none of those are library
 * work. Counts come from the library module's current loans and catalogue.
 */
export default function LibrarianDashboard() {
  const { firstName } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/v1/library', { signal: abort.signal })
      .then((res) => res.json())
      .then((json) => {
        if (abort.signal.aborted) return;
        if (json.success) {
          setBooks(json.data.books);
          setLoans(json.data.loans);
        } else {
          setError(json.error || 'Library records could not be loaded.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (abort.signal.aborted) return;
        setError(err?.message || 'Library records could not be loaded.');
        setLoading(false);
      });
    return () => abort.abort();
  }, []);

  const summary = summarizeLibrary(books, loans);
  const todayLabel = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="dashboard-page space-y-7">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">{todayLabel.toUpperCase()} <span /> LIBRARY WORKSPACE</p>
          <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome back, Librarian'}</h1>
          <p className="heading-caption">Here is your library today: loans out, returns due, and the catalogue.</p>
        </div>
        <div className="heading-tools">
          <span className="session-pill"><span className="session-dot" /> Semester 1 in session</span>
          <Link className="primary-action" href="/dashboard/library">
            <BookMarked size={16} />
            Open library
          </Link>
        </div>
      </section>

      {loading && <p role="status" className="text-slate-500">Loading library records...</p>}
      {error && <p role="alert" className="border border-amber-300 rounded p-4 text-amber-900">{error}</p>}

      {!loading && !error && (
        <>
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
                <span>Available copies</span>
                <span className="metric-icon"><Check size={18} strokeWidth={1.8} /></span>
              </div>
              <p className="metric-value">{summary.availableCopies}</p>
              <div className="metric-detail"><span className="metric-mark"><ArrowRight size={13} /></span>Across {summary.totalTitles} catalogue titles</div>
            </article>
          </section>

          <section className="workspace-grid">
            <article className="surface-panel course-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">RETURNS DESK</p><h2>Overdue loans</h2></div>
                <Link href="/dashboard/library" className="text-link">Open library <ArrowRight size={15} /></Link>
              </div>
              {summary.overdueLoans.length === 0 ? (
                <p className="text-sm text-slate-500 p-1">No overdue loans. Nothing needs chasing today.</p>
              ) : (
                <div className="table-wrap">
                  <table className="overview-table">
                    <thead><tr><th scope="col">Book</th><th scope="col">Borrower</th><th scope="col">Due date</th><th scope="col">Days late</th></tr></thead>
                    <tbody>{summary.overdueLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td><span className="course-title">{loan.bookTitle}</span></td>
                        <td><span className="course-title">{loan.borrower}</span><span className="course-code">{loan.admissionNumber}</span></td>
                        <td className="number-cell">{loan.dueDate}</td>
                        <td className="number-cell">{loan.daysOverdue}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <div className="table-footnote">
                <span><Check size={14} /> Counts come from the library module&apos;s current loans and catalogue</span>
                <span>{summary.dueSoonLoans.length} due in the next 7 days</span>
              </div>

              {summary.dueSoonLoans.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">DUE SOON</p>
                  <ul className="text-sm text-slate-700 space-y-1 mt-2">
                    {summary.dueSoonLoans.map((loan) => (
                      <li key={loan.id}>
                        <strong>{loan.bookTitle}</strong> — {loan.borrower} — due {loan.dueDate}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>

            <aside className="side-stack">
              <article className="surface-panel notice-panel">
                <div className="panel-heading compact-heading">
                  <div><p className="eyebrow">KEEP ON TRACK</p><h2>Coming up</h2></div>
                  <span className="calendar-icon"><CalendarDays size={18} /></span>
                </div>
                <div className="task-list">
                  <div className="task-item">
                    <span className="task-icon task-rose"><Clock3 size={16} /></span>
                    <span className="task-copy"><strong>Overdue returns to follow up</strong><small>{summary.overdue} {summary.overdue === 1 ? 'book' : 'books'} past return date</small></span>
                    <ArrowRight className="task-arrow" size={15} />
                  </div>
                  <div className="task-item">
                    <span className="task-icon task-blue"><CalendarDays size={16} /></span>
                    <span className="task-copy"><strong>Returns due this week</strong><small>{summary.dueThisWeek} {summary.dueThisWeek === 1 ? 'book' : 'books'} due in the next 7 days</small></span>
                    <ArrowRight className="task-arrow" size={15} />
                  </div>
                  <div className="task-item">
                    <span className="task-icon task-orange"><BookMarked size={16} /></span>
                    <span className="task-copy"><strong>Reservation pickups</strong><small>Holds are not tracked in the library module yet</small></span>
                    <ArrowRight className="task-arrow" size={15} />
                  </div>
                </div>
                <Link className="notice-link" href="/dashboard/announcements"><Megaphone size={15} /> All announcements <ArrowRight size={14} /></Link>
              </article>
            </aside>
          </section>

          <section className="shortcut-strip" aria-label="Quick access">
            <div className="shortcut-title"><span className="shortcut-rule" /><span>QUICK ACCESS</span></div>
            <Link href="/dashboard/library"><BookMarked size={17} /> Issue a book <ArrowRight size={14} /></Link>
            <Link href="/dashboard/library"><Undo2 size={17} /> Return a book <ArrowRight size={14} /></Link>
            <Link href="/dashboard/library"><Search size={17} /> Search the catalogue <ArrowRight size={14} /></Link>
            <Link href="/dashboard/ai"><Sparkles size={17} /> AI Advisor <ArrowRight size={14} /></Link>
            <Link href="/dashboard/announcements"><Megaphone size={17} /> Announcements <ArrowRight size={14} /></Link>
            <Link href="/dashboard/events"><CalendarDays size={17} /> Campus events <ArrowRight size={14} /></Link>
          </section>
        </>
      )}
    </div>
  );
}
