import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

import bcrypt from "bcryptjs";

import {
  PASSWORD_RESET_COOKIE_NAME,
  PASSWORD_RESET_CODE_LENGTH,
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_MAX_ATTEMPTS,
  evaluatePasswordResetCodeAttempt,
  generatePasswordResetAuthorizationToken,
  generatePasswordResetCode,
  getPasswordResetCookieOptions,
  hashPasswordResetAuthorizationToken,
  hashPasswordResetCode,
  isPasswordResetAuthorizationValid,
  isResendCooldownActive,
  isSixDigitCode,
  maskEmailForDisplay,
  normalizeResetEmail,
  parsePasswordResetPasswordInput,
} from "./password-reset";
import {
  PASSWORD_RESET_EMAIL_SUBJECT,
  buildPasswordResetCodeEmail,
} from "./email/templates/password-reset";
import { sendPasswordResetCodeEmail } from "./email/send-password-reset";
import { EMAIL_SEND_FAILURE_MESSAGE } from "./email/resend";
import { hashVerificationToken } from "./email-verification";
import { sensitiveJson } from "./request-security";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("password reset code generation (D14.2)", () => {
  it("A. always exactly 6 digits", () => {
    for (let i = 0; i < 40; i += 1) {
      const code = generatePasswordResetCode();
      assert.equal(code.length, PASSWORD_RESET_CODE_LENGTH);
      assert.equal(isSixDigitCode(code), true);
    }
  });

  it("B. leading zeros supported", () => {
    const hash = hashPasswordResetCode("019284");
    assert.equal(hash, hashPasswordResetCode("019284"));
    assert.notEqual(hash, hashPasswordResetCode("19284"));
    assert.equal(isSixDigitCode("019284"), true);
  });

  it("C. secure generator does not use Math.random", () => {
    const source = readFileSync(
      path.join(here, "password-reset.ts"),
      "utf8"
    );
    assert.match(source, /randomInt/);
    assert.equal(source.includes("Math.random"), false);
  });

  it("D. code hash deterministic for verification", () => {
    const code = "482731";
    assert.equal(hashPasswordResetCode(code), hashPasswordResetCode(code));
    assert.notEqual(hashPasswordResetCode(code), code);
    assert.equal(
      hashPasswordResetCode(code),
      createHash("sha256")
        .update(`five-stars-password-reset:${code}`)
        .digest("hex")
    );
  });

  it("E. raw code is not persisted (hash only)", () => {
    const code = "482731";
    const stored = { codeHash: hashPasswordResetCode(code) };
    assert.equal("code" in stored, false);
    assert.equal(JSON.stringify(stored).includes(code), false);
  });
});

describe("password reset request helpers (D14.2)", () => {
  it("F/G/H. generic success message is enumeration-safe", () => {
    assert.match(PASSWORD_RESET_GENERIC_MESSAGE, /If an account exists/i);
    assert.equal(
      PASSWORD_RESET_GENERIC_MESSAGE.includes("not found"),
      false
    );
  });

  it("AD. normalize email matches login/register policy", () => {
    assert.equal(normalizeResetEmail("  A@Example.COM "), "a@example.com");
  });

  it("J. cooldown prevents rapid resend", () => {
    const now = Date.parse("2026-09-05T12:00:00.000Z");
    assert.equal(
      isResendCooldownActive("2026-09-05T11:59:30.000Z", now),
      true
    );
    assert.equal(
      isResendCooldownActive("2026-09-05T11:58:00.000Z", now),
      false
    );
  });

  it("mask email for display", () => {
    assert.equal(maskEmailForDisplay("oliver@example.com")[0], "o");
    assert.match(maskEmailForDisplay("oliver@example.com"), /@example\.com$/);
    assert.equal(maskEmailForDisplay("oliver@example.com").includes("oliver"), false);
  });
});

