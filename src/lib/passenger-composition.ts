export const MAX_TRAVELERS = 9;

export type PassengerComposition = {
  adults: number;
  seniors: number;
  children: number;
  infantsInSeat: number;
};

export const DEFAULT_PASSENGER_COMPOSITION: PassengerComposition = {
  adults: 1,
  seniors: 0,
  children: 0,
  infantsInSeat: 0,
};

export type PassengerCategoryKey = keyof PassengerComposition;

export type PassengerCompositionParamInput = {
  passengers?: string | number | null;
  adults?: string | number | null;
  seniors?: string | number | null;
  children?: string | number | null;
  infants?: string | number | null;
};

export type TravelerCategorySlot = {
  key: PassengerCategoryKey;
  label: string;
  description: string;
};

export const PASSENGER_CATEGORIES: Array<{
  key: PassengerCategoryKey;
  label: string;
  description: string;
  addLabel: string;
  removeLabel: string;
  /** URL query key for this category (`infants` maps to infantsInSeat). */
  paramKey: "adults" | "seniors" | "children" | "infants";
}> = [
  {
    key: "adults",
    label: "Adult",
    description: "Age 16+",
    addLabel: "Add adult",
    removeLabel: "Remove adult",
    paramKey: "adults",
  },
  {
    key: "seniors",
    label: "Senior",
    description: "Age 65+",
    addLabel: "Add senior",
    removeLabel: "Remove senior",
    paramKey: "seniors",
  },
  {
    key: "children",
    label: "Child",
    description: "Age 2–15",
    addLabel: "Add child",
    removeLabel: "Remove child",
    paramKey: "children",
  },
  {
    key: "infantsInSeat",
    label: "Infant in seat",
    description: "Under 2",
    addLabel: "Add infant in seat",
    removeLabel: "Remove infant in seat",
    paramKey: "infants",
  },
];

