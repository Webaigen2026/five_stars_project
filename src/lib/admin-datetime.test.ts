import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calendarDateInTimeZone,
  elapsedDurationMinutes,
  formatInstantAsDatetimeLocal,
  getAirportTimeZone,
  wallClockInTimeZoneToUtcIso,
} from "./airport-timezones";
import {
  combineAdminDateAndTime,
  composeDatetimeLocalValue,
  formatAdminDateLabel,
  formatAdminTimeLabel,
  hour12To24,
  hour24To12,
  splitDatetimeLocalForAdmin,
} from "./admin-datetime";

describe("admin datetime picker boundary (D12.3.1.2)", () => {
  it("A. Sep 6 2026 4:55 PM → 2026-09-06T16:55", () => {
    assert.equal(
      combineAdminDateAndTime({
        date: "2026-09-06",
        hour12: 4,
        minute: 55,
        period: "PM",
      }),
      "2026-09-06T16:55"
    );
  });

  it("B. Sep 6 2026 4:55 AM → 2026-09-06T04:55", () => {
    assert.equal(
      combineAdminDateAndTime({
        date: "2026-09-06",
        hour12: 4,
        minute: 55,
        period: "AM",
      }),
      "2026-09-06T04:55"
    );
  });

  it("C. 12:00 AM → 00:00", () => {
    assert.equal(hour12To24(12, "AM"), 0);
    assert.equal(
      composeDatetimeLocalValue("2026-09-06", hour12To24(12, "AM"), 0),
      "2026-09-06T00:00"
    );
  });

  it("D. 12:00 PM → 12:00", () => {
    assert.equal(hour12To24(12, "PM"), 12);
    assert.equal(
      composeDatetimeLocalValue("2026-09-06", hour12To24(12, "PM"), 0),
      "2026-09-06T12:00"
    );
  });

  it("E. 11:59 PM → 23:59", () => {
    assert.equal(hour12To24(11, "PM"), 23);
    assert.equal(
      composeDatetimeLocalValue("2026-09-06", 23, 59),
      "2026-09-06T23:59"
    );
  });

  it("F. edit BOS flight round-trips airport-local display → same UTC", () => {
    const utc = wallClockInTimeZoneToUtcIso(
      "2026-09-06T16:55",
      "America/New_York"
    );
    const local = formatInstantAsDatetimeLocal(utc, "America/New_York");
    assert.equal(local, "2026-09-06T16:55");

    const parts = splitDatetimeLocalForAdmin(local);
    assert.ok(parts);
    assert.equal(parts.date, "2026-09-06");
    assert.equal(parts.hour12, 4);
    assert.equal(parts.minute, 55);
    assert.equal(parts.period, "PM");

    const recomposed = combineAdminDateAndTime(parts);
    assert.equal(recomposed, "2026-09-06T16:55");
    assert.equal(
      wallClockInTimeZoneToUtcIso(recomposed!, "America/New_York"),
      utc
    );
  });

  it("G. edit PAP flight round-trips airport-local display → same UTC", () => {
    const utc = wallClockInTimeZoneToUtcIso(
      "2026-09-12T10:00",
      "America/Port-au-Prince"
    );
    const local = formatInstantAsDatetimeLocal(
      utc,
      "America/Port-au-Prince"
    );
    assert.equal(local, "2026-09-12T10:00");

    const parts = splitDatetimeLocalForAdmin(local);
    assert.ok(parts);
    assert.equal(formatAdminTimeLabel(parts.hour24, parts.minute), "10:00 AM");

    const recomposed = combineAdminDateAndTime(parts);
    assert.equal(
      wallClockInTimeZoneToUtcIso(recomposed!, "America/Port-au-Prince"),
      utc
    );
  });

  it("H. DST-sensitive BOS date still uses existing timezone helper", () => {
    // January EST (UTC-5): 2:00 PM local → 19:00 UTC
    const utc = wallClockInTimeZoneToUtcIso(
      "2026-01-15T14:00",
      getAirportTimeZone("BOS")
    );
    assert.equal(utc, "2026-01-15T19:00:00.000Z");

    const parts = splitDatetimeLocalForAdmin("2026-01-15T14:00");
    assert.ok(parts);
    assert.equal(parts.period, "PM");
    assert.equal(parts.hour12, 2);
    assert.equal(
      wallClockInTimeZoneToUtcIso(
        combineAdminDateAndTime(parts)!,
        getAirportTimeZone("BOS")
      ),
      utc
    );
  });

  it("I. arrival chronology validation unchanged", () => {
    const dep = wallClockInTimeZoneToUtcIso(
      "2026-09-06T16:55",
      "America/New_York"
    );
    const invalidArr = wallClockInTimeZoneToUtcIso(
      "2026-09-06T15:55",
      "America/Port-au-Prince"
    );
    assert.equal(elapsedDurationMinutes(dep, invalidArr), null);
  });

  it("J. duration calculation unchanged through picker boundary", () => {
    const depLocal = combineAdminDateAndTime({
      date: "2026-09-10",
      hour12: 4,
      minute: 55,
      period: "PM",
    });
    const arrLocal = combineAdminDateAndTime({
      date: "2026-09-10",
      hour12: 5,
      minute: 55,
      period: "PM",
    });
    assert.ok(depLocal && arrLocal);

    const dep = wallClockInTimeZoneToUtcIso(depLocal, "America/New_York");
    const arr = wallClockInTimeZoneToUtcIso(
      arrLocal,
      "America/Port-au-Prince"
    );
    assert.equal(elapsedDurationMinutes(dep, arr), 60);
  });

  it("K. date selection composes calendar parts without browser TZ reinterpretation", () => {
    // Pure Y-M-D + clock → same string regardless of process TZ.
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati";
      assert.equal(
        combineAdminDateAndTime({
          date: "2026-09-06",
          hour12: 4,
          minute: 55,
          period: "PM",
        }),
        "2026-09-06T16:55"
      );
      process.env.TZ = "America/Los_Angeles";
      assert.equal(
        combineAdminDateAndTime({
          date: "2026-09-06",
          hour12: 4,
          minute: 55,
          period: "PM",
        }),
        "2026-09-06T16:55"
      );
      assert.equal(formatAdminDateLabel("2026-09-06"), "Sep 6, 2026");
    } finally {
      if (previous == null) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });

  it("L. empty date/time handled safely", () => {
    assert.equal(
      combineAdminDateAndTime({
        date: null,
        hour12: 4,
        minute: 55,
        period: "PM",
      }),
      null
    );
    assert.equal(
      combineAdminDateAndTime({
        date: "2026-09-06",
        hour12: null,
        minute: 55,
        period: "PM",
      }),
      null
    );
    assert.equal(splitDatetimeLocalForAdmin(""), null);
    assert.equal(splitDatetimeLocalForAdmin("not-a-date"), null);
  });

  it("hour24 ↔ hour12 round-trips midnight and noon", () => {
    assert.deepEqual(hour24To12(0), { hour12: 12, period: "AM" });
    assert.deepEqual(hour24To12(12), { hour12: 12, period: "PM" });
    assert.equal(hour12To24(12, "AM"), 0);
    assert.equal(hour12To24(12, "PM"), 12);
  });

  it("airport today helper remains authoritative for calendar hints", () => {
    const todayBos = calendarDateInTimeZone(
      "2026-09-06T20:55:00.000Z",
      getAirportTimeZone("BOS")
    );
    assert.equal(todayBos, "2026-09-06");
  });
});
