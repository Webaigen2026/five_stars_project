import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionBookingStatus,
  doesBookingStatusHoldInventory,
  doesTransitionAcquireInventory,
  doesTransitionConsumeInventoryHold,
  doesTransitionReleaseInventory,
  getAllowedAdminBookingTransitions,
  getAllowedBookingTransitions,
  isPaymentAuthoritativeStatus,
  isTerminalBookingStatus,
} from "./booking-lifecycle";

describe("booking lifecycle policy", () => {
  it("allows DRAFT -> PENDING_PAYMENT", () => {
    assert.equal(canTransitionBookingStatus("DRAFT", "PENDING_PAYMENT"), true);
  });

  it("rejects DRAFT -> CONFIRMED", () => {
    assert.equal(canTransitionBookingStatus("DRAFT", "CONFIRMED"), false);
  });

  it("treats PENDING_PAYMENT -> PAID as lifecycle-valid", () => {
    assert.equal(canTransitionBookingStatus("PENDING_PAYMENT", "PAID"), true);
  });

  it("does not offer PAID or REFUNDED as admin transitions", () => {
    assert.deepEqual(getAllowedAdminBookingTransitions("PENDING_PAYMENT"), [
      "FAILED",
      "CANCELLED",
    ]);
    assert.deepEqual(getAllowedAdminBookingTransitions("PAID"), ["CONFIRMED"]);
    assert.equal(
      getAllowedAdminBookingTransitions("PENDING_PAYMENT").includes("PAID"),
      false
    );
    assert.equal(
      getAllowedAdminBookingTransitions("PAID").includes("REFUNDED"),
      false
    );
  });

  it("allows CONFIRMED -> TICKETED and TICKETED -> COMPLETED", () => {
    assert.equal(canTransitionBookingStatus("CONFIRMED", "TICKETED"), true);
    assert.equal(canTransitionBookingStatus("TICKETED", "COMPLETED"), true);
  });

  it("rejects COMPLETED -> CANCELLED and CANCELLED -> CONFIRMED", () => {
    assert.equal(canTransitionBookingStatus("COMPLETED", "CANCELLED"), false);
    assert.equal(canTransitionBookingStatus("CANCELLED", "CONFIRMED"), false);
  });

  it("rejects unknown statuses closed", () => {
    assert.equal(canTransitionBookingStatus("UNKNOWN", "DRAFT"), false);
    assert.equal(canTransitionBookingStatus("DRAFT", "UNKNOWN"), false);
    assert.deepEqual(getAllowedBookingTransitions("NOT_A_STATUS"), []);
    assert.equal(doesBookingStatusHoldInventory("MYSTERY"), false);
  });

  it("marks terminal statuses correctly", () => {
    assert.equal(isTerminalBookingStatus("CANCELLED"), true);
    assert.equal(isTerminalBookingStatus("REFUNDED"), true);
    assert.equal(isTerminalBookingStatus("COMPLETED"), true);
    assert.equal(isTerminalBookingStatus("FAILED"), false);
    assert.equal(isTerminalBookingStatus("PAID"), false);
  });

  it("holds inventory from PENDING_PAYMENT through COMPLETED", () => {
    assert.equal(doesBookingStatusHoldInventory("DRAFT"), false);
    assert.equal(doesBookingStatusHoldInventory("PENDING_PAYMENT"), true);
    assert.equal(doesBookingStatusHoldInventory("PAID"), true);
    assert.equal(doesBookingStatusHoldInventory("CONFIRMED"), true);
    assert.equal(doesBookingStatusHoldInventory("TICKETED"), true);
    assert.equal(doesBookingStatusHoldInventory("COMPLETED"), true);
    assert.equal(doesBookingStatusHoldInventory("CANCELLED"), false);
    assert.equal(doesBookingStatusHoldInventory("REFUNDED"), false);
    assert.equal(doesBookingStatusHoldInventory("FAILED"), false);
  });

  it("acquires inventory when entering PENDING_PAYMENT; not again on PAID", () => {
    assert.equal(
      doesTransitionAcquireInventory("DRAFT", "PENDING_PAYMENT"),
      true
    );
    assert.equal(
      doesTransitionAcquireInventory("FAILED", "PENDING_PAYMENT"),
      true
    );
    assert.equal(
      doesTransitionAcquireInventory("PENDING_PAYMENT", "PAID"),
      false
    );
    assert.equal(doesTransitionAcquireInventory("PAID", "CONFIRMED"), false);
    assert.equal(
      doesTransitionAcquireInventory("CONFIRMED", "TICKETED"),
      false
    );
    assert.equal(doesTransitionAcquireInventory("TICKETED", "COMPLETED"), false);
    assert.equal(doesTransitionAcquireInventory("PAID", "PAID"), false);
  });

  it("releases inventory when leaving PENDING_PAYMENT unpaid", () => {
    assert.equal(
      doesTransitionReleaseInventory("PENDING_PAYMENT", "FAILED"),
      true
    );
    assert.equal(
      doesTransitionReleaseInventory("PENDING_PAYMENT", "CANCELLED"),
      true
    );
    assert.equal(doesTransitionReleaseInventory("CONFIRMED", "CANCELLED"), true);
    assert.equal(doesTransitionReleaseInventory("TICKETED", "CANCELLED"), true);
    assert.equal(doesTransitionReleaseInventory("PAID", "REFUNDED"), true);
    assert.equal(doesTransitionReleaseInventory("TICKETED", "COMPLETED"), false);
    assert.equal(doesTransitionReleaseInventory("COMPLETED", "CANCELLED"), false);
  });

  it("consumes a hold on TICKETED -> COMPLETED without treating it as a release", () => {
    assert.equal(
      doesTransitionConsumeInventoryHold("TICKETED", "COMPLETED"),
      true
    );
    assert.equal(doesTransitionReleaseInventory("TICKETED", "COMPLETED"), false);
    assert.equal(
      doesTransitionConsumeInventoryHold("CONFIRMED", "CANCELLED"),
      false
    );
  });

  it("treats PAID and REFUNDED as payment-authoritative", () => {
    assert.equal(isPaymentAuthoritativeStatus("PAID"), true);
    assert.equal(isPaymentAuthoritativeStatus("REFUNDED"), true);
    assert.equal(isPaymentAuthoritativeStatus("CONFIRMED"), false);
  });
});
