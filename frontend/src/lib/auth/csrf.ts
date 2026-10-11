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

  const url = new URL(request.url);

  const origin = request.headers.get('origin');
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || url.origin).origin;

  if (!origin) {
    // If no origin header is present, fall back to referer header check
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.origin !== expectedOrigin) {
          return { valid: false, error: 'CSRF violation: Referer host does not match target host.' };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: 'CSRF violation: Malformed Referer header.' };
      }
    }
    // For non-browser programmatic clients (e.g., curl/SDK with Bearer token only), allow if not using cookie auth
    const hasCookie = /(?:^|;\s*)uams_(auth|refresh)_token=/.test(request.headers.get('cookie') || '');
    if (hasCookie) {
      return { valid: false, error: 'CSRF violation: Cookie-authenticated mutations require Origin header.' };
    }
    return { valid: true };
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.origin !== expectedOrigin) {
      return {
        valid: false,
        error: 'CSRF violation: Request origin does not match the application origin.',
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'CSRF violation: Malformed Origin header.' };
  }
}
