import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKuccpsCsv } from '@/lib/academic/kuccps-parser';
import { importKuccpsPlacements } from '@/lib/academic/kuccps-importer';
import { admissionsStore, convertApplicantToStudent } from '@/lib/academic/admissions';
import { studentsStore } from '@/lib/academic/student-records';
import { getAuditLogs, AuditLogEntry } from '@/lib/audit/audit-logger';
import { POST as publicApplyPOST } from './public-apply/route';
import { GET as publicStatusGET } from './public-status/route';
import { POST as kuccpsImportPOST } from './kuccps-import/route';
import { POST as convertRoutePOST } from './[id]/convert/route';
import { POST as convertBodyRoutePOST } from './convert/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { generateCaptchaChallenge } from '@/lib/auth/captcha';

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

  const ok = await publicStatusGET(new Request('http://localhost:3000/api/v1/admissions/public-status?ref=UADM-2026-0001&verify=derrick.kimathi@university.ac.ke') as any);
  assert.equal(ok.status, 200);
  const okData = await ok.json();
  assert.equal(okData.data.reference_number, 'UADM-2026-0001');
});

test('public-apply: unknown programme is rejected; valid application is created with captcha challenge', async () => {
  const bad = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Apply Test', applicant_email: 'apply.test@gmail.com', applicant_phone: '0712345678',
    gender: 'female', date_of_birth: '2006-05-05', program_code: 'NOPE123', kcse_grade: 'B+', kcse_points: 70,
  }));
  assert.equal(bad.status, 400);
  const badData = await bad.json();
  assert.match(badData.error, /Unknown programme code/);

  const challenge = generateCaptchaChallenge();
  const m = challenge.question.match(/(\d+)\s*\+\s*(\d+)/);
  const ans = m ? Number(m[1]) + Number(m[2]) : 0;

  const good = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Apply Test', applicant_email: 'apply.test.port@gmail.com', applicant_phone: '0712345678',
    gender: 'female', date_of_birth: '2006-05-05', program_code: 'BCS', kcse_grade: 'B+', kcse_points: 70,
    kcse_index: '99900022201/2025',
    challenge_token: challenge.challenge_token,
    captcha_answer: ans,
  }));
  assert.equal(good.status, 201);
  const goodData = await good.json();
  assert.ok(goodData.reference_number);
  assert.equal(goodData.data.program_code, 'BCS');
});

test('public-apply: honeypot detection traps automated bots and rejects with 400', async () => {
  const res = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Bot Spammer', applicant_email: 'bot@spam.com', applicant_phone: '0712345999',
    gender: 'other', date_of_birth: '2005-01-01', program_code: 'BCS', kcse_grade: 'A', kcse_points: 82,
    website_hp: 'https://spam-bot-trap.com',
  }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Spam submission detected/i);
});

test('public-apply: missing or incorrect security challenge fails with 400', async () => {
  const missingChallenge = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Human Candidate', applicant_email: 'human@test.com', applicant_phone: '0712345111',
    gender: 'female', date_of_birth: '2005-01-01', program_code: 'BCS', kcse_grade: 'A', kcse_points: 82,
  }));
  assert.equal(missingChallenge.status, 400);
  const missingData = await missingChallenge.json();
  assert.match(missingData.error, /Security challenge token is missing/i);

  const challenge = generateCaptchaChallenge();
  const wrongAnswer = await publicApplyPOST(jsonRequest('http://localhost:3000/api/v1/admissions/public-apply', {
    applicant_name: 'Human Candidate', applicant_email: 'human@test.com', applicant_phone: '0712345111',
    gender: 'female', date_of_birth: '2005-01-01', program_code: 'BCS', kcse_grade: 'A', kcse_points: 82,
    challenge_token: challenge.challenge_token,
    captcha_answer: 9999, // Intentional wrong answer
  }));
  assert.equal(wrongAnswer.status, 400);
  const wrongData = await wrongAnswer.json();
  assert.match(wrongData.error, /Incorrect answer to security verification/i);
});

test('public-apply: rate limiter blocks rapid abuse and returns 429', async () => {
  const testIp = '198.51.100.99';
  const makeReqWithIp = (phone: string, kcse: string) => {
    const challenge = generateCaptchaChallenge();
    const m = challenge.question.match(/(\d+)\s*\+\s*(\d+)/);
    const ans = m ? Number(m[1]) + Number(m[2]) : 0;
    return new Request('http://localhost:3000/api/v1/admissions/public-apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        applicant_name: 'Rapid Submitter',
        applicant_email: `rapid.${Math.random()}@test.com`,
        applicant_phone: phone,
        gender: 'male',
        date_of_birth: '2005-01-01',
        program_code: 'BCS',
        kcse_grade: 'B+',
        kcse_points: 70,
        kcse_index: kcse,
        challenge_token: challenge.challenge_token,
        captcha_answer: ans,
      }),
    }) as any;
  };

  // Submit 5 requests within the limit
  for (let i = 0; i < 5; i++) {
    await publicApplyPOST(makeReqWithIp(`0712345${i}00`, `999000888${i}1/2025`));
  }

  // The 6th request from the same IP must be rate-limited (429)
  const rateLimitedRes = await publicApplyPOST(makeReqWithIp('0712345999', '99900088899/2025'));
  assert.equal(rateLimitedRes.status, 429);
  const data = await rateLimitedRes.json();
  assert.match(data.error, /Too many applications submitted/i);
  assert.ok(rateLimitedRes.headers.get('Retry-After'));
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

