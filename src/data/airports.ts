export type AirportOption = {
  code: string;
  city: string;
  name: string;
  country: string;
};

export const AIRPORTS: AirportOption[] = [
  {
    code: "BOS",
    city: "Boston",
    name: "Boston Logan International Airport",
    country: "USA",
  },
  {
    code: "MIA",
    city: "Miami",
    name: "Miami International Airport",
    country: "USA",
  },
  {
    code: "FLL",
    city: "Fort Lauderdale",
    name: "Fort Lauderdale-Hollywood International Airport",
    country: "USA",
  },
  {
    code: "JFK",
    city: "New York",
    name: "John F. Kennedy International Airport",
    country: "USA",
  },
  {
    code: "CAP",
    city: "Cap-Haïtien",
    name: "Cap-Haïtien International Airport",
    country: "Haiti",
  },
  {
    code: "PAP",
    city: "Port-au-Prince",
    name: "Toussaint Louverture International Airport",
    country: "Haiti",
  },
];

export function normalizeAirportCode(value: string) {
  return value.trim().toUpperCase();
}

export function getAirportByCode(code: string) {
  const normalized = normalizeAirportCode(code);

  if (!normalized) {
    return undefined;
  }

  return AIRPORTS.find((airport) => airport.code === normalized);
}

/**
 * Collapse city/code labels for comparison (accents/punctuation ignored).
 * Example: "Port-au-Prince" / "PORT-AU-PRINCE" → "PORTAUPRINCE".
 */
export function normalizeAirportToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Resolve a flight endpoint to a canonical IATA code when possible.
 *
 * Supports messy stored rows where city and code fields are swapped
 * (e.g. origin="PAP", originCode="PORT-AU-PRINCE").
 */
export function resolveAirportEndpointCode(input: {
  code: string;
  label?: string | null;
}): string {
  const rawCandidates = [input.code, input.label ?? ""]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const raw of rawCandidates) {
    const asCode = normalizeAirportCode(raw);
    if (getAirportByCode(asCode)) {
      return asCode;
    }
  }

  for (const raw of rawCandidates) {
    const token = normalizeAirportToken(raw);
    if (!token) {
      continue;
    }

    for (const airport of AIRPORTS) {
      if (normalizeAirportToken(airport.city) === token) {
        return airport.code;
      }
    }
  }

  return (
    normalizeAirportCode(input.code) ||
    normalizeAirportCode(input.label ?? "")
  );
}

export type FlightRouteEndpoints = {
  origin?: string | null;
  originCode: string;
  destination?: string | null;
  destinationCode: string;
};

/**
 * True when return origin/destination reverse the outbound endpoints,
 * using canonical airport resolution (not raw string equality alone).
 */
export function flightReversesRoute(
  outbound: FlightRouteEndpoints,
  returnFlight: FlightRouteEndpoints
) {
  const outboundOrigin = resolveAirportEndpointCode({
    code: outbound.originCode,
    label: outbound.origin,
  });
  const outboundDestination = resolveAirportEndpointCode({
    code: outbound.destinationCode,
    label: outbound.destination,
  });
  const returnOrigin = resolveAirportEndpointCode({
    code: returnFlight.originCode,
    label: returnFlight.origin,
  });
  const returnDestination = resolveAirportEndpointCode({
    code: returnFlight.destinationCode,
    label: returnFlight.destination,
  });

  return (
    Boolean(outboundOrigin) &&
    Boolean(outboundDestination) &&
    returnOrigin === outboundDestination &&
    returnDestination === outboundOrigin
  );
}

export function formatAirportLabel(airport: AirportOption) {
  return `${airport.city} (${airport.code})`;
}

export function formatAirportOption(airport: AirportOption) {
  return `${formatAirportLabel(airport)} — ${airport.name}`;
}

export function formatAirportLabelFromCode(code: string) {
  const trimmed = code.trim();

  if (!trimmed) {
    return "";
  }

  const airport = getAirportByCode(trimmed);
  return airport ? formatAirportLabel(airport) : trimmed;
}

export function formatAirportRoute(fromCode: string, toCode: string) {
  const fromLabel = formatAirportLabelFromCode(fromCode) || "Departure";
  const toLabel = formatAirportLabelFromCode(toCode) || "Destination";
  return `${fromLabel} → ${toLabel}`;
}

export function getAirportsByCountry() {
  const groups = new Map<string, AirportOption[]>();

  for (const airport of AIRPORTS) {
    const existing = groups.get(airport.country);

    if (existing) {
      existing.push(airport);
      continue;
    }

    groups.set(airport.country, [airport]);
  }

  return [...groups.entries()];
}
