export const CONTACT_STATUSES = [
  "NEW",
  "READ",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export const CONTACT_CATEGORIES = [
  "GENERAL",
  "FLIGHT",
  "BOOKING",
  "CARGO",
  "CHARTER",
  "BILLING",
  "OTHER",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export type ContactCreateInput = {
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: ContactCategory | null;
};

export type ContactAdminUpdate = {
  status?: ContactStatus;
  internalNote?: string | null;
};

export type SafeContactMessage = {
  id: number;
  userId: number | null;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminContactMessage = SafeContactMessage & {
  internalNote: string | null;
};

export class ContactMessageError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FULL_NAME_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_PHONE_LENGTH = 50;
const MAX_INTERNAL_NOTE_LENGTH = 5000;

export function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

export function isContactCategory(value: string): value is ContactCategory {
  return (CONTACT_CATEGORIES as readonly string[]).includes(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

export function toSafeContactMessage(
  message: SafeContactMessage
): SafeContactMessage {
  return {
    id: message.id,
    userId: message.userId,
    reference: message.reference,
    fullName: message.fullName,
    email: message.email,
    phone: message.phone,
    subject: message.subject,
    message: message.message,
    category: message.category,
    status: message.status,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export function toAdminContactMessage(
  message: AdminContactMessage
): AdminContactMessage {
  return {
    ...toSafeContactMessage(message),
    internalNote: message.internalNote,
  };
}

export function parseContactCreateInput(body: unknown): ContactCreateInput {
  if (!body || typeof body !== "object") {
    throw new ContactMessageError("Invalid contact message payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const fullName = asTrimmedString(payload.fullName);
  const email = asTrimmedString(payload.email).toLowerCase();
  const phone = asOptionalString(payload.phone);
  const subject = asTrimmedString(payload.subject);
  const message = asTrimmedString(payload.message);
  const categoryValue = asTrimmedString(payload.category).toUpperCase();

  if (!fullName) {
    throw new ContactMessageError("Full name is required.", 400);
  }

  if (fullName.length > MAX_FULL_NAME_LENGTH) {
    throw new ContactMessageError("Full name is too long.", 400);
  }

  if (!email) {
    throw new ContactMessageError("Email is required.", 400);
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new ContactMessageError("Enter a valid email address.", 400);
  }

  if (phone && phone.length > MAX_PHONE_LENGTH) {
    throw new ContactMessageError("Phone number is too long.", 400);
  }

  if (!subject) {
    throw new ContactMessageError("Subject is required.", 400);
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new ContactMessageError("Subject is too long.", 400);
  }

  if (!message) {
    throw new ContactMessageError("Message is required.", 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ContactMessageError("Message is too long.", 400);
  }

  let category: ContactCategory | null = null;

  if (categoryValue) {
    if (!isContactCategory(categoryValue)) {
      throw new ContactMessageError("Category is invalid.", 400);
    }

    category = categoryValue;
  }

  return {
    fullName,
    email,
    phone,
    subject,
    message,
    category,
  };
}

export function parseContactAdminUpdate(body: unknown): ContactAdminUpdate {
  if (!body || typeof body !== "object") {
    throw new ContactMessageError("Invalid contact message payload.", 400);
  }

  const payload = body as Record<string, unknown>;
  const update: ContactAdminUpdate = {};

  if ("status" in payload) {
    const status =
      typeof payload.status === "string"
        ? payload.status.trim().toUpperCase()
        : "";

    if (!status) {
      throw new ContactMessageError("Status is required.", 400);
    }

    if (!isContactStatus(status)) {
      throw new ContactMessageError("Status is invalid.", 400);
    }

    update.status = status;
  }

  if ("internalNote" in payload) {
    if (payload.internalNote != null && typeof payload.internalNote !== "string") {
      throw new ContactMessageError("Internal note must be a string.", 400);
    }

    const note = asOptionalString(payload.internalNote);

    if (note && note.length > MAX_INTERNAL_NOTE_LENGTH) {
      throw new ContactMessageError("Internal note is too long.", 400);
    }

    update.internalNote = note;
  }

  if (update.status == null && !("internalNote" in update)) {
    throw new ContactMessageError(
      "Provide a status or internal note to update.",
      400
    );
  }

  return update;
}
