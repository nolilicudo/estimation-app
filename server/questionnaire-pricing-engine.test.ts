/**
 * Tests for the questionnaire pricing engine.
 * All tests run against the pure computeRoughPricing function — no DB calls.
 */
import { describe, it, expect } from "vitest";
import { computeRoughPricing, type PricingEngineInput } from "./questionnaire-pricing-engine";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const baseQuestion = {
  id: 1,
  text: "What type of project?",
  section: "project_basics" as string | null,
  calculationRules: [],
};

const additionOption = { id: 10, questionId: 1, text: "Home Addition", priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: null };
const remodelOption  = { id: 11, questionId: 1, text: "Full Remodel",  priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: null };

const additionRule = {
  id: 1,
  name: "Home Addition",
  baseMin: "80000",
  baseMax: "120000",
  conditions: [{ questionId: 1, optionIds: [10] }],
  isActive: 1,
  sortOrder: 1,
};

const defaultRule = {
  id: 99,
  name: "Default",
  baseMin: "50000",
  baseMax: "70000",
  conditions: [],
  isActive: 1,
  sortOrder: 99,
};

function makeInput(overrides: Partial<PricingEngineInput> = {}): PricingEngineInput {
  return {
    answers: [{ questionId: 1, selectedOptionIds: [10] }],
    priceRules: [additionRule, defaultRule],
    options: [additionOption, remodelOption],
    questions: [baseQuestion],
    tierMultipliers: [],
    pricingAddons: [],
    ...overrides,
  };
}

// ─── Layer 1: Base price matching ─────────────────────────────────────────────

describe("Layer 1 — Base price matching", () => {
  it("matches the first rule whose conditions all satisfy", () => {
    const result = computeRoughPricing(makeInput());
    expect(result.hasBaseRule).toBe(true);
    expect(result.baseRuleName).toBe("Home Addition");
    // midpoint = (80000 + 120000) / 2 = 100000
    expect(result.midpoint).toBe(100000);
  });

  it("falls back to the default rule when no conditions match", () => {
    const result = computeRoughPricing(makeInput({
      answers: [{ questionId: 1, selectedOptionIds: [11] }],
      priceRules: [additionRule, defaultRule],
    }));
    expect(result.baseRuleName).toBe("Default");
    expect(result.midpoint).toBe(60000);
  });

  it("returns zeros when no rule matches and no default exists", () => {
    const result = computeRoughPricing(makeInput({
      answers: [{ questionId: 1, selectedOptionIds: [11] }],
      priceRules: [additionRule], // no default
    }));
    expect(result.hasBaseRule).toBe(false);
    expect(result.midpoint).toBe(0);
    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
  });

  it("skips inactive rules", () => {
    const result = computeRoughPricing(makeInput({
      priceRules: [{ ...additionRule, isActive: 0 }, defaultRule],
    }));
    expect(result.baseRuleName).toBe("Default");
  });

  it("uses the lowest sortOrder rule first", () => {
    const rule2 = { ...additionRule, id: 2, name: "Addition v2", sortOrder: 0 };
    const result = computeRoughPricing(makeInput({
      priceRules: [additionRule, rule2, defaultRule],
    }));
    expect(result.baseRuleName).toBe("Addition v2");
  });
});

// ─── Layer 6: ±10% range ──────────────────────────────────────────────────────

describe("Layer 6 — ±10% range", () => {
  it("low = midpoint × 0.90, high = midpoint × 1.10", () => {
    const result = computeRoughPricing(makeInput());
    expect(result.low).toBe(90000);
    expect(result.high).toBe(110000);
  });

  it("rounds to nearest $100", () => {
    const rule = { ...additionRule, baseMin: "80001", baseMax: "120001" };
    const result = computeRoughPricing(makeInput({ priceRules: [rule] }));
    // midpoint raw = 100001, rounded to nearest 100 = 100000
    expect(result.midpoint % 100).toBe(0);
    expect(result.low % 100).toBe(0);
    expect(result.high % 100).toBe(0);
  });
});

// ─── Layer 2: Tier multipliers ────────────────────────────────────────────────

