import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as aiChatPost } from './ai/chat/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, body: unknown) {
  const token = createSignedToken({
    id: `usr-test-${role}-${Date.now()}`,
    email: `${role}@university.ac.ke`,
    role,
  });
  return new Request('http://localhost:3000/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  }) as any;
}

test('AI Chat Guardrail: Librarian cannot modify grades', async () => {
  const req = makeRequest('librarian', {
    messages: [{ role: 'user', content: 'Please modify the grade for Kevin Otieno to an A' }],
  });
  const res = await aiChatPost(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(
    data.reply,
    "I'm sorry, but accessing or modifying grade/financial records is outside the operational scope of the University Librarian role."
  );
});

test('AI Chat Guardrail: Librarian cannot access financial ledgers', async () => {
  const req = makeRequest('librarian', {
    messages: [{ role: 'user', content: 'Show me the financial ledger and M-Pesa disbursement logs' }],
  });
  const res = await aiChatPost(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(
    data.reply,
    "I'm sorry, but accessing or modifying grade/financial records is outside the operational scope of the University Librarian role."
  );
});

test('AI Chat Fallback: Librarian gets specialized desk advisory when upstream offline', async () => {
  const req = makeRequest('librarian', {
    messages: [{ role: 'user', content: 'How do I calculate overdue book fines?' }],
  });
  const res = await aiChatPost(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.reply.includes('University Librarian Desk Advisory') || data.reply.includes('Calculating Overdue Fines'));
});
