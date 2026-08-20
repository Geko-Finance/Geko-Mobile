/**
 * Allow-listing for the `redirectUri` accepted by `GET /auth/oauth/:provider/url`.
 *
 * That parameter is forwarded into the OAuth provider URL, so accepting an arbitrary value
 * lets an attacker mint a legitimate-looking authorization URL that delivers the code to a
 * host they control. The app itself only ever needs its own scheme
 * (`Linking.createURL("auth-callback")`), so the allow-list stays small.
 *
 * Prefix matching rather than exact matching, because Expo dev clients produce a host and
 * port that change per machine (`exp://192.168.1.20:8081/--/auth-callback`).
 */

/** Scheme used by the mobile app in release builds (`expo.scheme` in app.json). */
const DEFAULT_ALLOWED_PREFIXES = ['gekomobile://'];

/**
 * Parses the comma-separated `OAUTH_ALLOWED_REDIRECT_PREFIXES` setting. Falls back to the
 * app's own scheme when unset, so a missing env var narrows access rather than opening it.
 */
export function parseAllowedRedirectPrefixes(
  configured: string | undefined,
): string[] {
  const prefixes = (configured ?? '')
    .split(',')
    .map((prefix) => prefix.trim())
    .filter((prefix) => prefix.length > 0);

  return prefixes.length > 0 ? prefixes : DEFAULT_ALLOWED_PREFIXES;
}

export function isAllowedRedirectUri(
  redirectUri: string,
  allowedPrefixes: string[],
): boolean {
  const candidate = redirectUri.trim();

  if (candidate.length === 0) {
    return false;
  }

  return allowedPrefixes.some((prefix) => candidate.startsWith(prefix));
}
