import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { canAccessBooking } from "./booking-access";
import {
  GUEST_TRIP_ACCESS_EMAIL_SUBJECT,
  buildGuestTripAccessCodeEmail,
} from "./email/templates/guest-trip-access";
import { sendGuestTripAccessCodeEmail } from "./email/send-guest-trip-access";
import { EMAIL_SEND_FAILURE_MESSAGE } from "./email/resend";
import {
  GUEST_TRIP_CHALLENGE_COOKIE_NAME,
  GUEST_TRIP_GENERIC_MESSAGE,
  GUEST_TRIP_MAX_ATTEMPTS,
  createGuestTripChallengeDecoyToken,
  createGuestTripChallengeToken,
  evaluateGuestTripCodeAttempt,
  generateGuestTripAccessCode,
  getGuestTripChallengeCookieOptions,
  hashGuestTripAccessCode,
  isGuestTripResendCooldownActive,
  isSixDigitGuestTripCode,
  normalizeBookingReference,
  verifyGuestTripChallengeToken,
} from "./guest-trip-access";
import { hashPasswordResetCode } from "./password-reset";
import { sensitiveJson } from "./request-security";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("guest trip OTP generation (D15.2)", () => {
  it("always exactly 6 digits with leading zeros", () => {
    for (let i = 0; i < 30; i += 1) {
      const code = generateGuestTripAccessCode();
      assert.equal(code.length, 6);
      assert.equal(isSixDigitGuestTripCode(code), true);
    }
    assert.equal(isSixDigitGuestTripCode("019284"), true);
  });

  it("does not use Math.random", () => {
    const source = readFileSync(path.join(here, "guest-trip-access.ts"), "utf8");
    assert.match(source, /randomInt/);
    assert.equal(source.includes("Math.random"), false);
  });

  it("uses purpose-separated hash distinct from password reset", () => {
    const code = "482731";
    const hash = hashGuestTripAccessCode(code);
    assert.equal(
      hash,
      createHash("sha256")
        .update(`five-stars-guest-trip:${code}`)
        .digest("hex")
    );
    assert.notEqual(hash, hashPasswordResetCode(code));
  });
});

describe("guest trip request helpers (D15.2)", () => {
  it("A–D. generic message is enumeration-safe", () => {
    assert.match(GUEST_TRIP_GENERIC_MESSAGE, /If the booking information matches/i);
    assert.equal(GUEST_TRIP_GENERIC_MESSAGE.includes("not found"), false);
    assert.equal(GUEST_TRIP_GENERIC_MESSAGE.includes("doesn't match"), false);
  });

  it("normalizes booking reference", () => {
    assert.equal(normalizeBookingReference("  sj-abc123 "), "SJ-ABC123");
  });

  it("F. cooldown enforced", () => {
    const now = Date.parse("2026-09-05T12:00:00.000Z");
    assert.equal(
      isGuestTripResendCooldownActive("2026-09-05T11:59:30.000Z", now),
      true
    );
    assert.equal(
      isGuestTripResendCooldownActive("2026-09-05T11:58:00.000Z", now),
      false
    );
  });
});

describe("guest trip verify helpers (D15.2)", () => {
  const code = "482731";
  const codeHash = hashGuestTripAccessCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  it("I. correct code succeeds", () => {
    assert.equal(
      evaluateGuestTripCodeAttempt({
        submittedCode: code,
        codeHash,
        attemptCount: 0,
        expiresAt,
      }).outcome,
      "accept"
    );
  });

  it("J/K. wrong attempts and fifth invalidates", () => {
    const mid = evaluateGuestTripCodeAttempt({
      submittedCode: "000000",
      codeHash,
      attemptCount: 2,
      expiresAt,
    });
    assert.equal(mid.outcome, "reject");
    if (mid.outcome === "reject") {
      assert.equal(mid.nextAttemptCount, 3);
      assert.equal(mid.invalidate, false);
    }

    const last = evaluateGuestTripCodeAttempt({
      submittedCode: "000000",
      codeHash,
      attemptCount: 4,
      expiresAt,
    });
    assert.equal(last.outcome, "reject");
    if (last.outcome === "reject") {
      assert.equal(last.nextAttemptCount, GUEST_TRIP_MAX_ATTEMPTS);
      assert.equal(last.invalidate, true);
    }
  });

  it("L/M. expired and consumed rejected", () => {
    assert.equal(
      evaluateGuestTripCodeAttempt({
        submittedCode: code,
        codeHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }).outcome,
      "invalid"
    );
    assert.equal(
      evaluateGuestTripCodeAttempt({
        submittedCode: code,
        codeHash,
        attemptCount: 0,
        expiresAt,
        consumedAt: new Date().toISOString(),
      }).outcome,
      "invalid"
    );
  });
});

