import {requireServerAuth} from '@/lib/auth/server-auth';
import {institutionalApi} from '@/lib/academic/institutional-api';
import {NextResponse} from 'next/server';
export async function POST(request:Request){const auth=await requireServerAuth(request,['finance_officer','super_admin']);if('errorResponse'in auth)return auth.errorResponse;if(auth.user.id.startsWith('usr-'))return NextResponse.json({success:false,error:'Invoice issuance requires the institutional database.'},{status:503});return institutionalApi(request,auth.user,'finance/invoices');}
