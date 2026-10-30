/**
 * Auditor compliance utilities — pure functions for the Audit & Compliance
 * Officer's oversight views. All logic is derived from real data; nothing
 * is invented. Honest empty states when data is absent.
 */

import type { ExamClearanceCard } from '@/types';
import type { AuditLogEntry } from '@/lib/audit/audit-logger';

// ---------------------------------------------------------------------------
// Ghost clearance detection
// ---------------------------------------------------------------------------

export interface GhostClearance {
  student_id: string;
  student_name: string;
  admission_number: string;
  fee_balance: number;
  fee_paid_percentage: number;
  /** 'waived' if a valid waiver explains the clearance, 'unexplained' otherwise. */
  kind: 'waived' | 'unexplained';
}

/**
 * Scans clearance cards for "ghost clearances": students marked CLEARED
 * without 100% payment backing and without a valid waiver.
 *
 * A card with status 'cleared' is legitimate only when fee_balance === 0.
 * A card with status 'waived' is legitimate when it carries waiver details.
 * Anything else marked cleared is flagged as unexplained.
 */
export function detectGhostClearances(cards: ExamClearanceCard[]): GhostClearance[] {
  const ghosts: GhostClearance[] = [];
  for (const c of cards) {
    if (c.status === 'waived') continue; // legitimate override, shown in the override log
    if (c.status !== 'cleared') continue; // blocked students are not clearances
    if (c.fee_balance > 0) {
      ghosts.push({
        student_id: c.student_id,
        student_name: c.student_name,
        admission_number: c.admission_number,
        fee_balance: c.fee_balance,
        fee_paid_percentage: c.fee_paid_percentage,
        kind: c.waiver ? 'waived' : 'unexplained',
      });
    }
  }
  return ghosts;
}

// ---------------------------------------------------------------------------
// Grade modification history from the audit trail
// ---------------------------------------------------------------------------

export interface GradeModification {
  gradeId: string;
  from: string;
  to: string;
  authorizedBy: string;
  authorizedRole: string;
  at: string;
  reason: string;
}

const GRADE_MOD_ACTIONS = new Set([
  'GRADE_MODIFIED',
  'GRADE_CORRECTION_REQUESTED',
  'GRADE_APPROVED',
]);

/**
 * Builds a per-grade modification history from audit log entries.
 * Returns a map of grade ID → list of modifications (oldest first).
 * Grades with no matching audit events get no entry (honest absence).
 */
export function buildGradeModificationMap(logs: AuditLogEntry[]): Map<string, GradeModification[]> {
  const map = new Map<string, GradeModification[]>();
  for (const log of logs) {
    if (!GRADE_MOD_ACTIONS.has(log.action)) continue;
    const gradeId = log.entity_id;
    if (!gradeId) continue;
    const details = log.details || {};
    const entry: GradeModification = {
      gradeId,
      from: details.old_total != null ? `${details.old_total}/100 (${details.old_letter || '?'})` : 'unknown',
      to: details.new_total != null ? `${details.new_total}/100 (${details.new_letter || '?'})` : 'unknown',
      authorizedBy: log.actor_email,
      authorizedRole: log.actor_role,
      at: log.timestamp,
      reason: details.reason || details.note || 'No reason recorded',
    };
    if (!map.has(gradeId)) map.set(gradeId, []);
    map.get(gradeId)!.push(entry);
  }
  // Oldest first for a readable history timeline
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }
  return map;
}

// ---------------------------------------------------------------------------
// Pass generation log from the audit trail
// ---------------------------------------------------------------------------

export interface PassGenerationEvent {
  passCode: string;
  student: string;
  authorizedBy: string;
  authorizedRole: string;
  at: string;
}

const PASS_GEN_ACTIONS = new Set([
  'EXAM_PASS_GENERATED',
  'EXAM_PASS_PRINTED',
  'EXAM_PASS_ISSUED',
]);

/**
 * Extracts exam-pass generation events from the audit trail.
 * Returns an empty array (honest state) when no such events exist.
 */
export function buildPassGenerationLog(logs: AuditLogEntry[]): PassGenerationEvent[] {
  const events: PassGenerationEvent[] = [];
  for (const log of logs) {
    if (!PASS_GEN_ACTIONS.has(log.action)) continue;
    const details = log.details || {};
    events.push({
      passCode: details.pass_code || details.card_serial_number || log.entity_id || 'unknown',
      student: details.student_name || details.student || 'unknown',
      authorizedBy: log.actor_email,
      authorizedRole: log.actor_role,
      at: log.timestamp,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

// ---------------------------------------------------------------------------
// Auditor flags from the audit trail
// ---------------------------------------------------------------------------

export interface AuditorFlag {
  id: string;
  entityType: string;
  entityId: string;
  student: string;
  admission: string;
  course: string;
  reason: string;
  flaggedBy: string;
  at: string;
}

/**
 * Extracts AUDIT_FLAG_RAISED events into a structured list.
 */
export function buildAuditorFlagList(logs: AuditLogEntry[]): AuditorFlag[] {
  return logs
    .filter((l) => l.action === 'AUDIT_FLAG_RAISED')
    .map((l) => {
      const d = l.details || {};
      return {
        id: l.id,
        entityType: l.entity_type,
        entityId: l.entity_id,
        student: d.student_name || 'unknown',
        admission: d.admission_number || 'unknown',
        course: d.course_code || '—',
        reason: d.reason || 'No reason specified.',
        flaggedBy: l.actor_email,
        at: l.timestamp,
      };
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
