import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { listNotices, toHubAnnouncement } from '@/lib/communications/announcements';
import {readStudents,readGrades,institutionalRows} from '@/lib/academic/institutional';

export async function GET(request: Request) {
  const secret = process.env.UAMS_FEED_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: 'Registrar feed is not configured.' }, { status: 503 });
  const received = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (Buffer.byteLength(received) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Always read durable records. Public demonstration notices never enter a live Hub feed.
    const [notices,students,grades,events,exams,courses,departments,schools,semesters,years,timetables,programCourses] = await Promise.all([listNotices(false),readStudents(),readGrades(),institutionalRows('campus_events'),institutionalRows('uams_exam_records'),institutionalRows('uams_course_records'),institutionalRows('departments'),institutionalRows('schools'),institutionalRows('semesters'),institutionalRows('academic_years'),institutionalRows('uams_timetable_records'),institutionalRows('program_courses')]);
    const campusCode=process.env.UAMS_FEED_CAMPUS_CODE;
    if(timetables.length&&!campusCode)throw new Error('Set the authoritative timetable campus code.');
    return NextResponse.json({ version: 1,
      students:students.map(s=>({email:s.email,full_name:`${s.first_name} ${s.last_name}`,registration_number:s.admission_number,program_name:s.program_name,program_of_study:s.program_name,faculty:s.faculty,department:s.department,year_of_study:s.current_year_of_study,campus_code:s.campus_code,photo_url:(s.photo_url||s.avatar_url||'').startsWith('https://')?(s.photo_url||s.avatar_url):null,enrollment_status:({active:'active',suspended:'suspended',graduated:'graduated',deferred:'pending',discontinued:'withdrawn'} as Record<string,string>)[s.status]||'pending',enrollment_updated_at:s.updated_at})),
      grades:grades.map(g=>({source_id:g.id,student_email:g.student_email,course_code:g.course_code,course_name:g.course_title,grade:g.letter_grade,score:g.total_score,semester:Number(g.semester_label.match(/[1-3]/)?.[0]||1),academic_year:g.academic_year,updated_at:g.updated_at,is_published:g.is_approved})),
      events:events.map(e=>({source_id:e.id,title:e.scope_type==='university'?e.title:'Restricted event',description:e.scope_type==='university'?e.description:'',venue:e.scope_type==='university'?e.location:'Restricted',starts_at:e.starts_at,ends_at:e.ends_at,updated_at:e.updated_at,is_published:e.is_active&&e.scope_type==='university'})),
      academic_dates:[...exams.map(e=>({source_id:e.id,title:e.title,description:e.description||'',starts_at:e.starts_at,ends_at:e.ends_at,kind:'exam',updated_at:e.updated_at,is_published:e.status!=='cancelled'})),...semesters.flatMap(s=>[{source_id:`term:${s.id}`,title:s.name,description:'Academic semester',starts_at:`${s.start_date}T00:00:00+03:00`,ends_at:`${s.end_date}T23:59:59+03:00`,kind:'term',updated_at:s.updated_at,is_published:true},...(s.registration_deadline?[{source_id:`registration:${s.id}`,title:`${s.name} registration deadline`,description:'Complete course registration before this date.',starts_at:`${s.registration_deadline}T00:00:00+03:00`,ends_at:`${s.registration_deadline}T23:59:59+03:00`,kind:'deadline',updated_at:s.updated_at,is_published:true}]:[])])],
      course_units:courses.filter(c=>c.is_active).map(c=>{const dept=departments.find(d=>d.id===c.department_id),allocation=programCourses.find(p=>p.course_id===c.id);return {code:c.code,name:c.title,department:c.department,faculty:schools.find(s=>s.id===dept?.school_id)?.name,year_of_study:allocation?.year_of_study||Math.max(1,Math.floor(c.level/100)),semester:allocation?.semester_number||1,credit_hours:c.credit_hours};}),
      timetables:timetables.map(t=>{const semester=semesters.find(s=>s.id===t.semester_id);if(!semester)throw new Error('Unknown timetable semester.');return {source_id:t.id,updated_at:t.updated_at,is_active:true,course_code:t.courseCode,campus_code:campusCode,day_of_week:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(t.day)+1,start_time:t.start_time,end_time:t.end_time,venue:t.room,lecturer_name:t.lecturer||'Unassigned',semester:semester.semester_number,academic_year:years.find(y=>y.id===semester.academic_year_id)?.code};}),
      announcements: notices.map(toHubAnnouncement) },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Registrar announcement export is unavailable.' }, { status: 503 });
  }
}
