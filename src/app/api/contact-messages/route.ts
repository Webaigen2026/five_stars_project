import { getCurrentUser } from "../../../lib/auth";
import {
  ContactMessageError,
  parseContactCreateInput,
} from "../../../lib/contact";
import { createUniqueContactReference } from "../../../lib/request-reference";
import { db } from "../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ContactMessageError("Invalid JSON body.", 400);
    }

    const input = parseContactCreateInput(body);
    const currentUser = await getCurrentUser();
    const reference = await createUniqueContactReference();

    const contactMessage = await db.orm.public.ContactMessage.select(
      "reference",
      "status"
    ).create({
      ...input,
      reference,
      status: "NEW",
      internalNote: null,
      ...(currentUser ? { userId: currentUser.id } : {}),
    });

    return Response.json(
      {
        success: true,
        message: {
          reference: contactMessage.reference,
          status: contactMessage.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ContactMessageError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to create contact message:", error);
    return jsonError("Unable to send message.", 500);
  }
}
