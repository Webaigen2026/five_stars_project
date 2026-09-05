import {
  PasswordResetError,
  requestPasswordResetCode,
} from "../../../../lib/password-reset-service";
import { PASSWORD_RESET_GENERIC_MESSAGE } from "../../../../lib/password-reset";
import { rejectUntrustedMutation, sensitiveJson } from "../../../../lib/request-security";

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
      body = {};
    }

    const email =
      body && typeof body === "object"
        ? typeof (body as Record<string, unknown>).email === "string"
          ? ((body as Record<string, unknown>).email as string)
          : ""
        : "";

    const result = await requestPasswordResetCode({ email });

    return sensitiveJson({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return sensitiveJson(
        { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE },
        { status: 200 }
      );
    }

    console.error("Forgot password request failed", {
      operation: "forgot-password",
      code: error instanceof Error ? error.name : "unexpected",
    });

    return sensitiveJson({
      success: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    });
  }
}
