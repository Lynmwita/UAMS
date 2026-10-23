import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { retryDispatch } from '@/lib/communications/dispatcher-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Catch 2: Only authorized staff roles can trigger SMS / Email retries
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar', 'finance_officer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Notification ID is required.' }, { status: 400 });
  }

  const isDemo = auth.user.id.startsWith('usr-');
  const result = await retryDispatch(id, isDemo);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to retry notification dispatch.', data: result.log },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Notification retried successfully (Attempt ${result.log?.retry_count ?? 1}/3). Current status: ${result.log?.status}`,
    data: result.log,
  });
}
