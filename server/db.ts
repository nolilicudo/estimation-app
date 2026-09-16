import { eq, asc, desc, sql, lt, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users,
  collections, colors, edgeOptions, accessories,
  laborTiers, laborLineItems, deliveryOptions, siteSettings,
  comparisonMaterials,
  demolitionOptions, footingOptions, concreteOptions, framingOptions, facadeOptions,
  type InsertCollection, type InsertColor, type InsertEdgeOption,
  type InsertAccessory, type InsertLaborTier, type InsertDeliveryOption,
  type InsertSiteSetting, type InsertComparisonMaterial,
  type InsertDemolitionOption, type InsertFootingOption, type InsertConcreteOption,
  type InsertFramingOption, type InsertFacadeOption,
  adminUsers,
  resinSurfaces, resinColors, waterproofingOptions,
  duradekColors, tileSizes, productSettings,
  rainEscapeOptions, soffitMaterials,
  steelJacketOptions, type InsertSteelJacketOption,
  type InsertResinSurface, type InsertResinColor, type InsertWaterproofingOption,
  type InsertDuradekColor, type InsertTileSize, type InsertProductSetting,
  type InsertRainEscapeOption, type InsertSoffitMaterial,
  type InsertLaborLineItem,
  orders, type InsertOrder, type Order,
  brochureRequests, type InsertBrochureRequest,
  cornersWasteRules, lumberItems,
  type InsertCornersWasteRule, type InsertLumberItem,
  joistSpanEntries, lvlBeamEntries, hotTubWeights, glulamBeamEntries,
  type InsertJoistSpanEntry, type InsertLvlBeamEntry, type InsertHotTubWeight, type InsertGlulamBeamEntry,
  railingOptions, type InsertRailingOption,
  spiralStairPricing, type InsertSpiralStairPricing,
  projectDetailOptions, type InsertProjectDetailOption,
  calculatorUsers, type InsertCalculatorUser, type CalculatorUser,
  frostFootingSizes, frostFootingPricing, frostFootingFormulas,
  type FrostFootingSize, type InsertFrostFootingSize,
  type FrostFootingPricing, type InsertFrostFootingPricing,
  type FrostFootingFormula, type InsertFrostFootingFormula,
  postWrapOptions, type PostWrapOption, type InsertPostWrapOption,
  postWrapLengthTiers, type PostWrapLengthTier, type InsertPostWrapLengthTier,
  designPackageItems, type DesignPackageItem, type InsertDesignPackageItem,
  designPackageCommission, type DesignPackageCommission, type InsertDesignPackageCommission,
  designPackageDiscounts, type DesignPackageDiscount, type InsertDesignPackageDiscount,
  dpFreeFeatures, type DpFreeFeature, type InsertDpFreeFeature,
  dpQuestionnaireQuestions, type DpQuestionnaireQuestion, type InsertDpQuestionnaireQuestion,
  dpProjectTypeSections, type DpProjectTypeSection, type InsertDpProjectTypeSection,
  initialConsultations, type InitialConsultation, type InsertInitialConsultation,
  mortgageRateCache, type MortgageRateCache, type InsertMortgageRateCache,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Strip the `ssl-mode` query param which mysql2 doesn't understand,
      // and instead pass ssl options explicitly for Aiven compatibility.
      const rawUrl = process.env.DATABASE_URL.replace(/[?&]ssl-mode=[^&]*/i, "");
      const pool = mysql.createPool({
        uri: rawUrl,
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// --- User helpers ---

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// --- Public config (read-only for calculator) ---

export async function getFullConfig() {
  const db = await getDb();
  if (!db) return null;

  const colRows = await db.select().from(collections).where(eq(collections.isActive, 1)).orderBy(asc(collections.sortOrder));
  const colorRows = await db.select().from(colors).where(eq(colors.isActive, 1)).orderBy(asc(colors.sortOrder));
  const edgeRows = await db.select().from(edgeOptions).where(eq(edgeOptions.isActive, 1)).orderBy(asc(edgeOptions.sortOrder));
  const accRows = await db.select().from(accessories).where(eq(accessories.isActive, 1)).orderBy(asc(accessories.sortOrder));
  const laborRows = await db.select().from(laborTiers).where(eq(laborTiers.isActive, 1)).orderBy(asc(laborTiers.sortOrder));
  const delivRows = await db.select().from(deliveryOptions).where(eq(deliveryOptions.isActive, 1)).orderBy(asc(deliveryOptions.sortOrder));
  const settingRows = await db.select().from(siteSettings);
  const compRows = await db.select().from(comparisonMaterials).where(eq(comparisonMaterials.isActive, 1)).orderBy(asc(comparisonMaterials.sortOrder));
  const demoRows = await db.select().from(demolitionOptions).where(eq(demolitionOptions.isActive, 1)).orderBy(asc(demolitionOptions.sortOrder));
  const footingRows = await db.select().from(footingOptions).where(eq(footingOptions.isActive, 1)).orderBy(asc(footingOptions.sortOrder));
  const concreteRows = await db.select().from(concreteOptions).where(eq(concreteOptions.isActive, 1)).orderBy(asc(concreteOptions.sortOrder));
  const framingRows = await db.select().from(framingOptions).where(eq(framingOptions.isActive, 1)).orderBy(asc(framingOptions.sortOrder));
  const facadeRows = await db.select().from(facadeOptions).where(eq(facadeOptions.isActive, 1)).orderBy(asc(facadeOptions.sortOrder));
  const resinSurfaceRows = await db.select().from(resinSurfaces).where(eq(resinSurfaces.isActive, 1)).orderBy(asc(resinSurfaces.sortOrder));
  const resinColorRows = await db.select().from(resinColors).where(eq(resinColors.isActive, 1)).orderBy(asc(resinColors.sortOrder));
  const wpRows = await db.select().from(waterproofingOptions).where(eq(waterproofingOptions.isActive, 1)).orderBy(asc(waterproofingOptions.sortOrder));
  const duradekColorRows = await db.select().from(duradekColors).where(eq(duradekColors.isActive, 1)).orderBy(asc(duradekColors.sortOrder));
  const tileSizeRows = await db.select().from(tileSizes).where(eq(tileSizes.isActive, 1)).orderBy(asc(tileSizes.sortOrder));
  const prodSettingRows = await db.select().from(productSettings);
  const rainEscapeRows = await db.select().from(rainEscapeOptions).where(eq(rainEscapeOptions.isActive, 1)).orderBy(asc(rainEscapeOptions.sortOrder));
  const soffitRows = await db.select().from(soffitMaterials).where(eq(soffitMaterials.isActive, 1)).orderBy(asc(soffitMaterials.sortOrder));
  const steelJacketRows = await db.select().from(steelJacketOptions).where(eq(steelJacketOptions.isActive, 1)).orderBy(asc(steelJacketOptions.sortOrder));
  const laborLineItemRows = await db.select().from(laborLineItems).where(eq(laborLineItems.isActive, 1)).orderBy(asc(laborLineItems.sortOrder));
  const cornersWasteRows = await db.select().from(cornersWasteRules).orderBy(asc(cornersWasteRules.corners));
  const lumberItemRows = await db.select().from(lumberItems).where(eq(lumberItems.isActive, 1)).orderBy(asc(lumberItems.sortOrder));

  const settingsMap: Record<string, string> = {};
  for (const s of settingRows) {
    settingsMap[s.settingKey] = s.settingValue;
  }

  return {
    collections: colRows.map(c => ({
      ...c,
      colors: colorRows
        .filter(clr => clr.collectionId === c.id)
        .map(clr => ({
          id: clr.slug,
          name: clr.name,
          hex: clr.hex,
          pricePerSqft: Number(clr.pricePerSqft),
        })),
    })),
    edgeOptions: edgeRows.map(e => ({
      id: e.slug,
      name: e.name,
      pricePerLinearFt: Number(e.pricePerLinearFt),
      collection: e.collectionSlug,
    })),
    accessories: accRows.map(a => ({
      id: a.slug,
      name: a.name,
      unit: a.unit,
      pricePerUnit: Number(a.pricePerUnit),
      description: a.description,
      requiredFor: a.requiredForCollections,
      isOptional: a.isOptional === 1,
      showInScope: a.showInScope === 1,
    })),
    laborTiers: laborRows.map(l => {
      const laborCost = Number(l.laborCostPerSqft);
      const margin = Number(l.marginPercent);
      // If both laborCost and margin are set, derive the customer price
      const derivedPrice = (laborCost > 0 && margin > 0 && margin < 100)
        ? laborCost / (1 - margin / 100)
        : Number(l.pricePerSqft);
      const lineItems = laborLineItemRows
        .filter(li => li.tierId === l.id)
        .map(li => ({
          id: li.id,
          name: li.name,
          description: li.description,
          amount: Number(li.amount),
          unit: li.unit as 'flat' | 'sqft' | 'linear_ft',
          sortOrder: li.sortOrder,
        }));
      return {
        id: l.slug,
        dbId: l.id,
        name: l.name,
        description: l.description,
        pricePerSqft: derivedPrice,
        laborCostPerSqft: laborCost,
        marginPercent: margin,
        minimumPrice: Number(l.minimumPrice),
        collectionSlug: l.collectionSlug ?? null,
        lineItems,
      };
    }),
    deliveryOptions: delivRows.map(d => ({
      id: d.slug,
      name: d.name,
      description: d.description,
      price: Number(d.price),
    })),
    comparisonMaterials: compRows.map(m => ({
      id: m.slug,
      name: m.name,
      description: m.description,
      materialCostPerSqft: Number(m.materialCostPerSqft),
      laborCostPerSqft: Number(m.laborCostPerSqft),
      annualMaintenanceCostPerSqft: Number(m.annualMaintenanceCostPerSqft),
      lifespanYears: m.lifespanYears,
      warrantyYears: m.warrantyYears,
      colorHex: m.colorHex,
      pros: m.pros || [],
      cons: m.cons || [],
      showByDefault: m.showByDefault === 1,
    })),
    settings: settingsMap,
    demolitionOptions: demoRows.map(d => ({
      id: d.slug,
      name: d.name,
      description: d.description,
      pricePerSqft: Number(d.pricePerSqft),
    })),
    footingOptions: footingRows.map(f => ({
      id: f.slug,
      name: f.name,
      description: f.description,
      pricePerUnit: Number(f.pricePerUnit),
      unit: f.unit,
    })),
    concreteOptions: concreteRows.map(c => ({
      id: c.slug,
      name: c.name,
      description: c.description,
      pricePerUnit: Number(c.pricePerUnit),
      unit: c.unit,
    })),
    framingOptions: framingRows.map(f => ({
      id: f.slug,
      name: f.name,
      description: f.description,
      /** Appalachian rate (and default) */
      pricePerSqft: Number(f.pricePerSqft),
      /** Rainier-specific rate; null means use pricePerSqft */
      rainierRate: f.rainierRate != null ? Number(f.rainierRate) : null,
      /** Minimum charge when selected (0 = no minimum) */
      minimumPrice: Number(f.minimumPrice ?? 0),
    })),
    facadeOptions: facadeRows.map(f => ({
      id: f.slug,
      name: f.name,
      description: f.description,
      pricePerSqft: Number(f.pricePerSqft),
      minimumPrice: Number(f.minimumPrice ?? 0),
    })),
    resinSurfaces: resinSurfaceRows.map(s => ({
      id: s.slug,
      name: s.name,
      description: s.description,
      pricePerSqft: Number(s.pricePerSqft),
      requiresWaterproofing: s.requiresWaterproofing === 1,
    })),
    resinColors: resinColorRows.map(c => ({
      id: c.slug,
      name: c.name,
      hex: c.hex,
      category: c.category,
      pricePerSqft: Number(c.pricePerSqft),
    })),
    waterproofingOptions: wpRows.map(w => ({
      id: w.slug,
      name: w.name,
      description: w.description,
      pricePerSqft: Number(w.pricePerSqft),
    })),
    duradekColors: duradekColorRows.map(d => ({
      id: d.slug,
      name: d.name,
      series: d.series,
      hex: d.hex,
      pricePerSqft: Number(d.pricePerSqft),
    })),
    tileSizes: tileSizeRows.map(t => ({
      id: t.slug,
      name: t.name,
      description: t.description,
      laborPerSqft: Number(t.laborPerSqft),
      materialPerSqft: Number(t.materialPerSqft),
    })),
    productSettings: prodSettingRows.reduce((acc, p) => {
      if (!acc[p.productType]) acc[p.productType] = {};
      acc[p.productType][p.settingKey] = p.settingValue;
      return acc;
    }, {} as Record<string, Record<string, string>>),
    rainEscapeOptions: rainEscapeRows.map(r => ({
      id: r.slug,
      name: r.name,
      description: r.description,
      gutterPricePerLinearFt: Number(r.gutterPricePerLinearFt),
      systemPricePerSqft: Number(r.systemPricePerSqft),
      laborPricePerSqft: Number(r.laborPricePerSqft),
    })),
    soffitMaterials: soffitRows.map(s => ({
      id: s.slug,
      name: s.name,
      description: s.description,
      pricePerSqft: Number(s.pricePerSqft),
      laborPricePerSqft: Number(s.laborPricePerSqft),
    })),
    steelJacketOptions: steelJacketRows.map(s => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      materialCostPerSqft: Number(s.materialCostPerSqft),
      installCostPerSqft: Number(s.installCostPerSqft),
      marginPct: Number(s.marginPct),
      pricePerSqft: Number(s.pricePerSqft),
      photoUrls: s.photoUrls || [],
    })),
    cornersWasteRules: cornersWasteRows.map(r => ({
      id: r.id,
      corners: r.corners,
      allNinetyDegrees: r.allNinetyDegrees === 1,
      wastePercent: Number(r.wastePercent),
    })),
    railingOptions: (await db.select().from(railingOptions).where(eq(railingOptions.isActive, 1)).orderBy(asc(railingOptions.sortOrder))).map(r => ({
      id: r.id,
      name: r.name,
      railingType: r.railingType,
      orientation: r.orientation,
      description: r.description,
      pricePerLf: Number(r.pricePerLf),
      costPerLf: Number(r.costPerLf),
      installCostPerLf: Number(r.installCostPerLf ?? 0),
      marginPct: Number(r.marginPct),
      colorVariant: r.colorVariant ?? null,
      sortOrder: r.sortOrder,
    })),
    spiralStairPricing: (await db.select().from(spiralStairPricing).orderBy(asc(spiralStairPricing.diameter), asc(spiralStairPricing.treadMaterial))).map(s => ({
      id: s.id,
      diameter: s.diameter,
      treadMaterial: s.treadMaterial,
      costPrice: Number(s.costPrice),
      marginPct: Number(s.marginPct),
      price: Number(s.price),
    })),
    postWrapOptions: (await db.select().from(postWrapOptions).where(eq(postWrapOptions.isActive, 1)).orderBy(asc(postWrapOptions.sortOrder))).map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      pricePerLf: Number(p.pricePerLf),
      laborPricePerLf: Number(p.laborPricePerLf),
      laborPricePerPost: Number(p.laborPricePerPost ?? 0),
      laborPricePerBeamLf: Number(p.laborPricePerBeamLf ?? 0),
    })),
    postWrapLengthTiers: (await db.select().from(postWrapLengthTiers).orderBy(asc(postWrapLengthTiers.postWrapOptionId), asc(postWrapLengthTiers.lengthFt))).map(t => ({
      id: t.id,
      postWrapOptionId: t.postWrapOptionId,
      lengthFt: t.lengthFt,
      materialCostPerPiece: Number(t.materialCostPerPiece),
      materialPricePerPiece: Number(t.materialPricePerPiece),
      sortOrder: t.sortOrder,
    })),
    lumberItems: lumberItemRows.map(l => ({
      id: l.id,
      name: l.name,
      description: l.description,
      unit: l.unit,
      category: l.category,
      costPrice: Number(l.costPrice),
      markupMultiplier: Number(l.markupMultiplier),
      displayPrice: Number(l.displayPrice),
    })),
    designPackageItems: (await db.select().from(designPackageItems).where(eq(designPackageItems.isActive, 1)).orderBy(asc(designPackageItems.sortOrder))).map(d => ({
      id: d.id,
      name: d.name,
      description: d.description ?? '',
      pricingType: d.pricingType as 'sqft' | 'flat' | 'rendering',
      costPerSqft: Number(d.costPerSqft),
      flatCost: Number(d.flatCost),
      markupPct: Number(d.markupPct),
      projectTypes: d.projectTypes,
      renderingType: d.renderingType ?? null,
      designHours: Number(d.designHours),
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    })),
    designPackageCommission: (await db.select().from(designPackageCommission).orderBy(asc(designPackageCommission.projectType))).map(c => ({
      projectType: c.projectType,
      label: c.label,
      commissionAmount: Number(c.commissionAmount),
    })),
    designPackageDiscounts: (await db.select().from(designPackageDiscounts).orderBy(asc(designPackageDiscounts.discountType))).map(d => ({
      id: d.id,
      discountType: d.discountType,
      name: d.name,
      discountPct: Number(d.discountPct),
      isActive: d.isActive,
    })),
  };
}

