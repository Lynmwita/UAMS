/** Shared types for the UAMS messaging dispatcher (SMS + email). */

export type DispatchStatus = 'sent' | 'delivered' | 'failed';

export interface DispatchResult {
  status: DispatchStatus;
  /** Provider that handled the send: 'africas_talking', 'resend', 'smtp', or 'mock'. */
  provider: string;
  /** 'live' = a real provider accepted the message. 'mock' = no provider configured, simulated locally. */
  mode: 'live' | 'mock';
  providerMessageId?: string;
  /** Human-readable cost as reported by the provider, e.g. "KES 0.8000". Absent in mock mode. */
  cost?: string;
  /** Numeric cost in KES when the provider reports one. */
  costAmount?: number;
  /** Plain-language failure reason when status is 'failed'. */
  error?: string;
}

export interface SmsMessage {
  to: string; // E.164, e.g. +254712345678
  message: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured`);
    this.name = 'ProviderNotConfiguredError';
  }
}
