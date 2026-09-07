import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PASSPORT_REVEAL_AUTO_HIDE_MS,
  applyPassportRevealCancelConfirm,
  applyPassportRevealError,
  applyPassportRevealHide,
  applyPassportRevealSuccess,
  parsePassportRevealResponse,
  shouldRenderRevealControl,
} from "./passport-reveal-ui";

describe("shouldRenderRevealControl", () => {
  it("does not render Reveal when unauthorized", () => {
    assert.equal(shouldRenderRevealControl(false), false);
  });

  it("renders Reveal when authorized", () => {
    assert.equal(shouldRenderRevealControl(true), true);
  });
});

describe("parsePassportRevealResponse", () => {
  it("returns plaintext on successful response", () => {
    const parsed = parsePassportRevealResponse(200, {
      passportNumber: "PA1234567",
    });
    assert.deepEqual(parsed, {
      ok: true,
      passportNumber: "PA1234567",
    });
  });

  it("maps wrong password and keeps confirm open", () => {
    const parsed = parsePassportRevealResponse(401, {
      error: "Password confirmation failed.",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, "Password confirmation failed.");
      assert.equal(parsed.keepConfirmOpen, true);
    }
  });

  it("maps session expiry without revealing", () => {
    const parsed = parsePassportRevealResponse(401, {
      error: "Not authenticated.",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(
        parsed.error,
        "Your session has expired. Please sign in again."
      );
      assert.equal(parsed.keepConfirmOpen, false);
    }
  });

  it("maps lockout 423 safely and closes confirm", () => {
    const parsed = parsePassportRevealResponse(423, {
      error: "Too many failed attempts. Please try again later.",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(
        parsed.error,
        "Too many failed attempts. Please try again later."
      );
      assert.equal(parsed.keepConfirmOpen, false);
    }
  });

  it("maps 403 without exposing passport", () => {
    const parsed = parsePassportRevealResponse(403, {
      error: "Forbidden.",
      passportNumber: "SHOULD-NOT-USE",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(
        parsed.error,
        "You are not authorized to view this passport number."
      );
      assert.equal(parsed.keepConfirmOpen, false);
    }
  });

  it("maps 500 / failure without plaintext", () => {
    const parsed = parsePassportRevealResponse(500, {
      error: "Unable to complete request.",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, "Unable to reveal passport number.");
    }
  });
});

describe("reveal UI state transitions", () => {
  it("success moves masked to plaintext and clears password", () => {
    const next = applyPassportRevealSuccess("PA1234567");
    assert.equal(next.phase, "revealed");
    assert.equal(next.passportNumber, "PA1234567");
    assert.equal(next.password, "");
    assert.equal(next.confirmOpen, false);
  });

  it("Hide clears plaintext", () => {
    const next = applyPassportRevealHide();
    assert.equal(next.phase, "masked");
    assert.equal(next.passportNumber, null);
    assert.equal(next.password, "");
  });

  it("Cancel closes confirm and clears password", () => {
    const next = applyPassportRevealCancelConfirm();
    assert.equal(next.confirmOpen, false);
    assert.equal(next.password, "");
    assert.equal(next.passportNumber, null);
  });

  it("failed confirm never reveals", () => {
    const next = applyPassportRevealError(
      "Password confirmation failed.",
      true
    );
    assert.equal(next.passportNumber, null);
    assert.equal(next.password, "");
    assert.equal(next.confirmOpen, true);
  });

  it("auto-hide duration is 30 seconds", () => {
    assert.equal(PASSPORT_REVEAL_AUTO_HIDE_MS, 30_000);
  });
});

describe("persistence safety (static guarantees)", () => {
  it("UI helpers and control never reference browser storage APIs", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");

    const uiSource = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "passport-reveal-ui.ts"
      ),
      "utf8"
    );
    const componentSource = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../components/admin/PassportRevealControl.tsx"
      ),
      "utf8"
    );

    for (const source of [uiSource, componentSource]) {
      assert.equal(source.includes("localStorage"), false);
      assert.equal(source.includes("sessionStorage"), false);
      assert.equal(source.includes("document.cookie"), false);
    }

    assert.equal(componentSource.includes('method: "POST"'), true);
    assert.equal(componentSource.includes('method: "GET"'), false);
    assert.equal(componentSource.includes('type="password"'), true);
    assert.equal(componentSource.includes("clearPassword"), true);
  });
});
