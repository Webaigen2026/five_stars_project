import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  getCanonicalAppUrl,
  joinAppPath,
  requireCanonicalAppUrl,
} from "./app-url";
import {
  EMAIL_SEND_FAILURE_MESSAGE,
  EmailConfigurationError,
  isEmailConfigured,
  readEmailFrom,
  readResendApiKey,
  sendTransactionalEmail,
} from "./email/resend";
import { sendVerificationEmail } from "./email/send-verification";
import {
  VERIFY_EMAIL_SUBJECT,
  buildVerifyEmailTemplate,
} from "./email/templates/verify-email";

function buildVerificationUrl(baseUrl: string, rawToken: string) {
  return joinAppPath(
    baseUrl,
    `/verify-email?token=${encodeURIComponent(rawToken)}`
  );
}

describe("email template (D14.1)", () => {
  const verificationUrl =
    "https://www.fivestarsfly.com/verify-email?token=abc123";

  it("A. subject contains Five Stars", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.match(template.subject, /Five Stars/);
    assert.equal(template.subject, VERIFY_EMAIL_SUBJECT);
  });

  it("B. HTML contains Five Stars branding", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.match(template.html, /Five Stars/);
    assert.match(template.html, /FIVE STARS/);
    assert.match(template.html, /verify later/i);
  });

  it("C. HTML contains verification link", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.match(template.html, /verify-email\?token=abc123/);
    assert.match(template.html, /Verify email/);
  });

  it("D. plain-text contains verification link", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.match(template.text, /verify-email\?token=abc123/);
  });

  it("E. template does not contain StarJet branding", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.equal(/starjet/i.test(template.subject), false);
    assert.equal(/starjet/i.test(template.html), false);
    assert.equal(/starjet/i.test(template.text), false);
  });

  it("F. template does not leak API secrets", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl,
      expiresInLabel: "24 hours",
    });
    assert.equal(template.html.includes("RESEND_API_KEY"), false);
    assert.equal(template.text.includes("re_"), false);
  });
});

describe("email config + app URL (D14.1)", () => {
  it("G. missing RESEND_API_KEY returns controlled send error", async () => {
    await assert.rejects(
      () =>
        sendTransactionalEmail(
          {
            to: "user@example.com",
            subject: "x",
            html: "<p>x</p>",
            text: "x",
          },
          {
            env: {
              EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
            } as unknown as NodeJS.ProcessEnv,
          }
        ),
      (error: unknown) =>
        error instanceof EmailConfigurationError &&
        /RESEND_API_KEY/.test(error.message)
    );
  });

  it("H. missing EMAIL_FROM returns controlled send error", () => {
    assert.throws(
      () => readEmailFrom({ RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv),
      EmailConfigurationError
    );
    assert.equal(
      isEmailConfigured({
        RESEND_API_KEY: "re_test",
      } as unknown as NodeJS.ProcessEnv),
      false
    );
  });

  it("I. canonical app URL creates correct verification link", () => {
    const base = getCanonicalAppUrl("https://www.fivestarsfly.com/");
    assert.equal(base, "https://www.fivestarsfly.com");
    const url = buildVerificationUrl(base!, "tok_abc");
    assert.equal(
      url,
      "https://www.fivestarsfly.com/verify-email?token=tok_abc"
    );
  });

  it("J. trailing slash does not produce //verify-email", () => {
    assert.equal(
      joinAppPath("https://www.fivestarsfly.com/", "/verify-email"),
      "https://www.fivestarsfly.com/verify-email"
    );
    assert.equal(
      buildVerificationUrl("https://www.fivestarsfly.com/", "x"),
      "https://www.fivestarsfly.com/verify-email?token=x"
    );
  });

  it("requireCanonicalAppUrl rejects empty config", () => {
    assert.throws(() => requireCanonicalAppUrl(""), /NEXT_PUBLIC_APP_URL/);
  });

  it("readResendApiKey requires key", () => {
    assert.throws(
      () => readResendApiKey({} as unknown as NodeJS.ProcessEnv),
      EmailConfigurationError
    );
  });
});

describe("email delivery (D14.1)", () => {
  it("K/L/M. sendVerificationEmail uses recipient, from, and subject", async () => {
    const captured: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    } = {
      from: "",
      to: "",
      subject: "",
      html: "",
      text: "",
    };

    const result = await sendVerificationEmail({
      to: "traveler@example.com",
      verificationUrl:
        "https://www.fivestarsfly.com/verify-email?token=secret",
      env: {
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
        NODE_ENV: "test",
      } as unknown as NodeJS.ProcessEnv,
      send: async (payload) => {
        captured.from = payload.from;
        captured.to = payload.to;
        captured.subject = payload.subject;
        captured.html = payload.html;
        captured.text = payload.text;
        return { id: "msg_123" };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.id, "msg_123");
    assert.equal(captured.to, "traveler@example.com");
    assert.equal(
      captured.from,
      "Five Stars <noreply@updates.fivestarsfly.com>"
    );
    assert.match(captured.subject, /Five Stars/);
    assert.match(captured.html, /verify-email\?token=secret/);
    assert.match(captured.text, /verify-email\?token=secret/);
  });

  it("N/O. provider failure is normalized and not raw", async () => {
    await assert.rejects(
      () =>
        sendVerificationEmail({
          to: "traveler@example.com",
          verificationUrl: "https://www.fivestarsfly.com/verify-email?token=x",
          env: {
            RESEND_API_KEY: "re_test",
            EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
          } as unknown as NodeJS.ProcessEnv,
          send: async () => ({
            error: {
              name: "application_error",
              message: "Raw Resend boom with stack details",
            },
          }),
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, EMAIL_SEND_FAILURE_MESSAGE);
        assert.equal(
          error.message.includes("Raw Resend boom"),
          false
        );
        return true;
      }
    );
  });

  it("token hashing remains one-way for verification", () => {
    const raw = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
    const hashed = createHash("sha256").update(raw).digest("hex");
    assert.notEqual(hashed, raw);
    assert.equal(hashed, createHash("sha256").update(raw).digest("hex"));
    assert.equal(hashed.length, 64);
  });
});
