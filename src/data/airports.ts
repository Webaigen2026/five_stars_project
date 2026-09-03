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
