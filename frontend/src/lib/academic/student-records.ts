export interface StudentRecord {
  id: string;
  user_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  faculty?: string;
  department?: string;
  campus_code?: string;
  program_id: string;
  program_name: string;
  current_year_of_study: number;
  current_semester_number: number;
  status: string;
  admission_date: string;
  cgpa: number;
  fee_balance: number;
}

const seed: StudentRecord[] = [
  {
    id: 'stu-1',
    user_id: 'usr-student-01',
    admission_number: 'BIT/2023/8849',
    first_name: 'Faith',
    last_name: 'Wanjiku',
    email: 'faith.wanjiku@student.university.ac.ke',
    gender: 'female',
    faculty: 'School of Computing & Informatics',
    department: 'Information Technology',
    campus_code: 'ZU-TECH',
    program_id: 'prog-bit',
    program_name: 'Bachelor of Science in Information Technology',
    current_year_of_study: 3,
    current_semester_number: 1,
    status: 'active',
    admission_date: '2023-09-01',
    cgpa: 3.82,
    fee_balance: 0,
  },
  {
    id: 'stu-2',
    user_id: 'usr-student-02',
    admission_number: 'BCS/2023/1204',
    first_name: 'Kevin',
    last_name: 'Otieno',
    email: 'kevin.otieno@student.university.ac.ke',
    gender: 'male',
    faculty: 'School of Computing & Informatics',
    department: 'Computer Science',
    campus_code: 'ZU-RUIRU',
    program_id: 'prog-bcs',
    program_name: 'Bachelor of Science in Computer Science',
    current_year_of_study: 2,
    current_semester_number: 2,
    status: 'active',
    admission_date: '2023-09-01',
    cgpa: 3.65,
    fee_balance: 18500,
  },
  {
    id: 'stu-3',
    user_id: 'usr-student-03',
    admission_number: 'BBA/2022/4412',
    first_name: 'Brian',
    last_name: 'Kiprono',
    email: 'brian.kiprono@student.university.ac.ke',
    gender: 'male',
    faculty: 'School of Business',
    department: 'Business Administration',
    campus_code: 'ZU-TECH',
    program_id: 'prog-bba',
    program_name: 'Bachelor of Business Administration',
    current_year_of_study: 4,
    current_semester_number: 1,
    status: 'active',
    admission_date: '2022-09-01',
    cgpa: 3.48,
    fee_balance: 0,
  },
];
const runtime = globalThis as typeof globalThis & { __uams_studentsStore?: StudentRecord[] };
export const studentsStore: StudentRecord[] = runtime.__uams_studentsStore || (runtime.__uams_studentsStore = seed);
