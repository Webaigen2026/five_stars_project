/**
 * Phase 8.1 — passenger edit must not ship plaintext/ciphertext passports.
 * Fixtures only — never real passport numbers.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  parsePassengerUpdateInput,
  passengerEditViewLeaksSecrets,
  resolvePassportReplacement,
  toPassengerEditView,
  toSafePassenger,
} from "./admin-passengers";
import { canViewSensitiveTravelerData } from "./authorization";
import {
  encryptTravelerSecret,
  passportWriteFields,
  resetTravelerEncryptionKeyCache,
} from "./traveler-encryption";

const SYNTHETIC_KEY = Buffer.from("d9-synthetic-test-key-32-bytes!!").toString(
  "base64"
);

const FIXTURE_PASSPORT = "TEST-EDIT-0001";
const FIXTURE_REPLACEMENT = "TEST-EDIT-9999";

function withKey(value: string | undefined) {
  if (value == null) {
    delete process.env.TRAVELER_DATA_ENCRYPTION_KEY;
  } else {
    process.env.TRAVELER_DATA_ENCRYPTION_KEY = value;
  }
  resetTravelerEncryptionKeyCache();
}

function basePassenger(overrides: Record<string, unknown> = {}) {
  withKey(SYNTHETIC_KEY);
  return {
    id: 42,
    bookingId: 7,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-15",
    gender: "FEMALE",
    nationality: "HT",
    passengerType: "ADULT",
    passportNumberEncrypted: encryptTravelerSecret(FIXTURE_PASSPORT),
    passportCountry: "HT",
    passportExpiry: "2030-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  withKey(SYNTHETIC_KEY);
});

describe("passenger edit DTO — no disclosure", () => {
  it("edit view contains masked passport only — no plaintext or ciphertext", () => {
    const view = toPassengerEditView(basePassenger(), {
      canReplacePassport: true,
    });

    assert.equal(view.maskedPassport.startsWith("••••"), true);
    assert.equal(view.maskedPassport.includes(FIXTURE_PASSPORT), false);
    assert.equal("passportNumber" in view, false);
    assert.equal("passportNumberEncrypted" in view, false);
    assert.equal(passengerEditViewLeaksSecrets(view as never), false);

    const serialized = JSON.stringify(view);
    assert.equal(serialized.includes(FIXTURE_PASSPORT), false);
    assert.equal(serialized.includes("v1:"), false);
  });

  it("toSafePassenger no longer returns plaintext passport", () => {
    const safe = toSafePassenger(basePassenger());
    assert.equal(safe.passportNumber.includes(FIXTURE_PASSPORT), false);
    assert.equal(safe.passportNumber.startsWith("••••"), true);
  });

  it("unauthorized edit view disables replacement flag from server user only", () => {
    const view = toPassengerEditView(basePassenger(), {
      canReplacePassport: canViewSensitiveTravelerData({
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      }),
    });
    assert.equal(view.canReplacePassport, false);
  });
});

describe("passport replacement authorization", () => {
  it("ADMIN permission false cannot replace passport", () => {
    const decision = resolvePassportReplacement({
      passportNumberReplacement: FIXTURE_REPLACEMENT,
      user: {
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      },
    });
    assert.equal(decision.action, "reject");
    if (decision.action === "reject") {
      assert.equal(decision.status, 403);
    }
  });

  it("STAFF cannot replace passport", () => {
    const decision = resolvePassportReplacement({
      passportNumberReplacement: FIXTURE_REPLACEMENT,
      user: {
        role: "STAFF",
        canViewSensitiveTravelerData: true,
      },
    });
    assert.equal(decision.action, "reject");
  });

  it("CUSTOMER cannot replace passport", () => {
    const decision = resolvePassportReplacement({
      passportNumberReplacement: FIXTURE_REPLACEMENT,
      user: {
        role: "CUSTOMER",
        canViewSensitiveTravelerData: false,
      },
    });
    assert.equal(decision.action, "reject");
  });

  it("authorized ADMIN blank replacement preserves ciphertext", () => {
    const decision = resolvePassportReplacement({
      passportNumberReplacement: null,
      user: {
        role: "ADMIN",
        canViewSensitiveTravelerData: true,
      },
    });
    assert.deepEqual(decision, { action: "preserve" });
  });

  it("authorized ADMIN replacement uses passportWriteFields shape", () => {
    withKey(SYNTHETIC_KEY);
    const decision = resolvePassportReplacement({
      passportNumberReplacement: FIXTURE_REPLACEMENT,
      user: {
        role: "ADMIN",
        canViewSensitiveTravelerData: true,
      },
    });
    assert.equal(decision.action, "replace");
    if (decision.action === "replace") {
      const fields = passportWriteFields(decision.passportNumber);
      assert.equal("passportNumberEncrypted" in fields, true);
      assert.equal(fields.passportNumberEncrypted.startsWith("v1:"), true);
      assert.equal(fields.passportNumberEncrypted.includes(FIXTURE_REPLACEMENT), false);
      assert.equal("passportNumber" in fields, false);
    }
  });

  it("forged client permission flags are ignored", () => {
    const parsed = parsePassengerUpdateInput({
      firstName: "Ada",
      lastName: "Lovelace",
      dateOfBirth: "1990-01-15",
      gender: "FEMALE",
      nationality: "HT",
      passportCountry: "HT",
      passportExpiry: "2030-01-01",
      passportNumber: FIXTURE_REPLACEMENT,
      role: "ADMIN",
      canViewSensitiveTravelerData: true,
      userId: 999,
    });

    assert.equal(parsed.passportNumberReplacement, FIXTURE_REPLACEMENT);
    // Authorization still uses the real session user:
    const decision = resolvePassportReplacement({
      passportNumberReplacement: parsed.passportNumberReplacement,
      user: {
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      },
    });
    assert.equal(decision.action, "reject");
  });
});

describe("parsePassengerUpdateInput semantics", () => {
  const identity = {
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-15",
    gender: "FEMALE",
    nationality: "HT",
    passportCountry: "HT",
    passportExpiry: "2030-01-01",
  };

  it("omitted or blank passportNumber means preserve", () => {
    assert.equal(
      parsePassengerUpdateInput(identity).passportNumberReplacement,
      null
    );
    assert.equal(
      parsePassengerUpdateInput({ ...identity, passportNumber: "" })
        .passportNumberReplacement,
      null
    );
    assert.equal(
      parsePassengerUpdateInput({ ...identity, passportNumber: "   " })
        .passportNumberReplacement,
      null
    );
  });

  it("non-empty passportNumber is a replacement candidate", () => {
    assert.equal(
      parsePassengerUpdateInput({
        ...identity,
        passportNumber: FIXTURE_REPLACEMENT,
      }).passportNumberReplacement,
      FIXTURE_REPLACEMENT
    );
  });

  it("non-string passportNumber is rejected", () => {
    assert.throws(
      () =>
        parsePassengerUpdateInput({
          ...identity,
          passportNumber: 12345,
        }),
      /passportNumber must be a string/
    );
  });

  it("unrelated identity edits do not require decrypting existing passport", () => {
    // Preservation is decided without reading ciphertext at all.
    const decision = resolvePassportReplacement({
      passportNumberReplacement: null,
      user: {
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      },
    });
    assert.equal(decision.action, "preserve");
  });
});

describe("edit form source — no plaintext defaultValue", () => {
  it("EditPassengerForm never defaultValues an existing passport", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../components/admin/passengers/EditPassengerForm.tsx"
      ),
      "utf8"
    );

    assert.equal(source.includes("defaultValue={passenger.passportNumber}"), false);
    assert.equal(source.includes("maskedPassport"), true);
    assert.equal(source.includes("Leave blank to keep the existing passport number."), true);
    assert.equal(source.includes("canReplacePassport"), true);
    assert.equal(source.includes("PassportRevealControl"), false);
  });
});
