import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adjustPassengerComposition,
  canDecrement,
  canIncrement,
  compositionFromPassengerCount,
  DEFAULT_PASSENGER_COMPOSITION,
  expandPassengerComposition,
  formatCompositionSummary,
  formatPassengerCountLabel,
  formatPassengerTypeLabel,
  normalizePassengerComposition,
  parsePassengerComposition,
  resolvePassengerDetailsModel,
  resolvePassengerTypesForBooking,
  serializePassengerComposition,
  totalPassengers,
} from "./passenger-composition";

const NINE_PERSON_COMPOSITION = {
  adults: 1,
  seniors: 3,
  children: 3,
  infantsInSeat: 2,
};

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

    const next = compositionFromPassengerCount(9);
    assert.equal(totalPassengers(next), 9);
    assert.equal(canIncrement(next, "children"), false);
    assert.deepEqual(adjustPassengerComposition(next, "children", 1), next);
  });

  it("serializes the exact 9-person manual test composition", () => {
    assert.equal(totalPassengers(NINE_PERSON_COMPOSITION), 9);
    assert.deepEqual(serializePassengerComposition(NINE_PERSON_COMPOSITION), {
      passengers: "9",
      adults: "1",
      seniors: "3",
      children: "3",
      infants: "2",
    });
  });

  it("restores exact composition from results params", () => {
    assert.deepEqual(
      parsePassengerComposition({
        passengers: "9",
        adults: "1",
        seniors: "3",
        children: "3",
        infants: "2",
      }),
      NINE_PERSON_COMPOSITION
    );
    assert.equal(
      formatCompositionSummary(NINE_PERSON_COMPOSITION),
      "1 Adult · 3 Seniors · 3 Children · 2 Infants in seat"
    );
  });

  it("normalizes old passengers-only URLs to all adults", () => {
    assert.deepEqual(parsePassengerComposition({ passengers: "3" }), {
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

  it("falls back when category params disagree with passengers total", () => {
    assert.deepEqual(
      normalizePassengerComposition({
        passengers: "2",
        adults: "1",
        seniors: "3",
        children: "3",
        infants: "2",
      }),
      {
        adults: 2,
        seniors: 0,
        children: 0,
        infantsInSeat: 0,
      }
    );
  });

  it("falls back safely when total exceeds nine", () => {
    assert.deepEqual(
      normalizePassengerComposition({
        passengers: "12",
        adults: "12",
        seniors: "0",
        children: "0",
        infants: "0",
      }),
      {
        adults: 9,
        seniors: 0,
        children: 0,
        infantsInSeat: 0,
      }
    );
  });

  it("expands the 9-person composition in deterministic order", () => {
    const slots = expandPassengerComposition(NINE_PERSON_COMPOSITION);
    assert.deepEqual(
      slots.map((slot) => slot.key),
      [
        "adults",
        "seniors",
        "seniors",
        "seniors",
        "children",
        "children",
        "children",
        "infantsInSeat",
        "infantsInSeat",
      ]
    );
    assert.deepEqual(
      slots.map((slot) => slot.label),
      [
        "Adult",
        "Senior",
        "Senior",
        "Senior",
        "Child",
        "Child",
        "Child",
        "Infant in seat",
        "Infant in seat",
      ]
    );
  });

  it("Passenger Details model keeps Travelers count and forms at 9 for the browser case", () => {
    const model = resolvePassengerDetailsModel({
      passengers: "9",
      adults: "1",
      seniors: "3",
      children: "3",
      infants: "2",
    });

    assert.equal(model.passengerCount, 9);
    assert.equal(model.slots.length, 9);
    assert.equal(model.passengerCount, model.slots.length);
    assert.deepEqual(model.composition, NINE_PERSON_COMPOSITION);
    assert.deepEqual(
      model.slots.map((slot) => slot.key),
      [
        "adults",
        "seniors",
        "seniors",
        "seniors",
        "children",
        "children",
        "children",
        "infantsInSeat",
        "infantsInSeat",
      ]
    );
    assert.equal(
      model.summary,
      "1 Adult · 3 Seniors · 3 Children · 2 Infants in seat"
    );
  });

  it("Passenger Details model does not multiply travelers for multi-leg bookings", () => {
    const model = resolvePassengerDetailsModel({
      passengers: "3",
      adults: "2",
      seniors: "0",
      children: "1",
      infants: "0",
    });
    assert.equal(model.passengerCount, 3);
    assert.deepEqual(
      model.slots.map((slot) => slot.label),
      ["Adult", "Adult", "Child"]
    );
  });

  it("Passenger Details model honors legacy passengers-only URLs up to nine", () => {
    assert.equal(
      resolvePassengerDetailsModel({ passengers: "6" }).passengerCount,
      6
    );
    assert.equal(
      resolvePassengerDetailsModel({ passengers: "9" }).passengerCount,
      9
    );
    assert.equal(
      resolvePassengerDetailsModel({ passengers: "9" }).slots.length,
      9
    );
  });

  it("maps composition slots to persisted passenger types", () => {
    assert.deepEqual(
      resolvePassengerTypesForBooking({
        passengerCount: 1,
        adults: 1,
        seniors: 0,
        children: 0,
        infants: 0,
      }),
      ["ADULT"]
    );

    assert.deepEqual(
      resolvePassengerTypesForBooking({
        passengerCount: 3,
        adults: 1,
        seniors: 2,
        children: 0,
        infants: 0,
      }),
      ["ADULT", "SENIOR", "SENIOR"]
    );

    assert.deepEqual(
      resolvePassengerTypesForBooking({
        passengerCount: 3,
        adults: 1,
        seniors: 0,
        children: 1,
        infants: 1,
      }),
      ["ADULT", "CHILD", "INFANT_IN_SEAT"]
    );
  });

  it("does not trust mismatched category metadata when deriving types", () => {
    assert.deepEqual(
      resolvePassengerTypesForBooking({
        passengerCount: 2,
        adults: 1,
        seniors: 3,
        children: 3,
        infants: 2,
      }),
      ["ADULT", "ADULT"]
    );
  });

  it("formats passenger type labels for checkout and trips", () => {
    assert.equal(formatPassengerTypeLabel("ADULT"), "Adult");
    assert.equal(formatPassengerTypeLabel("SENIOR"), "Senior");
    assert.equal(formatPassengerTypeLabel("CHILD"), "Child");
    assert.equal(formatPassengerTypeLabel("INFANT_IN_SEAT"), "Infant in seat");
    assert.equal(formatPassengerTypeLabel("TAMPERED"), "Adult");
  });
});
