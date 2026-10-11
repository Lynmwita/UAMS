# UAMS role access plan

Access follows each person's responsibilities. Roles do not inherit access merely because one role ranks above another. Super Admin is the explicit system-wide exception.

| Role | Allowed work | Boundaries |
| --- | --- | --- |
| Super Admin | All modules, security oversight, system administration | Use for designated technical administrators, not everyday staff accounts |
| Admin | University structure, student records, curriculum, exam/timetable coordination, grade approval, housing/library administration, announcements, audit and financial oversight | Cannot enter marks or reconcile payments |
| Registrar | Student records, curriculum and registration, exam/timetable coordination, grade approval, housing/library services and academic announcements | Cannot enter marks, reconcile payments, view the general audit ledger or manage accounts/roles |
| HOD | Department student records, department course enrollments, department grade review/approval, attendance oversight and academic schedules | Cannot edit the university catalogue, enter lecturer marks, reconcile fees or publish institution-wide notices |
| Lecturer | Assigned-course grades, rosters and attendance; academic schedules and library catalogue | Cannot approve grades, edit institutional schedules, register students or view finance and general student records |
| Finance Officer | Student identity and billing balance, bank entries and reconciliation, M-Pesa requests, billing notifications | No GPA/program details, marks, curriculum, housing, general audit or role administration |
| Student | Own profile, approved results, own course requests, own attendance, fees, housing reservation and library loans; published announcements | Cannot create courses, enter/approve marks, schedule exams, reconcile payments, change another person's records or choose a privileged role |

## Enforcement

- Credentials determine the role. The selected login role must match the account. URL parameters never grant access.
- Institutional accounts use Supabase Auth; authorization reads administrator-controlled `app_metadata.role`, never editable `user_metadata`.
- `app_metadata.disabled: true` blocks an institutional account. Unknown/missing roles fail closed.
- Page layouts validate the server session; navigation and action buttons use the same policy.
- Every mutation checks the authenticated role and CSRF origin before changing records.
- Students' course requests, library returns and housing reservations are limited to their identity. Payment requests and status reads are limited to authorized accounts.
- Lecturer allocations and HOD departments are applied in API filtering and mutation checks. The demo lecturer teaches BCS 311 and BCS 316. The demo HOD oversees Computer Science (BCS).
- Submitted grades are separate from approved grades. Students see approved grades only.
- Finance sees a limited student projection. General audit access belongs to Admin and Super Admin.
- The legacy Express payment simulation is disabled; use the Next.js payment implementation.

## Payment behavior

The STK endpoint performs Daraja OAuth and requests a real M-Pesa prompt. It does not fabricate checkout IDs, receipts or successful payments. Callback processing checks a secret, checkout/merchant IDs, phone and amount, then queries Daraja before recording settlement. Receipt uniqueness and conditional status updates protect against duplicate settlement. The frontend polls status and shows pending/failed/confirmed states.

Configure `MPESA_ENVIRONMENT`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` and `MPESA_CALLBACK_SECRET`. The callback URL must be publicly reachable over HTTPS. Use a random callback secret of at least 32 characters. Configure `NEXT_PUBLIC_MPESA_SHORTCODE` to match the approved shortcode for displayed payment instructions.

Apply `database/payment_ledger_setup.sql` to the correct UAMS database and set `SUPABASE_SERVICE_ROLE_KEY` on the server. The ledger has RLS enabled and grants no client access. Production requires persistent storage. Development can use memory when no database credentials exist. Unconfigured or unavailable integrations return errors rather than simulated success.

Receipt recording is implemented. Automatically allocating receipts to invoices and recalculating institutional balances still requires a transactional invoice adapter; the sample finance totals are explicitly labelled demonstration data. Delayed callbacks, ambiguous provider timeouts and orphaned requests need finance review before retrying a payment. Daraja status-query failures leave the payment uncredited and return a retryable callback error.

Demo accounts cannot initiate live M-Pesa payments or read another account's persistent payment status. They can test the sandbox. Transcript PDFs are labelled results previews, not official signed credentials, and are unavailable to Lecturer/HOD accounts.

## Institutional configuration and remaining work

The academic modules in this repository originally used in-memory fixtures. Their UI mutations now go through authorized APIs. They remain demonstration stores, not a production university database. Institutional accounts are blocked from fixture APIs with a clear setup error. Configure database adapters using real `departments`, `course_allocations`, `students`, registration and invoice records before using these modules for live operations. Demo scopes must not be treated as institutional assignments.

For institutional accounts, provision Supabase Auth users with a valid administrator-controlled role, synchronize their `public.users` identity/role and link students by `students.user_id`. Apply `database/rbac_security_setup.sql` to prevent users updating their own role/activation fields. Existing databases need this explicit SQL change; editing the source SQL does not update a running database. Disable both `ENABLE_DEMO_AUTH` and `NEXT_PUBLIC_ENABLE_DEMO_AUTH` for live operations. Demo refresh/revocation registries are process-local; institutional sessions use Supabase refresh and sign-out.

The security setup also locks role/permission definitions and direct academic/financial mutations to trusted server code, preventing lecturers bypassing the approval workflow through the Supabase Data API. Active-identity helper functions run in a private schema with a fixed search path. Run the setup after the existing core/extended schema scripts. These SQL changes are prepared for review and have not been executed against the hosted database in this session.

Set `NEXT_PUBLIC_APP_URL` to the deployed origin for CSRF/recovery links. Allow `/reset-password` in Supabase Auth redirect settings. Password recovery now calls Supabase and requires a valid recovery session to update a password. The shared demonstration MFA endpoint is disabled in production; configure Supabase MFA for institutional accounts.

QR attendance check-in is disabled until implemented; roll call has server authorization. Notification requests are queued locally and do not claim external SMS delivery. Connect a delivery worker/provider before enabling real dispatch. Department/program displays and dashboard summary metrics are still labelled sample data. No account/role-management screen or provisioning API is implemented by this change.

## Verification

Run `npm test` in `frontend` and `backend`, and `npm run build` in `frontend`. Tests cover all seven roles, login mismatch, URL escalation, student isolation, lecturer allocations, HOD course review, finance projections, CSRF, logout, repeated library returns and a mocked Daraja prompt/callback/status cycle. Live handset confirmation and hosted database execution require the configuration above.
