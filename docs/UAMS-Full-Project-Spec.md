# UAMS — Full Project Specification

**What this document is:** the single master plan for UAMS — what the system is, what it already does, what it must become, and the order we build it in. Any developer (or AI builder) picking up this project should be able to read this one file and know exactly what "done" looks like.

- **Product:** UAMS — University Administration Management System
- **Owner / lead developer:** Nazline Mwita (GitHub: Lynmwita)
- **Repository:** github.com/Lynmwita/UAMS
- **Live deployment:** https://uams-plum.vercel.app
- **Companion app:** Student Life & Campus Hub (github.com/Lynmwita/student-life-campus-hub) — the student-facing app that receives *necessary* data from UAMS
- **Status date:** 24 October 2026 (Updated with Workforce & Operations Benchmark)

---

## 1. Vision — what UAMS should be

UAMS is the **registrar-side brain of a Kenyan university**: one web system where staff run admissions, students, courses, timetables, attendance, grades, exams, finance, hostel, library, events and communication — safely, honestly, and in full compliance with Kenyan law (KDPA 2019), Kenyan admissions reality (KUCCPS), and Kenyan student funding reality (HELB / HEF / bursaries).

**Whole-workforce system, not just the academic side.** UAMS serves **every kind of university staff**, not only lecturers and office administrators. The teaching staff are one category among many: cleaners, library attendants, security officers, drivers, cooks and catering staff, laboratory and workshop technicians, gardeners and grounds staff, hostel staff, ICT support, clerks, messengers — **any role a university employs** must fit in this system with its own records, department, supervisor, duty roster and permissions. If a person works for the university, UAMS can hold their record and their department can manage their work in it.

UAMS also carries the HR lifecycle for all staff: attendance, leave, contracts, Kenya-statutory payroll, recruitment and appraisal. A staff registry without these leaves HR and Finance on spreadsheets — the failure mode every leading system is built to remove.

It must never be "left behind" by the big systems (Ellucian Banner, PowerSchool, Blackbaud, OpenEduCat, Fedena, Classter). The benchmark gaps in Section 7, built in the order in Section 8, are how it stays ahead — **smartly**: only necessary features, no bloat.

### The 5 standing rules (never break these)

1. **Sync only the necessary.** UAMS syncs data to the Student Hub app, but ONLY student-facing data a student genuinely needs. Admin, finance internals, audit, compliance and staff data stay inside UAMS.
2. **Honest status, always.** The system must never fake success. If an SMS did not really send, the screen must say so (mock/sandbox is labelled, never dressed up as live). Numbers reported must be exact.
3. **KDPA 2019 by design.** Personal data is collected for a stated purpose, secrets never travel over plain SMS, and every sensitive action is auditable.
4. **Financial brakes on anything that spends money.** Sending SMS burns airtime: sandbox by default, live sending behind an explicit server flag, and a hard retry cap.
5. **Server-side secrets only.** No API key ever reaches the browser. No `NEXT_PUBLIC_` prefix on any credential.

---

## 2. Who uses it — roles

| Role | What they do in UAMS |
|---|---|
| Super Admin | Everything; system configuration, structure, audit |
| Admin | Day-to-day administration across modules |
| Registrar | Students, admissions, records, ID cards, graduation |
| Finance Officer | Fee statements, invoices, funding (HELB/HEF/bursaries), clearance |
| Lecturer / Staff | Attendance, grades, courses, timetable |
| Department heads & supervisors (academic AND non-academic) | Manage their own teams: staff records, duty rosters/shifts, staff attendance, leave requests for their departments — e.g. Head of Security, Head of Library Services, Estates/Cleaning Supervisor, Catering Manager, Transport Officer |
| Non-teaching staff (all categories) | Every employee who is not a lecturer: cleaners, library attendants, security officers, drivers, cooks/catering staff, lab & workshop technicians, gardeners/grounds staff, hostel staff, clerks, ICT support, messengers. Their records, departments, supervisors, rosters and permissions live in UAMS exactly like teaching staff. Many will never log in themselves — their supervisor manages their roster and attendance — but the system must fully cover them |
| Student (indirect) | Students do NOT work in UAMS; they use the Student Hub app, which receives the necessary data from UAMS |

