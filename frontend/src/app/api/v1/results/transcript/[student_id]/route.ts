import { studentsStore } from '@/lib/academic/student-records';
import { gradesStore } from '@/lib/academic/grades';
import { readStudents, readGrades } from '@/lib/academic/institutional';
import { buildTranscript } from '@/lib/academic/transcript';
import { generateTranscriptPDF } from '@/lib/pdf/generator';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { isDemoUser } from '@/lib/auth/scope';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: {params:Promise<{student_id:string}>}) {
  const auth = await requireServerAuth(request,['super_admin','admin','registrar','student']);
  if ('errorResponse' in auth) return auth.errorResponse;
  const {student_id: requested} = await context.params;
  const {user} = auth;
  try {
    const demo = isDemoUser(user);
    const students = demo ? studentsStore : await readStudents(user);
    const self = students.find(student => student.user_id === user.id || (demo && user.role === 'student' && user.email === 'student@university.ac.ke' && student.id === 'stu-1'));
    if (requested === 'me' && user.role !== 'student') return NextResponse.json({success:false,error:'Select a student to download their transcript.'},{status:400});
    const student = requested === 'me' ? self : students.find(student => student.id === requested || student.admission_number === requested);
    if (!student) return NextResponse.json({success:false,error:'Student not found.'},{status:404});
    if (user.role === 'student' && student.id !== self?.id) return NextResponse.json({success:false,error:'Students may download only their own transcript.'},{status:403});
    const records = (demo ? gradesStore : await readGrades(user)).filter(grade => grade.student_id === student.id && grade.is_approved);
    if (records.length === 0) return NextResponse.json({success:false,error:'There are no approved results available for this student.'},{status:409});
    const transcript = buildTranscript({name:`${student.first_name} ${student.last_name}`,admissionNumber:student.admission_number,
      program:student.program_name,yearOfStudy:student.current_year_of_study,semesterNumber:student.current_semester_number,status:student.status},records);
    const pdf = generateTranscriptPDF(transcript);
    recordAuditEvent({actor_email:user.email,actor_role:user.role,action:'TRANSCRIPT_DOWNLOADED',entity_type:'academic_transcripts',
      entity_id:student.id,ip_address:request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',status:'SUCCESS'});
    const filename=student.admission_number.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,100);
    return new Response(Buffer.from(pdf.output('arraybuffer')),{headers:{'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="Academic_Transcript_${filename}.pdf"`,'Cache-Control':'private, no-store'}});
  } catch {
    return NextResponse.json({success:false,error:'The transcript could not be generated. Please retry.'},{status:503});
  }
}
