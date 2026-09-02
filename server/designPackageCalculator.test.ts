/**
 * Unit tests for Design Package Calculator pricing logic.
 *
 * These tests mirror the pricing engine in DesignPackageCalculator.tsx
 * but run server-side via Vitest for fast, reliable CI coverage.
 */
import { describe, it, expect } from "vitest";

// ─── Pricing engine (extracted logic) ────────────────────────────────────────

interface DesignPackageItem {
  id: number;
  name: string;
  pricingType: "sqft" | "flat" | "rendering";
  costPerSqft: number;
  flatCost: number;
  markupPct: number;
  projectTypes: string;
  renderingType?: string | null;
  isActive: boolean;
}

interface LineItemResult {
  id: number;
  name: string;
  cost: number;
  sellPrice: number;
  quantity: number;
  pricingType: string;
}

function computeDesignPackage(
  items: DesignPackageItem[],
  opts: {
    projectType: string;
    sqft: number;
    smallBathroomCount: number;
    largeBathroomCount: number;
    kitchenCount: number;
    exteriorCount: number;
    itemOverrides?: Record<number, boolean>;
  }
): { lineItems: LineItemResult[]; total: number } {
  const {
    projectType,
    sqft,
    smallBathroomCount,
    largeBathroomCount,
    kitchenCount,
    exteriorCount,
    itemOverrides = {},
  } = opts;

  const resultItems: LineItemResult[] = [];
  let totalCost = 0;

  for (const item of items) {
    if (!item.isActive) continue;
    const types = item.projectTypes.split(",").map((t) => t.trim());
    if (!types.includes("all") && !types.includes(projectType)) continue;
    if (item.id in itemOverrides && !itemOverrides[item.id]) continue;

    let itemCost = 0;
    let itemSellPrice = 0;
    let quantity = 1;

    if (item.pricingType === "sqft") {
      if (sqft <= 0) continue;
      const sellPerSqft = item.costPerSqft * (1 + item.markupPct / 100);
      itemCost = item.costPerSqft * sqft;
      itemSellPrice = sellPerSqft * sqft;
      quantity = sqft;
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

    resultItems.push({
      id: item.id,
      name: item.name,
      cost: itemCost,
      sellPrice: itemSellPrice,
      quantity,
      pricingType: item.pricingType,
    });
    totalCost += itemSellPrice;
  }

  return { lineItems: resultItems, total: totalCost };
}

// ─── Test data ────────────────────────────────────────────────────────────────

const ARCH_ENG: DesignPackageItem = {
  id: 1,
  name: "Architectural Engineering",
  pricingType: "sqft",
  costPerSqft: 2.25,
  flatCost: 0,
  markupPct: 50,
  projectTypes: "addition,full_home_remodel",
  isActive: true,
};

const STRUCT_ENG: DesignPackageItem = {
  id: 2,
  name: "Structural Engineering",
  pricingType: "sqft",
  costPerSqft: 1.5,
  flatCost: 0,
  markupPct: 50,
  projectTypes: "addition,full_home_remodel",
  isActive: true,
};

const SMALL_BATH_RENDER: DesignPackageItem = {
  id: 3,
  name: "3D Rendering — Small Bathroom",
  pricingType: "rendering",
  costPerSqft: 0,
  flatCost: 500,
  markupPct: 50,
  renderingType: "small_bathroom",
  projectTypes: "all",
  isActive: true,
};

const KITCHEN_RENDER: DesignPackageItem = {
  id: 4,
  name: "3D Rendering — Kitchen",
  pricingType: "rendering",
  costPerSqft: 0,
  flatCost: 1500,
  markupPct: 50,
  renderingType: "kitchen",
  projectTypes: "all",
  isActive: true,
};

const MANUAL_J: DesignPackageItem = {
  id: 5,
  name: "Manual J",
  pricingType: "flat",
  costPerSqft: 0,
  flatCost: 400,
  markupPct: 50,
  projectTypes: "addition",
  isActive: true,
};

const INACTIVE_ITEM: DesignPackageItem = {
  id: 6,
  name: "Inactive Service",
  pricingType: "flat",
  costPerSqft: 0,
  flatCost: 999,
  markupPct: 50,
  projectTypes: "all",
  isActive: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Design Package Calculator — sqft-based pricing", () => {
  it("calculates architectural engineering with 50% markup", () => {
    const { lineItems, total } = computeDesignPackage([ARCH_ENG], {
      projectType: "addition",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(1);
    // cost = 2.25 * 1000 = 2250; sell = 2250 * 1.5 = 3375
    expect(lineItems[0].cost).toBeCloseTo(2250);
    expect(lineItems[0].sellPrice).toBeCloseTo(3375);
    expect(total).toBeCloseTo(3375);
  });

  it("calculates structural engineering with 50% markup", () => {
    const { lineItems } = computeDesignPackage([STRUCT_ENG], {
      projectType: "addition",
      sqft: 500,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    // cost = 1.5 * 500 = 750; sell = 750 * 1.5 = 1125
    expect(lineItems[0].cost).toBeCloseTo(750);
    expect(lineItems[0].sellPrice).toBeCloseTo(1125);
  });

  it("skips sqft-based items when sqft is 0", () => {
    const { lineItems, total } = computeDesignPackage([ARCH_ENG, STRUCT_ENG], {
      projectType: "addition",
      sqft: 0,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("sums multiple sqft items correctly", () => {
    const { total } = computeDesignPackage([ARCH_ENG, STRUCT_ENG], {
      projectType: "addition",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    // arch: 3375 + struct: 2250
    expect(total).toBeCloseTo(3375 + 2250);
  });
});

describe("Design Package Calculator — rendering pricing", () => {
  it("calculates small bathroom rendering with 50% markup", () => {
    const { lineItems, total } = computeDesignPackage([SMALL_BATH_RENDER], {
      projectType: "bathroom",
      sqft: 0,
      smallBathroomCount: 2,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    // cost = 500 * 2 = 1000; sell = 500 * 1.5 * 2 = 1500
    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].cost).toBeCloseTo(1000);
    expect(lineItems[0].sellPrice).toBeCloseTo(1500);
    expect(total).toBeCloseTo(1500);
  });

  it("calculates kitchen rendering with 50% markup", () => {
    const { lineItems } = computeDesignPackage([KITCHEN_RENDER], {
      projectType: "kitchen",
      sqft: 0,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 1,
      exteriorCount: 0,
    });

    // cost = 1500; sell = 1500 * 1.5 = 2250
    expect(lineItems[0].cost).toBeCloseTo(1500);
    expect(lineItems[0].sellPrice).toBeCloseTo(2250);
  });

  it("skips rendering items when count is 0", () => {
    const { lineItems } = computeDesignPackage([SMALL_BATH_RENDER, KITCHEN_RENDER], {
      projectType: "kitchen",
      sqft: 0,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(0);
  });
});

describe("Design Package Calculator — flat pricing", () => {
  it("calculates flat fee items with 50% markup", () => {
    const { lineItems, total } = computeDesignPackage([MANUAL_J], {
      projectType: "addition",
      sqft: 0,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    // cost = 400; sell = 400 * 1.5 = 600
    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].cost).toBeCloseTo(400);
    expect(lineItems[0].sellPrice).toBeCloseTo(600);
    expect(total).toBeCloseTo(600);
  });
});

describe("Design Package Calculator — project type filtering", () => {
  it("excludes items not applicable to the project type", () => {
    // ARCH_ENG is only for addition/full_home_remodel
    const { lineItems } = computeDesignPackage([ARCH_ENG], {
      projectType: "kitchen",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(0);
  });

  it("includes 'all' project type items for any project", () => {
    // SMALL_BATH_RENDER has projectTypes: 'all'
    const { lineItems } = computeDesignPackage([SMALL_BATH_RENDER], {
      projectType: "addition",
      sqft: 0,
      smallBathroomCount: 1,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(1);
  });
});

describe("Design Package Calculator — item overrides", () => {
  it("excludes items toggled off via overrides", () => {
    const { lineItems } = computeDesignPackage([ARCH_ENG, STRUCT_ENG], {
      projectType: "addition",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
      itemOverrides: { [ARCH_ENG.id]: false },
    });

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].id).toBe(STRUCT_ENG.id);
  });

  it("includes items with override set to true", () => {
    const { lineItems } = computeDesignPackage([ARCH_ENG], {
      projectType: "addition",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
      itemOverrides: { [ARCH_ENG.id]: true },
    });

    expect(lineItems).toHaveLength(1);
  });
});

describe("Design Package Calculator — inactive items", () => {
  it("skips inactive items", () => {
    const { lineItems } = computeDesignPackage([INACTIVE_ITEM], {
      projectType: "addition",
      sqft: 1000,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    expect(lineItems).toHaveLength(0);
  });
});

describe("Design Package Calculator — custom markup", () => {
  it("applies a custom markup percentage correctly", () => {
    const customItem: DesignPackageItem = {
      ...ARCH_ENG,
      id: 99,
      markupPct: 100, // 100% markup = 2x
    };

    const { lineItems } = computeDesignPackage([customItem], {
      projectType: "addition",
      sqft: 100,
      smallBathroomCount: 0,
      largeBathroomCount: 0,
      kitchenCount: 0,
      exteriorCount: 0,
    });

    // cost = 2.25 * 100 = 225; sell = 225 * 2 = 450
    expect(lineItems[0].cost).toBeCloseTo(225);
    expect(lineItems[0].sellPrice).toBeCloseTo(450);
  });
});
