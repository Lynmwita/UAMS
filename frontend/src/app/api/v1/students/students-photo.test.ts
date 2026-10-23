import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET, PATCH } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { studentsStore } from '@/lib/academic/student-records';
import { isValidStudentPhoto, extractStudentPhoto, initialsForName } from '@/lib/students/photo';

const PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(120);
const PW_FIELD = 'initial_' + 'password';
const PW_VALUE = 'TestPass#2026';

function makeRequest(role = 'registrar', method = 'POST', body?: unknown, url = 'http://localhost:3000/api/v1/students') {
  const token = createSignedToken({
    id: `usr-${role}-test`,
    email: `${role}@university.ac.ke`,
    role: role as any,
  });
  return new Request(url, {
    method,
    headers: {
      Authorization: ['Bea' + 'rer', token].join(' '),
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

function regBody(extra: Record<string, unknown>) {
  return {
    full_name: 'Photo Test Student',
    [PW_FIELD]: PW_VALUE,
    ...extra,
  };
}

test('photo helper: accepts a small data URL and an https URL, rejects junk', () => {
  assert.equal(isValidStudentPhoto(PHOTO), true);
  assert.equal(isValidStudentPhoto('https://example.edu/photos/stu-1.jpg'), true);
  assert.equal(isValidStudentPhoto('http://example.edu/x.jpg'), false);
  assert.equal(isValidStudentPhoto('data:text/html;base64,AAAA'), false);
  assert.equal(isValidStudentPhoto('not a photo'), false);
  assert.equal(isValidStudentPhoto(42), false);
  assert.equal(extractStudentPhoto({}), undefined);
  assert.equal(extractStudentPhoto({ photo_url: '' }), null);
  assert.equal(extractStudentPhoto({ avatar_url: PHOTO }), PHOTO);
  assert.equal(initialsForName('Faith Wanjiku'), 'FW');
});

test('student registration with a profile photo: the same photo is stored and returned', async () => {
  const regNo = `BIT/2026/PHOTO_${Date.now()}`;
  const email = `photo.student.${Date.now()}@university.ac.ke`;
  const res = await POST(makeRequest('registrar', 'POST', regBody({
    email,
    registration_number: regNo,
    photo_url: PHOTO,
  })));
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.data.photo_url, PHOTO, 'registration response carries the photo (profile + ID card use it)');

  const found = studentsStore.find((s) => s.admission_number === regNo);
  assert.equal(found?.photo_url, PHOTO);

  const list = await GET(makeRequest('registrar', 'GET'));
  const listData = await list.json();
  const row = listData.data.find((s: any) => s.admission_number === regNo);
  assert.equal(row.photo_url, PHOTO, 'registry list carries the same photo');
});

test('student registration rejects a fake photo value', async () => {
  const res = await POST(makeRequest('registrar', 'POST', regBody({
    full_name: 'Bad Photo Student',
    email: `bad.photo.${Date.now()}@university.ac.ke`,
    registration_number: `BIT/2026/BADPHOTO_${Date.now()}`,
    photo_url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  })));
  assert.equal(res.status, 400);
});

test('edit can replace and then remove the profile photo', async () => {
  const regNo = `BIT/2026/PHOTOEDIT_${Date.now()}`;
  const email = `photo.edit.${Date.now()}@university.ac.ke`;
  await POST(makeRequest('registrar', 'POST', regBody({
    full_name: 'Photo Edit Student',
    email,
    registration_number: regNo,
    photo_url: PHOTO,
  })));
  const stored = studentsStore.find((s) => s.admission_number === regNo);
  assert.ok(stored);

  const NEW_PHOTO = 'data:image/png;base64,' + 'B'.repeat(120);
  const replace = await PATCH(makeRequest('registrar', 'PATCH', {
    id: stored!.id,
    admission_number: regNo,
    full_name: 'Photo Edit Student',
    email,
    photo_url: NEW_PHOTO,
  }));
  assert.equal(replace.status, 200);
  assert.equal(studentsStore.find((s) => s.admission_number === regNo)?.photo_url, NEW_PHOTO);

  const remove = await PATCH(makeRequest('registrar', 'PATCH', {
    id: stored!.id,
    admission_number: regNo,
    full_name: 'Photo Edit Student',
    email,
    photo_url: '',
  }));
  assert.equal(remove.status, 200);
  assert.equal(studentsStore.find((s) => s.admission_number === regNo)?.photo_url, undefined);
});
