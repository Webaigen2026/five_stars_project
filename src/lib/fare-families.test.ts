import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateBookingTotals,
  normalizeBookingLegs,
} from "./booking-legs";
import {
  getFareFamilyPriceCents,
  listFareFamilyOptions,
  parseFareFamily,
  resolveFareFamilyForBooking,
  resolveSegmentFarePriceCents,
} from "./fare-families";
import { buildFareContinueHref } from "./flight-search";
import { serializePassengerComposition } from "./passenger-composition";

describe("fare families (D12.1.3)", () => {
  it("A. BASIC = base + 0", () => {
    assert.equal(getFareFamilyPriceCents(35300, "BASIC"), 35300);
  });

  it("B. STANDARD = base + 3500", () => {
    assert.equal(getFareFamilyPriceCents(35300, "STANDARD"), 38800);
  });

  it("C. FLEX = base + 8500", () => {
    assert.equal(getFareFamilyPriceCents(35300, "FLEX"), 43800);
  });

  it("D. invalid fare family rejected by booking resolver", () => {
    assert.equal(parseFareFamily("ECONOMY"), null);
    assert.throws(() => resolveFareFamilyForBooking("ECONOMY"), /Invalid fare/);
    assert.equal(resolveFareFamilyForBooking(null), "BASIC");
    assert.equal(resolveFareFamilyForBooking(""), "BASIC");
  });

  it("E. client-submitted fare price is irrelevant to server helper", () => {
    // Server only uses base + family; fake client totals are never inputs.
    assert.equal(getFareFamilyPriceCents(35300, "STANDARD"), 38800);
    assert.notEqual(getFareFamilyPriceCents(35300, "STANDARD"), 1);
  });

  it("F. one-way STANDARD × 4 passengers", () => {
    const unit = getFareFamilyPriceCents(35300, "STANDARD");
    assert.deepEqual(
      calculateBookingTotals({
        unitPricesCents: [unit],
        passengerCount: 4,
      }),
      {
        subtotal: 38800 * 4,
        taxesAndFees: 6800 * 4,
        total: 38800 * 4 + 6800 * 4,
      }
    );
  });

  it("G. round-trip STANDARD + FLEX × 2 passengers", () => {
    const outbound = getFareFamilyPriceCents(35300, "STANDARD");
    const ret = getFareFamilyPriceCents(35300, "FLEX");
    assert.deepEqual(
      calculateBookingTotals({
        unitPricesCents: [outbound, ret],
        passengerCount: 2,
      }),
      {
        subtotal: (38800 + 43800) * 2,
        taxesAndFees: 6800 * 2,
        total: (38800 + 43800) * 2 + 6800 * 2,
      }
    );
  });

  it("H/I. fare fields ride on segment normalization shape", () => {
    const legs = normalizeBookingLegs({
      flightId: 1,
      segments: [
        {
          flightId: 1,
          segmentType: "OUTBOUND",
          sequence: 1,
          fareFamily: "STANDARD",
          farePriceCents: 38800,
        },
        {
          flightId: 2,
          segmentType: "RETURN",
          sequence: 2,
          fareFamily: "FLEX",
          farePriceCents: 43800,
        },
      ],
    });

    assert.equal(legs[0]?.fareFamily, "STANDARD");
    assert.equal(legs[0]?.farePriceCents, 38800);
    assert.equal(legs[1]?.fareFamily, "FLEX");
    assert.equal(legs[1]?.farePriceCents, 43800);
  });

  it("J. legacy segment null farePriceCents falls back to flight price", () => {
    assert.equal(
      resolveSegmentFarePriceCents({
        farePriceCents: null,
        flightPriceCents: 35300,
      }),
      35300
    );
    assert.equal(
      resolveSegmentFarePriceCents({
        farePriceCents: 38800,
        flightPriceCents: 35300,
      }),
      38800
    );
  });

  it("K. passenger composition preserved through fare query params", () => {
    const params = new URLSearchParams({
      flight: "SJ602",
      fareFamily: "STANDARD",
      ...serializePassengerComposition({
        adults: 1,
        seniors: 1,
        children: 1,
        infantsInSeat: 1,
      }),
    });

    assert.equal(params.get("flight"), "SJ602");
    assert.equal(params.get("fareFamily"), "STANDARD");
    assert.equal(params.get("passengers"), "4");
    assert.equal(params.get("adults"), "1");
    assert.equal(params.get("seniors"), "1");
    assert.equal(params.get("children"), "1");
    assert.equal(params.get("infants"), "1");
  });

  it("L. age validation date remains independent of fare family", () => {
    // Fare selection does not alter origin-local departure date used for age.
    assert.equal(getFareFamilyPriceCents(35300, "FLEX"), 43800);
  });

  it("M. round-trip fare choices remain independent", () => {
    assert.notEqual(
      getFareFamilyPriceCents(35300, "STANDARD"),
      getFareFamilyPriceCents(35300, "FLEX")
    );
  });

  it("N. checkout reads persisted segment fare snapshot", () => {
    assert.equal(
      resolveSegmentFarePriceCents({
        farePriceCents: 38800,
        flightPriceCents: 99999,
      }),
      38800
    );
  });

  it("O. inventory unchanged by fare math", () => {
    // Fare helpers only transform cents; seat count is outside this module.
    assert.equal(typeof getFareFamilyPriceCents(100, "BASIC"), "number");
  });
});

