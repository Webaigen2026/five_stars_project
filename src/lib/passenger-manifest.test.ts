/**
 * Passenger manifest export security + behavior tests.
 * Fixtures only — never real passport numbers.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  ACCOUNT_LOCKED_STATUS,
  ACCOUNT_LOCKOUT_THRESHOLD,
} from "./account-lockout";
import {
  PASSENGER_MANIFEST_DOCUMENT_UNAVAILABLE_MESSAGE,
  PASSENGER_MANIFEST_FULL_ACTION,
  PASSENGER_MANIFEST_MASKED_ACTION,
  PASSENGER_MANIFEST_PASSWORD_FAILED_MESSAGE,
  PASSENGER_MANIFEST_PASSWORD_REQUIRED_MESSAGE,
  authorizePassengerManifestExport,
  buildManifestAuditEvent,
  buildManifestExportRows,
  buildManifestFilename,
  formatManifestDate,
  handlePassengerManifestRequest,
  parseManifestExportBody,
  uniqueBookingIds,
  type ManifestPassengerRow,
} from "./passenger-manifest";
import {
  buildPassengerManifestWorkbook,
  readManifestPassportColumn,
} from "./passenger-manifest-xlsx";
import { parsePassengerManifestResponse } from "./passenger-manifest-ui";
import { maskPassportNumber } from "./sensitive-data";
import {
  encryptTravelerSecret,
  resetTravelerEncryptionKeyCache,
} from "./traveler-encryption";

const SYNTHETIC_KEY = Buffer.from("d9-synthetic-test-key-32-bytes!!").toString(
  "base64"
);

const FIXTURE_PASSPORT = "TEST-MANIFEST-0001";
const OTHER_PASSPORT = "TEST-OTHER-9999";

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

function passengerRow(
  overrides: Partial<ManifestPassengerRow> = {}
): ManifestPassengerRow {
  withKey(SYNTHETIC_KEY);
  return {
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1990-01-15",
    gender: "FEMALE",
    nationality: "HT",
    passportCountry: "HT",
    passportNumberEncrypted: encryptTravelerSecret(FIXTURE_PASSPORT),
    passportExpiry: "2030-06-01",
    ...overrides,
  };
}

afterEach(() => {
  withKey(SYNTHETIC_KEY);
});

describe("authorization", () => {
  it("unauthenticated -> denied", () => {
    assert.equal(authorizePassengerManifestExport(null).ok, false);
  });

  it("STAFF -> denied", () => {
    assert.equal(
      authorizePassengerManifestExport({
        role: "STAFF",
        canViewSensitiveTravelerData: false,
      }).ok,
      false
    );
  });

  it("STAFF + unexpected permission true -> denied", () => {
    assert.equal(
      authorizePassengerManifestExport({
        role: "STAFF",
        canViewSensitiveTravelerData: true,
      }).ok,
      false
    );
  });

  it("ADMIN permission false -> denied", () => {
    assert.equal(
      authorizePassengerManifestExport({
        role: "ADMIN",
        canViewSensitiveTravelerData: false,
      }).ok,
      false
    );
  });

  it("ADMIN permission true -> proceeds", () => {
    assert.equal(authorizePassengerManifestExport(GRANTED_ADMIN).ok, true);
  });
});

describe("password / lockout", () => {
  it("missing password -> 400", async () => {
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: null,
      passportMode: "masked",
      flightIdRaw: "10",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: 0,
        lockedUntil: null,
      }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadFlight: async () => null,
      loadPassengersForFlight: async () => [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.error, PASSENGER_MANIFEST_PASSWORD_REQUIRED_MESSAGE);
    }
  });

  it("wrong password -> no export and records attempt", async () => {
    let recorded = 0;
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: "wrong",
      passportMode: "masked",
      flightIdRaw: "10",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: 1,
        lockedUntil: null,
      }),
      verifyPassword: async () => false,
      recordFailedAttempt: async () => {
        recorded += 1;
        return { isNowLocked: false };
      },
      clearFailedAttempts: async () => {
        throw new Error("should not clear");
      },
      loadFlight: async () => {
        throw new Error("should not load flight");
      },
      loadPassengersForFlight: async () => [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 401);
      assert.equal(result.error, PASSENGER_MANIFEST_PASSWORD_FAILED_MESSAGE);
    }
    assert.equal(recorded, 1);
  });

  it("locked account -> no export", async () => {
    let bcryptCalls = 0;
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: "anything",
      passportMode: "full",
      flightIdRaw: "10",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: ACCOUNT_LOCKOUT_THRESHOLD,
        lockedUntil: new Date(Date.now() + 60_000).toISOString(),
      }),
      verifyPassword: async () => {
        bcryptCalls += 1;
        return true;
      },
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadFlight: async () => null,
      loadPassengersForFlight: async () => [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, ACCOUNT_LOCKED_STATUS);
    }
    assert.equal(bcryptCalls, 0);
  });

  it("correct password clears lockout state path", async () => {
    let cleared = false;
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: "correct",
      passportMode: "masked",
      flightIdRaw: "10",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: 2,
        lockedUntil: null,
      }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => {
        throw new Error("should not record");
      },
      clearFailedAttempts: async () => {
        cleared = true;
      },
      loadFlight: async () => ({
        id: 10,
        code: "5S102",
        departureTime: "2026-09-07T12:00:00.000Z",
      }),
      loadPassengersForFlight: async () => [passengerRow()],
    });
    assert.equal(result.ok, true);
    assert.equal(cleared, true);
  });
});

describe("masked / full export rows", () => {
  it("masked export uses mask and excludes plaintext", () => {
    withKey(SYNTHETIC_KEY);
    const rows = buildManifestExportRows([passengerRow()], "masked");
    assert.equal(rows[0]?.passportNumber, maskPassportNumber(FIXTURE_PASSPORT));
    assert.equal(rows[0]?.passportNumber.includes(FIXTURE_PASSPORT), false);
    assert.equal(rows[0]?.dateOfBirth, "01/15/1990");
    assert.equal(rows[0]?.passportExpiration, "06/01/2030");
  });

  it("full export contains decrypted passport", () => {
    withKey(SYNTHETIC_KEY);
    const rows = buildManifestExportRows([passengerRow()], "full");
    assert.equal(rows[0]?.passportNumber, FIXTURE_PASSPORT);
  });

  it("decrypt failure fails closed", () => {
    assert.throws(() =>
      buildManifestExportRows(
        [
          passengerRow({
            passportNumberEncrypted: null as unknown as string,
          }),
        ],
        "full"
      )
    );
  });
});

describe("workbook generation", () => {
  it("masked workbook is xlsx without plaintext passports", async () => {
    withKey(SYNTHETIC_KEY);
    const rows = buildManifestExportRows([passengerRow()], "masked");
    const buffer = await buildPassengerManifestWorkbook(rows);
    assert.ok(buffer.byteLength > 100);
    // ZIP/XLSX signature
    assert.equal(buffer[0], 0x50);
    assert.equal(buffer[1], 0x4b);

    const passports = await readManifestPassportColumn(buffer);
    assert.equal(passports.length, 1);
    assert.equal(passports[0], maskPassportNumber(FIXTURE_PASSPORT));
    assert.equal(buffer.toString("utf8").includes(FIXTURE_PASSPORT), false);
  });

  it("full workbook contains decrypted passport values", async () => {
    withKey(SYNTHETIC_KEY);
    const rows = buildManifestExportRows([passengerRow()], "full");
    const buffer = await buildPassengerManifestWorkbook(rows);
    const passports = await readManifestPassportColumn(buffer);
    assert.deepEqual(passports, [FIXTURE_PASSPORT]);
  });
});

describe("audit metadata", () => {
  it("masked and full actions are distinct and metadata-only", () => {
    const masked = buildManifestAuditEvent({
      adminUserId: 17,
      flightId: 10,
      passportMode: "masked",
    });
    const full = buildManifestAuditEvent({
      adminUserId: 17,
      flightId: 10,
      passportMode: "full",
    });
    assert.equal(masked.action, PASSENGER_MANIFEST_MASKED_ACTION);
    assert.equal(full.action, PASSENGER_MANIFEST_FULL_ACTION);
    assert.equal("passportNumber" in masked, false);
    assert.equal("password" in full, false);
  });
});

describe("scope helpers", () => {
  it("unique booking ids dedupe flight associations", () => {
    assert.deepEqual(uniqueBookingIds([1, 1, 2, 0, -3, 2]), [1, 2]);
  });

  it("filename is sanitized and excludes passenger data", () => {
    const name = buildManifestFilename({
      flightCode: "5S/102*",
      departureDate: "2026-09-07T15:00:00.000Z",
    });
    assert.equal(name, "FiveStars_Passenger_Manifest_5S_102_2026-09-07.xlsx");
    assert.equal(name.includes(FIXTURE_PASSPORT), false);
  });

  it("formatManifestDate is MM/DD/YYYY", () => {
    assert.equal(formatManifestDate("2026-09-07"), "09/07/2026");
  });
});

describe("body parsing ignores client identity", () => {
  it("parses mode/password and ignores forged role flags", () => {
    const parsed = parseManifestExportBody({
      passportMode: "full",
      password: "secret",
      role: "ADMIN",
      canViewSensitiveTravelerData: true,
      userId: 999,
    });
    assert.equal(parsed.passportMode, "full");
    assert.equal(parsed.password, "secret");
  });
});

describe("handler scoping", () => {
  it("only loads passengers for the selected flight callback", async () => {
    let loadedFlightId: number | null = null;
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: "correct",
      passportMode: "masked",
      flightIdRaw: "42",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: 0,
        lockedUntil: null,
      }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadFlight: async (id) => ({
        id,
        code: "5S200",
        departureTime: "2026-09-07T10:00:00.000Z",
      }),
      loadPassengersForFlight: async (flightId) => {
        loadedFlightId = flightId;
        return [
          passengerRow({ id: 1 }),
          passengerRow({
            id: 2,
            firstName: "Other",
            lastName: "Flight",
            passportNumberEncrypted: encryptTravelerSecret(OTHER_PASSPORT),
          }),
        ];
      },
    });
    assert.equal(result.ok, true);
    assert.equal(loadedFlightId, 42);
  });

  it("document decrypt failure returns safe message", async () => {
    const result = await handlePassengerManifestRequest({
      user: GRANTED_ADMIN,
      password: "correct",
      passportMode: "full",
      flightIdRaw: "42",
      loadAccountSecurity: async () => ({
        passwordHash: "hash",
        failedLoginAttempts: 0,
        lockedUntil: null,
      }),
      verifyPassword: async () => true,
      recordFailedAttempt: async () => ({ isNowLocked: false }),
      clearFailedAttempts: async () => undefined,
      loadFlight: async () => ({
        id: 42,
        code: "5S200",
        departureTime: "2026-09-07T10:00:00.000Z",
      }),
      loadPassengersForFlight: async () => [
        passengerRow({
          passportNumberEncrypted: "v1:bad:data:here",
        }),
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 404);
      assert.equal(result.error, PASSENGER_MANIFEST_DOCUMENT_UNAVAILABLE_MESSAGE);
    }
  });
});

describe("UI helpers + source guarantees", () => {
  it("maps errors safely", () => {
    assert.equal(
      parsePassengerManifestResponse(403, { error: "Forbidden." }).error,
      "You are not authorized to export this passenger manifest."
    );
    assert.equal(
      parsePassengerManifestResponse(401, {
        error: "Password confirmation failed.",
      }).keepConfirmOpen,
      true
    );
  });

  it("control defaults to masked and clears password paths", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../components/admin/PassengerManifestExportControl.tsx"
      ),
      "utf8"
    );
    assert.equal(source.includes('useState<PassengerManifestPassportMode>("masked")'), true);
    assert.equal(source.includes("localStorage"), false);
    assert.equal(source.includes("sessionStorage"), false);
    assert.equal(source.includes("URL.revokeObjectURL"), true);
    assert.equal(source.includes('autoComplete="current-password"'), true);
    assert.equal(source.includes('type="password"'), true);
  });

  it("route disables GET and sets no-store", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../app/api/admin/flights/[id]/passenger-manifest/route.ts"
      ),
      "utf8"
    );
    assert.equal(source.includes("export async function GET"), true);
    assert.equal(source.includes("405"), true);
    assert.equal(source.includes("PASSENGER_MANIFEST_CACHE_HEADERS"), true);
    assert.equal(source.includes("recordFailedLoginAttempt"), true);
    assert.equal(source.includes("AdminAuditLog.create"), true);
  });
});