Access is role-based and enforced **on the server**. Unauthenticated requests get 401; users acting outside their role get 403.

---

## 3. Architecture — how it is built

- **Frontend:** Next.js 15 + React + TypeScript + Tailwind CSS, in `frontend/`, deployed on Vercel.
- **Database:** Supabase (PostgreSQL). SQL migrations live in `supabase/migrations/`. Database changes ship as migration files and are applied deliberately — never silently.
- **Two execution paths** (both must keep working):
  - **Demo path** — demo actors (IDs starting `usr-`) run against in-memory stores so the system can be demonstrated and tested without a database.
  - **Institutional path** — real actors work against Supabase through the institutional API / `uams_workflow` RPC. Student records read from the `uams_student_records` view (students + users).
- **API style:** versioned JSON endpoints under `/api/v1/...`, success/error envelope, server-side validation.
- **Student Hub sync:** a registrar feed endpoint (`/api/v1/integrations/hub`) exposes only the fields the Hub needs. A field joins the feed only if it passes Rule 1 (necessary for students) — e.g. the student photo syncs ONLY when it is an `https` URL, never as raw uploaded data.
- **Testing:** automated test suite (Node test runner via tsx) covering API routes, business rules and safety catches; TypeScript must be clean and the production build must pass before anything is called "done".

---

## 4. Module map — the 20 dashboard areas

UAMS is organised into 20 dashboard areas. This is what each one is for and what "complete" means:

| # | Area | Purpose — what it should do |
|---|---|---|
| 1 | Dashboard | Live overview for staff: counts, pending work, alerts (at-risk students, failed deliveries, arrears) |
| 2 | Students | Full student registry: register/edit students, ONE profile photo per student (same photo on profile + ID card), printable ID cards (front + back), search, class lists |
| 3 | Staff | **The whole workforce registry — every staff category, teaching and non-teaching alike:** lecturers, cleaners, library attendants, security officers, drivers, cooks, technicians, gardeners, hostel staff, clerks, ICT support. Staff attendance link, leave management, contracts with expiry tracking, recruitment/onboarding, appraisal, and disciplinary records. One employee master for everyone — categorised academic / administrative / technical / operations — with position vs approved establishment (position control). |
| 4 | Admissions | Applications, intake processing, KUCCPS placement import (Roadmap Step 2 / A1) and public applicant portal |
| 5 | Courses | Course catalogue, units, programmes |
| 6 | Timetable | Teaching timetable; the finished timetable syncs to the Hub (auto-generation is a later nice-to-have) |
| 7 | Attendance | Class attendance for students AND duty attendance for staff — shift check-in/out and roster adherence for round-the-clock teams (security, cleaning, catering, hostel, library desks). Biometric / RFID / shared-terminal clock-in for deskless staff (designed for people with no desk or login), leave balances with supervisor approval, and payroll link: unpaid absence automatically becomes a Loss-of-Pay deduction. Student side feeds at-risk alerts (Roadmap Step 4 / A5). |
| 8 | Grades | Grade entry, transcripts, results publishing |
| 9 | Exams | Exam scheduling, exam cards, clearance-gated card release |
| 10 | Finance | Fee statements, invoices, payments visibility, funding sources — HELB/HEF/bursaries (Roadmap Step 3 / A2). M-Pesa Daraja auto-reconciliation: paybill/till payments with admission/registration number as account reference post themselves to student accounts in seconds with automatic receipts. Correct balances are critical: exam clearance depends on them. |
| 11 | Announcements | Institutional announcements (persistent, can be withdrawn) |
| 12 | Events | University events management |
| 13 | Hostel | Accommodation / hostel allocation |
| 14 | Library | Library records |
| 15 | Reports | Institutional reports and exports |
| 16 | Audit | Audit trail of sensitive actions (who did what, when) |
| 17 | Support | Support inbox, including messages arriving from the Student Hub |
| 18 | Notifications | SMS + Email dispatch centre with live telemetry, retries and cost tracking (Roadmap Step 1 / A3 — built, see Section 6) |
| 19 | Structure | The whole university structure: faculties, departments and programmes **plus all non-academic units** — security, estates & cleaning, catering, transport, library services, health services, ICT, administration. Every staff record hangs off a unit here, and every unit has a head/supervisor |
| 20 | AI | AI assistance features inside the dashboard |