// --- Admin config (full CRUD) ---

export async function getAdminConfig() {
  const db = await getDb();
  if (!db) return null;

  const [colRows, colorRows, edgeRows, accRows, laborRows, delivRows, settingRows, compMaterialRows, demoRows, footingRows, concreteRows, framingRows, facadeRows] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.sortOrder)),
    db.select().from(colors).orderBy(asc(colors.sortOrder)),
    db.select().from(edgeOptions).orderBy(asc(edgeOptions.sortOrder)),
    db.select().from(accessories).orderBy(asc(accessories.sortOrder)),
    db.select().from(laborTiers).orderBy(asc(laborTiers.sortOrder)),
    db.select().from(deliveryOptions).orderBy(asc(deliveryOptions.sortOrder)),
    db.select().from(siteSettings),
    db.select().from(comparisonMaterials).orderBy(asc(comparisonMaterials.sortOrder)),
    db.select().from(demolitionOptions).orderBy(asc(demolitionOptions.sortOrder)),
    db.select().from(footingOptions).orderBy(asc(footingOptions.sortOrder)),
    db.select().from(concreteOptions).orderBy(asc(concreteOptions.sortOrder)),
    db.select().from(framingOptions).orderBy(asc(framingOptions.sortOrder)),
    db.select().from(facadeOptions).orderBy(asc(facadeOptions.sortOrder)),
  ]);

  return {
    collections: colRows,
    colors: colorRows,
    edgeOptions: edgeRows,
    accessories: accRows,
    laborTiers: laborRows,
    deliveryOptions: delivRows,
    settings: settingRows,
    comparisonMaterials: compMaterialRows,
    demolitionOptions: demoRows,
    footingOptions: footingRows,
    concreteOptions: concreteRows,
    framingOptions: framingRows,
    facadeOptions: facadeRows,
    resinSurfaces: await db.select().from(resinSurfaces).orderBy(asc(resinSurfaces.sortOrder)),
    resinColors: await db.select().from(resinColors).orderBy(asc(resinColors.sortOrder)),
    waterproofingOptions: await db.select().from(waterproofingOptions).orderBy(asc(waterproofingOptions.sortOrder)),
    duradekColors: await db.select().from(duradekColors).orderBy(asc(duradekColors.sortOrder)),
    tileSizes: await db.select().from(tileSizes).orderBy(asc(tileSizes.sortOrder)),
    productSettings: await db.select().from(productSettings),
    rainEscapeOptions: await db.select().from(rainEscapeOptions).orderBy(asc(rainEscapeOptions.sortOrder)),
    soffitMaterials: await db.select().from(soffitMaterials).orderBy(asc(soffitMaterials.sortOrder)),
    steelJacketOptions: await db.select().from(steelJacketOptions).orderBy(asc(steelJacketOptions.sortOrder)),
    laborLineItems: await db.select().from(laborLineItems).orderBy(asc(laborLineItems.sortOrder)),
    cornersWasteRules: await db.select().from(cornersWasteRules).orderBy(asc(cornersWasteRules.corners)),
    lumberItems: await db.select().from(lumberItems).orderBy(asc(lumberItems.sortOrder)),
    railingOptions: await db.select().from(railingOptions).orderBy(asc(railingOptions.sortOrder)),
    spiralStairPricing: await db.select().from(spiralStairPricing).orderBy(asc(spiralStairPricing.diameter), asc(spiralStairPricing.treadMaterial)),
    postWrapOptions: await db.select().from(postWrapOptions).orderBy(asc(postWrapOptions.sortOrder)),
    postWrapLengthTiers: await db.select().from(postWrapLengthTiers).orderBy(asc(postWrapLengthTiers.postWrapOptionId), asc(postWrapLengthTiers.lengthFt)),
    designPackageItems: await db.select().from(designPackageItems).orderBy(asc(designPackageItems.sortOrder)),
    designPackageCommission: await db.select().from(designPackageCommission).orderBy(asc(designPackageCommission.projectType)),
    designPackageDiscounts: await db.select().from(designPackageDiscounts).orderBy(asc(designPackageDiscounts.discountType)),
  };
}

