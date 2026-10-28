import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { staffStore } from '@/lib/hr/staff';
import { institutionalDatabase } from '@/lib/academic/institutional';

/**
 * GET /api/v1/staff/me — the signed-in person's OWN staff record, and
 * nothing else. Any authenticated role may call it, but it only ever
 * returns the row matching the caller's own email (or 404). It exists so
 * the support dashboard can personalise itself from the person's own
 * assignment (job title, department) without ever exposing other
 * people's records: the staff list endpoint stays admin/registrar/HOD
 * only. Never returns another person's row, even on error paths.
 */
export async function GET(request: Request) {
  const auth = await requireServerAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  const email = auth.user.email.toLowerCase();

  // Demo path: in-memory store, matched by the caller's own email only.
  if (auth.user.id.startsWith('usr-')) {
    const record = staffStore.find((s) => s.email.toLowerCase() === email);
    if (!record) return NextResponse.json({ success: false, error: 'No staff record found for this account.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        first_name: record.first_name,
        last_name: record.last_name,
        email: record.email,
        job_title: record.job_title,
        department_name: record.department_name,
        staff_number: record.staff_number,
      },
    });
  }

  // Institutional path: own row only, matched by email. Any failure
  // (unconfigured database, missing table, no row) is a 404: the
  // dashboard falls back to generic labels, never to someone else's data.
  try {
    const db = institutionalDatabase();
    const { data, error } = await db.from('uams_staff_records').select('*').eq('email', email).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: 'No staff record found for this account.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      data: {
        first_name: (data as any).first_name ?? null,
        last_name: (data as any).last_name ?? null,
        email: (data as any).email ?? email,
        job_title: (data as any).job_title ?? (data as any).role ?? null,
        department_name: (data as any).department_name ?? (data as any).department ?? null,
        staff_number: (data as any).staff_number ?? null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'No staff record found for this account.' }, { status: 404 });
  }
}
