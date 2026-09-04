const SENSITIVE_OBJECT_KEYS = new Set([
  "passportNumber",
  "passportExpiry",
  "dateOfBirth",
  "password",
  "AUTH_SECRET",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TRAVELER_DATA_ENCRYPTION_KEY",
  "sessionId",
  "token",
]);

export function maskPassportNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "••••";
  }

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `•••• ${trimmed.slice(-4)}`;
}

export function redactSensitiveObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveObject);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entry]) => {
      if (SENSITIVE_OBJECT_KEYS.has(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, redactSensitiveObject(entry)];
    }
  );

  return Object.fromEntries(entries);
}

export function logServerError(context: string, error: unknown) {
  console.error(context);

  if (error instanceof Error) {
    console.error(error.name);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error("Non-error exception");
}
