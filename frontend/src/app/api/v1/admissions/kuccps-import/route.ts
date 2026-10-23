import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { parseKuccpsCsv } from '@/lib/academic/kuccps-parser';
import { importKuccpsPlacements } from '@/lib/academic/kuccps-importer';
import { KuccpsPlacementRecord } from '@/types';

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { csv_content, records, notify_applicants = false, auto_admit = true, intake_year = 2026 } = body;

    let placementRecords: KuccpsPlacementRecord[] = [];

    if (csv_content && typeof csv_content === 'string') {
      const parseResult = parseKuccpsCsv(csv_content, Number(intake_year));
      if (parseResult.validRecords.length === 0 && parseResult.errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to parse any valid placements from CSV.',
            details: parseResult.errors,
          },
          { status: 400 }
        );
      }
      placementRecords = parseResult.validRecords;
    } else if (Array.isArray(records)) {
      placementRecords = records;
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide either csv_content (string) or records (array).' },
        { status: 400 }
      );
    }

    if (placementRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No placement records found to process.' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const originUrl = `${proto}://${host}`;

    const result = await importKuccpsPlacements(placementRecords, {
      reviewerEmail: auth.user.email,
      reviewerRole: auth.user.role,
      autoAdmit: Boolean(auto_admit),
      notifyApplicants: Boolean(notify_applicants),
      intakeYear: Number(intake_year),
      originUrl,
      isDemo: auth.user.id.startsWith('usr-'),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.importedCount} KUCCPS placement(s). (${result.skippedDuplicates} duplicate(s) skipped).`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
