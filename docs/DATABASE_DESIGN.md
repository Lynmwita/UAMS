# 🗄️ UAMS Database Design & Entity Dictionary

## Entity Relational Overview

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned_to"
    ROLES ||--o{ ROLE_PERMISSIONS : "defines"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted_in"
    
    USERS ||--o| STUDENTS : "is_student"
    USERS ||--o| STAFF : "is_staff"
    STAFF ||--o| LECTURERS : "is_lecturer"

    SCHOOLS ||--o{ DEPARTMENTS : "contains"
    DEPARTMENTS ||--o{ PROGRAMS : "offers"
    PROGRAMS ||--o{ STUDENTS : "enrolled_in"
    
    DEPARTMENTS ||--o{ COURSES : "owns"
    COURSES ||--o{ COURSE_PREREQUISITES : "requires"
    PROGRAMS ||--o{ PROGRAM_COURSES : "includes"
    
    ACADEMIC_YEARS ||--o{ SEMESTERS : "contains"
    SEMESTERS ||--o{ COURSE_REGISTRATIONS : "period"
    STUDENTS ||--o{ COURSE_REGISTRATIONS : "enrolls"
    COURSES ||--o{ COURSE_REGISTRATIONS : "registered"
    
    COURSES ||--o{ ATTENDANCE_SESSIONS : "conducted"
    ATTENDANCE_SESSIONS ||--o{ ATTENDANCE_RECORDS : "tracks"
    STUDENTS ||--o{ ATTENDANCE_RECORDS : "attendance_for"
    
    STUDENTS ||--o{ STUDENT_GRADES : "earns"
    COURSES ||--o{ STUDENT_GRADES : "evaluated_in"
    STUDENTS ||--o{ STUDENT_SEMESTER_GPA : "summary"
    
    PROGRAMS ||--o{ FEE_STRUCTURES : "cost_breakdown"
    STUDENTS ||--o{ STUDENT_INVOICES : "billed_to"
    STUDENT_INVOICES ||--o{ TRANSACTIONS : "settles"
    TRANSACTIONS ||--o| MPESA_TRANSACTIONS : "mpesa_details"
    TRANSACTIONS ||--o| BANK_TRANSACTIONS : "bank_details"

    USERS ||--o{ AUDIT_LOGS : "performed_by"
```

## Tables & Roles Summary

1. **`users` & `roles`**: Central authentication, user profiles, and RBAC enforcement.
2. **`schools`, `departments`, `programs`**: Academic hierarchy from faculty down to degrees.
3. **`courses` & `course_prerequisites`**: Curricula, credit hours, prerequisites, and program course matrices.
4. **`students` & `guardians`**: Student admissions, biodata, contact points, and emergency relations.
5. **`staff`, `lecturers`, `course_allocations`**: Faculty management and semester teaching assignments.
6. **`course_registrations`**: Semester enrollment with approval states (`pending`, `approved`, `dropped`).
7. **`attendance_sessions` & `attendance_records`**: Daily/weekly attendance rolls with automatic percentage metrics.
8. **`student_grades`, `grading_scales`, `student_semester_gpa`**: CATs, final exams, 4.0 grading system, CGPA engine.
9. **`fee_structures`, `student_invoices`, `transactions`**: Comprehensive student ledger with M-Pesa & Bank reconciliation.
10. **`timetables`, `announcements`, `audit_logs`**: Lecture scheduling, broadcast notifications, and security audit log.
