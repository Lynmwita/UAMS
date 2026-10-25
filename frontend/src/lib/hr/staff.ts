export type UamsStaffMember = {
  id: string;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'registrar' | 'hod' | 'lecturer' | 'finance_officer' | 'library' | 'hostel_warden' | 'it_support' | 'support_staff' | string;
  department_id: string;
  department_name: string;
  school_id: string | null;
  job_title: string;
  qualification: string;
  is_active: boolean;
  joined_date: string;
};

const seed: UamsStaffMember[] = [
  {
    id: 'staff-1',
    staff_number: 'EUC/STAFF/001',
    first_name: 'Jane',
    last_name: 'Mwangi',
    email: 'jane.mwangi@university.ac.ke',
    phone: '+254700000101',
    role: 'lecturer',
    department_id: 'dep-cs',
    department_name: 'Computer Science',
    school_id: 'sch-ict',
    job_title: 'Senior Lecturer',
    qualification: 'PhD in Computer Science',
    is_active: true,
    joined_date: '2015-09-01',
  },
  {
    id: 'staff-2',
    staff_number: 'EUC/STAFF/002',
    first_name: 'Grace',
    last_name: 'Kimani',
    email: 'grace.kimani@university.ac.ke',
    phone: '+254700000102',
    role: 'hod',
    department_id: 'dep-cs',
    department_name: 'Computer Science',
    school_id: 'sch-ict',
    job_title: 'Head of Department',
    qualification: 'PhD in Information Systems',
    is_active: true,
    joined_date: '2012-05-01',
  },
  {
    id: 'staff-3',
    staff_number: 'EUC/STAFF/003',
    first_name: 'Dennis',
    last_name: 'Mutua',
    email: 'dennis.mutua@university.ac.ke',
    phone: '+254700000103',
    role: 'finance_officer',
    department_id: 'dep-econ',
    department_name: 'Economics',
    school_id: 'sch-biz',
    job_title: 'Senior Finance Officer',
    qualification: 'MBA Finance, CPA-K',
    is_active: true,
    joined_date: '2018-02-01',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_staffStore?: UamsStaffMember[] };
export const staffStore: UamsStaffMember[] = runtime.__uams_staffStore || (runtime.__uams_staffStore = seed);
