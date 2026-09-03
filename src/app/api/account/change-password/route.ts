import bcrypt from "bcryptjs";

import {
  AccountError,
  parsePasswordChange,
} from "../../../../lib/account";
import { getCurrentSession } from "../../../../lib/auth";
import { db } from "../../../../prisma/db";

const BCRYPT_ROUNDS = 12;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const currentSession = await getCurrentSession();

    if (!currentSession) {
      return jsonError("Not authenticated.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new AccountError("Invalid JSON body.", 400);
    }

    const input = parsePasswordChange(body);
    const user = await db.orm.public.User.select("id", "password")
      .where({ id: currentSession.user.id })
      .first();

    if (!user) {
      return jsonError("Not authenticated.", 401);
    }

    const currentMatches = await bcrypt.compare(
      input.currentPassword,
      user.password
    );

    if (!currentMatches) {
      throw new AccountError("Current password is incorrect.", 400);
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    const revokedAt = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx.orm.public.User.where({ id: user.id }).update({
        password: hashedPassword,
      });

      const sessions = await tx.orm.public.Session.where({
        userId: user.id,
      }).all();

      for (const session of sessions) {
        if (session.id === currentSession.sessionId || session.revokedAt) {
          continue;
        }

        await tx.orm.public.Session.where({ id: session.id }).update({
          revokedAt,
        });
      }
    });

    return Response.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to change password:", error);
    return jsonError("Unable to change password.", 500);
  }
}
