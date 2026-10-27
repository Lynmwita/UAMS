const departmentsSeed = [
  // Academic Departments
  { id: 'dep-cs', school_id: 'sch-ict', code: 'CS', name: 'Computer Science', hod: 'Dr. Grace Kimani', hod_email: 'hod.cs@university.ac.ke', programs_count: 3, is_active: true, category: 'academic' as const },
  { id: 'dep-bit', school_id: 'sch-ict', code: 'BIT', name: 'Information Technology', hod: 'Dr. Peter Mwangi', hod_email: 'hod.bit@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-is', school_id: 'sch-ict', code: 'IS', name: 'Information Systems', hod: 'Dr. Njoroge Kamau', hod_email: 'hod.is@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-bba', school_id: 'sch-biz', code: 'BBA', name: 'Business Administration', hod: 'Dr. Susan Akinyi', hod_email: 'hod.bba@university.ac.ke', programs_count: 3, is_active: true, category: 'academic' as const },
  { id: 'dep-econ', school_id: 'sch-biz', code: 'ECON', name: 'Economics', hod: 'Dr. Joseph Maina', hod_email: 'hod.econ@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-elec', school_id: 'sch-eng', code: 'EE', name: 'Electrical & Electronic Engineering', hod: 'Eng. Ruth Chebet', hod_email: 'hod.ee@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-civil', school_id: 'sch-eng', code: 'CIV', name: 'Civil Engineering', hod: 'Eng. David Mutiso', hod_email: 'hod.civ@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-mech', school_id: 'sch-eng', code: 'ME', name: 'Mechanical Engineering', hod: 'Eng. Lucy Wairimu', hod_email: 'hod.me@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-edu', school_id: 'sch-edu', code: 'EDU', name: 'Education', hod: 'Dr. Ann Mwende', hod_email: 'hod.edu@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },
  { id: 'dep-huma', school_id: 'sch-edu', code: 'HUM', name: 'Humanities & Social Sciences', hod: 'Dr. Charles Ouma', hod_email: 'hod.hum@university.ac.ke', programs_count: 2, is_active: true, category: 'academic' as const },

  // Non-Academic Central Service & Operational Departments
  { id: 'dep-general', school_id: 'central', code: 'GEN', name: 'General Campus Support & Operations (Cleaners, Security, Drivers, Logistics)', hod: 'General Operations', hod_email: 'operations@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-library', school_id: 'central', code: 'LIB', name: 'Library & Information Services', hod: 'University Librarian', hod_email: 'library@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-admin', school_id: 'central', code: 'ADM', name: 'Central Administration & HR', hod: 'Registrar Administration', hod_email: 'admin@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-finance', school_id: 'central', code: 'FIN', name: 'Finance & Accounts (Bursar)', hod: 'Finance Officer', hod_email: 'finance@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-welfare', school_id: 'central', code: 'WEL', name: 'Student Affairs & Accommodation', hod: 'Dean of Students', hod_email: 'dean.students@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-health', school_id: 'central', code: 'MED', name: 'Health & Medical Center', hod: 'Chief Medical Officer', hod_email: 'clinic@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-estates', school_id: 'central', code: 'EST', name: 'Estates, Maintenance & Facilities', hod: 'Estates Manager', hod_email: 'estates@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-security', school_id: 'central', code: 'SEC', name: 'Campus Safety & Security', hod: 'Chief Security Officer', hod_email: 'security@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-catering', school_id: 'central', code: 'CAT', name: 'Hospitality & Catering Services', hod: 'Catering Manager', hod_email: 'catering@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
  { id: 'dep-transport', school_id: 'central', code: 'TRA', name: 'Transport & Logistics', hod: 'Transport Officer', hod_email: 'transport@university.ac.ke', programs_count: 0, is_active: true, category: 'non_academic' as const },
];

const programsSeed = [
  { id: 'prog-bcs', department_id: 'dep-cs', school_id: 'sch-ict', code: 'BCS', name: 'Bachelor of Science in Computer Science', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-cs-sec', department_id: 'dep-cs', school_id: 'sch-ict', code: 'BCS-SEC', name: 'BSc Computer Security', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-cs-ds', department_id: 'dep-cs', school_id: 'sch-ict', code: 'BCS-DS', name: 'BSc Data Science', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-bit', department_id: 'dep-bit', school_id: 'sch-ict', code: 'BIT', name: 'Bachelor of Science in Information Technology', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-bit-net', department_id: 'dep-bit', school_id: 'sch-ict', code: 'BIT-NET', name: 'BSc Networks & Telecommunications', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-is', department_id: 'dep-is', school_id: 'sch-ict', code: 'BIS', name: 'Bachelor of Information Systems', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-is-mis', department_id: 'dep-is', school_id: 'sch-ict', code: 'BIS-MIS', name: 'BSc Management Information Systems', duration_years: 4, credit_limit: 48, level: 'undergraduate', is_active: true },
  { id: 'prog-bba', department_id: 'dep-bba', school_id: 'sch-biz', code: 'BBA', name: 'Bachelor of Business Administration', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-bba-mkt', department_id: 'dep-bba', school_id: 'sch-biz', code: 'BBA-MKT', name: 'BBA Marketing', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-bba-hr', department_id: 'dep-bba', school_id: 'sch-biz', code: 'BBA-HR', name: 'BBA Human Resource Management', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-eco', department_id: 'dep-econ', school_id: 'sch-biz', code: 'BA-ECO', name: 'Bachelor of Arts in Economics', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-eco-st', department_id: 'dep-econ', school_id: 'sch-biz', code: 'BA-ECO-STAT', name: 'BA Economics & Statistics', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-ee', department_id: 'dep-elec', school_id: 'sch-eng', code: 'BENG-EE', name: 'Bachelor of Engineering (Electrical & Electronics)', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-ee-tel', department_id: 'dep-elec', school_id: 'sch-eng', code: 'BENG-EE-TELECOM', name: 'BEng Telecommunications Engineering', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-civ', department_id: 'dep-civil', school_id: 'sch-eng', code: 'BENG-CIV', name: 'Bachelor of Engineering (Civil)', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-civ-env', department_id: 'dep-civil', school_id: 'sch-eng', code: 'BENG-CIV-ENV', name: 'BEng Environmental Engineering', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-me', department_id: 'dep-mech', school_id: 'sch-eng', code: 'BENG-ME', name: 'Bachelor of Engineering (Mechanical)', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-me-mfg', department_id: 'dep-mech', school_id: 'sch-eng', code: 'BENG-ME-MFG', name: 'BEng Manufacturing Engineering', duration_years: 5, credit_limit: 50, level: 'undergraduate', is_active: true },
  { id: 'prog-bed', department_id: 'dep-edu', school_id: 'sch-edu', code: 'BED', name: 'Bachelor of Education (Arts)', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-bed-sci', department_id: 'dep-edu', school_id: 'sch-edu', code: 'BED-SCI', name: 'Bachelor of Education (Science)', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-ba-soc', department_id: 'dep-huma', school_id: 'sch-edu', code: 'BA-SOC', name: 'Bachelor of Arts in Sociology', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
  { id: 'prog-ba-ps', department_id: 'dep-huma', school_id: 'sch-edu', code: 'BA-PS', name: 'Bachelor of Arts in Political Science', duration_years: 4, credit_limit: 44, level: 'undergraduate', is_active: true },
];

export type UamsDepartment = {
  id: string;
  school_id: string | null;
  code: string;
  name: string;
  hod: string;
  hod_email: string;
  programs_count: number;
  is_active: boolean;
  category?: 'academic' | 'non_academic';
};

export type UamsProgram = (typeof programsSeed)[number];

const runtime = globalThis as typeof globalThis & {
  __uams_departmentsStore?: UamsDepartment[];
  __uams_programsStore?: typeof programsSeed;
};

export const departmentsStore: UamsDepartment[] =
  runtime.__uams_departmentsStore || (runtime.__uams_departmentsStore = [...departmentsSeed]);

export const programsStore =
  runtime.__uams_programsStore || (runtime.__uams_programsStore = [...programsSeed]);
