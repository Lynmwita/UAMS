const runtime = globalThis as typeof globalThis & { __uams_bankDepositsStore?: UamsBankDeposit[] };

export type UamsBankDeposit = {
  receipt_number: string;
  student_id: string;
  admission_number: string;
  student_name: string;
  amount: number;
  bank: string;
  bank_reference: string;
  deposited_at: string;
  recorded_by: string;
  invoice_number: string | null;
  invoice_balance_before: number | null;
  invoice_balance_after: number | null;
};

const seed: UamsBankDeposit[] = [];

export const bankDepositsStore: UamsBankDeposit[] =
  runtime.__uams_bankDepositsStore || (runtime.__uams_bankDepositsStore = seed);
