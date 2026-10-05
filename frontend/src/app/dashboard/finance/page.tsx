'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Building, CheckCircle2, ArrowRight, Copy, Check, Info, Download, FileText, UploadCloud, RefreshCw } from 'lucide-react';
import { generateFeeStatementPDF } from '@/lib/pdf/generator';

interface BankTransactionItem {
  id: string;
  reference: string;
  bank_name: string;
  account_number: string;
  amount: number;
  transaction_date: string;
  student_admission_number?: string;
  student_name?: string;
  is_reconciled: boolean;
  reconciled_by?: string;
  notes?: string;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'mpesa' | 'bank_recon'>('mpesa');
  const [admissionNo, setAdmissionNo] = useState('BIT/2023/8849');
  const [studentName, setStudentName] = useState('Faith Wanjiku');
  const [phone, setPhone] = useState('0712345678');
  const [amount, setAmount] = useState('15000');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPaybill, setCopiedPaybill] = useState(false);

  // Bank Reconciliation State
  const [bankTransactions, setBankTransactions] = useState<BankTransactionItem[]>([]);
  const [bankForm, setBankForm] = useState({
    reference: '',
    bank_name: 'Kenya Commercial Bank (KCB)',
    amount: '',
    student_admission_number: 'BIT/2023/8849',
    student_name: 'Alex Kiptoo Kimutai',
    notes: 'Direct branch teller deposit',
  });

  useEffect(() => {
    fetchBankTransactions();
  }, []);

  const fetchBankTransactions = async () => {
    try {
      const res = await fetch('/api/v1/finance/bank/reconcile');
      const json = await res.json();
      if (json.success) {
        setBankTransactions(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReconcileBankTx = async (txId: string) => {
    try {
      const res = await fetch('/api/v1/finance/bank/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile', transaction_id: txId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchBankTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBankSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/finance/bank/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_entry',
          ...bankForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setBankForm({
          reference: '',
          bank_name: 'Kenya Commercial Bank (KCB)',
          amount: '',
          student_admission_number: 'BIT/2023/8849',
          student_name: 'Alex Kiptoo Kimutai',
          notes: 'Direct branch teller deposit',
        });
        fetchBankTransactions();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record bank slip.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network connection failed.' });
    }
  };

  // Financial Ledger State
  const [totalBilled, setTotalBilled] = useState(85000);
  const [amountPaid, setAmountPaid] = useState(85000);
  const balanceRemaining = Math.max(0, totalBilled - amountPaid);

  const [transactions, setTransactions] = useState([
    { ref: 'QHJ8917263', student: 'BIT/2023/8849', desc: 'Semester 1 Tuition Fee', amount: 45000, method: 'mpesa', status: 'verified', date: '2026-09-15' },
    { ref: 'BNK-KCB-9941', student: 'BIT/2023/8849', desc: 'Hostel & Activity Levy', amount: 25000, method: 'bank_transfer', status: 'verified', date: '2026-09-20' },
    { ref: 'QHJ4410928', student: 'BIT/2023/8849', desc: 'Library & Exam Fee', amount: 15000, method: 'mpesa', status: 'verified', date: '2026-10-02' },
  ]);

  const copyPaybill = () => {
    navigator.clipboard.writeText('522533');
    setCopiedPaybill(true);
    setTimeout(() => setCopiedPaybill(false), 2000);
  };

  const handleSTKPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/finance/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          amount: Number(amount),
          accountReference: admissionNo.trim(),
          transactionDesc: `Fee Payment for ${admissionNo.trim()}`,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setMessage({ type: 'success', text: data.CustomerMessage || 'STK Push initiated! M-Pesa prompt sent.' });

        const txAmount = Number(amount);
        const receiptNo = data.ReceiptNumber || `MP${Date.now().toString().slice(-8)}`;

        const newTx = {
          ref: receiptNo,
          student: admissionNo.trim(),
          desc: 'Tuition Installment via M-Pesa',
          amount: txAmount,
          method: 'mpesa',
          status: 'verified',
          date: new Date().toISOString().split('T')[0],
        };

        setTransactions((prev) => [newTx, ...prev]);
        setAmountPaid((prev) => prev + txAmount);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to initiate STK push.' });
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: 'error', text: err.message || 'Network connection failed.' });
    }
  };

  const handleDownloadFeeStatement = () => {
    const doc = generateFeeStatementPDF({
      student: {
        name: studentName,
        admissionNumber: admissionNo,
        program: 'Bachelor of Science in Information Technology',
        school: 'School of Information Communication & Technology',
        department: 'Information Technology',
        yearOfStudy: 3,
        semesterNumber: 1,
      },
      invoiceNumber: `INV-2026-${admissionNo.replace(/\//g, '-')}`,
      totalBilled,
      amountPaid,
      balanceRemaining,
      dueDate: '2026-10-31',
      transactions: transactions.map((t) => ({
        date: t.date,
        reference: t.ref,
        description: t.desc,
        method: t.method === 'mpesa' ? 'M-Pesa (522533)' : 'Bank Transfer',
        amount: t.amount,
        status: t.status,
      })),
    });

    doc.save(`Fee_Statement_${admissionNo.replace(/\//g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Fees & Financial Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Student fee invoicing, Safaricom M-Pesa Paybill (522533), bank slip reconciliation, and institutional ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('mpesa')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'mpesa' ? 'bg-white shadow text-academic-navy-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              M-Pesa Collections
            </button>
            <button
              onClick={() => setActiveTab('bank_recon')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'bank_recon' ? 'bg-academic-gold-500 text-academic-navy-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bank Reconciliation ({bankTransactions.filter((t) => !t.is_reconciled).length} Pending)
            </button>
          </div>

          <button
            onClick={handleDownloadFeeStatement}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-academic-navy-700" />
            <span>PDF Statement</span>
          </button>
        </div>
      </div>

      {activeTab === 'bank_recon' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Total Bank Transactions</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{bankTransactions.length}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Reconciled Deposits</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {bankTransactions.filter((t) => t.is_reconciled).length}
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Unreconciled / Pending Verification</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {bankTransactions.filter((t) => !t.is_reconciled).length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-academic-navy-900" />
                Record Bank Deposit / Slip
              </h2>
              <form onSubmit={handleAddBankSlip} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Branch / Institution</label>
                  <select
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Kenya Commercial Bank (KCB)">Kenya Commercial Bank (KCB)</option>
                    <option value="Equity Bank">Equity Bank</option>
                    <option value="Co-operative Bank">Co-operative Bank</option>
                    <option value="Absa Bank Kenya">Absa Bank Kenya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Slip / Reference No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KCB-REF-883910"
                    value={bankForm.reference}
                    onChange={(e) => setBankForm({ ...bankForm, reference: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    required
                    value={bankForm.amount}
                    onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Admission No</label>
                  <input
                    type="text"
                    required
                    value={bankForm.student_admission_number}
                    onChange={(e) => setBankForm({ ...bankForm, student_admission_number: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={bankForm.student_name}
                    onChange={(e) => setBankForm({ ...bankForm, student_name: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2 px-3 rounded-lg text-xs transition shadow"
                >
                  Post & Reconcile Bank Slip
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bank Statement Ledger</h3>
                <span className="text-xs text-slate-500 font-mono">Total Deposits: KES {bankTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Bank Ref</th>
                      <th className="p-3">Bank</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-academic-navy-900">{tx.reference}</td>
                        <td className="p-3 text-slate-600">{tx.bank_name}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{tx.student_name || 'Unassigned'}</div>
                          <div className="text-[10px] font-mono text-slate-500">{tx.student_admission_number}</div>
                        </td>
                        <td className="p-3 font-bold text-slate-900">KES {tx.amount.toLocaleString()}</td>
                        <td className="p-3 text-slate-500 font-mono">{tx.transaction_date}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.is_reconciled
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tx.is_reconciled ? 'Reconciled' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {!tx.is_reconciled && (
                            <button
                              onClick={() => handleReconcileBankTx(tx.id)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded text-[10px] transition"
                            >
                              Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Official M-Pesa Payment Details Banner */}
      <div className="bg-academic-navy-950 text-white rounded-xl p-6 shadow-md border border-academic-navy-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-academic-gold-400 bg-academic-navy-800 px-2.5 py-1 rounded border border-academic-navy-700">
              Official University Lipa na M-Pesa Channel
            </span>
            <h2 className="text-xl font-bold mt-2 text-white">Direct Fee Collection Gateway</h2>
            <p className="text-xs text-slate-300 mt-1">
              All student tuition and institutional fees are paid via Paybill <strong className="text-academic-gold-300">522533</strong> using your Student Admission Number as the Account Reference.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-academic-navy-900/90 border border-academic-navy-700 p-4 rounded-xl">
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400">Business / Paybill No:</div>
              <div className="text-2xl font-mono font-black text-academic-gold-400 flex items-center gap-2">
                <span>522533</span>
                <button
                  type="button"
                  onClick={copyPaybill}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Copy Paybill Number"
                >
                  {copiedPaybill ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="border-l border-academic-navy-700 pl-4">
              <div className="text-[11px] uppercase font-bold text-slate-400">Account Number:</div>
              <div className="text-sm font-mono font-bold text-slate-200">
                Student Admission No.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Invoiced (Sem 1)</p>
          <p className="text-2xl font-black text-academic-navy-950 mt-1">KES {totalBilled.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Billed per program curriculum</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Cleared</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">KES {amountPaid.toLocaleString()}</p>
          <p className="text-xs text-emerald-700 mt-1">100% Verified via Bank & M-Pesa</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Outstanding Balance</p>
          <p className={`text-2xl font-black mt-1 ${balanceRemaining === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            KES {balanceRemaining.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {balanceRemaining === 0 ? 'Fully Cleared for Exams & Graduation' : 'Due before examination period'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: STK Push Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 text-academic-navy-950 font-bold text-base mb-4">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            <span>M-Pesa STK Push Prompt</span>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs font-medium border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSTKPush} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Student Admission Number (Account Ref)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BIT/2023/8849"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">Passed to Safaricom as AccountReference.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                M-Pesa Phone Number
              </label>
              <input
                type="text"
                required
                placeholder="0712345678 or 254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Payment Amount (KES)
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Sending STK Prompt...' : 'Send M-Pesa STK Prompt'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Manual Instructions Card */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-academic-navy-950 uppercase tracking-wider">
              <Info className="h-3.5 w-3.5 text-academic-navy-700" />
              <span>Manual SIM Toolkit / M-Pesa App</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Open M-Pesa &rarr; <strong>Lipa na M-Pesa</strong> &rarr; <strong>Paybill</strong>.</li>
              <li>Enter Business No: <strong className="font-mono text-academic-navy-950">522533</strong>.</li>
              <li>Enter Account No: <strong className="font-mono text-academic-navy-950">{admissionNo || 'Student Admission No'}</strong>.</li>
              <li>Enter Amount and PIN to authorize.</li>
            </ol>
          </div>
        </div>

        {/* Right 2 Cols: Transaction Ledger */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-academic-navy-950">Institutional Transaction Ledger</h2>
              <span className="text-xs text-slate-500 font-medium">{transactions.length} Verified Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Receipt / Ref</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.ref} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-academic-navy-800 font-semibold">{tx.ref}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">{tx.desc}</td>
                      <td className="px-4 py-3 font-bold text-academic-navy-950">KES {tx.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {tx.method === 'mpesa' ? 'M-Pesa 522533' : 'Bank Slip'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Paybill: 522533 &bull; Safaricom Daraja API Integrated</span>
            <span className="text-emerald-700 font-semibold">Automated Ledger Reconciliation Active</span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

