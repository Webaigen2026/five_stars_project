/**
 * Flight search dataset, validation, and Neon-backed result checks.
 *
 * Usage:
 *   npx tsx scripts/test-flight-search.ts
 */
import {
  AIRPORTS,
  formatAirportLabelFromCode,
  getAirportByCode,
} from "../src/data/airports";
import {
  buildFlightSearchParams,
  formatEmptyFlightSearchMessage,
  validateFlightSearch,
} from "../src/lib/flight-search";
import { db } from "../src/prisma/db";

let failures = 0;

function ok(label: string, passed: boolean) {
  if (passed) {
    console.log(`  PASS  ${label}`);
    return;
  }

  failures += 1;
  console.error(`  FAIL  ${label}`);
}

function matchesSearch(
  flight: {
    origin: string;
    originCode: string;
    destination: string;
    destinationCode: string;
    status: string;
    departureTime: string;
  },
  from: string,
  to: string,
  departure: string
) {
  const fromQuery = from.toLowerCase().trim();
  const toQuery = to.toLowerCase().trim();
  const departureDate = flight.departureTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";

  return (
    (!fromQuery ||
      flight.origin.toLowerCase().includes(fromQuery) ||
      flight.originCode.toLowerCase().includes(fromQuery)) &&
    (!toQuery ||
      flight.destination.toLowerCase().includes(toQuery) ||
      flight.destinationCode.toLowerCase().includes(toQuery)) &&
    flight.status === "SCHEDULED" &&
    (!departure || departureDate === departure)
  );
}

async function main() {
  console.log("\nAirport selector dataset");
  ok("BOB is not a selectable airport", getAirportByCode("BOB") === undefined);
  ok(
    "required StarJet airports are present",
    ["BOS", "MIA", "FLL", "JFK", "CAP", "PAP"].every((code) =>
      AIRPORTS.some((airport) => airport.code === code)
    )
  );

  console.log("\nSearch params and validation");
  const params = buildFlightSearchParams({
    from: "bos",
    to: "pap",
    departure: "2026-09-06",
    passengers: "1",
  });
  ok("submits from=BOS&to=PAP", params.get("from") === "BOS" && params.get("to") === "PAP");
  ok(
    "same airport is blocked",
    validateFlightSearch({
      from: "BOS",
      to: "BOS",
      departure: "2026-09-06",
      passengers: "1",
    }) === "Departure and destination airports must be different."
  );

  console.log("\nUnknown-code fallback");
  ok(
    "unknown URL code stays readable",
    formatAirportLabelFromCode("XXX") === "XXX"
  );
  ok(
    "empty state includes fallback code",
    formatEmptyFlightSearchMessage({
      from: "XXX",
      to: "PAP",
      departure: "2026-09-06",
    }).includes("from XXX to Port-au-Prince (PAP)")
  );

  console.log("\nNeon-backed route matching");
  const flights = await db.orm.public.Flight.all();

  const bosCap = flights.filter((flight) =>
    matchesSearch(flight, "BOS", "CAP", "2026-09-10")
  );
  const miaPap = flights.filter((flight) =>
    matchesSearch(flight, "MIA", "PAP", "2026-09-10")
  );
  const bosPap = flights.filter((flight) => matchesSearch(flight, "BOS", "PAP", ""));
  const sj602 = flights.find((flight) => flight.code === "SJ602");

  ok("BOS -> CAP still matches seeded flights", bosCap.length > 0);
  ok("MIA -> PAP still matches seeded flights", miaPap.length > 0);
  ok(
    "BOS -> PAP returns SJ602 only when that flight exists and is scheduled",
    sj602
      ? sj602.status !== "SCHEDULED" || bosPap.some((flight) => flight.code === "SJ602")
      : true
  );

  const baseUrl = process.env.D6_APP_URL ?? "http://localhost:3000";

  console.log("\nResults page HTTP");
  try {
    const unknown = await fetch(
      `${baseUrl}/flights/results?from=XXX&to=PAP&departure=2026-09-06&passengers=1`
    );
    const html = await unknown.text();
    ok("unknown-code results page returns 200", unknown.ok);
    ok("unknown-code page does not crash", !html.includes("Application error"));
    ok(
      "unknown-code fallback appears in the page",
      html.includes("XXX") && html.includes("Port-au-Prince (PAP)")
    );
    ok("empty state offers Modify search", html.includes("Modify search"));
  } catch {
    console.log("  skip  Results page HTTP (app server not reachable).");
  }

  await db.close();

  if (failures > 0) {
    console.error(`\n${failures} flight search test(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll flight search tests passed.");
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
