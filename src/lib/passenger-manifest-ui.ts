export type PassengerManifestPassportMode = "masked" | "full";

export type PassengerManifestClientResult = {
  error: string;
  /** Keep dialog open for recoverable password mistakes. */
  keepConfirmOpen: boolean;
};

export function parsePassengerManifestResponse(
  status: number,
  payload: unknown
): PassengerManifestClientResult {
  const payloadError =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : null;

  if (status === 401) {
    if (payloadError === "Password confirmation failed.") {
      return {
        error: "Password confirmation failed.",
        keepConfirmOpen: true,
      };
    }

    return {
      error: "Your session has expired. Please sign in again.",
      keepConfirmOpen: false,
    };
  }

  if (status === 423 || status === 429) {
    return {
      error: "Too many failed attempts. Please try again later.",
      keepConfirmOpen: false,
    };
  }

  if (status === 403) {
    return {
      error: "You are not authorized to export this passenger manifest.",
      keepConfirmOpen: false,
    };
  }

  if (status === 404) {
    if (payloadError === "Passenger document data is unavailable.") {
      return {
        error: "Passenger document data is unavailable.",
        keepConfirmOpen: false,
      };
    }

    return {
      error: "Flight or passenger manifest was not found.",
      keepConfirmOpen: false,
    };
  }

  if (status === 400) {
    return {
      error: payloadError ?? "Password is required.",
      keepConfirmOpen: true,
    };
  }

  return {
    error: "Unable to export passenger manifest.",
    keepConfirmOpen: false,
  };
}
