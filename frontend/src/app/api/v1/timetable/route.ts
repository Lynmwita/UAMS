import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse } from '@/lib/auth/scope';

const slots=[{id:'slot-1',day:'Monday',time:'08:00 AM \u2013 11:00 AM',courseCode:'BCS 311',courseTitle:'Advanced Database Systems',room:'Lecture Hall 04',lecturer:'Dr. Jane Mwangi'},{id:'slot-2',day:'Monday',time:'02:00 PM \u2013 05:00 PM',courseCode:'BIT 312',courseTitle:'Distributed Systems & Cloud Computing',room:'Computing Lab 01',lecturer:'Prof. David Kamau'},{id:'slot-3',day:'Tuesday',time:'08:00 AM \u2013 11:00 AM',courseCode:'BCS 314',courseTitle:'Software Engineering Architecture',room:'Lecture Hall 04',lecturer:'Dr. Jane Mwangi'},{id:'slot-4',day:'Wednesday',time:'11:00 AM \u2013 01:00 PM',courseCode:'BCS 316',courseTitle:'Network & System Security',room:'Cybersecurity Lab 03',lecturer:'Eng. Eric Ochieng'},{id:'slot-5',day:'Thursday',time:'02:00 PM \u2013 05:00 PM',courseCode:'BBA 201',courseTitle:'Principles of Financial Accounting',room:'Lecture Theater 02',lecturer:'Prof. David Kamau'},{id:'slot-6',day:'Friday',time:'08:00 AM \u2013 11:00 AM',courseCode:'BIT 312',courseTitle:'Distributed Systems & Cloud Computing',room:'Computing Lab 02',lecturer:'Prof. David Kamau'}];
export async function GET(request:Request){
  const auth=await requireServerAuth(request,['student','lecturer','hod','registrar','admin','super_admin']);if('errorResponse' in auth)return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'timetable');
  return NextResponse.json({success:true,data:slots.filter(s=>canTeachCourse(auth.user,s.courseCode)&&(auth.user.role!=='hod'||s.courseCode.startsWith('BCS')))});
}
export async function POST(request:Request){
  const auth=await requireServerAuth(request,['registrar','admin','super_admin']);if('errorResponse' in auth)return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'timetable');
  try{const body=await request.json();if(!['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(body.day)||['time','courseCode','courseTitle','room','lecturer'].some(k=>typeof body[k]!=='string'||!body[k].trim()||body[k].length>200))return NextResponse.json({success:false,error:'Valid timetable fields are required.'},{status:400});
    if(slots.some(s=>s.day===body.day&&s.time===body.time&&(s.room===body.room||s.lecturer===body.lecturer||s.courseCode===body.courseCode)))return NextResponse.json({success:false,error:'Room, lecturer or course already booked for this slot.'},{status:409});
    const slot={id:crypto.randomUUID(),day:body.day,time:body.time,courseCode:body.courseCode,courseTitle:body.courseTitle,room:body.room,lecturer:body.lecturer};slots.push(slot);return NextResponse.json({success:true,data:slot},{status:201});
  }catch{return NextResponse.json({success:false,error:'Invalid timetable request.'},{status:400});}
}
