'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';

export default function ResetPasswordPage() {
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setLoading(true);setError('');
    try {
      const params=new URLSearchParams(window.location.hash.slice(1));
      const access_token=params.get('access_token'), refresh_token=params.get('refresh_token');
      if(params.get('type')!=='recovery'||!access_token||!refresh_token)throw new Error('Use the password recovery link sent to your email.');
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if(!url||!key)throw new Error('Password recovery is not configured.');
      const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const session=await client.auth.setSession({access_token,refresh_token});
      if(session.error)throw new Error('This recovery link has expired. Request a new one.');
      const result=await client.auth.updateUser({password});
      if(result.error)throw new Error('Could not update the password. Check the password policy or request a new link.');
      await client.auth.signOut();
      window.history.replaceState(null,'','/reset-password');
      window.location.assign('/login');
    }catch(e){setError(e instanceof Error?e.message:'Password reset failed.');}finally{setLoading(false);}
  }
  return <><Navbar/><main className="max-w-md mx-auto p-8"><h1 className="text-2xl font-bold mb-4">Set a new password</h1><form onSubmit={submit} className="space-y-4"><label htmlFor="password">New password (at least 12 characters)</label><input id="password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="border rounded p-3 w-full"/><button disabled={loading} className="bg-academic-navy-900 text-white p-3 rounded">{loading?'Updating...':'Update password'}</button>{error&&<p role="alert" className="text-rose-700">{error}</p>}</form></main></>;
}
