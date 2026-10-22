import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
const tenant='00000000-0000-0000-0000-000000000001';
const record={source_id:'ticket-1',kind:'ticket',student_email:'student@example.edu',title:'Class overlap',body:'Two classes overlap.',status:'submitted',is_sensitive:false,occurred_at:'2026-10-22T08:00:00Z',updated_at:'2026-10-22T08:00:00Z',metadata:{}};
test('support records persist source identity and staff history through source retries and stale edits',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(await readFile(join(process.cwd(),'../supabase/migrations/20261021214516_hub_support_inbox.sql'),'utf8'));
  const ingest=async(records:unknown[])=> (await db.query<{result:{accepted:number;inserted:number;updated:number;unchanged:number}}>('select receive_hub_support($1::uuid,$2::jsonb) result',[tenant,JSON.stringify(records)])).rows[0].result;
  assert.equal((await ingest([record])).inserted,1);
  const id=(await db.query<{id:string}>('select id from hub_support_records')).rows[0].id;
  await db.query("update hub_support_records set staff_status='resolved',staff_note='Clash corrected',reviewed_by='registrar@example.edu',reviewed_at=now() where id=$1",[id]);
  assert.equal((await ingest([record])).unchanged,1);
  await ingest([{...record,title:'Updated request',updated_at:'2026-10-22T09:00:00Z'}]);
  const rows=(await db.query<{id:string;staff_status:string;staff_note:string}>('select id,staff_status,staff_note from hub_support_records')).rows;
  assert.deepEqual(rows,[{id,staff_status:'resolved',staff_note:'Clash corrected'}]);
  assert.equal((await db.query('select * from hub_support_history')).rows.length,1);
  await assert.rejects(ingest([{...record,source_id:'good'}, {...record,source_id:'invalid',kind:'unknown'}]));
  assert.equal((await db.query('select * from hub_support_records')).rows.length,1);
  await db.exec('set role authenticated;');await assert.rejects(db.query('select * from hub_support_records'),/permission denied/);
 }finally{await db.close();}
});
