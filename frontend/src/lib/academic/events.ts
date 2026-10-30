export type UamsCampusEvent = {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'sports' | 'cultural' | 'orientation' | 'exam' | 'holiday' | 'meeting' | 'other';
  starts_at: string;
  ends_at: string;
  location: string;
  scope_type: 'university' | 'school' | 'department' | 'program';
  scope_id: string | null;
  scope_name: string | null;
  created_by: string;
  created_by_role: string;
  is_active: boolean;
  created_at: string;
};

const seed: UamsCampusEvent[] = [
  {
    id: 'evt-1',
    title: 'Semester 1 Registration Week',
    description: 'Late registration closes. Course registration approvals must be completed by Friday.',
    category: 'academic',
    starts_at: '2026-10-26T08:00:00Z',
    ends_at: '2026-10-30T17:00:00Z',
    location: 'Registrar Office',
    scope_type: 'university',
    scope_id: null,
    scope_name: null,
    created_by: 'registrar@university.ac.ke',
    created_by_role: 'registrar',
    is_active: true,
    created_at: '2026-10-20T09:00:00Z',
  },
  {
    id: 'evt-2',
    title: 'ICT Career & Innovation Seminar',
    description: 'Alumni and industry talks for ICT students. Attendance will be taken for BCS Year 3 students.',
    category: 'academic',
    starts_at: '2026-10-29T14:00:00Z',
    ends_at: '2026-10-29T16:00:00Z',
    location: 'Main Auditorium',
    scope_type: 'school',
    scope_id: 'sch-ict',
    scope_name: 'School of Information Communication & Technology',
    created_by: 'grace.kimani@university.ac.ke',
    created_by_role: 'hod',
    is_active: true,
    created_at: '2026-10-21T07:30:00Z',
  },
  {
    id: 'evt-3',
    title: 'Inter-School Sports Gala Finals',
    description: 'Football, basketball and volleyball finals. Come support your school teams.',
    category: 'sports',
    starts_at: '2026-11-01T09:00:00Z',
    ends_at: '2026-11-01T17:00:00Z',
    location: 'Sports Complex',
    scope_type: 'university',
    scope_id: null,
    scope_name: null,
    created_by: 'admin@university.ac.ke',
    created_by_role: 'admin',
    is_active: true,
    created_at: '2026-10-21T10:00:00Z',
  },
  {
    id: 'evt-lib-1',
    title: 'Turnitin & Academic Citation Workshop',
    description: 'Hands-on session on avoiding plagiarism, IEEE/APA reference formatting, and Turnitin similarity index reports.',
    category: 'academic',
    starts_at: '2026-11-04T10:00:00Z',
    ends_at: '2026-11-04T12:00:00Z',
    location: 'Digital Library Computer Lab 2',
    scope_type: 'university',
    scope_id: null,
    scope_name: null,
    created_by: 'librarian@university.ac.ke',
    created_by_role: 'librarian',
    is_active: true,
    created_at: '2026-10-22T08:00:00Z',
  },
  {
    id: 'evt-lib-2',
    title: 'IEEE Database & E-Resources Training',
    description: 'Accessing remote electronic journals, SpringerLink, IEEE Xplore, and thesis digital repositories.',
    category: 'orientation',
    starts_at: '2026-11-08T14:00:00Z',
    ends_at: '2026-11-08T16:00:00Z',
    location: 'Main Library Amphitheater',
    scope_type: 'university',
    scope_id: null,
    scope_name: null,
    created_by: 'librarian@university.ac.ke',
    created_by_role: 'librarian',
    is_active: true,
    created_at: '2026-10-23T09:00:00Z',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_eventsStore?: UamsCampusEvent[] };
export const eventsStore: UamsCampusEvent[] = runtime.__uams_eventsStore || (runtime.__uams_eventsStore = seed);
