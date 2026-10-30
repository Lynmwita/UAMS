import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as eventsGet, POST as eventsPost } from './events/route';
import { GET as announcementsGet, POST as announcementsPost } from './announcements/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, url: string, body?: unknown) {
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

test('events GET: librarian is authorized and can read campus events without 403', async () => {
  const req = makeRequest('librarian', 'GET', 'http://localhost:3000/api/v1/events');
  const res = await eventsGet(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.some((e: any) => e.created_by_role === 'librarian'));
});

test('events POST: librarian can publish library workshop events', async () => {
  const req = makeRequest('librarian', 'POST', 'http://localhost:3000/api/v1/events', {
    title: 'Digital Research & Citation Workshop',
    description: 'Training on reference management and open access journals.',
    category: 'academic',
    starts_at: '2026-11-15T09:00:00Z',
    ends_at: '2026-11-15T11:00:00Z',
    location: 'Library Lab 1',
    scope_type: 'university',
  });
  const res = await eventsPost(req);
  const data = await res.json();
  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.created_by_role, 'librarian');
});

test('announcements POST: librarian can publish official bulletins scoped to library', async () => {
  const req = makeRequest('librarian', 'POST', 'http://localhost:3000/api/v1/announcements', {
    title: 'Mid-Semester Book Circulation & Renewal Notice',
    body: 'All students are reminded that semester loans may be renewed once via the library desk.',
    audience: 'All Campus',
    category: 'Library & Books',
    priority: 'Important',
  });
  const res = await announcementsPost(req);
  const data = await res.json();
  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.category, 'Library & Books');
});
