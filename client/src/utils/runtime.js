/**
 * Runtime config — KavachForWork
 * Resolves API and Socket URLs from env vars.
 * Falls back to same-origin /api for web, and localhost for dev.
 * On Capacitor (mobile), VITE_API_URL *must* be set to the LAN IP or Render URL.
 */
function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function resolveApiBase() {
  const rawValue = import.meta.env.VITE_API_URL?.trim();

  if (!rawValue) {
    // In web browser pointing at the same server (production)
    return '/api';
  }

  if (rawValue.startsWith('/')) {
    return stripTrailingSlash(rawValue);
  }

  try {
    const url = new URL(rawValue);
    const normalizedPath = stripTrailingSlash(url.pathname || '');

    if (!normalizedPath || normalizedPath === '/') {
      url.pathname = '/api';
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(rawValue);
  }
}

function resolveSocketUrl() {
  // Always prefer the explicit env var — required on mobile (Capacitor)
  const rawValue = import.meta.env.VITE_SOCKET_URL?.trim();
  if (rawValue) {
    return stripTrailingSlash(rawValue);
  }

  // Web fallback — derive from VITE_API_URL (strip /api path)
  const apiBase = import.meta.env.VITE_API_URL?.trim();
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      return `${url.protocol}//${url.host}`;
    } catch {
      // ignore
    }
  }

  // Local dev fallback
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if (hostname === 'localhost' && (port === '5173' || port === '4173')) {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }

  return 'http://localhost:5000';
}

export const API_BASE = resolveApiBase();
export const SOCKET_URL = resolveSocketUrl();