### 4.1 Staff ID Cards
The ID-card system (built for students in Section 6.1) extends to staff: **one staff ID** used at the gate, for attendance, library, clinic and meals. Same one-photo rule as students.

---

## 5. Key data the system holds

- **Users & roles** (`users`, incl. `avatar_url` — the one student/staff photo)
- **Staff records for every category** (teaching + non-teaching): category, department/unit, supervisor, duty rosters/shifts, staff attendance — a cleaner, a security officer and a lecturer are all first-class staff records
- **Employment contracts & service records** (joining → exit), leave balances, duty rosters/shifts, payroll runs with statutory deductions
- **Publications register** (staff ID + DOI + year — CUE requires it, see Roadmap Step 5)
- **Students** (registration number as the sync identity key — read-only after creation; duplicate records are a known risk to guard against)
- **Programmes, courses, units, enrolments**
- **Attendance & grades**
- **Fee invoices, statements, funding records** (HELB / Universities Fund (HEF) / CDF & county bursaries / sponsors) and M-Pesa auto-reconciled receipts
- **Notification logs** (`notification_logs` — recipient, channel, provider, provider message ID, status, cost, error, attempt count)
- **Announcements, events, hostel, library records**
- **Audit log**
- **(Roadmap)** KUCCPS placement imports, applicant records, degree-audit rules, KDPA registers (consent, data-subject requests, breach log), CUE/UEMIS statutory templates, operations records (fleet, inventory, work orders).

---

## 6. Built features — the current state (verified)

### 6.1 Student ID card + one profile photo — BUILT ✅ (code complete)

One photo per student, used everywhere:

- **Register Student** has a photo upload (image is cropped/resized in the browser to max 512px) with a **live ID card preview** while registering.
- The **same photo** appears as: the student's list avatar (initials shown when no photo), the profile photo, the **on-screen ID card** (viewer shows front + back), and the **printed PDF ID card**.
- **Edit Student** can change or remove the photo.
- Institutional path stores the photo in `users.avatar_url`. Database migration `20261023120000_student_photo_id_card.sql` exposes it through the records view as `photo_url`/`avatar_url` — **this migration must be run in Supabase at deploy time.**
- Hub sync: `photo_url` is included in the registrar feed **only when it is an https URL** (Rule 1).
- Verified: TypeScript clean, test suite green, production build passed.

### 6.2 A3 — Real SMS & Email Dispatcher — BUILT ✅ (code complete)

Notifications stop being theatre: they actually send, and the screen tells the truth about it.

- **SMS:** Africa's Talking gateway (server-side keys `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`; sandbox host auto-detected). Kenyan numbers are normalised to E.164 (`+254...`, accepting `07...`, `01...`, `254...`, `+254...`) and malformed numbers are rejected before dispatch.
- **Email:** Resend API or SMTP (Nodemailer), server-side keys only.
- **Honest modes:** with no keys configured the dispatcher runs in clearly-labelled **MOCK** mode. The page header shows the real gateway state (Live / Sandbox / Mock) — never a hard-coded "Online".
- **Telemetry:** every notification records status (queued → sent / failed), provider, provider message ID, cost, attempt count and the exact delivery error. Failed/queued items have a **Retry** button.
- **Portal-first templates:** built-in presets (Fee Update, Exam Card Ready, Admissions) worded so students log into the portal instead of receiving sensitive details by SMS.

**The 3 safety catches (part of the spec — do not remove):**

