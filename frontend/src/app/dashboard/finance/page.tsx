'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building, CheckCircle2, ArrowRight, Copy, Check, Info } from 'lucide-react';

export default function FinancePage() {
  const [admissionNo, setAdmissionNo] = useState('STU/2026/0001');
  const [phone, setPhone] = useState('0712345678');
  const [amount, setAmount] = useState('15000');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPaybill, setCopiedPaybill] = useState(false);

  const [transactions, setTransactions] = useState([
    { ref: 'QHJ8917263', student: 'STU/2026/0001', amount: 'KSh 60,000', method: 'M-Pesa (522533)', status: 'Cleared', date: '2026-10-02' },
    { ref: 'BNK-KCB-9941', student: 'STU/2026/0045', amount: 'KSh 45,000', method: 'Bank Slip', status: 'Cleared', date: '2026-10-01' },
    { ref: 'QHJ4410928', student: 'STU/2026/0112', amount: 'KSh 25,000', method: 'M-Pesa (522533)', status: 'Cleared', date: '2026-09-28' },
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
        setMessage({ type: 'success', text: data.CustomerMessage || 'STK Push sent to mobile device!' });

        // Simulate instant cleared transaction into live ledger
        if (data.ReceiptNumber) {
          const newTx = {
            ref: data.ReceiptNumber,
            student: admissionNo.trim(),
            amount: `KSh ${Number(amount).toLocaleString()}`,
            method: 'M-Pesa (522533)',
            status: 'Cleared',
            date: new Date().toISOString().split('T')[0],
          };
          setTransactions((prev) => [newTx, ...prev]);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to initiate STK push.' });
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: 'error', text: err.message || 'Network connection failed.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Fees & Financial Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Student fee invoicing, Safaricom M-Pesa Paybill (522533), bank slip reconciliation, and institutional ledger.
          </p>
        </div>
      </div>

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
                Student Admission Number (Account No)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STU/2026/0001"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">This will be passed as the M-Pesa Account Reference.</p>
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
                Payment Amount (KSh)
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
              <span>Manual SIM Toolkit / App Steps</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Open M-Pesa &rarr; <strong>Lipa na M-Pesa</strong> &rarr; <strong>Paybill</strong>.</li>
              <li>Enter Business No: <strong className="font-mono text-academic-navy-950">522533</strong>.</li>
              <li>Enter Account No: <strong className="font-mono text-academic-navy-950">{admissionNo || 'Student Admission No'}</strong>.</li>
              <li>Enter Amount and your M-Pesa PIN to complete.</li>
            </ol>
          </div>
        </div>

        {/* Right 2 Cols: Transaction Ledger */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-academic-navy-950">Institutional Transaction Ledger</h2>
              <span className="text-xs text-slate-500">Live Cleared Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Receipt / Ref</th>
                    <th className="px-4 py-3">Admission (Account)</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment Channel</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.ref} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-academic-navy-800 font-semibold">{tx.ref}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 font-medium">{tx.student}</td>
                      <td className="px-4 py-3 font-bold text-academic-navy-950">{tx.amount}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {tx.method}
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
    </div>
  );
}
