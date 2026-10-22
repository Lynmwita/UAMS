import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import type {User} from '@supabase/supabase-js';
import {activeInstitutionalUser} from './server';
const originalFetch=globalThis.fetch,originalUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
afterEach(()=>{globalThis.fetch=originalFetch;if(originalUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=originalUrl;if(originalKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=originalKey;});
const user={id:'00000000-0000-0000-0000-000000000101',email:'student@example.edu',app_metadata:{role:'student'},user_metadata:{role:'super_admin'}} as unknown as User;
function database(row:unknown){process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321';process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';globalThis.fetch=async()=>new Response(JSON.stringify(row),{headers:{'Content-Type':'application/json'}});}
test('real institutional identities map to active canonical actors and ignore editable role metadata',async()=>{
 database({id:'canonical-user',email:'STUDENT@example.edu',is_active:true,roles:{code:'student'}});
 const actor=await activeInstitutionalUser(user);assert.equal(actor?.id,'canonical-user');assert.equal(actor?.email,'student@example.edu');assert.equal(actor?.role,'student');
 database({id:'canonical-user',email:'student@example.edu',is_active:false,roles:{code:'student'}});assert.equal(await activeInstitutionalUser(user),null);
 database({id:'canonical-user',email:'student@example.edu',is_active:true,roles:{code:'admin'}});assert.equal(await activeInstitutionalUser(user),null);
});
