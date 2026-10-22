const seed: UamsRegistration[] = [
  {
    id: 'reg-1',
    student_id: 'stu-1',
    admission_number: 'BIT/2023/8849',
    student_name: 'Faith Wanjiku',
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    status: 'approved',
    registered_at: '2026-09-10T10:00:00Z',
    approved_by: 'Registrar',
  },
  {
    id: 'reg-2',
    student_id: 'stu-2',
    admission_number: 'BCS/2023/1204',
    student_name: 'Kevin Otieno',
    course_code: 'BIT 312',
    course_title: 'Distributed Systems & Cloud Computing',
    status: 'pending',
    registered_at: '2026-09-12T14:30:00Z',
  },
];

export type UamsRegistration = {
  id: string;
  student_id: string;
  admission_number: string;
  student_name: string;
  course_code: string;
  course_title: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  approved_by?: string;
  approved_at?: string;
};

const runtime = globalThis as typeof globalThis & { __uams_registrationsStore?: UamsRegistration[] };
export const registrationsStore: UamsRegistration[] =
  runtime.__uams_registrationsStore || (runtime.__uams_registrationsStore = [...seed]);
