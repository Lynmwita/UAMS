import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKuccpsCsv } from './kuccps-parser';
import { importKuccpsPlacements } from './kuccps-importer';
import { admissionsStore } from './admissions';
import { POST as PUBLIC_APPLY_POST } from '@/app/api/v1/admissions/public-apply/route';
import { GET as PUBLIC_STATUS_GET } from '@/app/api/v1/admissions/public-status/route';
import { POST as KUCCPS_IMPORT_POST } from '@/app/api/v1/admissions/kuccps-import/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { UserRole } from '@/types';
import { NextRequest } from 'next/server';

function makeRequest(
  url: string,
  method = 'GET',
  role?: UserRole,
  body?: unknown
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Origin', 'http://localhost:3000');
  if (role) {
    const token = createSignedToken({
      id: `usr-test-${role}`,
      email: `${role}@uams.ac.ke`,
      role,
    });
    headers.set('Authorization', `Bearer ${token}`);
  }
  return new NextRequest(new URL(url), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// =========================================================================
// 1. KUCCPS CSV Parser Tests
// =========================================================================

test('KUCCPS Parser: parses valid CSV line and normalizes E.164 phone', () => {
  const csv = `KCSE INDEX,FULL NAME,GENDER,PHONE NUMBER,EMAIL ADDRESS,PROG CODE,PROG NAME,MEAN GRADE,POINTS
11223344001/2025,Kiprono Koech,M,0712345678,koech@test.com,BCS,BSc Computer Science,A-,76`;

  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.validRecords.length, 1);
  assert.equal(res.errors.length, 0);

  const rec = res.validRecords[0];
  assert.equal(rec.kcse_index, '11223344001/2025');
  assert.equal(rec.applicant_name, 'Kiprono Koech');
  assert.equal(rec.gender, 'male');
  assert.equal(rec.applicant_phone, '+254712345678');
  assert.equal(rec.applicant_email, 'koech@test.com');
  assert.equal(rec.program_code, 'BCS');
  assert.equal(rec.kcse_grade, 'A-');
  assert.equal(rec.kcse_points, 76);
});

test('KUCCPS Parser: rejects fake/unrecognized programme code', () => {
  const csv = `KCSE INDEX,FULL NAME,GENDER,PHONE,EMAIL,PROG CODE,MEAN GRADE
11223344002/2025,Jane Atieno,F,0722334455,atieno@test.com,NONEXISTENT_99,B+`;

  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.validRecords.length, 0);
  assert.equal(res.errors.length, 1);
  assert.match(res.errors[0].error, /does not match any active degree programme/i);
});

test('KUCCPS Parser: does NOT fake missing phone or email — records as "not provided"', () => {
  const csv = `KCSE INDEX,FULL NAME,GENDER,PHONE,EMAIL,PROG CODE,MEAN GRADE
11223344003/2025,Samuel Mwangi,M,,,BIT,B`;

  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.validRecords.length, 1);
  assert.equal(res.errors.length, 0);

  const rec = res.validRecords[0];
  assert.equal(rec.applicant_phone, 'not provided', 'Phone must not be faked with +254700000000');
  assert.equal(rec.applicant_email, 'not provided', 'Email must not be invented with @applicants.university.ac.ke');
  assert.equal(rec.kcse_grade, 'B');
  assert.equal(rec.kcse_points, 63, 'Points correctly derived from grade, not defaulted to 49');
});

test('KUCCPS Parser: rejects missing or invalid KCSE mean grade (never defaults to C+)', () => {
  const csvNoGrade = `KCSE INDEX,FULL NAME,GENDER,PHONE,EMAIL,PROG CODE,MEAN GRADE
11223344004/2025,Alice Chebet,F,0799887766,alice@test.com,BCS,`;

  const res1 = parseKuccpsCsv(csvNoGrade, 2026);
  assert.equal(res1.validRecords.length, 0);
  assert.match(res1.errors[0].error, /KCSE Mean Grade is required/i);

  const csvInvalidGrade = `KCSE INDEX,FULL NAME,GENDER,PHONE,EMAIL,PROG CODE,MEAN GRADE
11223344005/2025,Alice Chebet,F,0799887766,alice@test.com,BCS,Z`;

  const res2 = parseKuccpsCsv(csvInvalidGrade, 2026);
  assert.equal(res2.validRecords.length, 0);
  assert.match(res2.errors[0].error, /Invalid KCSE Mean Grade/i);
});

// =========================================================================
// 2. KUCCPS Importer Tests
// =========================================================================

