import { institutionalApi } from '@/lib/academic/institutional-api';
import { studentsStore } from '@/lib/academic/student-records';
import { registrationsStore } from '@/lib/academic/registrations';
import { gradesStore } from '@/lib/academic/grades';
import { invoicesStore } from '@/lib/finance/invoices';
import { coursesStore } from '@/lib/academic/course-catalog';
import { admissionsStore } from '@/lib/academic/admissions';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'finance_officer', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'reports');

  const programNames = [...new Set(studentsStore.map((s) => s.program_name))];

  const studentsByProgram = programNames.map((program) => {
    const inProgram = studentsStore.filter((s) => s.program_name === program);
    return {
      program,
      total: inProgram.length,
      active: inProgram.filter((s) => s.status === 'active').length,
      years: [...new Set(inProgram.map((s) => s.current_year_of_study))].sort((a, b) => a - b),
    };
  });

  const registrationsByCourse = [...new Set(registrationsStore.map((r) => r.course_code))].map((code) => {
    const forCourse = registrationsStore.filter((r) => r.course_code === code);
    return {
      course_code: code,
      course_title: forCourse[0]?.course_title || code,
      total_registrations: forCourse.length,
      pending: forCourse.filter((r) => r.status === 'pending').length,
      approved: forCourse.filter((r) => r.status === 'approved').length,
    };
  });

  const financeTotals = {
    invoiced: invoicesStore.reduce((sum, i) => sum + i.total_amount, 0),
    collected: invoicesStore.reduce((sum, i) => sum + i.amount_paid, 0),
    outstanding: invoicesStore.reduce((sum, i) => sum + i.balance, 0),
    invoices_issued: invoicesStore.length,
    settled_invoices: invoicesStore.filter((i) => i.status === 'settled').length,
    partial_invoices: invoicesStore.filter((i) => i.status === 'partial').length,
  };

  const gradeDistribution = (() => {
    const approved = gradesStore.filter((g) => g.is_approved);
    const distinct = [...new Set(approved.map((g) => g.letter_grade))];
    return distinct.map((letter) => ({
      letter,
      count: approved.filter((g) => g.letter_grade === letter).length,
    }));
  })();

  const catalogTotals = {
    courses: coursesStore.length,
    active_courses: coursesStore.filter((c) => c.is_active).length,
    total_capacity: coursesStore.reduce((sum, c) => sum + c.capacity, 0),
    total_enrolled: coursesStore.reduce((sum, c) => sum + c.enrolled, 0),
  };

  const admissionsTotals = {
    total_applications: admissionsStore.length,
    submitted: admissionsStore.filter((a) => a.status === 'submitted').length,
    under_review: admissionsStore.filter((a) => a.status === 'under_review').length,
    shortlisted: admissionsStore.filter((a) => a.status === 'shortlisted').length,
    admitted: admissionsStore.filter((a) => a.status === 'admitted').length,
    rejected: admissionsStore.filter((a) => a.status === 'rejected').length,
  };

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        total_students: studentsStore.length,
        active_students: studentsStore.filter((s) => s.status === 'active').length,
        avg_cgpa: Number((studentsStore.reduce((sum, s) => sum + s.cgpa, 0) / (studentsStore.length || 1)).toFixed(2)),
        total_outstanding_students: studentsStore.filter((s) => s.fee_balance > 0).length,
      },
      studentsByProgram,
      registrationsByCourse,
      financeTotals,
      gradeDistribution,
      catalogTotals,
      admissionsTotals,
      generated_at: new Date().toISOString(),
    },
  });
}
