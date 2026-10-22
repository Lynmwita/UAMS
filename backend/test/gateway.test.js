const test=require('node:test');
const assert=require('node:assert/strict');
const {createGateway}=require('../src/gateway');
async function withGateway(fetchImpl,work){
 const app=createGateway({upstreamOrigin:'https://canonical.example.edu',allowedOrigins:['https://portal.example.edu'],fetchImpl});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{await work('http://127.0.0.1:'+server.address().port);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('gateway delegates credentials and actual statuses to the canonical API',async()=>{
 await withGateway(async(url,options)=>{
  assert.equal(String(url),'https://canonical.example.edu/api/v1/students');
  assert.equal(options.headers.authorization,'Bearer opaque-real-token');
  assert.equal(options.headers['x-forwarded-host'],'portal.example.edu');
  assert.equal(options.redirect,'manual');
  return Response.json({success:false,error:'Role denied'},{status:403});
 },async(url)=>{
  const response=await fetch(url+'/api/v1/students',{headers:{Authorization:'Bearer opaque-real-token',Origin:'https://portal.example.edu','x-forwarded-host':'evil.example'}});
  assert.equal(response.status,403);assert.equal((await response.json()).error,'Role denied');
 });
});
test('gateway blocks unknown browser origins before contacting services',async()=>{
 let called=false;await withGateway(async()=>{called=true;return Response.json({});},async(url)=>{
  assert.equal((await fetch(url+'/api/v1/students',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal(called,false);
 });
});
test('gateway outages report 503 and never return successful fake records',async()=>{
 await withGateway(async()=>{throw new Error('offline');},async(url)=>{
  const response=await fetch(url+'/api/v1/students');assert.equal(response.status,503);
  assert.equal((await response.json()).success,false);
 });
});
test('gateway preserves binary transcript and session-cookie responses',async()=>{
 await withGateway(async()=>new Response('%PDF-test',{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Transcript.pdf"','Set-Cookie':'uams_auth_token=session; HttpOnly; Secure'}}),async(url)=>{
  const response=await fetch(url+'/api/v1/results/transcript/me');assert.equal(await response.text(),'%PDF-test');
  assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('content-disposition'),/Transcript.pdf/);
 });
});
