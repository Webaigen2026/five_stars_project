import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { maskPassportNumber, redactSensitiveObject } from "./sensitive-data";

describe("sensitive data helpers", () => {
  it("masks passport numbers without exposing the full value", () => {
    assert.equal(maskPassportNumber("AB1234567"), "•••• 4567");
    assert.equal(maskPassportNumber("1234"), "••••");
    assert.equal(maskPassportNumber("abc"), "••••");
    assert.equal(maskPassportNumber("   "), "••••");
  });

  it("redacts known sensitive object keys", () => {
    const redacted = redactSensitiveObject({
      firstName: "Ada",
      passportNumber: "AB1234567",
      dateOfBirth: "1990-01-15",
      nested: { password: "secret" },
    }) as Record<string, unknown>;

    assert.equal(redacted.firstName, "Ada");
    assert.equal(redacted.passportNumber, "[REDACTED]");
    assert.equal(redacted.dateOfBirth, "[REDACTED]");
    assert.equal(
      (redacted.nested as Record<string, unknown>).password,
      "[REDACTED]"
    );
  });
});
