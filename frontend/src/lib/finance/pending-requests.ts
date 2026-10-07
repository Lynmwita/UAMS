/**
 * Central In-Memory Registry for Pending Safaricom Daraja STK Push Transactions
 * Enforces CheckoutRequestID tracking, expiration, and amount verification to prevent fraudulent settlement claims.
 */

export interface PendingSTKRequest {
  checkoutRequestId: string;
  merchantRequestId: string;
  accountReference: string;
  phoneNumber: string;
  amount: number;
  status: 'pending' | 'settled' | 'failed' | 'expired';
  createdAt: number;
  mpesaReceiptNumber?: string;
  settledAt?: string;
}

// Global registry (preserved across hot reloads in development)
declare global {
  // eslint-disable-next-line no-var
  var __uams_pending_stk_registry: Map<string, PendingSTKRequest> | undefined;
  // eslint-disable-next-line no-var
  var __uams_processed_receipts: Set<string> | undefined;
}

const pendingRequests: Map<string, PendingSTKRequest> =
  global.__uams_pending_stk_registry || (global.__uams_pending_stk_registry = new Map());

const processedReceipts: Set<string> =
  global.__uams_processed_receipts || (global.__uams_processed_receipts = new Set());

/**
 * Registers an initiated STK push request in the pending ledger.
 */
export function registerPendingSTK(req: Omit<PendingSTKRequest, 'status' | 'createdAt'>): PendingSTKRequest {
  const pending: PendingSTKRequest = {
    ...req,
    status: 'pending',
    createdAt: Date.now(),
  };
  pendingRequests.set(req.checkoutRequestId, pending);
  return pending;
}

/**
 * Retrieves a pending STK push request by CheckoutRequestID.
 */
export function getPendingSTK(checkoutRequestId: string): PendingSTKRequest | undefined {
  const req = pendingRequests.get(checkoutRequestId);
  if (!req) return undefined;

  // Requests older than 15 minutes expire
  const TTL_MS = 15 * 60 * 1000;
  if (Date.now() - req.createdAt > TTL_MS && req.status === 'pending') {
    req.status = 'expired';
  }
  return req;
}

/**
 * Verifies and marks a transaction as settled upon authentic Safaricom callback.
 */
export function settleSTKPayment(
  checkoutRequestId: string,
  receiptNumber: string,
  settledAmount: number
): { success: boolean; error?: string; request?: PendingSTKRequest } {
  const req = getPendingSTK(checkoutRequestId);

  if (!req) {
    return { success: false, error: 'Unregistered or expired CheckoutRequestID. Payment cannot be verified.' };
  }

  if (req.status === 'settled') {
    return { success: false, error: 'Transaction has already been settled (Idempotency violation).' };
  }

  if (processedReceipts.has(receiptNumber)) {
    return { success: false, error: `Duplicate M-Pesa receipt number ${receiptNumber}. Payment rejected.` };
  }

  // Amount reconciliation guard
  if (req.amount !== settledAmount) {
    return {
      success: false,
      error: `Amount mismatch: initiated for KES ${req.amount} but callback reported KES ${settledAmount}.`,
    };
  }

  // Settle transaction
  req.status = 'settled';
  req.mpesaReceiptNumber = receiptNumber;
  req.settledAt = new Date().toISOString();
  processedReceipts.add(receiptNumber);

  return { success: true, request: req };
}

/**
 * Checks if a receipt number was already settled.
 */
export function isReceiptProcessed(receiptNumber: string): boolean {
  return processedReceipts.has(receiptNumber);
}