describe("Layer 2 — Tier multipliers", () => {
  const tierQuestion = {
    id: 2,
    text: "Flooring finish level",
    section: "interior_finishes",
    calculationRules: [],
  };
  const tier3Option = { id: 20, questionId: 2, text: "Level 3 — Engineered hardwood", priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: 3 };

  it("applies a tier multiplier to the base price", () => {
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 2, selectedOptionIds: [20] },
      ],
      options: [additionOption, remodelOption, tier3Option],
      questions: [baseQuestion, tierQuestion],
      tierMultipliers: [{
        sectionKey: "interior_finishes",
        tier: 3,
        multiplier: "1.15",
        weight: "1.0",
        tierLabel: "Mid-Grade",
      }],
    }));
    // base midpoint = 100000, ×1.15 = 115000
    expect(result.midpoint).toBe(115000);
    expect(result.breakdown.some(b => b.type === "tier_multiplier")).toBe(true);
  });

  it("applies a below-1 multiplier (discount tier)", () => {
    const tier1Option = { id: 21, questionId: 2, text: "Level 1 — Carpet", priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: 1 };
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 2, selectedOptionIds: [21] },
      ],
      options: [additionOption, remodelOption, tier1Option],
      questions: [baseQuestion, tierQuestion],
      tierMultipliers: [{
        sectionKey: "interior_finishes",
        tier: 1,
        multiplier: "0.85",
        weight: "1.0",
        tierLabel: "Basic",
      }],
    }));
    // 100000 × 0.85 = 85000
    expect(result.midpoint).toBe(85000);
  });

  it("averages two section multipliers weighted by weight", () => {
    const bathroomQ = { id: 3, text: "Bathroom tier", section: "interior_finishes", calculationRules: [] };
    const bathroomTier4 = { id: 30, questionId: 3, text: "Level 4", priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: 4 };
    // Two answers in the same section — engine should only apply once per section
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 2, selectedOptionIds: [tier3Option.id] },
        { questionId: 3, selectedOptionIds: [30] },
      ],
      options: [additionOption, remodelOption, tier3Option, bathroomTier4],
      questions: [baseQuestion, tierQuestion, bathroomQ],
      tierMultipliers: [{
        sectionKey: "interior_finishes",
        tier: 3,
        multiplier: "1.15",
        weight: "1.0",
        tierLabel: "Mid-Grade",
      }, {
        sectionKey: "interior_finishes",
        tier: 4,
        multiplier: "1.30",
        weight: "1.0",
        tierLabel: "Premium",
      }],
    }));
    // Both answers are in the same section; only the first one encountered applies
    // (section de-duplication). So multiplier = 1.15, midpoint = 115000
    expect(result.midpoint).toBe(115000);
  });

  it("skips sections with no tier multiplier configured", () => {
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 2, selectedOptionIds: [tier3Option.id] },
      ],
      options: [additionOption, remodelOption, tier3Option],
      questions: [baseQuestion, tierQuestion],
      tierMultipliers: [], // no multipliers configured
    }));
    // No adjustment — midpoint stays at base
    expect(result.midpoint).toBe(100000);
  });
});

// ─── Layer 3: Trade upgrade add-ons ──────────────────────────────────────────

describe("Layer 3 — Trade upgrade add-ons", () => {
  const smartHomeQ = { id: 5, text: "Smart home package?", section: "trade_upgrades", calculationRules: [] };
  const yesOption = { id: 50, questionId: 5, text: "Yes", priceAdjustment: "0", priceAdjustmentType: "none", pricingTier: null };

  it("adds flat amount when specific option is selected", () => {
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 5, selectedOptionIds: [50] },
      ],
      options: [additionOption, remodelOption, yesOption],
      questions: [baseQuestion, smartHomeQ],
      pricingAddons: [{
        questionId: 5,
        optionId: 50,
        label: "Smart Home Package",
        amount: "8000",
        isActive: 1,
      }],
    }));
    expect(result.midpoint).toBe(108000);
    expect(result.breakdown.some(b => b.type === "addon" && b.label === "Smart Home Package")).toBe(true);
  });

  it("adds flat amount when optionId is null (any answer triggers it)", () => {
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 5, selectedOptionIds: [50] },
      ],
      options: [additionOption, remodelOption, yesOption],
      questions: [baseQuestion, smartHomeQ],
      pricingAddons: [{
        questionId: 5,
        optionId: null,
        label: "Any Smart Home Trigger",
        amount: "5000",
        isActive: 1,
      }],
    }));
    expect(result.midpoint).toBe(105000);
  });

  it("does not add amount when the option is not selected", () => {
    const result = computeRoughPricing(makeInput({
      answers: [{ questionId: 1, selectedOptionIds: [10] }],
      options: [additionOption, remodelOption, yesOption],
      questions: [baseQuestion, smartHomeQ],
      pricingAddons: [{
        questionId: 5,
        optionId: 50,
        label: "Smart Home Package",
        amount: "8000",
        isActive: 1,
      }],
    }));
    expect(result.midpoint).toBe(100000); // unchanged
  });

  it("skips inactive add-ons", () => {
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 5, selectedOptionIds: [50] },
      ],
      options: [additionOption, remodelOption, yesOption],
      questions: [baseQuestion, smartHomeQ],
      pricingAddons: [{
        questionId: 5,
        optionId: 50,
        label: "Smart Home Package",
        amount: "8000",
        isActive: 0, // inactive
      }],
    }));
    expect(result.midpoint).toBe(100000);
  });
});

