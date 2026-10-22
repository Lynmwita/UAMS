const runtime = globalThis as typeof globalThis & { __uams_invoicesStore?: UamsInvoice[] };

export type UamsInvoiceItem = {
  description: string;
  amount: number;
  type: 'tuition' | 'hostel' | 'library' | 'registration' | 'other';
  due_date?: string;
};

export type UamsInvoice = {
  invoice_number: string;
  student_id: string;
  admission_number: string;
  student_name: string;
  semester_label: string;
  academic_year: string;
  items: UamsInvoiceItem[];
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: 'settled' | 'partial' | 'outstanding';
  issued_at: string;
};

const seed: UamsInvoice[] = [
  {
    invoice_number: 'INV-2026-0001',
    student_id: 'stu-1',
    admission_number: 'BIT/2023/8849',
    student_name: 'Faith Wanjiku',
    semester_label: 'Semester 1',
    academic_year: '2026/2027',
    items: [
      { description: 'Tuition - 6 units', amount: 48000, type: 'tuition', due_date: '2026-09-30' },
      { description: 'Registration fee', amount: 3000, type: 'registration', due_date: '2026-09-30' },
      { description: 'Library services', amount: 1500, type: 'library' },
    ],
    total_amount: 52500,
    amount_paid: 52500,
    balance: 0,
    status: 'settled',
    issued_at: '2026-09-01',
  },
  {
    invoice_number: 'INV-2026-0002',
    student_id: 'stu-2',
    admission_number: 'BCS/2023/1204',
    student_name: 'Kevin Otieno',
    semester_label: 'Semester 2',
    academic_year: '2026/2027',
    items: [
      { description: 'Tuition - 5 units', amount: 40000, type: 'tuition', due_date: '2026-10-31' },
      { description: 'Hostel - 201A', amount: 16000, type: 'hostel', due_date: '2026-10-31' },
      { description: 'Registration fee', amount: 3000, type: 'registration', due_date: '2026-09-30' },
    ],
    total_amount: 59000,
    amount_paid: 40500,
    balance: 18500,
    status: 'partial',
    issued_at: '2026-09-01',
  },
];

export const invoicesStore: UamsInvoice[] =
  runtime.__uams_invoicesStore || (runtime.__uams_invoicesStore = seed);

export function upsertStudentInvoice(
  studentId: string,
  appliedAmount: number
): UamsInvoice | null {
  const invoice = invoicesStore
    .filter((i) => i.student_id === studentId && i.balance > 0)
    .sort((a, b) => a.issued_at.localeCompare(b.issued_at))[0];
  if (!invoice) return null;
  invoice.amount_paid = Math.min(invoice.amount_paid + appliedAmount, invoice.total_amount);
  invoice.balance = Math.max(0, invoice.total_amount - invoice.amount_paid);
  invoice.status = invoice.balance === 0 ? 'settled' : invoice.amount_paid > 0 ? 'partial' : 'outstanding';
  return invoice;
}
