import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  ACCOUNT_LOCKED_REAUTH_MESSAGE,
  ACCOUNT_LOCKED_STATUS,
  ACCOUNT_LOCKOUT_THRESHOLD,
} from "./account-lockout";
import {
  PASSPORT_PASSWORD_FAILED_MESSAGE,
  PASSPORT_PASSWORD_REQUIRED_MESSAGE,
  PASSPORT_REVEAL_AUDIT_FAILURE_MESSAGE,
  PASSPORT_REVEALED_ACTION,
  PASSPORT_UNAVAILABLE_MESSAGE,
  authorizePassportReveal,
  buildPassportRevealAuditEvent,
  handlePassportRevealRequest,
  mapPassportRevealFailure,
  parseRevealPassword,
  revealPassengerPassportNumber,
  type PassportRevealAccountSecurity,
} from "./admin-passport-reveal";
import {
  TravelerEncryptionError,
  encryptTravelerSecret,
  resetTravelerEncryptionKeyCache,
} from "./traveler-encryption";

const SYNTHETIC_KEY = Buffer.from("d9-synthetic-test-key-32-bytes!!").toString(
  "base64"
);

const GRANTED_ADMIN = {
  id: 17,
  role: "ADMIN",
  canViewSensitiveTravelerData: true,
};

const CORRECT_PASSWORD = "correct-admin-password";
const PASSWORD_HASH = "hash-placeholder";

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
    passwordHash: PASSWORD_HASH,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

afterEach(() => {
  withKey(SYNTHETIC_KEY);
});

describe("authorizePassportReveal", () => {
  it("returns 401 when unauthenticated", () => {
    assert.equal(authorizePassportReveal(null).ok, false);
  });

  it("returns 403 for STAFF", () => {
    const result = authorizePassportReveal({
      role: "STAFF",
      canViewSensitiveTravelerData: true,
    });
    assert.equal(result.ok, false);
  });

  it("returns 403 for ADMIN without permission", () => {
    const result = authorizePassportReveal({
      role: "ADMIN",
      canViewSensitiveTravelerData: false,
    });
    assert.equal(result.ok, false);
  });
});

describe("parseRevealPassword", () => {
  it("accepts a non-empty password string", () => {
    assert.equal(parseRevealPassword({ password: "secret" }), "secret");
  });

  it("rejects missing password", () => {
    assert.equal(parseRevealPassword({}), null);
  });
});

describe("revealPassengerPassportNumber", () => {
  it("returns plaintext for valid ciphertext", () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret("HT1234567");
    assert.equal(
      revealPassengerPassportNumber({ passportNumberEncrypted: encrypted }),
      "HT1234567"
    );
  });
});

describe("mapPassportRevealFailure", () => {
  it("returns a safe client message", () => {
    const mapped = mapPassportRevealFailure(
      new TravelerEncryptionError(
        "TRAVELER_ENCRYPTION_MISSING",
        "Unable to read traveler document data."
      )
    );
    assert.equal(mapped.error, PASSPORT_UNAVAILABLE_MESSAGE);
  });
});

describe("buildPassportRevealAuditEvent", () => {
  it("never contains passport or password fields", () => {
    const event = buildPassportRevealAuditEvent({
      adminUserId: 17,
      passengerId: 42,
    });
    const serialized = JSON.stringify(event);
    assert.equal(serialized.includes("passport"), false);
    assert.equal(serialized.includes("password"), false);
  });
});

