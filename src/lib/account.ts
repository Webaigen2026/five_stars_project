export type SafeAccountUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified: boolean;
  createdAt?: string;
};

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function toSafeAccountUser(user: SafeAccountUser): SafeAccountUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    emailVerified: user.emailVerified,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

export function parseProfileUpdate(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AccountError("Invalid profile payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const firstName = asTrimmedString(payload.firstName);
  const lastName = asTrimmedString(payload.lastName);

  if (!firstName) {
    throw new AccountError("First name is required.", 400);
  }

  if (!lastName) {
    throw new AccountError("Last name is required.", 400);
  }

  if (firstName.length > MAX_NAME_LENGTH) {
    throw new AccountError("First name is too long.", 400);
  }

  if (lastName.length > MAX_NAME_LENGTH) {
    throw new AccountError("Last name is too long.", 400);
  }

  return { firstName, lastName };
}

export function parsePasswordChange(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new AccountError("Invalid password payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword =
    typeof payload.newPassword === "string" ? payload.newPassword : "";
  const confirmPassword =
    typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!currentPassword) {
    throw new AccountError("Current password is required.", 400);
  }

  if (!newPassword) {
    throw new AccountError("New password is required.", 400);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AccountError("Password must be at least 8 characters.", 400);
  }

  if (newPassword !== confirmPassword) {
    throw new AccountError("Passwords do not match.", 400);
  }

  if (newPassword === currentPassword) {
    throw new AccountError(
      "New password must be different from your current password.",
      400
    );
  }

  return { currentPassword, newPassword };
}
