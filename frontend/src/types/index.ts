export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'registrar'
  | 'hod'
  | 'lecturer'
  | 'finance_officer'
  | 'student';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface School {
  id: string;
  code: string;
  name: string;
  dean_id?: string;
  description?: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  school_id: string;
  code: string;
  name: string;
  hod_id?: string;
  is_active: boolean;
}

export interface AcademicProgram {
  id: string;
  department_id: string;
  code: string;
  name: string;
  level: 'certificate' | 'diploma' | 'undergraduate' | 'postgraduate' | 'doctorate';
  duration_years: number;
  total_credit_requirements: number;
  is_active: boolean;
}

export interface Course {
  id: string;
  department_id: string;
  code: string;
  title: string;
  description?: string;
  credit_hours: number;
  level: number;
  is_active: boolean;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  admission_number: string;
  national_id?: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  program_id: string;
  current_year_of_study: number;
  current_semester_number: number;
  status: 'active' | 'suspended' | 'deferred' | 'graduated' | 'discontinued';
  admission_date: string;
  user?: User;
  program?: AcademicProgram;
}

export interface CourseRegistration {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  registration_date: string;
  status: 'pending' | 'registered' | 'approved' | 'dropped' | 'rejected';
  course?: Course;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  cat_score: number;
  exam_score: number;
  total_score: number;
  letter_grade: string;
  grade_point: number;
  is_submitted: boolean;
  is_approved: boolean;
  course?: Course;
}

export interface StudentInvoice {
  id: string;
  student_id: string;
  invoice_number: string;
  total_billed: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
}

export interface FinancialTransaction {
  id: string;
  student_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: 'mpesa' | 'bank_transfer' | 'cash' | 'scholarship';
  reference_number: string;
  transaction_date: string;
  status: 'pending' | 'verified' | 'rejected' | 'reversed';
  verified_by?: string;
  verified_at?: string;
}
