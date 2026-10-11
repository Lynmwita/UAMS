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
