export type UamsAdmissionApplication = {
  id: string;
  reference_number: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  program_code: string;
  program_name: string;
  intake: string;
  intake_year: number;
  kcse_grade: string;
  kcse_points: number;
  previous_institution?: string;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'admitted' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  admission_number?: string;
  submitted_at: string;
};

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
    previous_institution: 'Nairobi School',
    status: 'under_review',
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
    previous_institution: 'Machakos Girls',
    status: 'shortlisted',
    reviewed_by: 'admissions@university.ac.ke',
    reviewed_at: '2026-09-05',
    submitted_at: '2026-08-28',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_admissionsStore?: UamsAdmissionApplication[] };
export const admissionsStore: UamsAdmissionApplication[] =
  runtime.__uams_admissionsStore || (runtime.__uams_admissionsStore = seed);

export function generateAdmissionNumber(programCode: string, intakeYear: number, sequence: number): string {
  return `${programCode}/${intakeYear}/${String(sequence).padStart(4, '0')}`;
}
