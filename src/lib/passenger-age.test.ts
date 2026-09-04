import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateAgeOnDate,
  expectedPassengerTypeForAge,
  isAgeValidForPassengerType,
  parseCalendarDateOnly,
  validatePassengerAgeForType,
} from "./passenger-age";

describe("passenger age validation", () => {
  it("parses calendar dates without timezone shifting", () => {
    assert.deepEqual(parseCalendarDateOnly("2026-09-06"), {
      year: 2026,
      month: 9,
      day: 6,
    });
    assert.equal(parseCalendarDateOnly("2026-02-30"), null);
    assert.equal(parseCalendarDateOnly("not-a-date"), null);
  });

  it("calculates age with birthday-on-departure and day-before boundaries", () => {
    assert.equal(calculateAgeOnDate("2010-09-06", "2026-09-06"), 16);
    assert.equal(calculateAgeOnDate("2010-09-07", "2026-09-06"), 15);
  });

  it("handles Feb 29 leap-year DOB on non-leap reference years", () => {
    // Born 29 Feb 2016; on 28 Feb 2025 birthday not yet reached → 8
    assert.equal(calculateAgeOnDate("2016-02-29", "2025-02-28"), 8);
    // On 1 Mar 2025 birthday reached → 9
    assert.equal(calculateAgeOnDate("2016-02-29", "2025-03-01"), 9);
  });

  it("validates INFANT_IN_SEAT ages 0–1", () => {
    assert.equal(isAgeValidForPassengerType(0, "INFANT_IN_SEAT"), true);
    assert.equal(isAgeValidForPassengerType(1, "INFANT_IN_SEAT"), true);
    assert.equal(isAgeValidForPassengerType(2, "INFANT_IN_SEAT"), false);

    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "2026-01-01",
        departureDate: "2026-09-06",
        passengerType: "INFANT_IN_SEAT",
      }).valid,
      true
    );
    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "2024-09-06",
        departureDate: "2026-09-06",
        passengerType: "INFANT_IN_SEAT",
      }).valid,
      false
    );
  });

  it("validates CHILD ages 2–15", () => {
    assert.equal(isAgeValidForPassengerType(2, "CHILD"), true);
    assert.equal(isAgeValidForPassengerType(15, "CHILD"), true);
    assert.equal(isAgeValidForPassengerType(16, "CHILD"), false);

    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "2011-09-06",
        departureDate: "2026-09-06",
        passengerType: "CHILD",
      }).age,
      15
    );
    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "2010-09-06",
        departureDate: "2026-09-06",
        passengerType: "CHILD",
      }).valid,
      false
    );
  });

  it("validates ADULT ages 16–64", () => {
    assert.equal(isAgeValidForPassengerType(16, "ADULT"), true);
    assert.equal(isAgeValidForPassengerType(64, "ADULT"), true);
    assert.equal(isAgeValidForPassengerType(65, "ADULT"), false);

    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "2010-09-06",
        departureDate: "2026-09-06",
        passengerType: "ADULT",
      }).valid,
      true
    );
    assert.equal(
      validatePassengerAgeForType({
        dateOfBirth: "1961-09-06",
        departureDate: "2026-09-06",
        passengerType: "ADULT",
      }).valid,
      false
    );
  });

  it("validates SENIOR ages 65+", () => {
    assert.equal(isAgeValidForPassengerType(65, "SENIOR"), true);
    assert.equal(isAgeValidForPassengerType(80, "SENIOR"), true);
    assert.equal(isAgeValidForPassengerType(64, "SENIOR"), false);
  });

  it("maps ages to mutually exclusive expected types", () => {
    assert.equal(expectedPassengerTypeForAge(0), "INFANT_IN_SEAT");
    assert.equal(expectedPassengerTypeForAge(1), "INFANT_IN_SEAT");
    assert.equal(expectedPassengerTypeForAge(2), "CHILD");
    assert.equal(expectedPassengerTypeForAge(15), "CHILD");
    assert.equal(expectedPassengerTypeForAge(16), "ADULT");
    assert.equal(expectedPassengerTypeForAge(64), "ADULT");
    assert.equal(expectedPassengerTypeForAge(65), "SENIOR");
  });

  it("rejects client category that does not match DOB", () => {
    const result = validatePassengerAgeForType({
      dateOfBirth: "1995-01-15",
      departureDate: "2026-09-06",
      passengerType: "CHILD",
    });

    assert.equal(result.valid, false);
    assert.equal(result.age, 31);
    assert.equal(result.expectedType, "ADULT");
    assert.match(String(result.message), /age is 31/i);
    assert.match(String(result.message), /Select Adult/i);
  });

  it("uses the provided outbound departure date only (round-trip)", () => {
    // Age 15 on outbound Sep 6; turns 16 on Sep 7 before a later return.
    const outbound = validatePassengerAgeForType({
      dateOfBirth: "2010-09-07",
      departureDate: "2026-09-06",
      passengerType: "CHILD",
    });
    assert.equal(outbound.valid, true);
    assert.equal(outbound.age, 15);

    const ifReturnWereUsed = validatePassengerAgeForType({
      dateOfBirth: "2010-09-07",
      departureDate: "2026-09-13",
      passengerType: "CHILD",
    });
    assert.equal(ifReturnWereUsed.valid, false);
    assert.equal(ifReturnWereUsed.age, 16);
  });
});
