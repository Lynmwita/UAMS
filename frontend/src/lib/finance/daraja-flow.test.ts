import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as push } from '../../app/api/v1/finance/mpesa/stkpush/route';
import { POST as callback } from '../../app/api/v1/finance/mpesa/callback/route';
import { GET as status } from '../../app/api/v1/finance/mpesa/status/route';
import { createSignedToken } from '../auth/server-auth';
import { validateSTKPushPayload } from './mpesa';

test('real Daraja request flow stays pending until a verified callback; retries are idempotent',async()=>{
  const saved={...process.env}; const originalFetch=globalThis.fetch;
  const sent: any[]=[];
  try {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    Object.assign(process.env,{MPESA_CONSUMER_KEY:'test-key',MPESA_CONSUMER_SECRET:'test-secret',MPESA_SHORTCODE:'174379',MPESA_PASSKEY:'test-passkey',MPESA_ENVIRONMENT:'sandbox',MPESA_CALLBACK_URL:'https://uams.example/api/v1/finance/mpesa/callback',MPESA_CALLBACK_SECRET:'a'.repeat(40)});
    globalThis.fetch=async(input,init)=>{
      if(String(input).includes('/oauth/'))return Response.json({access_token:'mock-oauth'});
      const payload=JSON.parse(String(init?.body));sent.push(payload);
      if(String(input).includes('/processrequest'))return Response.json({ResponseCode:'0',CheckoutRequestID:'ws_CO_MOCK_FLOW',MerchantRequestID:'MR_MOCK_FLOW'});
      return Response.json({ResponseCode:'0',ResultCode:0});
    };
    const token=createSignedToken({id:'usr-student-01',email:'student@university.ac.ke',role:'student'});
    const headers={Authorization:`Bearer ${token}`,Origin:'http://localhost:3000','Content-Type':'application/json'};
    const result=await push(new Request('http://localhost:3000/api/v1/finance/mpesa/stkpush',{method:'POST',headers,body:JSON.stringify({phoneNumber:'0712345678',amount:500,accountReference:'BIT/2023/8849',transactionDesc:'Fees'})}));
    assert.equal(result.status,200);assert.equal((await result.json()).status,'pending');
    assert.equal(sent[0].PhoneNumber,'254712345678');assert.equal(sent[0].Amount,500);assert.equal(sent[0].AccountReference,'BIT20238849');assert.match(sent[0].CallBackURL,/token=/);
    const statusReq=()=>new Request('http://localhost:3000/api/v1/finance/mpesa/status?checkoutRequestId=ws_CO_MOCK_FLOW',{headers});
    assert.equal((await (await status(statusReq())).json()).status,'pending');
    const payload={Body:{stkCallback:{CheckoutRequestID:'ws_CO_MOCK_FLOW',MerchantRequestID:'MR_MOCK_FLOW',ResultCode:0,CallbackMetadata:{Item:[{Name:'Amount',Value:500},{Name:'PhoneNumber',Value:254712345678},{Name:'MpesaReceiptNumber',Value:'QFLOW12345'}]}}}};
    const cb=(secret='a'.repeat(40))=>new Request('https://uams.example/api/v1/finance/mpesa/callback?token='+secret,{method:'POST',body:JSON.stringify(payload)});
    assert.equal((await callback(cb('wrong'))).status,401);
    payload.Body.stkCallback.CallbackMetadata.Item[0].Value=1;
    assert.equal((await callback(cb())).status,409);
    payload.Body.stkCallback.CallbackMetadata.Item[0].Value=500;
    assert.equal((await callback(cb())).status,200);
    assert.equal((await (await status(statusReq())).json()).status,'settled');
    assert.equal((await callback(cb())).status,200);
    const outsider=createSignedToken({id:'usr-student-other',email:'other@example.com',role:'student'});
    const otherReq=new Request(statusReq().url,{headers:{Authorization:`Bearer ${outsider}`}});
    assert.equal((await status(otherReq)).status,404);
  } finally {
    globalThis.fetch=originalFetch;
    for(const key of Object.keys(process.env)) if(!(key in saved))delete process.env[key];
    Object.assign(process.env,saved);
  }
});

test('payment validation rejects non-numeric, non-finite, fractional amounts and invalid phones',()=>{
  for(const amount of [NaN,Infinity,-5,0,1.5,'500',250001])assert.equal(validateSTKPushPayload({amount,phoneNumber:'0712345678',accountReference:'BIT/2023/8849',transactionDesc:'Fees'} as any).valid,false);
  assert.equal(validateSTKPushPayload({amount:500,phoneNumber:'0254321987',accountReference:'BIT/2023/8849',transactionDesc:'Fees'}).valid,false);
});

test('public demonstration roles cannot initiate live M-Pesa payments',async()=>{
  const previous=process.env.MPESA_ENVIRONMENT;
  try {
    process.env.MPESA_ENVIRONMENT='production';
    const token=createSignedToken({id:'usr-demo-super_admin',email:'super_admin@university.ac.ke',role:'super_admin'});
    const response=await push(new Request('http://localhost:3000/api/v1/finance/mpesa/stkpush',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:'http://localhost:3000'},body:'{}'}));
    assert.equal(response.status,403);
  }finally{if(previous===undefined)delete process.env.MPESA_ENVIRONMENT;else process.env.MPESA_ENVIRONMENT=previous;}
});
