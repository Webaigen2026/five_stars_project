import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AIRPORTS,
  formatAirportLabel,
  formatAirportLabelFromCode,
  formatAirportRoute,
  getAirportByCode,
} from "./airports";

describe("airport dataset", () => {
  it("includes the StarJet airports and not invalid codes", () => {
    const codes = AIRPORTS.map((airport) => airport.code);

    assert.deepEqual(codes, ["BOS", "MIA", "FLL", "JFK", "CAP", "PAP"]);
    assert.equal(getAirportByCode("BOB"), undefined);
    assert.equal(getAirportByCode("XXX"), undefined);
  });

  it("looks up airports case-insensitively", () => {
    const airport = getAirportByCode("bos");

    assert.equal(airport?.city, "Boston");
    assert.equal(formatAirportLabel(airport!), "Boston (BOS)");
  });

  it("formats routes and falls back to the raw code", () => {
    assert.equal(
      formatAirportRoute("BOS", "PAP"),
      "Boston (BOS) → Port-au-Prince (PAP)"
    );
    assert.equal(formatAirportLabelFromCode("XXX"), "XXX");
    assert.equal(formatAirportRoute("XXX", "PAP"), "XXX → Port-au-Prince (PAP)");
  });
});
