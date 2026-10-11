import { NextResponse } from 'next/server';
import { authClient } from '@/lib/supabase/server';
import { validateCsrf } from '@/lib/auth/csrf';
import { checkRateLimit } from '@/lib/auth/rate-limiter';

export async function POST(request:Request) {
  if (!validateCsrf(request).valid) return NextResponse.json({success:false,error:'Invalid request origin.'},{status:403});
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  if(!checkRateLimit(`recovery:${ip}`,3,300).allowed)return NextResponse.json({success:false,error:'Please wait before requesting another recovery email.'},{status:429});
  try {
    const body=await request.json();
    if(typeof body?.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||body.email.length>254)return NextResponse.json({success:false,error:'Valid email required.'},{status:400});
    const redirectTo=new URL('/reset-password',process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin).toString();
    const {error}=await authClient().auth.resetPasswordForEmail(body.email.trim(),{redirectTo});
    if(error)return NextResponse.json({success:false,error:'Password recovery is unavailable. Contact institutional support.'},{status:503});
    return NextResponse.json({success:true,message:'If the account exists, recovery instructions will be sent.'});
  }catch{return NextResponse.json({success:false,error:'Password recovery is unavailable. Contact institutional support.'},{status:503});}
}
