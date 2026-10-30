export type TimetableSlot = {
  id: string;
  day: string;
  time: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  lecturer: string;
};

/** Venue with honest capacity: null = not set (never invented). */
export type Venue = {
  id: string;
  name: string;
  building?: string;
  capacity: number | null;
};

const seedVenues: Venue[] = [
  { id: 'ven-lh04', name: 'Lecture Hall 04', building: 'Main Campus', capacity: null },
  { id: 'ven-lt02', name: 'Lecture Theater 02', building: 'Main Campus', capacity: null },
  { id: 'ven-cl01', name: 'Computing Lab 01', building: 'ICT Block', capacity: null },
  { id: 'ven-cl02', name: 'Computing Lab 02', building: 'ICT Block', capacity: null },
  { id: 'ven-cs03', name: 'Cybersecurity Lab 03', building: 'ICT Block', capacity: null },
];

const venueRuntime = globalThis as typeof globalThis & { __uams_venues?: Venue[] };
export const venuesStore: Venue[] = venueRuntime.__uams_venues || (venueRuntime.__uams_venues = [...seedVenues]);

/** Find a venue by name (fuzzy: matches "Lecture Hall 04" inside "Lecture Hall 04 (Main Campus)"). */
export function findVenueByName(room: string): Venue | undefined {
  const norm = room.trim().toLowerCase();
  return venuesStore.find((v) => {
    const vn = v.name.toLowerCase();
    return norm === vn || norm.startsWith(vn) || vn.startsWith(norm);
  });
}

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

// ---------------------------------------------------------------------------
// Time parsing & clash detection
// ---------------------------------------------------------------------------

/** Parse "08:00 AM" (or "8:00 am") to minutes since midnight. Returns null if invalid. */
export function parseTimeOfDay(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;
  if (ap === 'P' && h !== 12) h += 12;
  if (ap === 'A' && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Parse a slot interval like "08:00 AM – 11:00 AM" (en dash, em dash or hyphen)
 * to { start, end } in minutes since midnight. Returns null if unparseable.
 */
export function parseTimeInterval(time: string): { start: number; end: number } | null {
  const parts = time.split(/[–—-]/).map((p) => p.trim());
  if (parts.length !== 2) return null;
  const start = parseTimeOfDay(parts[0]);
  const end = parseTimeOfDay(parts[1]);
  if (start === null || end === null || start >= end) return null;
  return { start, end };
}

/** Two intervals [s1,e1) and [s2,e2) overlap iff s1 < e2 AND s2 < e1. */
export function intervalsOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

export type Clash = { type: 'lecturer' | 'venue'; slot: TimetableSlot };

/**
 * Find clashes for a proposed slot. Checks lecturer and venue double-booking
 * on the same day with overlapping time windows. excludeId skips one slot
 * (for edits). Returns [] when clean.
 *
 * FAIL-CLOSED: if the proposed time cannot be parsed, returns a synthetic
 * clash entry so callers block the booking rather than allow a potential
 * double-booking.
 */
export function findClashes(
  day: string,
  time: string,
  lecturer: string,
  room: string,
  excludeId?: string
): Clash[] {
  const parsed = parseTimeInterval(time);
  if (!parsed) {
    // Fail closed: unparseable time -> block with a synthetic clash.
    return [
      {
        type: 'lecturer',
        slot: {
          id: 'unparseable',
          day,
          time,
          courseCode: '',
          courseTitle: 'Unparseable time interval — booking blocked',
          room,
          lecturer,
        },
      },
    ];
  }
  const normLecturer = lecturer.trim().toLowerCase();
  const normRoom = room.trim().toLowerCase();
  const clashes: Clash[] = [];
  for (const s of timetableSlots) {
    if (excludeId && s.id === excludeId) continue;
    if (s.day !== day) continue;
    const sp = parseTimeInterval(s.time);
    if (!sp) continue; // existing slot with bad data can't be compared; skip
    if (!intervalsOverlap(parsed.start, parsed.end, sp.start, sp.end)) continue;
    if (normLecturer && s.lecturer.trim().toLowerCase() === normLecturer) {
      clashes.push({ type: 'lecturer', slot: s });
    }
    const venue = findVenueByName(room);
    const sVenue = findVenueByName(s.room);
    const sameVenue =
      normRoom === s.room.trim().toLowerCase() ||
      (venue && sVenue && venue.id === sVenue.id);
    if (sameVenue) {
      clashes.push({ type: 'venue', slot: s });
    }
  }
  return clashes;
}

/** Human-readable clash message, e.g. "Dr. Jane Mwangi is already teaching BCS 314 on Tuesday 08:00-11:00". */
export function clashMessage(clash: Clash): string {
  const s = clash.slot;
  if (clash.type === 'lecturer') {
    return `${s.lecturer} is already teaching ${s.courseCode} on ${s.day} ${s.time}`;
  }
  return `${s.room} is already booked for ${s.courseCode} on ${s.day} ${s.time}`;
}