test('conversion: admitted applicant converts to student record with Year 1 standing and audit trail', async () => {
  // Create an admitted application in admissionsStore
  const admApp = {
    id: `adm-conv-test-${Date.now()}`,
    reference_number: `UADM-2026-9991`,
    applicant_name: 'Naomi Chepkoech',
    applicant_email: 'naomi.chepkoech@gmail.com',
    applicant_phone: '+254711998877',
    gender: 'female' as const,
    program_code: 'BCS',
    program_name: 'Bachelor of Science in Computer Science',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'A-',
    kcse_points: 79,
    entry_type: 'DIRECT' as const,
    status: 'admitted' as const,
    admission_number: 'BCS/2026/9991',
    submitted_at: '2026-09-01',
  };
  admissionsStore.push(admApp);

  const initialStudentCount = studentsStore.length;
  const result = convertApplicantToStudent(admApp.id, { email: 'registrar@university.ac.ke', role: 'registrar' });

  assert.equal(result.alreadyConverted, false);
  assert.equal(result.application.status, 'converted');
  assert.ok(result.application.converted_at);
  assert.equal(studentsStore.length, initialStudentCount + 1);

  // Verify created student record details
  const createdStudent = studentsStore.find((s) => s.admission_number === 'BCS/2026/9991');
  assert.ok(createdStudent);
  assert.equal(createdStudent.first_name, 'Naomi');
  assert.equal(createdStudent.last_name, 'Chepkoech');
  assert.equal(createdStudent.current_year_of_study, 1);
  assert.equal(createdStudent.current_semester_number, 1);
  assert.equal(createdStudent.status, 'active');
  assert.equal(createdStudent.program_name, 'Bachelor of Science in Computer Science');

  // Verify audit logging
  const convAudit = getAuditLogs().find((l: AuditLogEntry) => l.action === 'ADMISSION_CONVERTED_TO_STUDENT' && l.entity_id === 'BCS/2026/9991');
  assert.ok(convAudit, 'Audit log for conversion must be recorded');
  assert.equal(convAudit.actor_email, 'registrar@university.ac.ke');

  // Verify idempotency: running conversion again is a safe no-op
  const secondResult = convertApplicantToStudent(admApp.id, { email: 'registrar@university.ac.ke', role: 'registrar' });
  assert.equal(secondResult.alreadyConverted, true);
  assert.equal(secondResult.student.admission_number, 'BCS/2026/9991');
  assert.equal(studentsStore.length, initialStudentCount + 1);
});

test('conversion: unadmitted applicants are rejected from conversion', () => {
  const pendingApp = {
    id: `adm-pending-test-${Date.now()}`,
    reference_number: `UADM-2026-9992`,
    applicant_name: 'Pending Applicant',
    applicant_email: 'pending@gmail.com',
    applicant_phone: '+254711998878',
    gender: 'male' as const,
    program_code: 'BIT',
    program_name: 'Bachelor of Science in Information Technology',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'B+',
    kcse_points: 75,
    entry_type: 'DIRECT' as const,
    status: 'under_review' as const,
    submitted_at: '2026-09-01',
  };
  admissionsStore.push(pendingApp);

  assert.throws(
    () => convertApplicantToStudent(pendingApp.id, { email: 'registrar@university.ac.ke', role: 'registrar' }),
    /Only admitted applicants/
  );
});

test('conversion routes: registrar can convert via endpoint; unauthenticated/student is denied', async () => {
  const routeApp = {
    id: `adm-route-test-${Date.now()}`,
    reference_number: `UADM-2026-9993`,
    applicant_name: 'Route Applicant',
    applicant_email: 'route.app@gmail.com',
    applicant_phone: '+254711998879',
    gender: 'female' as const,
    program_code: 'BCS',
    program_name: 'Bachelor of Science in Computer Science',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'A',
    kcse_points: 81,
    entry_type: 'DIRECT' as const,
    status: 'admitted' as const,
    admission_number: 'BCS/2026/9993',
    submitted_at: '2026-09-01',
  };
  admissionsStore.push(routeApp);

  // 1. Unauthenticated request is 401
  const unauthReq = new Request(`http://localhost:3000/api/v1/admissions/${routeApp.id}/convert`, { method: 'POST' });
  const unauthRes = await convertRoutePOST(unauthReq as any, { params: Promise.resolve({ id: routeApp.id }) });
  assert.equal(unauthRes.status, 401);

  // 2. Student role is 403
  const studentToken = createSignedToken({ id: 'usr-student-test', email: 'student@student.ac.ke', role: 'student' as any });
  const forbiddenReq = new Request(`http://localhost:3000/api/v1/admissions/${routeApp.id}/convert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const forbiddenRes = await convertRoutePOST(forbiddenReq as any, { params: Promise.resolve({ id: routeApp.id }) });
  assert.equal(forbiddenRes.status, 403);

  // 3. Registrar role succeeds (200)
  const registrarToken = createSignedToken({ id: 'usr-registrar-test', email: 'registrar@university.ac.ke', role: 'registrar' as any });
  const authReq = new Request(`http://localhost:3000/api/v1/admissions/${routeApp.id}/convert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${registrarToken}` },
  });
  const okRes = await convertRoutePOST(authReq as any, { params: Promise.resolve({ id: routeApp.id }) });
  assert.equal(okRes.status, 200);
  const okData = await okRes.json();
  assert.equal(okData.success, true);
  assert.equal(okData.data.student.admission_number, 'BCS/2026/9993');

  // 4. Also test convert body route (POST /api/v1/admissions/convert)
  const bodyReq = new Request('http://localhost:3000/api/v1/admissions/convert', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${registrarToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ application_id: routeApp.id }),
  });
  const bodyRes = await convertBodyRoutePOST(bodyReq as any);
  assert.equal(bodyRes.status, 200);
  const bodyData = await bodyRes.json();
  assert.equal(bodyData.data.alreadyConverted, true);
});
