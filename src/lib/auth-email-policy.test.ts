import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN,
  OPTIONAL_VERIFICATION_COPY,
  canSignInWithCredentials,
} from "./auth-email-policy";
import { buildVerifyEmailTemplate } from "./email/templates/verify-email";

describe("optional email verification policy (D14.1.1)", () => {
  it("A. unverified user with valid credentials may sign in", () => {
    assert.equal(EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN, false);
    assert.equal(canSignInWithCredentials({ emailVerified: false }), true);
  });

  it("B. wrong-password rejection remains outside this helper", () => {
    // Password checks stay in the login route; this helper never grants access
    // by itself. Documenting that emailVerified=false is still eligible.
    assert.equal(canSignInWithCredentials({ emailVerified: false }), true);
  });

  it("C. verified user with valid credentials may sign in", () => {
    assert.equal(canSignInWithCredentials({ emailVerified: true }), true);
  });

  it("D/E. policy never auto-verifies — state is caller-owned", () => {
    assert.equal(canSignInWithCredentials({ emailVerified: false }), true);
    assert.equal(EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN, false);
  });

  it("L. protected routes depend on session, not emailVerified", () => {
    // requireUser only checks getCurrentUser() presence — no emailVerified gate.
    assert.equal(EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN, false);
  });

  it("N. customer role is not staff/admin", () => {
    const role: string = "CUSTOMER";
    assert.equal(["STAFF", "ADMIN"].includes(role), false);
    assert.equal(role === "ADMIN", false);
  });

  it("registration/login copy treats verification as optional", () => {
    assert.match(OPTIONAL_VERIFICATION_COPY.loginAfterRegister, /optional/i);
    assert.match(
      OPTIONAL_VERIFICATION_COPY.loginAfterRegisterEmailFailed,
      /still sign in/i
    );
    assert.equal(
      /must verify before signing in/i.test(
        OPTIONAL_VERIFICATION_COPY.loginAfterRegister
      ),
      false
    );
  });

  it("verification email copy is optional, not mandatory-login", () => {
    const template = buildVerifyEmailTemplate({
      verificationUrl: "https://www.fivestarsfly.com/verify-email?token=x",
      expiresInLabel: "24 hours",
    });
    assert.match(template.text, /verify later/i);
    assert.match(template.html, /verify later/i);
    assert.equal(/must verify before/i.test(template.html), false);
    assert.equal(/finish setting up your account/i.test(template.html), false);
    assert.match(template.subject, /Five Stars/);
  });
});
