# Database & Schema Specifications

This directory contains the core PostgreSQL & Supabase database scripts for UAMS.

### Scripts

1. **[`01_schema_init.sql`](file:///home/lynnaz/projects/uams/database/01_schema_init.sql)** — Complete PostgreSQL DDL defining 20+ core tables (roles, users, schools, departments, programs, courses, students, registrations, attendance, exams, grades, GPA, invoices, M-Pesa/Bank transactions, timetables, announcements, and audit logs).
2. **[`02_rls_policies.sql`](file:///home/lynnaz/projects/uams/database/02_rls_policies.sql)** — Row Level Security (RLS) policies for Supabase protecting student, faculty, financial, and admin data.
3. **[`03_seed_data.sql`](file:///home/lynnaz/projects/uams/database/03_seed_data.sql)** — Default fixtures (7 RBAC roles, standard 4.0 grading scale, sample schools, departments, degree programs, and core courses).

### Setup Instructions

Run the SQL files in sequential order directly in the Supabase SQL Editor:
```sql
\i database/01_schema_init.sql
\i database/02_rls_policies.sql
\i database/03_seed_data.sql
```
