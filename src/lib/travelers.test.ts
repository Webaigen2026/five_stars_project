import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  maskPassportNumber,
  parseTravelerInput,
  travelerDisplayName,
  TravelerError,
} from "./traveler-shared";

describe("traveler helpers", () => {
  it("masks passport numbers on list displays", () => {
    assert.equal(maskPassportNumber("AB1234567"), "•••• 4567");
    assert.equal(maskPassportNumber("1234"), "••••");
  });

  it("parses a valid traveler payload and ignores client userId", () => {
    const input = parseTravelerInput({
      userId: 999,
      label: " Myself ",
      firstName: " Ada ",
      lastName: " Lovelace ",
      dateOfBirth: "1990-01-15",
      gender: "female",
      nationality: "Haitian",
      passportNumber: "ht123456",
      passportCountry: "Haiti",
      passportExpiry: "2030-12-31",
      isPrimary: true,
    });

    assert.equal(input.firstName, "Ada");
    assert.equal(input.lastName, "Lovelace");
    assert.equal(input.label, "Myself");
    assert.equal(input.gender, "FEMALE");
    assert.equal(input.passportNumber, "HT123456");
    assert.equal(input.isPrimary, true);
    assert.equal("userId" in input, false);
  });

  it("rejects missing required fields", () => {
    assert.throws(
      () => parseTravelerInput({ firstName: "Ada" }),
      (error: unknown) => error instanceof TravelerError && error.status === 400
    );
  });

  it("builds a display name from label and legal name", () => {
    assert.equal(
      travelerDisplayName({
        label: "Spouse",
        firstName: "John",
        lastName: "Doe",
      }),
      "Spouse — John Doe"
    );
  });
});
