import { NextResponse } from 'next/server';
import type { TokenPayload } from '@/lib/auth/server-auth';
import { callInstitutional, institutionalDatabase, readStudents } from './institutional';
import { extractStudentPhoto, isValidStudentPhoto } from '@/lib/students/photo';

/** Keep the existing registrar PATCH contract on the durable workflow. */
export async function updateInstitutionalStudent(request: Request, actor: TokenPayload) {
  const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Provide a student update object.');
    const selector = body.id || body.student_id || body.admission_number || body.registration_number;
    if (typeof selector !== 'string' || !selector) return fail('Select a student to update.');
    const student = (await readStudents(actor)).find(row => row.id === selector || row.admission_number === selector);
    if (!student) return fail('Student record not found.', 404);
    const registration = body.admission_number || body.registration_number;
    if (registration && registration !== student.admission_number) return fail('Registration number is a permanent record key and cannot be edited.');
    if (body.email !== undefined && String(body.email).trim().toLowerCase() !== student.email.toLowerCase()) return fail('Email changes require the institutional identity management workflow.', 409);
    if ((['faculty', 'department', 'program_name'] as const).some(key => body[key] !== undefined && body[key] !== student[key])) return fail('Program and department changes require an institutional program transfer.', 409);
    if (body.fee_balance !== undefined && Number(body.fee_balance) !== Number(student.fee_balance)) return fail('Use finance transactions to adjust the student balance.', 409);
    const update: Record<string, unknown> = { student_id: student.id };
    if (body.full_name !== undefined) {
      if (typeof body.full_name !== 'string' || !body.full_name.trim()) return fail('Student name is required.');
      const names = body.full_name.trim().split(/\s+/);
      update.first_name = names.shift();
      update.last_name = names.join(' ') || update.first_name;
    }
    for (const key of ['first_name', 'last_name', 'phone', 'status', 'campus_code', 'current_semester_number']) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.current_year_of_study !== undefined || body.year_of_study !== undefined) update.current_year_of_study = body.current_year_of_study ?? body.year_of_study;
    const photo = extractStudentPhoto(body as Record<string, unknown>);
    if (photo !== undefined && photo !== null && !isValidStudentPhoto(photo)) return fail('Profile photo must be an image (JPG/PNG/WebP) or an https photo URL.');
    const data = await callInstitutional('student.update', update, actor);
    if (photo !== undefined) {
      // The durable photo home is users.avatar_url; the student records view exposes it as photo_url.
      const { error: photoError } = await institutionalDatabase().from('users').update({ avatar_url: photo }).eq('id', student.user_id);
      if (photoError) return fail('Student saved, but the profile photo could not be saved. Try the photo again from Edit.');
      if (data && typeof data === 'object') (data as Record<string, unknown>).photo_url = photo;
    }
    return NextResponse.json({ success: true, data, message: 'Student record saved to the institutional database.' });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    return fail('Student update rejected. Check enrollment status and profile fields.', code === 'P0002' ? 404 : code === '42501' ? 403 : 400);
  }
}
