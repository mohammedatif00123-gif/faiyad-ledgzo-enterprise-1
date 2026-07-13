const getHeaderValue = (headers, name) => {
  if (!headers) return null;
  const value = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
};

const normalizeToken = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('Bearer ')) {
      return trimmed.slice(7).trim();
    }
    return trimmed;
  }
  return null;
};

const extractAuthToken = (source = {}) => {
  const headers = source.headers || {};
  const auth = source.auth || {};
  const query = source.query || {};
  const cookies = source.cookies || {};
  const cookieHeader = headers.cookie || source.cookieHeader || '';

  const authorizationHeader = getHeaderValue(headers, 'authorization');
  const normalizedHeader = normalizeToken(authorizationHeader);
  if (normalizedHeader) return normalizedHeader;

  const authToken = normalizeToken(auth.token || auth.accessToken || auth.authorization);
  if (authToken) return authToken;

  const queryToken = normalizeToken(query.token || query.accessToken || query.authorization);
  if (queryToken) return queryToken;

  if (cookies.accessToken) return normalizeToken(cookies.accessToken);

  const accessTokenMatch = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  if (accessTokenMatch) {
    return decodeURIComponent(accessTokenMatch[1]);
  }

  return null;
};

module.exports = {
  extractAuthToken,
};
