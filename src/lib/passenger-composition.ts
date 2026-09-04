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

export const PASSENGER_CATEGORIES: Array<{
  key: PassengerCategoryKey;
  label: string;
  description: string;
  addLabel: string;
  removeLabel: string;
}> = [
  {
    key: "adults",
    label: "Adult",
    description: "Age 16+",
    addLabel: "Add adult",
    removeLabel: "Remove adult",
  },
  {
    key: "seniors",
    label: "Senior",
    description: "Age 65+",
    addLabel: "Add senior",
    removeLabel: "Remove senior",
  },
  {
    key: "children",
    label: "Child",
    description: "Age 2–15",
    addLabel: "Add child",
    removeLabel: "Remove child",
  },
  {
    key: "infantsInSeat",
    label: "Infant in seat",
    description: "Under 2",
    addLabel: "Add infant in seat",
    removeLabel: "Remove infant in seat",
  },
];

export function totalPassengers(composition: PassengerComposition) {
  return (
    composition.adults +
    composition.seniors +
    composition.children +
    composition.infantsInSeat
  );
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
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const total =
    Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, MAX_TRAVELERS)
      : 1;

  return {
    adults: total,
    seniors: 0,
    children: 0,
    infantsInSeat: 0,
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
