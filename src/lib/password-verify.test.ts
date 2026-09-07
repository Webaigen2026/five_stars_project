import assert from "node:assert/strict";
import { describe, it } from "node:test";

import bcrypt from "bcryptjs";

import { verifyUserPassword } from "./password-verify";

describe("verifyUserPassword", () => {
  it("accepts a matching password against a bcrypt hash", async () => {
    const hash = await bcrypt.hash("test-password-123", 4);
    assert.equal(await verifyUserPassword("test-password-123", hash), true);
  });

  it("rejects a non-matching password", async () => {
    const hash = await bcrypt.hash("test-password-123", 4);
    assert.equal(await verifyUserPassword("wrong-password", hash), false);
  });
});
