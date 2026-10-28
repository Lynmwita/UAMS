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
