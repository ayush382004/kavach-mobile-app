function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripWrappingQuotes(value) {
  if (!value || value.length < 2) {
    return value;
  }

  const startsWithSingle = value.startsWith("'");
  const endsWithSingle = value.endsWith("'");
  const startsWithDouble = value.startsWith('"');
  const endsWithDouble = value.endsWith('"');

  if ((startsWithSingle && endsWithSingle) || (startsWithDouble && endsWithDouble)) {
    return value.slice(1, -1);
  }

  return value;
}

function sanitizeMongoUri(rawUri) {
  if (!rawUri) {
    return rawUri;
  }

  const compactUri = stripWrappingQuotes(rawUri.trim()).replace(/\s+/g, '');
  const protocolMatch = compactUri.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!protocolMatch) {
    return compactUri;
  }

  const [, protocol, remainder] = protocolMatch;
  const atIndex = remainder.lastIndexOf('@');
  if (atIndex === -1) {
    return compactUri;
  }

  const credentials = remainder.slice(0, atIndex);
  const rest = remainder.slice(atIndex + 1);
  const colonIndex = credentials.indexOf(':');
  if (colonIndex === -1) {
    return compactUri;
  }

  const username = credentials.slice(0, colonIndex);
  const rawPassword = credentials.slice(colonIndex + 1);
  const normalizedUsername = encodeURIComponent(decodeURIComponentSafe(username));
  const passwordWithoutAngles =
    rawPassword.startsWith('<') && rawPassword.endsWith('>')
      ? rawPassword.slice(1, -1)
      : rawPassword;
  const normalizedPassword = encodeURIComponent(decodeURIComponentSafe(passwordWithoutAngles));

  return `${protocol}${normalizedUsername}:${normalizedPassword}@${rest}`;
}

function buildMongoUriFromParts() {
  const hostport = process.env.MONGODB_HOSTPORT?.trim();
  if (!hostport) {
    return null;
  }

  const database = process.env.MONGODB_DATABASE?.trim() || 'kavachforwork';
  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD ?? '';
  const authSource = process.env.MONGODB_AUTH_SOURCE?.trim();
  const credentials = username
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : '';

  const params = new URLSearchParams();
  if (authSource) {
    params.set('authSource', authSource);
  }

  const query = params.toString();
  return `mongodb://${credentials}${hostport}/${database}${query ? `?${query}` : ''}`;
}

function resolveMongoUri() {
  const rawUri = process.env.MONGODB_URI?.trim();

  if (rawUri) {
    const sanitizedUri = sanitizeMongoUri(rawUri);
    if (sanitizedUri !== rawUri) {
      console.log('[Mongo] Normalized MONGODB_URI from environment.');
    }
    return sanitizedUri;
  }

  return buildMongoUriFromParts() || 'mongodb://localhost:27017/kavachforwork';
}

module.exports = { resolveMongoUri };
