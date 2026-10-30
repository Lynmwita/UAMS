import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { buildExamClearanceCards } from '@/lib/academic/clearance';

/**
 * Invigilator QR verification. Fail-closed: any code that does not match an
 * issued exam pass returns valid:false ("DO NOT ADMIT").
 *
 * GET /api/v1/exams/verify-qr?code=XXX
 */
export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, [
    'super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer',
  ]);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams/verify-qr');

  const code = (new URL(req.url).searchParams.get('code') || '').trim();
  if (!code) {
    return NextResponse.json({ success: false, valid: false, error: 'No code supplied.' }, { status: 400 });
  }

  const card = buildExamClearanceCards().find((c) => c.security_qr_token === code);
  if (!card) {
    // Fail closed: unknown code = do not admit. No student details leaked.
    return NextResponse.json({
      success: true,
      valid: false,
      verdict: 'DO NOT ADMIT',
      reason: 'Code does not match any issued examination pass.',
    });
  }

  const admittable = card.status === 'cleared' || card.status === 'waived';
  return NextResponse.json({
    success: true,
    valid: true,
    verdict: admittable ? 'ADMIT' : 'DO NOT ADMIT',
    student_name: card.student_name,
    admission_number: card.admission_number,
    program_name: card.program_name,
    clearance_status: card.status,
    waiver: card.waiver,
    fee_paid_percentage: card.fee_paid_percentage,
    fee_balance: card.fee_balance,
    reason: admittable
      ? card.status === 'waived'
        ? `Waived until ${card.waiver?.valid_until}`
        : 'Financially cleared'
      : card.status === 'blocked_attendance'
        ? 'Blocked: attendance below 75% threshold'
        : 'Blocked: fee balance outstanding',
  });
}
