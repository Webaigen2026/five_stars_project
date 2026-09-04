import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_BRAND,
  CUSTOMER_BRAND_MARK,
  formatAirlineBrand,
  getCustomerAirlineName,
  normalizeCustomerBrand,
} from "./brand";
import {
  getFareFamilyLabel,
  getFareFamilyPriceCents,
  getPrintFareFamilyLabel,
  listFareFamilyOptions,
} from "./fare-families";

describe("customer brand display (D12.4)", () => {
  it("A. StarJet → Five Stars", () => {
    assert.equal(getCustomerAirlineName("StarJet"), "Five Stars");
  });

  it("B. Five Stars → Five Stars", () => {
    assert.equal(getCustomerAirlineName("Five Stars"), "Five Stars");
  });

  it("C. STARJET / case variants → Five Stars", () => {
    assert.equal(getCustomerAirlineName("STARJET"), "Five Stars");
    assert.equal(getCustomerAirlineName("starjet"), "Five Stars");
    assert.equal(getCustomerAirlineName("Star Jet"), "Five Stars");
  });

  it("D. American Airlines unchanged", () => {
    assert.equal(
      getCustomerAirlineName("American Airlines"),
      "American Airlines"
    );
  });

  it("E. empty/unknown handled safely", () => {
    assert.equal(getCustomerAirlineName(""), CUSTOMER_BRAND);
    assert.equal(getCustomerAirlineName("   "), CUSTOMER_BRAND);
    assert.equal(getCustomerAirlineName(null), CUSTOMER_BRAND);
    assert.equal(getCustomerAirlineName(undefined), CUSTOMER_BRAND);
    assert.equal(formatAirlineBrand("StarJet"), CUSTOMER_BRAND);
    assert.equal(normalizeCustomerBrand("StarJet"), CUSTOMER_BRAND);
    assert.equal(CUSTOMER_BRAND_MARK, "FIVE STARS");
  });
});

describe("fare family customer labels (D12.4)", () => {
  it("BASIC/STANDARD/FLEX display as Five Stars *", () => {
    assert.equal(getFareFamilyLabel("BASIC"), "Five Stars Basic");
    assert.equal(getFareFamilyLabel("STANDARD"), "Five Stars Standard");
    assert.equal(getFareFamilyLabel("FLEX"), "Five Stars Flex");
    assert.equal(getPrintFareFamilyLabel("BASIC"), "Five Stars Basic");
    assert.equal(getPrintFareFamilyLabel("STANDARD"), "Five Stars Standard");
    assert.equal(getPrintFareFamilyLabel("FLEX"), "Five Stars Flex");
  });

  it("pricing unchanged for base 35300", () => {
    assert.equal(getFareFamilyPriceCents(35300, "BASIC"), 35300);
    assert.equal(getFareFamilyPriceCents(35300, "STANDARD"), 38800);
    assert.equal(getFareFamilyPriceCents(35300, "FLEX"), 43800);

    const options = listFareFamilyOptions(35300);
    assert.deepEqual(
      options.map((o) => [o.family, o.label, o.priceCents]),
      [
        ["BASIC", "Five Stars Basic", 35300],
        ["STANDARD", "Five Stars Standard", 38800],
        ["FLEX", "Five Stars Flex", 43800],
      ]
    );
  });
});
