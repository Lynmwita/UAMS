import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeOfDay,
  parseTimeInterval,
  intervalsOverlap,
  findClashes,
  findVenueByName,
  venuesStore,
} from '@/lib/academic/timetable-store';
import { POST as createSlot } from '@/app/api/v1/timetable/route';
import { GET as checkClash } from '@/app/api/v1/timetable/check-clash/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/timetable') {
  const token = createSignedToken({
    id: `usr-test-${role}-${Date.now()}`,
    email: `${role}@university.ac.ke`,
    role,
  });
  return new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('parseTimeOfDay handles AM/PM correctly', () => {
  assert.equal(parseTimeOfDay('08:00 AM'), 480);
  assert.equal(parseTimeOfDay('12:00 PM'), 720);
  assert.equal(parseTimeOfDay('12:00 AM'), 0);
  assert.equal(parseTimeOfDay('05:30 PM'), 1050);
  assert.equal(parseTimeOfDay('11:06 AM'), 666);
  assert.equal(parseTimeOfDay('02:00 PN'), null); // invalid meridiem
  assert.equal(parseTimeOfDay('25:00 AM'), null);
  assert.equal(parseTimeOfDay('garbage'), null);
});

test('parseTimeInterval parses en-dash/hyphen intervals and rejects bad ones', () => {
  assert.deepEqual(parseTimeInterval('08:00 AM – 11:00 AM'), { start: 480, end: 660 });
  assert.deepEqual(parseTimeInterval('02:00 PM - 05:00 PM'), { start: 840, end: 1020 });
  assert.equal(parseTimeInterval('11:00 AM – 08:00 AM'), null); // start after end
  assert.equal(parseTimeInterval('08:00 AM'), null); // no interval
  assert.equal(parseTimeInterval('02:00 PN – 05:00 PM'), null); // bad meridiem
});

test('intervalsOverlap: s1 < e2 AND s2 < e1', () => {
  assert.equal(intervalsOverlap(480, 660, 600, 780), true); // partial overlap
  assert.equal(intervalsOverlap(480, 660, 660, 780), false); // touching, not overlapping
  assert.equal(intervalsOverlap(480, 660, 480, 660), true); // identical
  assert.equal(intervalsOverlap(480, 1020, 600, 780), true); // containment
});

test('venues: all seed slots resolve to a known venue', () => {
  assert.ok(venuesStore.length >= 5);
  assert.ok(findVenueByName('Lecture Hall 04'));
  assert.ok(findVenueByName('Lecture Hall 04 (Main Campus)')); // fuzzy match
  assert.equal(findVenueByName('Nonexistent Hall'), undefined);
  // Capacities are honestly unset (never invented)
  for (const v of venuesStore) assert.equal(v.capacity, null);
});

test('POST rejects lecturer double-booking with 409', async () => {
  // Dr. Jane Mwangi teaches Monday 08:00-11:00 (slot-1). Overlapping booking must fail.
  const res = await createSlot(makeRequest('admin', 'POST', {
    day: 'Monday',
    time: '09:00 AM – 12:00 PM',
    courseCode: 'BCS 999',
    courseTitle: 'Test Course',
    room: 'Lecture Theater 02',
    lecturer: 'Dr. Jane Mwangi',
  }));
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.match(body.error, /Dr\. Jane Mwangi is already teaching/);
});

test('POST rejects venue double-booking with 409', async () => {
  const res = await createSlot(makeRequest('admin', 'POST', {
    day: 'Monday',
    time: '09:30 AM – 10:30 AM',
    courseCode: 'BCS 999',
    courseTitle: 'Test Course',
    room: 'Lecture Hall 04',
    lecturer: 'Dr. Test Lecturer',
  }));
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.match(body.error, /Lecture Hall 04 is already booked/);
});

test('POST allows non-overlapping booking in same room', async () => {
  const res = await createSlot(makeRequest('admin', 'POST', {
    day: 'Monday',
    time: '11:00 AM – 01:00 PM', // slot-1 ends at 11:00, touching is OK
    courseCode: 'BCS 999',
    courseTitle: 'Test Course',
    room: 'Lecture Hall 04',
    lecturer: 'Dr. Test Lecturer',
  }));
  assert.equal(res.status, 201);
});

test('POST fails closed on unparseable time', async () => {
  const res = await createSlot(makeRequest('admin', 'POST', {
    day: 'Monday',
    time: '02:00 PN – 05:00 PM',
    courseCode: 'BCS 999',
    courseTitle: 'Test Course',
    room: 'Lecture Theater 02',
    lecturer: 'Dr. Test Lecturer',
  }));
  assert.equal(res.status, 400);
});

test('POST rejects unknown venue', async () => {
  const res = await createSlot(makeRequest('admin', 'POST', {
    day: 'Tuesday',
    time: '02:00 PM – 05:00 PM',
    courseCode: 'BCS 999',
    courseTitle: 'Test Course',
    room: 'Imaginary Hall 99',
    lecturer: 'Dr. Test Lecturer',
  }));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /not a recognized venue/);
});

test('check-clash API reports clashes without creating', async () => {
  const res = await checkClash(makeRequest(
    'admin', 'GET', undefined,
    'http://localhost:3000/api/v1/timetable/check-clash?day=Monday&time=09:00%20AM%20%E2%80%93%2012%3A00%20PM&lecturer=Dr.%20Jane%20Mwangi&room=Lecture%20Theater%2002'
  ));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.hasClash, true);
  assert.ok(body.data.clashes.length >= 1);
  assert.equal(body.data.clashes[0].type, 'lecturer');
});

test('findClashes is fail-closed on bad time', () => {
  const clashes = findClashes('Monday', 'not a time', 'Nobody', 'Nowhere');
  assert.ok(clashes.length > 0); // blocked, not allowed
});
