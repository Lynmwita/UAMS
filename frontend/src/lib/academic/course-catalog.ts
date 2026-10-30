export type UamsCourse = {
  id: string;
  code: string;
  title: string;
  department: string;
  credit_hours: number;
  level: number;
  prerequisites: string[];
  lecturer: string;
  capacity: number;
  enrolled: number;
  is_active: boolean;
  unit_type: 'core' | 'elective';
  semester: 1 | 2;
  description: string;
};

const seed: UamsCourse[] = [
  {
    id: 'crs-1',
    code: 'BCS 311',
    title: 'Advanced Database Systems',
    department: 'Computer Science',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BCS 211'],
    lecturer: 'Dr. Jane Mwangi',
    capacity: 60,
    enrolled: 48,
    is_active: true,
    unit_type: 'core',
    semester: 1,
    description: '',
  },
  {
    id: 'crs-2',
    code: 'BIT 312',
    title: 'Distributed Systems & Cloud Computing',
    department: 'Information Technology',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BIT 220'],
    lecturer: 'Prof. David Kamau',
    capacity: 65,
    enrolled: 52,
    is_active: true,
    unit_type: 'core',
    semester: 1,
    description: '',
  },
  {
    id: 'crs-3',
    code: 'BCS 314',
    title: 'Software Engineering Architecture',
    department: 'Computer Science',
    credit_hours: 4,
    level: 300,
    prerequisites: ['BCS 214'],
    lecturer: 'Eng. Eric Ochieng',
    capacity: 55,
    enrolled: 44,
    is_active: true,
    unit_type: 'core',
    semester: 1,
    description: '',
  },
  {
    id: 'crs-4',
    code: 'BCS 316',
    title: 'Network & System Security',
    department: 'Computer Science',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BIT 215'],
    lecturer: 'Dr. Jane Mwangi',
    capacity: 50,
    enrolled: 41,
    is_active: true,
    unit_type: 'core',
    semester: 1,
    description: '',
  },
  {
    id: 'crs-5',
    code: 'BBA 201',
    title: 'Principles of Financial Accounting',
    department: 'Business Administration',
    credit_hours: 3,
    level: 200,
    prerequisites: [],
    lecturer: 'Dr. Martin Omondi',
    capacity: 80,
    enrolled: 72,
    is_active: true,
    unit_type: 'core',
    semester: 1,
    description: '',
  },
];
const runtime=globalThis as typeof globalThis & {__uams_coursesStore?: typeof seed};
export const coursesStore=runtime.__uams_coursesStore || (runtime.__uams_coursesStore=seed);

export function clearLecturerAllocations(lecturerName: string): void {
  const norm = lecturerName.trim().toLowerCase();
  if (!norm) return;
  for (const c of coursesStore) {
    if (c.lecturer && (c.lecturer.toLowerCase().includes(norm) || norm.includes(c.lecturer.toLowerCase()))) {
      c.lecturer = 'Unassigned';
    }
  }
}