// --- Admin update helpers ---

export async function updateCollection(id: number, data: Partial<InsertCollection>) {
  const db = await getDb();
  if (!db) return;
  await db.update(collections).set(data).where(eq(collections.id, id));
}

export async function createCollection(data: InsertCollection) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(collections).values(data);
  return result[0].insertId;
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(colors).where(eq(colors.collectionId, id));
  await db.delete(collections).where(eq(collections.id, id));
}

export async function updateColor(id: number, data: Partial<InsertColor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(colors).set(data).where(eq(colors.id, id));
}

export async function createColor(data: InsertColor) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(colors).values(data);
  return result[0].insertId;
}

export async function deleteColor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(colors).where(eq(colors.id, id));
}

export async function updateEdgeOption(id: number, data: Partial<InsertEdgeOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(edgeOptions).set(data).where(eq(edgeOptions.id, id));
}

export async function createEdgeOption(data: InsertEdgeOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(edgeOptions).values(data);
  return result[0].insertId;
}

export async function deleteEdgeOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(edgeOptions).where(eq(edgeOptions.id, id));
}

export async function updateAccessory(id: number, data: Partial<InsertAccessory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(accessories).set(data).where(eq(accessories.id, id));
}

export async function createAccessory(data: InsertAccessory) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(accessories).values(data);
  return result[0].insertId;
}

export async function deleteAccessory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(accessories).where(eq(accessories.id, id));
}

export async function updateLaborTier(id: number, data: Partial<InsertLaborTier>) {
  const db = await getDb();
  if (!db) return;
  // If laborCostPerSqft and marginPercent are both provided, auto-compute pricePerSqft
  const laborCost = data.laborCostPerSqft !== undefined ? Number(data.laborCostPerSqft) : null;
  const margin = data.marginPercent !== undefined ? Number(data.marginPercent) : null;
  if (laborCost !== null && margin !== null && laborCost > 0 && margin > 0 && margin < 100) {
    data.pricePerSqft = String((laborCost / (1 - margin / 100)).toFixed(2)) as any;
  }
  await db.update(laborTiers).set(data).where(eq(laborTiers.id, id));
}

export async function createLaborTier(data: InsertLaborTier) {
  const db = await getDb();
  if (!db) return;
  // If laborCostPerSqft and marginPercent are both provided, auto-compute pricePerSqft
  const laborCost = data.laborCostPerSqft !== undefined ? Number(data.laborCostPerSqft) : 0;
  const margin = data.marginPercent !== undefined ? Number(data.marginPercent) : 0;
  if (laborCost > 0 && margin > 0 && margin < 100) {
    data.pricePerSqft = String((laborCost / (1 - margin / 100)).toFixed(2)) as any;
  }
  const result = await db.insert(laborTiers).values(data);
  return result[0].insertId;
}

export async function deleteLaborTier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(laborTiers).where(eq(laborTiers.id, id));
}

export async function updateDeliveryOption(id: number, data: Partial<InsertDeliveryOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(deliveryOptions).set(data).where(eq(deliveryOptions.id, id));
}

export async function createDeliveryOption(data: InsertDeliveryOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(deliveryOptions).values(data);
  return result[0].insertId;
}

