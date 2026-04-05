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
  return process.env.MONGODB_URI?.trim()
    || buildMongoUriFromParts()
    || 'mongodb://localhost:27017/kavachforwork';
}

module.exports = { resolveMongoUri };
