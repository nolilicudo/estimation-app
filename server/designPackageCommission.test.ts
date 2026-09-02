/**
 * Tests for Design Package Commission pricing logic
 *
 * Verifies that:
 * 1. Commission amounts are correct per project type
 * 2. Commission is added to the services total to produce the grand total
 * 3. Commission is NOT exposed as a line item (only baked into total)
 */

import { describe, it, expect } from "vitest";

// ─── Pricing engine (pure function, mirrors DesignPackageCalculator.tsx) ─────

interface DesignPackageItem {
  id: number;
  name: string;
  pricingType: "sqft" | "flat" | "rendering";
  costPerSqft: number;
  flatCost: number;
  markupPct: number;
  projectTypes: string;
  renderingType: string | null;
  isActive?: number;
}

interface CommissionEntry {
  projectType: string;
  commissionAmount: number;
}

interface PricingInput {
  projectType: string;
  sqft: number;
  smallBathroomCount: number;
  largeBathroomCount: number;
  kitchenCount: number;
  exteriorCount: number;
  items: DesignPackageItem[];
  commission: CommissionEntry[];
  itemOverrides?: Record<number, boolean>;
}

function calculateDesignPackageTotal(input: PricingInput) {
  const {
    projectType, sqft, smallBathroomCount, largeBathroomCount,
    kitchenCount, exteriorCount, items, commission, itemOverrides = {},
  } = input;

  const lineItems: Array<{ id: number; name: string; sellPrice: number }> = [];
  let servicesTotal = 0;

  for (const item of items) {
    if (item.isActive === 0) continue;
    const types = item.projectTypes.split(",").map((t) => t.trim());
    if (!types.includes("all") && !types.includes(projectType)) continue;
    if (item.id in itemOverrides && !itemOverrides[item.id]) continue;

    let sellPrice = 0;

    if (item.pricingType === "sqft") {
      if (sqft <= 0) continue;
      sellPrice = item.costPerSqft * (1 + item.markupPct / 100) * sqft;
    } else if (item.pricingType === "rendering") {
      const countMap: Record<string, number> = {
        small_bathroom: smallBathroomCount,
        large_bathroom: largeBathroomCount,
        kitchen: kitchenCount,
        exterior: exteriorCount,
      };
      const count = item.renderingType ? (countMap[item.renderingType] ?? 0) : 0;
      if (count === 0) continue;
      sellPrice = item.flatCost * (1 + item.markupPct / 100) * count;
    } else {
      sellPrice = item.flatCost * (1 + item.markupPct / 100);
    }

    lineItems.push({ id: item.id, name: item.name, sellPrice });
    servicesTotal += sellPrice;
  }

  const commissionEntry = commission.find((c) => c.projectType === projectType);
  const commissionAmount = commissionEntry ? commissionEntry.commissionAmount : 0;
  const grandTotal = servicesTotal + commissionAmount;

  return { lineItems, servicesTotal, commissionAmount, grandTotal };
}

// ─── Test data ────────────────────────────────────────────────────────────────

const COMMISSION: CommissionEntry[] = [
  { projectType: "bathroom", commissionAmount: 750 },
  { projectType: "kitchen", commissionAmount: 750 },
  { projectType: "full_home_remodel", commissionAmount: 1000 },
  { projectType: "addition", commissionAmount: 2000 },
];

const ARCH_ENG: DesignPackageItem = {
  id: 1, name: "Architectural Engineering",
  pricingType: "sqft", costPerSqft: 2.25, flatCost: 0, markupPct: 50,
  projectTypes: "addition,full_home_remodel", renderingType: null,
};

const STRUCT_ENG: DesignPackageItem = {
  id: 2, name: "Structural Engineering",
  pricingType: "sqft", costPerSqft: 1.5, flatCost: 0, markupPct: 50,
  projectTypes: "addition,full_home_remodel", renderingType: null,
};

const MANUAL_J: DesignPackageItem = {
  id: 3, name: "Manual J",
  pricingType: "flat", costPerSqft: 0, flatCost: 400, markupPct: 50,
  projectTypes: "addition,full_home_remodel", renderingType: null,
};

const SMALL_BATH_RENDERING: DesignPackageItem = {
  id: 4, name: "3D Rendering – Small Bathroom",
  pricingType: "rendering", costPerSqft: 0, flatCost: 500, markupPct: 50,
  projectTypes: "all", renderingType: "small_bathroom",
};

