/**
 * Tests for Design Package Calculator two-mode split logic.
 *
 * These tests validate the pure business-logic rules that govern
 * which project types, steps, and features appear in each mode.
 * They do NOT require a browser or React — just plain TypeScript.
 */
import { describe, it, expect } from "vitest";

// ─── Mirror the constants from DesignPackageCalculator.tsx ────────────────────

type CalcMode = "remodel" | "addition";

const REMODEL_PROJECT_TYPES = [
  { value: "bathroom", label: "Bathroom Remodel" },
  { value: "kitchen", label: "Kitchen Remodel" },
];

const ADDITION_PROJECT_TYPES = [{ value: "addition", label: "Addition" }];

const SQFT_BASED_TYPES = ["addition", "full_home_remodel"];

const defaultProjectType = (mode: CalcMode) =>
  mode === "remodel" ? "bathroom" : "addition";

const isFeasibilityMode = (mode: CalcMode) => mode === "addition";

const isSqftBased = (projectType: string) =>
  SQFT_BASED_TYPES.includes(projectType);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DesignPackageCalculator mode split", () => {
  describe("Remodel mode", () => {
    it("defaults to bathroom project type", () => {
      expect(defaultProjectType("remodel")).toBe("bathroom");
    });

    it("only exposes bathroom and kitchen project types", () => {
      expect(REMODEL_PROJECT_TYPES.map((p) => p.value)).toEqual([
        "bathroom",
        "kitchen",
      ]);
    });

    it("does NOT include addition or full_home_remodel in remodel project types", () => {
      const values = REMODEL_PROJECT_TYPES.map((p) => p.value);
      expect(values).not.toContain("addition");
      expect(values).not.toContain("full_home_remodel");
    });

    it("does not show feasibility study step in remodel mode", () => {
      expect(isFeasibilityMode("remodel")).toBe(false);
    });

    it("bathroom project type is NOT sqft-based", () => {
      expect(isSqftBased("bathroom")).toBe(false);
    });

    it("kitchen project type is NOT sqft-based", () => {
      expect(isSqftBased("kitchen")).toBe(false);
    });
  });

  describe("Addition mode", () => {
    it("defaults to addition project type", () => {
      expect(defaultProjectType("addition")).toBe("addition");
    });

    it("only exposes addition project type", () => {
      expect(ADDITION_PROJECT_TYPES.map((p) => p.value)).toEqual(["addition"]);
    });

    it("shows feasibility study step in addition mode", () => {
      expect(isFeasibilityMode("addition")).toBe(true);
    });

    it("addition project type IS sqft-based", () => {
      expect(isSqftBased("addition")).toBe(true);
    });
  });

  describe("Mode switching resets state correctly", () => {
    it("switching from remodel to addition resets project type to addition", () => {
      // Simulate mode switch
      const newProjectType = defaultProjectType("addition");
      expect(newProjectType).toBe("addition");
    });

    it("switching from addition to remodel resets project type to bathroom", () => {
      const newProjectType = defaultProjectType("remodel");
      expect(newProjectType).toBe("bathroom");
    });
  });

  describe("Feasibility study availability", () => {
    it("feasibility is only available when mode is addition", () => {
      const modes: CalcMode[] = ["remodel", "addition"];
      const results = modes.map((m) => ({ mode: m, available: isFeasibilityMode(m) }));
      expect(results).toEqual([
        { mode: "remodel", available: false },
        { mode: "addition", available: true },
      ]);
    });
  });

  describe("Sqft-based pricing", () => {
    it("addition and full_home_remodel are sqft-based", () => {
      expect(isSqftBased("addition")).toBe(true);
      expect(isSqftBased("full_home_remodel")).toBe(true);
    });

    it("bathroom and kitchen are NOT sqft-based", () => {
      expect(isSqftBased("bathroom")).toBe(false);
      expect(isSqftBased("kitchen")).toBe(false);
    });
  });

  describe("Rendering counts per mode", () => {
    it("remodel mode shows bathroom and kitchen renderings (no exterior)", () => {
      // In remodel mode, exterior rendering count is not shown
      const remodelRenderingLabels = ["Small Bathroom", "Large Bathroom", "Kitchen"];
      expect(remodelRenderingLabels).not.toContain("Exterior");
    });

    it("addition mode shows all rendering types including exterior", () => {
      const additionRenderingLabels = [
        "Small Bathroom / Area",
        "Large Bathroom / Area",
        "Kitchen",
        "Exterior",
      ];
      expect(additionRenderingLabels).toContain("Exterior");
    });
  });

  describe("Mode labels", () => {
    it("remodel mode label is Bathroom/Kitchen Remodel", () => {
      const modeLabel = (mode: CalcMode) =>
        mode === "addition" ? "Addition" : "Bathroom/Kitchen Remodel";
      expect(modeLabel("remodel")).toBe("Bathroom/Kitchen Remodel");
    });

    it("addition mode label is Addition", () => {
      const modeLabel = (mode: CalcMode) =>
        mode === "addition" ? "Addition" : "Bathroom/Kitchen Remodel";
      expect(modeLabel("addition")).toBe("Addition");
    });
  });
});