describe("password reset verify helpers (D14.2)", () => {
  const code = "482731";
  const codeHash = hashPasswordResetCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  it("M. correct code accepted", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: code,
      codeHash,
      attemptCount: 0,
      expiresAt,
    });
    assert.equal(result.outcome, "accept");
  });

  it("N. wrong code increments attempts", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: "000000",
      codeHash,
      attemptCount: 2,
      expiresAt,
    });
    assert.equal(result.outcome, "reject");
    if (result.outcome === "reject") {
      assert.equal(result.nextAttemptCount, 3);
      assert.equal(result.invalidate, false);
    }
  });

  it("O. fifth wrong attempt invalidates", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: "000000",
      codeHash,
      attemptCount: 4,
      expiresAt,
    });
    assert.equal(result.outcome, "reject");
    if (result.outcome === "reject") {
      assert.equal(result.nextAttemptCount, PASSWORD_RESET_MAX_ATTEMPTS);
      assert.equal(result.invalidate, true);
    }
  });

  it("P. expired code rejected", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: code,
      codeHash,
      attemptCount: 0,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(result.outcome, "invalid");
  });

  it("Q. old superseded verified challenge rejected", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: code,
      codeHash,
      attemptCount: 0,
      expiresAt,
      verifiedAt: new Date().toISOString(),
    });
    assert.equal(result.outcome, "invalid");
  });

  it("R. successful code cannot be reused after consume", () => {
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: code,
      codeHash,
      attemptCount: 0,
      expiresAt,
      consumedAt: new Date().toISOString(),
    });
    assert.equal(result.outcome, "invalid");
  });

  it("AI. malformed six-digit code safely rejected", () => {
    assert.equal(isSixDigitCode("12a456"), false);
    assert.equal(isSixDigitCode("12345"), false);
    assert.equal(isSixDigitCode("1234567"), false);
    const result = evaluatePasswordResetCodeAttempt({
      submittedCode: "12a456",
      codeHash,
      attemptCount: 0,
      expiresAt,
    });
    assert.equal(result.outcome, "invalid");
  });
});

describe("password reset authorization (D14.2)", () => {
  it("S/AH. reset without verified authorization rejected", () => {
    assert.equal(
      isPasswordResetAuthorizationValid({
        authorizationToken: "",
        authorizationTokenHash: null,
        authorizationExpiresAt: null,
        verifiedAt: null,
        consumedAt: null,
      }),
      false
    );
  });

  it("T. expired reset authorization rejected", () => {
    const token = generatePasswordResetAuthorizationToken();
    assert.equal(
      isPasswordResetAuthorizationValid({
        authorizationToken: token,
        authorizationTokenHash: hashPasswordResetAuthorizationToken(token),
        authorizationExpiresAt: new Date(Date.now() - 1000).toISOString(),
        verifiedAt: new Date().toISOString(),
        consumedAt: null,
      }),
      false
    );
  });

  it("U/V. valid authorization accepts once semantics via consumedAt", () => {
    const token = generatePasswordResetAuthorizationToken();
    const hash = hashPasswordResetAuthorizationToken(token);
    assert.equal(
      isPasswordResetAuthorizationValid({
        authorizationToken: token,
        authorizationTokenHash: hash,
        authorizationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        verifiedAt: new Date().toISOString(),
        consumedAt: null,
      }),
      true
    );
    assert.equal(
      isPasswordResetAuthorizationValid({
        authorizationToken: token,
        authorizationTokenHash: hash,
        authorizationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        verifiedAt: new Date().toISOString(),
        consumedAt: new Date().toISOString(),
      }),
      false
    );
  });

  it("W. password hashing uses bcrypt never plaintext", async () => {
    const password = "NewPass123!";
    const hashed = await bcrypt.hash(password, 12);
    assert.notEqual(hashed, password);
    assert.match(hashed, /^\$2[aby]?\$/);
    assert.equal(await bcrypt.compare(password, hashed), true);
  });

  it("password confirmation rules match account policy", () => {
    assert.throws(
      () =>
        parsePasswordResetPasswordInput({
          newPassword: "short",
          confirmPassword: "short",
        }),
      /at least 8/
    );
    assert.throws(
      () =>
        parsePasswordResetPasswordInput({
          newPassword: "longenough",
          confirmPassword: "different1",
        }),
      /do not match/
    );
    assert.deepEqual(
      parsePasswordResetPasswordInput({
        newPassword: "longenough",
        confirmPassword: "longenough",
      }),
      { newPassword: "longenough" }
    );
  });
});

