import { NextRequest } from 'next/server';

/**
 * Validates Same-Origin for state-changing HTTP requests (POST, PUT, PATCH, DELETE).
 * Enforces OWASP recommendations for preventing Cross-Site Request Forgery (CSRF)
 * on cookie-authenticated web sessions.
 */
export function validateCsrf(request: Request | NextRequest): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();

  // Safe HTTP methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Exempt external webhooks with separate origin/signature validation (e.g., Safaricom Daraja callback)
  const url = new URL(request.url);
  if (url.pathname.includes('/finance/mpesa/callback')) {
    return { valid: true };
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');

  if (!origin) {
    // If no origin header is present, fall back to referer header check
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (host && refererUrl.host !== host) {
          return { valid: false, error: 'CSRF violation: Referer host does not match target host.' };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: 'CSRF violation: Malformed Referer header.' };
      }
    }
    // For non-browser programmatic clients (e.g., curl/SDK with Bearer token only), allow if not using cookie auth
    const hasCookie = request.headers.get('cookie')?.includes('uams_auth_token');
    if (hasCookie) {
      return { valid: false, error: 'CSRF violation: Cookie-authenticated mutations require Origin header.' };
    }
    return { valid: true };
  }

  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host !== host) {
      return {
        valid: false,
        error: `CSRF violation: Request origin '${originUrl.host}' does not match server host '${host}'.`,
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'CSRF violation: Malformed Origin header.' };
  }
}
