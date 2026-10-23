/**
 * Africa's Talking SMS Gateway Provider
 *
 * SAFETY IMPLEMENTATIONS:
 * 1. Catch 1: AT_API_KEY is read strictly from process.env on the server.
 *    No NEXT_PUBLIC_ exposure. Never passed to client or logged in plaintext.
 * 2. Catch 2: Sandbox mode is DEFAULT (ENABLE_LIVE_SMS !== 'true').
 *    Airtime protection: Zero live SMS sent unless explicit ENABLE_LIVE_SMS=true switch.
 * 3. Catch 3: Enforces E.164 phone formatting and segment costing.
 */

import { normalizeKenyanPhone } from './phone-sanitizer';
import { inspectMessageContent } from './content-guard';

export interface SmsSendOptions {
  to: string;
  message: string;
  senderId?: string;
  forceSandbox?: boolean;
}

export interface SmsSendResult {
  success: boolean;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  providerMessageId?: string;
  cost: number;
  recipient: string;
  isLive: boolean;
  errorMessage?: string;
  statusCode?: number;
}

export async function sendSmsViaAfricasTalking(options: SmsSendOptions): Promise<SmsSendResult> {
  const { to, message, senderId, forceSandbox } = options;

  // 1. Phone validation & E.164 normalization
  const phoneValidation = normalizeKenyanPhone(to);
  if (!phoneValidation.valid || !phoneValidation.normalized) {
    return {
      success: false,
      status: 'failed',
      cost: 0,
      recipient: to,
      isLive: false,
      errorMessage: phoneValidation.error || 'Recipient phone number is invalid.',
      statusCode: 400,
    };
  }

  const normalizedTo = phoneValidation.normalized;

  // 2. Content inspection
  const contentAudit = inspectMessageContent(message);
  if (!contentAudit.safe) {
    return {
      success: false,
      status: 'failed',
      cost: 0,
      recipient: normalizedTo,
      isLive: false,
      errorMessage: contentAudit.warnings.join(' | '),
      statusCode: 422,
    };
  }

  // 3. Environment configuration (SERVER-SIDE ONLY)
  const rawApiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';
  const effectiveSenderId = senderId || process.env.AT_SENDER_ID;
  const isLiveExplicit = process.env.ENABLE_LIVE_SMS === 'true' && !forceSandbox;

  // Calculate segment cost (Standard Kenya tariff: KES 0.80 per SMS segment)
  const estimatedCost = contentAudit.segmentCount * 0.80;

  // 4. Default: Sandbox Mode (Airtime Brakes Enabled)
  if (!isLiveExplicit) {
    // If sandbox credentials are provided, we can attempt Africa's Talking Sandbox API
    if (rawApiKey && rawApiKey.trim() !== '' && username === 'sandbox') {
      try {
        const bodyParams = new URLSearchParams();
        bodyParams.append('username', username);
        bodyParams.append('to', normalizedTo);
        bodyParams.append('message', message);
        if (effectiveSenderId) {
          bodyParams.append('from', effectiveSenderId);
        }

        const response = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
          method: 'POST',
          headers: {
            'apiKey': rawApiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const json = await response.json();
          const recipientData = json?.SMSMessageData?.Recipients?.[0];
          if (recipientData && (recipientData.statusCode === 101 || recipientData.statusCode === 100)) {
            const costParsed = parseFloat(recipientData.cost?.replace(/[^0-9.]/g, '') || '0.80');
            return {
              success: true,
              status: 'sent',
              providerMessageId: recipientData.messageId || `ATXid_sbx_${Date.now()}`,
              cost: isNaN(costParsed) ? estimatedCost : costParsed,
              recipient: normalizedTo,
              isLive: false,
              statusCode: recipientData.statusCode,
            };
          } else if (recipientData) {
            return {
              success: false,
              status: 'failed',
              providerMessageId: recipientData.messageId,
              cost: 0,
              recipient: normalizedTo,
              isLive: false,
              errorMessage: `AT Sandbox Error: ${recipientData.status} (Code: ${recipientData.statusCode})`,
              statusCode: recipientData.statusCode,
            };
          }
        }
      } catch (err: any) {
        // Fall back to offline sandbox simulator below
      }
    }

    // Offline / Standard Safe Sandbox Simulation (Brakes: Zero real money or network failure)
    return {
      success: true,
      status: 'sent',
      providerMessageId: `ATXid_sbx_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
      cost: estimatedCost,
      recipient: normalizedTo,
      isLive: false,
      statusCode: 101,
    };
  }

  // 5. Live Production Mode (Explicit ENABLE_LIVE_SMS=true)
  if (!rawApiKey || rawApiKey.trim() === '') {
    return {
      success: false,
      status: 'failed',
      cost: 0,
      recipient: normalizedTo,
      isLive: true,
      errorMessage: 'Live SMS is enabled (ENABLE_LIVE_SMS=true) but AT_API_KEY is not configured on the server.',
      statusCode: 500,
    };
  }

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('username', username);
    bodyParams.append('to', normalizedTo);
    bodyParams.append('message', message);
    if (effectiveSenderId) {
      bodyParams.append('from', effectiveSenderId);
    }

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': rawApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        status: 'failed',
        cost: 0,
        recipient: normalizedTo,
        isLive: true,
        errorMessage: `Africa's Talking Gateway Error (${response.status}): ${errText.substring(0, 100)}`,
        statusCode: response.status,
      };
    }

    const json = await response.json();
    const recipientData = json?.SMSMessageData?.Recipients?.[0];

    if (!recipientData) {
      return {
        success: false,
        status: 'failed',
        cost: 0,
        recipient: normalizedTo,
        isLive: true,
        errorMessage: json?.SMSMessageData?.Message || 'No recipient response from Africa\'s Talking.',
        statusCode: 502,
      };
    }

    const statusCode = recipientData.statusCode;
    // Status codes: 100 = Processed, 101 = Sent, 102 = Queued
    const isSuccess = [100, 101, 102].includes(statusCode);
    const parsedCost = parseFloat(recipientData.cost?.replace(/[^0-9.]/g, '') || String(estimatedCost));

    return {
      success: isSuccess,
      status: isSuccess ? (statusCode === 101 ? 'delivered' : 'sent') : 'failed',
      providerMessageId: recipientData.messageId,
      cost: isSuccess ? (isNaN(parsedCost) ? estimatedCost : parsedCost) : 0,
      recipient: normalizedTo,
      isLive: true,
      errorMessage: isSuccess ? undefined : `AT Dispatch Failed: ${recipientData.status} (Code: ${statusCode})`,
      statusCode,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      cost: 0,
      recipient: normalizedTo,
      isLive: true,
      errorMessage: err?.message || 'Africa\'s Talking network dispatch timeout.',
      statusCode: 504,
    };
  }
}