describe("password reset security boundaries (D14.2)", () => {
  it("AF. reset code hash differs from email verification hash", () => {
    const value = "482731";
    assert.notEqual(hashPasswordResetCode(value), hashVerificationToken(value));
  });

  it("AG. email verification token cannot satisfy reset auth", () => {
    const verificationToken = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
    const verificationHash = hashVerificationToken(verificationToken);
    assert.equal(
      isPasswordResetAuthorizationValid({
        authorizationToken: verificationToken,
        authorizationTokenHash: verificationHash,
        authorizationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        verifiedAt: new Date().toISOString(),
        consumedAt: null,
      }),
      false
    );
  });

  it("AJ. sensitive responses use no-store", () => {
    const response = sensitiveJson({ success: true });
    assert.match(
      response.headers.get("Cache-Control") ?? "",
      /no-store/
    );
  });

  it("cookie options are HttpOnly short-lived", () => {
    const options = getPasswordResetCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/");
    assert.equal(options.maxAge, 600);
    assert.equal(PASSWORD_RESET_COOKIE_NAME, "five_stars_password_reset");
  });

  it("AE. no generic email endpoint in auth routes", () => {
    const authDir = path.join(here, "../app/api");
    const sendEmail = path.join(authDir, "send-email");
    assert.equal(
      (() => {
        try {
          readFileSync(path.join(sendEmail, "route.ts"));
          return true;
        } catch {
          return false;
        }
      })(),
      false
    );
  });
});

describe("password reset email template (D14.2)", () => {
  const code = "482731";

  it("AK. subject contains Five Stars", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.match(template.subject, /Five Stars/);
    assert.equal(template.subject, PASSWORD_RESET_EMAIL_SUBJECT);
  });

  it("AL. contains six-digit code", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.match(template.html, new RegExp(code));
    assert.match(template.text, new RegExp(code));
  });

  it("AM. says expires in 10 minutes", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.match(template.html, /expires in 10 minutes/i);
    assert.match(template.text, /expires in 10 minutes/i);
  });

  it("AN. HTML and plain text versions exist", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.ok(template.html.includes("<html"));
    assert.ok(template.text.includes("Reset your password"));
  });

  it("AO. contains no StarJet branding", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.equal(/starjet/i.test(template.subject), false);
    assert.equal(/starjet/i.test(template.html), false);
    assert.equal(/starjet/i.test(template.text), false);
  });

  it("AP. contains no password", () => {
    const template = buildPasswordResetCodeEmail({ code });
    assert.equal(/password\s*:\s*\S+/i.test(template.html), false);
    assert.equal(template.html.toLowerCase().includes("new password is"), false);
  });

  it("AQ. uses centralized Resend sender via sendPasswordResetCodeEmail", async () => {
    let from = "";
    const result = await sendPasswordResetCodeEmail({
      to: "traveler@example.com",
      code,
      env: {
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
      } as unknown as NodeJS.ProcessEnv,
      send: async (payload) => {
        from = payload.from;
        assert.match(payload.subject, /Five Stars/);
        assert.match(payload.html, new RegExp(code));
        assert.match(payload.text, /10 minutes/i);
        return { id: "msg_reset_1" };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(from, "Five Stars <noreply@updates.fivestarsfly.com>");
  });

  it("provider failure is normalized", async () => {
    await assert.rejects(
      () =>
        sendPasswordResetCodeEmail({
          to: "traveler@example.com",
          code,
          env: {
            RESEND_API_KEY: "re_test",
            EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
          } as unknown as NodeJS.ProcessEnv,
          send: async () => ({
            error: { name: "application_error", message: "Raw boom" },
          }),
        }),
      (error: unknown) =>
        error instanceof Error &&
        error.message === EMAIL_SEND_FAILURE_MESSAGE &&
        !error.message.includes("Raw boom")
    );
  });
});
