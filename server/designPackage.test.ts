/**
 * Tests for Design Package pricing logic.
 * These tests verify the pricing engine rules:
 *  - sqft-based items: sellPrice = costPerSqft × (1 + markupPct/100) × sqft
 *  - flat items: sellPrice = flatCost × (1 + markupPct/100)
 *  - rendering items: sellPrice = flatCost × (1 + markupPct/100) × count
 *  - inactive items are excluded
 *  - project type filtering works correctly
 */

import { describe, expect, it } from "vitest";

// ─── Minimal types mirroring the frontend DesignPackageItem interface ──────────
interface DesignPackageItem {
  id: number;
  name: string;
  description: string;
  pricingType: "sqft" | "flat" | "rendering";
  costPerSqft: number;
  flatCost: number;
  markupPct: number;
  projectTypes: string; // comma-separated or "all"
  renderingType: string | null;
  sortOrder: number;
  isActive?: number; // 1 = active, 0 = inactive
}

interface LineItem {
  id: number;
  name: string;
  cost: number;
  sellPrice: number;
  quantity: number;
  pricingType: string;
}

// ─── Pricing engine (extracted from useCalculator.ts logic) ───────────────────
function calcDesignPackage(
  items: DesignPackageItem[],
  projectType: string,
  dpSqft: number,
  smallBathroomCount: number,
  largeBathroomCount: number,
  kitchenCount: number,
  exteriorCount: number,
  itemOverrides: Record<number, boolean> = {}
): { lineItems: LineItem[]; total: number } {
  const lineItems: LineItem[] = [];
  let total = 0;

  for (const item of items) {
    if (!item.isActive && item.isActive !== undefined) continue;
    const types = item.projectTypes.split(",").map((t) => t.trim());
    if (!types.includes("all") && !types.includes(projectType)) continue;
    if (item.id in itemOverrides && !itemOverrides[item.id]) continue;

    let itemCost = 0;
    let itemSellPrice = 0;
    let quantity = 1;

    if (item.pricingType === "sqft") {
      const sellPerSqft = item.costPerSqft * (1 + item.markupPct / 100);
      itemCost = item.costPerSqft * dpSqft;
      itemSellPrice = sellPerSqft * dpSqft;
      quantity = dpSqft;
    } else if (item.pricingType === "rendering") {
      const countMap: Record<string, number> = {
        small_bathroom: smallBathroomCount,
        large_bathroom: largeBathroomCount,
        kitchen: kitchenCount,
        exterior: exteriorCount,
      };
      const count = item.renderingType ? (countMap[item.renderingType] ?? 0) : 0;
      if (count === 0) continue;
      itemCost = item.flatCost * count;
      itemSellPrice = item.flatCost * (1 + item.markupPct / 100) * count;
      quantity = count;
    } else {
      // flat
      itemCost = item.flatCost;
      itemSellPrice = item.flatCost * (1 + item.markupPct / 100);
      quantity = 1;
    }

    lineItems.push({ id: item.id, name: item.name, cost: itemCost, sellPrice: itemSellPrice, quantity, pricingType: item.pricingType });
    total += itemSellPrice;
  }

  return { lineItems, total };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Design Package pricing engine", () => {
  const archEngineering: DesignPackageItem = {
    id: 1,
    name: "Architectural Engineering",
    description: "",
    pricingType: "sqft",
    costPerSqft: 2.25,
    flatCost: 0,
    markupPct: 50,
    projectTypes: "addition,full_home_remodel",
    renderingType: null,
    sortOrder: 1,
    isActive: 1,
  };

  const structEngineering: DesignPackageItem = {
    id: 2,
    name: "Structural Engineering",
    description: "",
    pricingType: "sqft",
    costPerSqft: 1.5,
    flatCost: 0,
    markupPct: 50,
    projectTypes: "addition,full_home_remodel",
    renderingType: null,
    sortOrder: 2,
    isActive: 1,
  };

  const smallBathroomRendering: DesignPackageItem = {
    id: 3,
    name: "3D Rendering — Small Bathroom",
    description: "",
    pricingType: "rendering",
    costPerSqft: 0,
    flatCost: 500,
    markupPct: 50,
    projectTypes: "all",
    renderingType: "small_bathroom",
    sortOrder: 3,
    isActive: 1,
  };

  const kitchenRendering: DesignPackageItem = {
    id: 4,
    name: "3D Rendering — Kitchen",
    description: "",
    pricingType: "rendering",
    costPerSqft: 0,
    flatCost: 1500,
    markupPct: 50,
    projectTypes: "all",
    renderingType: "kitchen",
    sortOrder: 4,
    isActive: 1,
  };

  const manualJ: DesignPackageItem = {
    id: 5,
    name: "Manual J",
    description: "",
    pricingType: "flat",
    costPerSqft: 0,
    flatCost: 300,
    markupPct: 50,
    projectTypes: "addition,full_home_remodel",
    renderingType: null,
    sortOrder: 5,
    isActive: 1,
  };

  const inactiveItem: DesignPackageItem = {
    id: 6,
    name: "Inactive Item",
    description: "",
    pricingType: "flat",
    costPerSqft: 0,
    flatCost: 1000,
    markupPct: 50,
    projectTypes: "all",
    renderingType: null,
    sortOrder: 6,
    isActive: 0,
  };

  it("calculates sqft-based items correctly with 50% markup", () => {
    const { lineItems, total } = calcDesignPackage(
      [archEngineering],
      "addition",
      1000, // 1000 sqft
      0, 0, 0, 0
    );
    expect(lineItems).toHaveLength(1);
    // cost = 2.25 * 1000 = 2250; sell = 2.25 * 1.5 * 1000 = 3375
    expect(lineItems[0].cost).toBeCloseTo(2250);
    expect(lineItems[0].sellPrice).toBeCloseTo(3375);
    expect(total).toBeCloseTo(3375);
  });

  it("calculates structural engineering correctly", () => {
    const { lineItems } = calcDesignPackage(
      [structEngineering],
      "addition",
      500,
      0, 0, 0, 0
    );
    // cost = 1.5 * 500 = 750; sell = 1.5 * 1.5 * 500 = 1125
    expect(lineItems[0].cost).toBeCloseTo(750);
    expect(lineItems[0].sellPrice).toBeCloseTo(1125);
  });

  it("calculates flat-fee items correctly", () => {
    const { lineItems } = calcDesignPackage(
      [manualJ],
      "addition",
      0,
      0, 0, 0, 0
    );
    // cost = 300; sell = 300 * 1.5 = 450
    expect(lineItems[0].cost).toBeCloseTo(300);
    expect(lineItems[0].sellPrice).toBeCloseTo(450);
  });

  it("calculates rendering items correctly with count", () => {
    const { lineItems } = calcDesignPackage(
      [smallBathroomRendering],
      "bathroom",
      0,
      2, // 2 small bathrooms
      0, 0, 0
    );
    // cost = 500 * 2 = 1000; sell = 500 * 1.5 * 2 = 1500
    expect(lineItems[0].cost).toBeCloseTo(1000);
    expect(lineItems[0].sellPrice).toBeCloseTo(1500);
    expect(lineItems[0].quantity).toBe(2);
  });

  it("skips rendering items when count is 0", () => {
    const { lineItems } = calcDesignPackage(
      [kitchenRendering],
      "kitchen",
      0,
      0, 0,
      0, // 0 kitchens
      0
    );
    expect(lineItems).toHaveLength(0);
  });

  it("excludes inactive items", () => {
    const { lineItems } = calcDesignPackage(
      [inactiveItem],
      "addition",
      1000,
      0, 0, 0, 0
    );
    expect(lineItems).toHaveLength(0);
  });

  it("filters items by project type", () => {
    // archEngineering only applies to addition and full_home_remodel
    const { lineItems: kitchenItems } = calcDesignPackage(
      [archEngineering],
      "kitchen",
      1000,
      0, 0, 0, 0
    );
    expect(kitchenItems).toHaveLength(0);

    const { lineItems: additionItems } = calcDesignPackage(
      [archEngineering],
      "addition",
      1000,
      0, 0, 0, 0
    );
    expect(additionItems).toHaveLength(1);
  });

  it("includes 'all' project type items for any project type", () => {
    const { lineItems: bathroomItems } = calcDesignPackage(
      [smallBathroomRendering],
      "bathroom",
      0,
      1, 0, 0, 0
    );
    expect(bathroomItems).toHaveLength(1);

    const { lineItems: additionItems } = calcDesignPackage(
      [smallBathroomRendering],
      "addition",
      0,
      1, 0, 0, 0
    );
    expect(additionItems).toHaveLength(1);
  });

  it("respects per-item override to disable an item", () => {
    const { lineItems } = calcDesignPackage(
      [archEngineering],
      "addition",
      1000,
      0, 0, 0, 0,
      { [archEngineering.id]: false } // override: disabled
    );
    expect(lineItems).toHaveLength(0);
  });

  it("respects per-item override to keep an item enabled", () => {
    const { lineItems } = calcDesignPackage(
      [archEngineering],
      "addition",
      1000,
      0, 0, 0, 0,
      { [archEngineering.id]: true } // override: enabled
    );
    expect(lineItems).toHaveLength(1);
  });

  it("sums multiple items correctly", () => {
    const { total } = calcDesignPackage(
      [archEngineering, structEngineering, manualJ],
      "addition",
      1000,
      0, 0, 0, 0
    );
    // arch: 3375, struct: 2250, manualJ: 450
    expect(total).toBeCloseTo(3375 + 2250 + 450);
  });

  it("calculates a full addition package with all applicable items", () => {
    const allItems = [archEngineering, structEngineering, smallBathroomRendering, kitchenRendering, manualJ, inactiveItem];
    const { lineItems, total } = calcDesignPackage(
      allItems,
      "addition",
      1200,
      1, // 1 small bathroom
      0,
      1, // 1 kitchen
      0
    );
    // arch: 2.25 * 1.5 * 1200 = 4050
    // struct: 1.5 * 1.5 * 1200 = 2700
    // smallBathroom: 500 * 1.5 * 1 = 750
    // kitchen: 1500 * 1.5 * 1 = 2250
    // manualJ: 300 * 1.5 = 450
    // inactive: excluded
    expect(lineItems).toHaveLength(5);
    expect(total).toBeCloseTo(4050 + 2700 + 750 + 2250 + 450);
  });
});
