import { NextRequest } from 'next/server';

/**
 * Validates Same-Origin for state-changing HTTP requests (POST, PUT, PATCH, DELETE).
 * Enforces OWASP recommendations for preventing Cross-Site Request Forgery (CSRF)
 * on cookie-authenticated web sessions while respecting standard reverse-proxy deployments.
 */
export function validateCsrf(request: Request | NextRequest): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();

  // Safe HTTP methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const url = new URL(request.url);

  // Extract host from standard reverse-proxy headers, Host header, or request URL
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const targetHost = (forwardedHost || hostHeader || url.host).toLowerCase();

  // Set of allowed origins representing this application instance
  const allowedOrigins = new Set<string>();
  if (url.origin) allowedOrigins.add(url.origin.toLowerCase());
  if (targetHost) {
    allowedOrigins.add(`http://${targetHost}`);
    allowedOrigins.add(`https://${targetHost}`);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin.toLowerCase());
    } catch {}
  }
  if (process.env.VERCEL_URL) {
    try {
      const vHost = process.env.VERCEL_URL.toLowerCase();
      allowedOrigins.add(`https://${vHost}`);
      allowedOrigins.add(`http://${vHost}`);
    } catch {}
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    try {
      const pHost = process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase();
      allowedOrigins.add(`https://${pHost}`);
      allowedOrigins.add(`http://${pHost}`);
    } catch {}
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    // If no origin header is present, fall back to referer header check
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refOrigin = refererUrl.origin.toLowerCase();
        const refHost = refererUrl.host.toLowerCase();
        if (!allowedOrigins.has(refOrigin) && refHost !== targetHost) {
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
    const originLower = originUrl.origin.toLowerCase();
    const originHost = originUrl.host.toLowerCase();

    // Legitimate same-origin request: origin matches application instance or target host
    const matchesTarget = allowedOrigins.has(originLower) || originHost === targetHost;
    if (!matchesTarget) {
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