1. **Zero browser key exposure** — keys are read from `process.env` on the server only; nothing secret appears in client bundles or API responses.
2. **Financial brakes** — live SMS requires `ENABLE_LIVE_SMS=true` on the server; without it, sends are simulated in sandbox (IDs like `ATXid_sbx_...`, segment-based cost) and **no airtime is burned**. **Hard cap: 3 total attempts** per notification; the 4th retry is rejected (HTTP 400, "Maximum retry limit of 3 reached") and the UI button locks. GSM-7 cost accounting: KES 0.80 per segment (160 chars first segment, 153 after).
3. **Content guard (KDPA)** — outgoing SMS is scanned and **blocked** if it contains cleartext passwords, PINs, OTP/token values, bank card numbers or raw bank account numbers. Students are directed to the portal instead.

- Verified: full test suite passing, TypeScript clean, production build passed.
- **go-live step (deploy time only):** add the Africa's Talking keys to the Vercel environment, keep `ENABLE_LIVE_SMS=false` until sandbox testing is done, then flip it deliberately.

### 6.3 A1 — KUCCPS Bulk Import & Public Applicant Portal — BUILT ✅ (code complete)

- **KUCCPS Bulk Import:** CSV placement parser with column mapping, duplicate detection (registration number, ID, index number), error reporting per row, and automated intake conversion.
- **Public Applicant Portal:** Live applicant interface at `/apply` and `/apply/letter/[id]` for direct online application submission, document uploads, and real-time status tracking at `/api/v1/admissions/public-status`.
- **Registrar Review:** Admissions dashboard modal with applicant filtering, offer letter generation, and one-click student conversion without retyping.

---

## 7. Benchmark position — how UAMS compares

UAMS was benchmarked (October 2026) against Ellucian Banner, PowerSchool, Blackbaud, OpenEduCat, Fedena and Classter, plus Kenyan requirements (KUCCPS, HELB/HEF, KDPA 2019). Full detail: `UAMS_BENCHMARK_GAPS.md`.

**Already present — do NOT rebuild:** student/staff registry, courses, timetable, attendance, grades, exams, finance statements, announcements, events, hostel, library, reports, audit, support (incl. Hub inbox), notifications queue + UI, structure, AI area, PDF ID cards and transcripts, Hub sync feed.

**Tracked gaps:** inventory/assets/stores + procurement, maintenance & facilities work orders, canteen/mess management, visitor/gate management, health-centre records, staff housing (rare everywhere — last priority), committee/Senate-Council meeting records (no benchmark has it — differentiator, not a gap).

**Later (nice to have, only after Roadmap):** automatic timetable generator, online exams/proctoring (via the LMS, not built-in), parent/guardian view, verifiable digital documents (QR-verified transcripts/certificates — small build, strong trust signal), postgraduate research tracking.

---

## 8. The Roadmap — build one by one, in this order (11 Steps)

Each item is finished only when: it is built, tests pass, TypeScript is clean, the production build passes, and the result is reviewed before anything is published or pushed live.

### Step 1 — A3: Real SMS & Email Dispatcher ✅ BUILT (see 6.2)
Africa's Talking SMS + email gateway, queue/status worker on `notification_logs`, delivery telemetry, retries, and the 3 safety catches (key isolation, financial brakes, content guard). **Hub sync: NO** (admin tooling; students only receive the messages).

### Step 2 — A1: KUCCPS Bulk Import & Applicant Portal ✅ BUILT (see 6.3)
- Bulk CSV import of KUCCPS placement lists for the September intake, with validation, duplicate detection (registration number / ID / index number), and a clear import report (imported / skipped / why).
- A public applicant portal: apply online, upload documents, track application status.
- Admitted applicants convert into student records **without re-typing**.
- **Course history versioning:** student institution/course history is versioned, never overwritten — HELB requires updates during allocation windows when students transfer, and corrections become impossible after disbursement starts.
- Hub sync: NO for the portal/import internals; a student appears in the Hub only after becoming a registered student.

