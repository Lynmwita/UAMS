import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import { activeInstitutionalUser } from './server';
import { linkInstitutionalIdentity, resolvePortalRole } from './provisioning';

// Regression tests for the login-after-onboarding bug reported 2026-10-28:
// a registrar adds a person, the admin sets their password / sends the
// invite, and the person then saw "Your institutional account is currently
// inactive" although their password was correct. Root cause: the
// provisioning writes never linked the users row to a portal role
// (password-set wrote no role_id at all; invite only wrote auth_user_id),
// so the login gate's roles inner join dropped the row. These tests prove
// both directions of the fixed contract: a freshly provisioned account
// CAN log in, and a genuinely deactivated account CANNOT.

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

const authUser = (role: string) =>
  ({
    id: '00000000-0000-4000-8000-000000000201',
    email: 'mwatu@university.ac.ke',
    app_metadata: { role },
    user_metadata: {},
  }) as unknown as User;

function database(row: unknown) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  globalThis.fetch = async () =>
    new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
}

test('freshly provisioned student CAN log in: active row linked to the student role', async () => {
  database({ id: 'canonical-user', email: 'MWATU@university.ac.ke', is_active: true, roles: { code: 'student' } });
  const actor = await activeInstitutionalUser(authUser('student'));
  assert.equal(actor?.id, 'canonical-user');
  assert.equal(actor?.email, 'mwatu@university.ac.ke');
  assert.equal(actor?.role, 'student');
});

test('freshly provisioned account CAN log in when the roles relation arrives as an array', async () => {
  database({ id: 'canonical-user', email: 'mwatu@university.ac.ke', is_active: true, roles: [{ code: 'student' }] });
  const actor = await activeInstitutionalUser(authUser('student'));
  assert.equal(actor?.role, 'student');
});

test('deactivated user CANNOT log in: is_active false still yields the inactive outcome', async () => {
  database({ id: 'canonical-user', email: 'mwatu@university.ac.ke', is_active: false, roles: { code: 'student' } });
  assert.equal(await activeInstitutionalUser(authUser('student')), null);
});

test('role mismatch still CANNOT log in: active row with a different role than the Auth metadata', async () => {
  database({ id: 'canonical-user', email: 'mwatu@university.ac.ke', is_active: true, roles: { code: 'admin' } });
  assert.equal(await activeInstitutionalUser(authUser('student')), null);
});

test('provisioning link writes role_id, auth_user_id and is_active=true for a fresh account', async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'role-student' }, error: null }) }) }),
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
  await linkInstitutionalIdentity(db, {
    email: 'mwatu@university.ac.ke',
    authUserId: '00000000-0000-4000-8000-000000000201',
    role: 'student',
    firstName: 'Mwatu',
    lastName: 'Test',
  });
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].role_id, 'role-student');
  assert.equal(upserts[0].auth_user_id, '00000000-0000-4000-8000-000000000201');
  assert.equal(upserts[0].is_active, true);
});

test('provisioning link repairs a row whose is_active was never set (NULL) without touching names it was not given', async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'role-student' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { id: 'row-1', is_active: null }, error: null }) }),
        }),
        upsert: async (row: Record<string, unknown>) => {
          upserts.push(row);
          return { error: null };
        },
      };
    },
  };
  await linkInstitutionalIdentity(db, {
    email: 'mwatu@university.ac.ke',
    authUserId: '00000000-0000-4000-8000-000000000201',
    role: 'student',
  });
  assert.equal(upserts[0].is_active, true);
  assert.equal('first_name' in upserts[0], false);
});

test('provisioning link REFUSES a genuinely deactivated account and writes nothing', async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'role-student' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { id: 'row-1', is_active: false }, error: null }) }),
        }),
        upsert: async (row: Record<string, unknown>) => {
          upserts.push(row);
          return { error: null };
        },
      };
    },
  };
  await assert.rejects(
    linkInstitutionalIdentity(db, {
      email: 'mwatu@university.ac.ke',
      authUserId: '00000000-0000-4000-8000-000000000201',
      role: 'student',
    }),
    /deactivated/i
  );
  assert.equal(upserts.length, 0);
});

test('provisioning link FAILS LOUDLY when the portal role has no roles row, instead of writing a role-less row', async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const db: any = {
    from(table: string) {
      if (table === 'roles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
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
  await assert.rejects(
    linkInstitutionalIdentity(db, {
      email: 'mwatu@university.ac.ke',
      authUserId: '00000000-0000-4000-8000-000000000201',
      role: 'student',
    }),
    /not configured/i
  );
  assert.equal(upserts.length, 0);
});

test('portal role resolution: portal roles pass through, library maps to librarian, job titles resolve to nothing', () => {
  assert.equal(resolvePortalRole('student'), 'student');
  assert.equal(resolvePortalRole('LIBRARIAN'), 'librarian');
  assert.equal(resolvePortalRole('library'), 'librarian');
  assert.equal(resolvePortalRole('accountant'), null);
  assert.equal(resolvePortalRole('cleaner'), null);
  assert.equal(resolvePortalRole('accountant', 'lecturer'), 'lecturer');
  assert.equal(resolvePortalRole(undefined, null, ''), null);
});
