import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { HEF_BAND_SPLITS, splitFunding, assignFundingBand, getFundingBand } from '@/lib/finance/helb';

/**
 * HEF/HELB funding bands (A2 remainder). Finance-only.
 *
 * GET  ?band=1..5&total=<amount>  → the band table, or the split for one
 *      band and total (scholarship + loan + household always equals total).
 * POST { admissionNumber, band }  → assign a funding band to a student
 *      (demo/in-memory store; institutional assignment follows the same
 *      workflow caveat as the batch route).
 */
const FINANCE_ROLES = ['finance_officer', 'admin', 'super_admin'] as const;

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, [...FINANCE_ROLES]);
  if ('errorResponse' in auth) return auth.errorResponse;
  const params = new URL(request.url).searchParams;
  const band = params.get('band');
  const total = params.get('total');
  if (band !== null && total !== null) {
    try {
      const split = splitFunding(Number(band), Number(total));
      return NextResponse.json({ success: true, data: { band: Number(band), total: Number(total), split } });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message || 'Invalid band or total.' }, { status: 400 });
    }
  }
  return NextResponse.json({ success: true, data: { bands: HEF_BAND_SPLITS } });
}

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, [...FINANCE_ROLES]);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'Band assignment for institutional records requires the institutional workflow; it is not yet configured for this operation.' },
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
    const admissionNumber = String(body?.admissionNumber || '').trim();
    if (!admissionNumber) throw new Error('admissionNumber is required.');
    assignFundingBand(admissionNumber, Number(body?.band));
    return NextResponse.json({
      success: true,
      data: { admissionNumber, band: getFundingBand(admissionNumber) },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Band assignment failed.' }, { status: 400 });
  }
}
