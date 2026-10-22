import { institutionalApi } from '@/lib/academic/institutional-api';
import { studentsStore } from '@/lib/academic/student-records';
import { upsertStudentInvoice } from '@/lib/finance/invoices';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

import { bankDepositsStore, type UamsBankDeposit } from '@/lib/finance/bank-deposits';

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['finance_officer', 'super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'finance/bank/record');

  try {
    const body = await request.json();
    const { student_id, amount, bank, bank_reference, deposited_at } = body;

    if (!student_id || !bank || !bank_reference) {
      return NextResponse.json(
        { success: false, error: 'student_id, bank, and bank_reference are required' },
        { status: 400 }
      );
    }
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0 || paid > 1000000) {
      return NextResponse.json({ success: false, error: 'amount must be between 1 and 1,000,000.' }, { status: 400 });
    }

    const student = studentsStore.find((s) => s.id === student_id || s.admission_number === student_id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    if (bankDepositsStore.some((d) => d.bank_reference.toLowerCase() === String(bank_reference).toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'This bank reference has already been recorded. Deposits cannot be duplicated.' },
        { status: 409 }
      );
    }

    const invoiceBefore = upsertStudentInvoice(student.id, 0);
    const balanceBefore = invoiceBefore ? invoiceBefore.balance : null;

    const deposit: UamsBankDeposit = {
      receipt_number: `RCP-${Date.now()}`,
      student_id: student.id,
      admission_number: student.admission_number,
      student_name: `${student.first_name} ${student.last_name}`,
      amount: paid,
      bank: String(bank).trim(),
      bank_reference: String(bank_reference).trim(),
      deposited_at: deposited_at || new Date().toISOString().slice(0, 10),
      recorded_by: auth.user.email,
      invoice_number: invoiceBefore ? invoiceBefore.invoice_number : null,
      invoice_balance_before: balanceBefore,
      invoice_balance_after: balanceBefore,
    };
    bankDepositsStore.push(deposit);

    const invoice = upsertStudentInvoice(student.id, paid);
    if (deposit.invoice_number && invoice) {
      deposit.invoice_balance_after = invoice.balance;
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'BANK_DEPOSIT_RECORDED',
      entity_type: 'bank_deposits',
      entity_id: deposit.receipt_number,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        student_id: student.id,
        amount: paid,
        bank_reference: deposit.bank_reference,
        invoice_number: deposit.invoice_number,
      },
    });

    return NextResponse.json(
      { success: true, message: `Deposit recorded. Receipt ${deposit.receipt_number}.`, data: deposit },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['finance_officer', 'super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'finance/bank/record');
  return NextResponse.json({ success: true, total: bankDepositsStore.length, data: bankDepositsStore });
}
