/**
 * Tests for the Project Knowledge Level branching logic:
 * - help_me_figure_out → ±10% range (rangeFactor = 0.10)
 * - i_know_what_i_want → ±7% range (rangeFactor = 0.07)
 * - i_have_plans       → ±5% range (rangeFactor = 0.05)
 */

import { describe, it, expect } from "vitest";
import { computeRoughPricing } from "./questionnaire-pricing-engine";

const BASE_INPUT = {
  answers: [],
  sqft: 0,
  lf: 0,
  rooms: 0,
  bedrooms: 0,
  bathrooms: 0,
  floors: 1,
  catalogItems: [],
  dpPricingRules: [],
  priceRules: [
    {
      id: 1,
      name: "Test Base Rule",
      conditions: [],
      baseMin: "100000",
      baseMax: "100000",
      formulaType: "fixed" as const,
      formulaValue: null,
      sortOrder: 1,
      isActive: 1,
    },
  ],
  options: [],
  questions: [],
  tierMultipliers: [],
  pricingAddons: [],
};

describe("Knowledge Path Range Factors", () => {
  it("defaults to ±10% when no knowledgePath is provided", () => {
    const result = computeRoughPricing({ ...BASE_INPUT });
    expect(result.midpoint).toBe(100000);
    expect(result.low).toBe(90000);
    expect(result.high).toBe(110000);
    expect(result.rangeFactor).toBe(0.10);
    expect(result.rangeLabel).toBe("±10%");
  });

  it("applies ±10% for help_me_figure_out path", () => {
    const result = computeRoughPricing({ ...BASE_INPUT, knowledgePath: "help_me_figure_out" });
    expect(result.midpoint).toBe(100000);
    expect(result.low).toBe(90000);
    expect(result.high).toBe(110000);
    expect(result.rangeFactor).toBe(0.10);
    expect(result.rangeLabel).toBe("±10%");
  });

  it("applies ±7% for i_know_what_i_want path", () => {
    const result = computeRoughPricing({ ...BASE_INPUT, knowledgePath: "i_know_what_i_want" });
    expect(result.midpoint).toBe(100000);
    // low = 100000 * (1 - 0.07) = 93000, rounded to nearest 100
    expect(result.low).toBe(93000);
    // high = 100000 * (1 + 0.07) = 107000, rounded to nearest 100
    expect(result.high).toBe(107000);
    expect(result.rangeFactor).toBe(0.07);
    expect(result.rangeLabel).toBe("±7%");
  });

  it("applies ±5% for i_have_plans path", () => {
    const result = computeRoughPricing({ ...BASE_INPUT, knowledgePath: "i_have_plans" });
    expect(result.midpoint).toBe(100000);
    // low = 100000 * (1 - 0.05) = 95000
    expect(result.low).toBe(95000);
    // high = 100000 * (1 + 0.05) = 105000
    expect(result.high).toBe(105000);
    expect(result.rangeFactor).toBe(0.05);
    expect(result.rangeLabel).toBe("±5%");
  });

  it("range narrows correctly for a larger midpoint with i_know_what_i_want", () => {
    const input = {
      ...BASE_INPUT,
      knowledgePath: "i_know_what_i_want" as const,
      priceRules: [
        {
          id: 1,
          name: "Large Project",
          conditions: [],
          baseMin: "250000",
          baseMax: "250000",
          formulaType: "fixed" as const,
          formulaValue: null,
          sortOrder: 1,
          isActive: 1,
        },
      ],
    };
    const result = computeRoughPricing(input);
    expect(result.midpoint).toBe(250000);
    expect(result.low).toBe(232500);   // 250000 * 0.93 = 232500
    expect(result.high).toBe(267500);  // 250000 * 1.07 = 267500
    expect(result.rangeFactor).toBe(0.07);
  });

  it("range narrows correctly for a larger midpoint with i_have_plans", () => {
    const input = {
      ...BASE_INPUT,
      knowledgePath: "i_have_plans" as const,
      priceRules: [
        {
          id: 1,
          name: "Large Project",
          conditions: [],
          baseMin: "250000",
          baseMax: "250000",
          formulaType: "fixed" as const,
          formulaValue: null,
          sortOrder: 1,
          isActive: 1,
        },
      ],
    };
    const result = computeRoughPricing(input);
    expect(result.midpoint).toBe(250000);
    expect(result.low).toBe(237500);   // 250000 * 0.95 = 237500
    expect(result.high).toBe(262500);  // 250000 * 1.05 = 262500
    expect(result.rangeFactor).toBe(0.05);
  });

  it("returns rangeLabel in the breakdown description", () => {
    const result = computeRoughPricing({ ...BASE_INPUT, knowledgePath: "i_have_plans" });
    // The breakdown should contain a range item
    const rangeItem = result.breakdown.find(b => b.type === "range");
    expect(rangeItem).toBeDefined();
    expect(rangeItem?.label).toContain("±5%");
  });
});
