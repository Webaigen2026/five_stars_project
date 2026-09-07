import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AdminFlightRequestError,
  parseFlightWriteInput,
  resolveAircraftForAdminWrite,
} from "./admin-flights";
import {
  ADMIN_AIRCRAFT_OPTIONS,
  CANONICAL_AIRBUS_A320,
  describeFlightAircraft,
  getSeatMapSupportLabel,
  isCanonicalAdminAircraft,
} from "./aircraft-config";
import { isSeatSelectionAvailable } from "./seat-layouts";

const basePayload = {
  code: "SJ900",
  airline: "Five Stars",
  origin: "Boston",
  originCode: "BOS",
  destination: "Port-au-Prince",
  destinationCode: "PAP",
  departureTime: "2026-09-10T14:00:00.000Z",
  arrivalTime: "2026-09-10T18:00:00.000Z",
  durationMinutes: 240,
  price: 34900,
  totalSeats: 180,
  availableSeats: 12,
  status: "SCHEDULED",
};

describe("aircraft-config (D12.5.1)", () => {
  it("exposes only canonical Airbus A320 as an Admin option", () => {
    assert.deepEqual(
      ADMIN_AIRCRAFT_OPTIONS.map((row) => row.value),
      [CANONICAL_AIRBUS_A320]
    );
    assert.equal(isCanonicalAdminAircraft("Airbus A320"), true);
    assert.equal(isCanonicalAdminAircraft("A320"), false);
    assert.equal(isCanonicalAdminAircraft("StarJet"), false);
  });

  it("F. seat map support uses existing resolver", () => {
    assert.equal(isSeatSelectionAvailable("Airbus A320"), true);
    assert.equal(isSeatSelectionAvailable("StarJet"), false);
    assert.equal(getSeatMapSupportLabel("Airbus A320").supported, true);
    assert.equal(getSeatMapSupportLabel("StarJet").supported, false);
    assert.equal(
      describeFlightAircraft("StarJet").supportLabel,
      "Seat map unavailable"
    );
    assert.equal(
      describeFlightAircraft("Airbus A320").supportLabel,
      "Seat map supported"
    );
  });
});

describe("Admin aircraft write validation (D12.5.1)", () => {
  it("A. create accepts canonical Airbus A320", () => {
    const parsed = parseFlightWriteInput(
      { ...basePayload, aircraft: "Airbus A320" },
      { mode: "create" }
    );
    assert.equal(parsed.aircraft, "Airbus A320");
  });

  it("B. create rejects arbitrary aircraft text and aliases", () => {
    assert.throws(
      () =>
        parseFlightWriteInput(
          { ...basePayload, aircraft: "StarJet" },
          { mode: "create" }
        ),
      (error: unknown) =>
        error instanceof AdminFlightRequestError &&
        /supported aircraft/i.test(error.message)
    );
    assert.throws(
      () =>
        parseFlightWriteInput(
          { ...basePayload, aircraft: "A320" },
          { mode: "create" }
        ),
      AdminFlightRequestError
    );
    assert.throws(
      () =>
        parseFlightWriteInput(
          { ...basePayload, aircraft: "" },
          { mode: "create" }
        ),
      /Aircraft is required/
    );
  });

  it("C. edit keeps canonical Airbus A320", () => {
    const parsed = parseFlightWriteInput(
      { ...basePayload, aircraft: "Airbus A320" },
      { mode: "edit", existingAircraft: "Airbus A320" }
    );
    assert.equal(parsed.aircraft, "Airbus A320");
  });

  it("D. edit preserves unsupported StarJet when unchanged", () => {
    const aircraft = resolveAircraftForAdminWrite({
      mode: "edit",
      submittedAircraft: "StarJet",
      existingAircraft: "StarJet",
    });
    assert.equal(aircraft, "StarJet");

    const parsed = parseFlightWriteInput(
      {
        ...basePayload,
        aircraft: "StarJet",
        departureTime: "2026-09-11T14:00:00.000Z",
        arrivalTime: "2026-09-11T18:00:00.000Z",
      },
      { mode: "edit", existingAircraft: "StarJet" }
    );
    assert.equal(parsed.aircraft, "StarJet");
  });

  it("E. edit upgrades StarJet to Airbus A320 when explicitly chosen", () => {
    const parsed = parseFlightWriteInput(
      { ...basePayload, aircraft: "Airbus A320" },
      { mode: "edit", existingAircraft: "StarJet" }
    );
    assert.equal(parsed.aircraft, "Airbus A320");
  });

  it("edit rejects inventing a new unsupported aircraft string", () => {
    assert.throws(
      () =>
        resolveAircraftForAdminWrite({
          mode: "edit",
          submittedAircraft: "MadeUpJet",
          existingAircraft: "StarJet",
        }),
      AdminFlightRequestError
    );
  });
});
