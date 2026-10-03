'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building, CheckCircle2, ArrowRight } from 'lucide-react';

export default function FinancePage() {
  const [phone, setPhone] = useState('0712345678');
  const [amount, setAmount] = useState('15000');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
          accountReference: 'STU/2026/0001',
          transactionDesc: 'Semester 1 Fee Installment',
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setMessage(data.CustomerMessage || 'STK Push sent to mobile device!');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setLoading(false);
      setMessage(`Failed: ${err.message}`);
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
            Student fee invoicing, Safaricom M-Pesa STK push gateway, bank slip reconciliation, and ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Simulation Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 text-academic-navy-900 font-bold text-base mb-4">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            <span>M-Pesa Express (STK Push)</span>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={handleSTKPush} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">M-Pesa Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Payment Amount (KSh)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Initiating STK...' : 'Send M-Pesa STK Prompt'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-academic-navy-950 mb-4">Institutional Transaction Ledger</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Receipt / Ref</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-mono text-xs text-academic-navy-800 font-semibold">QHJ8917263</td>
                <td className="px-4 py-3 text-slate-800">STU/2026/0001</td>
                <td className="px-4 py-3 font-bold text-academic-navy-950">KSh 60,000</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold text-emerald-700">M-Pesa</span></td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">Cleared</span></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs text-academic-navy-800 font-semibold">BNK-KCB-9941</td>
                <td className="px-4 py-3 text-slate-800">STU/2026/0045</td>
                <td className="px-4 py-3 font-bold text-academic-navy-950">KSh 45,000</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-700">Bank Slip</span></td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">Cleared</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
