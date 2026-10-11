-- Apply in the UAMS database before enabling STK Push. Server-only service access.
CREATE TABLE IF NOT EXISTS public.uams_stk_requests (
  "checkoutRequestId" text PRIMARY KEY,
  "merchantRequestId" text NOT NULL,
  "userId" text NOT NULL,
  "accountReference" text NOT NULL,
  "phoneNumber" text NOT NULL,
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 250000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','failed','expired')),
  "createdAt" bigint NOT NULL,
  "mpesaReceiptNumber" text UNIQUE,
  "settledAt" timestamptz
);
ALTER TABLE public.uams_stk_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.uams_stk_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.uams_stk_requests TO service_role;
