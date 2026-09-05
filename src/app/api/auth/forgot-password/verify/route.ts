import { cookies } from "next/headers";

import {
  PasswordResetError,
  verifyPasswordResetCode,
} from "../../../../../lib/password-reset-service";
import {
  PASSWORD_RESET_COOKIE_NAME,
  PASSWORD_RESET_CODE_ERROR,
  getPasswordResetCookieOptions,
  parsePasswordResetCodeInput,
} from "../../../../../lib/password-reset";
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
      throw new PasswordResetError(PASSWORD_RESET_CODE_ERROR, 400);
    }

    const { email, code } = parsePasswordResetCodeInput(body);
    const result = await verifyPasswordResetCode({ email, code });

    const cookieStore = await cookies();
    cookieStore.set(
      PASSWORD_RESET_COOKIE_NAME,
      result.authorizationToken,
      getPasswordResetCookieOptions()
    );

    return sensitiveJson({
      success: true,
      message: "Code verified. You can create a new password.",
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return sensitiveJson(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Password reset code verification failed", {
      operation: "verify-password-reset-code",
      code: error instanceof Error ? error.name : "unexpected",
    });

    return sensitiveJson(
      { error: PASSWORD_RESET_CODE_ERROR },
      { status: 400 }
    );
  }
}
