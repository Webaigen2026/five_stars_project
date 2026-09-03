import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFlightSearchParams,
  buildModifySearchHref,
  formatEmptyFlightSearchMessage,
  formatSearchDate,
  validateFlightSearch,
} from "./flight-search";

describe("flight search validation", () => {
  const validSearch = {
    from: "BOS",
    to: "PAP",
    departure: "2026-09-06",
    passengers: "1",
  };

  it("builds a code-only results URL", () => {
    const params = buildFlightSearchParams(validSearch);

    assert.equal(params.get("from"), "BOS");
    assert.equal(params.get("to"), "PAP");
    assert.equal(params.get("departure"), "2026-09-06");
    assert.equal(params.get("passengers"), "1");
    assert.equal(
      `/flights/results?${params.toString()}`,
      "/flights/results?from=BOS&to=PAP&departure=2026-09-06&passengers=1"
    );
  });

  it("blocks the same airport", () => {
    assert.equal(
      validateFlightSearch({
        ...validSearch,
        to: "BOS",
      }),
      "Departure and destination airports must be different."
    );
  });

  it("rejects unknown airport codes such as BOB", () => {
    assert.equal(
      validateFlightSearch({
        ...validSearch,
        from: "BOB",
      }),
      "Select a valid departure airport."
    );
  });

  it("requires from, to, date, and at least one passenger", () => {
    assert.equal(
      validateFlightSearch({ ...validSearch, from: "" }),
      "Departure airport is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, to: "" }),
      "Destination airport is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, departure: "" }),
      "Departure date is required."
    );
    assert.equal(
      validateFlightSearch({ ...validSearch, passengers: "0" }),
      "At least 1 passenger is required."
    );
  });

  it("builds a friendly empty state and modify-search link", () => {
    assert.equal(formatSearchDate("2026-09-06"), "Sep 6, 2026");
    assert.equal(
      formatEmptyFlightSearchMessage({
        from: "BOS",
        to: "PAP",
        departure: "2026-09-06",
      }),
      "No flights found from Boston (BOS) to Port-au-Prince (PAP) on Sep 6, 2026."
    );
    assert.equal(
      formatEmptyFlightSearchMessage({
        from: "XXX",
        to: "PAP",
        departure: "2026-09-06",
      }),
      "No flights found from XXX to Port-au-Prince (PAP) on Sep 6, 2026."
    );
    assert.equal(
      buildModifySearchHref(validSearch),
      "/flights?from=BOS&to=PAP&departure=2026-09-06&passengers=1"
    );
  });
});
