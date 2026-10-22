import {NextResponse} from 'next/server';
import {institutionalDatabase} from '@/lib/academic/institutional';
import {integrationAuthorization,parseSupportBatch,staffUpdates,uuidPattern} from '@/lib/integrations/support';

export async function POST(request:Request){
 const authorization=integrationAuthorization(request);if(authorization!==200)return NextResponse.json({success:false,error:authorization===401?'Unauthorized':'Support integration is not configured.'},{status:authorization});
 if(Number(request.headers.get('content-length')||0)>1500000)return NextResponse.json({success:false,error:'Batch too large.'},{status:413});
 let body:unknown;
 try{
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(!reader)throw new Error('Missing body');
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000){await reader.cancel();return NextResponse.json({success:false,error:'Batch too large.'},{status:413});}chunks.push(value);}
  body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }catch{return NextResponse.json({success:false,error:'Invalid JSON.'},{status:400});}
 const batch=parseSupportBatch(body);if(!batch)return NextResponse.json({success:false,error:'Invalid support batch.'},{status:400});
 const expected=process.env.HUB_UNIVERSITY_ID;
 if(!expected||!uuidPattern.test(expected))return NextResponse.json({success:false,error:'The support university is not configured.'},{status:503});
 if(batch.university_id!==expected)return NextResponse.json({success:false,error:'University does not match this integration.'},{status:403});
 try{
  const {data,error}=await institutionalDatabase().rpc('receive_hub_support',{p_university_id:expected,p_records:batch.records});
  if(error||!data)throw new Error('Import unacknowledged');
  const updates=await staffUpdates(expected);
  return NextResponse.json({success:true,...data,updates},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({success:false,error:'Support import was not acknowledged. Retry the same source records.'},{status:503});}
}
export async function GET(request:Request){
 const authorization=integrationAuthorization(request);if(authorization!==200)return NextResponse.json({success:false,error:'Support integration authorization failed.'},{status:authorization});
 const university=new URL(request.url).searchParams.get('university_id');
 if(!process.env.HUB_UNIVERSITY_ID)return NextResponse.json({success:false,error:'The support university is not configured.'},{status:503});
 if(!university||university!==process.env.HUB_UNIVERSITY_ID)return NextResponse.json({success:false,error:'University mismatch.'},{status:403});
 try{return NextResponse.json({success:true,updates:await staffUpdates(university)},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({success:false,error:'Staff outcomes could not be read.'},{status:503});}
}
