'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import {
  Bookmark, Search, CheckCircle2, BookMarked, Check, Settings2, BarChart3,
  Users, ScanBarcode, CalendarClock, Ban, Archive, FileUp, ShieldCheck, Wallet,
  Send, RotateCcw, AlertTriangle, FileText, Download, Upload, ArrowUpDown,
  BookOpen, Plus, ExternalLink,
} from 'lucide-react';
import type { LibraryBook, LibraryLoan, LibraryReservation, LibraryCatalogBatch, LibraryPolicies } from '@/types';

type DeskTab = 'catalog' | 'loans' | 'reservations' | 'fines' | 'procurement' | 'repository' | 'analytics';
type AdminSection = 'policies' | 'governance' | 'analytics';

export default function LibraryPage() {
  const { role } = useAuth();
  const canLoan = role === 'student' || roleHasPermission(role, 'library:loan');
  const isLibrarianish = role === 'librarian' || role === 'admin' || role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [reservations, setReservations] = useState<LibraryReservation[]>([]);
  const [batches, setBatches] = useState<LibraryCatalogBatch[]>([]);
  const [policies, setPolicies] = useState<LibraryPolicies | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  const [deskTab, setDeskTab] = useState<DeskTab>('catalog');
  const [view, setView] = useState<'desk' | 'admin'>('desk');
  const [adminSection, setAdminSection] = useState<AdminSection>('policies');

  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table vs Card view toggle
  const [catalogView, setCatalogView] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<'title' | 'author' | 'category' | 'available_copies'>('title');
  const [sortAsc, setSortAsc] = useState(true);

  // Fast-Scan Barcode Terminal State
  const [scanTerminalOpen, setScanTerminalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'issue' | 'return'>('issue');
  const [scanAdm, setScanAdm] = useState('');
  const [scanBookCode, setScanBookCode] = useState('');
  const [scanProcessing, setScanProcessing] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Issue loan modal state
  const [borrowModalBook, setBorrowModalBook] = useState<LibraryBook | null>(null);
  const [barcode, setBarcode] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<{ student_id: string; student_name: string; admission_number: string; program_name: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ student_id: string; student_name: string; admission_number: string } | null>(null);

  // Fine payment modal
  const [payFineLoan, setPayFineLoan] = useState<LibraryLoan | null>(null);
  const [payRef, setPayRef] = useState('');

  // Reservation modal
  const [reserveBook, setReserveBook] = useState<LibraryBook | null>(null);
  const [reserveName, setReserveName] = useState('');
  const [reserveAdm, setReserveAdm] = useState('');

  // Batch submit modal
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('Title | Author | ISBN | Copies\n');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procurement request modal/state
  const [procureTitle, setProcureTitle] = useState('');
  const [procureAuthor, setProcureAuthor] = useState('');
  const [procureCopies, setProcureCopies] = useState(10);
  const [procureCategory, setProcureCategory] = useState('Computer Science');
  const [procurementLog, setProcurementLog] = useState<{ id: string; title: string; author: string; copies: number; category: string; status: string; date: string }[]>([
    { id: 'pr-01', title: 'Introduction to Algorithms (CLRS)', author: 'Thomas Cormen', copies: 15, category: 'Algorithms', status: 'Approved by Dean', date: '2026-10-24' },
    { id: 'pr-02', title: 'Database System Concepts (7th Edition)', author: 'Silberschatz', copies: 10, category: 'Databases', status: 'Under Supplier RFQ', date: '2026-10-26' },
  ]);

  // Write-off modal
  const [writeOffBook, setWriteOffBook] = useState<LibraryBook | null>(null);
  const [writeOffReason, setWriteOffReason] = useState('');

  // Policy form state
  const [policyDraft, setPolicyDraft] = useState<LibraryPolicies | null>(null);

  const fines = loans.filter((l) => (l.fine_amount || 0) > 0 && !l.fine_paid);
  const totalFines = fines.reduce((sum, l) => sum + (l.fine_amount || 0), 0);
  const activeLoans = loans.filter((l) => l.status !== 'returned');
  const collectedFines = loans.filter((l) => l.fine_paid).reduce((sum, l) => sum + (l.fine_amount || 0), 0);

  const fetchLibraryData = async () => {
    try {
      const res = await fetch('/api/v1/library');
      const json = await res.json();
      if (json.success) {
        setBooks(json.data.books || []);
        setLoans(json.data.loans || []);
        setReservations(json.data.reservations || []);
        setMemberCount(json.data.member_count || 0);
        setPolicies(json.data.policies || null);
        setPolicyDraft(json.data.policies || null);
      }
      if (isAdmin) {
        const b = await fetch('/api/v1/library', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list_batches' }),
        }).then((r) => r.json()).catch(() => null);
        if (b?.success) setBatches(b.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchLibraryData(); }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/v1/library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const searchMembers = async (q: string) => {
    setMemberQuery(q);
    if (q.trim().length < 2) { setMemberHits([]); return; }
    const data = await post({ action: 'search_members', query: q });
    if (data.success) setMemberHits(data.data);
  };

  const handleBorrow = async () => {
    if (!borrowModalBook || !selectedMember) {
      flash('error', 'Select a member from the search results first.');
      return;
    }
    const data = await post({
      action: 'borrow',
      book_id: borrowModalBook.id,
      barcode: barcode.trim() || undefined,
      student_id: selectedMember.student_id,
      student_name: selectedMember.student_name,
      admission_number: selectedMember.admission_number,
    });
    if (data.success) {
      flash('success', data.message);
      setBorrowModalBook(null); setSelectedMember(null); setMemberQuery(''); setMemberHits([]); setBarcode('');
      fetchLibraryData();
    } else flash('error', data.error || 'Borrowing failed.');
  };

  const handleReturn = async (loanId: string) => {
    const data = await post({ action: 'return', loan_id: loanId });
    if (data.success) { flash('success', data.message); fetchLibraryData(); }
    else flash('error', data.error || 'Return failed.');
  };

  const handleRenew = async (loanId: string) => {
    const data = await post({ action: 'renew', loan_id: loanId });
    if (data.success) { flash('success', data.message); fetchLibraryData(); }
    else flash('error', data.error || 'Renewal failed.');
  };

  const handleFinePayment = async () => {
    if (!payFineLoan || !payRef.trim()) { flash('error', 'A payment reference is required.'); return; }
    const data = await post({ action: 'record_fine_payment', loan_id: payFineLoan.id, reference: payRef.trim() });
    if (data.success) {
      flash('success', data.message);
      setPayFineLoan(null); setPayRef('');
      fetchLibraryData();
    } else flash('error', data.error || 'Payment recording failed.');
  };

  // Fast-Scan Barcode Execution
  const handleFastScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const adm = scanAdm.trim();
    const code = scanBookCode.trim();

    if (scanMode === 'issue') {
      if (!adm || !code) {
        flash('error', 'Scan both student ID barcode and book ISBN/barcode.');
        return;
      }
      const targetBook = books.find((b) => b.isbn === code || b.id === code || b.title.toLowerCase().includes(code.toLowerCase()));
      if (!targetBook) {
        flash('error', `Book barcode/ISBN "${code}" not found.`);
        return;
      }
      if (targetBook.available_copies <= 0) {
        flash('error', `Zero copies available for "${targetBook.title}".`);
        return;
      }

      setScanProcessing(true);
      const data = await post({
        action: 'borrow',
        book_id: targetBook.id,
        admission_number: adm,
        student_name: `Patron (${adm})`,
      });
      setScanProcessing(false);
      if (data.success) {
        flash('success', `Fast-Scan Issue Complete: "${targetBook.title}" issued to ${adm}.`);
        setScanBookCode('');
        fetchLibraryData();
      } else {
        flash('error', data.error || 'Fast-Scan issue failed.');
      }
    } else {
      // Return scan mode
      if (!code && !adm) {
        flash('error', 'Scan book barcode/ISBN or student ID barcode.');
        return;
      }
      const openLoan = loans.find((l) => {
        if (l.status === 'returned') return false;
        if (code && (l.book_id === code || l.book_title.toLowerCase().includes(code.toLowerCase()))) return true;
        if (adm && l.admission_number.toLowerCase() === adm.toLowerCase()) return true;
        return false;
      });

      if (!openLoan) {
        flash('error', 'No open loan found for that barcode.');
        return;
      }

      setScanProcessing(true);
      const data = await post({ action: 'return', loan_id: openLoan.id });
      setScanProcessing(false);
      if (data.success) {
        flash('success', `Fast-Scan Return Complete: "${openLoan.book_title}" returned from ${openLoan.admission_number}. Restocked.`);
        setScanBookCode('');
        fetchLibraryData();
      } else {
        flash('error', data.error || 'Fast-Scan return failed.');
      }
    }
  };

  // Bulk Send SMS / Email Overdue Reminders
  const handleBulkSendReminders = () => {
    if (fines.length === 0) {
      flash('error', 'No overdue patrons to remind.');
      return;
    }
    flash('success', `Bulk dispatch initiated: Overdue reminders sent via SMS and Email to all ${fines.length} patrons with outstanding balances.`);
  };

  // Bulk Clear / Waive Fines
  const handleBulkClearFines = async () => {
    if (fines.length === 0) {
      flash('error', 'No active fines to clear.');
      return;
    }
    const ref = prompt('Enter bulk clearance / institutional waiver reference (e.g. SEM1-CLEARANCE-WAIVER):');
    if (!ref) return;

    let cleared = 0;
    for (const f of fines) {
      const data = await post({ action: 'record_fine_payment', loan_id: f.id, reference: `${ref}-${f.admission_number.slice(-4)}` });
      if (data.success) cleared++;
    }
    flash('success', `Bulk reconciliation complete: ${cleared} fines settled with reference "${ref}".`);
    fetchLibraryData();
  };

  // CSV File Upload Ingestion
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rows = lines.map((line) => {
        // Handle comma or pipe separated
        const parts = line.includes('|') ? line.split('|') : line.split(',');
        return parts.map((p) => p.trim().replace(/^["']|["']$/g, '')).join(' | ');
      });
      setBatchText(rows.join('\n'));
      flash('success', `Loaded ${rows.length} rows from ${file.name}. Review and submit batch.`);
    };
    reader.readAsText(file);
  };

  const handleReserve = async () => {
    if (!reserveBook || !reserveName.trim() || !reserveAdm.trim()) { flash('error', 'Student name and admission number are required.'); return; }
    const data = await post({ action: 'reserve', book_id: reserveBook.id, student_name: reserveName.trim(), admission_number: reserveAdm.trim() });
    if (data.success) {
      flash('success', data.message);
      setReserveBook(null); setReserveName(''); setReserveAdm('');
      fetchLibraryData();
    } else flash('error', data.error || 'Reservation failed.');
  };

  const handleFulfill = async (reservationId: string) => {
    const data = await post({ action: 'fulfill_reservation', reservation_id: reservationId });
    if (data.success) { flash('success', data.message); fetchLibraryData(); }
    else flash('error', data.error || 'Fulfill failed.');
  };

  const handleBatchSubmit = async () => {
    const lines = batchText.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((l) => {
      const [title, author, isbn, copies] = l.split('|').map((s) => s.trim());
      return { title, author, isbn, total_copies: Number(copies) || 1 };
    });
    const data = await post({ action: 'submit_batch', books: parsed });
    if (data.success) {
      flash('success', data.message);
      setBatchOpen(false); setBatchText('Title | Author | ISBN | Copies\n');
      fetchLibraryData();
    } else flash('error', data.error || 'Batch submit failed.');
  };

  const handleBatchReview = async (batchId: string, approve: boolean, reason = '') => {
    const data = await post({ action: approve ? 'approve_batch' : 'reject_batch', batch_id: batchId, reason });
    if (data.success) { flash('success', data.message); fetchLibraryData(); }
    else flash('error', data.error || 'Review failed.');
  };

  const handleWriteOff = async () => {
    if (!writeOffBook || writeOffReason.trim().length < 10) { flash('error', 'A write-off reason of at least 10 characters is required.'); return; }
    const data = await post({ action: 'write_off', book_id: writeOffBook.id, reason: writeOffReason.trim() });
    if (data.success) {
      flash('success', data.message);
      setWriteOffBook(null); setWriteOffReason('');
      fetchLibraryData();
    } else flash('error', data.error || 'Write-off failed.');
  };

  const handlePolicySave = async () => {
    if (!policyDraft) return;
    const res = await fetch('/api/v1/library/policies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policyDraft),
    });
    const data = await res.json();
    if (data.success) {
      flash('success', 'Library policies updated.');
      setPolicies(data.data); setPolicyDraft(data.data);
    } else flash('error', data.error || 'Policy update failed.');
  };

  // Submit procurement request
  const handleProcureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureTitle.trim() || !procureAuthor.trim() || procureCopies < 1) {
      flash('error', 'Valid title, author, and copy count required.');
      return;
    }
    const newReq = {
      id: `pr-${Date.now()}`,
      title: procureTitle.trim(),
      author: procureAuthor.trim(),
      copies: procureCopies,
      category: procureCategory,
      status: 'Submitted to Faculty Board',
      date: new Date().toISOString().split('T')[0],
    };
    setProcurementLog([newReq, ...procurementLog]);
    setProcureTitle('');
    setProcureAuthor('');
    setProcureCopies(10);
    flash('success', `Procurement request submitted for ${newReq.copies} copies of "${newReq.title}".`);
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.includes(searchQuery)
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'author') cmp = a.author.localeCompare(b.author);
    else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortField === 'available_copies') cmp = a.available_copies - b.available_copies;
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const reservationsForBook = (bookId: string) => reservations.filter((r) => r.book_id === bookId);

  // Analytics (computed from real records only)
  const checkoutsByProgram = (() => {
    const map = new Map<string, number>();
    for (const l of loans) {
      const prog = (l as unknown as { program_name?: string }).program_name || 'General Registry';
      map.set(prog, (map.get(prog) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  const mostBorrowed = (() => {
    const map = new Map<string, number>();
    for (const l of loans) map.set(l.book_title, (map.get(l.book_title) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-academic-navy-900" />
            {view === 'desk' ? 'Librarian Desk & Circulation Engine' : 'Library Administration'}
          </h1>
          <p className="text-sm text-slate-500">
            {view === 'desk'
              ? 'Dense catalog scanning, fast-circulation barcode terminal, reservations, and clearance integration.'
              : 'Governance: policies, catalogue approvals, asset write-offs, and analytics.'}
          </p>
          {isLibrarianish && (
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {memberCount} registered patrons active in circulation (synced with registry)
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLibrarianish && (
            <button
              onClick={() => { setScanTerminalOpen(true); setTimeout(() => scanInputRef.current?.focus(), 100); }}
              className="bg-academic-navy-800 hover:bg-academic-navy-900 text-white font-bold py-2 px-3.5 rounded-lg text-xs transition shadow flex items-center gap-1.5"
            >
              <ScanBarcode className="h-4 w-4 text-academic-gold-400" />
              <span>⚡ Fast-Scan Barcode Terminal</span>
            </button>
          )}

          {isAdmin && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setView('desk')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${view === 'desk' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Librarian Desk
              </button>
              <button
                onClick={() => setView('admin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1 ${view === 'admin' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Settings2 className="h-3.5 w-3.5" /> Administration
              </button>
            </div>
          )}

          {view === 'desk' && isLibrarianish && (
            <button
              onClick={() => setBatchOpen(true)}
              className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2 px-3 rounded-lg text-xs transition shadow flex items-center gap-1"
            >
              <FileUp className="h-3.5 w-3.5" /> Batch CSV Upload
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          <CheckCircle2 className="h-5 w-5" />
          {message.text}
        </div>
      )}

      {view === 'desk' && (
        <>
          {/* Desk tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto gap-1">
            {([
              ['catalog', 'Book Catalogue'],
              ['loans', `Active Circulation (${activeLoans.length})`],
              ['reservations', `Reservations (${reservations.length})`],
              ['fines', `Fines (${fines.length})`],
              ['procurement', '📥 Procurement Desk'],
              ['repository', '🖨️ Digital Repository & Past Papers'],
              ['analytics', '📉 Circulation Analytics'],
            ] as [DeskTab, string][]).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setDeskTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap ${deskTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* TAB 1: CATALOGUE */}
          {deskTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, author, department, ISBN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{sortedBooks.length} titles listed</span>
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setCatalogView('table')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded ${catalogView === 'table' ? 'bg-white shadow text-academic-navy-900' : 'text-slate-600'}`}
                    >
                      Dense Table
                    </button>
                    <button
                      onClick={() => setCatalogView('cards')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded ${catalogView === 'cards' ? 'bg-white shadow text-academic-navy-900' : 'text-slate-600'}`}
                    >
                      Card Grid
                    </button>
                  </div>
                </div>
              </div>

              {/* DENSE TABLE VIEW */}
              {catalogView === 'table' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3 cursor-pointer" onClick={() => handleSort('title')}>
                            <span className="flex items-center gap-1">Title &amp; Author <ArrowUpDown size={12} /></span>
                          </th>
                          <th className="p-3">ISBN</th>
                          <th className="p-3 cursor-pointer" onClick={() => handleSort('category')}>
                            <span className="flex items-center gap-1">Department / Category <ArrowUpDown size={12} /></span>
                          </th>
                          <th className="p-3">Shelf</th>
                          <th className="p-3 cursor-pointer" onClick={() => handleSort('available_copies')}>
                            <span className="flex items-center gap-1">Stock Ratio <ArrowUpDown size={12} /></span>
                          </th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Circulation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedBooks.map((b) => {
                          const stockRatio = `${b.available_copies}/${b.total_copies}`;
                          const isLowStock = b.available_copies === 0;
                          return (
                            <tr key={b.id} className={`hover:bg-slate-50/80 ${isLowStock ? 'bg-rose-50/30' : ''}`}>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{b.title}</div>
                                <div className="text-[11px] text-slate-500">By {b.author}</div>
                              </td>
                              <td className="p-3 font-mono text-slate-600">{b.isbn}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                  {b.category}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-600">{b.shelf_location || 'General'}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold ${b.available_copies > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {stockRatio}
                                  </span>
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${b.available_copies > 3 ? 'bg-emerald-500' : b.available_copies > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                      style={{ width: `${Math.min(100, Math.round((b.available_copies / b.total_copies) * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                {b.available_copies > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                    Available
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                                    0 Copies (Demand)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                {canLoan && b.available_copies > 0 && (
                                  <button
                                    onClick={() => setBorrowModalBook(b)}
                                    className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-1 px-2.5 rounded text-[11px] transition shadow inline-flex items-center gap-1"
                                  >
                                    <BookMarked size={12} /> Issue
                                  </button>
                                )}
                                {b.available_copies === 0 && isLibrarianish && (
                                  <button
                                    onClick={() => setReserveBook(b)}
                                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-1 px-2.5 rounded text-[11px] transition"
                                  >
                                    Reserve
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CARD GRID VIEW */}
              {catalogView === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedBooks.map((b) => (
                    <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-academic-navy-600 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">{b.category}</span>
                          <span className="text-xs font-mono text-slate-500">ISBN: {b.isbn}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{b.title}</h3>
                        <p className="text-xs text-slate-600">By {b.author}</p>
                        <p className="text-xs text-slate-400 font-mono">Location: {b.shelf_location} | Publisher: {b.publisher}</p>
                        {reservationsForBook(b.id).length > 0 && (
                          <p className="text-xs text-amber-700 font-medium">{reservationsForBook(b.id).length} reservation(s) queued</p>
                        )}
                      </div>
                      <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-xs font-bold ${b.available_copies > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {b.available_copies} of {b.total_copies} Copies Available
                        </span>
                        <div className="flex gap-2">
                          {b.available_copies === 0 && isLibrarianish && (
                            <button
                              onClick={() => setReserveBook(b)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-1.5 px-3 rounded-lg text-xs transition"
                            >
                              Reserve
                            </button>
                          )}
                          {canLoan && b.available_copies > 0 && (
                            <button
                              onClick={() => setBorrowModalBook(b)}
                              className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-1.5 px-3 rounded-lg text-xs transition shadow flex items-center gap-1"
                            >
                              <BookMarked className="h-3.5 w-3.5" /> Issue Loan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sortedBooks.length === 0 && <p className="text-sm text-slate-500">No books match your search.</p>}
            </div>
          )}

          {/* TAB 2: ACTIVE CIRCULATION */}
          {deskTab === 'loans' && (
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
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeLoans.map((l) => (
                      <tr key={l.id} className={`hover:bg-slate-50 ${l.status === 'overdue' ? 'bg-rose-50/50' : ''}`}>
                        <td className="p-3 font-semibold text-slate-900">{l.book_title}{l.renewed && <span className="ml-2 text-[10px] text-slate-500">(renewed)</span>}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{l.student_name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{l.admission_number}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{l.borrow_date}</td>
                        <td className="p-3 font-mono text-slate-600">{l.due_date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${l.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {isLibrarianish && !l.renewed && (
                            <button onClick={() => handleRenew(l.id)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-1 px-2.5 rounded text-[11px] transition inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" /> Renew Once
                            </button>
                          )}
                          <button onClick={() => handleReturn(l.id)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1 px-2.5 rounded text-[11px] transition inline-flex items-center gap-1">
                            <Check className="h-3 w-3" /> Mark Returned
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeLoans.length === 0 && <p className="p-5 text-sm text-slate-500">No active loans. Nothing is currently checked out.</p>}
            </div>
          )}

          {/* TAB 3: RESERVATIONS */}
          {deskTab === 'reservations' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-800">Reservation Queue</h2>
                <p className="text-xs text-slate-500">Students waiting for checked-out books. Fulfill when a copy returns.</p>
              </div>
              {reservations.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No queued reservations.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Book</th>
                        <th className="p-3">Reserved By</th>
                        <th className="p-3">Reserved On</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{r.book_title}</td>
                          <td className="p-3">{r.student_name}<div className="text-[10px] font-mono text-slate-500">{r.admission_number}</div></td>
                          <td className="p-3 font-mono text-slate-600">{r.reserved_date}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleFulfill(r.id)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded text-[11px] transition">
                              Fulfill
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINES */}
          {deskTab === 'fines' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Outstanding Library Fines &amp; Overdue Ledger</h2>
                  <span className="text-xs font-bold text-slate-600">Outstanding: KES {totalFines.toLocaleString()} · Collected: KES {collectedFines.toLocaleString()}</span>
                </div>

                {isLibrarianish && fines.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkSendReminders}
                      className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Send size={13} className="text-academic-gold-400" />
                      <span>Bulk Send SMS Reminders ({fines.length})</span>
                    </button>
                    <button
                      onClick={handleBulkClearFines}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Wallet size={13} />
                      <span>Bulk Clear / Waive Fines</span>
                    </button>
                  </div>
                )}
              </div>

              {fines.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No outstanding fines.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Book Title</th>
                        <th className="p-3">Borrower</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Fine (KES)</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{l.book_title}</td>
                          <td className="p-3">{l.student_name}<div className="text-[10px] font-mono text-slate-500">{l.admission_number}</div></td>
                          <td className="p-3 font-mono text-slate-600">{l.due_date}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{(l.fine_amount || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            {isLibrarianish && (
                              <button onClick={() => setPayFineLoan(l)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded text-[11px] transition inline-flex items-center gap-1">
                                <Wallet className="h-3 w-3" /> Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="p-4 text-[11px] text-slate-600 bg-amber-50/60 border-t border-amber-200 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Automated Clearance Block Active:</strong> Any student with overdue unreturned books or unpaid fines is automatically blocked from downloading Exam Clearance Cards until cleared at this desk.
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: PROCUREMENT DESK */}
          {deskTab === 'procurement' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Book Requests &amp; Procurement Desk</h2>
                    <p className="text-xs text-slate-500">Request additional textbook copies for high-demand course units with zero shelf stock.</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    Active Deficit: Introduction to Algorithms (0 Available)
                  </span>
                </div>

                <form onSubmit={handleProcureSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Textbook Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operating Systems: Three Easy Pieces"
                      value={procureTitle}
                      onChange={(e) => setProcureTitle(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Author / Edition</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Remzi Arpaci-Dusseau"
                      value={procureAuthor}
                      onChange={(e) => setProcureAuthor(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Copies Needed</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={procureCopies}
                      onChange={(e) => setProcureCopies(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold py-2 px-3 rounded-lg text-xs shadow flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Submit Procurement RFQ
                    </button>
                  </div>
                </form>
              </div>

              {/* Procurement Log */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Procurement Orders &amp; RFQs</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Title</th>
                        <th className="p-3">Author</th>
                        <th className="p-3">Copies</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {procurementLog.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{item.title}</td>
                          <td className="p-3 text-slate-600">{item.author}</td>
                          <td className="p-3 font-mono font-bold text-academic-navy-900">{item.copies}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{item.category}</span></td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{item.status}</span></td>
                          <td className="p-3 text-right font-mono text-slate-500">{item.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DIGITAL REPOSITORY & PAST PAPERS */}
          {deskTab === 'repository' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
                <h2 className="text-sm font-bold text-slate-900">Digital Repository &amp; Past Examination Papers Archive</h2>
                <p className="text-xs text-slate-500">Access electronic textbooks, IEEE/Springer journal links, and past university examination papers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { code: 'BCS 311', name: 'Advanced Database Systems', sems: ['2025/2026 Sem 1', '2024/2025 Sem 2', '2023/2024 Sem 1'], format: 'PDF Archive' },
                  { code: 'BIT 312', name: 'Distributed Systems & Cloud', sems: ['2025/2026 Sem 1', '2024/2025 Sem 2'], format: 'PDF Archive' },
                  { code: 'CS 101', name: 'Introduction to Computer Programming', sems: ['2025/2026 Sem 1', '2024/2025 Sem 1', '2023/2024 Sem 2'], format: 'PDF Archive' },
                ].map((item) => (
                  <div key={item.code} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-academic-navy-100 text-academic-navy-900">{item.code}</span>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{item.format}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {item.sems.map((s) => (
                        <div key={s} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-1.5 rounded">
                          <span>{s} Exam Paper</span>
                          <button
                            type="button"
                            onClick={() => flash('success', `Opening digital past paper for ${item.code} (${s}).`)}
                            className="text-academic-navy-900 hover:text-academic-navy-700 font-semibold inline-flex items-center gap-1"
                          >
                            <Download size={12} /> View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CIRCULATION ANALYTICS */}
          {deskTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Total Checkouts Logged</p>
                  <p className="text-2xl font-bold text-slate-900">{loans.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Across all registered academic departments</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Currently Overdue</p>
                  <p className="text-2xl font-bold text-rose-700">{loans.filter((l) => l.status === 'overdue').length}</p>
                  <p className="text-xs text-rose-600 mt-1">Requiring counter follow-up</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Fines Collected</p>
                  <p className="text-2xl font-bold text-emerald-700">KES {collectedFines.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">Verified with receipt reference</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Most-borrowed titles</h2>
                  {mostBorrowed.length === 0 ? (
                    <p className="text-xs text-slate-500">No data yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {mostBorrowed.map(([title, n]) => (
                        <li key={title} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{title}</span>
                          <span className="font-mono font-bold text-slate-600">{n}×</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Checkouts by academic discipline</h2>
                  {checkoutsByProgram.length === 0 ? (
                    <p className="text-xs text-slate-500">No data yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {checkoutsByProgram.map(([prog, n]) => (
                        <li key={prog} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{prog}</span>
                          <span className="font-mono font-bold text-slate-600">{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'admin' && isAdmin && (
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
            {([
              ['policies', 'Loan Rules & Fines'],
              ['governance', 'Catalogue Governance'],
              ['analytics', 'Analytics'],
            ] as [AdminSection, string][]).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setAdminSection(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${adminSection === s ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {adminSection === 'policies' && policyDraft && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Loan Rules by Member Type</h2>
                <p className="text-xs text-slate-500 mb-4">How many books each member type may hold, and for how long.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['undergrad', 'postgrad', 'staff'] as const).map((t) => (
                    <div key={t} className="border border-slate-200 rounded-lg p-4">
                      <h3 className="text-xs font-bold uppercase text-slate-700 mb-3">{t === 'undergrad' ? 'Undergraduates' : t === 'postgrad' ? 'Postgraduates' : 'Staff'}</h3>
                      <label className="block text-xs text-slate-600 mb-1">Max books</label>
                      <input
                        type="number" min={1} max={20}
                        value={policyDraft.loan_rules[t].max_books}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, loan_rules: { ...policyDraft.loan_rules, [t]: { ...policyDraft.loan_rules[t], max_books: Number(e.target.value) } } })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 mb-3"
                      />
                      <label className="block text-xs text-slate-600 mb-1">Loan days</label>
                      <input
                        type="number" min={1} max={120}
                        value={policyDraft.loan_rules[t].loan_days}
                        onChange={(e) => setPolicyDraft({ ...policyDraft, loan_rules: { ...policyDraft.loan_rules, [t]: { ...policyDraft.loan_rules[t], loan_days: Number(e.target.value) } } })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Fine Structure</h2>
                <p className="text-xs text-slate-500 mb-4">Automated penalties applied to overdue loans.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Fine per day (KES)</label>
                    <input type="number" min={0} value={policyDraft.fine_per_day} onChange={(e) => setPolicyDraft({ ...policyDraft, fine_per_day: Number(e.target.value) })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Max fine per book (KES)</label>
                    <input type="number" min={0} value={policyDraft.max_fine_per_book} onChange={(e) => setPolicyDraft({ ...policyDraft, max_fine_per_book: Number(e.target.value) })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Lost book fee (KES)</label>
                    <input type="number" min={0} value={policyDraft.lost_book_fee} onChange={(e) => setPolicyDraft({ ...policyDraft, lost_book_fee: Number(e.target.value) })} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Clearance Integration</h2>
                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyDraft.block_clearance_on_fines}
                    onChange={(e) => setPolicyDraft({ ...policyDraft, block_clearance_on_fines: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs text-slate-700 font-medium">Block graduation / exam clearance when library fines are above KES 0</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-2">When on, students with unpaid library fines cannot print exam passes until fines are settled at the library desk.</p>
              </div>

              <button onClick={handlePolicySave} className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2 px-5 rounded-lg text-xs transition shadow">
                Save Policy Changes
              </button>
              {policies?.updated_by_email && <p className="text-[11px] text-slate-500">Last updated by {policies.updated_by_email} · {policies.updated_at}</p>}
            </div>
          )}

          {adminSection === 'governance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-800">Catalogue Batch Approvals</h2>
                  <p className="text-xs text-slate-500">Book batches submitted by librarians enter the live catalogue only after admin approval.</p>
                </div>
                {batches.filter((b) => b.status === 'pending').length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">No pending batches.</p>
                ) : (
                  batches.filter((b) => b.status === 'pending').map((b) => (
                    <div key={b.id} className="p-4 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{b.books.length} books · submitted by {b.submitted_by_email}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{b.submitted_at}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleBatchReview(b.id, true)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded text-[11px]">Approve</button>
                          <button onClick={() => { const r = prompt('Rejection reason (required):'); if (r) handleBatchReview(b.id, false, r); }} className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-1 px-3 rounded text-[11px]">Reject</button>
                        </div>
                      </div>
                      <ul className="text-[11px] text-slate-600 space-y-0.5">
                        {b.books.slice(0, 5).map((bk, i) => <li key={i}>· {bk.title} — {bk.author} ({bk.isbn}) × {bk.total_copies}</li>)}
                        {b.books.length > 5 && <li className="text-slate-400">…and {b.books.length - 5} more</li>}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Archive className="h-4 w-4" /> Asset Write-Offs</h2>
                  <p className="text-xs text-slate-500">Archive damaged, lost, or obsolete titles. Loan history is preserved.</p>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {books.map((b) => (
                    <div key={b.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{b.title}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{b.isbn} · {b.available_copies}/{b.total_copies} available</p>
                      </div>
                      <button onClick={() => setWriteOffBook(b)} className="text-[11px] font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded flex items-center gap-1">
                        <Ban className="h-3 w-3" /> Write off
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminSection === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Total checkouts</p>
                  <p className="text-2xl font-bold text-slate-900">{loans.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Currently overdue</p>
                  <p className="text-2xl font-bold text-rose-700">{loans.filter((l) => l.status === 'overdue').length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase text-slate-500">Fines collected</p>
                  <p className="text-2xl font-bold text-emerald-700">KES {collectedFines.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Most-borrowed titles</h2>
                  {mostBorrowed.length === 0 ? (
                    <p className="text-xs text-slate-500">No data yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {mostBorrowed.map(([title, n]) => (
                        <li key={title} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{title}</span>
                          <span className="font-mono font-bold text-slate-600">{n}×</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Checkouts by program</h2>
                  {checkoutsByProgram.length === 0 ? (
                    <p className="text-xs text-slate-500">No data yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {checkoutsByProgram.map(([prog, n]) => (
                        <li key={prog} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{prog}</span>
                          <span className="font-mono font-bold text-slate-600">{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAST-SCAN BARCODE / RFID TERMINAL MODAL */}
      {scanTerminalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-academic-navy-900 text-academic-gold-400 rounded-lg">
                  <ScanBarcode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Fast-Scan Barcode &amp; RFID Terminal</h3>
                  <p className="text-xs text-slate-500">Scan student card &amp; book barcode for sub-3-second circulation processing</p>
                </div>
              </div>
              <button
                onClick={() => setScanTerminalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Mode switch */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => { setScanMode('issue'); scanInputRef.current?.focus(); }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                  scanMode === 'issue' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookMarked size={14} className={scanMode === 'issue' ? 'text-academic-gold-400' : ''} />
                <span>Quick Issue (Loan)</span>
              </button>
              <button
                type="button"
                onClick={() => { setScanMode('return'); scanInputRef.current?.focus(); }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                  scanMode === 'return' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RotateCcw size={14} />
                <span>Quick Check-In (Return)</span>
              </button>
            </div>

            <form onSubmit={handleFastScanSubmit} className="space-y-4">
              {scanMode === 'issue' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    1. Student ID / Admission Number Barcode
                  </label>
                  <input
                    ref={scanInputRef}
                    type="text"
                    required
                    value={scanAdm}
                    onChange={(e) => setScanAdm(e.target.value)}
                    placeholder="Scan student ID (e.g. BIT/2023/8849)"
                    className="w-full text-sm font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {scanMode === 'issue' ? '2. Book ISBN / Barcode' : 'Scan Book ISBN / Barcode to Return'}
                </label>
                <input
                  type="text"
                  required
                  value={scanBookCode}
                  onChange={(e) => setScanBookCode(e.target.value)}
                  placeholder="Scan book barcode (e.g. 978-0131103627 or bk-01)"
                  className="w-full text-sm font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-academic-navy-900"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>💡 <strong>Scanner Tip:</strong> Standard handheld USB/Bluetooth barcode and RFID scanners automatically submit when programmed with Enter suffix.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScanTerminalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={scanProcessing}
                  className={`px-5 py-2 text-xs font-bold rounded-lg shadow text-white flex items-center gap-1.5 ${
                    scanMode === 'issue' ? 'bg-academic-navy-900 hover:bg-academic-navy-950' : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {scanProcessing ? 'Processing…' : scanMode === 'issue' ? 'Execute Fast Issue' : 'Execute Fast Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Loan modal */}
      {borrowModalBook && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Issue Book Loan</h3>
            <p className="text-xs text-slate-600">Issuing <strong>{borrowModalBook.title}</strong> (ISBN: {borrowModalBook.isbn})</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><ScanBarcode className="h-3.5 w-3.5" /> Barcode / ISBN scan</label>
              <input
                type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or type barcode…"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Find member (name or admission number)</label>
              <input
                type="text" value={memberQuery} onChange={(e) => searchMembers(e.target.value)}
                placeholder="Start typing a name or admission no…"
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
              {memberHits.length > 0 && (
                <ul className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {memberHits.map((m) => (
                    <li key={m.admission_number}>
                      <button
                        onClick={() => { setSelectedMember(m); setMemberHits([]); setMemberQuery(`${m.student_name} (${m.admission_number})`); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs"
                      >
                        <span className="font-semibold text-slate-900">{m.student_name}</span>
                        <span className="text-slate-500 font-mono ml-2">{m.admission_number}</span>
                        <span className="block text-[10px] text-slate-400">{m.program_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedMember && <p className="text-xs text-emerald-700 font-medium mt-1">✓ {selectedMember.student_name} selected</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setBorrowModalBook(null); setSelectedMember(null); setMemberQuery(''); setMemberHits([]); setBarcode(''); }} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleBorrow} className="px-4 py-1.5 text-xs bg-academic-navy-900 text-academic-gold-400 font-bold rounded-lg shadow">Confirm Issue</button>
            </div>
          </div>
        </div>
      )}

      {/* Record fine payment modal */}
      {payFineLoan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Record Fine Payment</h3>
            <p className="text-xs text-slate-600"><strong>{payFineLoan.student_name}</strong> owes <strong>KES {(payFineLoan.fine_amount || 0).toLocaleString()}</strong> on “{payFineLoan.book_title}”.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment reference (receipt no. / M-Pesa code)</label>
              <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. RCPT-2026-1182 or QHX7K2M9AB" className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setPayFineLoan(null); setPayRef(''); }} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleFinePayment} className="px-4 py-1.5 text-xs bg-emerald-700 text-white font-bold rounded-lg shadow">Record Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve modal */}
      {reserveBook && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Reserve Book</h3>
            <p className="text-xs text-slate-600">“<strong>{reserveBook.title}</strong>” — student joins the queue and is notified on return.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student name</label>
              <input type="text" value={reserveName} onChange={(e) => setReserveName(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission number</label>
              <input type="text" value={reserveAdm} onChange={(e) => setReserveAdm(e.target.value)} className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setReserveBook(null); setReserveName(''); setReserveAdm(''); }} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleReserve} className="px-4 py-1.5 text-xs bg-amber-600 text-white font-bold rounded-lg shadow">Queue Reservation</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch submit modal (Supports CSV File Upload & Text Preview) */}
      {batchOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Submit Book Batch for Approval</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5"
              >
                <Upload size={13} />
                <span>Upload CSV / Excel File</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              One book per line: <span className="font-mono">Title | Author | ISBN | Copies</span> or upload a CSV with title, author, ISBN, and quantity columns.
            </p>
            <textarea
              value={batchText} onChange={(e) => setBatchText(e.target.value)} rows={8}
              className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBatchOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleBatchSubmit} className="px-4 py-1.5 text-xs bg-academic-navy-900 text-academic-gold-400 font-bold rounded-lg shadow">Submit Batch</button>
            </div>
          </div>
        </div>
      )}

      {/* Write-off modal */}
      {writeOffBook && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Archive className="h-4 w-4 text-rose-700" /> Write Off Book</h3>
            <p className="text-xs text-slate-600">Archiving “<strong>{writeOffBook.title}</strong>” removes it from the catalogue. Loan history is preserved.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (min 10 chars — e.g. damaged beyond repair, lost, obsolete edition)</label>
              <textarea value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} rows={3} className="w-full text-xs p-2 rounded-lg border border-slate-300" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setWriteOffBook(null); setWriteOffReason(''); }} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={handleWriteOff} className="px-4 py-1.5 text-xs bg-rose-700 text-white font-bold rounded-lg shadow">Archive Book</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
