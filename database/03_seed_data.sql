-- =============================================================================
-- University Administration Management System (UAMS)
-- Phase 2: Core Fixtures & Seed Data
-- =============================================================================

-- 1. ROLES
INSERT INTO roles (code, name, description) VALUES
('super_admin', 'Super Administrator', 'Full root access to system telemetry, security, and global configuration'),
('admin', 'University Administrator', 'Administrative control over schools, departments, staff, and campus assets'),
('registrar', 'Registrar / Academic Affairs', 'Manages admissions, student records, course registration, and examination results'),
('hod', 'Head of Department', 'Departmental curriculum, course assignment, and lecturer moderation'),
('lecturer', 'Academic Lecturer / Faculty', 'Course instruction, attendance tracking, and marks/grades entry'),
('finance_officer', 'Finance & Bursar Officer', 'Fee structures, invoices, M-Pesa & bank reconciliation, and financial clearance'),
('student', 'University Student', 'Course enrollment, timetable access, exam result slips, and fee payments')
ON CONFLICT (code) DO NOTHING;

-- 2. GRADING SCALES (Standard 4.0 GPA System)
INSERT INTO grading_scales (grade, min_score, max_score, grade_point, description) VALUES
('A', 70.00, 100.00, 4.00, 'Excellent / First Class Distinction'),
('B+', 65.00, 69.99, 3.50, 'Very Good'),
('B', 60.00, 64.99, 3.00, 'Good / Upper Second Class'),
('C+', 55.00, 59.99, 2.50, 'Satisfactory'),
('C', 50.00, 54.99, 2.00, 'Pass / Lower Second Class'),
('D', 40.00, 49.99, 1.00, 'Pass (Subsidiary)'),
('E', 0.00, 39.99, 0.00, 'Fail')
ON CONFLICT (grade) DO NOTHING;

-- 3. SCHOOLS & FACULTIES
INSERT INTO schools (code, name, description) VALUES
('SCI', 'School of Computing & Informatics', 'Department of Computer Science, Software Engineering & Data Systems'),
('SOB', 'School of Business & Economics', 'Accounting, Finance, Management & Economics'),
('SOE', 'School of Engineering & Technology', 'Electrical, Mechanical & Civil Engineering')
ON CONFLICT (code) DO NOTHING;

-- 4. ACADEMIC YEARS & SEMESTERS
INSERT INTO academic_years (code, name, start_date, end_date, is_current) VALUES
('2026/2027', 'Academic Year 2026/2027', '2026-09-01', '2027-08-31', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO semesters (academic_year_id, semester_number, name, start_date, end_date, registration_deadline, is_current)
SELECT id, 1, 'Semester 1 (Fall 2026)', '2026-09-01', '2026-12-20', '2026-09-30', TRUE
FROM academic_years WHERE code = '2026/2027'
LIMIT 1;

-- 5. DEPARTMENTS
INSERT INTO departments (school_id, code, name)
SELECT s.id, 'CS', 'Department of Computer Science'
FROM schools s WHERE s.code = 'SCI'
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (school_id, code, name)
SELECT s.id, 'IT', 'Department of Information Technology'
FROM schools s WHERE s.code = 'SCI'
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (school_id, code, name)
SELECT s.id, 'FIN', 'Department of Finance & Accounting'
FROM schools s WHERE s.code = 'SOB'
ON CONFLICT (code) DO NOTHING;

-- 6. ACADEMIC PROGRAMS
INSERT INTO programs (department_id, code, name, level, duration_years, total_credit_requirements)
SELECT d.id, 'BSC-CS', 'Bachelor of Science in Computer Science', 'undergraduate', 4, 128
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO programs (department_id, code, name, level, duration_years, total_credit_requirements)
SELECT d.id, 'BBIT', 'Bachelor of Business Information Technology', 'undergraduate', 4, 120
FROM departments d WHERE d.code = 'IT'
ON CONFLICT (code) DO NOTHING;

-- 7. FOUNDATIONAL COURSES
INSERT INTO courses (department_id, code, title, description, credit_hours, level)
SELECT d.id, 'CSC101', 'Introduction to Computer Science & Algorithms', 'Fundamental algorithmic concepts and computational thinking', 3, 100
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO courses (department_id, code, title, description, credit_hours, level)
SELECT d.id, 'CSC102', 'Structured Programming in C/C++', 'Core imperative programming and data structures', 4, 100
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO courses (department_id, code, title, description, credit_hours, level)
SELECT d.id, 'CSC201', 'Object-Oriented Programming (Java/TypeScript)', 'Design patterns, OOP concepts and software construction', 3, 200
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO courses (department_id, code, title, description, credit_hours, level)
SELECT d.id, 'CSC301', 'Database Systems & Architecture', 'Relational theory, SQL, indexing, and transactional integrity', 3, 300
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO courses (department_id, code, title, description, credit_hours, level)
SELECT d.id, 'CSC401', 'Distributed Systems & Cloud Computing', 'Microservices, consensus algorithms, and cloud native architectures', 3, 400
FROM departments d WHERE d.code = 'CS'
ON CONFLICT (code) DO NOTHING;
