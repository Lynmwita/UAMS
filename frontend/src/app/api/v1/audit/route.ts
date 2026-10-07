import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-auth';
import { getAuditLogs } from '@/lib/audit/audit-logger';

export async function GET(request: NextRequest) {
  // Only users with 'audit:read' permission (super_admin, admin, registrar, finance_officer)
  const auth = requirePermission(request, 'audit:read');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || undefined;
  const actor = searchParams.get('actor') || undefined;
  const limit = Number(searchParams.get('limit')) || 50;

  const logs = getAuditLogs({ action, actor_email: actor, limit });

  return NextResponse.json({
    success: true,
    total: logs.length,
    data: logs,
  });
}
