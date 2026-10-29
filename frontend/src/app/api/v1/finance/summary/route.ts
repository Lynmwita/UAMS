import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { studentsStore } from '@/lib/academic/student-records';
import { invoicesStore } from '@/lib/finance/invoices';
import {
  computeLedgerTotals,
  perStudentStatements,
  resolveDemoStudent,
  studentStatement,
} from '@/lib/finance/ledger-summary';

/**
 * GET /api/v1/finance/summary — the one ledger total for the Finance page.
 *
 * Staff get the institutional totals (all invoice ledger records) plus a
 * per-student breakdown. A signed-in student gets ONLY their own
 * statement: their own invoices and totals, with no institutional
 * totals and no other student's records in the response.
 *
 * Demonstration accounts only (usr-*). Institutional accounts are
 * refused by the server-auth module gate (no institutional adapter for
 * this route) and keep using the Reports endpoint plus the
 * per-student invoice endpoint, which reduce the same invoice records.
 */
export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, [
    'super_admin',
    'admin',
    'registrar',
    'finance_officer',
    'hod',
    'student',
    'audit_officer',
  ]);
  if ('errorResponse' in auth) return auth.errorResponse;
  const { user } = auth;

  if (user.role === 'student') {
    const self = resolveDemoStudent(user, studentsStore);
    if (!self) {
      return NextResponse.json(
        { success: false, error: 'No student record is linked to this account.' },
        { status: 404 }
      );
    }
    const { invoices, totals } = studentStatement(invoicesStore, self.id);
    return NextResponse.json({
      success: true,
      scope: 'student',
      student: {
        id: self.id,
        name: `${self.first_name} ${self.last_name}`,
        admission_number: self.admission_number,
        program_name: self.program_name,
      },
      totals,
      invoices,
    });
  }

  return NextResponse.json({
    success: true,
    scope: 'institutional',
    totals: computeLedgerTotals(invoicesStore),
    statements: perStudentStatements(invoicesStore, studentsStore),
    invoices: invoicesStore,
  });
}
