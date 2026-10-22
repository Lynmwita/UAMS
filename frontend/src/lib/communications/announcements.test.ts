import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST, PATCH } from '@/app/api/v1/announcements/route';
import { GET as feed } from '@/app/api/v1/integrations/hub/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { parseNotice, toHubAnnouncement, type Notice } from './announcements';

const originalFetch = globalThis.fetch;
const originalEnv = { url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,secret:process.env.UAMS_FEED_SECRET };
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key,value] of Object.entries({NEXT_PUBLIC_SUPABASE_URL:originalEnv.url,SUPABASE_SERVICE_ROLE_KEY:originalEnv.key,UAMS_FEED_SECRET:originalEnv.secret})) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function request(role: 'student'|'registrar', method='GET', body?: unknown, demo=false) {
  const token = createSignedToken({id:demo?'usr-test-notices':'00000000-0000-0000-0000-000000000101',email:`${role}@example.edu`,role});
  return new Request('http://localhost:3000/api/v1/announcements',{method, headers:{Authorization:`Bearer ${token}`,Origin:'http://localhost:3000','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
const input = {title:'Exam timetable',body:'Check your exam dates.',audience:'Students',priority:'Important',category:'Academic'};
const row = {id:'00000000-0000-0000-0000-000000000201',title:input.title,content:input.body,target_audience:'students',
  category:'Academic',priority:'Important',author_email:'registrar@example.edu',is_published:true,expires_at:null,
  created_at:'2026-10-21T08:00:00Z',updated_at:'2026-10-21T08:00:00Z'};
function mockDatabase(response: unknown, status=200) {
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-only-key';
  const requests: {url:string;method:string;body:unknown}[]=[];
  globalThis.fetch=async (url,init) => {
    requests.push({url:String(url),method:init?.method||'GET',body:init?.body?JSON.parse(String(init.body)):undefined});
    return new Response(JSON.stringify(response),{status,headers:{'Content-Type':'application/json'}});
  };
  return requests;
}

test('institutional publication persists through Supabase and attributes the authenticated author',async()=>{
  const requests=mockDatabase(row);
  const response=await POST(request('registrar','POST',{...input,author:'forged@example.edu'}));
  assert.equal(response.status,201);
  assert.equal(requests.length,1);
  assert.match(requests[0].url,/\/rest\/v1\/announcements/);
  assert.equal((requests[0].body as typeof row).author_email,'registrar@example.edu');
  assert.equal((requests[0].body as typeof row).content,input.body);
  assert.equal((await response.json()).data.id,row.id);
});

test('institutional reads use the database and hide staff-only, withdrawn and expired notices',async()=>{
  mockDatabase([row,{...row,id:'staff',target_audience:'lecturers'}, {...row,id:'draft',is_published:false},
    {...row,id:'expired',expires_at:'2020-01-01T00:00:00Z'}]);
  const response=await GET(request('student'));
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).data.map((n:Notice)=>n.id),[row.id]);
});

test('database failure is a 503, with no successful in-memory fallback',async()=>{
  mockDatabase({message:'database unavailable'},503);
  assert.equal((await POST(request('registrar','POST',input))).status,503);
  assert.equal((await GET(request('student'))).status,503);
});

test('demo publication does not touch the institutional database',async()=>{
  const requests=mockDatabase(row);
  assert.equal((await POST(request('registrar','POST',input,true))).status,201);
  assert.equal(requests.length,0);
});

test('publishing rejects unauthorized roles and malformed notice fields',async()=>{
  assert.equal((await POST(request('student','POST',input))).status,403);
  for(const invalid of [null,[],{...input,priority:'P0'},{...input,title:' '},{...input,is_published:'false'},{...input,expires_at:'invalid'}]) {
    assert.equal(parseNotice(invalid),null);
    assert.equal((await POST(request('registrar','POST',invalid))).status,400);
  }
});

test('institutional updates address the same source record',async()=>{
  const requests=mockDatabase({...row,is_published:false});
  assert.equal((await PATCH(request('registrar','PATCH',{...input,id:row.id,is_published:false}))).status,200);
  assert.equal(requests[0].method,'PATCH');
  assert.match(requests[0].url,new RegExp('id=eq\\.'+row.id));
});

test('export feed requires its dedicated secret, reads durable records and redacts staff-only content',async()=>{
  process.env.UAMS_FEED_SECRET='test-feed-secret-that-is-at-least-32-characters';
  const requests=mockDatabase([row,{...row,id:'staff',target_audience:'lecturers',content:'Staff confidential text'},
    {...row,id:'legacy-urgent',priority:'Normal',is_urgent:true}]);
  const noticeFetch=globalThis.fetch;
  globalThis.fetch=async(url,init)=>String(url).includes('/announcements')?noticeFetch(url,init):new Response('[]',{headers:{'Content-Type':'application/json'}});
  assert.equal((await feed(new Request('http://localhost:3000/api/v1/integrations/hub'))).status,401);
  const response=await feed(new Request('http://localhost:3000/api/v1/integrations/hub',{
    headers:{Authorization:`Bearer ${process.env.UAMS_FEED_SECRET}`},
  }));
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.version,1);
  assert.equal(payload.announcements[0].priority,'P2');
  assert.equal(payload.announcements[1].is_published,false);
  assert.equal(payload.announcements[2].priority,'P1');
  assert.doesNotMatch(JSON.stringify(payload),/Staff confidential text/);
  assert.equal(requests.length,1);
});

test('normal campus-life notices map to P3 and keep stable timestamps',()=>{
  const notice={...row,body:row.content,audience:'Students',author:'registrar',date:'Oct 21',priority:'Normal',category:'Campus Life'} as Notice;
  assert.equal(toHubAnnouncement(notice).priority,'P3');
  assert.equal(toHubAnnouncement(notice).updated_at,row.updated_at);
});
