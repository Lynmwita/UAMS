import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { User } from '@supabase/supabase-js';
import { canAccessPage, OTHER_ROLE_SELECTION } from './roles';
import { linkInstitutionalIdentity, resolvePortalRole, resolveStaffPortalRole } from '../supabase/provisioning';
import { activeInstitutionalUser } from '../supabase/server';
import { POST as login } from '../../app/api/v1/auth/login/route';
import { GET as staffMe } from '../../app/api/v1/staff/me/route';
import { createSignedToken } from './server-auth';
import { describeSupportAssignment } from '../hr/support-assignment';

// Support-staff login (approved 2026-10-28): support job titles
// (cleaner, cook, driver, gardener, security, ...) have no entry in the
// old 8-role dropdown, and the audit batch's strict provisioning blocked
// password-set for them entirely. The approved design: staff records
// whose job title has no portal role map to the scoped 'support_staff'
// role, and login resolves the role server-side from the account record
// — a picked or typed role never grants authorization.

// --- Role mapping ---

test('staff mapping: unmapped job titles become support_staff, never an invented portal role', () => {
  for (const title of ['cleaner', 'cook', 'driver', 'gardener', 'security officer', 'groundskeeper']) {
    assert.equal(resolveStaffPortalRole(true, title), 'support_staff', title);
  }
});

test('staff mapping: real portal roles and the library alias still pass through unchanged', () => {
  assert.equal(resolveStaffPortalRole(true, 'lecturer'), 'lecturer');
  assert.equal(resolveStaffPortalRole(true, 'library'), 'librarian');
  assert.equal(resolveStaffPortalRole(true, 'student'), 'student');
  assert.equal(resolveStaffPortalRole(false, 'student'), 'student');
});

test('staff mapping: no staff record and no usable role still resolves to nothing (fail loudly)', () => {
  assert.equal(resolveStaffPortalRole(false, 'cleaner'), null);
  assert.equal(resolveStaffPortalRole(false, undefined), null);
});

test('strict helper unchanged: resolvePortalRole still returns null for job titles', () => {
  assert.equal(resolvePortalRole('cleaner'), null);
  assert.equal(resolvePortalRole('accountant'), null);
});

// --- Page gating: support_staff sees almost nothing ---

test('support_staff page gating: blocked from students, finance, staff, grades, courses, attendance, exams, hostel, library admin and reports', () => {
  for (const module of ['students', 'finance', 'staff', 'grades', 'courses', 'attendance', 'exams', 'hostel', 'library', 'reports', 'audit', 'admissions', 'structure', 'notifications', 'support']) {
    assert.equal(canAccessPage('support_staff', module), false, module);
  }
});

test('support_staff page gating: allowed only dashboard, announcements and events', () => {
  assert.equal(canAccessPage('support_staff', 'dashboard'), true);
  assert.equal(canAccessPage('support_staff', 'announcements'), true);
  assert.equal(canAccessPage('support_staff', 'events'), true);
});

// --- Support dashboard content: no forbidden surface ---

test('support dashboard source contains no forbidden module links or data words', () => {
  const src = readFileSync(join(__dirname, '../../app/dashboard/SupportStaffDashboard.tsx'), 'utf8');
  for (const forbidden of [
    '/dashboard/students', '/dashboard/finance', '/dashboard/staff',
    '/dashboard/grades', '/dashboard/courses', '/dashboard/attendance',
    '/dashboard/exams', 'fee', 'grade', 'course', 'attendance', 'exam', 'balance',
  ]) {
    assert.equal(src.toLowerCase().includes(forbidden), false, forbidden);
  }
  for (const required of ['My profile', 'Announcements', 'Campus events']) {
    assert.equal(src.includes(required), true, required);
  }
});

// --- Login route: 'other' resolves from the record; typed roles never grant ---

function loginRequest(body: unknown) {
  return new Request('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  }) as any;
}

test("login with 'other' resolves the role from the demo record (student)", async () => {
  const res = await login(loginRequest({ email: 'student@university.ac.ke', password: 'DemoPassword2026!', role: OTHER_ROLE_SELECTION }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.user.role, 'student');
});

test('login with a typed admin role for a student record is rejected, never granted', async () => {
  const res = await login(loginRequest({ email: 'student@university.ac.ke', password: 'DemoPassword2026!', role: 'admin' }));
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /mismatch/i);
});

test("login with 'other' still requires the correct password", async () => {
  const res = await login(loginRequest({ email: 'student@university.ac.ke', password: 'WrongPassword123!', role: OTHER_ROLE_SELECTION }));
  assert.equal(res.status, 401);
});

test('login with a nonsense role is still rejected', async () => {
  const res = await login(loginRequest({ email: 'student@university.ac.ke', password: 'DemoPassword2026!', role: 'banana' }));
  assert.equal(res.status, 400);
});

// --- Institutional gate: provisioned support staff CAN log in; deactivated CANNOT ---

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

function database(row: unknown) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  globalThis.fetch = async () =>
    new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
}

