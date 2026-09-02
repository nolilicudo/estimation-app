import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@designyourprice.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("config.getAll", () => {
  it("returns config data from the public endpoint", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.getAll();

    // Should return data (or null if DB not connected, but should not throw)
    if (result) {
      expect(result).toHaveProperty("collections");
      expect(result).toHaveProperty("edgeOptions");
      expect(result).toHaveProperty("accessories");
      expect(result).toHaveProperty("laborTiers");
      expect(result).toHaveProperty("deliveryOptions");
      expect(result).toHaveProperty("settings");
      expect(result).toHaveProperty("comparisonMaterials");
      expect(result).toHaveProperty("demolitionOptions");
      expect(result).toHaveProperty("footingOptions");
      expect(result).toHaveProperty("concreteOptions");
      expect(result).toHaveProperty("framingOptions");
      expect(result).toHaveProperty("facadeOptions");

      // Verify demo/rebuild options have required fields
      if (result.demolitionOptions && result.demolitionOptions.length > 0) {
        expect(result.demolitionOptions[0]).toHaveProperty("name");
        expect(result.demolitionOptions[0]).toHaveProperty("pricePerSqft");
      }
      if (result.footingOptions && result.footingOptions.length > 0) {
        expect(result.footingOptions[0]).toHaveProperty("name");
        expect(result.footingOptions[0]).toHaveProperty("pricePerUnit");
      }
      if (result.concreteOptions && result.concreteOptions.length > 0) {
        expect(result.concreteOptions[0]).toHaveProperty("name");
        expect(result.concreteOptions[0]).toHaveProperty("pricePerUnit");
      }
      if (result.framingOptions && result.framingOptions.length > 0) {
        expect(result.framingOptions[0]).toHaveProperty("name");
        expect(result.framingOptions[0]).toHaveProperty("pricePerSqft");
      }
      if (result.facadeOptions && result.facadeOptions.length > 0) {
        expect(result.facadeOptions[0]).toHaveProperty("name");
        expect(result.facadeOptions[0]).toHaveProperty("pricePerSqft");
      }

      // Verify comparison materials have required fields
      if (result.comparisonMaterials && result.comparisonMaterials.length > 0) {
        expect(result.comparisonMaterials[0]).toHaveProperty("name");
        expect(result.comparisonMaterials[0]).toHaveProperty("materialCostPerSqft");
        expect(result.comparisonMaterials[0]).toHaveProperty("laborCostPerSqft");
        expect(result.comparisonMaterials[0]).toHaveProperty("lifespanYears");
      }

      // Verify collections have colors nested
      if (result.collections.length > 0) {
        expect(result.collections[0]).toHaveProperty("colors");
        expect(result.collections[0]).toHaveProperty("name");
        expect(result.collections[0]).toHaveProperty("slug");
      }

      // Verify edge options have required fields
      if (result.edgeOptions.length > 0) {
        expect(result.edgeOptions[0]).toHaveProperty("id");
        expect(result.edgeOptions[0]).toHaveProperty("name");
        expect(result.edgeOptions[0]).toHaveProperty("pricePerLinearFt");
        expect(result.edgeOptions[0]).toHaveProperty("collection");
      }

      // Verify labor tiers have required fields
      if (result.laborTiers.length > 0) {
        expect(result.laborTiers[0]).toHaveProperty("id");
        expect(result.laborTiers[0]).toHaveProperty("name");
        expect(result.laborTiers[0]).toHaveProperty("pricePerSqft");
      }

      // Verify delivery options have required fields
      if (result.deliveryOptions.length > 0) {
        expect(result.deliveryOptions[0]).toHaveProperty("id");
        expect(result.deliveryOptions[0]).toHaveProperty("name");
        expect(result.deliveryOptions[0]).toHaveProperty("price");
      }
    }
  });

  it("does not require authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw UNAUTHORIZED
    await expect(caller.config.getAll()).resolves.not.toThrow();
  });
});

