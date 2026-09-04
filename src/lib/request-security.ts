const SENSITIVE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getTrustedMutationOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(request.url);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    const configuredOrigin = normalizeOrigin(configured);

    if (configuredOrigin) {
      origins.add(configuredOrigin);
    }
  }

  return origins;
}

export function isTrustedMutationOrigin(request: Request) {
  const rawOrigin = request.headers.get("origin");

  if (!rawOrigin) {
    // Absent Origin is allowed. Cookie-authenticated browser form posts
    // from other sites send Origin; local scripts and some same-site
    // requests do not. SameSite=Lax still applies to the session cookie.
    return true;
  }

  const origin = normalizeOrigin(rawOrigin);

  if (!origin) {
    return false;
  }

  return getTrustedMutationOrigins(request).has(origin);
}

export function rejectUntrustedMutation(request: Request) {
  if (isTrustedMutationOrigin(request)) {
    return null;
  }

  return sensitiveJson({ error: "Forbidden." }, { status: 403 });
}

export function sensitiveJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", SENSITIVE_CACHE_HEADERS["Cache-Control"]);
  headers.set("Pragma", SENSITIVE_CACHE_HEADERS.Pragma);

  return Response.json(data, {
    ...init,
    headers,
  });
}
