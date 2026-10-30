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
  /**
   * Grade moderation lifecycle:
   * - draft: entered by lecturer, not yet submitted for review
   * - pending_hod: submitted, awaiting HOD/departmental moderation
   * - senate_approved: official transcript record (only these count toward CGPA)
   * Kept in sync with is_approved (true only when senate_approved).
   */
  moderation_status: 'draft' | 'pending_hod' | 'senate_approved';
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
    moderation_status: 'senate_approved',
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
    moderation_status: 'senate_approved',
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
    moderation_status: 'senate_approved',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_gradesStore?: UamsGrade[] };
export const gradesStore: UamsGrade[] = runtime.__uams_gradesStore || (runtime.__uams_gradesStore = seed);

/**
 * Grade change / appeal requests.
 * A lecturer submits an amendment with a mandatory reason; a HOD/admin
 * signs off. Every action is audit-logged with the reason preserved.
 */
export type GradeAppeal = {
  id: string;
  grade_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  course_code: string;
  course_title: string;
  old_total: number;
  old_letter: string;
  new_cat_score: number;
  new_exam_score: number;
  new_total: number;
  new_letter: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_at: string;
  decided_by?: string;
  decided_at?: string;
  decision_note?: string;
};

const appealRuntime = globalThis as typeof globalThis & { __uams_gradeAppeals?: GradeAppeal[] };
export const gradeAppealsStore: GradeAppeal[] =
  appealRuntime.__uams_gradeAppeals || (appealRuntime.__uams_gradeAppeals = []);
