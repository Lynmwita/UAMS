import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { studentsStore } from '@/lib/academic/student-records';
import { invoicesStore } from '@/lib/finance/invoices';
import { getCreditBalance } from '@/lib/finance/allocation';
import { getFundingBand } from '@/lib/finance/helb';

/**
 * HEF/HELB enrolment-status export (A2 remainder). Finance-only.
 *
 * Exported CSV columns, in order:
 *   admission_number  — the student's admission/registration number
 *   full_name         — first + last name
 *   programme         — programme name
 *   academic_period   — "Year <n> Semester <n>" from the student record
 *   enrolment_status  — the student record status (e.g. active)
 *   funding_band      — assigned HEF/HELB band (1-5) or "unassigned"
 *   fee_balance       — outstanding invoice balances minus any credit
 *                       balance on the account (credit is shown through
 *                       the reduced balance, never as a separate payout)
 *
 * Hub sync rule (PARTLY): this export is a finance/HEF artefact. Only a
 * student's own balance and receipts may ever reach the Student Hub feed;
 * batches, suspense records and this export never sync to the Hub.
 */
const FINANCE_ROLES = ['finance_officer', 'admin', 'super_admin'] as const;

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, [...FINANCE_ROLES]);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'Enrolment export for institutional records requires the institutional workflow; it is not yet configured for this operation.' },
      { status: 503 }
    );
  }
  const header = [
    'admission_number',
    'full_name',
    'programme',
    'academic_period',
    'enrolment_status',
    'funding_band',
    'fee_balance',
  ];
  const lines = [header.join(',')];
  for (const student of studentsStore) {
    const outstanding = invoicesStore
      .filter((i) => i.student_id === student.id && i.balance > 0)
      .reduce((sum, i) => sum + i.balance, 0);
    const feeBalance = Math.max(0, outstanding - getCreditBalance(student.admission_number));
    const band = getFundingBand(student.admission_number);
    lines.push(
      [
        csvCell(student.admission_number),
        csvCell(`${student.first_name} ${student.last_name}`),
        csvCell(student.program_name),
        csvCell(`Year ${student.current_year_of_study} Semester ${student.current_semester_number}`),
        csvCell(student.status),
        csvCell(band === null ? 'unassigned' : `Band ${band}`),
        csvCell(feeBalance),
      ].join(',')
    );
  }
  const csv = lines.join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hef-helb-enrolment-status.csv"',
    },
  });
}
