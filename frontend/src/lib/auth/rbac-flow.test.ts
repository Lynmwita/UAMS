import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as login } from '../../app/api/v1/auth/login/route';
import { GET as me } from '../../app/api/v1/auth/me/route';
import { POST as logout } from '../../app/api/v1/auth/logout/route';
import * as students from '../../app/api/v1/students/route';
import * as courses from '../../app/api/v1/courses/route';
import * as schools from '../../app/api/v1/schools/route';
import * as grades from '../../app/api/v1/grades/enter/route';
import * as bank from '../../app/api/v1/finance/bank/reconcile/route';
import * as audit from '../../app/api/v1/audit/route';
import * as attendance from '../../app/api/v1/attendance/route';
import * as library from '../../app/api/v1/library/route';
import { POST as stk } from '../../app/api/v1/finance/mpesa/stkpush/route';
import { USER_ROLES, canAccessPage } from './roles';
import { createSignedToken, verifySignedToken } from './server-auth';
import type { UserRole } from '@/types';

function request(role:UserRole,method='GET',body?:unknown,url='http://localhost:3000/api/v1/test') {
  const token=createSignedToken({id:role==='student'?'usr-student-01':`usr-demo-${role}`,email:`${role}@university.ac.ke`,role});
  return new Request(url,{method,headers:{Authorization:`Bearer ${token}`,Origin:'http://localhost:3000','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}) as any;
}

test('all seven roles obey the API authorization matrix',async()=>{
  const cases:[string,(r:any)=>Promise<Response>,string[]][]=[
    ['student records',students.GET,['super_admin','admin','registrar','hod','finance_officer','student']],
    ['course catalogue',courses.GET,['super_admin','admin','registrar','hod','lecturer','student']],
    ['structure',schools.GET,['super_admin','admin','registrar']],
    ['grades',grades.GET,['super_admin','admin','registrar','hod','lecturer','student']],
    ['bank records',bank.GET,['super_admin','admin','finance_officer']],
    ['audit',audit.GET,['super_admin','admin']],
    ['attendance',attendance.GET,['super_admin','admin','hod','lecturer','student']],
  ];
  for(const role of USER_ROLES) for(const [name,handler,allowed] of cases) {
    const res=await handler(request(role));
    assert.equal(res.status,allowed.includes(role)?200:403,`${role}: ${name}`);
  }
  for(const role of USER_ROLES){
    for(const [name,handler,allowed] of [
      ['create student',students.POST,['super_admin','admin','registrar']],
      ['create course',courses.POST,['super_admin','admin','registrar']],
      ['enter marks',grades.POST,['super_admin','lecturer']],
      ['approve marks',grades.PATCH,['super_admin','admin','registrar','hod']],
      ['reconcile bank',bank.POST,['super_admin','finance_officer']],
      ['take attendance',attendance.POST,['super_admin','lecturer']],
    ] as [string,(r:any)=>Promise<Response>,string[]][]){
      const res=await handler(request(role,name==='approve marks'?'PATCH':'POST',name==='take attendance'?{course:'BCS 311',roster:[]}:{}));
      assert.equal(res.status===403,!allowed.includes(role),`${role}: ${name}`);
    }
  }
});

test('login derives the role from credentials, rejects mismatches, and keeps token in cookies',async()=>{
  for(const [index,role] of USER_ROLES.entries()){
    const req=new Request('http://localhost:3000/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':`test-role-${index}`},body:JSON.stringify({email:`${role}@university.ac.ke`,password:'DemoPassword2026!',role})});
    const res=await login(req);assert.equal(res.status,200);
    const body=await res.json();assert.equal(body.user.role,role);assert.equal(body.token,undefined);
    assert.match(res.headers.get('set-cookie')||'',/HttpOnly/);
    const cookie=res.cookies.get('uams_auth_token')!.value;
    const session=await me(new Request('http://localhost:3000/api/v1/auth/me',{headers:{Cookie:`uams_auth_token=${cookie}`}}) as any);
    assert.equal((await session.json()).user.role,role);
  }
  const mismatch=await login(new Request('http://localhost:3000/api/v1/auth/login',{method:'POST',body:JSON.stringify({email:'student@university.ac.ke',password:'DemoPassword2026!',role:'super_admin'})}));
  assert.equal(mismatch.status,401);
});

test('students see only their own approved grades and cannot elevate via query parameters',async()=>{
  const res=await grades.GET(request('student','GET',undefined,'http://localhost:3000/api/v1/grades/enter?role=super_admin&student_id=stu-2'));
  const d=await res.json();assert.ok(d.data.every((g:any)=>g.admission_number==='BIT/2023/8849'&&g.is_approved));
  assert.equal(canAccessPage('student','students'),false);
  assert.equal(canAccessPage('lecturer','finance'),false);
  const hod=await students.GET(request('hod'));assert.ok((await hod.json()).data.every((s:any)=>s.admission_number.startsWith('BCS/')));
  const finance=await students.GET(request('finance_officer'));assert.ok((await finance.json()).data.every((s:any)=>!('cgpa' in s)&&!('program_name' in s)));
});

test('lecturers cannot enter marks for unassigned courses and cannot approve grades',async()=>{
  const unassigned=await grades.POST(request('lecturer','POST',{student_id:'stu-1',course_code:'BIT 312',cat_score:20,exam_score:50}));
  assert.equal(unassigned.status,403);
  const approved=await grades.PATCH(request('lecturer','PATCH',{grade_id:'grd-1'}));assert.equal(approved.status,403);
  const outsider=await grades.PATCH(request('hod','PATCH',{grade_id:'grd-2'}));assert.equal(outsider.status,404);
});

test('logout revokes the demo access cookie and refresh family',async()=>{
  const token=createSignedToken({id:'usr-logout',email:'student@university.ac.ke',role:'student'});
  const res=await logout(new Request('http://localhost:3000/api/v1/auth/logout',{method:'POST',headers:{Origin:'http://localhost:3000',Cookie:`uams_auth_token=${token}`}}));
  assert.equal(res.status,200);assert.equal(verifySignedToken(token),null);
});

test('library isolation and repeated returns never add extra copies',async()=>{
  const lecturer=await library.GET(request('lecturer'));assert.equal((await lecturer.json()).data.loans.length,0);
  const returnReq=()=>request('student','POST',{action:'return',loan_id:'ln-01'});
  await library.POST(returnReq());
  const before=(await (await library.GET(request('student'))).json()).data.books[0].available_copies;
  await library.POST(returnReq());
  const after=(await (await library.GET(request('student'))).json()).data.books[0].available_copies;
  assert.equal(before,after);
});

test('STK requires authentication, forbids unrelated roles and other student accounts',async()=>{
  const unauth=await stk(new Request('http://localhost:3000/api/v1/finance/mpesa/stkpush',{method:'POST',body:'{}'}));assert.equal(unauth.status,401);
  const body={phoneNumber:'0712345678',amount:100,accountReference:'BCS/2023/1204',transactionDesc:'Fees'};
  const lecturer=await stk(request('lecturer','POST',body));assert.equal(lecturer.status,403);
  const other=await stk(request('student','POST',body));assert.equal(other.status,403);
});
