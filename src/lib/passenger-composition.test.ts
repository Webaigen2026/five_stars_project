import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adjustPassengerComposition,
  canDecrement,
  canIncrement,
  compositionFromPassengerCount,
  DEFAULT_PASSENGER_COMPOSITION,
  formatPassengerCountLabel,
  totalPassengers,
} from "./passenger-composition";

describe("passenger composition", () => {
  it("defaults to one adult", () => {
    assert.deepEqual(DEFAULT_PASSENGER_COMPOSITION, {
      adults: 1,
      seniors: 0,
      children: 0,
      infantsInSeat: 0,
    });
    assert.equal(totalPassengers(DEFAULT_PASSENGER_COMPOSITION), 1);
    assert.equal(formatPassengerCountLabel(1), "1 Passenger");
    assert.equal(formatPassengerCountLabel(2), "2 Passengers");
  });

  it("increments adults and children into a shared total", () => {
    let next = adjustPassengerComposition(
      DEFAULT_PASSENGER_COMPOSITION,
      "adults",
      1
    );
    assert.equal(totalPassengers(next), 2);

    next = adjustPassengerComposition(
      { adults: 1, seniors: 0, children: 0, infantsInSeat: 0 },
      "children",
      1
    );
    assert.deepEqual(next, {
      adults: 1,
      seniors: 0,
      children: 1,
      infantsInSeat: 0,
    });
    assert.equal(totalPassengers(next), 2);

    next = adjustPassengerComposition(next, "infantsInSeat", 1);
    assert.equal(totalPassengers(next), 3);
  });

  it("keeps at least one adult and caps at nine travelers", () => {
    assert.equal(
      canDecrement(DEFAULT_PASSENGER_COMPOSITION, "adults"),
      false
    );
    assert.deepEqual(
      adjustPassengerComposition(DEFAULT_PASSENGER_COMPOSITION, "adults", -1),
      DEFAULT_PASSENGER_COMPOSITION
    );

    let next = compositionFromPassengerCount(9);
    assert.equal(totalPassengers(next), 9);
    assert.equal(canIncrement(next, "children"), false);
    assert.deepEqual(adjustPassengerComposition(next, "children", 1), next);
  });

  it("reset-equivalent defaults come from passenger count parsing", () => {
    assert.deepEqual(compositionFromPassengerCount("3"), {
      adults: 3,
      seniors: 0,
      children: 0,
      infantsInSeat: 0,
    });
    assert.deepEqual(
      compositionFromPassengerCount("0"),
      DEFAULT_PASSENGER_COMPOSITION
    );
  });
});
