export const PASSPORT_REVEAL_AUTO_HIDE_MS = 30_000;

export type PassportRevealUiPhase =
  | "masked"
  | "confirming"
  | "loading"
  | "revealed"
  | "error";

export type PassportRevealClientResult =
  | { ok: true; passportNumber: string }
  | {
      ok: false;
      error: string;
      /** Keep password confirmation dialog open (e.g. wrong password). */
      keepConfirmOpen: boolean;
    };

export function shouldRenderRevealControl(canReveal: boolean) {
  return canReveal === true;
}

export function parsePassportRevealResponse(
  status: number,
  payload: unknown
): PassportRevealClientResult {
  const payloadError =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : null;

  if (status === 401) {
    if (payloadError === "Password confirmation failed.") {
      return {
        ok: false,
        error: "Password confirmation failed.",
        keepConfirmOpen: true,
      };
    }

    return {
      ok: false,
      error: "Your session has expired. Please sign in again.",
      keepConfirmOpen: false,
    };
  }

  if (status === 423 || status === 429) {
    return {
      ok: false,
      error: "Too many failed attempts. Please try again later.",
      keepConfirmOpen: false,
    };
  }

  if (status === 403) {
    return {
      ok: false,
      error: "You are not authorized to view this passport number.",
      keepConfirmOpen: false,
    };
  }

  if (status === 404) {
    return {
      ok: false,
      error: "Passenger document data is unavailable.",
      keepConfirmOpen: false,
    };
  }

  if (status === 400) {
    return {
      ok: false,
      error: payloadError ?? "Password is required.",
      keepConfirmOpen: true,
    };
  }

  if (status !== 200) {
    return {
      ok: false,
      error: "Unable to reveal passport number.",
      keepConfirmOpen: false,
    };
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { passportNumber?: unknown }).passportNumber !== "string"
  ) {
    return {
      ok: false,
      error: "Unable to reveal passport number.",
      keepConfirmOpen: false,
    };
  }

  const passportNumber = (
    payload as { passportNumber: string }
  ).passportNumber.trim();

  if (!passportNumber) {
    return {
      ok: false,
      error: "Unable to reveal passport number.",
      keepConfirmOpen: false,
    };
  }

  return { ok: true, passportNumber };
}

/** Pure state transitions for the reveal control (testable without React). */
export function applyPassportRevealSuccess(passportNumber: string) {
  return {
    phase: "revealed" as const,
    passportNumber,
    password: "",
    confirmOpen: false,
    error: null as string | null,
  };
}

export function applyPassportRevealHide() {
  return {
    phase: "masked" as const,
    passportNumber: null as string | null,
    password: "",
    confirmOpen: false,
    error: null as string | null,
  };
}

export function applyPassportRevealCancelConfirm() {
  return {
    phase: "masked" as const,
    passportNumber: null as string | null,
    password: "",
    confirmOpen: false,
    error: null as string | null,
  };
}

export function applyPassportRevealError(
  error: string,
  keepConfirmOpen: boolean
) {
  return {
    phase: keepConfirmOpen ? ("confirming" as const) : ("error" as const),
    passportNumber: null as string | null,
    password: "",
    confirmOpen: keepConfirmOpen,
    error,
  };
}
