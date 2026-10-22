import { timingSafeEqual } from 'node:crypto';
import { institutionalDatabase } from '@/lib/academic/institutional';

export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type SupportKind='ticket'|'feedback'|'attendance';
export type SupportRecord={source_id:string;kind:SupportKind;student_email:string;registration_number?:string;title:string;body:string;status:string;is_sensitive:boolean;category?:string;occurred_at:string;updated_at:string;metadata:Record<string,unknown>};
export type SupportRow=Omit<SupportRecord,'updated_at'>&{id:string;university_id:string;source_updated_at:string;staff_status:string;staff_note:string;reviewed_at:string|null;reviewed_by:string|null};
export function integrationAuthorization(request:Request) {
 const secret=process.env.HUB_SYNC_API_KEY;
 if(!secret||secret.length<32) return 503;
 const supplied=request.headers.get('authorization')||'',expected=`Bearer ${secret}`;
 return Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))?200:401;
}
function text(value:unknown,max:number,min=1):value is string{return typeof value==='string'&&value.trim().length>=min&&value.length<=max;}
function timestamp(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&/(Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));}
export function parseSupportBatch(value:unknown):{university_id:string;records:SupportRecord[]}|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const batch=value as Record<string,unknown>;
 if(batch.version!==1||!text(batch.university_id,36)||!uuidPattern.test(batch.university_id)||!Array.isArray(batch.records)||batch.records.length>100)return null;
 const records:SupportRecord[]=[];const ids=new Set<string>();
 for(const item of batch.records){
  if(!item||typeof item!=='object'||Array.isArray(item))return null;
  const row=item as Record<string,unknown>;
  if(!text(row.source_id,200)||!['ticket','feedback','attendance'].includes(String(row.kind))||!text(row.student_email,254)||!/^\S+@\S+\.\S+$/.test(row.student_email)||!text(row.title,200)||!text(row.body,10000)||!text(row.status,50)||!timestamp(row.occurred_at)||!timestamp(row.updated_at)||(row.is_sensitive!==undefined&&typeof row.is_sensitive!=='boolean')||(row.registration_number!==undefined&&!text(row.registration_number,100))||(row.category!==undefined&&!text(row.category,100)))return null;
  const identity=`${row.kind}:${row.source_id}`;if(ids.has(identity))return null;ids.add(identity);
  const metadata=row.metadata??{};
  if(typeof metadata!=='object'||!metadata||Array.isArray(metadata)||JSON.stringify(metadata).length>10000)return null;
  records.push({source_id:row.source_id,kind:row.kind as SupportKind,student_email:row.student_email.trim().toLowerCase(),registration_number:row.registration_number as string|undefined,
   title:row.title.trim(),body:row.body.trim(),status:row.status,is_sensitive:row.is_sensitive===true,category:row.category as string|undefined,occurred_at:row.occurred_at,updated_at:row.updated_at,metadata:metadata as Record<string,unknown>});
 }
 return {university_id:batch.university_id,records};
}
export async function staffUpdates(universityId:string){
 const db=institutionalDatabase(),updates:{source_id:string;kind:string;status:string;staff_note:string;reviewed_at:string}[]=[];
 for(let start=0;;start+=500){
  const {data,error}=await db.from('hub_support_records').select('id,source_id,kind,staff_status,staff_note,reviewed_at').eq('university_id',universityId).not('reviewed_at','is',null).order('reviewed_at',{ascending:true}).order('id',{ascending:true}).range(start,start+499);
  if(error||!data)throw new Error('Support outcomes could not be read.');
  updates.push(...data.map(record=>({source_id:record.source_id,kind:record.kind,status:record.staff_status,staff_note:record.staff_note,reviewed_at:record.reviewed_at})));
  if(data.length<500)return updates;
  if(start>=99500)throw new Error('Support outcome history requires cursor pagination.');
 }
}