export async function deleteDeliveryOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(deliveryOptions).where(eq(deliveryOptions.id, id));
}

export async function updateSiteSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(siteSettings).set({ settingValue: value }).where(eq(siteSettings.settingKey, key));
}

export async function bulkUpdateSettings(updates: { key: string; value: string }[]) {
  const db = await getDb();
  if (!db) return;
  for (const u of updates) {
    await db.update(siteSettings).set({ settingValue: u.value }).where(eq(siteSettings.settingKey, u.key));
  }
}

// --- Comparison material helpers ---

export async function getComparisonMaterials() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comparisonMaterials).orderBy(asc(comparisonMaterials.sortOrder));
}

export async function updateComparisonMaterial(id: number, data: Partial<InsertComparisonMaterial>) {
  const db = await getDb();
  if (!db) return;
  await db.update(comparisonMaterials).set(data).where(eq(comparisonMaterials.id, id));
}

export async function createComparisonMaterial(data: InsertComparisonMaterial) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(comparisonMaterials).values(data);
  return result[0].insertId;
}

export async function deleteComparisonMaterial(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(comparisonMaterials).where(eq(comparisonMaterials.id, id));
}

// --- Demo & Rebuild CRUD helpers ---

export async function updateDemolitionOption(id: number, data: Partial<InsertDemolitionOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(demolitionOptions).set(data).where(eq(demolitionOptions.id, id));
}

export async function createDemolitionOption(data: InsertDemolitionOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(demolitionOptions).values(data);
  return result[0].insertId;
}

export async function deleteDemolitionOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(demolitionOptions).where(eq(demolitionOptions.id, id));
}

export async function updateFootingOption(id: number, data: Partial<InsertFootingOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(footingOptions).set(data).where(eq(footingOptions.id, id));
}

export async function createFootingOption(data: InsertFootingOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(footingOptions).values(data);
  return result[0].insertId;
}

export async function deleteFootingOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(footingOptions).where(eq(footingOptions.id, id));
}

export async function updateConcreteOption(id: number, data: Partial<InsertConcreteOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(concreteOptions).set(data).where(eq(concreteOptions.id, id));
}

export async function createConcreteOption(data: InsertConcreteOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(concreteOptions).values(data);
  return result[0].insertId;
}

export async function deleteConcreteOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(concreteOptions).where(eq(concreteOptions.id, id));
}

export async function updateFramingOption(id: number, data: Partial<InsertFramingOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(framingOptions).set(data).where(eq(framingOptions.id, id));
}

export async function createFramingOption(data: InsertFramingOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(framingOptions).values(data);
  return result[0].insertId;
}

export async function deleteFramingOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(framingOptions).where(eq(framingOptions.id, id));
}

export async function updateFacadeOption(id: number, data: Partial<InsertFacadeOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(facadeOptions).set(data).where(eq(facadeOptions.id, id));
}

export async function createFacadeOption(data: InsertFacadeOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(facadeOptions).values(data);
  return result[0].insertId;
}

export async function deleteFacadeOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(facadeOptions).where(eq(facadeOptions.id, id));
}

// --- Admin Users (custom email/password auth) ---
export async function getAdminUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAdminUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminUsers).set({ lastSignedIn: new Date() }).where(eq(adminUsers.id, id));
}

// --- Resin Rock CRUD helpers ---

export async function updateResinSurface(id: number, data: Partial<InsertResinSurface>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resinSurfaces).set(data).where(eq(resinSurfaces.id, id));
}

export async function createResinSurface(data: InsertResinSurface) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(resinSurfaces).values(data);
  return result[0].insertId;
}

export async function deleteResinSurface(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(resinSurfaces).where(eq(resinSurfaces.id, id));
}

export async function updateResinColor(id: number, data: Partial<InsertResinColor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(resinColors).set(data).where(eq(resinColors.id, id));
}

export async function createResinColor(data: InsertResinColor) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(resinColors).values(data);
  return result[0].insertId;
}

export async function deleteResinColor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(resinColors).where(eq(resinColors.id, id));
}

export async function updateWaterproofingOption(id: number, data: Partial<InsertWaterproofingOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(waterproofingOptions).set(data).where(eq(waterproofingOptions.id, id));
}

export async function createWaterproofingOption(data: InsertWaterproofingOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(waterproofingOptions).values(data);
  return result[0].insertId;
}

export async function deleteWaterproofingOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(waterproofingOptions).where(eq(waterproofingOptions.id, id));
}

// --- Duradek CRUD helpers ---

export async function updateDuradekColor(id: number, data: Partial<InsertDuradekColor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(duradekColors).set(data).where(eq(duradekColors.id, id));
}

export async function createDuradekColor(data: InsertDuradekColor) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(duradekColors).values(data);
  return result[0].insertId;
}

export async function deleteDuradekColor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(duradekColors).where(eq(duradekColors.id, id));
}

// --- Tiledek CRUD helpers ---

export async function updateTileSize(id: number, data: Partial<InsertTileSize>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tileSizes).set(data).where(eq(tileSizes.id, id));
}

export async function createTileSize(data: InsertTileSize) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(tileSizes).values(data);
  return result[0].insertId;
}

export async function deleteTileSize(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tileSizes).where(eq(tileSizes.id, id));
}

// --- Product Settings CRUD helpers ---

export async function updateProductSetting(id: number, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(productSettings).set({ settingValue: value }).where(eq(productSettings.id, id));
}

export async function createProductSetting(data: InsertProductSetting) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(productSettings).values(data);
  return result[0].insertId;
}

export async function deleteProductSetting(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(productSettings).where(eq(productSettings.id, id));
}

// --- Rain Escape Options CRUD helpers ---
export async function updateRainEscapeOption(id: number, data: Partial<InsertRainEscapeOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(rainEscapeOptions).set(data).where(eq(rainEscapeOptions.id, id));
}
export async function createRainEscapeOption(data: InsertRainEscapeOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(rainEscapeOptions).values(data);
  return result[0].insertId;
}
export async function deleteRainEscapeOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rainEscapeOptions).where(eq(rainEscapeOptions.id, id));
}

// --- Soffit Materials CRUD helpers ---
export async function updateSoffitMaterial(id: number, data: Partial<InsertSoffitMaterial>) {
  const db = await getDb();
  if (!db) return;
  await db.update(soffitMaterials).set(data).where(eq(soffitMaterials.id, id));
}
export async function createSoffitMaterial(data: InsertSoffitMaterial) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(soffitMaterials).values(data);
  return result[0].insertId;
}
export async function deleteSoffitMaterial(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(soffitMaterials).where(eq(soffitMaterials.id, id));
}

// --- Labor Line Items CRUD helpers ---

export async function getLaborLineItemsByTier(tierId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(laborLineItems).where(eq(laborLineItems.tierId, tierId)).orderBy(asc(laborLineItems.sortOrder));
}

export async function updateLaborLineItem(id: number, data: Partial<InsertLaborLineItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(laborLineItems).set(data).where(eq(laborLineItems.id, id));
}

export async function createLaborLineItem(data: InsertLaborLineItem) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(laborLineItems).values(data);
  return result[0].insertId;
}

export async function deleteLaborLineItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(laborLineItems).where(eq(laborLineItems.id, id));
}

// --- Orders ---
export async function createOrder(data: InsertOrder): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function getOrderById(id: number): Promise<Order | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(orders).where(eq(orders.id, id));
  return rows[0] ?? null;
}

export async function getAllOrders(): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

// --- Brochure Requests ---
export async function createBrochureRequest(data: InsertBrochureRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brochureRequests).values(data);
  return result[0].insertId;
}

export async function getAllBrochureRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brochureRequests).orderBy(desc(brochureRequests.createdAt));
}

// --- Corners Waste Rules CRUD helpers ---
export async function getCornersWasteRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cornersWasteRules).orderBy(asc(cornersWasteRules.corners));
}

export async function updateCornersWasteRule(id: number, data: Partial<InsertCornersWasteRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cornersWasteRules).set(data).where(eq(cornersWasteRules.id, id));
}

export async function createCornersWasteRule(data: InsertCornersWasteRule) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(cornersWasteRules).values(data);
  return result[0].insertId;
}

