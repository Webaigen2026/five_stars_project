import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AIRPORTS,
  flightReversesRoute,
  formatAirportLabel,
  formatAirportLabelFromCode,
  formatAirportRoute,
  getAirportByCode,
  resolveAirportEndpointCode,
} from "./airports";

describe("airport dataset", () => {
  it("includes the Five Stars network airports and not invalid codes", () => {
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

  it("resolves swapped city/code endpoint fields to IATA codes", () => {
    assert.equal(
      resolveAirportEndpointCode({ code: "PORT-AU-PRINCE", label: "PAP" }),
      "PAP"
    );
    assert.equal(
      resolveAirportEndpointCode({ code: "BOSTON", label: "BOS" }),
      "BOS"
    );
    assert.equal(
      resolveAirportEndpointCode({ code: "PAP", label: "Port-au-Prince" }),
      "PAP"
    );
  });

  it("detects reverse routes across swapped endpoint fields", () => {
    assert.equal(
      flightReversesRoute(
        {
          origin: "Boston",
          originCode: "BOS",
          destination: "Port-au-Prince",
          destinationCode: "PAP",
        },
        {
          origin: "PAP",
          originCode: "PORT-AU-PRINCE",
          destination: "BOS",
          destinationCode: "BOSTON",
        }
      ),
      true
    );
  });
});