describe("guest trip challenge context + access scoping (D15.2)", () => {
  it("challenge token verifies; decoy does not", async () => {
    process.env.AUTH_SECRET =
      process.env.AUTH_SECRET ?? "test-auth-secret-for-d15-2-guest-trip";

    const token = await createGuestTripChallengeToken({
      challengeId: 9,
      bookingId: 42,
      bookingReference: "SJ-TRIP01",
    });
    assert.deepEqual(await verifyGuestTripChallengeToken(token), {
      challengeId: 9,
      bookingId: 42,
      bookingReference: "SJ-TRIP01",
    });

    const decoy = await createGuestTripChallengeDecoyToken();
    assert.equal(await verifyGuestTripChallengeToken(decoy), null);
  });

  it("O. authorization for Booking A cannot open Booking B", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 2,
        bookingReference: "SJ-BBBBBB",
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: {
          bookingId: 1,
          bookingReference: "SJ-AAAAAA",
        },
      }),
      false
    );
  });

  it("U/V. reference alone or email alone does not authorize", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 1,
        bookingReference: "SJ-AAAAAA",
        bookingUserId: null,
        currentUserId: null,
        guestAuthorization: null,
      }),
      false
    );
  });

  it("X. guest auth cannot unlock account-owned booking", () => {
    assert.equal(
      canAccessBooking({
        bookingId: 1,
        bookingReference: "SJ-ACCT",
        bookingUserId: 10,
        currentUserId: null,
        guestAuthorization: {
          bookingId: 1,
          bookingReference: "SJ-ACCT",
        },
      }),
      false
    );
  });

  it("cookie options + no-store", () => {
    const options = getGuestTripChallengeCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.maxAge, 600);
    assert.equal(
      GUEST_TRIP_CHALLENGE_COOKIE_NAME,
      "five_stars_guest_trip_challenge"
    );
    assert.match(
      sensitiveJson({ ok: true }).headers.get("Cache-Control") ?? "",
      /no-store/
    );
  });
});

describe("guest trip email template (D15.2)", () => {
  const code = "482731";

  it("subject and body branding", () => {
    const template = buildGuestTripAccessCodeEmail({ code });
    assert.match(template.subject, /Five Stars/);
    assert.equal(template.subject, GUEST_TRIP_ACCESS_EMAIL_SUBJECT);
    assert.match(template.html, new RegExp(code));
    assert.match(template.text, /expires in 10 minutes/i);
    assert.equal(/starjet/i.test(template.html), false);
    assert.equal(/passport/i.test(template.html), false);
  });

  it("uses centralized Resend sender", async () => {
    let from = "";
    const result = await sendGuestTripAccessCodeEmail({
      to: "guest@example.com",
      code,
      env: {
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Five Stars <noreply@updates.fivestarsfly.com>",
      } as unknown as NodeJS.ProcessEnv,
      send: async (payload) => {
        from = payload.from;
        return { id: "msg_guest_1" };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(from, "Five Stars <noreply@updates.fivestarsfly.com>");
  });

  it("provider failure normalized", async () => {
    await assert.rejects(
      () =>
        sendGuestTripAccessCodeEmail({
          to: "guest@example.com",
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
        error.message === EMAIL_SEND_FAILURE_MESSAGE
    );
  });
});
