export type UamsStaffMember = {
  id: string;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'registrar' | 'hod' | 'lecturer' | 'finance_officer' | 'library' | 'hostel_warden' | 'it_support' | 'support_staff' | string;
  department_id: string;
  department_name: string;
  school_id: string | null;
  job_title: string;
  qualification: string;
  is_active: boolean;
  joined_date: string;
  /** One profile photo per staff member (UAMS-only; staff never sync to the Hub). */
  photo_url?: string;
};

const seed: UamsStaffMember[] = [
  {
    id: 'staff-1',
    staff_number: 'EUC/STAFF/001',
    first_name: 'Jane',
    last_name: 'Mwangi',
    email: 'jane.mwangi@university.ac.ke',
    phone: '+254700000101',
    role: 'lecturer',
    department_id: 'dep-cs',
    department_name: 'Computer Science',
    school_id: 'sch-ict',
    job_title: 'Senior Lecturer',
    qualification: 'PhD in Computer Science',
    is_active: true,
    joined_date: '2015-09-01',
  },
  {
    id: 'staff-2',
    staff_number: 'EUC/STAFF/002',
    first_name: 'Grace',
    last_name: 'Kimani',
    email: 'grace.kimani@university.ac.ke',
    phone: '+254700000102',
    role: 'hod',
    department_id: 'dep-cs',
    department_name: 'Computer Science',
    school_id: 'sch-ict',
    job_title: 'Head of Department',
    qualification: 'PhD in Information Systems',
    is_active: true,
    joined_date: '2012-05-01',
  },
  {
    id: 'staff-3',
    staff_number: 'EUC/STAFF/003',
    first_name: 'Dennis',
    last_name: 'Mutua',
    email: 'dennis.mutua@university.ac.ke',
    phone: '+254700000103',
    role: 'finance_officer',
    department_id: 'dep-econ',
    department_name: 'Economics',
    school_id: 'sch-biz',
    job_title: 'Senior Finance Officer',
    qualification: 'MBA Finance, CPA-K',
    is_active: true,
    joined_date: '2018-02-01',
  },
  {
    // Demo librarian identity, kept identical to the demo sign-in account:
    // button "Librarian", header name derived from this email, and this
    // record all resolve to librarian@university.ac.ke, Active. The name
    // below is the account's display name, not a separate person.
    id: 'staff-4',
    staff_number: 'EUC/STAFF/004',
    first_name: 'Librarian',
    last_name: '',
    email: 'librarian@university.ac.ke',
    phone: '+254700000104',
    role: 'librarian',
    department_id: 'dep-library',
    department_name: 'Library & Information Services',
    school_id: 'central',
    job_title: 'University Librarian',
    qualification: '',
    is_active: true,
    joined_date: '2020-01-01',
  },
];

/** Roles that teach: the only roles a course allocation may target. */
export const TEACHING_ROLES = ['lecturer', 'tutorial_fellow', 'hod', 'dean'] as const;

export function isTeachingRole(role: string): boolean {
  return (TEACHING_ROLES as readonly string[]).includes(String(role || '').toLowerCase());
}

/** Count staff records per department id. Used for honest department sizes. */
export function countStaffByDepartment(
  members: { department_id: string }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of members) {
    if (!m.department_id) continue;
    counts[m.department_id] = (counts[m.department_id] || 0) + 1;
  }
  return counts;
}

const NAME_TITLES = ['dr.', 'prof.', 'eng.', 'mr.', 'mrs.', 'ms.'];

/** Strip an academic title prefix so "Dr. Grace Kimani" matches "Grace Kimani". */
export function stripPersonTitle(displayName: string): string {
  const parts = String(displayName || '').trim().split(/\s+/);
  if (parts.length > 1 && NAME_TITLES.includes(parts[0].toLowerCase())) parts.shift();
  return parts.join(' ');
}

/**
 * Find the staff record whose full name matches a displayed name (titles
 * ignored, case-insensitive). Returns null when no staff record matches,
 * in which case the displayed name must be labelled as a sample name.
 */
export function findStaffByDisplayName(
  displayName: string,
  members: { first_name: string; last_name: string }[]
): { first_name: string; last_name: string } | null {
  const wanted = stripPersonTitle(displayName).toLowerCase();
  if (!wanted) return null;
  return (
    members.find(
      (m) => `${m.first_name} ${m.last_name}`.trim().toLowerCase() === wanted
    ) || null
  );
}

const runtime = globalThis as typeof globalThis & { __uams_staffStore?: UamsStaffMember[] };
export const staffStore: UamsStaffMember[] = runtime.__uams_staffStore || (runtime.__uams_staffStore = seed);

/**
 * Merges institutional database users into the staff store, exactly as the
 * Staff page's own GET does, so any count read from staffStore (dashboard,
 * reports, staff list) sees the same staff. Non-fatal when the database is
 * offline or unconfigured: the seed records remain the count.
 */
export async function syncStaffStoreFromDatabase(): Promise<void> {
  try {
    const { institutionalDatabase } = await import('../academic/institutional');
    const db = institutionalDatabase();
    const { data: dbUsers } = await db
      .from('users')
      .select('id,email,first_name,last_name,phone_number,is_active,roles(code)');
    if (dbUsers && dbUsers.length > 0) {
      for (const u of dbUsers) {
        if (!staffStore.some((s) => s.email.toLowerCase() === u.email.toLowerCase())) {
          const uRole = (Array.isArray(u.roles) ? u.roles[0]?.code : (u.roles as unknown as { code?: string })?.code) || 'lecturer';
          staffStore.push({
            id: u.id,
            staff_number: `EUC/STAFF/${String(staffStore.length + 1).padStart(3, '0')}`,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            phone: u.phone_number || '',
            role: uRole,
            department_id: 'dep-general',
            department_name: 'General Campus Support & Operations',
            school_id: 'central',
            job_title: uRole,
            qualification: '',
            is_active: u.is_active ?? true,
            joined_date: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }
  } catch {
    // Non-fatal if database is offline or not configured
  }
}
