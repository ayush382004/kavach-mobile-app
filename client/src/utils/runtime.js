function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function resolveApiBase() {
  const rawValue = import.meta.env.VITE_API_URL?.trim();

  if (!rawValue) {
    return '/api';
  }

  if (rawValue.startsWith('/')) {
    return stripTrailingSlash(rawValue);
  }

  try {
    const url = new URL(rawValue);
    const normalizedPath = stripTrailingSlash(url.pathname || '');

    if (!normalizedPath) {
      url.pathname = '/api';
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(rawValue);
  }
}

function resolveSocketUrl() {
  const rawValue = import.meta.env.VITE_SOCKET_URL?.trim();

  if (rawValue) {
    return stripTrailingSlash(rawValue);
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin, port } = window.location;
    if (hostname === 'localhost' && (port === '5173' || port === '4173')) {
      return 'http://localhost:5000';
    }
    return origin;
  }

  return 'http://localhost:5000';
}

export const API_BASE = resolveApiBase();
export const SOCKET_URL = resolveSocketUrl();
