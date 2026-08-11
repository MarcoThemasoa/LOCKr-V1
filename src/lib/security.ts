/**
 * security.ts
 *
 * Client-side input sanitization and URL hardening helpers.
 *
 * These utilities are a defense-in-depth layer on top of React's built-in
 * output escaping. They protect against:
 *   - Stored XSS: malicious values (e.g. `javascript:alert(1)`) saved into
 *     Supabase and later rendered into `href` attributes.
 *   - Reflected XSS: user-controlled strings echoed back into the DOM.
 *
 * React already escapes text content, so the primary vector we must close is
 * the `href` attribute (protocol-based injection). We also normalize and
 * constrain every free-text field before it is persisted.
 */

/** Maximum lengths enforced on credential fields (mirrored in schema.sql). */
export const MAX_WEBSITE_LENGTH = 2048;
export const MAX_USERNAME_LENGTH = 200;
export const MAX_PASSWORD_LENGTH = 1000;
export const MAX_NOTES_LENGTH = 10000;

/**
 * Sanitize a free-text value before storing it.
 *
 * - Trims leading/trailing whitespace.
 * - Removes null bytes and control characters (except \n and \t, which are
 *   meaningful in notes).
 * - Collapses runs of whitespace into a single space.
 * - Enforces an optional maximum length.
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (typeof input !== 'string') return '';

  // Strip null bytes and control characters (keep \n and \t).
  let cleaned = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Collapse repeated whitespace into a single space.
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // Trim leading/trailing whitespace (including newlines).
  cleaned = cleaned.trim();

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Sanitize a multi-line notes field.
 * Same as sanitizeText but preserves intentional line breaks.
 */
export function sanitizeNotes(input: string, maxLength?: number): string {
  if (typeof input !== 'string') return '';

  let cleaned = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Trim trailing whitespace on each line, then the whole block.
  cleaned = cleaned
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Normalize a website value into a canonical, safe URL string.
 *
 * - Trims whitespace.
 * - Prepends `https://` when no scheme is present (e.g. "example.com").
 * - Rejects anything that is not http/https (blocks `javascript:`, `data:`,
 *   `vbscript:`, etc.).
 *
 * Returns the normalized URL, or `null` when the value is not a safe URL.
 */
export function normalizeUrl(input: string): string | null {
  if (typeof input !== 'string') return null;

  let candidate = input.trim();
  if (!candidate) return null;

  // Strip any leading control characters or whitespace tricks.
  candidate = candidate.replace(/^[\u0000-\u0020]+/, '');

  // If no scheme is present, assume https.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  // Only http/https are allowed — everything else is a potential XSS vector.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  // Reject URLs with embedded credentials or empty hosts.
  if (!parsed.hostname || parsed.username || parsed.password) {
    return null;
  }

  return parsed.toString();
}

/**
 * Build a safe `href` value for rendering a credential's website link.
 *
 * Returns `null` when the value cannot be safely used as a link target —
 * callers should render plain text instead of an <a> in that case.
 */
export function getSafeHref(website: string): string | null {
  return normalizeUrl(website);
}

/**
 * Validate that a string is a safe, absolute http/https URL.
 * Used by zod refiners in the credential form.
 */
export function isSafeHttpUrl(input: string): boolean {
  return normalizeUrl(input) !== null;
}