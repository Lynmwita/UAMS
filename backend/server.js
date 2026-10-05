const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UAMS Enterprise API Backend', timestamp: new Date().toISOString() });
});

// Authentication
app.post('/api/v1/auth/login', (req, res) => {
  const { email, role } = req.body;
  res.json({
    success: true,
    token: `uams_jwt_mock_${Date.now()}`,
    user: {
      id: 'usr-demo-01',
      email: email || 'admin@zetech.ac.ke',
      role: role || 'super_admin',
      first_name: 'Authorized',
      last_name: 'Officer',
    },
  });
});

// Students API
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

// Courses API
app.get('/api/v1/courses', (req, res) => {
  res.json({ success: true, count: courses.length, data: courses });
});

// Grades & Transcripts API
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

// Finance & M-Pesa STK Callback Webhook
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

app.post('/api/v1/finance/mpesa/callback', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'STK Callback processed and student ledger updated' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[UAMS Enterprise API] Server running on port ${PORT}`);
  });
}

module.exports = app;
