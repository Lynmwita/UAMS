import { createClient, type User } from '@supabase/supabase-js';
import { isUserRole } from '@/lib/auth/roles';

export function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-') || key.includes('your-')) throw new Error('Institutional authentication is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function trustedUser(user: User) {
  const role = user.app_metadata?.role;
  if (!user.email || !isUserRole(role) || user.app_metadata?.disabled === true) return null;
  return { id: user.id, email: user.email, role, exp: Number.MAX_SAFE_INTEGER, iat: 0 };
}

export async function activeInstitutionalUser(user: User) {
  const trusted = trustedUser(user);
  if (!trusted) return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Institutional account verification is not configured.');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id))return null;
  const {data,error}=await db.from('users').select('id,email,is_active,roles!inner(code)').or(`id.eq.${user.id},auth_user_id.eq.${user.id}`).maybeSingle();
  if(error)throw new Error('Institutional account verification failed.');
  const role=(data?.roles as unknown as {code?:string}|null)?.code;
  return data?.is_active===true&&role===trusted.role&&typeof data.email==='string'?{...trusted,id:data.id,email:data.email.toLowerCase()}:null;
}