export async function deleteCornersWasteRule(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cornersWasteRules).where(eq(cornersWasteRules.id, id));
}

// --- Lumber Items CRUD helpers ---
export async function getLumberItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lumberItems).orderBy(asc(lumberItems.sortOrder));
}

export async function updateLumberItem(id: number, data: Partial<InsertLumberItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lumberItems).set(data).where(eq(lumberItems.id, id));
}

export async function createLumberItem(data: InsertLumberItem, insertAfterSortOrder?: number) {
  const db = await getDb();
  if (!db) return;

  const category = data.category || "other";

  if (insertAfterSortOrder !== undefined) {
    // Bump all items in this category with sortOrder > insertAfterSortOrder up by 1
    await db.execute(
      sql`UPDATE lumber_items SET sortOrder = sortOrder + 1 WHERE category = ${category} AND sortOrder > ${insertAfterSortOrder}`
    );
    const newSortOrder = insertAfterSortOrder + 1;
    const result = await db.insert(lumberItems).values({ ...data, sortOrder: newSortOrder });
    return result[0].insertId;
  } else {
    // Auto-assign to bottom of category
    const rows = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sortOrder), -1)` })
      .from(lumberItems)
      .where(eq(lumberItems.category, category));
    const maxOrder = rows[0]?.maxOrder ?? -1;
    const result = await db.insert(lumberItems).values({ ...data, sortOrder: maxOrder + 1 });
    return result[0].insertId;
  }
}

export async function deleteLumberItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lumberItems).where(eq(lumberItems.id, id));
}

// --- Joist Span Entries CRUD helpers ---
export async function getJoistSpanEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(joistSpanEntries).orderBy(asc(joistSpanEntries.sortOrder));
}
export async function createJoistSpanEntry(data: InsertJoistSpanEntry) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(joistSpanEntries).values(data);
  return result[0].insertId;
}
export async function updateJoistSpanEntry(id: number, data: Partial<InsertJoistSpanEntry>) {
  const db = await getDb();
  if (!db) return;
  await db.update(joistSpanEntries).set(data).where(eq(joistSpanEntries.id, id));
}
export async function deleteJoistSpanEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(joistSpanEntries).where(eq(joistSpanEntries.id, id));
}

// --- LVL Beam Entries CRUD helpers ---
export async function getLvlBeamEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lvlBeamEntries).orderBy(asc(lvlBeamEntries.sortOrder));
}
export async function createLvlBeamEntry(data: InsertLvlBeamEntry) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(lvlBeamEntries).values(data);
  return result[0].insertId;
}
export async function updateLvlBeamEntry(id: number, data: Partial<InsertLvlBeamEntry>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lvlBeamEntries).set(data).where(eq(lvlBeamEntries.id, id));
}
export async function deleteLvlBeamEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lvlBeamEntries).where(eq(lvlBeamEntries.id, id));
}

// --- Hot Tub Weights CRUD helpers ---
export async function getHotTubWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hotTubWeights).orderBy(asc(hotTubWeights.sortOrder));
}
export async function createHotTubWeight(data: InsertHotTubWeight) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(hotTubWeights).values(data);
  return result[0].insertId;
}
export async function updateHotTubWeight(id: number, data: Partial<InsertHotTubWeight>) {
  const db = await getDb();
  if (!db) return;
  await db.update(hotTubWeights).set(data).where(eq(hotTubWeights.id, id));
}
export async function deleteHotTubWeight(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(hotTubWeights).where(eq(hotTubWeights.id, id));
}

// --- Glulam Beam Entries CRUD helpers ---
export async function getGlulamBeamEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(glulamBeamEntries)
    .orderBy(asc(glulamBeamEntries.widthIn), asc(glulamBeamEntries.depthIn), asc(glulamBeamEntries.spanFt));
}
export async function createGlulamBeamEntry(data: InsertGlulamBeamEntry) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(glulamBeamEntries).values(data);
  return result[0].insertId;
}
export async function updateGlulamBeamEntry(id: number, data: Partial<InsertGlulamBeamEntry>) {
  const db = await getDb();
  if (!db) return;
  await db.update(glulamBeamEntries).set(data).where(eq(glulamBeamEntries.id, id));
}
export async function deleteGlulamBeamEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(glulamBeamEntries).where(eq(glulamBeamEntries.id, id));
}

// --- Railing Options CRUD helpers ---
export async function getRailingOptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(railingOptions).orderBy(asc(railingOptions.sortOrder));
}
export async function createRailingOption(data: InsertRailingOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(railingOptions).values(data);
  return result[0].insertId;
}
export async function updateRailingOption(id: number, data: Partial<InsertRailingOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(railingOptions).set(data).where(eq(railingOptions.id, id));
}
export async function deleteRailingOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(railingOptions).where(eq(railingOptions.id, id));
}
// --- Spiral Stair Pricing CRUD helpers ---
export async function getAllSpiralStairPricing() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(spiralStairPricing).orderBy(asc(spiralStairPricing.diameter), asc(spiralStairPricing.treadMaterial));
}
export async function updateSpiralStairPricing(id: number, data: Partial<InsertSpiralStairPricing>) {
  const db = await getDb();
  if (!db) return;
  await db.update(spiralStairPricing).set(data).where(eq(spiralStairPricing.id, id));
}

// --- Sign Request helpers (virtual contract signing via email link) ---
import { signRequests, type InsertSignRequest, type SignRequest } from "../drizzle/schema";

export async function createSignRequest(data: InsertSignRequest): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(signRequests).values(data);
  return result[0].insertId;
}

export async function getSignRequestByToken(token: string): Promise<SignRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(signRequests).where(eq(signRequests.token, token)).limit(1);
  return rows[0];
}

export async function getSignRequestById(id: number): Promise<SignRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(signRequests).where(eq(signRequests.id, id)).limit(1);
  return rows[0];
}

export async function updateSignRequest(id: number, data: Partial<InsertSignRequest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(signRequests).set(data).where(eq(signRequests.id, id));
}

export async function getAllSignRequests(): Promise<SignRequest[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(signRequests).orderBy(signRequests.createdAt);
  return rows.reverse(); // newest first
}

export async function getPendingSignRequestsOlderThan(cutoffDate: Date): Promise<SignRequest[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(signRequests)
    .where(and(
      eq(signRequests.status, "pending"),
      lt(signRequests.createdAt, cutoffDate)
    ));
  return rows;
}

// --- Project Detail Options ---

export async function getProjectDetailOptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectDetailOptions).orderBy(projectDetailOptions.sortOrder);
}

export async function createProjectDetailOption(data: { label: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(projectDetailOptions).values({
    label: data.label,
    sortOrder: data.sortOrder ?? 0,
    isActive: 1,
  });
  return (result[0] as any).insertId as number;
}

export async function updateProjectDetailOption(id: number, data: Partial<InsertProjectDetailOption>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(projectDetailOptions).set(data).where(eq(projectDetailOptions.id, id));
}

export async function deleteProjectDetailOption(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(projectDetailOptions).where(eq(projectDetailOptions.id, id));
}

import { sentEmails, type SentEmail, type InsertSentEmail, contractTemplates, type ContractTemplate, type InsertContractTemplate } from "../drizzle/schema";

// --- Sent Emails ---
export async function createSentEmail(data: InsertSentEmail): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(sentEmails).values(data);
  return (result[0] as any).insertId as number;
}

export async function getAllSentEmails(): Promise<SentEmail[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  return rows;
}

export async function getSentEmailById(id: number): Promise<SentEmail | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(sentEmails).where(eq(sentEmails.id, id)).limit(1);
  return rows[0];
}

export async function deleteSentEmail(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(sentEmails).where(eq(sentEmails.id, id));
  return true;
}

export async function getRecentSentEmailByCustomer(customerEmail: string): Promise<SentEmail | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(sentEmails)
    .where(eq(sentEmails.customerEmail, customerEmail))
    .orderBy(desc(sentEmails.sentAt))
    .limit(1);
  return rows[0];
}

export async function updateSentEmailJobtreadId(id: number, jobtreadJobId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.update(sentEmails).set({ jobtreadJobId }).where(eq(sentEmails.id, id));
  return true;
}

// --- Contract Templates ---
export async function getAllContractTemplates(): Promise<ContractTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractTemplates).orderBy(asc(contractTemplates.name));
}

export async function getContractTemplateById(id: number): Promise<ContractTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id)).limit(1);
  return rows[0];
}

export async function createContractTemplate(data: InsertContractTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contractTemplates).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateContractTemplate(id: number, data: Partial<InsertContractTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contractTemplates).set(data).where(eq(contractTemplates.id, id));
}

export async function deleteContractTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contractTemplates).where(eq(contractTemplates.id, id));
}

// --- Calculator Users ---
export async function getAllCalculatorUsers(): Promise<CalculatorUser[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calculatorUsers).orderBy(asc(calculatorUsers.name));
}

export async function getCalculatorUserByPin(pin: string): Promise<CalculatorUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(calculatorUsers)
    .where(and(eq(calculatorUsers.pin, pin), eq(calculatorUsers.isActive, 1)))
    .limit(1);
  return rows[0];
}

export async function createCalculatorUser(data: InsertCalculatorUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(calculatorUsers).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateCalculatorUser(id: number, data: Partial<InsertCalculatorUser>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(calculatorUsers).set(data).where(eq(calculatorUsers.id, id));
}

export async function deleteCalculatorUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(calculatorUsers).where(eq(calculatorUsers.id, id));
}

// --- Scoped queries for calculator user role/permission system ---

export async function getCalculatorUserById(id: number): Promise<CalculatorUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(calculatorUsers).where(eq(calculatorUsers.id, id)).limit(1);
  return rows[0];
}

export async function getCalculatorUsersByManagerId(managerId: number): Promise<CalculatorUser[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calculatorUsers).where(eq(calculatorUsers.managerId, managerId)).orderBy(asc(calculatorUsers.name));
}

/**
 * Get sign requests visible to a calculator user based on their role:
 * - super_admin: all records
 * - manager: their own + all direct reps
 * - rep: only their own
 */
export async function getScopedSignRequests(
  calUser: CalculatorUser,
  allUsers: CalculatorUser[]
): Promise<SignRequest[]> {
  const db = await getDb();
  if (!db) return [];
  if (calUser.role === "super_admin") {
    return db.select().from(signRequests).orderBy(desc(signRequests.createdAt));
  }
  const visibleIds: number[] = [calUser.id];
  if (calUser.role === "manager") {
    for (const u of allUsers) {
      if (u.managerId === calUser.id) visibleIds.push(u.id);
    }
  }
  const { inArray } = await import("drizzle-orm");
  return db.select().from(signRequests)
    .where(inArray(signRequests.assignedUserId, visibleIds))
    .orderBy(desc(signRequests.createdAt));
}

/**
 * Get sent emails visible to a calculator user based on their role.
 */
export async function getScopedSentEmails(
  calUser: CalculatorUser,
  allUsers: CalculatorUser[]
): Promise<SentEmail[]> {
  const db = await getDb();
  if (!db) return [];
  if (calUser.role === "super_admin") {
    return db.select().from(sentEmails).orderBy(desc(sentEmails.sentAt));
  }
  const visibleIds: number[] = [calUser.id];
  if (calUser.role === "manager") {
    for (const u of allUsers) {
      if (u.managerId === calUser.id) visibleIds.push(u.id);
    }
  }
  const { inArray } = await import("drizzle-orm");
  return db.select().from(sentEmails)
    .where(inArray(sentEmails.assignedUserId, visibleIds))
    .orderBy(desc(sentEmails.sentAt));
}

// ─── Frost Footing Pricing CRUD ─────────────────────────────────────────────

export async function getAllFrostFootingPricing(): Promise<FrostFootingPricing[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(frostFootingPricing).orderBy(asc(frostFootingPricing.sortOrder));
}

export async function updateFrostFootingPricing(id: number, data: Partial<InsertFrostFootingPricing>) {
  const db = await getDb();
  if (!db) return;
  await db.update(frostFootingPricing).set(data).where(eq(frostFootingPricing.id, id));
}

// ─── Frost Footing Formulas CRUD ─────────────────────────────────────────────

export async function getAllFrostFootingFormulas(): Promise<FrostFootingFormula[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(frostFootingFormulas).orderBy(asc(frostFootingFormulas.id));
}

export async function updateFrostFootingFormula(id: number, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(frostFootingFormulas).set({ value }).where(eq(frostFootingFormulas.id, id));
}

// ─── Frost Footing Size Lookup ────────────────────────────────────────────────

export async function getAllFrostFootingSizes(): Promise<FrostFootingSize[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(frostFootingSizes).orderBy(
    asc(frostFootingSizes.joistLengthFt),
    asc(frostFootingSizes.postSpacingFt),
    asc(frostFootingSizes.footingType)
  );
}

/**
 * Look up the footing size for a given joist length and post spacing.
 * Returns the nearest match (rounds up to the next available joist length and post spacing).
 */
export async function lookupFrostFootingSize(
  joistLengthFt: number,
  postSpacingFt: number
): Promise<{ corner: FrostFootingSize | null; intermediate: FrostFootingSize | null }> {
  const db = await getDb();
  if (!db) return { corner: null, intermediate: null };

  // Clamp to table bounds
  const clampedJoist = Math.min(Math.max(Math.ceil(joistLengthFt), 6), 16);
  const clampedPost = Math.min(Math.max(Math.ceil(postSpacingFt), 4), 14);

  const rows = await db.select().from(frostFootingSizes)
    .where(
      and(
        eq(frostFootingSizes.joistLengthFt, clampedJoist),
        eq(frostFootingSizes.postSpacingFt, clampedPost)
      )
    );

  const corner = rows.find(r => r.footingType === "corner") ?? null;
  const intermediate = rows.find(r => r.footingType === "intermediate") ?? null;
  return { corner, intermediate };
}

// ─── Steel Jacket CRUD helpers ────────────────────────────────────────────────

export async function updateSteelJacketOption(id: number, data: Partial<InsertSteelJacketOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(steelJacketOptions).set(data).where(eq(steelJacketOptions.id, id));
}

export async function createSteelJacketOption(data: InsertSteelJacketOption) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(steelJacketOptions).values(data);
  return result[0].insertId;
}

export async function deleteSteelJacketOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(steelJacketOptions).where(eq(steelJacketOptions.id, id));
}

// ─── Install Slots ────────────────────────────────────────────────────────────
import { installSlots, type InstallSlot, type InsertInstallSlot } from "../drizzle/schema";

export async function getInstallSlots(): Promise<InstallSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installSlots).orderBy(asc(installSlots.sortOrder), asc(installSlots.startDate));
}

export async function getAvailableInstallSlots(): Promise<InstallSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installSlots)
    .where(eq(installSlots.isAvailable, 1))
    .orderBy(asc(installSlots.sortOrder), asc(installSlots.startDate));
}

export async function createInstallSlot(data: InsertInstallSlot): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(installSlots).values(data);
  return result[0].insertId;
}

export async function updateInstallSlot(id: number, data: Partial<InsertInstallSlot>) {
  const db = await getDb();
  if (!db) return;
  await db.update(installSlots).set(data).where(eq(installSlots.id, id));
}

export async function deleteInstallSlot(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(installSlots).where(eq(installSlots.id, id));
}

// --- Post/Beam Wrap helpers ---

export async function getPostWrapOptions(): Promise<PostWrapOption[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postWrapOptions)
    .where(eq(postWrapOptions.isActive, 1))
    .orderBy(asc(postWrapOptions.sortOrder), asc(postWrapOptions.name));
}

export async function getAllPostWrapOptions(): Promise<PostWrapOption[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postWrapOptions)
    .orderBy(asc(postWrapOptions.sortOrder), asc(postWrapOptions.name));
}

export async function createPostWrapOption(data: InsertPostWrapOption): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(postWrapOptions).values(data);
  return result[0].insertId;
}

export async function updatePostWrapOption(id: number, data: Partial<InsertPostWrapOption>) {
  const db = await getDb();
  if (!db) return;
  await db.update(postWrapOptions).set(data).where(eq(postWrapOptions.id, id));
}

export async function deletePostWrapOption(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postWrapOptions).where(eq(postWrapOptions.id, id));
}

// --- Post/Beam Wrap Length Tier helpers ---

export async function getPostWrapLengthTiers(postWrapOptionId?: number): Promise<PostWrapLengthTier[]> {
  const db = await getDb();
  if (!db) return [];
  if (postWrapOptionId !== undefined) {
    return db.select().from(postWrapLengthTiers)
      .where(eq(postWrapLengthTiers.postWrapOptionId, postWrapOptionId))
      .orderBy(asc(postWrapLengthTiers.lengthFt));
  }
  return db.select().from(postWrapLengthTiers)
    .orderBy(asc(postWrapLengthTiers.postWrapOptionId), asc(postWrapLengthTiers.lengthFt));
}

export async function createPostWrapLengthTier(data: InsertPostWrapLengthTier): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(postWrapLengthTiers).values(data);
  return result[0].insertId;
}

export async function updatePostWrapLengthTier(id: number, data: Partial<InsertPostWrapLengthTier>) {
  const db = await getDb();
  if (!db) return;
  await db.update(postWrapLengthTiers).set(data).where(eq(postWrapLengthTiers.id, id));
}

export async function deletePostWrapLengthTier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postWrapLengthTiers).where(eq(postWrapLengthTiers.id, id));
}

// ─── Design Package Items ───────────────────────────────────────────────────

export async function getAllDesignPackageItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designPackageItems).orderBy(designPackageItems.sortOrder, designPackageItems.id);
}

export async function getActiveDesignPackageItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designPackageItems)
    .where(eq(designPackageItems.isActive, 1))
    .orderBy(designPackageItems.sortOrder, designPackageItems.id);
}

export async function createDesignPackageItem(data: InsertDesignPackageItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(designPackageItems).values(data);
  return result[0].insertId;
}

export async function updateDesignPackageItem(id: number, data: Partial<InsertDesignPackageItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(designPackageItems).set(data).where(eq(designPackageItems.id, id));
}

export async function deleteDesignPackageItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(designPackageItems).where(eq(designPackageItems.id, id));
}

// ─── Design Package Commission ──────────────────────────────────────────────

export async function getAllDesignPackageCommission() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designPackageCommission).orderBy(asc(designPackageCommission.projectType));
}

export async function upsertDesignPackageCommission(projectType: string, label: string, commissionAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Try update first, then insert if not found
  const existing = await db.select().from(designPackageCommission)
    .where(eq(designPackageCommission.projectType, projectType));
  if (existing.length > 0) {
    await db.update(designPackageCommission)
      .set({ commissionAmount: String(commissionAmount), label })
      .where(eq(designPackageCommission.projectType, projectType));
  } else {
    await db.insert(designPackageCommission).values({
      projectType,
      label,
      commissionAmount: String(commissionAmount),
    });
  }
}

export async function seedDesignPackageCommission() {
  const db = await getDb();
  if (!db) return;
  const defaults = [
    { projectType: 'bathroom', label: 'Bathroom Remodel', commissionAmount: '750.00' },
    { projectType: 'kitchen', label: 'Kitchen Remodel', commissionAmount: '750.00' },
    { projectType: 'full_home_remodel', label: 'Full Home Remodel', commissionAmount: '1000.00' },
    { projectType: 'addition', label: 'Addition', commissionAmount: '2000.00' },
    { projectType: 'basement', label: 'Basement Finish', commissionAmount: '675.00' },
    { projectType: 'feasibility_study', label: 'Feasibility Study', commissionAmount: '250.00' },
  ];
  for (const row of defaults) {
    const existing = await db.select().from(designPackageCommission)
      .where(eq(designPackageCommission.projectType, row.projectType));
    if (existing.length === 0) {
      await db.insert(designPackageCommission).values(row);
    }
  }
}

// --- Design Package Discounts ---

export async function getAllDesignPackageDiscounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designPackageDiscounts).orderBy(asc(designPackageDiscounts.discountType));
}

export async function upsertDesignPackageDiscount(
  discountType: string,
  data: { name?: string; discountPct?: number; isActive?: number }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(designPackageDiscounts)
    .where(eq(designPackageDiscounts.discountType, discountType));
  if (existing.length > 0) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.discountPct !== undefined) updateData.discountPct = String(data.discountPct);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    await db.update(designPackageDiscounts).set(updateData).where(eq(designPackageDiscounts.discountType, discountType));
  } else {
    await db.insert(designPackageDiscounts).values({
      discountType,
      name: data.name ?? discountType,
      discountPct: String(data.discountPct ?? 0),
      isActive: data.isActive ?? 1,
    });
  }
}

// ── dp_free_features helpers ──────────────────────────────────────────────────

export async function getAllDpFreeFeatures(): Promise<DpFreeFeature[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dpFreeFeatures).orderBy(asc(dpFreeFeatures.sortOrder));
}

export async function createDpFreeFeature(data: {
  name: string;
  description?: string;
  photoUrl?: string;
  listPrice: number;
  isActive?: number;
  sortOrder?: number;
}): Promise<DpFreeFeature | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(dpFreeFeatures).values({
    name: data.name,
    description: data.description ?? null,
    photoUrl: data.photoUrl ?? null,
    listPrice: String(data.listPrice),
    isActive: data.isActive ?? 1,
    sortOrder: data.sortOrder ?? 0,
  });
  const rows = await db.select().from(dpFreeFeatures)
    .orderBy(desc(dpFreeFeatures.id)).limit(1);
  return rows[0] ?? null;
}

export async function updateDpFreeFeature(
  id: number,
  data: {
    name?: string;
    description?: string;
    photoUrl?: string;
    listPrice?: number;
    isActive?: number;
    sortOrder?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
  if (data.listPrice !== undefined) updateData.listPrice = String(data.listPrice);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (Object.keys(updateData).length > 0) {
    await db.update(dpFreeFeatures).set(updateData).where(eq(dpFreeFeatures.id, id));
  }
}

export async function deleteDpFreeFeature(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(dpFreeFeatures).where(eq(dpFreeFeatures.id, id));
}

// ── dp_questionnaire_questions helpers ────────────────────────────────────────

export async function getAllDpQuestions(): Promise<DpQuestionnaireQuestion[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dpQuestionnaireQuestions).orderBy(asc(dpQuestionnaireQuestions.sortOrder));
}

export async function createDpQuestion(data: {
  question: string;
  questionType?: string;
  options?: string;
  isActive?: number;
  sortOrder?: number;
}): Promise<DpQuestionnaireQuestion | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(dpQuestionnaireQuestions).values({
    question: data.question,
    questionType: (data.questionType ?? 'single_choice') as 'single_choice' | 'multi_choice' | 'number' | 'text',
    options: data.options ?? null,
    isActive: data.isActive ?? 1,
    sortOrder: data.sortOrder ?? 0,
  });
  const rows = await db.select().from(dpQuestionnaireQuestions)
    .orderBy(desc(dpQuestionnaireQuestions.id)).limit(1);
  return rows[0] ?? null;
}

export async function updateDpQuestion(
  id: number,
  data: {
    question?: string;
    questionType?: string;
    options?: string;
    isActive?: number;
    sortOrder?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {};
  if (data.question !== undefined) updateData.question = data.question;
  if (data.questionType !== undefined) updateData.questionType = data.questionType;
  if (data.options !== undefined) updateData.options = data.options;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (Object.keys(updateData).length > 0) {
    await db.update(dpQuestionnaireQuestions).set(updateData).where(eq(dpQuestionnaireQuestions.id, id));
  }
}

export async function deleteDpQuestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(dpQuestionnaireQuestions).where(eq(dpQuestionnaireQuestions.id, id));
}

// ─── dp_project_type_sections ────────────────────────────────────────────────

/** Default sections for each project type — used to seed when none exist */
export const DEFAULT_SECTIONS: Array<{ projectType: string; sectionKey: string; sectionLabel: string; isEnabled: number; sortOrder: number }> = [
  // Addition
  { projectType: "addition", sectionKey: "sqft", sectionLabel: "Project Square Footage", isEnabled: 1, sortOrder: 1 },
  { projectType: "addition", sectionKey: "renderings", sectionLabel: "3D Renderings", isEnabled: 1, sortOrder: 2 },
  { projectType: "addition", sectionKey: "included_services", sectionLabel: "Included Services", isEnabled: 1, sortOrder: 3 },
  { projectType: "addition", sectionKey: "parade_stoppers", sectionLabel: "Parade Stoppers", isEnabled: 1, sortOrder: 4 },
  { projectType: "addition", sectionKey: "feasibility_study", sectionLabel: "Feasibility Study", isEnabled: 1, sortOrder: 5 },
  // Full Home Remodel
  { projectType: "full_home_remodel", sectionKey: "sqft", sectionLabel: "Project Square Footage", isEnabled: 1, sortOrder: 1 },
  { projectType: "full_home_remodel", sectionKey: "renderings", sectionLabel: "3D Renderings", isEnabled: 1, sortOrder: 2 },
  { projectType: "full_home_remodel", sectionKey: "included_services", sectionLabel: "Included Services", isEnabled: 1, sortOrder: 3 },
  { projectType: "full_home_remodel", sectionKey: "parade_stoppers", sectionLabel: "Parade Stoppers", isEnabled: 1, sortOrder: 4 },
  { projectType: "full_home_remodel", sectionKey: "feasibility_study", sectionLabel: "Feasibility Study", isEnabled: 0, sortOrder: 5 },
  // Kitchen Remodel
  { projectType: "kitchen", sectionKey: "sqft", sectionLabel: "Project Square Footage", isEnabled: 0, sortOrder: 1 },
  { projectType: "kitchen", sectionKey: "renderings", sectionLabel: "3D Renderings", isEnabled: 1, sortOrder: 2 },
  { projectType: "kitchen", sectionKey: "included_services", sectionLabel: "Included Services", isEnabled: 1, sortOrder: 3 },
  { projectType: "kitchen", sectionKey: "parade_stoppers", sectionLabel: "Parade Stoppers", isEnabled: 1, sortOrder: 4 },
  { projectType: "kitchen", sectionKey: "feasibility_study", sectionLabel: "Feasibility Study", isEnabled: 0, sortOrder: 5 },
  // Bathroom Remodel
  { projectType: "bathroom", sectionKey: "sqft", sectionLabel: "Project Square Footage", isEnabled: 0, sortOrder: 1 },
  { projectType: "bathroom", sectionKey: "renderings", sectionLabel: "3D Renderings", isEnabled: 1, sortOrder: 2 },
  { projectType: "bathroom", sectionKey: "included_services", sectionLabel: "Included Services", isEnabled: 1, sortOrder: 3 },
  { projectType: "bathroom", sectionKey: "parade_stoppers", sectionLabel: "Parade Stoppers", isEnabled: 1, sortOrder: 4 },
  { projectType: "bathroom", sectionKey: "feasibility_study", sectionLabel: "Feasibility Study", isEnabled: 0, sortOrder: 5 },
  // Basement Finish
  { projectType: "basement", sectionKey: "sqft", sectionLabel: "Project Square Footage", isEnabled: 1, sortOrder: 1 },
  { projectType: "basement", sectionKey: "renderings", sectionLabel: "3D Renderings", isEnabled: 1, sortOrder: 2 },
  { projectType: "basement", sectionKey: "included_services", sectionLabel: "Included Services", isEnabled: 1, sortOrder: 3 },
  { projectType: "basement", sectionKey: "parade_stoppers", sectionLabel: "Parade Stoppers", isEnabled: 1, sortOrder: 4 },
  { projectType: "basement", sectionKey: "feasibility_study", sectionLabel: "Feasibility Study", isEnabled: 1, sortOrder: 5 },
];

export async function getAllDpProjectTypeSections(): Promise<DpProjectTypeSection[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(dpProjectTypeSections).orderBy(dpProjectTypeSections.projectType, dpProjectTypeSections.sortOrder);
  // If no rows exist, seed defaults
  if (rows.length === 0) {
    await db.insert(dpProjectTypeSections).values(DEFAULT_SECTIONS);
    return db.select().from(dpProjectTypeSections).orderBy(dpProjectTypeSections.projectType, dpProjectTypeSections.sortOrder);
  }
  return rows;
}

export async function getDpProjectTypeSectionsByType(projectType: string): Promise<DpProjectTypeSection[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(dpProjectTypeSections)
    .where(eq(dpProjectTypeSections.projectType, projectType))
    .orderBy(dpProjectTypeSections.sortOrder);
  // Seed defaults for this type if missing
  if (rows.length === 0) {
    const defaults = DEFAULT_SECTIONS.filter(s => s.projectType === projectType);
    if (defaults.length > 0) {
      await db.insert(dpProjectTypeSections).values(defaults);
      return db.select().from(dpProjectTypeSections)
        .where(eq(dpProjectTypeSections.projectType, projectType))
        .orderBy(dpProjectTypeSections.sortOrder);
    }
  }
  return rows;
}

export async function updateDpProjectTypeSection(
  id: number,
  data: Partial<{ sectionLabel: string; isEnabled: number; sortOrder: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {};
  if (data.sectionLabel !== undefined) updateData.sectionLabel = data.sectionLabel;
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (Object.keys(updateData).length > 0) {
    await db.update(dpProjectTypeSections).set(updateData).where(eq(dpProjectTypeSections.id, id));
  }
}

export async function resetDpProjectTypeSections(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(dpProjectTypeSections);
  await db.insert(dpProjectTypeSections).values(DEFAULT_SECTIONS);
}

// ─── Mortgage Rate Cache ──────────────────────────────────────────────────────

export async function getLatestMortgageRate(): Promise<MortgageRateCache | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mortgageRateCache).orderBy(desc(mortgageRateCache.retrievedAt)).limit(1);
  return rows[0] ?? null;
}

export async function saveMortgageRate(data: {
  rate: string;
  source: string;
  effectiveDate: string;
  retrievedAt: number;
  isFallback: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mortgageRateCache).values({
    rate: data.rate,
    source: data.source,
    effectiveDate: data.effectiveDate,
    retrievedAt: data.retrievedAt,
    isFallback: data.isFallback,
  });
}

// ─── Initial Consultations ────────────────────────────────────────────────────

export async function saveInitialConsultation(data: {
  sessionId: string;
  consultantUserId?: number;
  status?: string;
  inputData?: string;
  resultData?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyAddress?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const [result] = await db.insert(initialConsultations).values({
    sessionId: data.sessionId,
    consultantUserId: data.consultantUserId ?? null,
    status: data.status ?? "draft",
    inputData: data.inputData ?? null,
    resultData: data.resultData ?? null,
    clientName: data.clientName ?? null,
    clientEmail: data.clientEmail ?? null,
    clientPhone: data.clientPhone ?? null,
    propertyAddress: data.propertyAddress ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return (result as { insertId: number }).insertId;
}

export async function updateInitialConsultation(
  sessionId: string,
  data: Partial<{
    status: string;
    inputData: string;
    resultData: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    propertyAddress: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { updatedAt: Date.now() };
  if (data.status !== undefined) updateSet.status = data.status;
  if (data.inputData !== undefined) updateSet.inputData = data.inputData;
  if (data.resultData !== undefined) updateSet.resultData = data.resultData;
  if (data.clientName !== undefined) updateSet.clientName = data.clientName;
  if (data.clientEmail !== undefined) updateSet.clientEmail = data.clientEmail;
  if (data.clientPhone !== undefined) updateSet.clientPhone = data.clientPhone;
  if (data.propertyAddress !== undefined) updateSet.propertyAddress = data.propertyAddress;
  await db.update(initialConsultations).set(updateSet).where(eq(initialConsultations.sessionId, sessionId));
}

export async function getInitialConsultationBySession(sessionId: string): Promise<InitialConsultation | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(initialConsultations).where(eq(initialConsultations.sessionId, sessionId)).limit(1);
  return rows[0] ?? null;
}

export async function listInitialConsultations(limit = 50): Promise<InitialConsultation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(initialConsultations).orderBy(desc(initialConsultations.createdAt)).limit(limit);
}

export async function deleteInitialConsultation(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(initialConsultations).where(eq(initialConsultations.sessionId, sessionId));
}
