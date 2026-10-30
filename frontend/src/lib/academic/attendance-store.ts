export type AttendanceRosterRow = { id: string; adm: string; name: string; status: 'present' | 'absent' | 'late' | 'excused' };
export type AttendanceSession = { id: string; date: string; course: string; courseTitle: string; topic: string; lecturer: string; present: number; total: number; percentage: string };

const rosterSeed: AttendanceRosterRow[] = [
  { id: 'stu-1', adm: 'BIT/2023/8849', name: 'Faith Wanjiku', status: 'present' },
  { id: 'stu-2', adm: 'BCS/2023/1204', name: 'Kevin Otieno', status: 'present' },
  { id: 'stu-3', adm: 'BBA/2022/4412', name: 'Brian Kiprono', status: 'absent' },
];
const sessionsSeed: AttendanceSession[] = [
  { id: 'ses-1', date: '2026-10-03', course: 'BCS 311', courseTitle: 'Advanced Database Systems', topic: 'Database architecture', lecturer: 'Dr. Jane Mwangi', present: 2, total: 3, percentage: '66.7%' },
];

const runtime = globalThis as typeof globalThis & { __uams_attendanceRoster?: AttendanceRosterRow[]; __uams_attendanceSessions?: AttendanceSession[] };
export const attendanceRoster: AttendanceRosterRow[] = runtime.__uams_attendanceRoster || (runtime.__uams_attendanceRoster = rosterSeed);
export const attendanceSessions: AttendanceSession[] = runtime.__uams_attendanceSessions || (runtime.__uams_attendanceSessions = sessionsSeed);

/** Campus average derived from recorded sessions only, never a placeholder.
 * Returns null when no session has been recorded yet. */
export function derivedAttendanceAverage(sessions: AttendanceSession[]): number | null {
  const total = sessions.reduce((sum, s) => sum + s.total, 0);
  if (sessions.length === 0 || total === 0) return null;
  const present = sessions.reduce((sum, s) => sum + s.present, 0);
  return Math.round((present / total) * 1000) / 10;
}

/** --- Attendance redesign additions (2026-10-30) --- */
import { DEFAULT_INSTITUTIONAL_POLICY } from '@/lib/config/institutionalPolicy';

/** Senate attendance threshold for exam sitting. Read from institutional policy, not hardcoded. */
export const ATTENDANCE_THRESHOLD = DEFAULT_INSTITUTIONAL_POLICY.attendanceEligibilityThreshold; // 75

export type SessionStudentRecord = {
  student_id: string;
  adm: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time: string; // ISO timestamp of when the status was recorded
};

export type SessionDetail = {
  session_id: string;
  records: SessionStudentRecord[];
};

export type AttendanceExemption = {
  student_id: string;
  adm: string;
  name: string;
  reason: string;
  granted_by: string;
  granted_at: string;
};

const runtime2 = globalThis as typeof globalThis & {
  __uams_sessionDetails?: SessionDetail[];
  __uams_attendanceExemptions?: AttendanceExemption[];
};

export const sessionDetails: SessionDetail[] =
  runtime2.__uams_sessionDetails || (runtime2.__uams_sessionDetails = [
    // Honest seed: the one recorded session (BCS 311, 2026-10-03) with its roster.
    {
      session_id: 'ses-1',
      records: [
        { student_id: 'stu-1', adm: 'BIT/2023/8849', name: 'Faith Wanjiku', status: 'present', check_in_time: '2026-10-03T08:05:00' },
        { student_id: 'stu-2', adm: 'BCS/2023/1204', name: 'Kevin Otieno', status: 'present', check_in_time: '2026-10-03T08:07:00' },
        { student_id: 'stu-3', adm: 'BBA/2022/4412', name: 'Brian Kiprono', status: 'absent', check_in_time: '2026-10-03T08:00:00' },
      ],
    },
  ]);

export const attendanceExemptions: AttendanceExemption[] =
  runtime2.__uams_attendanceExemptions || (runtime2.__uams_attendanceExemptions = []);

export type StudentAttendanceStat = {
  student_id: string;
  adm: string;
  name: string;
  sessions_total: number;
  sessions_attended: number; // present + late
  sessions_missed: number; // absent (excused excluded from denominator)
  percentage: number | null; // null when no countable sessions
  is_at_risk: boolean;
  is_exempt: boolean;
  is_blocked: boolean; // below threshold AND no exemption
};

/** Per-student attendance computed ONLY from recorded session details. Never fabricated. */
export function computeStudentAttendance(): StudentAttendanceStat[] {
  const threshold = ATTENDANCE_THRESHOLD;
  const byStudent = new Map<string, { adm: string; name: string; attended: number; missed: number; total: number }>();

  for (const detail of sessionDetails) {
    for (const r of detail.records) {
      if (r.status === 'excused') continue; // excused sessions don't count for or against
      let entry = byStudent.get(r.student_id);
      if (!entry) {
        entry = { adm: r.adm, name: r.name, attended: 0, missed: 0, total: 0 };
        byStudent.set(r.student_id, entry);
      }
      entry.total++;
      if (r.status === 'present' || r.status === 'late') entry.attended++;
      else entry.missed++;
    }
  }

  const stats: StudentAttendanceStat[] = [];
  for (const [student_id, e] of byStudent) {
    const percentage = e.total === 0 ? null : Math.round((e.attended / e.total) * 1000) / 10;
    const exempt = attendanceExemptions.find((x) => x.student_id === student_id);
    const is_at_risk = percentage !== null && percentage < threshold;
    stats.push({
      student_id,
      adm: e.adm,
      name: e.name,
      sessions_total: e.total,
      sessions_attended: e.attended,
      sessions_missed: e.missed,
      percentage,
      is_at_risk,
      is_exempt: !!exempt,
      is_blocked: is_at_risk && !exempt,
    });
  }
  return stats.sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101));
}

/** Weekly trend: average of sessions in last 7 days vs prior 7 days. Null when insufficient data. */
export function attendanceTrend(sessions: AttendanceSession[]): { current: number | null; previous: number | null; direction: 'up' | 'down' | 'flat' | 'nodata' } {
  const now = new Date();
  const week = 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter((s) => now.getTime() - new Date(s.date).getTime() <= week);
  const prior = sessions.filter((s) => {
    const age = now.getTime() - new Date(s.date).getTime();
    return age > week && age <= 2 * week;
  });
  const avg = (list: AttendanceSession[]): number | null => {
    const total = list.reduce((sum, s) => sum + s.total, 0);
    if (list.length === 0 || total === 0) return null;
    return Math.round((list.reduce((sum, s) => sum + s.present, 0) / total) * 1000) / 10;
  };
  const current = avg(recent);
  const previous = avg(prior);
  if (current === null || previous === null) return { current, previous, direction: 'nodata' };
  if (current > previous) return { current, previous, direction: 'up' };
  if (current < previous) return { current, previous, direction: 'down' };
  return { current, previous, direction: 'flat' };
}