describe("handlePassportRevealRequest lockout + re-auth", () => {
  it("account already locked blocks before bcrypt/decrypt/audit", async () => {
    let bcryptCalls = 0;
    let passengerLoads = 0;
    const audits: unknown[] = [];

    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: CORRECT_PASSWORD,
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({
          lockedUntil: new Date(Date.now() + 60_000).toISOString(),
          failedLoginAttempts: ACCOUNT_LOCKOUT_THRESHOLD,
        }),
      verifyPassword: async () => {
        bcryptCalls += 1;
        return true;
      },
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => {
        passengerLoads += 1;
        return null;
      },
      writeAudit: async (event) => {
        audits.push(event);
      },
    });

    assert.equal(result.status, ACCOUNT_LOCKED_STATUS);
    assert.equal(result.body.error, ACCOUNT_LOCKED_REAUTH_MESSAGE);
    assert.equal(bcryptCalls, 0);
    assert.equal(passengerLoads, 0);
    assert.equal(audits.length, 0);
    assert.equal("passportNumber" in result.body, false);
  });

  it("wrong password records a failed attempt", async () => {
    let recorded = 0;

    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "wrong-password",
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({ failedLoginAttempts: 2 }),
      verifyPassword: async () => false,
      recordFailedAttempt: async () => {
        recorded += 1;
        return { isNowLocked: false };
      },
      clearFailedAttempts: async () => {
        throw new Error("should not clear");
      },
      loadPassenger: async () => {
        throw new Error("should not load");
      },
      writeAudit: async () => undefined,
    });

    assert.equal(result.status, 401);
    assert.equal(result.body.error, PASSPORT_PASSWORD_FAILED_MESSAGE);
    assert.equal(recorded, 1);
  });

  it("repeated wrong passwords below threshold return password-failed", async () => {
    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "wrong-password",
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({ failedLoginAttempts: 3 }),
      verifyPassword: async () => false,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async () => undefined,
    });

    assert.equal(result.status, 401);
    assert.equal(result.body.error, PASSPORT_PASSWORD_FAILED_MESSAGE);
  });

  it("threshold reached sets lockout response", async () => {
    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: "wrong-password",
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({
          failedLoginAttempts: ACCOUNT_LOCKOUT_THRESHOLD - 1,
        }),
      verifyPassword: async () => false,
      recordFailedAttempt: async () => ({ isNowLocked: true }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async () => undefined,
    });

    assert.equal(result.status, ACCOUNT_LOCKED_STATUS);
    assert.equal(result.body.error, ACCOUNT_LOCKED_REAUTH_MESSAGE);
    assert.equal("passportNumber" in result.body, false);
  });

  it("correct password resets failed attempts and reveals with one audit", async () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret("HT9988776");
    let cleared = false;
    const audits: unknown[] = [];

    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: CORRECT_PASSWORD,
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({ failedLoginAttempts: 3 }),
      verifyPassword: async (password, hash) => {
        assert.equal(password, CORRECT_PASSWORD);
        assert.equal(hash, PASSWORD_HASH);
        return true;
      },
      recordFailedAttempt: async () => {
        throw new Error("should not record failure");
      },
      clearFailedAttempts: async () => {
        cleared = true;
      },
      loadPassenger: async () => ({
        id: 42,
        passportNumberEncrypted: encrypted,
      }),
      writeAudit: async (event) => {
        audits.push(event);
      },
    });

    assert.equal(cleared, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.passportNumber, "HT9988776");
    assert.equal(audits.length, 1);
    assert.deepEqual(audits[0], {
      adminUserId: 17,
      passengerId: 42,
      action: PASSPORT_REVEALED_ACTION,
    });
    assert.equal(JSON.stringify(result.body).includes(CORRECT_PASSWORD), false);
    assert.equal(JSON.stringify(audits[0]).includes(CORRECT_PASSWORD), false);
  });

  it("correct password after expired lockout works normally", async () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret("HT5566778");
    let cleared = false;

    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: CORRECT_PASSWORD,
      passengerIdRaw: "42",
      loadAccountSecurity: async () =>
        unlockedAccount({
          failedLoginAttempts: ACCOUNT_LOCKOUT_THRESHOLD,
          lockedUntil: new Date(Date.now() - 60_000).toISOString(),
        }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => {
        cleared = true;
      },
      loadPassenger: async () => ({
        id: 42,
        passportNumberEncrypted: encrypted,
      }),
      writeAudit: async () => undefined,
    });

    assert.equal(cleared, true);
    assert.equal(result.status, 200);
    assert.equal(result.body.passportNumber, "HT5566778");
  });

  it("missing password -> 400 and no audit", async () => {
    const audits: unknown[] = [];
    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: null,
      passengerIdRaw: "42",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => null,
      writeAudit: async (event) => {
        audits.push(event);
      },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error, PASSPORT_PASSWORD_REQUIRED_MESSAGE);
    assert.equal(audits.length, 0);
  });

  it("decrypt failure after correct password -> no audit", async () => {
    const audits: unknown[] = [];
    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: CORRECT_PASSWORD,
      passengerIdRaw: "42",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => ({
        id: 42,
        passportNumberEncrypted: null,
      }),
      writeAudit: async (event) => {
        audits.push(event);
      },
    });
    assert.equal(result.status, 404);
    assert.equal(result.body.error, PASSPORT_UNAVAILABLE_MESSAGE);
    assert.equal(audits.length, 0);
  });

  it("audit write failure -> no passport returned", async () => {
    withKey(SYNTHETIC_KEY);
    const encrypted = encryptTravelerSecret("HT1122334");

    const result = await handlePassportRevealRequest({
      user: GRANTED_ADMIN,
      password: CORRECT_PASSWORD,
      passengerIdRaw: "42",
      loadAccountSecurity: async () => unlockedAccount(),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadPassenger: async () => ({
        id: 42,
        passportNumberEncrypted: encrypted,
      }),
      writeAudit: async () => {
        throw new Error("audit store unavailable");
      },
    });

    assert.equal(result.status, 500);
    assert.equal(result.body.error, PASSPORT_REVEAL_AUDIT_FAILURE_MESSAGE);
    assert.equal("passportNumber" in result.body, false);
  });
});