const supportAuthUser = () =>
  ({
    id: '00000000-0000-4000-8000-000000000202',
    email: 'cleaner@university.ac.ke',
    app_metadata: { role: 'support_staff' },
    user_metadata: {},
  }) as unknown as User;

test('freshly provisioned support staff CAN log in: active row linked to support_staff', async () => {
  database({ id: 'canonical-support', email: 'cleaner@university.ac.ke', is_active: true, roles: { code: 'support_staff' } });
  const actor = await activeInstitutionalUser(supportAuthUser());
  assert.equal(actor?.role, 'support_staff');
  assert.equal(actor?.email, 'cleaner@university.ac.ke');
});

test('deactivated support staff CANNOT log in', async () => {
  database({ id: 'canonical-support', email: 'cleaner@university.ac.ke', is_active: false, roles: { code: 'support_staff' } });
  assert.equal(await activeInstitutionalUser(supportAuthUser()), null);
});

// --- Provisioning link for support_staff ---

test('provisioning link succeeds for support_staff once the roles row exists', async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'role-support' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        upsert: async (row: Record<string, unknown>) => {
          upserts.push(row);
          return { error: null };
        },
      };
    },
  };
  await linkInstitutionalIdentity(db, { email: 'cleaner@university.ac.ke', authUserId: 'auth-1', role: 'support_staff', firstName: 'Asha', lastName: 'Cleaner' });
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].role_id, 'role-support');
  assert.equal(upserts[0].is_active, true);
  assert.equal(upserts[0].auth_user_id, 'auth-1');
});

test('provisioning link refuses to reactivate a deactivated support account', async () => {
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'role-support' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'u1', is_active: false }, error: null }) }) }),
        upsert: async () => ({ error: null }),
      };
    },
  };
  await assert.rejects(
    linkInstitutionalIdentity(db, { email: 'cleaner@university.ac.ke', authUserId: 'auth-1', role: 'support_staff' }),
    /deactivated/i
  );
});

// --- Library attendant clarification (2026-10-28): attendants stay on
// the support dashboard, not the librarian book/loan dashboard ---

test('staff mapping: library attendant stays support staff, not librarian', () => {
  assert.equal(resolveStaffPortalRole(true, 'library attendant'), 'support_staff');
  assert.equal(resolveStaffPortalRole(true, 'Library Attendant'), 'support_staff');
  // The legacy 'library' value still means librarian; only attendants
  // are support staff.
  assert.equal(resolveStaffPortalRole(true, 'library'), 'librarian');
});

// --- Roster labels: one shared shape, personalised by assignment ---

test('roster labels: each category reads as personal, driven only by job title', () => {
  assert.equal(describeSupportAssignment('Cleaner').title, 'My cleaning zones and shifts');
  assert.equal(describeSupportAssignment('Head Cook').title, 'My kitchen shifts and meal services');
  assert.equal(describeSupportAssignment('Driver').title, 'My routes and trips');
  assert.equal(describeSupportAssignment('Security Officer').title, 'My posts and gates');
  assert.equal(describeSupportAssignment('Gardener').title, 'My grounds zones');
  assert.equal(describeSupportAssignment('Library Attendant').title, 'My library desk shifts');
  assert.equal(describeSupportAssignment('Hostel Attendant').title, 'My desk shifts');
  assert.equal(describeSupportAssignment('Clerk').title, 'My duty roster');
  assert.equal(describeSupportAssignment(null).title, 'My duty roster');
});

test('roster labels: empty states never invent shifts, assignment line uses existing record detail', () => {
  const labels = describeSupportAssignment('Cleaner', 'General Campus Support & Operations');
  assert.match(labels.empty, /No cleaning zones assigned yet/);
  assert.equal(labels.assignmentLine, 'Cleaner · General Campus Support & Operations');
  assert.equal(describeSupportAssignment(null, null).assignmentLine, null);
});

// --- Own-record endpoint: own row only, never anyone else's ---

function staffMeRequest(email: string | null, role = 'support_staff') {
  const headers: Record<string, string> = {};
  if (email) {
    const token = createSignedToken({ id: 'usr-test-support-1', email, role: role as any });
    headers['Authorization'] = `Bearer ${token}`;
  }
  const req = new Request('http://localhost:3000/api/v1/staff/me', { method: 'GET', headers }) as any;
  return staffMe(req);
}

test('staff/me returns the caller\'s own record (seed lecturer Jane Mwangi)', async () => {
  const res = await staffMeRequest('jane.mwangi@university.ac.ke');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.email, 'jane.mwangi@university.ac.ke');
  assert.equal(data.data.job_title, 'Senior Lecturer');
  assert.equal(data.data.department_name, 'Computer Science');
});

test('staff/me never returns another person\'s record: unknown email is 404', async () => {
  const res = await staffMeRequest('nobody@university.ac.ke');
  assert.equal(res.status, 404);
});

test('staff/me without a session is refused', async () => {
  const res = await staffMeRequest(null);
  assert.equal(res.status, 401);
});