function parseOptionalInt(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * Authoritative passenger total from the `passengers` query param.
 * Clamps to 1..MAX_TRAVELERS; invalid values become 1.
 */
export function parseAuthoritativePassengerTotal(
  value: string | number | null | undefined
): number {
  const parsed = parseOptionalInt(value);

  if (parsed == null || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, MAX_TRAVELERS);
}

export function totalPassengers(composition: PassengerComposition) {
  return (
    composition.adults +
    composition.seniors +
    composition.children +
    composition.infantsInSeat
  );
}

/** Alias preferred by D11.6 helpers. */
export function getPassengerTotal(composition: PassengerComposition) {
  return totalPassengers(composition);
}

export function formatPassengerCountLabel(total: number) {
  return total === 1 ? "1 Passenger" : `${total} Passengers`;
}

/**
 * Build composition from a legacy total passengers query value.
 * Puts the total into adults (minimum 1, maximum MAX_TRAVELERS).
 */
export function compositionFromPassengerCount(
  value: string | number | null | undefined
): PassengerComposition {
  const total = parseAuthoritativePassengerTotal(value);

  return {
    adults: total,
    seniors: 0,
    children: 0,
    infantsInSeat: 0,
  };
}

/**
 * Normalize category params against the authoritative `passengers` total.
 * Tampered or inconsistent category params fall back to all-adults.
 */
export function normalizePassengerComposition(
  input: PassengerCompositionParamInput
): PassengerComposition {
  const passengers = parseAuthoritativePassengerTotal(input.passengers);
  const fallback = compositionFromPassengerCount(passengers);

  const adults = parseOptionalInt(input.adults);
  const seniors = parseOptionalInt(input.seniors);
  const children = parseOptionalInt(input.children);
  const infants = parseOptionalInt(input.infants);

  if (
    adults == null ||
    seniors == null ||
    children == null ||
    infants == null
  ) {
    return fallback;
  }

  if (adults < 1 || seniors < 0 || children < 0 || infants < 0) {
    return fallback;
  }

  const composition: PassengerComposition = {
    adults,
    seniors,
    children,
    infantsInSeat: infants,
  };

  const categoryTotal = totalPassengers(composition);

  if (categoryTotal > MAX_TRAVELERS || categoryTotal !== passengers) {
    return fallback;
  }

  return composition;
}

/** Parse + normalize composition from URL/search params. */
export function parsePassengerComposition(
  input: PassengerCompositionParamInput
): PassengerComposition {
  return normalizePassengerComposition(input);
}

export function serializePassengerComposition(
  composition: PassengerComposition
): {
  passengers: string;
  adults: string;
  seniors: string;
  children: string;
  infants: string;
} {
  const normalized = normalizePassengerComposition({
    passengers: totalPassengers(composition),
    adults: composition.adults,
    seniors: composition.seniors,
    children: composition.children,
    infants: composition.infantsInSeat,
  });

  return {
    passengers: String(totalPassengers(normalized)),
    adults: String(normalized.adults),
    seniors: String(normalized.seniors),
    children: String(normalized.children),
    infants: String(normalized.infantsInSeat),
  };
}

/** Append composition query params onto an existing URLSearchParams. */
export function appendPassengerCompositionParams(
  params: URLSearchParams,
  composition: PassengerComposition
) {
  const serialized = serializePassengerComposition(composition);
  params.set("passengers", serialized.passengers);
  params.set("adults", serialized.adults);
  params.set("seniors", serialized.seniors);
  params.set("children", serialized.children);
  params.set("infants", serialized.infants);
}

/**
 * Expand composition into ordered traveler slots:
 * Adults → Seniors → Children → Infants in seat.
 */
export function expandPassengerComposition(
  composition: PassengerComposition
): TravelerCategorySlot[] {
  const normalized = normalizePassengerComposition({
    passengers: totalPassengers(composition),
    adults: composition.adults,
    seniors: composition.seniors,
    children: composition.children,
    infants: composition.infantsInSeat,
  });

  const slots: TravelerCategorySlot[] = [];

  for (const category of PASSENGER_CATEGORIES) {
    const count = normalized[category.key];

    for (let index = 0; index < count; index += 1) {
      slots.push({
        key: category.key,
        label: category.label,
        description: category.description,
      });
    }
  }

  return slots;
}

function pluralizeCategory(label: string, count: number) {
  if (count === 1) {
    return `${count} ${label}`;
  }

  if (label === "Child") {
    return `${count} Children`;
  }

  if (label === "Infant in seat") {
    return `${count} Infants in seat`;
  }

  return `${count} ${label}s`;
}

/**
 * Compact summary for results headers:
 * "1 Adult · 3 Seniors · 3 Children · 2 Infants in seat"
 */
export function formatCompositionSummary(
  composition: PassengerComposition
): string {
  const parts: string[] = [];

  for (const category of PASSENGER_CATEGORIES) {
    const count = composition[category.key];

    if (count > 0) {
      parts.push(pluralizeCategory(category.label, count));
    }
  }

  return parts.join(" · ");
}

export type PassengerDetailsModel = {
  composition: PassengerComposition;
  slots: TravelerCategorySlot[];
  /** Authoritative traveler count for Passenger Details (1..MAX_TRAVELERS). */
  passengerCount: number;
  summary: string;
};

/**
 * Single source of truth for Passenger Details count + category slots.
 * Always keys off the authoritative `passengers` total via normalization.
 */
export function resolvePassengerDetailsModel(
  input: PassengerCompositionParamInput
): PassengerDetailsModel {
  const composition = normalizePassengerComposition(input);
  const slots = expandPassengerComposition(composition);
  const passengerCount = getPassengerTotal(composition);

  return {
    composition,
    slots,
    passengerCount,
    summary: formatCompositionSummary(composition),
  };
}

export function canIncrement(
  composition: PassengerComposition,
  _key: PassengerCategoryKey
) {
  return totalPassengers(composition) < MAX_TRAVELERS;
}

export function canDecrement(
  composition: PassengerComposition,
  key: PassengerCategoryKey
) {
  if (key === "adults") {
    return composition.adults > 1;
  }

  return composition[key] > 0;
}

export function adjustPassengerComposition(
  composition: PassengerComposition,
  key: PassengerCategoryKey,
  delta: 1 | -1
): PassengerComposition {
  if (delta === 1 && !canIncrement(composition, key)) {
    return composition;
  }

  if (delta === -1 && !canDecrement(composition, key)) {
    return composition;
  }

  return {
    ...composition,
    [key]: composition[key] + delta,
  };
}

export const PASSENGER_TYPES = [
  "ADULT",
  "SENIOR",
  "CHILD",
  "INFANT_IN_SEAT",
] as const;

export type PassengerType = (typeof PASSENGER_TYPES)[number];

export const DEFAULT_PASSENGER_TYPE: PassengerType = "ADULT";

const CATEGORY_KEY_TO_PASSENGER_TYPE: Record<
  PassengerCategoryKey,
  PassengerType
> = {
  adults: "ADULT",
  seniors: "SENIOR",
  children: "CHILD",
  infantsInSeat: "INFANT_IN_SEAT",
};

const PASSENGER_TYPE_LABELS: Record<PassengerType, string> = {
  ADULT: "Adult",
  SENIOR: "Senior",
  CHILD: "Child",
  INFANT_IN_SEAT: "Infant in seat",
};

export function isPassengerType(value: unknown): value is PassengerType {
  return (
    typeof value === "string" &&
    (PASSENGER_TYPES as readonly string[]).includes(value)
  );
}

/** Parse a stored/client passenger type. Unknown values become ADULT. */
export function parsePassengerType(value: unknown): PassengerType {
  return isPassengerType(value) ? value : DEFAULT_PASSENGER_TYPE;
}

export function passengerTypeFromCategoryKey(
  key: PassengerCategoryKey
): PassengerType {
  return CATEGORY_KEY_TO_PASSENGER_TYPE[key];
}

export function formatPassengerTypeLabel(value: unknown) {
  return PASSENGER_TYPE_LABELS[parsePassengerType(value)];
}

/**
 * Derive authoritative passengerType values for a booking create.
 * Uses normalized composition against the passenger array length.
 * Client-supplied per-passenger types are ignored.
 */
export function resolvePassengerTypesForBooking(input: {
  passengerCount: number;
  adults?: string | number | null;
  seniors?: string | number | null;
  children?: string | number | null;
  infants?: string | number | null;
}): PassengerType[] {
  const passengerCount = Math.min(
    Math.max(
      Number.isInteger(input.passengerCount) ? input.passengerCount : 1,
      1
    ),
    MAX_TRAVELERS
  );

  const composition = normalizePassengerComposition({
    passengers: passengerCount,
    adults: input.adults,
    seniors: input.seniors,
    children: input.children,
    infants: input.infants,
  });

  return expandPassengerComposition(composition).map((slot) =>
    passengerTypeFromCategoryKey(slot.key)
  );
}

