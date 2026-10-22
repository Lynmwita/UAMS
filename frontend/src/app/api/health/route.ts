import {NextResponse} from 'next/server';
import {institutionalDatabase} from '@/lib/academic/institutional';
export async function GET(){
 try{
  const {error}=await institutionalDatabase().from('uams_student_records').select('id').limit(0);
  if(error)throw new Error('Database is not ready');
  return NextResponse.json({status:'ok',service:'uams-api',database:'ready'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'degraded',service:'uams-api',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