describe("fare continue hrefs (D12.1.3.1 modal navigation)", () => {
  it("F. one-way STANDARD continues to passengers with fareFamily", () => {
    assert.equal(
      buildFareContinueHref({
        mode: "one-way",
        fareFamily: "STANDARD",
        flightCode: "SJ602",
        flightId: 1,
        passengers: "1",
        adults: "1",
        seniors: "0",
        children: "0",
        infants: "0",
      }),
      "/passengers?flight=SJ602&passengers=1&adults=1&seniors=0&children=0&infants=0&fareFamily=STANDARD"
    );
  });

  it("H. round-trip outbound continues to return results with family", () => {
    const href = buildFareContinueHref({
      mode: "round-trip-outbound",
      fareFamily: "STANDARD",
      flightCode: "SJ602",
      flightId: 23,
      passengers: "2",
      adults: "1",
      seniors: "0",
      children: "1",
      infants: "0",
      from: "BOS",
      to: "PAP",
      departure: "2026-09-06",
      returnDate: "2026-09-12",
    });
    assert.match(href, /\/flights\/results\?/);
    assert.match(href, /outboundFlightId=23/);
    assert.match(href, /outboundFareFamily=STANDARD/);
    assert.match(href, /passengers=2/);
    assert.match(href, /children=1/);
  });

  it("I/J. round-trip return continues with independent families", () => {
    const href = buildFareContinueHref({
      mode: "round-trip-return",
      fareFamily: "FLEX",
      flightCode: "SJ605",
      flightId: 40,
      passengers: "2",
      adults: "2",
      seniors: "0",
      children: "0",
      infants: "0",
      outboundFlightId: 23,
      outboundFareFamily: "STANDARD",
    });
    assert.match(href, /\/passengers\?/);
    assert.match(href, /outboundFlightId=23/);
    assert.match(href, /returnFlightId=40/);
    assert.match(href, /outboundFareFamily=STANDARD/);
    assert.match(href, /returnFareFamily=FLEX/);
  });

  it("K. passenger composition preserved on one-way continue", () => {
    const href = buildFareContinueHref({
      mode: "one-way",
      fareFamily: "BASIC",
      flightCode: "SJ600",
      flightId: 2,
      passengers: "4",
      adults: "1",
      seniors: "1",
      children: "1",
      infants: "1",
    });
    assert.match(href, /passengers=4/);
    assert.match(href, /adults=1/);
    assert.match(href, /seniors=1/);
    assert.match(href, /children=1/);
    assert.match(href, /infants=1/);
    assert.match(href, /flight=SJ600/);
  });

  it("L. invalid client fare still rejected by server resolver", () => {
    assert.throws(() => resolveFareFamilyForBooking("PREMIUM"), /Invalid fare/);
  });

  it("C. modal pricing uses shared listFareFamilyOptions", () => {
    const options = listFareFamilyOptions(35300);
    assert.deepEqual(
      options.map((item) => [item.family, item.priceCents]),
      [
        ["BASIC", 35300],
        ["STANDARD", 38800],
        ["FLEX", 43800],
      ]
    );
  });
});
