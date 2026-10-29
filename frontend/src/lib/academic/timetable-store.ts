export type TimetableSlot = {
  id: string;
  day: string;
  time: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  lecturer: string;
};

const seedSlots: TimetableSlot[] = [
  { id: 'slot-1', day: 'Monday', time: '08:00 AM – 11:00 AM', courseCode: 'BCS 311', courseTitle: 'Advanced Database Systems', room: 'Lecture Hall 04', lecturer: 'Dr. Jane Mwangi' },
  { id: 'slot-2', day: 'Monday', time: '02:00 PM – 05:00 PM', courseCode: 'BIT 312', courseTitle: 'Distributed Systems & Cloud Computing', room: 'Computing Lab 01', lecturer: 'Prof. David Kamau' },
  { id: 'slot-3', day: 'Tuesday', time: '08:00 AM – 11:00 AM', courseCode: 'BCS 314', courseTitle: 'Software Engineering Architecture', room: 'Lecture Hall 04', lecturer: 'Dr. Jane Mwangi' },
  { id: 'slot-4', day: 'Wednesday', time: '11:00 AM – 01:00 PM', courseCode: 'BCS 316', courseTitle: 'Network & System Security', room: 'Cybersecurity Lab 03', lecturer: 'Eng. Eric Ochieng' },
  { id: 'slot-5', day: 'Thursday', time: '02:00 PM – 05:00 PM', courseCode: 'BBA 201', courseTitle: 'Principles of Financial Accounting', room: 'Lecture Theater 02', lecturer: 'Prof. David Kamau' },
  { id: 'slot-6', day: 'Friday', time: '08:00 AM – 11:00 AM', courseCode: 'BIT 312', courseTitle: 'Distributed Systems & Cloud Computing', room: 'Computing Lab 02', lecturer: 'Prof. David Kamau' }
];

const runtime = globalThis as typeof globalThis & { __uams_timetableSlots?: TimetableSlot[] };
export const timetableSlots: TimetableSlot[] = runtime.__uams_timetableSlots || (runtime.__uams_timetableSlots = seedSlots);

export function clearLecturerFromTimetable(lecturerName: string): void {
  const norm = lecturerName.trim().toLowerCase();
  if (!norm) return;
  for (const s of timetableSlots) {
    if (s.lecturer && (s.lecturer.toLowerCase().includes(norm) || norm.includes(s.lecturer.toLowerCase()))) {
      s.lecturer = 'Unassigned';
    }
  }
}
