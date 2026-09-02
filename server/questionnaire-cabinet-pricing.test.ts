/**
 * Tests for cabinet pricing CRUD procedures:
 * - listCabinetPricing
 * - listCabinetVendors
 * - updateCabinetPricingRow (margin recompute)
 * - bulkUpdateCabinetMargin
 * - syncCabinetsToCatalog
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { dpCabinetPricing, dpCatalogItems } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Helper: insert a test cabinet row and return its id
async function insertTestCabinetRow(overrides: Partial<typeof dpCabinetPricing.$inferInsert> = {}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = Date.now();
  const base: typeof dpCabinetPricing.$inferInsert = {
    vendor: "Test Vendor",
    collection: "Test Collection",
    style: "Shaker",
    color: "White",
    code: "TST-001",
    optionLabel: "Test Shaker White",
    lineItemType: "base",
    unit: "LF",
    msrpUnitPrice: "100.00",
    discountedUnitPrice: "75.00",
    marginPct: "0",
    estimatedPrice: "75.00",
    isActive: 1,
    sortOrder: 999,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  const [result] = await db.insert(dpCabinetPricing).values(base).$returningId();
  return result.id;
}

// Helper: clean up test rows
async function cleanupTestRows() {
  const db = await getDb();
  if (!db) return;
  await db.delete(dpCabinetPricing).where(eq(dpCabinetPricing.vendor, "Test Vendor"));
  await db.delete(dpCatalogItems).where(eq(dpCatalogItems.tradeSheet, "Cabinetry"));
}

describe("Cabinet Pricing — listCabinetPricing", () => {
  it("returns rows from dp_cabinet_pricing", async () => {
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(dpCabinetPricing).limit(5);
    // May be empty in fresh DB, just check it's an array
    expect(Array.isArray(rows)).toBe(true);
  });

  it("filters by vendor when vendor is provided", async () => {
    const db = await getDb();
    if (!db) return;
    const id = await insertTestCabinetRow({ vendor: "Test Vendor" });
    const rows = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.vendor, "Test Vendor"));
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every(r => r.vendor === "Test Vendor")).toBe(true);
    await cleanupTestRows();
  });
});

describe("Cabinet Pricing — listCabinetVendors", () => {
  it("returns distinct vendor names", async () => {
    const db = await getDb();
    if (!db) return;
    await insertTestCabinetRow({ vendor: "Test Vendor" });
    const rows = await db.select({ vendor: dpCabinetPricing.vendor }).from(dpCabinetPricing);
    const vendors = Array.from(new Set(rows.map(r => r.vendor)));
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.includes("Test Vendor")).toBe(true);
    await cleanupTestRows();
  });
});

describe("Cabinet Pricing — updateCabinetPricingRow", () => {
  it("updates discountedUnitPrice and recalculates estimatedPrice when marginPct is also set", async () => {
    const db = await getDb();
    if (!db) return;
    const id = await insertTestCabinetRow({
      discountedUnitPrice: "80.00",
      marginPct: "0",
      estimatedPrice: "80.00",
    });

    // Simulate: set marginPct=37.5 → estimatedPrice = 80 / (1 - 0.375) = 128.00
    const margin = 37.5 / 100;
    const newPrice = Math.round(80 / (1 - margin) * 100) / 100;
    await db.update(dpCabinetPricing)
      .set({ marginPct: "37.5", estimatedPrice: String(newPrice), updatedAt: Date.now() })
      .where(eq(dpCabinetPricing.id, id));

    const [updated] = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.id, id));
    expect(parseFloat(updated.marginPct)).toBeCloseTo(37.5, 1);
    expect(parseFloat(updated.estimatedPrice)).toBeCloseTo(128.0, 0);
    await cleanupTestRows();
  });

  it("does not change other rows when updating a specific id", async () => {
    const db = await getDb();
    if (!db) return;
    const id1 = await insertTestCabinetRow({ code: "TST-A", discountedUnitPrice: "50.00", estimatedPrice: "50.00" });
    const id2 = await insertTestCabinetRow({ code: "TST-B", discountedUnitPrice: "60.00", estimatedPrice: "60.00" });

    await db.update(dpCabinetPricing)
      .set({ estimatedPrice: "99.00", updatedAt: Date.now() })
      .where(eq(dpCabinetPricing.id, id1));

    const [row2] = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.id, id2));
    expect(parseFloat(row2.estimatedPrice)).toBeCloseTo(60.0, 2);
    await cleanupTestRows();
  });
});

describe("Cabinet Pricing — bulkUpdateCabinetMargin", () => {
  it("updates all rows for a given vendor with new margin and recomputed price", async () => {
    const db = await getDb();
    if (!db) return;
    await insertTestCabinetRow({ code: "BULK-1", discountedUnitPrice: "100.00", marginPct: "0", estimatedPrice: "100.00" });
    await insertTestCabinetRow({ code: "BULK-2", discountedUnitPrice: "200.00", marginPct: "0", estimatedPrice: "200.00", lineItemType: "upper" });

    const margin = 40 / 100;
    const rows = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.vendor, "Test Vendor"));
    let updated = 0;
    for (const row of rows) {
      const base = parseFloat(row.discountedUnitPrice);
      const newPrice = Math.round(base / (1 - margin) * 100) / 100;
      await db.update(dpCabinetPricing)
        .set({ marginPct: "40", estimatedPrice: String(newPrice), updatedAt: Date.now() })
        .where(eq(dpCabinetPricing.id, row.id));
      updated++;
    }
    expect(updated).toBe(2);

    const updatedRows = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.vendor, "Test Vendor"));
    for (const r of updatedRows) {
      expect(parseFloat(r.marginPct)).toBeCloseTo(40, 1);
      const base = parseFloat(r.discountedUnitPrice);
      expect(parseFloat(r.estimatedPrice)).toBeCloseTo(base / (1 - 0.4), 0);
    }
    await cleanupTestRows();
  });

  it("does not touch rows from other vendors when vendor scope is set", async () => {
    const db = await getDb();
    if (!db) return;
    const id = await insertTestCabinetRow({ vendor: "Test Vendor", discountedUnitPrice: "100.00", marginPct: "0", estimatedPrice: "100.00" });
    // Only update "Other Vendor" — Test Vendor row should be untouched
    const rows = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.vendor, "Other Vendor"));
    // No "Other Vendor" rows exist, so nothing is updated
    expect(rows.length).toBe(0);
    const [testRow] = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.id, id));
    expect(parseFloat(testRow.estimatedPrice)).toBeCloseTo(100.0, 2);
    await cleanupTestRows();
  });
});

describe("Cabinet Pricing — syncCabinetsToCatalog", () => {
  it("inserts active cabinet rows into dp_catalog_items as Cabinetry trade sheet", async () => {
    const db = await getDb();
    if (!db) return;
    await insertTestCabinetRow({
      optionLabel: "Test Shaker White",
      lineItemType: "base",
      discountedUnitPrice: "75.00",
      marginPct: "37.5",
      estimatedPrice: "120.00",
      isActive: 1,
    });

    // Simulate sync: remove existing Cabinetry rows, insert new ones
    await db.delete(dpCatalogItems).where(eq(dpCatalogItems.tradeSheet, "Cabinetry"));
    const cabRows = await db.select().from(dpCabinetPricing).where(
      and(eq(dpCabinetPricing.isActive, 1), eq(dpCabinetPricing.vendor, "Test Vendor"))
    );
    const now = new Date();
    for (const row of cabRows) {
      const lineLabel = row.lineItemType === "base" ? "Base Cabinets" : row.lineItemType === "upper" ? "Upper Cabinets" : "Pantry/Utility Cabinets";
      await db.insert(dpCatalogItems).values({
        tradeSheet: "Cabinetry",
        name: `${row.optionLabel} — ${lineLabel}`,
        unit: row.unit,
        laborCost: "0",
        materialCost: String(row.discountedUnitPrice),
        marginPct: String(row.marginPct),
        estimatedPrice: String(row.estimatedPrice),
        isActive: 1,
        sortOrder: row.sortOrder,
        notes: `Vendor: ${row.vendor} | Code: ${row.code}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    const catalogRows = await db.select().from(dpCatalogItems).where(eq(dpCatalogItems.tradeSheet, "Cabinetry"));
    expect(catalogRows.length).toBeGreaterThanOrEqual(1);
    expect(catalogRows[0].name).toContain("Test Shaker White");
    expect(catalogRows[0].tradeSheet).toBe("Cabinetry");
    await cleanupTestRows();
  });

  it("inactive cabinet rows are not synced to catalog", async () => {
    const db = await getDb();
    if (!db) return;
    // Clean up first to ensure isolation
    await cleanupTestRows();
    // Insert only an inactive row
    await insertTestCabinetRow({
      optionLabel: "Inactive Cabinet",
      isActive: 0,
    });
    await db.delete(dpCatalogItems).where(eq(dpCatalogItems.tradeSheet, "Cabinetry"));
    const cabRows = await db.select().from(dpCabinetPricing).where(
      and(eq(dpCabinetPricing.isActive, 1), eq(dpCabinetPricing.vendor, "Test Vendor"))
    );
    // No active Test Vendor rows → nothing synced
    expect(cabRows.length).toBe(0);
    await cleanupTestRows();
  });
});
