import { cookies } from "next/headers";

import {
  PasswordResetError,
  completePasswordReset,
} from "../../../../../lib/password-reset-service";
import { PASSWORD_RESET_COOKIE_NAME } from "../../../../../lib/password-reset";
import {
  rejectUntrustedMutation,
  sensitiveJson,
} from "../../../../../lib/request-security";

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);

  if (rejected) {
    return rejected;
  }

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new PasswordResetError("Invalid JSON body.", 400);
    }

    const cookieStore = await cookies();
    const authorizationToken = cookieStore.get(
      PASSWORD_RESET_COOKIE_NAME
    )?.value;

    const result = await completePasswordReset({
      authorizationToken,
      body,
    });

    cookieStore.set(PASSWORD_RESET_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return sensitiveJson({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return sensitiveJson(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Password reset failed", {
      operation: "reset-password",
      code: error instanceof Error ? error.name : "unexpected",
    });

    return sensitiveJson(
      { error: "Unable to update password. Please try again." },
      { status: 500 }
    );
  }
}
