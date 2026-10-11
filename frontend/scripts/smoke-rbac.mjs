import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'http://localhost:3105');
if (!['localhost','127.0.0.1'].includes(base.hostname)) throw new Error('This demo smoke test only runs against localhost.');
const roles = ['super_admin','admin','registrar','hod','lecturer','finance_officer','student'];
const cookies = new Map();
for (const role of roles) {
  const response = await fetch(new URL('/api/v1/auth/login',base), {
    method:'POST', headers:{'Content-Type':'application/json',Origin:base.origin,'x-forwarded-for':`uams-smoke-${role}`},
    body:JSON.stringify({email:`${role}@university.ac.ke`,password:'DemoPassword2026!',role}),
  });
  assert.equal(response.status,200,`Login: ${role}`);
  assert.equal((await response.json()).user.role,role);
  cookies.set(role,response.headers.getSetCookie().map(cookie=>cookie.split(';')[0]).join('; '));
}
async function request(role,path,method='GET',body) {
  return fetch(new URL(path,base),{method,headers:{Cookie:cookies.get(role),Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
assert.equal((await fetch(new URL('/UAMS_Master_Project_Blueprint.pdf',base))).status,404);
assert.equal((await request('student','/api/v1/courses','POST',{})).status,403);
assert.equal((await request('lecturer','/api/v1/students')).status,403);
assert.equal((await request('admin','/api/v1/finance/bank/reconcile','POST',{})).status,403);
assert.equal((await request('student','/api/v1/audit')).status,403);
const personal=await (await request('student','/api/v1/students?role=super_admin')).json();
assert.equal(personal.data.length,1);
assert.equal(personal.data[0].admission_number,'BIT/2023/8849');
const finances=await (await request('finance_officer','/api/v1/students')).json();
assert.ok(finances.data.every(student=>!('cgpa' in student)));
const submitted=await request('lecturer','/api/v1/grades/enter','POST',{admission_number:'BIT/2023/8849',course_code:'BCS 316',cat_score:25,exam_score:55});
assert.equal(submitted.status,201);
const grade=(await submitted.json()).data;
assert.equal(grade.is_approved,false);
let visible=(await (await request('student','/api/v1/grades/enter')).json()).data;
assert.ok(!visible.some(row=>row.id===grade.id));
assert.equal((await request('lecturer','/api/v1/grades/enter','PATCH',{grade_id:grade.id})).status,403);
assert.equal((await request('registrar','/api/v1/grades/enter','PATCH',{grade_id:grade.id})).status,200);
visible=(await (await request('student','/api/v1/grades/enter')).json()).data;
assert.ok(visible.some(row=>row.id===grade.id));
const logout=await request('student','/api/v1/auth/logout','POST');
assert.equal(logout.status,200);
assert.equal((await request('student','/api/v1/auth/me')).status,401);
console.log('PASS: seven logins, API role boundaries, student isolation, finance projection, grade submission/approval, logout, and removed PDF.');
