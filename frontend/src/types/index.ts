export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'registrar'
  | 'hod'
  | 'lecturer'
  | 'finance_officer'
  | 'student'
  | 'librarian'
  | 'support_staff'
  | 'audit_officer';

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
  school_id: string | null;
  code: string;
  name: string;
  hod_id?: string;
  category?: 'academic' | 'non_academic';
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

export interface HostelBlock {
  id: string;
  code: string;
  name: string;
  gender_designation: 'male' | 'female' | 'mixed';
  total_floors: number;
  total_capacity: number;
  warden_name: string;
  warden_phone: string;
  is_active: boolean;
}

export interface HostelRoom {
  id: string;
  block_id: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  occupied_beds: number;
  semester_fee: number;
  is_available: boolean;
}

export interface HostelAllocation {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  room_id: string;
  block_name: string;
  room_number: string;
  bed_number: number;
  payment_status: 'pending' | 'paid' | 'cleared';
  status: 'allocated' | 'checked_in' | 'checked_out';
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  total_copies: number;
  available_copies: number;
  shelf_location: string;
  is_ebook_available: boolean;
}

export interface LibraryLoan {
  id: string;
  book_id: string;
  book_title: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  fine_amount?: number;
}

export interface ExamSchedule {
  id: string;
  course_code: string;
  course_title: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  chief_invigilator: string;
  total_candidates: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}

export interface ExamClearanceCard {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  program_name: string;
  semester_name: string;
  card_serial_number: string;
  fee_balance: number;
  fee_paid_percentage: number;
  is_cleared: boolean;
  attendance_percentage: number | null;
  attendance_blocked: boolean;
  attendance_exempt: boolean;
  security_qr_token: string;
  registered_units: number;
}

export interface NotificationLog {
  id: string;
  recipient_type: 'student' | 'guardian' | 'lecturer' | 'staff' | 'broadcast';
  recipient_identifier: string;
  recipient_name: string;
  channel: 'sms' | 'email' | 'in_app';
  subject?: string;
  message_content: string;
  provider: 'africas_talking' | 'smtp_relay' | 'system' | string;
  status: 'delivered' | 'sent' | 'queued' | 'failed';
  created_at: string;
  // A3 dispatch telemetry (optional; older records may not carry these)
  provider_message_id?: string;
  delivery_error?: string;
  cost?: string;
  attempts?: number;
  updated_at?: string;
  dispatch_mode?: 'live' | 'mock';
}


// ---- Admissions (KUCCPS portal, ported onto the canonical line) ----
// Nullable-by-design: a missing phone/email/grade is stored as null and
// shown as "not provided" — never as an invented value that looks real.
export interface ApplicationDocuments {
  kcse_slip?: string;
  national_id_doc?: string;
  passport_photo?: string;
  leaving_cert?: string;
}

export interface UamsAdmissionApplication {
  id: string;
  reference_number: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string | null;
  gender: 'male' | 'female' | 'other';
  date_of_birth?: string | null;
  program_code: string;
  program_name: string;
  intake: string;
  intake_year: number;
  kcse_grade: string | null;
  kcse_points: number | null;
  kcse_index?: string;
  national_id?: string;
  cluster_weight?: number;
  entry_type: 'KUCCPS' | 'DIRECT';
  previous_institution?: string;
  documents?: ApplicationDocuments;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'admitted' | 'rejected' | 'converted';
  reviewed_by?: string;
  reviewed_at?: string;
  admission_number?: string;
  offer_letter_generated_at?: string;
  submitted_at: string;
  converted_at?: string;
  student_id?: string;
}

export interface KuccpsPlacementRecord {
  kcse_index: string;
  applicant_name: string;
  gender: 'male' | 'female' | 'other';
  applicant_phone: string | null;
  applicant_email: string | null;
  program_code: string;
  program_name?: string;
  cluster_weight?: number;
  kcse_grade: string | null;
  kcse_points: number | null;
  national_id?: string;
  intake_year?: number;
  intake?: string;
}
