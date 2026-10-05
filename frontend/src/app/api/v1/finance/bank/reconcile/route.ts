import { NextResponse } from 'next/server';

export interface BankTransaction {
  id: string;
  reference: string;
  bank_name: string; // e.g. KCB Bank, Equity Bank, Co-op Bank
  account_number: string;
  amount: number;
  transaction_date: string;
  student_admission_number?: string;
  student_name?: string;
  is_reconciled: boolean;
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
}

let bankTransactions: BankTransaction[] = [
  {
    id: 'bnk-01',
    reference: 'KCB-REF-992019',
    bank_name: 'Kenya Commercial Bank (KCB)',
    account_number: '1102938475',
    amount: 35000,
    transaction_date: '2026-09-18',
    student_admission_number: 'BIT/2023/8849',
    student_name: 'Alex Kiptoo Kimutai',
    is_reconciled: true,
    reconciled_by: 'Finance Officer (Mrs. Joyce N.)',
    reconciled_at: '2026-09-19 10:30',
    notes: 'Direct tuition deposit verified with bank slip.',
  },
  {
    id: 'bnk-02',
    reference: 'EQ-TRX-449102',
    bank_name: 'Equity Bank',
    account_number: '0182938471',
    amount: 50000,
    transaction_date: '2026-09-25',
    student_admission_number: 'BCS/2023/9102',
    student_name: 'Faith Chebet Korir',
    is_reconciled: true,
    reconciled_by: 'Finance Officer (Mrs. Joyce N.)',
    reconciled_at: '2026-09-25 14:15',
    notes: 'Semester fee deposit.',
  },
  {
    id: 'bnk-03',
    reference: 'COOP-UNREC-1029',
    bank_name: 'Co-operative Bank',
    account_number: '0112938481',
    amount: 18000,
    transaction_date: '2026-10-02',
    student_admission_number: 'BBA/2022/4412',
    student_name: 'Brian Kiprono',
    is_reconciled: false,
    notes: 'Pending cashier verification with physical slip.',
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: bankTransactions,
    summary: {
      total_transactions: bankTransactions.length,
      reconciled_count: bankTransactions.filter((t) => t.is_reconciled).length,
      unreconciled_count: bankTransactions.filter((t) => !t.is_reconciled).length,
      total_amount: bankTransactions.reduce((acc, t) => acc + t.amount, 0),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, transaction_id, reference, bank_name, amount, student_admission_number, student_name, notes } = body;

    if (action === 'reconcile') {
      const tx = bankTransactions.find((t) => t.id === transaction_id);
      if (!tx) {
        return NextResponse.json({ success: false, error: 'Bank transaction not found.' }, { status: 404 });
      }

      tx.is_reconciled = true;
      tx.reconciled_by = 'Authorized Finance Officer';
      tx.reconciled_at = new Date().toISOString().replace('T', ' ').substring(0, 16);
      if (notes) tx.notes = notes;

      return NextResponse.json({
        success: true,
        message: `Transaction ${tx.reference} successfully reconciled against student ledger.`,
        data: tx,
      });
    }

    if (action === 'manual_entry') {
      // Idempotency check: prevent duplicate bank reference
      const existing = bankTransactions.find((t) => t.reference.trim().toUpperCase() === String(reference).trim().toUpperCase());
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Duplicate reference: Transaction ${reference} is already recorded in the system.` },
          { status: 409 }
        );
      }

      const newTx: BankTransaction = {
        id: `bnk-${Date.now()}`,
        reference: String(reference).trim().toUpperCase(),
        bank_name: bank_name || 'Kenya Commercial Bank (KCB)',
        account_number: '1102938475',
        amount: Number(amount) || 0,
        transaction_date: new Date().toISOString().split('T')[0],
        student_admission_number,
        student_name: student_name || 'Registered Student',
        is_reconciled: true,
        reconciled_by: 'Authorized Finance Officer',
        reconciled_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        notes: notes || 'Manual bank slip entry.',
      };

      bankTransactions.unshift(newTx);
      return NextResponse.json({
        success: true,
        message: `Bank payment ${newTx.reference} recorded and reconciled.`,
        data: newTx,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid bank action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Bank operation failed.' }, { status: 500 });
  }
}
