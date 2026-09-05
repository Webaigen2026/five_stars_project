/**
 * D14.2 password-reset DB integration checks.
 *
 *   npx tsx --conditions=react-server scripts/test-password-reset.ts
 */

import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { db } from "../src/prisma/db";
import {
  completePasswordReset,
  requestPasswordResetCode,
  verifyPasswordResetCode,
} from "../src/lib/password-reset-service";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  hashPasswordResetCode,
} from "../src/lib/password-reset";

const marker = randomBytes(4).toString("hex");
const email = `pwreset.${marker}@example.com`;
const oldPassword = "OldPassword123!";
const newPassword = "NewPassword456!";

function pass(label: string) {
  console.log(`  PASS  ${label}`);
}

async function cleanup(userId?: number | null) {
  if (!userId) {
    return;
  }

  await db.orm.public.PasswordResetCode.where({ userId }).delete();

  const sessions = await db.orm.public.Session.where({ userId }).all();
  for (const session of sessions) {
    await db.orm.public.Session.where({ id: session.id }).delete();
  }

  const tokens = await db.orm.public.EmailVerificationToken.where({
    userId,
  }).all();
  for (const token of tokens) {
    await db.orm.public.EmailVerificationToken.where({ id: token.id }).delete();
  }

  await db.orm.public.User.where({ id: userId }).delete();
}

