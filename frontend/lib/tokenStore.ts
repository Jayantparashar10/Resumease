/**
 * Standalone token store — holds the in-memory access token.
 *
 * Extracted into its own module to break the circular dependency between
 * AuthContext (which manages auth state) and services/api.ts (which needs
 * the token on every request). Both files import from here; neither imports
 * from the other for this purpose.
 */

let _token: string | null = null;

/** Read the current access token. Used by the axios interceptor in api.ts. */
export function getAccessToken(): string | null {
  return _token;
}

/** Store a new access token in memory. Called by AuthContext after login. */
export function setAccessToken(token: string | null): void {
  _token = token;
}
