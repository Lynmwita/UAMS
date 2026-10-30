import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalApi } from '@/lib/academic/institutional-api';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { getLibraryPolicies, setLibraryPolicies } from '@/lib/library/store';
import type { LibraryPolicies } from '@/types';

/**
 * Library governance policies (loan rules, fine structures, clearance toggle).
 * GET: librarian+ can read. PATCH: admin/super_admin only, audit-logged.
 * Demo path uses the in-memory policy store; institutional path delegates.
 */
export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, ['librarian', 'admin', 'super_admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'library/policies');
  return NextResponse.json({ success: true, data: getLibraryPolicies() });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireServerAuth(req, ['admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'library/policies');

  try {
    const body = await req.json();
    const patch: Partial<LibraryPolicies> = {};

    if (body.loan_rules && typeof body.loan_rules === 'object') {
      const rules: Partial<LibraryPolicies['loan_rules']> = {};
      for (const k of ['undergrad', 'postgrad', 'staff'] as const) {
        const r = body.loan_rules[k];
        if (r && typeof r === 'object') {
          const max_books = Number(r.max_books);
          const loan_days = Number(r.loan_days);
          if (!Number.isInteger(max_books) || max_books < 1 || max_books > 20) {
            return NextResponse.json({ success: false, error: `loan_rules.${k}.max_books must be an integer 1-20.` }, { status: 400 });
          }
          if (!Number.isInteger(loan_days) || loan_days < 1 || loan_days > 120) {
            return NextResponse.json({ success: false, error: `loan_rules.${k}.loan_days must be an integer 1-120.` }, { status: 400 });
          }
          rules[k] = { max_books, loan_days };
        }
      }
      patch.loan_rules = { ...getLibraryPolicies().loan_rules, ...rules };
    }

    for (const key of ['fine_per_day', 'max_fine_per_book', 'lost_book_fee'] as const) {
      if (body[key] !== undefined) {
        const v = Number(body[key]);
        if (!Number.isFinite(v) || v < 0 || v > 100000) {
          return NextResponse.json({ success: false, error: `${key} must be a number 0-100000.` }, { status: 400 });
        }
        (patch as Record<string, number>)[key] = v;
      }
    }

    if (body.block_clearance_on_fines !== undefined) {
      if (typeof body.block_clearance_on_fines !== 'boolean') {
        return NextResponse.json({ success: false, error: 'block_clearance_on_fines must be boolean.' }, { status: 400 });
      }
      patch.block_clearance_on_fines = body.block_clearance_on_fines;
    }

    const updated = setLibraryPolicies({ ...patch, updated_by_email: auth.user.email });

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'LIBRARY_POLICIES_UPDATED',
      entity_type: 'library_policies',
      entity_id: 'global',
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: patch,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not update library policies.' }, { status: 500 });
  }
}
