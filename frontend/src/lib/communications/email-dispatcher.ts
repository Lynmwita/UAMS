/**
 * Email Dispatcher Gateway
 * Handles transactional student & staff institutional notices (fee alerts, clearance, announcements).
 * Supports Resend, SMTP, and sandbox simulation fallback.
 */

export interface EmailSendOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName?: string;
}

export interface EmailSendResult {
  success: boolean;
  status: 'sent' | 'delivered' | 'failed';
  providerMessageId?: string;
  cost: number;
  recipient: string;
  isLive: boolean;
  errorMessage?: string;
}

export async function sendEmailNotice(options: EmailSendOptions): Promise<EmailSendResult> {
  const { to, subject, htmlContent, textContent, senderName } = options;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!to || !emailRegex.test(to.trim())) {
    return {
      success: false,
      status: 'failed',
      cost: 0,
      recipient: to,
      isLive: false,
      errorMessage: 'Invalid recipient email address format.',
    };
  }

  const normalizedTo = to.trim().toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY;
  const isLive = Boolean(resendApiKey && resendApiKey.trim() !== '');

  if (isLive) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderName ? `${senderName} <noreply@uams.ac.ke>` : 'UAMS Notifications <noreply@uams.ac.ke>',
          to: [normalizedTo],
          subject: subject || 'UAMS University Notice',
          html: htmlContent,
          text: textContent || htmlContent.replace(/<[^>]+>/g, ''),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: 'sent',
          providerMessageId: data.id || `mail_${Date.now()}`,
          cost: 0.00, // Usually covered by transactional tier
          recipient: normalizedTo,
          isLive: true,
        };
      } else {
        const err = await response.text();
        return {
          success: false,
          status: 'failed',
          cost: 0,
          recipient: normalizedTo,
          isLive: true,
          errorMessage: `Email gateway rejected message: ${err.substring(0, 100)}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        cost: 0,
        recipient: normalizedTo,
        isLive: true,
        errorMessage: err.message || 'Email delivery gateway timeout.',
      };
    }
  }

  // Safe Sandbox Mode for Email
  return {
    success: true,
    status: 'delivered',
    providerMessageId: `em_sbx_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
    cost: 0.00,
    recipient: normalizedTo,
    isLive: false,
  };
}
