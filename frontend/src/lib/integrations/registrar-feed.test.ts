import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '@/app/api/v1/integrations/hub/route';
const originalFetch=globalThis.fetch;const originalEnv={...process.env};
afterEach(()=>{globalThis.fetch=originalFetch;for(const key of ['UAMS_FEED_SECRET','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']){if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];}});
test('complete registrar feed exports durable enrollment/grade withdrawals and academic dates without scoped-event leakage',async()=>{
 process.env.UAMS_FEED_SECRET='s'.repeat(40);process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321';process.env.SUPABASE_SERVICE_ROLE_KEY='private-server-key';
 const updated='2026-10-22T00:00:00Z';
 const tables:Record<string,unknown[]>={uams_student_records:[{email:'student@example.edu',first_name:'Test',last_name:'Student',admission_number:'REG001',faculty:'Computing',department:'Computer Science',current_year_of_study:2,campus_code:'MAIN',status:'suspended',updated_at:updated}],uams_grade_records:[{id:'g1',student_email:'student@example.edu',course_code:'C1',course_title:'Course',letter_grade:'A',total_score:80,semester_label:'Semester 2',academic_year:'2026/2027',is_approved:false,updated_at:updated}],campus_events:[{id:'e1',title:'Restricted departmental case',description:'Confidential event body',location:'Private office',scope_type:'department',is_active:true,starts_at:updated,ends_at:'2026-10-22T01:00:00Z',updated_at:updated}],semesters:[{id:'s1',name:'Semester 1',start_date:'2026-09-01',end_date:'2026-12-01',registration_deadline:'2026-10-30',updated_at:updated}]};
 globalThis.fetch=async(input)=>new Response(JSON.stringify(tables[new URL(String(input)).pathname.split('/').at(-1)||'']||[]),{headers:{'Content-Type':'application/json'}});
 const response=await GET(new Request('http://localhost/api/v1/integrations/hub',{headers:{Authorization:`Bearer ${process.env.UAMS_FEED_SECRET}`}}));assert.equal(response.status,200);
 const payload=await response.json();assert.equal(payload.students[0].enrollment_status,'suspended');assert.equal(payload.students[0].enrollment_updated_at,updated);assert.equal(payload.grades[0].is_published,false);assert.equal(payload.grades[0].semester,2);assert.equal(payload.events[0].is_published,false);assert.doesNotMatch(JSON.stringify(payload),/Confidential event body|Private office|Restricted departmental case/);assert.deepEqual(payload.academic_dates.map((d:any)=>d.kind),['term','deadline']);
});
