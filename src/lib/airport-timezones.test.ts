import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  elapsedDurationMinutes,
  formatInstantAsDatetimeLocal,
  getAirportTimeZone,
  wallClockInTimeZoneToUtcIso,
} from "./airport-timezones";
import { parseFlightWriteInput } from "./admin-flights";

describe("airport wall-clock conversion", () => {
  it("converts PAP 10:00 AM and BOS 2:00 PM correctly", () => {
    const dep = wallClockInTimeZoneToUtcIso(
      "2026-09-06T10:00",
      "America/Port-au-Prince"
    );
    const arr = wallClockInTimeZoneToUtcIso(
      "2026-09-06T14:00",
      "America/New_York"
    );

    assert.equal(dep, "2026-09-06T14:00:00.000Z");
    assert.equal(arr, "2026-09-06T18:00:00.000Z");
    assert.equal(elapsedDurationMinutes(dep, arr), 240);
  });

  it("distinguishes 02:00 AM from 14:00 PM", () => {
    assert.equal(
      wallClockInTimeZoneToUtcIso("2026-09-06T02:00", "America/New_York"),
      "2026-09-06T06:00:00.000Z"
    );
    assert.equal(
      wallClockInTimeZoneToUtcIso("2026-09-06T14:00", "America/New_York"),
      "2026-09-06T18:00:00.000Z"
    );
  });

  it("handles noon and midnight", () => {
    assert.equal(
      wallClockInTimeZoneToUtcIso("2026-09-06T12:00", "America/New_York"),
      "2026-09-06T16:00:00.000Z"
    );
    assert.equal(
      wallClockInTimeZoneToUtcIso("2026-09-06T00:00", "America/New_York"),
      "2026-09-06T04:00:00.000Z"
    );
  });

  it("handles DST (EST in January)", () => {
    assert.equal(
      wallClockInTimeZoneToUtcIso("2026-01-15T14:00", "America/New_York"),
      "2026-01-15T19:00:00.000Z"
    );
  });

  it("handles overnight flights", () => {
    const dep = wallClockInTimeZoneToUtcIso(
      "2026-09-06T23:30",
      "America/New_York"
    );
    const arr = wallClockInTimeZoneToUtcIso(
      "2026-09-07T01:15",
      "America/Port-au-Prince"
    );
    assert.equal(dep, "2026-09-07T03:30:00.000Z");
    assert.equal(arr, "2026-09-07T05:15:00.000Z");
    assert.equal(elapsedDurationMinutes(dep, arr), 105);
  });

  it("round-trips datetime-local values", () => {
    const utc = wallClockInTimeZoneToUtcIso(
      "2026-09-06T14:00",
      "America/New_York"
    );
    assert.equal(
      formatInstantAsDatetimeLocal(utc, "America/New_York"),
      "2026-09-06T14:00"
    );
  });

  it("rejects invalid chronology in admin parse", () => {
    assert.throws(
      () =>
        parseFlightWriteInput({
          code: "SJ999",
          airline: "StarJet",
          aircraft: "A320",
          origin: "Port-au-Prince",
          originCode: "PAP",
          destination: "Boston",
          destinationCode: "BOS",
          departureTime: "2026-09-06T14:00:00.000Z",
          arrivalTime: "2026-09-06T06:00:00.000Z",
          durationMinutes: 240,
          price: 30000,
          totalSeats: 180,
          availableSeats: 10,
          status: "SCHEDULED",
        }),
      /Arrival must be after departure/
    );
  });

  it("overwrites conflicting duration from timestamps", () => {
    const parsed = parseFlightWriteInput({
      code: "SJ999",
      airline: "StarJet",
      aircraft: "A320",
      origin: "Port-au-Prince",
      originCode: "PAP",
      destination: "Boston",
      destinationCode: "BOS",
      departureTime: "2026-09-06T14:00:00.000Z",
      arrivalTime: "2026-09-06T18:00:00.000Z",
      durationMinutes: 999,
      price: 30000,
      totalSeats: 180,
      availableSeats: 10,
      status: "SCHEDULED",
    });

    assert.equal(parsed.durationMinutes, 240);
    assert.equal(getAirportTimeZone("PAP"), "America/Port-au-Prince");
  });
});
