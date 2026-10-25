import { UamsAdmissionApplication, KuccpsPlacementRecord, ApplicationDocuments } from '@/types';
import { studentsStore, StudentRecord } from '@/lib/academic/student-records';
import { programsStore, departmentsStore } from '@/lib/academic/structure';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

// NOTE (named follow-up): admissionsStore is in-memory only. KUCCPS imports
// and public applications do not survive a redeploy and are not shared across
// instances until Supabase persistence for admissions is built. The UI must
// not present this store as persistent.

export type { UamsAdmissionApplication, KuccpsPlacementRecord, ApplicationDocuments };

const seed: UamsAdmissionApplication[] = [
  {
    id: 'adm-1',
    reference_number: 'UADM-2026-0001',
    applicant_name: 'Derrick Kimathi',
    applicant_email: 'derrick.kimathi@gmail.com',
    applicant_phone: '+254712345001',
    gender: 'male',
    date_of_birth: '2005-03-14',
    program_code: 'BCS',
    program_name: 'Bachelor of Science in Computer Science',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'A-',
    kcse_points: 82,
    kcse_index: '12345678001/2025',
    national_id: '38901234',
    entry_type: 'DIRECT',
    previous_institution: 'Nairobi School',
    status: 'under_review',
    documents: {
      kcse_slip: 'kcse_result_slip_derrick.pdf',
      national_id_doc: 'national_id_derrick.pdf',
    },
    submitted_at: '2026-09-02',
  },
  {
    id: 'adm-2',
    reference_number: 'UADM-2026-0002',
    applicant_name: 'Mercy Nyambura',
    applicant_email: 'mercy.nyambura@gmail.com',
    applicant_phone: '+254712345002',
    gender: 'female',
    date_of_birth: '2006-01-22',
    program_code: 'BIT',
    program_name: 'Bachelor of Science in Information Technology',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'B+',
    kcse_points: 75,
    kcse_index: '12345678002/2025',
    national_id: '39012345',
    entry_type: 'DIRECT',
    previous_institution: 'Machakos Girls',
    status: 'shortlisted',
    documents: {
      kcse_slip: 'kcse_result_slip_mercy.pdf',
      passport_photo: 'mercy_passport.jpg',
    },
    reviewed_by: 'admissions@university.ac.ke',
    reviewed_at: '2026-09-05',
    submitted_at: '2026-08-28',
  },
  {
    id: 'adm-3',
    reference_number: 'KUCCPS-2026-0001',
    applicant_name: 'Brian Kiprop',
    applicant_email: 'brian.kiprop@gmail.com',
    applicant_phone: '+254722123456',
    gender: 'male',
    date_of_birth: '2005-07-19',
    program_code: 'BCS',
    program_name: 'Bachelor of Science in Computer Science',
    intake: 'September',
    intake_year: 2026,
    kcse_grade: 'A',
    kcse_points: 83,
    kcse_index: '23456789001/2025',
    national_id: '39123456',
    cluster_weight: 42.15,
    entry_type: 'KUCCPS',
    status: 'admitted',
    admission_number: 'BCS/2026/0001',
    offer_letter_generated_at: '2026-09-01T08:00:00Z',
    reviewed_by: 'registrar@university.ac.ke',
    reviewed_at: '2026-09-01',
    submitted_at: '2026-09-01',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_admissionsStore?: UamsAdmissionApplication[] };
export const admissionsStore: UamsAdmissionApplication[] =
  runtime.__uams_admissionsStore || (runtime.__uams_admissionsStore = seed);

export function generateAdmissionNumber(programCode: string, intakeYear: number, sequence: number): string {
  return `${programCode}/${intakeYear}/${String(sequence).padStart(4, '0')}`;
}

export function generateReferenceNumber(entryType: 'KUCCPS' | 'DIRECT', year: number, sequence: number): string {
  const prefix = entryType === 'KUCCPS' ? 'KUCCPS' : 'UADM';
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export interface ConvertApplicantResult {
  application: UamsAdmissionApplication;
  student: StudentRecord;
  alreadyConverted?: boolean;
}

/**
 * One-click conversion of an admitted applicant into an active student record.
 * Maps admission number to registration number, splits applicant name, creates institutional
 * student record with Year 1 Semester 1 standing, links audit trail, and marks application as converted.
 * Idempotent: re-calling for an already converted applicant returns the existing student record safely.
 */
export function convertApplicantToStudent(
  applicationId: string,
  actor: { email: string; role: any },
  originIp: string = '127.0.0.1'
): ConvertApplicantResult {
  const application = admissionsStore.find(
    (a) => a.id === applicationId || a.reference_number === applicationId || a.admission_number === applicationId
  );
  if (!application) {
    throw new Error('Application not found.');
  }

  // Idempotency: if already converted, check if student exists
  if (application.status === 'converted') {
    const existingStudent = studentsStore.find(
      (s) => s.admission_number === application.admission_number || s.id === application.student_id
    );
    if (existingStudent) {
      return { application, student: existingStudent, alreadyConverted: true };
    }
  }

  // Applicant must be in 'admitted' status to be converted
  if (application.status !== 'admitted' && !application.admission_number) {
    throw new Error('Only admitted applicants with an assigned admission number can be converted to student records.');
  }

  // Ensure admission number exists
  if (!application.admission_number) {
    const admittedCount = admissionsStore.filter(
      (a) => a.admission_number && a.program_code === application.program_code
    ).length;
    application.admission_number = generateAdmissionNumber(
      application.program_code,
      application.intake_year || new Date().getFullYear(),
      admittedCount + 1
    );
  }

  // Check if a student with this admission number already exists in studentsStore
  const existingByAdm = studentsStore.find((s) => s.admission_number === application.admission_number);
  if (existingByAdm) {
    application.status = 'converted';
    application.student_id = existingByAdm.id;
    application.converted_at = application.converted_at || new Date().toISOString();
    return { application, student: existingByAdm, alreadyConverted: true };
  }

  // Split name safely
  const nameParts = (application.applicant_name || 'Applicant').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Applicant';
  const lastName = nameParts.slice(1).join(' ') || nameParts[0];

  // Resolve institutional student email
  const baseEmail =
    application.applicant_email?.trim() ||
    `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.university.ac.ke`;
  let studentEmail = baseEmail.toLowerCase();
  if (studentsStore.some((s) => s.email?.toLowerCase() === studentEmail)) {
    studentEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Date.now().toString().slice(-4)}@student.university.ac.ke`;
  }

  // Match programme and department from academic catalogue
  const prog = programsStore.find((p) => p.code === application.program_code);
  const dept = prog ? departmentsStore.find((d) => d.id === prog.department_id) : undefined;

  let faculty = 'School of Computing & Informatics';
  if (prog?.school_id === 'sch-biz') faculty = 'School of Business';
  else if (prog?.school_id === 'sch-eng') faculty = 'School of Engineering';
  else if (prog?.school_id === 'sch-edu') faculty = 'School of Education';

  const department = dept?.name || application.program_name || 'General Studies';
  const programName = application.program_name || prog?.name || application.program_code;
  const programId = prog?.id || `prog-${application.program_code.toLowerCase()}`;

  const newStudent: StudentRecord = {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admission_number: application.admission_number,
    first_name: firstName,
    last_name: lastName,
    email: studentEmail,
    gender: application.gender,
    faculty,
    department,
    campus_code: 'ZU-TECH',
    program_id: programId,
    program_name: programName,
    current_year_of_study: 1,
    current_semester_number: 1,
    status: 'active',
    admission_date: new Date().toISOString().split('T')[0],
    cgpa: 0.0,
    fee_balance: 55000,
    photo_url: application.documents?.passport_photo,
  };

  studentsStore.unshift(newStudent);

  // Mark application as converted
  application.status = 'converted';
  application.student_id = newStudent.id;
  application.converted_at = new Date().toISOString();

  // Audit log event
  recordAuditEvent({
    actor_email: actor.email,
    actor_role: actor.role,
    action: 'ADMISSION_CONVERTED_TO_STUDENT',
    entity_type: 'students',
    entity_id: newStudent.admission_number,
    ip_address: originIp,
    status: 'SUCCESS',
    details: {
      application_id: application.id,
      reference_number: application.reference_number,
      admission_number: newStudent.admission_number,
      student_id: newStudent.id,
      email: newStudent.email,
      program_code: application.program_code,
    },
  });

  return { application, student: newStudent, alreadyConverted: false };
}
