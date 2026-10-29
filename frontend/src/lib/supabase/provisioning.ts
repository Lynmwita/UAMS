import { isUserRole } from '@/lib/auth/roles';
import type { UserRole } from '@/types';

/**
 * Provisioning-time portal-role resolution.
 *
 * Login (activeInstitutionalUser) only accepts portal roles, and only when
 * the institutional users row carries a roles row with the exact same code.
 * Staff records, however, carry job titles (accountant, cleaner,
 * tutorial_fellow, ...) and one legacy alias (library), which are NOT portal
 * roles. Passing a job title verbatim into app_metadata.role or into a
 * roles-code lookup used to create accounts that could authenticate with
 * Supabase yet could never pass the login gate: the users row ended up with
 * role_id NULL (inner join drops it) or with app_metadata.role rejected as
 * "not a user role", and the person saw "Your institutional account is
 * currently inactive" even though the admin screen had just told them the
 * account was active.
 *
 * resolvePortalRole is the single place that translates a staff/student
 * record into a portal role. It returns null for job titles that have no
 * portal role instead of inventing one.
 *
 * resolveStaffPortalRole is what staff provisioning callers use: a staff
 * record whose job title has no portal role maps to the scoped
 * 'support_staff' role (own roster, announcements, events, profile — no
 * student, finance, staff-admin or academic data), so cleaners, cooks,
 * drivers, gardeners and security staff can log in with the email +
 * password their administrator assigned them. It returns null only when
 * there is no staff record at all to map from; callers must then fail
 * loudly rather than create an account that can never sign in.
 */
const PORTAL_ROLE_ALIASES: Record<string, UserRole> = {
  library: 'librarian',
  auditor: 'audit_officer',
  compliance_officer: 'audit_officer',
};

export function resolvePortalRole(...candidates: Array<unknown>): UserRole | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const value = candidate.trim().toLowerCase();
    if (isUserRole(value)) return value;
    const alias = PORTAL_ROLE_ALIASES[value];
    if (alias) return alias;
  }
  return null;
}

/**
 * Staff provisioning role: a resolved portal role when one exists,
 * 'support_staff' when the person is a staff record whose job title has no
 * portal role, null only when there is no staff record to map from.
 * Students are resolved by the caller passing 'student' as a candidate.
 */
export function resolveStaffPortalRole(
  staffRecordPresent: boolean,
  ...candidates: Array<unknown>
): UserRole | null {
  const resolved = resolvePortalRole(...candidates);
  if (resolved) return resolved;
  return staffRecordPresent ? 'support_staff' : null;
}

/** Minimal structural shape of the Supabase client surface this helper uses. */
export type ProvisioningDb = {
  from: (table: string) => {
    select: (...args: any[]) => any;
    upsert: (...args: any[]) => any;
    update: (...args: any[]) => any;
  };
};

export interface LinkInstitutionalIdentityInput {
  email: string;
  authUserId: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Link a Supabase Auth identity to its institutional users row so that
 * login can find it afterwards. This is the write login depends on, so it
 * throws instead of swallowing failures: a caller must never tell an admin
 * "the account is now active and ready to log in" when this link did not
 * land. It always writes role_id (from the roles table, never NULL for a
 * provisioned account) and is_active=true, and it NEVER flips a genuinely
 * deactivated row (is_active === false) back to active; deactivated
 * accounts are reactivated through the staff status flow, not by
 * re-provisioning. A row whose is_active was never set (NULL, as written
 * by the workflow functions) is repaired to true: NULL means "never
 * provisioned", not "deactivated".
 */
export async function linkInstitutionalIdentity(
  db: ProvisioningDb,
  input: LinkInstitutionalIdentityInput
): Promise<void> {
  const { data: roleRow, error: roleError } = await db
    .from('roles')
    .select('id')
    .eq('code', input.role)
    .maybeSingle();
  if (roleError) throw new Error('Portal role lookup failed.');
  if (!roleRow?.id) {
    throw new Error(
      `Portal role '${input.role}' is not configured in the institutional database, so no login can be linked for ${input.email}.`
    );
  }

  const { data: existing } = await db
    .from('users')
    .select('id,is_active')
    .eq('email', input.email)
    .maybeSingle();
  if (existing?.is_active === false) {
    throw new Error(
      `Account ${input.email} is deactivated. Reactivate it through the staff status flow before linking a login.`
    );
  }

  const { error } = await db.from('users').upsert(
    {
      email: input.email,
      auth_user_id: input.authUserId,
      role_id: roleRow.id,
      is_active: true,
      // Names are only written when the caller actually knows them: an
      // upsert that defaulted them to 'Staff'/'Member' would overwrite a
      // real name on an existing row.
      ...(input.firstName ? { first_name: input.firstName } : {}),
      ...(input.lastName ? { last_name: input.lastName } : {}),
    },
    { onConflict: 'email' }
  );
  if (error) throw new Error('Institutional account link could not be saved.');
}
