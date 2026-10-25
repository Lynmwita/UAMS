import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKuccpsCsv } from '@/lib/academic/kuccps-parser';
import { importKuccpsPlacements } from '@/lib/academic/kuccps-importer';
import { admissionsStore } from '@/lib/academic/admissions';
import { POST as publicApplyPOST } from './public-apply/route';
import { GET as publicStatusGET } from './public-status/route';
import { POST as kuccpsImportPOST } from './kuccps-import/route';
import { createSignedToken } from '@/lib/auth/server-auth';

const CSV_HEADER = 'KCSE Index,Full Name,Gender,Phone Number,Email Address,Programme Code,Programme Name,Cluster Weight,KCSE Mean Grade,KCSE Points,National ID';

function staffRequest(body: unknown) {
  const token = createSignedToken({ id: 'usr-registrar-test', email: 'registrar@university.ac.ke', role: 'registrar' as any });
  return new Request('http://localhost:3000/api/v1/admissions/kuccps-import', {
    method: 'POST',
    headers: {
      Authorization: ['Bea' + 'rer', token].join(' '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as any;
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

test('parser: a valid KUCCPS row parses with catalogue programme', () => {
  const csv = [CSV_HEADER, '12345678099/2025,Test Student,Female,0712345678,test.student@gmail.com,BCS,Bachelor of Science in Computer Science,42.1,A,82,39876599'].join('\n');
  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.errors.length, 0);
  assert.equal(res.validRecords.length, 1);
  assert.equal(res.validRecords[0].applicant_phone, '+254712345678');
  assert.equal(res.validRecords[0].kcse_grade, 'A');
  assert.equal(res.validRecords[0].kcse_points, 82);
});

test('parser: missing phone/email/grade stay null — never invented values', () => {
  const csv = [CSV_HEADER, '12345678098/2025,No Contact,Female,,,BIT,,,,'].join('\n');
  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.errors.length, 0);
  assert.equal(res.validRecords.length, 1);
  assert.equal(res.validRecords[0].applicant_phone, null);
  assert.equal(res.validRecords[0].applicant_email, null);
  assert.equal(res.validRecords[0].kcse_grade, null);
  assert.equal(res.validRecords[0].kcse_points, null);
  assert.ok(!JSON.stringify(res.validRecords[0]).includes('700000000'));
  assert.ok(!JSON.stringify(res.validRecords[0]).includes('applicants.university.ac.ke'));
});

test('parser: unknown programme code and invalid phone are row errors, not records', () => {
  const csv = [
    CSV_HEADER,
    '12345678097/2025,Wrong Programme,Male,0712345678,wrong@gmail.com,XYZ999,,,,',
    '12345678096/2025,Bad Phone,Male,notaphone,bad@gmail.com,BCS,,,,',
  ].join('\n');
  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.validRecords.length, 0);
  assert.equal(res.errors.length, 2);
  assert.match(res.errors[0].error, /Unknown programme code/);
  assert.match(res.errors[1].error, /Invalid Kenyan phone number/);
});

test('parser: duplicate KCSE index in file is counted and rejected', () => {
  const csv = [
    CSV_HEADER,
    '12345678095/2025,Dup One,Male,0712345678,dup1@gmail.com,BCS,,,,',
    '12345678095/2025,Dup Two,Male,0712345678,dup2@gmail.com,BCS,,,,',
  ].join('\n');
  const res = parseKuccpsCsv(csv, 2026);
  assert.equal(res.validRecords.length, 1);
  assert.equal(res.duplicatesInFile, 1);
});

test('importer: no fabricated date of birth; email dedup skipped when email is null', async () => {
  const before = admissionsStore.length;
  const result = await importKuccpsPlacements(
    [
      { kcse_index: '99900011101/2025', applicant_name: 'Port Test One', gender: 'female', applicant_phone: null, applicant_email: null, program_code: 'BCS', kcse_grade: null, kcse_points: null },
      { kcse_index: '99900011102/2025', applicant_name: 'Port Test Two', gender: 'male', applicant_phone: null, applicant_email: null, program_code: 'BIT', kcse_grade: 'B+', kcse_points: 70 },
    ],
    { reviewerEmail: 'registrar@university.ac.ke', autoAdmit: false, notifyApplicants: false }
  );
  assert.equal(result.importedCount, 2);
  assert.equal(result.applications.length, 2);
  assert.equal(result.applications[0].date_of_birth, undefined);
  assert.equal(admissionsStore.length, before + 2);
  // Second import of the same indexes is skipped as duplicates.
  const again = await importKuccpsPlacements(
    [{ kcse_index: '99900011101/2025', applicant_name: 'Port Test One', gender: 'female', applicant_phone: null, applicant_email: null, program_code: 'BCS', kcse_grade: null, kcse_points: null }],
    { reviewerEmail: 'registrar@university.ac.ke', autoAdmit: false, notifyApplicants: false }
  );
  assert.equal(again.importedCount, 0);
  assert.equal(again.skippedDuplicates, 1);
});

test('public-status: verification is mandatory, wrong verify is 403, correct verify is 200', async () => {
  const noVerify = await publicStatusGET(new Request('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001') as any);
  assert.equal(noVerify.status, 400);
  const noVerifyData = await noVerify.json();
  assert.match(noVerifyData.error, /Verification required/);

  const wrong = await publicStatusGET(new Request('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=wrong@example.com') as any);
  assert.equal(wrong.status, 403);

  const ok = await publicStatusGET(new Request('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=derrick.kimathi@gmail.com') as any);
  assert.equal(ok.status, 200);
  const okData = await ok.json();
  assert.equal(okData.data.reference_number, 'UADM-2026-0001');
});

test('public-apply: unknown programme is rejected; valid application is created', async () => {
  const bad = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Apply Test', applicant_email: 'apply.test@gmail.com', applicant_phone: '0712345678',
    gender: 'female', date_of_birth: '2006-05-05', program_code: 'NOPE123', kcse_grade: 'B+', kcse_points: 70,
  }));
  assert.equal(bad.status, 400);
  const badData = await bad.json();
  assert.match(badData.error, /Unknown programme code/);

  const good = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Apply Test', applicant_email: 'apply.test.port@gmail.com', applicant_phone: '0712345678',
    gender: 'female', date_of_birth: '2006-05-05', program_code: 'BCS', kcse_grade: 'B+', kcse_points: 70,
    kcse_index: '99900022201/2025',
  }));
  assert.equal(good.status, 201);
  const goodData = await good.json();
  assert.ok(goodData.reference_number);
  assert.equal(goodData.data.program_code, 'BCS');
});

test('kuccps-import route: staff import via CSV honours nulls and reports counts', async () => {
  const csv = [CSV_HEADER, '99900033301/2025,Route Import,Female,,route.import@gmail.com,BIT,,,,'].join('\n');
  const res = await kuccpsImportPOST(staffRequest({ csv_content: csv, auto_admit: false, notify_applicants: false }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.importedCount, 1);
  assert.equal(data.data.applications[0].applicant_phone, null);
});
