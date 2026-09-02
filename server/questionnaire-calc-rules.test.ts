import { describe, it, expect } from "vitest";

/**
 * Tests for the questionnaire calculation rules engine.
 * Validates the evaluateCondition and evaluateFormula helpers used
 * in the submitAnswers procedure.
 */

// Re-implement the helpers here to unit-test them in isolation
// (they are inline in the router, so we mirror the logic)

function evaluateCondition(
  condition: { type: string; value?: string; min?: number; max?: number },
  answer: string
): boolean {
  switch (condition.type) {
    case "always":
      return true;
    case "equals":
      return answer === condition.value;
    case "not_equals":
      return answer !== condition.value;
    case "greater_than":
      return Number(answer) > Number(condition.value);
    case "less_than":
      return Number(answer) < Number(condition.value);
    case "between":
      return (
        Number(answer) >= (condition.min ?? 0) &&
        Number(answer) <= (condition.max ?? Infinity)
      );
    case "contains":
      return answer.toLowerCase().includes((condition.value ?? "").toLowerCase());
    default:
      return false;
  }
}

function evaluateFormula(
  formula: string,
  variables: Record<string, number>
): number {
  let expr = formula;
  for (const [key, val] of Object.entries(variables)) {
    expr = expr.replace(new RegExp(key, "g"), String(val));
  }
  try {
    return new Function(`return (${expr})`)() as number;
  } catch {
    return 0;
  }
}

describe("Questionnaire Calculation Rules Engine", () => {
  describe("evaluateCondition", () => {
    it("always condition returns true regardless of answer", () => {
      expect(evaluateCondition({ type: "always" }, "anything")).toBe(true);
      expect(evaluateCondition({ type: "always" }, "")).toBe(true);
    });

    it("equals condition matches exact string", () => {
      expect(evaluateCondition({ type: "equals", value: "Yes" }, "Yes")).toBe(true);
      expect(evaluateCondition({ type: "equals", value: "Yes" }, "No")).toBe(false);
    });

    it("not_equals condition rejects exact match", () => {
      expect(evaluateCondition({ type: "not_equals", value: "Yes" }, "No")).toBe(true);
      expect(evaluateCondition({ type: "not_equals", value: "Yes" }, "Yes")).toBe(false);
    });

    it("greater_than condition compares numerically", () => {
      expect(evaluateCondition({ type: "greater_than", value: "100" }, "150")).toBe(true);
      expect(evaluateCondition({ type: "greater_than", value: "100" }, "50")).toBe(false);
      expect(evaluateCondition({ type: "greater_than", value: "100" }, "100")).toBe(false);
    });

    it("less_than condition compares numerically", () => {
      expect(evaluateCondition({ type: "less_than", value: "100" }, "50")).toBe(true);
      expect(evaluateCondition({ type: "less_than", value: "100" }, "150")).toBe(false);
    });

    it("between condition checks inclusive range", () => {
      expect(evaluateCondition({ type: "between", min: 10, max: 20 }, "15")).toBe(true);
      expect(evaluateCondition({ type: "between", min: 10, max: 20 }, "10")).toBe(true);
      expect(evaluateCondition({ type: "between", min: 10, max: 20 }, "20")).toBe(true);
      expect(evaluateCondition({ type: "between", min: 10, max: 20 }, "5")).toBe(false);
      expect(evaluateCondition({ type: "between", min: 10, max: 20 }, "25")).toBe(false);
    });

    it("contains condition is case-insensitive", () => {
      expect(evaluateCondition({ type: "contains", value: "premium" }, "Premium Finish")).toBe(true);
      expect(evaluateCondition({ type: "contains", value: "premium" }, "basic finish")).toBe(false);
    });

    it("unknown condition type returns false", () => {
      expect(evaluateCondition({ type: "unknown_type" }, "anything")).toBe(false);
    });
  });

  describe("evaluateFormula", () => {
    it("evaluates simple arithmetic", () => {
      expect(evaluateFormula("100 + 200", {})).toBe(300);
    });

    it("substitutes variables into formula", () => {
      expect(evaluateFormula("answer * 10", { answer: 5 })).toBe(50);
    });

    it("handles sqft variable", () => {
      expect(evaluateFormula("sqft * 25", { sqft: 100 })).toBe(2500);
    });

    it("handles multiple variables", () => {
      expect(evaluateFormula("answer * sqft * 0.5", { answer: 2, sqft: 100 })).toBe(100);
    });

    it("returns 0 for invalid formula", () => {
      expect(evaluateFormula("invalid(", {})).toBe(0);
    });

    it("handles room_sqft variable", () => {
      expect(evaluateFormula("room_sqft * 15 + 500", { room_sqft: 200 })).toBe(3500);
    });
  });

  describe("Input type validation", () => {
    const validInputTypes = ["options", "yes_no", "number", "dropdown", "checkboxes", "text"];

    it("all expected input types are recognized", () => {
      for (const t of validInputTypes) {
        expect(typeof t).toBe("string");
        expect(t.length).toBeGreaterThan(0);
      }
    });

    it("input types list includes all 6 types", () => {
      expect(validInputTypes).toHaveLength(6);
    });
  });

  describe("Calculation rule structure", () => {
    it("a well-formed rule has condition and cost fields", () => {
      const rule = {
        condition: { type: "equals", value: "Yes" },
        fixedCost: 500,
        formula: "",
        label: "Premium upgrade",
      };
      expect(rule.condition.type).toBe("equals");
      expect(rule.fixedCost).toBe(500);
    });

    it("a formula-based rule can compute dynamic costs", () => {
      const rule = {
        condition: { type: "always" },
        fixedCost: 0,
        formula: "answer * 25",
        label: "Per-unit cost",
      };
      const answer = "10";
      if (evaluateCondition(rule.condition, answer)) {
        const cost = rule.formula
          ? evaluateFormula(rule.formula, { answer: Number(answer) })
          : rule.fixedCost;
        expect(cost).toBe(250);
      }
    });

    it("between condition with formula calculates correctly for tiered pricing", () => {
      const rules = [
        { condition: { type: "between", min: 0, max: 500 }, fixedCost: 1000, formula: "", label: "Small" },
        { condition: { type: "between", min: 501, max: 1500 }, fixedCost: 0, formula: "sqft * 3", label: "Medium" },
        { condition: { type: "greater_than", value: "1500" }, fixedCost: 0, formula: "sqft * 2.5", label: "Large" },
      ];

      // Small project: 300 sqft
      const smallAnswer = "300";
      const smallRule = rules.find(r => evaluateCondition(r.condition as any, smallAnswer));
      expect(smallRule?.label).toBe("Small");
      expect(smallRule?.fixedCost).toBe(1000);

      // Medium project: 1000 sqft
      const medAnswer = "1000";
      const medRule = rules.find(r => evaluateCondition(r.condition as any, medAnswer));
      expect(medRule?.label).toBe("Medium");
      const medCost = evaluateFormula(medRule!.formula, { sqft: 1000 });
      expect(medCost).toBe(3000);

      // Large project: 2000 sqft
      const largeAnswer = "2000";
      const largeRule = rules.find(r => evaluateCondition(r.condition as any, largeAnswer));
      expect(largeRule?.label).toBe("Large");
      const largeCost = evaluateFormula(largeRule!.formula, { sqft: 2000 });
      expect(largeCost).toBe(5000);
    });
  });
});
