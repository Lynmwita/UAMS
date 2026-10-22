import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET} from './[student_id]/route';
import {createSignedToken} from '@/lib/auth/server-auth';
function request(role:'student'|'registrar'|'lecturer'){
 const token=createSignedToken({id:role==='student'?'usr-student-01':`usr-demo-${role}`,role,email:`${role}@university.ac.ke`});
 return new NextRequest('http://localhost/api/v1/results/transcript/me',{headers:{Authorization:`Bearer ${token}`}});
}
test('self transcript returns a PDF and denies other students and unprivileged staff',async()=>{
 const response=await GET(request('student'),{params:Promise.resolve({student_id:'me'})});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/application\/pdf/);
 assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 assert.equal((await GET(request('student'),{params:Promise.resolve({student_id:'stu-2'})})).status,403);
 assert.equal((await GET(request('lecturer'),{params:Promise.resolve({student_id:'stu-1'})})).status,403);
 assert.equal((await GET(request('registrar'),{params:Promise.resolve({student_id:'me'})})).status,400);
});
