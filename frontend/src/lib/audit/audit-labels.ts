import type { AuditLogEntry } from './audit-logger';
import { studentsStore } from '@/lib/academic/student-records';
import { staffStore } from '@/lib/hr/staff';
import { gradesStore } from '@/lib/academic/grades';

/** Human-readable target for an audit row, so the list never shows a bare
 * UUID. Raw identifiers stay available only in the admin detail view. */
export function resolveAuditTarget(log: Pick<AuditLogEntry, 'entity_type' | 'entity_id' | 'details'>): string {
  const byAdmission = (admission?: string) => {
    const s = admission ? studentsStore.find((x) => x.admission_number === admission) : undefined;
    return s ? `${s.first_name} ${s.last_name}` : undefined;
  };
  if (log.entity_type === 'staff') {
    const s = staffStore.find((x) => x.id === log.entity_id) || staffStore.find((x) => x.email === log.entity_id);
    if (s) return `${s.first_name} ${s.last_name} — Staff`;
  }
  if (log.entity_type === 'students') {
    const s = studentsStore.find((x) => x.admission_number === log.entity_id) || studentsStore.find((x) => x.id === log.entity_id);
    if (s) return `${s.first_name} ${s.last_name} — Student`;
  }
  if (log.entity_type === 'student_grades') {
    const g = gradesStore.find((x) => x.id === log.entity_id);
    if (g) return `${g.student_name} — Grade (${g.course_code})`;
    const name = byAdmission(log.details?.student as string | undefined);
    if (name) return `${name} — Grade (${String(log.details?.course || '')})`;
  }
  if (log.entity_type === 'transactions') {
    const name = byAdmission(log.details?.student as string | undefined);
    if (name) return `${name} — Payment`;
  }
  if (log.entity_type === 'exam_schedules') {
    const course = log.details?.course_code ? String(log.details.course_code) : undefined;
    if (course) return `Exam paper — ${course}`;
  }
  if (log.entity_type === 'hostel_allocations') {
    const name = log.details?.student ? String(log.details.student) : undefined;
    if (name) return `${name} — Hostel allocation`;
  }
  if (log.entity_type === 'core_security') return 'System — Core security';
  return `${log.entity_type} — see details`;
}
