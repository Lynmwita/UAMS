-- =============================================================================
-- University Administration Management System (UAMS)
-- Phase 2: PostgreSQL / Supabase Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_semester_gpa ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current authenticated user's role code
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
    SELECT r.code 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to fetch student ID for current authenticated user
CREATE OR REPLACE FUNCTION auth_student_id()
RETURNS UUID AS $$
    SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to fetch staff ID for current authenticated user
CREATE OR REPLACE FUNCTION auth_staff_id()
RETURNS UUID AS $$
    SELECT id FROM staff WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- USERS Table Policies
-- -----------------------------------------------------------------------------
-- Super Admin and University Admin can manage all users
CREATE POLICY "Admins have full access to users"
    ON users
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin'));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    USING (id = auth.uid());

-- Users can update select fields of their own profile
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- STUDENTS Table Policies
-- -----------------------------------------------------------------------------
-- Super Admin, Admin, Registrar have full access to student records
CREATE POLICY "Admin & Registrar manage students"
    ON students
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

-- HOD can view students within their department
CREATE POLICY "HOD views department students"
    ON students
    FOR SELECT
    USING (
        auth_user_role() = 'hod' AND
        program_id IN (
            SELECT p.id FROM programs p
            JOIN departments d ON p.department_id = d.id
            WHERE d.hod_id = auth.uid()
        )
    );

-- Students can view their own record
CREATE POLICY "Students view own record"
    ON students
    FOR SELECT
    USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- COURSE REGISTRATIONS Table Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Admin & Registrar manage registrations"
    ON course_registrations
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Students manage own course registrations"
    ON course_registrations
    FOR ALL
    USING (student_id = auth_student_id());

CREATE POLICY "Lecturers view enrolled course students"
    ON course_registrations
    FOR SELECT
    USING (
        course_id IN (
            SELECT ca.course_id FROM course_allocations ca
            JOIN lecturers l ON ca.lecturer_id = l.id
            JOIN staff s ON l.staff_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- GRADES & RESULTS Table Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Admin & Registrar view and seal grades"
    ON student_grades
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Lecturers enter marks for allocated courses"
    ON student_grades
    FOR ALL
    USING (
        course_id IN (
            SELECT ca.course_id FROM course_allocations ca
            JOIN lecturers l ON ca.lecturer_id = l.id
            JOIN staff s ON l.staff_id = s.id
            WHERE s.user_id = auth.uid()
        )
    );

CREATE POLICY "Students view only approved grades"
    ON student_grades
    FOR SELECT
    USING (
        student_id = auth_student_id() AND is_approved = TRUE
    );

-- -----------------------------------------------------------------------------
-- FINANCIAL INVOICES & TRANSACTIONS Table Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Finance officers manage financial records"
    ON student_invoices
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'finance_officer'));

CREATE POLICY "Students view own fee statements"
    ON student_invoices
    FOR SELECT
    USING (student_id = auth_student_id());

CREATE POLICY "Finance officers manage transactions"
    ON transactions
    FOR ALL
    USING (auth_user_role() IN ('super_admin', 'finance_officer'));

CREATE POLICY "Students view own transactions"
    ON transactions
    FOR SELECT
    USING (student_id = auth_student_id());

-- -----------------------------------------------------------------------------
-- AUDIT LOGS Table Policies (Immutable / Super Admin only)
-- -----------------------------------------------------------------------------
CREATE POLICY "Super Admins view audit logs"
    ON audit_logs
    FOR SELECT
    USING (auth_user_role() = 'super_admin');