### Step 3 — A2: HEF / HELB & Bursary Tracking + M-Pesa Auto-Reconciliation
- **M-Pesa Daraja auto-reconciliation:** paybill/till payments with admission/registration number as the account reference post themselves to the student account in seconds, with automatic receipts; no manual bursar posting.
- **HELB & funding sources:** HELB batch reconciliation (disbursement batches vs student records), scholarship/loan/household split, CDF/county bursaries, sponsors, and enrolment-status export for HEF/HELB.
- Batch-post funding against fee invoices so balances are correct — a wrong balance wrongly blocks exam clearance, so accuracy here is a correctness feature, not a nicety.
- Funding visible to finance staff with full audit trail.
- Hub sync: PARTLY — a student's own balance and receipts only; funder internals stay in UAMS.

### Step 4 — A5: Degree Progress & At-Risk Alerts
- Automated degree audit: passed vs required credits per programme, so a student/staff can see exactly what remains to graduate.
- Early-warning flags: attendance below 75%, falling GPA, fee arrears — surfaced on the staff dashboard while there is still time to help.
- Hub sync: YES for the student's own progress view; staff alert lists stay in UAMS.

### Step 5 — A4: KDPA 2019 Compliance Suite + CUE / UEMIS Reporting Pack
- **KDPA 2019 suite:** data-subject request register (access, correction, deletion), consent tracking, data retention enforcement, and 72-hour ODPC breach log. Must cover HR/health/biometric processing, not only student data.
- **A4b — CUE / UEMIS reporting pack:** separate from KDPA suite (do not mark compliance done without it). Enrolment returns, Teaching Staff and Non-Teaching Staff templates, graduations, publications register (staff ID + DOI + year), discipline — disaggregated by gender/qualification/tenure, plus derived reports (staff-student ratios, library holdings per student). CUE is the university regulator; these returns are mandatory.
- Hub sync: NO (compliance internals are UAMS-only).

### Step 6 — W1: Workforce & HR Lifecycle
- One categorised employee master (academic, administrative, technical, operations, casuals).
- Supervisor hierarchy and department assignment.
- Employment contracts with expiry alerts and renewal tracking.
- Recruitment & establishment / position control (approved vs actual).
- Onboarding → probation → appraisal → disciplinary records → exit clearance.
- Hub sync: NO.

### Step 7 — W2: Staff Attendance, Leave, Rostering & Kenya Payroll
- Shift & duty rosters for 24-7 services (security, hostel, clinic, library, catering, drivers) with relief cover and overtime / comp-off.
- Biometric / RFID / shared-terminal clock-in for deskless staff; attendance + leave feeding payroll with Loss-of-Pay deductions.
- Kenya statutory payroll: PAYE tax bands, SHIF 2.75%, NSSF (2026 UEL KES 108,000), Housing Levy 1.5% employee + 1.5% employer, NITA KES 50, casual wages, payslips, P9 forms, remittances by the 9th.
- ⚠️ **Disputed statutory date note:** employer P10 annual return (end-Feb vs 30 June in sources) — verify directly with KRA before building payroll; do not hard-code either date yet.
- Hub sync: NO.

### Step 8 — B1: LMS / E-Learning Connection
- Connect UAMS to Moodle/Canvas: course mapping, single sign-on, automated grade pass-back into UAMS grades.
- UAMS stays the record of truth; the LMS is the classroom.
- Hub sync: PARTLY — course links/SSO entry points for students.

### Step 9 — B2: Industrial Attachment & Placement
- Company opportunity listings, student applications, digital logbooks, lecturer supervisor visits and assessment workflows.
- Hub sync: YES for opportunities and the student's own logbook (students need these); assessment internals stay staff-side until released.

### Step 10 — B3: Graduation Clearance & Alumni Hub
- Multi-department final clearance checklist (library, finance, hostel, departments) before graduation.
- Graduation lists and ceremony data.
- Alumni records and tracer tracking (where graduates go, employment outcomes).
- Hub sync: PARTLY — a student's own clearance status is necessary for the student.

