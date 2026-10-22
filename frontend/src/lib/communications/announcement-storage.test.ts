import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('institutional announcement migration persists versions and denies direct browser access', { timeout: 120000 }, async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    const root = new URL('../../../../', import.meta.url);
    const schema = await readFile(new URL('database/01_schema_init.sql', root), 'utf8');
    await db.exec('create table schools(id uuid primary key); create table departments(id uuid primary key); create table programs(id uuid primary key); create table users(id uuid primary key);');
    await db.exec(schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS announcements ('), schema.indexOf('-- 12. IMMUTABLE')));
    await db.exec(await readFile(new URL('supabase/migrations/20261021211540_persistent_announcements.sql', root), 'utf8'));
    await db.exec("set role service_role; insert into announcements(title,content,target_audience,author_email) values ('Exam dates','Check dates','students','registrar@example.test'); reset role;");
    const original = (await db.query<{ created_at: Date; updated_at: Date }>('select created_at,updated_at from announcements')).rows[0];
    await db.exec("set role service_role; update announcements set title='Revised exam dates', created_at='2000-01-01', updated_at='2000-01-01'; reset role;");
    const updated = (await db.query<{ created_at: Date; updated_at: Date }>('select created_at,updated_at from announcements')).rows[0];
    assert.deepEqual(updated.created_at, original.created_at);
    assert.ok(new Date(updated.updated_at).getTime() >= new Date(original.updated_at).getTime());
    await db.exec('set role authenticated;');
    await assert.rejects(db.query('select * from announcements'), /permission denied/);
    await assert.rejects(db.query("insert into announcements(title,content) values ('forged','text')"), /permission denied/);
    await db.exec('reset role;');
  } finally {
    await db.close();
  }
});