test('KUCCPS Importer: records missing date_of_birth as "not provided" (never faked 2006-01-01)', async () => {
  const uniqueIndex = `99887766${Date.now().toString().slice(-3)}/2025`;
  const result = await importKuccpsPlacements(
    [
      {
        kcse_index: uniqueIndex,
        applicant_name: 'Faith Mutua',
        gender: 'female',
        applicant_phone: '+254711223344',
        applicant_email: `faith.${Date.now()}@test.com`,
        program_code: 'BCS',
        kcse_grade: 'A',
        kcse_points: 82,
        intake: 'September',
        intake_year: 2026,
      },
    ],
    {
      reviewerEmail: 'registrar@uams.ac.ke',
      autoAdmit: true,
      notifyApplicants: false,
      isDemo: true,
    }
  );

  assert.equal(result.importedCount, 1);
  const app = result.applications[0];
  assert.equal(app.date_of_birth, 'not provided', 'Birth date must never be faked');
  assert.equal(app.entry_type, 'KUCCPS');
  assert.match(app.admission_number || '', /^BCS\/2026\/\d{4}$/);
});

// =========================================================================
// 3. Route Tests: /api/v1/admissions/public-apply
// =========================================================================

test('Route public-apply: rejects invalid programme code not in catalogue', async () => {
  const req = makeRequest('http://localhost:3000/api/v1/admissions/public-apply', 'POST', undefined, {
    applicant_name: 'Kelvin Otieno',
    applicant_email: 'kelvin.otieno@gmail.com',
    applicant_phone: '0712345999',
    gender: 'male',
    date_of_birth: '2005-04-12',
    program_code: 'INVALID_CODE_XYZ',
    kcse_grade: 'B+',
    kcse_points: 74,
  });

  const res = await PUBLIC_APPLY_POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Invalid programme code/i);
});

test('Route public-apply: accepts valid application with active catalogue programme', async () => {
  const uniqueIndex = `12345000${Date.now().toString().slice(-3)}/2025`;
  const req = makeRequest('http://localhost:3000/api/v1/admissions/public-apply', 'POST', undefined, {
    applicant_name: 'Grace Wambui',
    applicant_email: `grace.${Date.now()}@gmail.com`,
    applicant_phone: '0711998877',
    gender: 'female',
    date_of_birth: '2005-08-20',
    program_code: 'BIT',
    kcse_grade: 'B',
    kcse_points: 65,
    kcse_index: uniqueIndex,
  });

  const res = await PUBLIC_APPLY_POST(req);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.data.reference_number, /^UADM-2026-\d{4}$/);
  assert.equal(data.data.program_code, 'BIT');
});

// =========================================================================
// 4. Route Tests: /api/v1/admissions/public-status (KDPA privacy rules)
// =========================================================================

test('Route public-status: rejects lookup without verification phone/email (400)', async () => {
  const req = makeRequest('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001');
  const res = await PUBLIC_STATUS_GET(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Verification required/i);
});

test('Route public-status: rejects lookup with wrong verification phone/email (403)', async () => {
  const req = makeRequest('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=0700000000');
  const res = await PUBLIC_STATUS_GET(req);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Verification failed/i);
});

test('Route public-status: succeeds when matching phone suffix or email is provided (200)', async () => {
  // Candidate in seed: UADM-2026-0001, Derrick Kimathi, +254712345001, derrick.kimathi@gmail.com
  const reqPhone = makeRequest('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=5001');
  const resPhone = await PUBLIC_STATUS_GET(reqPhone);
  assert.equal(resPhone.status, 200);
  const dataPhone = await resPhone.json();
  assert.equal(dataPhone.success, true);
  assert.equal(dataPhone.data.applicant_name, 'Derrick Kimathi');

  const reqEmail = makeRequest('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=derrick.kimathi@gmail.com');
  const resEmail = await PUBLIC_STATUS_GET(reqEmail);
  assert.equal(resEmail.status, 200);
  const dataEmail = await resEmail.json();
  assert.equal(dataEmail.success, true);
  assert.equal(dataEmail.data.applicant_name, 'Derrick Kimathi');
});

// =========================================================================
// 5. Route Tests: /api/v1/admissions/kuccps-import (RBAC & Import)
// =========================================================================

test('Route kuccps-import: enforces server-side authentication (401/403)', async () => {
  const unauthReq = makeRequest('http://localhost:3000/api/v1/admissions/kuccps-import', 'POST', undefined, {
    records: [],
  });
  const unauthRes = await KUCCPS_IMPORT_POST(unauthReq);
  assert.equal(unauthRes.status, 401);

  const studentReq = makeRequest('http://localhost:3000/api/v1/admissions/kuccps-import', 'POST', 'student', {
    records: [],
  });
  const studentRes = await KUCCPS_IMPORT_POST(studentReq);
  assert.equal(studentRes.status, 403);
});

test('Route kuccps-import: registrar can import CSV content successfully', async () => {
  const uniqueIdx = `33445566${Date.now().toString().slice(-3)}/2025`;
  const csv = `KCSE INDEX,FULL NAME,GENDER,PHONE NUMBER,EMAIL ADDRESS,PROG CODE,MEAN GRADE,POINTS
${uniqueIdx},Erick Omondi,M,0712334455,erick.${Date.now()}@test.com,BCS,B+,72`;

  const req = makeRequest('http://localhost:3000/api/v1/admissions/kuccps-import', 'POST', 'registrar', {
    csv_content: csv,
    auto_admit: true,
  });

  const res = await KUCCPS_IMPORT_POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.importedCount, 1);
});
