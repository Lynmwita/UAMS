import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { schoolsStore, departmentsStore, programsStore } from '@/lib/academic/structure';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Bulk hierarchy import/export for the Structure page.
 *
 * POST /api/v1/structure/import — accepts { schools[], departments[], programs[] }
 *   (parsed from CSV on the client). Validates, skips duplicates by code,
 *   creates the rest. Returns counts + per-row errors. Admin-tier only.
 *
 * GET /api/v1/structure/import?format=csv — downloads the current hierarchy
 *   as CSV (schools, departments, programs sections).
 */

type ImportRow = Record<string, string>;

function normCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'Bulk import requires the demo path; institutional bulk import is not yet supported.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const schools: ImportRow[] = Array.isArray(body.schools) ? body.schools : [];
    const departments: ImportRow[] = Array.isArray(body.departments) ? body.departments : [];
    const programs: ImportRow[] = Array.isArray(body.programs) ? body.programs : [];

    const result = {
      schools: { created: 0, skipped: 0, errors: [] as string[] },
      departments: { created: 0, skipped: 0, errors: [] as string[] },
      programs: { created: 0, skipped: 0, errors: [] as string[] },
    };

    // Schools first (departments reference them)
    for (const [i, row] of schools.entries()) {
      const code = normCode(row.code);
      const name = (row.name || '').trim();
      if (!code || !name) {
        result.schools.errors.push(`Row ${i + 1}: code and name are required.`);
        continue;
      }
      if (schoolsStore.some((s) => s.code.toUpperCase() === code)) {
        result.schools.skipped++;
        continue;
      }
      schoolsStore.push({
        id: `sch-${Date.now()}-${i}`,
        code,
        name,
        dean: (row.dean || '').trim() || 'Pending Appointment',
        dean_email: (row.dean_email || '').trim(),
        departments_count: 0,
        programs_count: 0,
        is_active: true,
      });
      result.schools.created++;
    }

    // Departments (need school_code -> school_id resolution)
    for (const [i, row] of departments.entries()) {
      const code = normCode(row.code);
      const name = (row.name || '').trim();
      if (!code || !name) {
        result.departments.errors.push(`Row ${i + 1}: code and name are required.`);
        continue;
      }
      if (departmentsStore.some((d) => d.code.toUpperCase() === code)) {
        result.departments.skipped++;
        continue;
      }
      const schoolCode = normCode(row.school_code);
      const school = schoolCode
        ? schoolsStore.find((s) => s.code.toUpperCase() === schoolCode)
        : null;
      const category = row.category === 'non_academic' ? 'non_academic' : 'academic';
      departmentsStore.push({
        id: `dep-${Date.now()}-${i}`,
        school_id: school ? school.id : 'central',
        code,
        name,
        hod: (row.hod || '').trim() || 'Pending Appointment',
        hod_email: (row.hod_email || '').trim(),
        programs_count: 0,
        is_active: true,
        category: category as 'academic' | 'non_academic',
      });
      if (school) school.departments_count++;
      result.departments.created++;
    }

    // Programs (need department_code -> department_id resolution)
    for (const [i, row] of programs.entries()) {
      const code = normCode(row.code);
      const name = (row.name || '').trim();
      if (!code || !name) {
        result.programs.errors.push(`Row ${i + 1}: code and name are required.`);
        continue;
      }
      if (programsStore.some((p) => p.code.toUpperCase() === code)) {
        result.programs.skipped++;
        continue;
      }
      const deptCode = normCode(row.department_code);
      const dept = deptCode
        ? departmentsStore.find((d) => d.code.toUpperCase() === deptCode)
        : null;
      if (!dept) {
        result.programs.errors.push(`Row ${i + 1}: department_code '${row.department_code}' not found.`);
        continue;
      }
      programsStore.push({
        id: `prog-${Date.now()}-${i}`,
        department_id: dept.id,
        school_id: dept.school_id || '',
        code,
        name,
        duration_years: Number(row.duration_years) || 4,
        credit_limit: Number(row.credit_limit) || 48,
        level: ['undergraduate', 'postgraduate', 'diploma', 'certificate'].includes((row.level || '').toLowerCase())
          ? (row.level || '').toLowerCase()
          : 'undergraduate',
        is_active: true,
        accreditation_status: 'unknown',
        regulatory_body: (row.regulatory_body || '').trim() || 'CUE',
        last_review_date: '',
        next_inspection_date: '',
        max_capacity: Number(row.max_capacity) || 0,
      } as any);
      dept.programs_count++;
      result.programs.created++;
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STRUCTURE_BULK_IMPORT',
      entity_type: 'structure',
      entity_id: 'bulk',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        schools_created: result.schools.created,
        departments_created: result.departments.created,
        programs_created: result.programs.created,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines: string[] = [];
  lines.push('# UAMS Structure Export');
  lines.push('# Generated: ' + new Date().toISOString());
  lines.push('');
  lines.push('[schools]');
  lines.push('code,name,dean,dean_email,is_active');
  for (const s of schoolsStore) {
    lines.push([s.code, s.name, s.dean, s.dean_email, s.is_active].map(escape).join(','));
  }
  lines.push('');
  lines.push('[departments]');
  lines.push('code,name,school_code,hod,hod_email,category,is_active');
  for (const d of departmentsStore) {
    const schoolCode = schoolsStore.find((s) => s.id === d.school_id)?.code || '';
    lines.push([d.code, d.name, schoolCode, d.hod, d.hod_email, d.category || '', d.is_active].map(escape).join(','));
  }
  lines.push('');
  lines.push('[programs]');
  lines.push('code,name,department_code,level,duration_years,credit_limit,regulatory_body,accreditation_status,max_capacity,is_active');
  for (const p of programsStore as any[]) {
    const deptCode = departmentsStore.find((d) => d.id === p.department_id)?.code || '';
    lines.push([
      p.code, p.name, deptCode, p.level, p.duration_years, p.credit_limit,
      p.regulatory_body || '', p.accreditation_status || '', p.max_capacity || '', p.is_active,
    ].map(escape).join(','));
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="uams-structure-export.csv"',
    },
  });
}
