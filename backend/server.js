const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { normalizeRole, isValidDemoCredential, buildDemoToken } = require('./src/auth');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.use(cors());
app.use(express.json());

// In-memory relational data store (synchronized with database DDL seed)
let students = [
  { id: 'stu-1', admission_number: 'BIT/2023/8849', first_name: 'Faith', last_name: 'Wanjiku', program: 'BSc Information Technology', level: 'Year 3 Sem 1', cgpa: 3.82, fee_balance: 0 },
  { id: 'stu-2', admission_number: 'BCS/2023/1204', first_name: 'Kevin', last_name: 'Otieno', program: 'BSc Computer Science', level: 'Year 2 Sem 2', cgpa: 3.65, fee_balance: 18500 },
  { id: 'stu-3', admission_number: 'BBA/2022/4412', first_name: 'Brian', last_name: 'Kiprono', program: 'Bachelor of Business Administration', level: 'Year 4 Sem 1', cgpa: 3.48, fee_balance: 0 },
];

let courses = [
  { code: 'BCS 311', title: 'Advanced Database Systems', credits: 3, level: 300, prereq: 'BCS 211', lecturer: 'Dr. Jane Mwangi' },
  { code: 'BIT 312', title: 'Distributed Systems & Cloud Computing', credits: 3, level: 300, prereq: 'BIT 220', lecturer: 'Prof. David Kamau' },
  { code: 'BCS 314', title: 'Software Engineering Architecture', credits: 4, level: 300, prereq: 'BCS 211', lecturer: 'Eng. Eric Ochieng' },
  { code: 'BCS 316', title: 'Network & System Security', credits: 3, level: 300, prereq: 'BIT 215', lecturer: 'Dr. Jane Mwangi' },
];

let grades = [
  { id: 'grd-1', admission_number: 'BIT/2023/8849', course_code: 'BCS 311', cat: 28, exam: 62, total: 90, grade: 'A', gpa: 4.0, status: 'Approved' },
  { id: 'grd-2', admission_number: 'BIT/2023/8849', course_code: 'BIT 312', cat: 26, exam: 58, total: 84, grade: 'A', gpa: 4.0, status: 'Approved' },
];

let transactions = [
  { ref: 'QHJ8917263', student: 'BIT/2023/8849', amount: 45000, channel: 'M-Pesa (522533)', date: '2026-09-15', status: 'verified' },
  { ref: 'BNK-KCB-9941', student: 'BIT/2023/8849', amount: 25000, channel: 'Bank Transfer', date: '2026-09-20', status: 'verified' },
];

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UAMS Enterprise API Backend',
    supabase: supabase ? 'connected' : 'demo-mode',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const role = normalizeRole(req.body?.role || 'student');

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return res.status(401).json({ success: false, error: error.message || 'Authentication failed.' });
      }

      return res.json({
        success: true,
        token: data?.session?.access_token || `supabase_${Date.now()}`,
        user: {
          id: data?.user?.id || 'supabase-user',
          email: data?.user?.email || email,
          role,
          first_name: data?.user?.user_metadata?.first_name || 'Authorized',
          last_name: data?.user?.user_metadata?.last_name || 'User',
        },
      });
    }

    if (!isValidDemoCredential(email, password, role)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials for the selected demo role.',
      });
    }

    const issuedToken = buildDemoToken(role);

    return res.json({
      success: true,
      token: issuedToken,
      user: {
        id: `usr-demo-${role}`,
        email,
        role,
        first_name: 'Authorized',
        last_name: 'User',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
  }
});

app.get('/api/v1/students', (req, res) => {
  res.json({ success: true, count: students.length, data: students });
});

app.post('/api/v1/students', (req, res) => {
  const { admission_number, first_name, last_name, program } = req.body;
  if (!admission_number || !first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'Missing required student fields' });
  }
  const newStudent = {
    id: `stu-${Date.now()}`,
    admission_number,
    first_name,
    last_name,
    program: program || 'BSc Computer Science',
    level: 'Year 1 Sem 1',
    cgpa: 0.0,
    fee_balance: 55000,
  };
  students.unshift(newStudent);
  res.status(201).json({ success: true, data: newStudent });
});

app.get('/api/v1/courses', (req, res) => {
  res.json({ success: true, count: courses.length, data: courses });
});

app.get('/api/v1/grades', (req, res) => {
  const { admission_number } = req.query;
  const filtered = admission_number ? grades.filter((g) => g.admission_number === admission_number) : grades;
  res.json({ success: true, data: filtered });
});

