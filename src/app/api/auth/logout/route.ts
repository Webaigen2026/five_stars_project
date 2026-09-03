import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  revokeSession,
  verifySessionToken,
} from "../../../../lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const claims = await verifySessionToken(token);

    if (claims?.sessionId) {
      try {
        await revokeSession(claims.sessionId);
      } catch (error) {
        console.error("Failed to revoke session:", error);
      }
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return Response.json({ success: true });
}