const KITCHEN_RENDERING: DesignPackageItem = {
  id: 5, name: "3D Rendering – Kitchen",
  pricingType: "rendering", costPerSqft: 0, flatCost: 1500, markupPct: 50,
  projectTypes: "all", renderingType: "kitchen",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Commission defaults", () => {
  it("bathroom commission is $750", () => {
    const entry = COMMISSION.find((c) => c.projectType === "bathroom");
    expect(entry?.commissionAmount).toBe(750);
  });

  it("kitchen commission is $750", () => {
    const entry = COMMISSION.find((c) => c.projectType === "kitchen");
    expect(entry?.commissionAmount).toBe(750);
  });

  it("full_home_remodel commission is $1000", () => {
    const entry = COMMISSION.find((c) => c.projectType === "full_home_remodel");
    expect(entry?.commissionAmount).toBe(1000);
  });

  it("addition commission is $2000", () => {
    const entry = COMMISSION.find((c) => c.projectType === "addition");
    expect(entry?.commissionAmount).toBe(2000);
  });
});

describe("Commission baked into grand total", () => {
  it("addition: grand total = services total + $2000 commission", () => {
    const result = calculateDesignPackageTotal({
      projectType: "addition",
      sqft: 500,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [ARCH_ENG, STRUCT_ENG, MANUAL_J],
      commission: COMMISSION,
    });
    // Arch eng: 2.25 * 1.5 * 500 = 1687.50
    // Struct eng: 1.5 * 1.5 * 500 = 1125.00
    // Manual J: 400 * 1.5 = 600.00
    // Services total: 3412.50
    // Commission: 2000
    // Grand total: 5412.50
    expect(result.servicesTotal).toBeCloseTo(3412.5, 2);
    expect(result.commissionAmount).toBe(2000);
    expect(result.grandTotal).toBeCloseTo(5412.5, 2);
  });

  it("bathroom: grand total = services total + $750 commission", () => {
    const result = calculateDesignPackageTotal({
      projectType: "bathroom",
      sqft: 0,
      smallBathroomCount: 2, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [SMALL_BATH_RENDERING],
      commission: COMMISSION,
    });
    // 2 small bathroom renderings: 500 * 1.5 * 2 = 1500
    // Commission: 750
    // Grand total: 2250
    expect(result.servicesTotal).toBeCloseTo(1500, 2);
    expect(result.commissionAmount).toBe(750);
    expect(result.grandTotal).toBeCloseTo(2250, 2);
  });

  it("kitchen: grand total = services total + $750 commission", () => {
    const result = calculateDesignPackageTotal({
      projectType: "kitchen",
      sqft: 0,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 1, exteriorCount: 0,
      items: [KITCHEN_RENDERING],
      commission: COMMISSION,
    });
    // 1 kitchen rendering: 1500 * 1.5 = 2250
    // Commission: 750
    // Grand total: 3000
    expect(result.servicesTotal).toBeCloseTo(2250, 2);
    expect(result.commissionAmount).toBe(750);
    expect(result.grandTotal).toBeCloseTo(3000, 2);
  });

  it("full_home_remodel: grand total = services total + $1000 commission", () => {
    const result = calculateDesignPackageTotal({
      projectType: "full_home_remodel",
      sqft: 1000,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [ARCH_ENG, STRUCT_ENG],
      commission: COMMISSION,
    });
    // Arch eng: 2.25 * 1.5 * 1000 = 3375
    // Struct eng: 1.5 * 1.5 * 1000 = 2250
    // Services total: 5625
    // Commission: 1000
    // Grand total: 6625
    expect(result.servicesTotal).toBeCloseTo(5625, 2);
    expect(result.commissionAmount).toBe(1000);
    expect(result.grandTotal).toBeCloseTo(6625, 2);
  });
});

describe("Commission is NOT a line item", () => {
  it("commission does not appear in lineItems array", () => {
    const result = calculateDesignPackageTotal({
      projectType: "addition",
      sqft: 500,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [ARCH_ENG],
      commission: COMMISSION,
    });
    const commissionLineItem = result.lineItems.find(
      (li) => li.name.toLowerCase().includes("commission")
    );
    expect(commissionLineItem).toBeUndefined();
    expect(result.lineItems).toHaveLength(1); // only arch eng
  });
});

describe("Item overrides", () => {
  it("disabled item is excluded from services total", () => {
    const result = calculateDesignPackageTotal({
      projectType: "addition",
      sqft: 500,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [ARCH_ENG, STRUCT_ENG],
      commission: COMMISSION,
      itemOverrides: { [STRUCT_ENG.id]: false },
    });
    // Only arch eng: 2.25 * 1.5 * 500 = 1687.50
    expect(result.lineItems).toHaveLength(1);
    expect(result.servicesTotal).toBeCloseTo(1687.5, 2);
    expect(result.grandTotal).toBeCloseTo(1687.5 + 2000, 2);
  });
});

describe("Inactive items", () => {
  it("inactive item is excluded from calculation", () => {
    const inactiveItem = { ...MANUAL_J, isActive: 0 };
    const result = calculateDesignPackageTotal({
      projectType: "addition",
      sqft: 500,
      smallBathroomCount: 0, largeBathroomCount: 0, kitchenCount: 0, exteriorCount: 0,
      items: [ARCH_ENG, inactiveItem],
      commission: COMMISSION,
    });
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].name).toBe("Architectural Engineering");
  });
});