app.post('/api/v1/grades/enter', (req, res) => {
  const { admission_number, course_code, cat, exam } = req.body;
  const total = Number(cat) + Number(exam);
  let grade = 'E';
  let gpa = 0.0;
  if (total >= 70) { grade = 'A'; gpa = 4.0; }
  else if (total >= 60) { grade = 'B'; gpa = 3.0; }
  else if (total >= 50) { grade = 'C'; gpa = 2.0; }
  else if (total >= 40) { grade = 'D'; gpa = 1.0; }

  const newGrade = {
    id: `grd-${Date.now()}`,
    admission_number,
    course_code,
    cat: Number(cat),
    exam: Number(exam),
    total,
    grade,
    gpa,
    status: 'Submitted',
  };
  grades.push(newGrade);
  res.status(201).json({ success: true, data: newGrade });
});

app.post('/api/v1/finance/mpesa/stkpush', (req, res) => {
  const { phoneNumber, amount, accountReference } = req.body;
  const receipt = `QHJ${Math.floor(1000000 + Math.random() * 9000000)}`;
  const newTx = {
    ref: receipt,
    student: accountReference || 'BIT/2023/8849',
    amount: Number(amount) || 15000,
    channel: 'M-Pesa (522533)',
    date: new Date().toISOString().split('T')[0],
    status: 'verified',
  };
  transactions.unshift(newTx);
  res.json({
    success: true,
    MerchantRequestID: `MR-${Date.now()}`,
    CheckoutRequestID: `ws_CO_${Date.now()}`,
    ResponseDescription: 'Success. Request accepted for processing',
    CustomerMessage: `Success. Prompt sent for Paybill 522533, Account: ${accountReference}`,
    ReceiptNumber: receipt,
  });
});

let hostelAllocations = [
  { id: 'alc-01', student_name: 'Alex Kiptoo Kimutai', admission_number: 'BIT/2023/8849', room: 'A-101', hall: 'Kilimanjaro Hall', bed: 1, status: 'checked_in' },
];

let libraryBooks = [
  { id: 'bk-01', isbn: '978-0131103627', title: 'The C Programming Language', author: 'Brian Kernighan', total_copies: 15, available_copies: 12 },
  { id: 'bk-02', isbn: '978-0262033848', title: 'Introduction to Algorithms', author: 'Thomas Cormen', total_copies: 20, available_copies: 14 },
];

let examSchedules = [
  { id: 'exm-01', course_code: 'BCS 2101', title: 'Database Systems', date: '2026-10-15', venue: 'Multi-Purpose Hall A' },
  { id: 'exm-02', course_code: 'BCS 2102', title: 'Operating Systems Design', date: '2026-10-17', venue: 'Main Auditorium' },
];

let notificationLogs = [
  { id: 'ntf-01', recipient: '+254712345678', channel: 'sms', content: 'Fee payment receipt verified.', status: 'delivered' },
];

// Extended Module Endpoints
app.get('/api/v1/hostels', (req, res) => {
  res.json({ success: true, data: { allocations: hostelAllocations } });
});

app.post('/api/v1/hostels/allocate', (req, res) => {
  const { student_name, admission_number, room, hall, bed } = req.body;
  const newAllocation = {
    id: `alc-${Date.now()}`,
    student_name: student_name || 'Student',
    admission_number: admission_number || 'BIT/2023/8849',
    room: room || 'A-101',
    hall: hall || 'Kilimanjaro Hall',
    bed: Number(bed || 1),
    status: 'allocated',
  };
  hostelAllocations.push(newAllocation);
  res.status(201).json({ success: true, data: newAllocation });
});

app.get('/api/v1/library/books', (req, res) => {
  res.json({ success: true, count: libraryBooks.length, data: libraryBooks });
});

app.get('/api/v1/exams', (req, res) => {
  res.json({ success: true, count: examSchedules.length, data: examSchedules });
});

app.get('/api/v1/notifications', (req, res) => {
  res.json({ success: true, count: notificationLogs.length, data: notificationLogs });
});

app.post('/api/v1/notifications/send', (req, res) => {
  const { recipient, message, channel } = req.body;
  const newNotification = {
    id: `ntf-${Date.now()}`,
    recipient: recipient || '+254712345678',
    channel: channel || 'sms',
    content: message || 'UAMS Alert',
    status: 'delivered',
  };
  notificationLogs.unshift(newNotification);
  res.status(201).json({ success: true, data: newNotification });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[UAMS Enterprise API] Server running on port ${PORT}`);
  });
}

module.exports = app;

