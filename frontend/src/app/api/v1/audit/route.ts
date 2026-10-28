import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-auth';
import { getAuditLogs } from '@/lib/audit/audit-logger';
import { resolveAuditTarget } from '@/lib/audit/audit-labels';

export async function GET(request: NextRequest) {
  // Only users with 'audit:read' permission (super_admin, admin, registrar, finance_officer)
  const auth = await requirePermission(request, 'audit:read');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'audit');

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || undefined;
  const actor = searchParams.get('actor') || undefined;
  const limit = Number(searchParams.get('limit')) || 50;

  const logs = getAuditLogs({ action, actor_email: actor, limit });
  const isAdmin = ['super_admin', 'admin'].includes(auth.user.role);

  return NextResponse.json({
    success: true,
    total: logs.length,
    data: logs.map((log) => ({
      ...log,
      target_label: resolveAuditTarget(log),
      // Raw UUIDs and IP addresses are admin-only: other audit readers get the
      // human-readable target and must not see identifiers in the list.
      ...(isAdmin ? {} : { entity_id: undefined, ip_address: undefined }),
    })),
  });
}
