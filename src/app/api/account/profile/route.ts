import { getCurrentUser } from "../../../../lib/auth";
import {
  AccountError,
  parseProfileUpdate,
  toSafeAccountUser,
} from "../../../../lib/account";
import { db } from "../../../../prisma/db";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Not authenticated.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AccountError("Invalid JSON body.", 400);
    }

    const input = parseProfileUpdate(body);

    await db.orm.public.User.where({ id: currentUser.id }).update(input);

    const user = await db.orm.public.User.select(
      "id",
      "email",
      "firstName",
      "lastName",
      "role",
      "emailVerified",
      "createdAt"
    )
      .where({ id: currentUser.id })
      .first();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    return Response.json({
      success: true,
      user: toSafeAccountUser(user),
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to update profile:", error);
    return jsonError("Unable to update profile.", 500);
  }
}