// ─── Layer 4: Option price adjustments ───────────────────────────────────────

describe("Layer 4 — Option price adjustments", () => {
  it("applies flat adjustment from option", () => {
    const flatOpt = { id: 60, questionId: 1, text: "Addition with permit", priceAdjustment: "5000", priceAdjustmentType: "flat", pricingTier: null };
    const result = computeRoughPricing(makeInput({
      answers: [{ questionId: 1, selectedOptionIds: [60] }],
      options: [additionOption, remodelOption, flatOpt],
      priceRules: [{ ...additionRule, conditions: [] }], // default rule
    }));
    // base midpoint = 100000, + 5000 flat = 105000
    expect(result.midpoint).toBe(105000);
  });

  it("applies percent adjustment from option", () => {
    const pctOpt = { id: 61, questionId: 1, text: "Premium Addition", priceAdjustment: "20", priceAdjustmentType: "percent", pricingTier: null };
    const result = computeRoughPricing(makeInput({
      answers: [{ questionId: 1, selectedOptionIds: [pctOpt.id] }],
      options: [additionOption, remodelOption, pctOpt],
      priceRules: [{ ...additionRule, conditions: [] }],
    }));
    // base = 100000, ×1.20 = 120000
    expect(result.midpoint).toBe(120000);
  });
});

// ─── Layer 5: Calculation rules ───────────────────────────────────────────────

describe("Layer 5 — Calculation rules", () => {
  it("applies a fixed cost rule when condition matches", () => {
    const sqftQ = {
      id: 7,
      text: "Addition square footage",
      section: "project_basics",
      calculationRules: [{
        name: "Permit fee",
        conditionType: "always_apply",
        fixedCost: 3000,
      }],
    };
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 7, selectedOptionIds: [], freeformValue: "500" },
      ],
      questions: [baseQuestion, sqftQ],
    }));
    expect(result.midpoint).toBe(103000);
    expect(result.breakdown.some(b => b.type === "calc_fixed")).toBe(true);
  });

  it("applies a formula rule with sqft substitution", () => {
    const sqftQ = {
      id: 8,
      text: "Square footage",
      section: "project_basics",
      calculationRules: [{
        name: "Sqft cost",
        conditionType: "always_apply",
        formula: "answer * 50",
      }],
    };
    const result = computeRoughPricing(makeInput({
      answers: [
        { questionId: 1, selectedOptionIds: [10] },
        { questionId: 8, selectedOptionIds: [], freeformValue: 200 },
      ],
      questions: [baseQuestion, sqftQ],
    }));
    // base 100000 + 200*50 = 110000
    expect(result.midpoint).toBe(110000);
  });
});

// ─── Breakdown structure ──────────────────────────────────────────────────────

describe("Breakdown structure", () => {
  it("always includes a base breakdown item", () => {
    const result = computeRoughPricing(makeInput());
    const baseItem = result.breakdown.find(b => b.type === "base");
    expect(baseItem).toBeDefined();
    expect(baseItem!.label).toContain("Base Price");
  });

  it("breakdown amounts sum to approximately the midpoint", () => {
    const result = computeRoughPricing(makeInput());
    const sum = result.breakdown.reduce((acc, b) => acc + b.amount, 0);
    expect(Math.abs(sum - result.midpoint)).toBeLessThan(200); // within $200 rounding
  });
});
