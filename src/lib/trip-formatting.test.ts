import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calendarDateInTimeZone,
  FALLBACK_AIRPORT_TIME_ZONE,
  formatInstantAsDatetimeLocal,
  getAirportTimeZone,
  wallClockInTimeZoneToUtcIso,
} from "./airport-timezones";
import { getBookingProgressPresentation } from "./booking-status";
import {
  formatArrivalTime,
  formatDepartureTime,
  formatDuration,
  formatMoney,
  formatRoute,
  formatTripTime,
  isOvernightFlight,
  isUpcomingTrip,
} from "./trip-formatting";

describe("trip formatting", () => {
  it("formats money, duration, and route consistently", () => {
    assert.equal(formatMoney(42100), "$421.00");
    assert.equal(formatDuration(225), "3h 45m");
    assert.equal(formatRoute("BOS", "PAP"), "BOS → PAP");
  });

  it("groups upcoming and past trips without mutating status", () => {
    assert.equal(
      isUpcomingTrip({
        status: "CONFIRMED",
        departureTime: "2099-01-01T12:00:00.000Z",
      }),
      true
    );
    assert.equal(
      isUpcomingTrip({
        status: "COMPLETED",
        departureTime: "2099-01-01T12:00:00.000Z",
      }),
      false
    );
    assert.equal(
      isUpcomingTrip({
        status: "DRAFT",
        departureTime: "2000-01-01T12:00:00.000Z",
      }),
      false
    );
  });
});

describe("booking progress", () => {
  it("maps lifecycle statuses to progress stages", () => {
    assert.deepEqual(
      getBookingProgressPresentation("DRAFT").steps.map((step) => step.state),
      ["current", "upcoming", "upcoming", "upcoming", "upcoming"]
    );
    assert.deepEqual(
      getBookingProgressPresentation("PENDING_PAYMENT").steps.map(
        (step) => step.state
      ),
      ["complete", "current", "upcoming", "upcoming", "upcoming"]
    );
    assert.deepEqual(
      getBookingProgressPresentation("PAID").steps.map((step) => step.state),
      ["complete", "complete", "upcoming", "upcoming", "upcoming"]
    );
    assert.equal(getBookingProgressPresentation("CANCELLED").mode, "cancelled");
    assert.equal(getBookingProgressPresentation("REFUNDED").mode, "refunded");
    assert.equal(getBookingProgressPresentation("FAILED").mode, "failed");
  });
});

describe("airport timezone formatting", () => {
  // SJ602 stored instant: 2026-09-06 20:55:00+00
  const sj602DepartureUtc = "2026-09-06T20:55:00.000Z";
  const sj602ArrivalUtc = "2026-09-06T21:55:00.000Z";

  it("A. formats the same UTC instant in New York", () => {
    assert.equal(
      formatTripTime(sj602DepartureUtc, "America/New_York"),
      "4:55 PM"
    );
  });

  it("B. formats the same UTC instant in Port-au-Prince", () => {
    assert.equal(
      formatTripTime(sj602ArrivalUtc, "America/Port-au-Prince"),
      "5:55 PM"
    );
  });

  it("C. applies DST via IANA zones (EDT in July)", () => {
    // 2026-07-15 16:00 UTC = 12:00 PM EDT (UTC-4)
    assert.equal(
      formatTripTime("2026-07-15T16:00:00.000Z", "America/New_York"),
      "12:00 PM"
    );
    // 2026-01-15 16:00 UTC = 11:00 AM EST (UTC-5)
    assert.equal(
      formatTripTime("2026-01-15T16:00:00.000Z", "America/New_York"),
      "11:00 AM"
    );
  });

  it("D. overnight flight shows correct local calendar days", () => {
    const overnight = {
      originCode: "BOS",
      destinationCode: "PAP",
      // 11:30 PM Boston local on Sep 6 = 03:30 UTC Sep 7 (EDT)
      departureTime: "2026-09-07T03:30:00.000Z",
      // 1:15 AM Port-au-Prince on Sep 7 = 05:15 UTC Sep 7
      arrivalTime: "2026-09-07T05:15:00.000Z",
    };

    assert.equal(isOvernightFlight(overnight), true);
    assert.equal(
      calendarDateInTimeZone(
        overnight.departureTime,
        getAirportTimeZone("BOS")
      ),
      "2026-09-06"
    );
    assert.equal(
      calendarDateInTimeZone(
        overnight.arrivalTime,
        getAirportTimeZone("PAP")
      ),
      "2026-09-07"
    );
    assert.equal(formatDepartureTime(overnight), "11:30 PM");
    assert.equal(formatArrivalTime(overnight), "1:15 AM");
  });

  it("E. unknown airport falls back to UTC", () => {
    assert.equal(getAirportTimeZone("XYZ"), FALLBACK_AIRPORT_TIME_ZONE);
    assert.equal(formatTripTime(sj602DepartureUtc, getAirportTimeZone("XYZ")), "8:55 PM");
  });

  it("F. results are independent of process.env.TZ", () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Honolulu";
      assert.equal(
        formatDepartureTime({
          departureTime: sj602DepartureUtc,
          originCode: "BOS",
        }),
        "4:55 PM"
      );

      process.env.TZ = "Asia/Tokyo";
      assert.equal(
        formatArrivalTime({
          arrivalTime: sj602ArrivalUtc,
          destinationCode: "PAP",
        }),
        "5:55 PM"
      );
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });

  it("round-trips admin wall-clock entry through airport timezones", () => {
    const utcIso = wallClockInTimeZoneToUtcIso(
      "2026-09-06T16:55",
      "America/New_York"
    );
    assert.equal(utcIso, "2026-09-06T20:55:00.000Z");
    assert.equal(
      formatInstantAsDatetimeLocal(utcIso, "America/New_York"),
      "2026-09-06T16:55"
    );
  });
});
