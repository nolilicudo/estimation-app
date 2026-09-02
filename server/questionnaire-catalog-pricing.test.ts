/**
 * Tests for the catalog-based pricing engine (Layer 0)
 *
 * Verifies that dp_pricing_rules + dp_catalog_items produce correct
 * line-item totals, trade section grouping, ±10% range, and fallback
 * to the legacy base-price-rule system when no catalog rules are active.
 */
import { describe, it, expect } from "vitest";
import { computeRoughPricing, type PricingEngineInput, type CatalogItemInput, type DpPricingRuleInput } from "./questionnaire-pricing-engine";

// ─── shared fixtures ──────────────────────────────────────────────────────────

const emptyLegacyInputs: Pick<PricingEngineInput, "priceRules" | "options" | "questions" | "tierMultipliers" | "pricingAddons"> = {
  priceRules: [],
  options: [],
  questions: [],
  tierMultipliers: [],
  pricingAddons: [],
};

function makeCatalogItem(overrides: Partial<CatalogItemInput> & { id: number; name: string }): CatalogItemInput {
  return {
    tradeSheet: "General",
    unit: "each",
    estimatedPrice: "1000",
    minimumPrice: null,
    defaultQtyFormula: null,
    ...overrides,
  };
}

function makeDpRule(overrides: Partial<DpPricingRuleInput> & { id: number; catalogItemId: number }): DpPricingRuleInput {
  return {
    name: "Test Rule",
    conditions: [],
    quantity: "1",
    tradeSection: "General",
    sortOrder: 1,
    isActive: 1,
    ...overrides,
  };
}

// ─── describe blocks ──────────────────────────────────────────────────────────

