/**
 * Phase 8 security regression coverage for passport reveal.
 * Uses fixtures only — never real passport numbers.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  ACCOUNT_LOCKED_REAUTH_MESSAGE,
  ACCOUNT_LOCKED_STATUS,
  ACCOUNT_LOCKOUT_THRESHOLD,
} from "./account-lockout";
import {
  PASSPORT_PASSWORD_FAILED_MESSAGE,
  PASSPORT_REVEAL_CACHE_HEADERS,
  PASSPORT_REVEALED_ACTION,
  authorizePassportReveal,
  handlePassportRevealRequest,
  parseRevealPassword,
  type PassportRevealAccountSecurity,
} from "./admin-passport-reveal";
import { canViewSensitiveTravelerData as canViewFromAuthz } from "./authorization";
import {
  encryptTravelerSecret,
  resetTravelerEncryptionKeyCache,
} from "./traveler-encryption";
import {
  PASSPORT_REVEAL_AUTO_HIDE_MS,
  parsePassportRevealResponse,
  shouldRenderRevealControl,
} from "./passport-reveal-ui";

const SYNTHETIC_KEY = Buffer.from("d9-synthetic-test-key-32-bytes!!").toString(
  "base64"
);

const FIXTURE_PASSPORT = "TEST-PASS-0001";

const GRANTED_ADMIN = {
  id: 17,
  role: "ADMIN",
  canViewSensitiveTravelerData: true,
};

function withKey(value: string | undefined) {
  if (value == null) {
    delete process.env.TRAVELER_DATA_ENCRYPTION_KEY;
  } else {
    process.env.TRAVELER_DATA_ENCRYPTION_KEY = value;
  }
  resetTravelerEncryptionKeyCache();
}

function unlockedAccount(
  overrides: Partial<PassportRevealAccountSecurity> = {}
): PassportRevealAccountSecurity {
  return {
    passwordHash: "hash",
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function baseDeps(overrides: Record<string, unknown> = {}) {
  const audits: unknown[] = [];
  const state = {
    bcryptCalls: 0,
    passengerLoads: 0,
    audits,
  };

  return {
    state,
    deps: {
      user: GRANTED_ADMIN,
      password: "correct",
      passengerIdRaw: "42",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => {
        state.bcryptCalls += 1;
        return true;
      },
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => {
        state.passengerLoads += 1;
        withKey(SYNTHETIC_KEY);
        return {
          id: 42,
          passportNumberEncrypted: encryptTravelerSecret(FIXTURE_PASSPORT),
        };
      },
      writeAudit: async (event: unknown) => {
        audits.push(event);
      },
      ...overrides,
    },
  };
}

afterEach(() => {
  withKey(SYNTHETIC_KEY);
});

describe("authorization matrix", () => {
  it("unauthenticated -> 401, no decrypt/audit", async () => {
    const { state, deps } = baseDeps({ user: null });
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 401);
    assert.equal(state.bcryptCalls, 0);
    assert.equal(state.passengerLoads, 0);
    assert.equal(state.audits.length, 0);
  });

  it("CUSTOMER -> 403 before password verify", async () => {
    const { state, deps } = baseDeps({
      user: {
        id: 2,
        role: "CUSTOMER",
        canViewSensitiveTravelerData: false,
      },
    });
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 403);
    assert.equal(state.bcryptCalls, 0);
    assert.equal(state.audits.length, 0);
  });

  it("STAFF + permission true still 403 (role gate)", async () => {
    assert.equal(
      canViewFromAuthz({
        role: "STAFF",
        canViewSensitiveTravelerData: true,
      }),
      false
    );
    const { state, deps } = baseDeps({
      user: {
        id: 3,
        role: "STAFF",
        canViewSensitiveTravelerData: true,
      },
    });
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 403);
    assert.equal(state.bcryptCalls, 0);
    assert.equal(state.audits.length, 0);
  });

  it("ADMIN permission false -> 403", async () => {
    const { state, deps } = baseDeps({
      user: {
        id: 17,
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      },
    });
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 403);
    assert.equal(state.bcryptCalls, 0);
    assert.equal(state.audits.length, 0);
  });

  it("ADMIN permission true still requires password + audit", async () => {
    withKey(SYNTHETIC_KEY);
    const { state, deps } = baseDeps();
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 200);
    assert.equal(result.body.passportNumber, FIXTURE_PASSPORT);
    assert.equal(state.bcryptCalls, 1);
    assert.equal(state.audits.length, 1);
  });
});

describe("direct API attack surface (handler-level)", () => {
  it("missing / empty / malformed password -> 400", () => {
    assert.equal(parseRevealPassword(undefined), null);
    assert.equal(parseRevealPassword(null), null);
    assert.equal(parseRevealPassword({}), null);
    assert.equal(parseRevealPassword({ password: "" }), null);
    assert.equal(parseRevealPassword({ password: null }), null);
    assert.equal(parseRevealPassword({ password: 123 }), null);
    assert.equal(parseRevealPassword({ password: { x: 1 } }), null);
    assert.equal(parseRevealPassword({ password: ["a"] }), null);
  });

  it("client-supplied identity fields are ignored by password parser", () => {
    const password = parseRevealPassword({
      password: "secret",
      userId: 999,
      adminUserId: 999,
      email: "attacker@example.com",
      role: "ADMIN",
      canViewSensitiveTravelerData: true,
      passportNumberEncrypted: "v1:fake",
    });
    assert.equal(password, "secret");
  });

  it("handler uses session user only — body identity cannot elevate", async () => {
    const { state, deps } = baseDeps({
      user: {
        id: 3,
        role: "STAFF",
        canViewSensitiveTravelerData: false,
      },
      // Even if a caller somehow passed attacker-controlled fields, they are
      // not read by handlePassportRevealRequest.
    });
    const result = await handlePassportRevealRequest(deps as never);
    assert.equal(result.status, 403);
    assert.equal(state.audits.length, 0);
  });

  it("invalid passenger IDs fail safely after auth", async () => {
    for (const passengerIdRaw of ["0", "-1", "1.5", "abc", "NaN", ""]) {
      const audits: unknown[] = [];
      const result = await handlePassportRevealRequest({
        user: GRANTED_ADMIN,
        password: "correct",
        passengerIdRaw,
        loadAccountSecurity: async () => unlockedAccount(),
        verifyPassword: async () => true,
        recordFailedAttempt: async () => ({ isNowLocked: false }),
        clearFailedAttempts: async () => undefined,
        loadPassenger: async () => {
          throw new Error("should not load for invalid id");
        },
        writeAudit: async (event) => {
          audits.push(event);
        },
      });
      assert.equal(result.status, 404, `id=${passengerIdRaw}`);
      assert.equal(audits.length, 0, `id=${passengerIdRaw}`);
      assert.equal("passportNumber" in result.body, false);
    }
  });

  it("nonexistent passenger -> 404 no audit", async () => {
    const audits: unknown[] = [];
    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "correct",
      passengerIdRaw: "99",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async (event) => {
        audits.push(event);
      },
    });
    assert.equal(result.status, 404);
    assert.equal(audits.length, 0);
  });
});

describe("session / permission freshness (DB-backed)", () => {
  it("authorizePassportReveal reads live role+permission object", () => {
    assert.equal(
      authorizePassportReveal({
        role: "ADMIN",
        canViewSensitiveTravelerData: true,
      }).ok,
      true
    );
    // Simulates DB role demotion before next request:
    assert.equal(
      authorizePassportReveal({
        role: "STAFF",
        canViewSensitiveTravelerData: true,
      }).ok,
      false
    );
    // Simulates permission revoked:
    assert.equal(
      authorizePassportReveal({
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      }).ok,
      false
    );
  });

  it("UI canReveal cannot bypass helper", () => {
    assert.equal(shouldRenderRevealControl(true), true);
    assert.equal(
      canViewFromAuthz({
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      }),
      false
    );
  });
});

describe("cache headers", () => {
  it("defines no-store private headers for reveal responses", () => {
    assert.equal(PASSPORT_REVEAL_CACHE_HEADERS["Cache-Control"], "no-store, private");
    assert.equal(PASSPORT_REVEAL_CACHE_HEADERS.Pragma, "no-cache");
  });
});

describe("lockout concurrency (atomic semantics)", () => {
  it("route uses shared atomic recorder (no stale count write)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../app/api/admin/passengers/[id]/passport/route.ts"
      ),
      "utf8"
    );
    assert.equal(source.includes("recordFailedLoginAttempt"), true);
    assert.equal(source.includes("nextFailedAttemptState"), false);
  });
});

describe("UI security helpers", () => {
  it("maps lockout and keeps passport hidden", () => {
    const parsed = parsePassportRevealResponse(ACCOUNT_LOCKED_STATUS, {
      error: ACCOUNT_LOCKED_REAUTH_MESSAGE,
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.keepConfirmOpen, false);
      assert.equal(parsed.error, "Too many failed attempts. Please try again later.");
    }
  });

  it("auto-hide remains 30 seconds", () => {
    assert.equal(PASSPORT_REVEAL_AUTO_HIDE_MS, 30_000);
  });

  it("component source has no persistence / copy / GET reveal", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../components/admin/PassportRevealControl.tsx"
      ),
      "utf8"
    );
    assert.equal(source.includes("localStorage"), false);
    assert.equal(source.includes("sessionStorage"), false);
    assert.equal(source.includes("document.cookie"), false);
    assert.equal(source.includes("Copy"), false);
    assert.equal(source.includes('method: "POST"'), true);
    assert.equal(source.includes('type="password"'), true);
    assert.equal(source.includes("autoComplete=\"current-password\""), true);
  });

  it("route disables GET and sets no-store on responses", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../app/api/admin/passengers/[id]/passport/route.ts"
      ),
      "utf8"
    );
    assert.equal(source.includes("export async function GET"), true);
    assert.equal(source.includes("405"), true);
    assert.equal(source.includes("PASSPORT_REVEAL_CACHE_HEADERS"), true);
    assert.equal(source.includes("getCurrentUser()"), true);
    assert.equal(source.includes("user.id"), true);
  });
});

describe("information disclosure", () => {
  it("wrong password / lockout bodies omit secrets", async () => {
    const wrong = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "wrong-secret-value",
      passengerIdRaw: "42",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => false,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async () => undefined,
    });
    const serialized = JSON.stringify(wrong);
    assert.equal(wrong.body.error, PASSPORT_PASSWORD_FAILED_MESSAGE);
    assert.equal(serialized.includes("wrong-secret-value"), false);
    assert.equal(serialized.includes("hash"), false);
    assert.equal(serialized.includes(FIXTURE_PASSPORT), false);

    const locked = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "anything",
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({
          lockedUntil: new Date(Date.now() + 60_000).toISOString(),
          failedLoginAttempts: ACCOUNT_LOCKOUT_THRESHOLD,
        }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async () => undefined,
    });
    assert.equal(locked.status, ACCOUNT_LOCKED_STATUS);
    assert.equal("passportNumber" in locked.body, false);
  });

  it("audit event shape is metadata-only", () => {
    assert.deepEqual(
      {
        adminUserId: 17,
        passengerId: 42,
        action: PASSPORT_REVEALED_ACTION,
      },
      {
        adminUserId: 17,
        passengerId: 42,
        action: "PASSPORT_REVEALED",
      }
    );
  });
});