describe("admin.getConfig", () => {
  it("allows admin users to access admin config", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getConfig();

    if (result) {
      expect(result).toHaveProperty("collections");
      expect(result).toHaveProperty("colors");
      expect(result).toHaveProperty("edgeOptions");
      expect(result).toHaveProperty("accessories");
      expect(result).toHaveProperty("laborTiers");
      expect(result).toHaveProperty("deliveryOptions");
      expect(result).toHaveProperty("settings");
      expect(result).toHaveProperty("comparisonMaterials");
      expect(result).toHaveProperty("demolitionOptions");
      expect(result).toHaveProperty("footingOptions");
      expect(result).toHaveProperty("concreteOptions");
      expect(result).toHaveProperty("framingOptions");
      expect(result).toHaveProperty("facadeOptions");
    }
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getConfig()).rejects.toThrow();
  });

  it("rejects regular (non-admin) users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getConfig()).rejects.toThrow();
  });
});

describe("admin mutations - access control", () => {
  it("rejects unauthenticated users from updating settings", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateSetting({ key: "tax_rate", value: "0.08" })
    ).rejects.toThrow();
  });

  it("rejects regular users from updating settings", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateSetting({ key: "tax_rate", value: "0.08" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from updating collections", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateCollection({ id: 1, name: "Hacked" })
    ).rejects.toThrow();
  });

  it("rejects regular users from creating labor tiers", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createLaborTier({ slug: "test", name: "Test", pricePerSqft: "10" })
    ).rejects.toThrow();
  });

  it("rejects regular users from deleting delivery options", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.deleteDeliveryOption({ id: 999 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from creating comparison materials", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createComparisonMaterial({
        slug: "test",
        name: "Test Material",
        materialCostPerSqft: "10",
        laborCostPerSqft: "8",
        annualMaintenanceCostPerSqft: "1",
        lifespanYears: 15,
        warrantyYears: 5,
        sortOrder: 0,
      })
    ).rejects.toThrow();
  });

  it("rejects regular users from updating comparison materials", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateComparisonMaterial({ id: 1, name: "Hacked" })
    ).rejects.toThrow();
  });

  it("rejects regular users from deleting comparison materials", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.deleteComparisonMaterial({ id: 999 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from creating demo options", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createDemoOption({ slug: "test", name: "Test", pricePerSqft: "5", sortOrder: 0 })
    ).rejects.toThrow();
  });

  it("rejects regular users from creating footing options", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createFootingOption({ slug: "test", name: "Test", pricePerUnit: "100", sortOrder: 0 })
    ).rejects.toThrow();
  });

  it("rejects regular users from creating concrete options", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createConcreteOption({ slug: "test", name: "Test", pricePerSqft: "10", sortOrder: 0 })
    ).rejects.toThrow();
  });

  it("rejects regular users from creating framing options", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createFramingOption({ slug: "test", name: "Test", pricePerSqft: "10", sortOrder: 0 })
    ).rejects.toThrow();
  });

  it("rejects regular users from creating facade options", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createFacadeOption({ slug: "test", name: "Test", pricePerSqft: "10", sortOrder: 0 })
    ).rejects.toThrow();
  });
});

describe("admin mutations - allowed for admins", () => {
  it("allows admin to update settings", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw (it may fail if DB is not connected, but should not throw FORBIDDEN)
    try {
      const result = await caller.admin.updateSetting({ key: "tax_rate", value: "0.08" });
      expect(result).toEqual({ success: true });
    } catch (err: any) {
      // If it throws, it should NOT be a FORBIDDEN error
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });

  it("allows admin to update collection", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.admin.updateCollection({ id: 1, name: "Updated Rainier" });
      expect(result).toEqual({ success: true });
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });

  it("allows admin to bulk update settings", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.admin.bulkUpdateSettings({
        updates: [
          { key: "tax_rate", value: "0.0745" },
          { key: "permit_cost", value: "250" },
        ],
      });
      expect(result).toEqual({ success: true });
    } catch (err: any) {
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });
});

describe("adminAuth.me", () => {
  it("returns isAdmin true for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adminAuth.me();
    expect(result.isAdmin).toBe(true);
  });

  it("returns isAdmin false for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adminAuth.me();
    expect(result.isAdmin).toBe(false);
  });

  it("returns isAdmin false for regular users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adminAuth.me();
    expect(result.isAdmin).toBe(false);
  });
});

describe("adminAuth.logout", () => {
  it("clears the admin session cookie", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "admin-1",
        email: "admin@designyourprice.com",
        name: "Admin",
        loginMethod: "email",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminAuth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    const adminCookieClear = clearedCookies.find(c => c.name === "admin_session");
    expect(adminCookieClear).toBeDefined();
  });
});