describe("Layer 0: catalog-based pricing", () => {
  it("sums catalog item price × quantity for unconditional rule", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Framing Labor", estimatedPrice: "5000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1" })],
      ...emptyLegacyInputs,
    });
    expect(result.usedCatalogPricing).toBe(true);
    expect(result.midpoint).toBe(5000);
    expect(result.low).toBe(4500);
    expect(result.high).toBe(5500);
  });

  it("multiplies price by sqft quantity formula", () => {
    const result = computeRoughPricing({
      answers: [],
      sqft: 400,
      catalogItems: [makeCatalogItem({ id: 1, name: "Framing per sqft", estimatedPrice: "25" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "sqft" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(10000); // 25 * 400 = 10000
  });

  it("evaluates arithmetic quantity formula", () => {
    const result = computeRoughPricing({
      answers: [],
      sqft: 500,
      catalogItems: [makeCatalogItem({ id: 1, name: "Insulation", estimatedPrice: "3" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "sqft * 1.1" })],
      ...emptyLegacyInputs,
    });
    // 3 * (500 * 1.1) = 3 * 550 = 1650
    expect(result.midpoint).toBe(1700); // rounded to nearest $100
  });

  it("sums multiple rules across different trade sections", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [
        makeCatalogItem({ id: 1, name: "Framing", estimatedPrice: "10000", tradeSheet: "Framing" }),
        makeCatalogItem({ id: 2, name: "Electrical", estimatedPrice: "8000", tradeSheet: "Electrical" }),
      ],
      dpPricingRules: [
        makeDpRule({ id: 1, catalogItemId: 1, quantity: "1", tradeSection: "Framing" }),
        makeDpRule({ id: 2, catalogItemId: 2, quantity: "1", tradeSection: "Electrical" }),
      ],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(18000);
    expect(result.tradeSectionBreakdown).toBeDefined();
    expect(result.tradeSectionBreakdown!["Framing"].subtotal).toBe(10000);
    expect(result.tradeSectionBreakdown!["Electrical"].subtotal).toBe(8000);
  });

  it("skips rules whose conditions do not match", () => {
    const result = computeRoughPricing({
      answers: [{ questionId: 1, selectedOptionIds: [99] }], // option 99, not 1
      catalogItems: [makeCatalogItem({ id: 1, name: "Addition Framing", estimatedPrice: "15000" })],
      dpPricingRules: [
        makeDpRule({
          id: 1,
          catalogItemId: 1,
          quantity: "1",
          conditions: [{ questionId: 1, optionIds: [1] }], // requires option 1
        }),
      ],
      ...emptyLegacyInputs,
    });
    // No rules triggered, no legacy rules either → midpoint 0
    expect(result.midpoint).toBe(0);
    expect(result.usedCatalogPricing).toBe(false);
  });

  it("applies rule when condition option matches", () => {
    const result = computeRoughPricing({
      answers: [{ questionId: 1, selectedOptionIds: [1] }],
      catalogItems: [makeCatalogItem({ id: 1, name: "Addition Framing", estimatedPrice: "15000" })],
      dpPricingRules: [
        makeDpRule({
          id: 1,
          catalogItemId: 1,
          quantity: "1",
          conditions: [{ questionId: 1, optionIds: [1] }],
        }),
      ],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(15000);
    expect(result.usedCatalogPricing).toBe(true);
  });

  it("skips inactive rules", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Inactive Item", estimatedPrice: "50000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1", isActive: 0 })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(0);
    expect(result.usedCatalogPricing).toBe(false);
  });

  it("skips catalog items with null or zero estimatedPrice", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "No Price", estimatedPrice: null })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(0);
    expect(result.usedCatalogPricing).toBe(false);
  });

  it("uses bedrooms variable in quantity formula", () => {
    const result = computeRoughPricing({
      answers: [],
      bedrooms: 3,
      catalogItems: [makeCatalogItem({ id: 1, name: "Bedroom Closet", estimatedPrice: "2000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "bedrooms" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(6000); // 2000 * 3
  });

  it("uses bathrooms variable in quantity formula", () => {
    const result = computeRoughPricing({
      answers: [],
      bathrooms: 2,
      catalogItems: [makeCatalogItem({ id: 1, name: "Bathroom Tile", estimatedPrice: "3500" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "bathrooms" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(7000); // 3500 * 2
  });

  it("breakdown includes catalog_item type entries", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Roofing", estimatedPrice: "12000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1", tradeSection: "Roofing" })],
      ...emptyLegacyInputs,
    });
    const catalogItems = result.breakdown.filter(b => b.type === "catalog_item");
    expect(catalogItems.length).toBe(1);
    expect(catalogItems[0].amount).toBe(12000);
    expect(catalogItems[0].tradeSection).toBe("Roofing");
  });

  it("applies ±10% range correctly", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Foundation", estimatedPrice: "20000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1" })],
      ...emptyLegacyInputs,
    });
    expect(result.low).toBe(18000);
    expect(result.high).toBe(22000);
    expect(result.midpoint).toBe(20000);
  });
});

describe("Layer 0 + Layer 3: catalog + add-ons", () => {
  it("adds flat add-on on top of catalog total", () => {
    const result = computeRoughPricing({
      answers: [{ questionId: 5, selectedOptionIds: [10] }],
      catalogItems: [makeCatalogItem({ id: 1, name: "Base Work", estimatedPrice: "50000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "1" })],
      priceRules: [],
      options: [],
      questions: [],
      tierMultipliers: [],
      pricingAddons: [
        { questionId: 5, optionId: 10, label: "Smart Home Package", amount: "5000", isActive: 1 },
      ],
    });
    expect(result.midpoint).toBe(55000);
    const addonItems = result.breakdown.filter(b => b.type === "addon");
    expect(addonItems.length).toBe(1);
    expect(addonItems[0].amount).toBe(5000);
  });
});

describe("Fallback to legacy pricing when no catalog rules", () => {
  it("uses base price rule when no dp_pricing_rules are configured", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [],
      dpPricingRules: [],
      priceRules: [
        {
          id: 1,
          name: "Addition Base",
          baseMin: "100000",
          baseMax: "200000",
          conditions: [],
          isActive: 1,
          sortOrder: 1,
        },
      ],
      options: [],
      questions: [],
      tierMultipliers: [],
      pricingAddons: [],
    });
    expect(result.usedCatalogPricing).toBe(false);
    expect(result.midpoint).toBe(150000); // (100000 + 200000) / 2
    expect(result.hasBaseRule).toBe(true);
  });

  it("returns zero when no catalog rules AND no legacy rules match", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [],
      dpPricingRules: [],
      priceRules: [],
      options: [],
      questions: [],
      tierMultipliers: [],
      pricingAddons: [],
    });
    expect(result.midpoint).toBe(0);
    expect(result.hasBaseRule).toBe(false);
  });
});

describe("Trade section breakdown structure", () => {
  it("groups items by tradeSection in tradeSectionBreakdown", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [
        makeCatalogItem({ id: 1, name: "Framing Labor", estimatedPrice: "8000", tradeSheet: "Framing" }),
        makeCatalogItem({ id: 2, name: "Framing Lumber", estimatedPrice: "6000", tradeSheet: "Framing" }),
        makeCatalogItem({ id: 3, name: "Roofing Shingles", estimatedPrice: "5000", tradeSheet: "Roofing" }),
      ],
      dpPricingRules: [
        makeDpRule({ id: 1, catalogItemId: 1, quantity: "1", tradeSection: "Framing" }),
        makeDpRule({ id: 2, catalogItemId: 2, quantity: "1", tradeSection: "Framing" }),
        makeDpRule({ id: 3, catalogItemId: 3, quantity: "1", tradeSection: "Roofing" }),
      ],
      ...emptyLegacyInputs,
    });
    expect(result.tradeSectionBreakdown).toBeDefined();
    expect(result.tradeSectionBreakdown!["Framing"].subtotal).toBe(14000);
    expect(result.tradeSectionBreakdown!["Framing"].items.length).toBe(2);
    expect(result.tradeSectionBreakdown!["Roofing"].subtotal).toBe(5000);
    expect(result.tradeSectionBreakdown!["Roofing"].items.length).toBe(1);
  });

  it("tradeSectionBreakdown is undefined in fallback mode", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [],
      dpPricingRules: [],
      priceRules: [
        { id: 1, name: "Default", baseMin: "50000", baseMax: "100000", conditions: [], isActive: 1, sortOrder: 1 },
      ],
      options: [],
      questions: [],
      tierMultipliers: [],
      pricingAddons: [],
    });
    expect(result.tradeSectionBreakdown).toBeUndefined();
  });
});

describe("Quantity formula edge cases", () => {
  it("defaults to qty=1 for invalid formula", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Item", estimatedPrice: "1000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "invalid_var * 2" })],
      ...emptyLegacyInputs,
    });
    // invalid_var is not a known variable, defaults to 1
    expect(result.midpoint).toBe(1000);
  });

  it("defaults to qty=1 for empty quantity string", () => {
    const result = computeRoughPricing({
      answers: [],
      catalogItems: [makeCatalogItem({ id: 1, name: "Item", estimatedPrice: "2500" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(2500);
  });

  it("uses floors variable in quantity formula", () => {
    const result = computeRoughPricing({
      answers: [],
      floors: 2,
      catalogItems: [makeCatalogItem({ id: 1, name: "Staircase", estimatedPrice: "4000" })],
      dpPricingRules: [makeDpRule({ id: 1, catalogItemId: 1, quantity: "floors" })],
      ...emptyLegacyInputs,
    });
    expect(result.midpoint).toBe(8000); // 4000 * 2
  });
});
