import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSupportBatch,integrationAuthorization} from './support';
const record={source_id:'ticket-1',kind:'ticket',student_email:'student@example.edu',title:'Timetable clash',body:'Two required classes overlap.',status:'submitted',occurred_at:'2026-10-22T08:00:00Z',updated_at:'2026-10-22T08:00:00Z'};
const batch={version:1,university_id:'00000000-0000-0000-0000-000000000001',records:[record]};
test('support imports validate identity, timestamps, sensitivity and duplicate source IDs',()=>{
 assert.ok(parseSupportBatch(batch));
 for(const invalid of [null,[],{...batch,university_id:'other'},{...batch,records:[record,record]},
  {...batch,records:[{...record,student_email:'invalid'}]},{...batch,records:[{...record,is_sensitive:'false'}]},
  {...batch,records:[{...record,updated_at:'yesterday'}]}])assert.equal(parseSupportBatch(invalid),null);
});
test('integration credentials must be explicitly configured and match exactly',()=>{
 const original=process.env.HUB_SYNC_API_KEY;
 try{
  delete process.env.HUB_SYNC_API_KEY;assert.equal(integrationAuthorization(new Request('http://localhost')),503);
  process.env.HUB_SYNC_API_KEY='a-secure-server-feed-secret-over-32-characters';
  assert.equal(integrationAuthorization(new Request('http://localhost')),401);
  assert.equal(integrationAuthorization(new Request('http://localhost',{headers:{Authorization:`Bearer ${process.env.HUB_SYNC_API_KEY}`}})),200);
 }finally{if(original===undefined)delete process.env.HUB_SYNC_API_KEY;else process.env.HUB_SYNC_API_KEY=original;}
});
