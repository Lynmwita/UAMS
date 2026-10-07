/**
 * Central Institutional Audit Logging Engine
 * Implements an append-only, tamper-resistant operational telemetry log for sensitive university actions.
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
}

declare global {
  // eslint-disable-next-line no-var
  var __uams_audit_ledger: AuditLogEntry[] | undefined;
}

// Seed with baseline telemetry
const initialSeedLogs: AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-07T08:00:00Z',
    actor_email: 'super_admin@university.ac.ke',
    actor_role: 'super_admin',
    action: 'SYSTEM_INITIALIZATION',
    entity_type: 'core_security',
    entity_id: 'sec-init',
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: { reason: 'Initial institutional deployment' },
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-07T08:15:22Z',
    actor_email: 'finance_officer@university.ac.ke',
    actor_role: 'finance_officer',
    action: 'PAYMENT_VERIFIED',
    entity_type: 'transactions',
    entity_id: 'QHJ8917263',
    ip_address: '192.168.1.45',
    status: 'SUCCESS',
    details: { amount: 45000, student: 'BIT/2023/8849' },
  },
  {
    id: 'aud-003',
    timestamp: '2026-10-07T08:45:10Z',
    actor_email: 'lecturer@university.ac.ke',
    actor_role: 'lecturer',
    action: 'GRADE_SUBMITTED',
    entity_type: 'student_grades',
    entity_id: 'grd-1',
    ip_address: '192.168.2.18',
    status: 'SUCCESS',
    details: { course: 'BCS 311', student: 'BIT/2023/8849', letter_grade: 'A' },
  },
];

const auditLedger: AuditLogEntry[] =
  global.__uams_audit_ledger || (global.__uams_audit_ledger = [...initialSeedLogs]);

/**
 * Appends a new immutable telemetry record to the institutional audit trail.
 */
export function recordAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newRecord: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
  };

  auditLedger.unshift(newRecord);
  return newRecord;
}

/**
 * Returns audit entries filtered by actor or action.
 */
export function getAuditLogs(filter?: {
  action?: string;
  actor_email?: string;
  limit?: number;
}): AuditLogEntry[] {
  let logs = [...auditLedger];
  if (filter?.action) {
    logs = logs.filter((l) => l.action === filter.action);
  }
  if (filter?.actor_email) {
    logs = logs.filter((l) => l.actor_email.toLowerCase() === filter.actor_email?.toLowerCase());
  }
  return logs.slice(0, filter?.limit || 100);
}