async function main() {
  console.log("\nPassword reset (D14.2)");
  let userId: number | null = null;
  let capturedCode: string | null = null;

  try {
    const created = await db.orm.public.User.select("id").create({
      email,
      password: await bcrypt.hash(oldPassword, 12),
      firstName: "Reset",
      lastName: "Tester",
      role: "CUSTOMER",
      emailVerified: false,
      failedLoginAttempts: 4,
      lockedUntil: new Date(Date.now() + 60_000).toISOString(),
    });
    userId = created.id;

    const nonexistent = await requestPasswordResetCode({
      email: `missing.${marker}@example.com`,
      send: async () => {
        throw new Error("should not send for missing email");
      },
    });
    assert.equal(nonexistent.message, PASSWORD_RESET_GENERIC_MESSAGE);
    pass("G. nonexistent email → generic success");

    const first = await requestPasswordResetCode({
      email,
      send: async (payload) => {
        const match = payload.text.match(/\b(\d{6})\b/);
        assert.ok(match);
        capturedCode = match![1];
        assert.equal(payload.to, email);
        assert.match(payload.subject, /Five Stars/);
        return { id: "msg_test_1" };
      },
    });
    assert.equal(first.message, PASSWORD_RESET_GENERIC_MESSAGE);
    assert.ok(capturedCode);
    pass("F/H. existing unverified email → generic success + email");

    const challenges = await db.orm.public.PasswordResetCode.where({
      userId,
    }).all();
    assert.equal(challenges.length, 1);
    assert.equal(challenges[0].codeHash, hashPasswordResetCode(capturedCode!));
    assert.equal(JSON.stringify(challenges[0]).includes(capturedCode!), false);
    pass("E/L. only hash stored; API path never returns raw code");

    const firstCode = capturedCode!;
    capturedCode = null;

    // Cooldown should suppress second send.
    const throttled = await requestPasswordResetCode({
      email,
      send: async () => {
        throw new Error("should not send during cooldown");
      },
    });
    assert.equal(throttled.message, PASSWORD_RESET_GENERIC_MESSAGE);
    const stillOne = await db.orm.public.PasswordResetCode.where({
      userId,
    }).all();
    assert.equal(stillOne.length, 1);
    pass("J. cooldown prevents rapid resend");

    // Force past cooldown by backdating createdAt via delete+recreate path:
    // delete and create with failure path, then successful invalidation test.
    await db.orm.public.PasswordResetCode.where({ userId }).delete();
    const seeded = await db.orm.public.PasswordResetCode.select("id").create({
      userId,
      codeHash: hashPasswordResetCode("111111"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attemptCount: 0,
    });
    await db.orm.public.PasswordResetCode.where({ id: seeded.id }).update({
      createdAt: new Date(Date.now() - 61_000).toISOString(),
    });

    await requestPasswordResetCode({
      email,
      send: async (payload) => {
        const match = payload.text.match(/\b(\d{6})\b/);
        capturedCode = match![1];
        return { id: "msg_test_2" };
      },
    });
    assert.ok(capturedCode);
    const afterResend = await db.orm.public.PasswordResetCode.where({
      userId,
    }).all();
    assert.equal(afterResend.length, 1);
    assert.notEqual(afterResend[0].codeHash, hashPasswordResetCode("111111"));
    assert.equal(afterResend[0].codeHash, hashPasswordResetCode(capturedCode!));
    pass("I. new request invalidates old challenge");

    await assert.rejects(
      () => verifyPasswordResetCode({ email, code: firstCode }),
      /incorrect or has expired/i
    );
    pass("Q. old superseded code rejected");

    // Delivery failure deletes challenge.
    await db.orm.public.PasswordResetCode.where({ userId }).delete();
    const failingSeed = await db.orm.public.PasswordResetCode.select(
      "id"
    ).create({
      userId,
      codeHash: hashPasswordResetCode("222222"),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attemptCount: 0,
    });
    await db.orm.public.PasswordResetCode.where({
      id: failingSeed.id,
    }).update({
      createdAt: new Date(Date.now() - 61_000).toISOString(),
    });

    await requestPasswordResetCode({
      email,
      send: async () => ({
        error: { name: "application_error", message: "provider down" },
      }),
    });
    const afterFail = await db.orm.public.PasswordResetCode.where({
      userId,
    }).all();
    assert.equal(afterFail.length, 0);
    pass("K. Resend failure invalidates newly created challenge");

    // Fresh challenge for verify/reset path.
    capturedCode = null;
    await requestPasswordResetCode({
      email,
      send: async (payload) => {
        capturedCode = payload.text.match(/\b(\d{6})\b/)![1];
        return { id: "msg_test_3" };
      },
    });
    assert.ok(capturedCode);

    for (let i = 0; i < 4; i += 1) {
      await assert.rejects(
        () => verifyPasswordResetCode({ email, code: "000000" }),
        /incorrect or has expired/i
      );
    }
    const afterFour = await db.orm.public.PasswordResetCode.where({
      userId,
    }).first();
    assert.equal(afterFour?.attemptCount, 4);
    pass("N. wrong code increments attemptCount");

    await assert.rejects(
      () => verifyPasswordResetCode({ email, code: "000000" }),
      /incorrect or has expired/i
    );
    const afterFifth = await db.orm.public.PasswordResetCode.where({
      userId,
    }).all();
    assert.equal(afterFifth.length, 0);
    pass("O. fifth wrong attempt invalidates challenge");

    capturedCode = null;
    await requestPasswordResetCode({
      email,
      send: async (payload) => {
        capturedCode = payload.text.match(/\b(\d{6})\b/)![1];
        return { id: "msg_test_4" };
      },
    });

    // Expire challenge.
    const live = await db.orm.public.PasswordResetCode.where({
      userId,
    }).first();
    assert.ok(live);
    await db.orm.public.PasswordResetCode.where({ id: live!.id }).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 61_000).toISOString(),
    });
    await assert.rejects(
      () => verifyPasswordResetCode({ email, code: capturedCode! }),
      /incorrect or has expired/i
    );
    pass("P. expired code rejected");

    capturedCode = null;
    await requestPasswordResetCode({
      email,
      send: async (payload) => {
        capturedCode = payload.text.match(/\b(\d{6})\b/)![1];
        return { id: "msg_test_5" };
      },
    });

    await assert.rejects(
      () =>
        completePasswordReset({
          authorizationToken: null,
          body: {
            newPassword,
            confirmPassword: newPassword,
          },
        }),
      /expired|sign in|request a new code/i
    );
    pass("S. reset without verified authorization rejected");

    const verified = await verifyPasswordResetCode({
      email,
      code: capturedCode!,
    });
    assert.ok(verified.authorizationToken);
    pass("M. correct code → verified reset authorization");

    await assert.rejects(
      () => verifyPasswordResetCode({ email, code: capturedCode! }),
      /incorrect or has expired/i
    );
    pass("R. successful code cannot be reused");

    const sessionA = await db.orm.public.Session.create({
      id: `sess_a_${marker}`,
      userId,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const sessionB = await db.orm.public.Session.create({
      id: `sess_b_${marker}`,
      userId,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const beforeUser = await db.orm.public.User.where({ id: userId }).first();
    assert.equal(beforeUser?.emailVerified, false);

    const reset = await completePasswordReset({
      authorizationToken: verified.authorizationToken,
      body: {
        newPassword,
        confirmPassword: newPassword,
      },
    });
    assert.equal(reset.success, true);
    pass("U. valid authorization + valid password → success");

    await assert.rejects(
      () =>
        completePasswordReset({
          authorizationToken: verified.authorizationToken,
          body: {
            newPassword,
            confirmPassword: newPassword,
          },
        }),
      /expired|request a new code/i
    );
    pass("V. reset authorization single-use");

    const afterUser = await db.orm.public.User.where({ id: userId }).first();
    assert.ok(afterUser);
    assert.notEqual(afterUser!.password, newPassword);
    assert.equal(await bcrypt.compare(oldPassword, afterUser!.password), false);
    assert.equal(await bcrypt.compare(newPassword, afterUser!.password), true);
    pass("W/X/Y. bcrypt hash; old rejected; new accepted");

    assert.equal(afterUser!.emailVerified, false);
    pass("AA. emailVerified unchanged");

    assert.equal(afterUser!.failedLoginAttempts, 0);
    assert.equal(afterUser!.lockedUntil, null);
    pass("AB/AC. failedLoginAttempts and lockedUntil reset");

    const sessions = await db.orm.public.Session.where({ userId }).all();
    const sessionMap = new Map(sessions.map((row) => [row.id, row]));
    assert.ok(sessionMap.get(sessionA.id)?.revokedAt);
    assert.ok(sessionMap.get(sessionB.id)?.revokedAt);
    pass("Z. all existing sessions revoked");

    console.log("\npassword reset DB checks passed\n");
  } finally {
    await cleanup(userId);
    await db.close();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await db.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
