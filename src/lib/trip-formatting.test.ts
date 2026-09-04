import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBookingProgressPresentation } from "./booking-status";
import {
  formatDuration,
  formatMoney,
  formatRoute,
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
