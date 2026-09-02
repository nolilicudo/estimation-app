/**
 * Tests for multi-select demo & rebuild cost calculation logic.
 * We test the calculation logic directly rather than through tRPC since
 * the cost calculations happen on the frontend in useCalculator.
 * Here we verify the config endpoint returns the expected data structures.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("config.getAll returns demo & rebuild options", () => {
  it("returns demolitionOptions as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(config).toBeDefined();
    expect(Array.isArray(config.demolitionOptions)).toBe(true);
  });

  it("returns footingOptions as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.footingOptions)).toBe(true);
  });

  it("returns concreteOptions as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.concreteOptions)).toBe(true);
  });

  it("returns framingOptions as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.framingOptions)).toBe(true);
  });

  it("returns facadeOptions as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.facadeOptions)).toBe(true);
  });

  it("returns comparisonMaterials as an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.comparisonMaterials)).toBe(true);
  });

  it("returns resinSurfaces and resinColors for cross-product comparison", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.resinSurfaces)).toBe(true);
    expect(Array.isArray(config.resinColors)).toBe(true);
  });

  it("returns duradekColors and tileSizes for cross-product comparison", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.duradekColors)).toBe(true);
    expect(Array.isArray(config.tileSizes)).toBe(true);
  });

  it("returns productSettings object", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(config.productSettings).toBeDefined();
    expect(typeof config.productSettings).toBe("object");
  });
});

describe("multi-select cost calculation logic (unit tests)", () => {
  // These test the pure calculation logic that runs on the frontend
  // We replicate the calculation here to ensure correctness

  it("calculates multi-select demolition costs correctly", () => {
    const demoOptions = [
      { id: "demo-1", name: "Deck Removal", pricePerSqft: 3.5 },
      { id: "demo-2", name: "Railing Removal", pricePerSqft: 2.0 },
    ];
    const selectedIds = ["demo-1", "demo-2"];
    const demoSqft = 200;

    let totalDemoCost = 0;
    for (const optId of selectedIds) {
      const opt = demoOptions.find((d) => d.id === optId);
      if (opt) {
        totalDemoCost += opt.pricePerSqft * demoSqft;
      }
    }

    // 3.5 * 200 + 2.0 * 200 = 700 + 400 = 1100
    expect(totalDemoCost).toBe(1100);
  });

  it("calculates multi-select footing costs with per-item counts", () => {
    const footingOptions = [
      { id: "foot-1", name: "Concrete Pier", pricePerUnit: 85 },
      { id: "foot-2", name: "Helical Pile", pricePerUnit: 150 },
    ];
    const selectedIds = ["foot-1", "foot-2"];
    const footingCounts: Record<string, number> = { "foot-1": 6, "foot-2": 4 };

    let totalFootingCost = 0;
    for (const optId of selectedIds) {
      const opt = footingOptions.find((f) => f.id === optId);
      if (opt) {
        const count = footingCounts[optId] || 6;
        totalFootingCost += opt.pricePerUnit * count;
      }
    }

    // 85 * 6 + 150 * 4 = 510 + 600 = 1110
    expect(totalFootingCost).toBe(1110);
  });

  it("calculates multi-select concrete costs with mixed units", () => {
    const concreteOptions = [
      { id: "conc-1", name: "Slab", pricePerUnit: 12, unit: "sqft" },
      { id: "conc-2", name: "Steps", pricePerUnit: 250, unit: "each" },
    ];
    const selectedIds = ["conc-1", "conc-2"];
    const concreteSqfts: Record<string, number> = { "conc-1": 100 };
    const concreteStepCounts: Record<string, number> = { "conc-2": 3 };

    let totalConcreteCost = 0;
    for (const optId of selectedIds) {
      const opt = concreteOptions.find((c) => c.id === optId);
      if (opt) {
        const qty =
          opt.unit === "each"
            ? concreteStepCounts[optId] || 0
            : concreteSqfts[optId] || 0;
        totalConcreteCost += opt.pricePerUnit * qty;
      }
    }

    // 12 * 100 + 250 * 3 = 1200 + 750 = 1950
    expect(totalConcreteCost).toBe(1950);
  });

  it("handles empty multi-select arrays correctly", () => {
    const selectedIds: string[] = [];
    let totalCost = 0;
    for (const optId of selectedIds) {
      totalCost += 100; // Should never execute
    }
    expect(totalCost).toBe(0);
  });

  it("toggles items in/out of selection array correctly", () => {
    function toggleInArray(arr: string[], id: string): string[] {
      return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    }

    let selection: string[] = [];
    selection = toggleInArray(selection, "a"); // add
    expect(selection).toEqual(["a"]);

    selection = toggleInArray(selection, "b"); // add
    expect(selection).toEqual(["a", "b"]);

    selection = toggleInArray(selection, "a"); // remove
    expect(selection).toEqual(["b"]);

    selection = toggleInArray(selection, "b"); // remove
    expect(selection).toEqual([]);
  });
});

describe("facade option minimum price floor logic", () => {
  // Replicates the calculation in useCalculator.ts for facade options

  function calcFacadeCost(
    opt: { pricePerSqft: number; minimumPrice: number },
    area: number
  ): number {
    const rawCost = opt.pricePerSqft * area;
    return opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
  }

  it("uses sqft cost when it exceeds the minimum", () => {
    const opt = { pricePerSqft: 9, minimumPrice: 500 };
    // 9 * 100 = 900 > 500 → should use 900
    expect(calcFacadeCost(opt, 100)).toBe(900);
  });

  it("uses minimum price when sqft cost is below it", () => {
    const opt = { pricePerSqft: 9, minimumPrice: 500 };
    // 9 * 20 = 180 < 500 → should use 500
    expect(calcFacadeCost(opt, 20)).toBe(500);
  });

  it("uses exact sqft cost when it equals the minimum", () => {
    const opt = { pricePerSqft: 10, minimumPrice: 500 };
    // 10 * 50 = 500 === 500 → should use 500
    expect(calcFacadeCost(opt, 50)).toBe(500);
  });

  it("skips minimum enforcement when minimumPrice is 0", () => {
    const opt = { pricePerSqft: 7, minimumPrice: 0 };
    // No minimum set → raw cost only
    expect(calcFacadeCost(opt, 10)).toBe(70);
  });

  it("calculates multi-select facade costs with per-option minimums", () => {
    const facadeOptions = [
      { id: "stucco", name: "Stucco", pricePerSqft: 9, minimumPrice: 500 },
      { id: "vinyl", name: "Vinyl Siding", pricePerSqft: 7, minimumPrice: 300 },
    ];
    const selectedIds = ["stucco", "vinyl"];
    const facadeSqfts: Record<string, number> = { stucco: 30, vinyl: 200 };

    let totalFacadeCost = 0;
    for (const optId of selectedIds) {
      const opt = facadeOptions.find(f => f.id === optId);
      if (opt) {
        const area = facadeSqfts[optId] || 0;
        const rawCost = opt.pricePerSqft * area;
        const cost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
        totalFacadeCost += cost;
      }
    }

    // stucco: 9*30=270 < 500 → 500
    // vinyl:  7*200=1400 > 300 → 1400
    // total: 500 + 1400 = 1900
    expect(totalFacadeCost).toBe(1900);
  });

  it("facade options returned by config.getAll include minimumPrice field", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const config = await caller.config.getAll();

    expect(Array.isArray(config.facadeOptions)).toBe(true);
    if (config.facadeOptions.length > 0) {
      const first = config.facadeOptions[0] as any;
      expect(typeof first.minimumPrice).toBe("number");
    }
  });
});
