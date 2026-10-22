import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { updateInstitutionalStudent } from './student-update';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const actor = { id: '00000000-0000-4000-8000-000000000001', email: 'registrar@example.test', role: 'registrar' as const, iat: 0, exp: 9999999999 };
const student = { id: 'student-id', admission_number: 'SMU/2026/1', first_name: 'Student', last_name: 'One', email: 'student@example.test', faculty: 'Computing', department: 'Science', program_name: 'Specific Degree', fee_balance: 0 };
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});
function setup() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-server-test-key';
  const writes: Record<string, any>[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).includes('/rpc/uams_workflow')) {
      writes.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(student), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify([student]), { headers: { 'Content-Type': 'application/json' } });
  };
  return writes;
}
function request(body: unknown) {
  return new Request('http://localhost/api/v1/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
test('registrar PATCH maps existing name/year/status fields into the durable student workflow', async () => {
  const writes = setup();
  const response = await updateInstitutionalStudent(request({ id: student.id, admission_number: student.admission_number, full_name: 'Updated Student', year_of_study: 3, status: 'suspended' }), actor);
  assert.equal(response.status, 200);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], { p_operation: 'student.update', p_payload: { student_id: student.id, first_name: 'Updated', last_name: 'Student', status: 'suspended', current_year_of_study: 3 }, p_actor_id: actor.id, p_actor_role: actor.role });
});
test('registrar PATCH rejects immutable identity, program transfer and balance changes before writing', async () => {
  const writes = setup();
  for (const change of [{ admission_number: 'CHANGED' }, { email: 'different@example.test' }, { program_name: 'Different Degree' }, { fee_balance: 100 }]) {
    const response = await updateInstitutionalStudent(request({ id: student.id, ...change }), actor);
    assert.ok([400, 409].includes(response.status));
  }
  assert.equal(writes.length, 0);
});
