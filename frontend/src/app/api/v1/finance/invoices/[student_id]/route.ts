import { institutionalApi } from '@/lib/academic/institutional-api';
import { studentsStore } from '@/lib/academic/student-records';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';

import { invoicesStore } from '@/lib/finance/invoices';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ student_id: string }> }
) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'finance_officer', 'student']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const { student_id } = await context.params;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'finance/invoices',student_id);
  const { user } = auth;

  const student = studentsStore.find((s) => s.id === student_id || s.admission_number === student_id);
  if (!student) {
    return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
  }

  if (user.role === 'student') {
    const isSelf =
      user.email.toLowerCase() === student.email ||
      (user.email === 'student@university.ac.ke' && student.admission_number === 'BIT/2023/8849');
    if (!isSelf) {
      return NextResponse.json({ success: false, error: 'Students may only view their own invoices.' }, { status: 403 });
    }
  }

  const studentInvoices = invoicesStore.filter((i) => i.student_id === student.id);
  return NextResponse.json({
    success: true,
    total: studentInvoices.length,
    data: {
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        program_name: student.program_name,
        fee_balance: student.fee_balance,
      },
      invoices: studentInvoices,
    },
  });
}
