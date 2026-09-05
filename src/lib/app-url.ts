/**
 * Canonical public app origin for security-sensitive links.
 * Prefer NEXT_PUBLIC_APP_URL. Never trust request Host headers.
 */

export function getCanonicalAppUrl(
  envValue: string | null | undefined = process.env.NEXT_PUBLIC_APP_URL
) {
  const raw = envValue?.trim() ?? "";
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return `${url.origin}`;
  } catch {
    return null;
  }
}

export function requireCanonicalAppUrl(
  envValue: string | null | undefined = process.env.NEXT_PUBLIC_APP_URL
) {
  const appUrl = getCanonicalAppUrl(envValue);
  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not configured. Set it to the public app origin."
    );
  }
  return appUrl;
}

export function joinAppPath(baseUrl: string, path: string) {
  const origin = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
