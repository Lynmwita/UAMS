import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage, isUserRole, resolveCanonicalRole, USER_ROLES } from './roles';
import { ROLE_PERMISSIONS, roleHasPermission } from './rbac';
import { resolvePortalRole } from '../supabase/provisioning';
import { POST as login } from '../../app/api/v1/auth/login/route';
import { GET as getAuditLogs } from '../../app/api/v1/audit/route';
import { GET as getFinanceSummary } from '../../app/api/v1/finance/summary/route';
import { createSignedToken } from './server-auth';

function authRequest(url: string, role: string, email: string) {
  const token = createSignedToken({ id: `usr-demo-${role}`, email, role: role as any });
  return new Request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  }) as any;
}

test('audit_officer: role registration and canonical aliases', () => {
  assert.equal(isUserRole('audit_officer'), true);
  assert.equal(USER_ROLES.includes('audit_officer'), true);
  assert.equal(resolveCanonicalRole('audit_officer'), 'audit_officer');
  assert.equal(resolveCanonicalRole('auditor'), 'audit_officer');
  assert.equal(resolveCanonicalRole('compliance_officer'), 'audit_officer');
  assert.equal(resolveCanonicalRole('internal_auditor'), 'audit_officer');
  assert.equal(resolvePortalRole('audit_officer'), 'audit_officer');
  assert.equal(resolvePortalRole('auditor'), 'audit_officer');
});

test('audit_officer page gating: allowed inspection modules and barred mutation modules', () => {
  // Allowed inspection surfaces
  for (const module of ['dashboard', 'audit', 'finance', 'grades', 'exams', 'reports', 'ai', 'announcements', 'events']) {
    assert.equal(canAccessPage('audit_officer', module), true, `should access ${module}`);
  }

  // Barred administrative & operational modules
  for (const module of ['structure', 'staff', 'admissions', 'support', 'hostel', 'students', 'courses']) {
    assert.equal(canAccessPage('audit_officer', module), false, `should NOT access ${module}`);
  }
});

test('audit_officer RBAC: read-only permissions across ledger and grades, zero write privileges', () => {
  const permissions = ROLE_PERMISSIONS['audit_officer'];
  assert.ok(permissions.includes('audit:read'));
  assert.ok(permissions.includes('finance:read'));
  assert.ok(permissions.includes('grades:read'));
  assert.ok(permissions.includes('exams:read'));

  // Zero write/approve permissions
  assert.equal(roleHasPermission('audit_officer', 'grades:write'), false);
  assert.equal(roleHasPermission('audit_officer', 'grades:approve'), false);
  assert.equal(roleHasPermission('audit_officer', 'finance:write'), false);
  assert.equal(roleHasPermission('audit_officer', 'finance:reconcile'), false);
  assert.equal(roleHasPermission('audit_officer', 'students:write'), false);
  assert.equal(roleHasPermission('audit_officer', 'courses:write'), false);
  assert.equal(roleHasPermission('audit_officer', 'hostels:allocate'), false);
});

test('audit_officer login: demo account authenticates and role mismatch is rejected', async () => {
  // Successful demo sign in
  const successRes = await login(
    new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auditor@university.ac.ke',
        password: 'DemoPassword2026!',
        role: 'audit_officer',
      }),
    }) as any
  );
  assert.equal(successRes.status, 200);
  const successData = await successRes.json();
  assert.equal(successData.success, true);
  assert.equal(successData.user.role, 'audit_officer');

  // Role mismatch (auditor trying to claim admin role)
  const mismatchRes = await login(
    new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auditor@university.ac.ke',
        password: 'DemoPassword2026!',
        role: 'admin',
      }),
    }) as any
  );
  assert.equal(mismatchRes.status, 401);

  // Wrong password
  const wrongPassRes = await login(
    new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auditor@university.ac.ke',
        password: 'WrongPassword!',
        role: 'audit_officer',
      }),
    }) as any
  );
  assert.equal(wrongPassRes.status, 401);
});

test('audit_officer API endpoints: access to audit logs and institutional financial summary', async () => {
  // Audit log inspection
  const auditRes = await getAuditLogs(
    authRequest('http://localhost:3000/api/v1/audit', 'audit_officer', 'auditor@university.ac.ke')
  );
  assert.equal(auditRes.status, 200);
  const auditData = await auditRes.json();
  assert.equal(auditData.success, true);

  // Finance summary inspection
  const finRes = await getFinanceSummary(
    authRequest('http://localhost:3000/api/v1/finance/summary', 'audit_officer', 'auditor@university.ac.ke')
  );
  assert.equal(finRes.status, 200);
  const finData = await finRes.json();
  assert.equal(finData.success, true);
  assert.equal(finData.scope, 'institutional');
});
