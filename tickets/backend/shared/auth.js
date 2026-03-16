'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');

const REGION      = process.env.AWS_REGION || 'us-east-1';
const USER_POOL   = process.env.COGNITO_USER_POOL_ID;
const ISSUER      = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL}`;
const JWKS_URL    = new URL(`${ISSUER}/.well-known/jwks.json`);
const DEFAULT_ORG = process.env.DEFAULT_ORG_ID || 'nsmt';

let JWKS;
function getJWKS() {
  if (!JWKS) JWKS = createRemoteJWKSet(JWKS_URL);
  return JWKS;
}

/**
 * Validate a Cognito JWT from the Authorization header.
 * Returns { sub, email, orgId, groups }.
 * Throws if token is missing or invalid.
 */
async function requireAuth(event) {
  const header = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'] || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });

  const { payload } = await jwtVerify(token, getJWKS(), { issuer: ISSUER });

  const groups = payload['cognito:groups'] || [];
  // Derive orgId from the first group that ends in "-admin", e.g. "nsmt-admin" → "nsmt"
  const adminGroup = groups.find((g) => g.endsWith('-admin'));
  const orgId = adminGroup ? adminGroup.replace(/-admin$/, '') : DEFAULT_ORG;

  return { sub: payload.sub, email: payload.email, orgId, groups };
}

/**
 * Extract orgId for public (unauthenticated) requests.
 * Reads ?orgId= query param, defaulting to "nsmt".
 * Validates against a static allowlist so callers can't inject arbitrary org IDs.
 */
function publicOrgId(event) {
  const qs = event.queryStringParameters || {};
  const requested = qs.orgId || DEFAULT_ORG;
  // In v1 this is always "nsmt". Multi-org: load allowlist from nsmt-orgs table.
  const allowed = (process.env.ALLOWED_ORG_IDS || DEFAULT_ORG).split(',');
  if (!allowed.includes(requested)) return DEFAULT_ORG;
  return requested;
}

module.exports = { requireAuth, publicOrgId };
