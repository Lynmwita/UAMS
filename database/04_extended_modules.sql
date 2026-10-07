-- =============================================================================
-- University Administration Management System (UAMS)
-- Phase 3: Extended Institutional Modules Database Schema
-- Modules: Hostel/Accommodation, Library Management, Exam Scheduling & Clearance, SMS/Notification Dispatch
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HOSTEL & ACCOMMODATION MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostel_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g. H-BLOCK-A, H-BLOCK-B
    name VARCHAR(100) NOT NULL, -- e.g. Kilimanjaro Hall (Male), Mara Hall (Female)
    gender_designation VARCHAR(10) CHECK (gender_designation IN ('male', 'female', 'mixed')),
    total_floors INT DEFAULT 4,
    total_capacity INT NOT NULL,
    warden_name VARCHAR(150),
    warden_phone VARCHAR(25),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES hostel_blocks(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL, -- e.g. A-101, B-204
    floor_number INT NOT NULL,
    capacity INT DEFAULT 4,
    occupied_beds INT DEFAULT 0,
    semester_fee NUMERIC(10, 2) NOT NULL DEFAULT 15000.00,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(block_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    room_id UUID REFERENCES hostel_rooms(id) ON DELETE RESTRICT,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    bed_number INT NOT NULL,
    check_in_date TIMESTAMPTZ,
    check_out_date TIMESTAMPTZ,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cleared', 'waived')),
    status VARCHAR(20) DEFAULT 'allocated' CHECK (status IN ('allocated', 'checked_in', 'checked_out', 'cancelled')),
    allocated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, semester_id)
);

-- -----------------------------------------------------------------------------
-- 2. DIGITAL LIBRARY MANAGEMENT SYSTEM
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(150),
    edition VARCHAR(50),
    category VARCHAR(100) NOT NULL, -- e.g. Computer Science, Accounting, Law
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    shelf_location VARCHAR(50), -- e.g. FL2-ST4-B
    is_ebook_available BOOLEAN DEFAULT FALSE,
    ebook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES library_books(id) ON DELETE RESTRICT,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    borrow_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost')),
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES library_loans(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(255) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    receipt_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. AUTOMATED EXAM SCHEDULING & FINANCIAL CLEARANCE CARDS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue VARCHAR(100) NOT NULL, -- e.g. Multi-Purpose Hall A, Lab 3
    chief_invigilator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_enrolled INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_clearance_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    card_serial_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. EXAM-2026-SEP-8849
    fee_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    clearance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    is_cleared BOOLEAN DEFAULT FALSE,
    security_qr_token VARCHAR(255) UNIQUE NOT NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, semester_id)
);

-- -----------------------------------------------------------------------------
-- 4. SMS & EMAIL NOTIFICATION DISPATCH ENGINE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('student', 'guardian', 'lecturer', 'staff', 'broadcast')),
    recipient_identifier VARCHAR(100) NOT NULL, -- phone number or email address
    channel VARCHAR(20) CHECK (channel IN ('sms', 'email', 'in_app', 'push')),
    subject VARCHAR(200),
    message_content TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'africas_talking', -- e.g. africas_talking, twilio, sendgrid, aws_ses
    provider_message_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    error_message TEXT,
    cost NUMERIC(8, 4) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended Indexes
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_block ON hostel_rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_student ON library_loans(student_id);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_course ON exam_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_clearance_student ON exam_clearance_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR EXTENDED MODULES
-- =============================================================================

ALTER TABLE hostel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_clearance_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 1. Hostel Policies
CREATE POLICY "Public read for active hostel blocks"
    ON hostel_blocks FOR SELECT
    USING (is_active = TRUE OR auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Admins and registrars manage hostel blocks"
    ON hostel_blocks FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Public read for hostel rooms"
    ON hostel_rooms FOR SELECT
    USING (is_available = TRUE OR auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Admins manage hostel rooms"
    ON hostel_rooms FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

CREATE POLICY "Students view own hostel allocation"
    ON hostel_allocations FOR SELECT
    USING (student_id = auth_student_id() OR auth_user_role() IN ('super_admin', 'admin', 'registrar', 'dean'));

CREATE POLICY "Admins and registrars manage hostel allocations"
    ON hostel_allocations FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar'));

-- 2. Library Policies
CREATE POLICY "Public read for active library books"
    ON library_books FOR SELECT
    USING (is_active = TRUE OR auth_user_role() IN ('super_admin', 'admin', 'librarian'));

CREATE POLICY "Admins manage library catalog"
    ON library_books FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'librarian'));

CREATE POLICY "Students view own library loans"
    ON library_loans FOR SELECT
    USING (student_id = auth_student_id() OR auth_user_role() IN ('super_admin', 'admin', 'librarian'));

CREATE POLICY "Librarians manage library circulation"
    ON library_loans FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'librarian'));

-- 3. Exam Schedule & Clearance Policies
CREATE POLICY "Authenticated users view exam schedules"
    ON exam_schedules FOR SELECT
    USING (status != 'draft' OR auth_user_role() IN ('super_admin', 'admin', 'registrar', 'dean', 'lecturer'));

CREATE POLICY "Registrars and deans manage exam schedules"
    ON exam_schedules FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar', 'dean'));

CREATE POLICY "Students view own exam clearance card"
    ON exam_clearance_cards FOR SELECT
    USING (student_id = auth_student_id() OR auth_user_role() IN ('super_admin', 'admin', 'registrar', 'finance_officer'));

CREATE POLICY "Registrars and finance manage exam clearance cards"
    ON exam_clearance_cards FOR ALL
    USING (auth_user_role() IN ('super_admin', 'admin', 'registrar', 'finance_officer'));

-- 4. Notification Policies
CREATE POLICY "Users view relevant notifications"
    ON notification_logs FOR SELECT
    USING (
        recipient_type = 'broadcast'
        OR auth_user_role() IN ('super_admin', 'admin', 'registrar', 'finance_officer')
    );

CREATE POLICY "Staff dispatch notifications"
    ON notification_logs FOR INSERT
    WITH CHECK (auth_user_role() IN ('super_admin', 'admin', 'registrar', 'finance_officer', 'hod'));

