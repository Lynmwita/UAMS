# 📡 UAMS REST API Specification

All API endpoints are hosted under `/api/v1` and enforce Bearer JWT authentication and Role-Based Access Control (RBAC).

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/login`
- **Body:** `{ "email": "admin@university.ac.ke", "password": "securepassword" }`
- **Response `200 OK`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "c1f7a8e2-...",
    "email": "admin@university.ac.ke",
    "role": "super_admin",
    "first_name": "System",
    "last_name": "Admin"
  }
}
```

### `POST /api/v1/auth/logout`
- Invalidate session token and purge secure auth cookies.

---

## 2. Academic & University Hierarchy

- `GET /api/v1/schools` — List all schools/faculties
- `POST /api/v1/schools` — Create new school (Admin only)
- `GET /api/v1/departments` — List departments (filterable by `school_id`)
- `GET /api/v1/programs` — List academic degree programs
- `GET /api/v1/courses` — List courses (supports pagination, level filtering)
- `POST /api/v1/courses` — Create a course with credit hours and prerequisites

---

## 3. Student & Enrollment Management

- `GET /api/v1/students` — Search and filter enrolled students
- `POST /api/v1/students` — Register new student with admission number, program, and biodata
- `GET /api/v1/students/:id` — Fetch complete student profile, registered courses, invoices & GPA
- `PUT /api/v1/students/:id` — Update student profile / academic standing

---

## 4. Course Registration & Approval

- `GET /api/v1/courses/available` — Fetch courses open for registration in the active semester
- `POST /api/v1/courses/register` — Submit student course enrollment
- `POST /api/v1/courses/approve` — Registrar / HOD bulk approval of course registration

---

## 5. Attendance & Examinations

- `POST /api/v1/attendance/sessions` — Lecturer creates an attendance session for a class
- `POST /api/v1/attendance/mark` — Submit batch student attendance (`present`, `absent`, `late`, `excused`)
- `POST /api/v1/grades/enter` — Lecturer marks entry (CAT + Final Exam scores)
- `POST /api/v1/grades/approve` — Registrar seals and approves semester grades
- `GET /api/v1/results/transcript/:student_id` — Generate and download official academic transcript

---

## 6. Financial Management & Payments

- `GET /api/v1/finance/invoices/:student_id` — Fetch student invoice and balance breakdown
- `POST /api/v1/finance/mpesa/stkpush` — Trigger Safaricom Daraja STK Push to student mobile
- `POST /api/v1/finance/mpesa/callback` — Daraja STK push callback handler (Webhook)
- `POST /api/v1/finance/bank/record` — Record manual or slip-based bank deposit
- `POST /api/v1/finance/reconcile` — Finance officer reconciliation and receipt generation
