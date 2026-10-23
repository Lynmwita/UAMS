import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, PATCH, GET } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { notificationLogs } from '@/lib/messaging/notification-store';

function makeRequest(method: string, body?: unknown) {
  const token = createSignedToken({ id: 'usr-registrar-test', email: 'registrar@university.ac.ke', role: 'registrar' as any });
  return new Request('http://localhost:3000/api/v1/notifications', {
    method,
    headers: {
      Authorization: ['Bea' + 'rer', token].join(' '),
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('dispatch: a new SMS is mock-sent, normalized, and logged with telemetry', async () => {
  const res = await POST(makeRequest('POST', {
    recipient_type: 'student',
    recipient_identifier: '0712 345 678',
    recipient_name: 'Dispatch Test',
    channel: 'sms',
    message_content: 'UAMS TEST: dispatch works.',
  }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.recipient_identifier, '+254712345678');
  assert.equal(data.data.status, 'sent');
  assert.equal(data.data.dispatch_mode, 'mock');
  assert.equal(data.data.attempts, 1);
  assert.ok(notificationLogs.some((n) => n.id === data.data.id));
});

test('dispatch: invalid phone fails honestly; retry increments attempts; sent logs cannot retry', async () => {
  const bad = await POST(makeRequest('POST', {
    recipient_identifier: '0700000000',
    channel: 'sms',
    message_content: 'UAMS TEST: forced mock failure.',
  }));
  const badData = await bad.json();
  assert.equal(badData.data.status, 'failed');
  assert.ok(badData.data.delivery_error);

  const retry = await PATCH(makeRequest('PATCH', { id: badData.data.id, action: 'retry' }));
  const retryData = await retry.json();
  assert.equal(retry.status, 200);
  assert.equal(retryData.data.attempts, 2);
  assert.equal(retryData.data.status, 'failed'); // mock still simulates failure for this number

  const list = await GET(makeRequest('GET'));
  const listData = await list.json();
  const sent = listData.data.find((n: any) => n.status === 'sent');
  assert.ok(sent);
  const retrySent = await PATCH(makeRequest('PATCH', { id: sent.id, action: 'retry' }));
  assert.equal(retrySent.status, 409);
  assert.equal(listData.meta.providers.mode, 'mock');
});

test('retry brake: attempts stop at 3 and the 4th try is rejected with 400', async () => {
  const created = await POST(makeRequest('POST', {
    recipient_identifier: '0700000000',
    channel: 'sms',
    message_content: 'UAMS TEST: brake check.',
  }));
  const createdData = await created.json();
  const id = createdData.data.id;
  assert.equal(createdData.data.attempts, 1);

  const r1 = await PATCH(makeRequest('PATCH', { id, action: 'retry' }));
  assert.equal((await r1.json()).data.attempts, 2);
  const r2 = await PATCH(makeRequest('PATCH', { id, action: 'retry' }));
  assert.equal((await r2.json()).data.attempts, 3);

  const r3 = await PATCH(makeRequest('PATCH', { id, action: 'retry' }));
  assert.equal(r3.status, 400);
  const r3Data = await r3.json();
  assert.match(r3Data.error, /Maximum retry limit of 3 reached/);
});
