import { UamsAdmissionApplication, KuccpsPlacementRecord, ApplicationDocuments } from '@/types';

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
