import { getCurrentUser } from "../../../../../lib/auth";
import { isStaffOrAdmin } from "../../../../../lib/authorization";
import { parsePositiveInt } from "../../../../../lib/admin-bookings";
import {
  ContactMessageError,
  parseContactAdminUpdate,
  toAdminContactMessage,
} from "../../../../../lib/contact";
import { db } from "../../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    if (!isStaffOrAdmin(user.role)) {
      return jsonError("Forbidden.", 403);
    }

    const { id: rawId } = await params;
    const id = parsePositiveInt(rawId);

    if (id == null) {
      return jsonError("Contact message not found.", 404);
    }

    const existing = await db.orm.public.ContactMessage.where({ id }).first();

    if (!existing) {
      return jsonError("Contact message not found.", 404);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ContactMessageError("Invalid JSON body.", 400);
    }

    const input = parseContactAdminUpdate(body);
    await db.orm.public.ContactMessage.where({ id }).update(input);

    const contactMessage = await db.orm.public.ContactMessage.select(
      "id",
      "userId",
      "reference",
      "fullName",
      "email",
      "phone",
      "subject",
      "message",
      "category",
      "status",
      "internalNote",
      "createdAt",
      "updatedAt"
    )
      .where({ id })
      .first();

    if (!contactMessage) {
      return jsonError("Contact message not found.", 404);
    }

    return Response.json({
      success: true,
      message: toAdminContactMessage(contactMessage),
    });
  } catch (error) {
    if (error instanceof ContactMessageError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to update contact message:", error);
    return jsonError("Unable to update contact message.", 500);
  }
}
