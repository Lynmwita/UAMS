import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { reconcileHelbBatch } from '@/lib/finance/helb';

/**
 * HELB disbursement batch reconciliation (A2 remainder).
 * Finance-only: finance_officer, admin, super_admin — the same gate as the
 * existing finance routes.
 *
 * POST { batchId, date, rows: [{ admissionNumber, amount, band? }] }
 * Re-uploading the same Batch ID returns the original result with
 * duplicate: true and credits nothing twice.
 *
 * Demo path (usr- callers) runs the full in-memory reconciler. Institutional
 * callers fail closed (503) until the uams_workflow RPC gains HELB batch
 * operations — no batch is ever reported as reconciled when it was not
 * written to institutional records.
 */
const FINANCE_ROLES = ['finance_officer', 'admin', 'super_admin'] as const;

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, [...FINANCE_ROLES]);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'HELB batch reconciliation for institutional records requires the institutional workflow; it is not yet configured for this operation.' },
      { status: 503 }
    );
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Provide valid JSON.' }, { status: 400 });
  }
  try {
    const result = reconcileHelbBatch({
      batchId: body?.batchId,
      date: body?.date || '',
      rows: body?.rows,
      reconciledBy: auth.user.email,
    });
    return NextResponse.json({ success: true, duplicate: result.duplicate, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Batch reconciliation failed.' }, { status: 400 });
  }
}