### Step 11 — O1: Operations Pack
- **Transport & fleet:** vehicle records, driver assignment, insurance & licence expiry alerts.
- **Inventory / assets / stores & procurement:** purchase requisitions, supplier master, stock balances.
- **Maintenance & facilities:** work order creation, assignment, tracking and completion.
- **Canteen & mess management:** meal accounts, POS integration.
- **Visitor & gate management:** gate logs, visitor passes.
- Health-centre records and staff housing documented as later/optional.
- Hub sync: NO (transport routes/times for students may sync as announcements only, if ever needed).

---

## 9. Non-functional requirements — true at every step

- **Security:** server-side RBAC on every API route; secrets only in environment variables; no secret in any client bundle or API response (verify by search before release).
- **Privacy (KDPA):** collect the minimum; the content-guard principle extends to all outbound channels; audit sensitive reads/writes.
- **Honesty:** statuses, costs and counts shown in the UI must be real. Mock/sandbox is always labelled. If a provider fails, the error is recorded and shown, never swallowed.
- **Money safety:** any feature that can spend (SMS, airtime, paid APIs) ships sandbox-first, with explicit live flags and hard caps.
- **Quality gate:** new feature = new tests; full suite green; `tsc` clean; production build green. Report exact test counts, never rounded claims.
- **Kenyan fit:** phone numbers normalised to +254 E.164; currency KES; KUCCPS/HELB/HEF/KDPA concepts are first-class, not afterthoughts.
- **Statutory accuracy rule:** payroll rates and deadlines are loaded from verified KRA/NSSF/SHA sources at build time and re-verified each year; no statutory figure ships on a blog's word alone.
- **Deskless-first rule:** any staff feature must work for staff with no desk, no email and no login (supervisor or shared-terminal capture), or it does not ship.

---

## 10. Deployment checklist (per release)

1. Run the full test suite, TypeScript check and production build; record exact numbers.
2. Apply any new SQL migrations in Supabase (currently pending: `20261023120000_student_photo_id_card.sql` and `20261023120000_notification_dispatch_brakes.sql`).
3. Set environment variables in Vercel (messaging keys documented in `.env.example`; keep `ENABLE_LIVE_SMS=false` until sandbox is proven).
4. Push code through reviewed pull requests only — the canonical build lives in the GitHub repository; any local/offline build is a backup, never the source of truth.
5. Verify on the live deployment (uams-plum.vercel.app) as a real role (e.g. Registrar) before announcing.

---

## 11. Related systems

- **Student Life & Campus Hub** — the student app on top of UAMS data. Architecture locked: no self-signup (the registrar provisions accounts and roles), UAMS is the source of truth, and only necessary data syncs (Rule 1). Students see: profile (incl. photo), timetable, courses, results, fees visibility (balances + official paybill/till — no in-app payments), announcements, clubs, sports, events, careers/attachments, accommodation, food spots, wellbeing, moderated marketplace.
- **Sentinel OS** — the founder's personal/company OS where published content and work on this project are tracked.

---

## 12. One-paragraph summary (for sharing)

UAMS is a Kenyan university administration system (Next.js + Supabase, live on Vercel) covering students, admissions, academics, finance, hostel, library, operations and communication across 20 dashboard areas — serving the **whole university workforce**, teaching and non-teaching alike (lecturers, cleaners, library attendants, security, drivers, cooks, technicians, and all operational staff) — with the Student Hub app receiving only student-necessary data. It is hardened to world-class level through an 11-step benchmark roadmap: real SMS/email dispatch with anti-fraud safety catches (done), KUCCPS import and applicant portal (done), HELB/HEF tracking and M-Pesa auto-reconciliation, degree-progress and at-risk alerts, KDPA and CUE/UEMIS compliance suite, workforce & HR lifecycle, staff attendance and Kenya statutory payroll, LMS connection, attachment & placement, graduation clearance with alumni tracking, and operations (fleet, inventory, work orders) — built one step at a time, each fully tested before the next begins.
