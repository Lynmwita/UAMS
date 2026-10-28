import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse, inDepartment } from '@/lib/auth/scope';
import { studentsStore } from '@/lib/academic/student-records';
import { coursesStore } from '@/lib/academic/course-catalog';
import { staffStore, syncStaffStoreFromDatabase } from '@/lib/hr/staff';
import { admissionsStore } from '@/lib/academic/admissions';
import { registrationsStore } from '@/lib/academic/registrations';
import { invoicesStore } from '@/lib/finance/invoices';
import { gradesStore } from '@/lib/academic/grades';
import { attendanceSessions, derivedAttendanceAverage } from '@/lib/academic/attendance-store';

/**
 * Single live source for the demo dashboard (DashboardExperience). Every
 * figure comes from the same stores the list pages and the Reports page read,
 * so the dashboard can never again show a placeholder total that contradicts
 * them. Institutional (non-demo) accounts are served by the institutional
 * dashboard, not this endpoint.
 */
export async function GET(request: Request) {
  const auth = await requireServerAuth(request, ['student', 'admin', 'super_admin', 'registrar', 'hod', 'lecturer', 'finance_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'reports');

  const { user } = auth;
  await syncStaffStoreFromDatabase();

  const students = user.role === 'hod' ? studentsStore.filter((s) => inDepartment(user, s.admission_number)) : studentsStore;
  const self = user.role === 'student'
    ? studentsStore.find((s) => s.user_id === user.id) || (user.email === 'student@university.ac.ke' ? studentsStore.find((s) => s.id === 'stu-1') : undefined)
    : undefined;
  const teachingCodes = coursesStore.filter((c) => canTeachCourse(user, c.code)).map((c) => c.code);
  const scopeRegistrations = user.role === 'lecturer'
    ? registrationsStore.filter((r) => teachingCodes.includes(r.course_code))
    : user.role === 'student' && self
      ? registrationsStore.filter((r) => r.student_id === self.id)
      : registrationsStore;
  const approvedInScope = scopeRegistrations.filter((r) => r.status === 'approved');

  const catalogue = user.role === 'student' && self
    ? scopeRegistrations.map((r) => {
      const course = coursesStore.find((c) => c.code === r.course_code);
      return { code: r.course_code, title: course?.title || r.course_title, department: course?.department || '', status: r.status, approved_registrations: r.status === 'approved' ? 1 : 0 };
    })
    : (user.role === 'lecturer' ? coursesStore.filter((c) => teachingCodes.includes(c.code)) : coursesStore).map((c) => ({
      code: c.code,
      title: c.title,
      department: c.department,
      status: c.is_active ? 'Active' : 'Inactive',
      approved_registrations: registrationsStore.filter((r) => r.course_code === c.code && r.status === 'approved').length,
    }));

  const finance = {
    invoiced: invoicesStore.reduce((sum, i) => sum + i.total_amount, 0),
    collected: invoicesStore.reduce((sum, i) => sum + i.amount_paid, 0),
    outstanding: invoicesStore.reduce((sum, i) => sum + i.balance, 0),
    invoices_issued: invoicesStore.length,
    accounts_with_outstanding_balance: studentsStore.filter((s) => s.fee_balance > 0).length,
  };

  const attendanceAverage = derivedAttendanceAverage(attendanceSessions);

  return NextResponse.json({
    success: true,
    data: {
      generated_at: new Date().toISOString(),
      students: { total: students.length, active: students.filter((s) => s.status === 'active').length, programs: [...new Set(students.map((s) => s.program_name))].length },
      staff: { total: staffStore.length, active: staffStore.filter((s) => s.is_active).length },
      courses: { total: coursesStore.length, active: coursesStore.filter((c) => c.is_active).length },
      applications: { total: admissionsStore.length },
      registrations: { total: scopeRegistrations.length, approved: approvedInScope.length, pending: scopeRegistrations.filter((r) => r.status === 'pending').length },
      finance,
      attendance: { sessions: attendanceSessions.length, average_percentage: attendanceAverage },
      catalogue,
      student: self ? {
        name: `${self.first_name} ${self.last_name}`,
        cgpa: self.cgpa,
        fee_balance: self.fee_balance,
        approved_registrations: approvedInScope.length,
      } : null,
      lecturer: user.role === 'lecturer' ? {
        teaching_units: teachingCodes.length,
        approved_registrations: approvedInScope.length,
        distinct_students: new Set(approvedInScope.map((r) => r.student_id)).size,
        units_with_marks: teachingCodes.filter((code) => gradesStore.some((g) => g.course_code === code && g.is_approved)).length,
      } : null,
    },
  });
}
