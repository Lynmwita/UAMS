export type UamsGrade = {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  course_code: string;
  course_title: string;
  credit_hours: number;
  cat_score: number;
  exam_score: number;
  total_score: number;
  letter_grade: string;
  grade_point: number;
  is_submitted: boolean;
  is_approved: boolean;
  semester_label?: string;
  academic_year?: string;
};

const seed: UamsGrade[] = [
  {
    id: 'grd-1',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    credit_hours: 3,
    cat_score: 28,
    exam_score: 62,
    total_score: 90,
    letter_grade: 'A',
    grade_point: 4.0,
    is_submitted: true,
    is_approved: true,
  },
  {
    id: 'grd-2',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BIT 312',
    course_title: 'Distributed Systems & Cloud Computing',
    credit_hours: 3,
    cat_score: 26,
    exam_score: 58,
    total_score: 84,
    letter_grade: 'A',
    grade_point: 4.0,
    is_submitted: true,
    is_approved: true,
  },
  {
    id: 'grd-3',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BCS 314',
    course_title: 'Software Engineering Architecture',
    credit_hours: 4,
    cat_score: 24,
    exam_score: 52,
    total_score: 76,
    letter_grade: 'A',
    grade_point: 4.0,
    is_submitted: true,
    is_approved: true,
  },
];

const runtime = globalThis as typeof globalThis & { __uams_gradesStore?: UamsGrade[] };
export const gradesStore: UamsGrade[] = runtime.__uams_gradesStore || (runtime.__uams_gradesStore = seed);
