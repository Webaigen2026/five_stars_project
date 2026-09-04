import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isTrustedMutationOrigin,
  rejectUntrustedMutation,
} from "./request-security";

describe("same-origin mutation protection", () => {
  it("allows same-origin browser requests", () => {
    const request = new Request("http://localhost:3000/api/travelers", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    assert.equal(isTrustedMutationOrigin(request), true);
    assert.equal(rejectUntrustedMutation(request), null);
  });

  it("rejects a clearly foreign Origin", async () => {
    const request = new Request("http://localhost:3000/api/travelers", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });

    assert.equal(isTrustedMutationOrigin(request), false);
    const rejected = rejectUntrustedMutation(request);
    assert.ok(rejected);
    assert.equal(rejected.status, 403);
  });

  it("allows requests with no Origin so scripts and tests keep working", () => {
    const request = new Request("http://localhost:3000/api/travelers", {
      method: "POST",
    });

    assert.equal(isTrustedMutationOrigin(request), true);
  });
});
