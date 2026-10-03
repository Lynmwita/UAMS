-- =============================================================================
-- University Administration Management System (UAMS)
-- Phase 2: PostgreSQL / Supabase Core Database Schema Initialization
-- =============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ROLES & AUTHENTICATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. super_admin, admin, registrar, hod, lecturer, finance_officer, student
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. students.create, grades.enter, fees.reconcile
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(25),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. UNIVERSITY STRUCTURE HIERARCHY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. SCI, SOB, SOE
    name VARCHAR(255) NOT NULL,
    dean_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. CS, IT, ELEC
    name VARCHAR(255) NOT NULL,
    hod_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. 2026/2027
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_number INT NOT NULL CHECK (semester_number IN (1, 2, 3)),
    name VARCHAR(50) NOT NULL, -- e.g. Semester 1, Trimester 2
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_deadline DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. BSC-CS, BCOM
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'undergraduate', -- certificate, diploma, undergraduate, postgraduate, doctorate
    duration_years INT NOT NULL DEFAULT 4,
    total_credit_requirements INT NOT NULL DEFAULT 120,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. COURSES & PREREQUISITES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. CSC401, MAT101
    title VARCHAR(255) NOT NULL,
    description TEXT,
    credit_hours INT NOT NULL DEFAULT 3,
    level INT NOT NULL DEFAULT 100, -- 100, 200, 300, 400
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID REFERENCES courses(id) ON DELETE RESTRICT,
    PRIMARY KEY (course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS program_courses (
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    year_of_study INT NOT NULL DEFAULT 1,
    semester_number INT NOT NULL DEFAULT 1,
    is_elective BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (program_id, course_id)
);

-- -----------------------------------------------------------------------------
-- 4. STAFF & LECTURERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    staff_number VARCHAR(50) UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(100) NOT NULL,
    employment_type VARCHAR(50) DEFAULT 'full_time', -- full_time, part_time, adjunct
    date_of_joining DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
    specialization VARCHAR(255),
    academic_rank VARCHAR(100) DEFAULT 'Lecturer', -- Assistant Lecturer, Lecturer, Senior Lecturer, Associate Professor, Professor
    office_location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, lecturer_id, semester_id)
);

-- -----------------------------------------------------------------------------
-- 5. STUDENTS & GUARDIANS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. STU/2026/001
    national_id VARCHAR(50),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE RESTRICT,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
    current_year_of_study INT DEFAULT 1,
    current_semester_number INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, deferred, graduated, discontinued
    admission_date DATE NOT NULL,
    graduation_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. COURSE REGISTRATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'registered', -- pending, registered, approved, dropped, rejected
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    UNIQUE(student_id, course_id, semester_id)
);

-- -----------------------------------------------------------------------------
-- 7. ATTENDANCE MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- -----------------------------------------------------------------------------
-- 8. EXAMINATIONS, GRADES & GPA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade VARCHAR(5) UNIQUE NOT NULL, -- A, B+, B, C+, C, D, E, F
    min_score NUMERIC(5, 2) NOT NULL,
    max_score NUMERIC(5, 2) NOT NULL,
    grade_point NUMERIC(3, 2) NOT NULL, -- 4.0, 3.5, 3.0 etc.
    description VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) DEFAULT 'final_exam', -- cat1, cat2, assignment, final_exam
    weight_percentage NUMERIC(5, 2) DEFAULT 70.00,
    exam_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    cat_score NUMERIC(5, 2) DEFAULT 0.00, -- out of 30 or 40
    exam_score NUMERIC(5, 2) DEFAULT 0.00, -- out of 70 or 60
    total_score NUMERIC(5, 2) GENERATED ALWAYS AS (cat_score + exam_score) STORED,
    letter_grade VARCHAR(5),
    grade_point NUMERIC(3, 2),
    is_submitted BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, semester_id)
);

CREATE TABLE IF NOT EXISTS student_semester_gpa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    total_credit_hours INT NOT NULL DEFAULT 0,
    total_grade_points NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    gpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    cgpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    academic_standing VARCHAR(50) DEFAULT 'Good Standing',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, semester_id)
);

-- -----------------------------------------------------------------------------
-- 9. FEES, INVOICING & PAYMENT GATEWAYS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    year_of_study INT NOT NULL,
    semester_number INT NOT NULL,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    registration_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    examination_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    library_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    activity_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    medical_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
        tuition_fee + registration_fee + examination_fee + library_fee + activity_fee + medical_fee
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    total_billed NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_billed - amount_paid) STORED,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partially_paid, paid, overdue
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES student_invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash', 'scholarship')),
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'reversed')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    mpesa_receipt_number VARCHAR(50) UNIQUE,
    phone_number VARCHAR(25) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    result_code INT,
    result_desc TEXT,
    raw_callback_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL, -- e.g. Equity Bank, KCB, Absa, Co-op
    bank_branch VARCHAR(100),
    slip_reference_number VARCHAR(100) UNIQUE NOT NULL,
    account_number VARCHAR(50),
    deposit_date DATE NOT NULL,
    deposit_slip_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TIMETABLES & SCHEDULES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES lecturers(id) ON DELETE SET NULL,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    day_of_week VARCHAR(15) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_or_hall VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. ANNOUNCEMENTS & TARGETED NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'lecturers', 'staff', 'finance', 'school', 'department', 'program')),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. IMMUTABLE AUDIT LOGGING & TELEMETRY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. STUDENT_ENROLLED, GRADE_MODIFIED, PAYMENT_VERIFIED
    entity_type VARCHAR(100) NOT NULL, -- e.g. students, student_grades, transactions
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_program ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_student ON course_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_course ON course_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON student_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
