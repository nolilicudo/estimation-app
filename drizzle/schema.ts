import { int, bigint, tinyint, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean as mysqlBoolean, json, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Collections (e.g., Rainier, Appalachian)
 */
export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  features: json("features").$type<string[]>(),
  imageUrl: text("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;

/**
 * Color options per collection
 */
export const colors = mysqlTable("colors", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  hex: varchar("hex", { length: 7 }).notNull(),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("colors_slug_unique").on(t.slug)]);

export type Color = typeof colors.$inferSelect;
export type InsertColor = typeof colors.$inferInsert;

/**
 * Edge finishing options per collection
 */
export const edgeOptions = mysqlTable("edge_options", {
  id: int("id").autoincrement().primaryKey(),
  collectionSlug: varchar("collectionSlug", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  costPerLinearFt: decimal("costPerLinearFt", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerLinearFt: decimal("pricePerLinearFt", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("edge_options_slug_unique").on(t.slug)]);

export type EdgeOption = typeof edgeOptions.$inferSelect;
export type InsertEdgeOption = typeof edgeOptions.$inferInsert;

/**
 * Accessories & hardware items
 */
export const accessories = mysqlTable("accessories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(), // "sqft" | "linear_ft" | "each"
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  requiredForCollections: json("requiredForCollections").$type<string[] | null>(),
  isOptional: int("isOptional").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  showInScope: int("showInScope").default(0).notNull(), // 1 = show in email scope of work, 0 = internal hardware only
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Accessory = typeof accessories.$inferSelect;
export type InsertAccessory = typeof accessories.$inferInsert;

/**
 * Installation labor tiers
 * pricePerSqft = the customer-facing price (can be set directly or derived from laborCostPerSqft + marginPercent)
 * laborCostPerSqft = internal cost to perform the labor (optional; used with marginPercent to auto-compute price)
 * marginPercent = gross margin % (0-99); when set with laborCostPerSqft, price = cost / (1 - margin/100)
 * collectionSlug = null means applies to all collections; "rainier" or "appalachian" scopes to that collection
 * minimumPrice = minimum dollar floor for the labor cost; if sqft × rate < minimum, minimum is used
 */
export const laborTiers = mysqlTable("labor_tiers", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  laborCostPerSqft: decimal("laborCostPerSqft", { precision: 10, scale: 2 }).default("0.00").notNull(),
  marginPercent: decimal("marginPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  minimumPrice: decimal("minimumPrice", { precision: 10, scale: 2 }).default("0.00").notNull(),
  collectionSlug: varchar("collectionSlug", { length: 64 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("labor_tiers_slug_unique").on(t.slug)]);

/**
 * Custom line items per labor tier
 * These are additional cost items that roll into the total labor cost for a tier.
 * unit: "flat" (fixed dollar amount), "sqft" (per sqft of deck), "linear_ft" (per linear ft)
 */
export const laborLineItems = mysqlTable("labor_line_items", {
  id: int("id").autoincrement().primaryKey(),
  tierId: int("tierId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  unit: varchar("unit", { length: 32 }).notNull().default("flat"), // "flat" | "sqft" | "linear_ft"
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LaborLineItem = typeof laborLineItems.$inferSelect;
export type InsertLaborLineItem = typeof laborLineItems.$inferInsert;

export type LaborTier = typeof laborTiers.$inferSelect;
export type InsertLaborTier = typeof laborTiers.$inferInsert;

/**
 * Delivery options
 */
export const deliveryOptions = mysqlTable("delivery_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("delivery_options_slug_unique").on(t.slug)]);

export type DeliveryOption = typeof deliveryOptions.$inferSelect;
export type InsertDeliveryOption = typeof deliveryOptions.$inferInsert;

/**
 * Site settings (key-value store for tax rate, company info, verbiage, etc.)
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 128 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  label: varchar("label", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(), // "pricing" | "company" | "verbiage" | "hero"
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

/**
 * Comparison materials (wood, composite, resin stone) for side-by-side cost comparison
 */
export const comparisonMaterials = mysqlTable("comparison_materials", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  materialCostPerSqft: decimal("materialCostPerSqft", { precision: 10, scale: 2 }).notNull(),
  laborCostPerSqft: decimal("laborCostPerSqft", { precision: 10, scale: 2 }).notNull(),
  annualMaintenanceCostPerSqft: decimal("annualMaintenanceCostPerSqft", { precision: 10, scale: 2 }).notNull(),
  lifespanYears: int("lifespanYears").notNull(),
  warrantyYears: int("warrantyYears").default(0).notNull(),
  colorHex: varchar("colorHex", { length: 7 }).notNull().default("#888888"),
  pros: json("pros").$type<string[]>(),
  cons: json("cons").$type<string[]>(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  /** 1 = toggled ON by default in the calculator comparison section; 0 = toggled OFF (user must enable manually) */
  showByDefault: int("showByDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ComparisonMaterial = typeof comparisonMaterials.$inferSelect;
export type InsertComparisonMaterial = typeof comparisonMaterials.$inferInsert;

/**
 * Demo & Rebuild: Demolition options
 */
export const demolitionOptions = mysqlTable("demolition_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  /** Minimum charge floor — if sqft × rate < minimum, use minimum (0 = no floor) */
  minimumPrice: decimal("minimumPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  /** When true, this option has its own separate sqft input (e.g. concrete removal) */
  hasSeparateSqft: int("hasSeparateSqft").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DemolitionOption = typeof demolitionOptions.$inferSelect;
export type InsertDemolitionOption = typeof demolitionOptions.$inferInsert;

/**
 * Demo & Rebuild: Footing types
 */
export const footingOptions = mysqlTable("footing_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default("each"), // "each"
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FootingOption = typeof footingOptions.$inferSelect;
export type InsertFootingOption = typeof footingOptions.$inferInsert;

/**
 * Demo & Rebuild: Concrete work options
 */
export const concreteOptions = mysqlTable("concrete_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default("sqft"), // "sqft" | "each"
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConcreteOption = typeof concreteOptions.$inferSelect;
export type InsertConcreteOption = typeof concreteOptions.$inferInsert;

/**
 * Demo & Rebuild: Framing options
 */
export const framingOptions = mysqlTable("framing_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  /** Rate used for Appalachian collection (and as the default rate) */
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  /** Rate used specifically for Rainier collection (null = use pricePerSqft) */
  rainierRate: decimal("rainierRate", { precision: 10, scale: 2 }),
  /** Minimum charge when this framing option is selected (0 = no minimum) */
  minimumPrice: decimal("minimumPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FramingOption = typeof framingOptions.$inferSelect;
export type InsertFramingOption = typeof framingOptions.$inferInsert;

/**
 * Demo & Rebuild: Exterior facade options (stucco, vinyl, hardie, brick/stone)
 */
export const facadeOptions = mysqlTable("facade_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  /** Material cost per sqft (before margin) */
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Install/labor cost per sqft (before margin) */
  installCostPerSqft: decimal("installCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  minimumPrice: decimal("minimumPrice", { precision: 10, scale: 2 }).default("0").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacadeOption = typeof facadeOptions.$inferSelect;
export type InsertFacadeOption = typeof facadeOptions.$inferInsert;

/**
 * Admin users with custom email/password authentication
 */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  name: varchar("name", { length: 128 }),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

/**
 * Resin Rock: Surface types that resin can be laid on
 */
export const resinSurfaces = mysqlTable("resin_surfaces", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  requiresWaterproofing: int("requiresWaterproofing").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResinSurface = typeof resinSurfaces.$inferSelect;
export type InsertResinSurface = typeof resinSurfaces.$inferInsert;

/**
 * Resin Rock: Color blends
 */
export const resinColors = mysqlTable("resin_colors", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  hex: varchar("hex", { length: 7 }).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("primary"), // "primary" | "blend"
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResinColor = typeof resinColors.$inferSelect;
export type InsertResinColor = typeof resinColors.$inferInsert;

/**
 * Resin Rock: Waterproofing options (poured rubber membrane)
 */
export const waterproofingOptions = mysqlTable("waterproofing_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WaterproofingOption = typeof waterproofingOptions.$inferSelect;
export type InsertWaterproofingOption = typeof waterproofingOptions.$inferInsert;

/**
 * Duradek: Vinyl membrane series and colors
 */
export const duradekColors = mysqlTable("duradek_colors", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  series: varchar("series", { length: 128 }).notNull(), // "Ultra Quartz", "Ultra Legacy", etc.
  hex: varchar("hex", { length: 7 }).notNull(),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DuradekColor = typeof duradekColors.$inferSelect;
export type InsertDuradekColor = typeof duradekColors.$inferInsert;

/**
 * Tiledek: Tile size options with pricing
 */
export const tileSizes = mysqlTable("tile_sizes", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  laborPerSqft: decimal("laborPerSqft", { precision: 10, scale: 2 }).notNull(),
  materialPerSqft: decimal("materialPerSqft", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TileSize = typeof tileSizes.$inferSelect;
export type InsertTileSize = typeof tileSizes.$inferInsert;

/**
 * Product-level settings for Resin Rock, Duradek, Tiledek
 * (e.g., base prices, membrane costs, mortar costs, labor rates)
 */
export const productSettings = mysqlTable("product_settings", {
  id: int("id").autoincrement().primaryKey(),
  productType: varchar("productType", { length: 64 }).notNull(), // "resin_rock" | "duradek" | "tiledek"
  settingKey: varchar("settingKey", { length: 128 }).notNull(),
  settingValue: text("settingValue").notNull(),
  label: varchar("label", { length: 256 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductSetting = typeof productSettings.$inferSelect;
export type InsertProductSetting = typeof productSettings.$inferInsert;

/**
 * Appalachian Waterproof Add-on: Trex RainEscape system with concealed gutter
 * Only available when the Appalachian collection is selected.
 */
export const rainEscapeOptions = mysqlTable("rain_escape_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  /** Material cost per linear foot of gutter/trough system (before margin) */
  gutterMaterialCostPerLf: decimal("gutterMaterialCostPerLf", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Install cost per linear foot of gutter (before margin) */
  gutterInstallCostPerLf: decimal("gutterInstallCostPerLf", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Material cost per sqft for the RainEscape trough & bracket system (before margin) */
  systemMaterialCostPerSqft: decimal("systemMaterialCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Install cost per sqft for the RainEscape system (before margin) */
  systemInstallCostPerSqft: decimal("systemInstallCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Margin percentage applied to (material + install) to get customer price */
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  /** Legacy price fields kept for backward compat — will be computed from cost+margin going forward */
  gutterPricePerLinearFt: decimal("gutterPricePerLinearFt", { precision: 10, scale: 2 }).notNull().default("0.00"),
  systemPricePerSqft: decimal("systemPricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  laborPricePerSqft: decimal("laborPricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RainEscapeOption = typeof rainEscapeOptions.$inferSelect;
export type InsertRainEscapeOption = typeof rainEscapeOptions.$inferInsert;

/**
 * Appalachian Waterproof Add-on: Soffit material options
 * Selected alongside the RainEscape system to finish the underside of the deck.
 */
export const soffitMaterials = mysqlTable("soffit_materials", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  /** Material cost per sqft (before margin) */
  materialCostPerSqft: decimal("materialCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Install/labor cost per sqft (before margin) */
  installCostPerSqft: decimal("installCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Margin percentage applied to (material + install) to get customer price */
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  /** Computed customer price per sqft = (materialCost + installCost) / (1 - marginPct/100) */
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Legacy labor field kept for backward compat */
  laborPricePerSqft: decimal("laborPricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SoffitMaterial = typeof soffitMaterials.$inferSelect;
export type InsertSoffitMaterial = typeof soffitMaterials.$inferInsert;

/**
 * Appalachian Waterproof Add-on: A Steel Jacket — steel panel waterproofing system
 * Only available when the Appalachian collection is selected.
 * Pricing is per sqft of deck area.
 */
export const steelJacketOptions = mysqlTable("steel_jacket_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  /** Material cost per sqft (before margin) */
  materialCostPerSqft: decimal("materialCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Install/labor cost per sqft (before margin) */
  installCostPerSqft: decimal("installCostPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Margin percentage applied to (material + install) to get customer price */
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  /** Computed customer price per sqft = (materialCost + installCost) / (1 - marginPct/100) */
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Gallery photo URLs (JSON array) */
  photoUrls: json("photoUrls").$type<string[]>(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SteelJacketOption = typeof steelJacketOptions.$inferSelect;
export type InsertSteelJacketOption = typeof steelJacketOptions.$inferInsert;

/**
 * Customer orders: stores contract signature, estimate snapshot, and Stripe payment info.
 * paymentStatus: 'pending' | 'deposit_paid' | 'fully_paid' | 'cancelled'
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // Customer info
  customerName: varchar("customerName", { length: 256 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 64 }),
  customerAddress: varchar("customerAddress", { length: 512 }),
  // Estimate snapshot (JSON string)
  estimateSnapshot: text("estimateSnapshot").notNull(),
  productType: varchar("productType", { length: 64 }).notNull().default("tanzite"),
  collectionName: varchar("collectionName", { length: 128 }),
  sqft: int("sqft").default(0).notNull(),
  grandTotal: decimal("grandTotal", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull(),
  balanceAmount: decimal("balanceAmount", { precision: 10, scale: 2 }).notNull(),
  // Contract signature
  signedName: varchar("signedName", { length: 256 }),
  signedAt: timestamp("signedAt"),
  contractText: text("contractText"),
  // Stripe payment tracking
  stripeDepositSessionId: varchar("stripeDepositSessionId", { length: 256 }),
  stripeBalanceSessionId: varchar("stripeBalanceSessionId", { length: 256 }),
  stripeDepositPaymentIntentId: varchar("stripeDepositPaymentIntentId", { length: 256 }),
  stripeBalancePaymentIntentId: varchar("stripeBalancePaymentIntentId", { length: 256 }),
  paymentStatus: varchar("paymentStatus", { length: 32 }).notNull().default("pending"),
  // Custom project details (comma-separated labels selected at order time)
  projectDetails: text("projectDetails"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Brochure requests: name, email, phone sent to Zapier → Go High Level
 */
export const brochureRequests = mysqlTable("brochure_requests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  sentToZapier: int("sentToZapier").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BrochureRequest = typeof brochureRequests.$inferSelect;
export type InsertBrochureRequest = typeof brochureRequests.$inferInsert;

/**
 * Corners → Waste percentage rules (editable in Admin)
 * corners: number of corners (3-10)
 * allNinetyDegrees: whether all corners are 90 degrees
 * wastePercent: waste percentage to apply (e.g., 10.0 = 10%)
 */
export const cornersWasteRules = mysqlTable("corners_waste_rules", {
  id: int("id").autoincrement().primaryKey(),
  corners: int("corners").notNull(),
  allNinetyDegrees: int("allNinetyDegrees").notNull().default(1), // 1 = yes, 0 = no
  wastePercent: decimal("wastePercent", { precision: 5, scale: 2 }).notNull().default("10.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CornersWasteRule = typeof cornersWasteRules.$inferSelect;
export type InsertCornersWasteRule = typeof cornersWasteRules.$inferInsert;

/**
 * Lumber package items: joists, hangers, rimboards, beams, hardware
 * Each item has a cost price and a markup multiplier; displayed price = cost * markup
 */
export const lumberItems = mysqlTable("lumber_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: varchar("description", { length: 512 }),
  unit: varchar("unit", { length: 32 }).notNull().default("each"), // each, lf, sf, box
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxPercent: decimal("taxPercent", { precision: 5, scale: 2 }).notNull().default("8.35"),  // Utah sales tax on materials (default 8.35%)
  markupMultiplier: decimal("markupMultiplier", { precision: 5, scale: 3 }).notNull().default("1.300"), // 1.3 = 30% markup
  displayPrice: decimal("displayPrice", { precision: 10, scale: 2 }).notNull().default("0.00"), // (costPrice * (1 + taxPercent/100)) / (1 - marginPct/100)
  category: varchar("category", { length: 64 }).notNull().default("joist"), // joist, hanger, rimboard, beam, hardware
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  homeDepotSku: varchar("homeDepotSku", { length: 32 }),        // Home Depot product_id for SerpApi price sync
  lastSyncedPrice: decimal("lastSyncedPrice", { precision: 10, scale: 2 }), // price returned by last sync
  lastSyncedAt: timestamp("lastSyncedAt"),                      // when the last sync ran for this item
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LumberItem = typeof lumberItems.$inferSelect;
export type InsertLumberItem = typeof lumberItems.$inferInsert;

/**
 * Lumber price change history — one row per sync event that changed the price
 */
export const lumberPriceHistory = mysqlTable("lumber_price_history", {
  id: int("id").autoincrement().primaryKey(),
  lumberItemId: int("lumberItemId").notNull(),
  lumberItemName: varchar("lumberItemName", { length: 128 }).notNull(),
  sku: varchar("sku", { length: 32 }).notNull(),
  oldCostPrice: decimal("oldCostPrice", { precision: 10, scale: 2 }).notNull(),
  newCostPrice: decimal("newCostPrice", { precision: 10, scale: 2 }).notNull(),
  oldDisplayPrice: decimal("oldDisplayPrice", { precision: 10, scale: 2 }).notNull(),
  newDisplayPrice: decimal("newDisplayPrice", { precision: 10, scale: 2 }).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  source: varchar("source", { length: 32 }).notNull().default("scheduled"), // 'scheduled' | 'manual' | 'sku_save'
});

export type LumberPriceHistory = typeof lumberPriceHistory.$inferSelect;
export type InsertLumberPriceHistory = typeof lumberPriceHistory.$inferInsert;

/**
 * Structural: Joist span table entries (IRC R507.5 — editable in Admin)
 * maxSpanFt: maximum allowable joist span in feet
 * joistSize: e.g. "2×8", "2×10", "2×12"
 * spacingIn: joist spacing in inches (e.g. 12, 16, 24)
 * loadFactor: the psf load factor threshold this entry applies to (0 = base, higher = snow-loaded)
 */
export const joistSpanEntries = mysqlTable("joist_span_entries", {
  id: int("id").autoincrement().primaryKey(),
  joistSize: varchar("joistSize", { length: 16 }).notNull(), // "2×8", "2×10", "2×12"
  spacingIn: int("spacingIn").notNull().default(16),         // 12, 16, 24
  maxSpanFt: decimal("maxSpanFt", { precision: 5, scale: 2 }).notNull(),
  loadFactorMin: decimal("loadFactorMin", { precision: 5, scale: 2 }).notNull().default("0.00"), // minimum psf load factor this row covers
  loadFactorMax: decimal("loadFactorMax", { precision: 8, scale: 2 }).notNull().default("9999.00"), // maximum psf load factor (9999 = unlimited)
  notes: varchar("notes", { length: 256 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JoistSpanEntry = typeof joistSpanEntries.$inferSelect;
export type InsertJoistSpanEntry = typeof joistSpanEntries.$inferInsert;

/**
 * Structural: LVL beam sizing table entries (editable in Admin)
 * maxPostSpacingFt: maximum post spacing (span) this beam handles
 * maxPlf: maximum pounds per linear foot load this beam handles
 * beamSize: e.g. "3½\"×9¼\"", "3½\"×14\""
 * isDouble: if true, this is a doubled beam recommendation
 */
export const lvlBeamEntries = mysqlTable("lvl_beam_entries", {
  id: int("id").autoincrement().primaryKey(),
  maxPostSpacingFt: decimal("maxPostSpacingFt", { precision: 5, scale: 2 }).notNull(),
  maxPlf: decimal("maxPlf", { precision: 8, scale: 2 }).notNull(),
  beamSize: varchar("beamSize", { length: 32 }).notNull(),
  isDouble: int("isDouble").notNull().default(0),
  notes: varchar("notes", { length: 256 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LvlBeamEntry = typeof lvlBeamEntries.$inferSelect;
export type InsertLvlBeamEntry = typeof lvlBeamEntries.$inferInsert;

/**
 * Structural: Hot tub weight / load data (editable in Admin)
 * persons: number of persons (2-10)
 * weightLb: approximate filled weight in pounds
 * footprintSqft: footprint area in square feet
 * psf: pounds per square foot (weightLb / footprintSqft)
 * loadFactor: multiplier applied to joist span to account for hot tub load (e.g. 1.5)
 */
export const hotTubWeights = mysqlTable("hot_tub_weights", {
  id: int("id").autoincrement().primaryKey(),
  persons: int("persons").notNull(),
  weightLb: int("weightLb").notNull(),
  footprintSqft: decimal("footprintSqft", { precision: 6, scale: 2 }).notNull(),
  psf: decimal("psf", { precision: 6, scale: 2 }).notNull(),
  loadFactor: decimal("loadFactor", { precision: 4, scale: 2 }).notNull().default("1.50"),
  notes: varchar("notes", { length: 256 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HotTubWeight = typeof hotTubWeights.$inferSelect;
export type InsertHotTubWeight = typeof hotTubWeights.$inferInsert;

/**
 * Structural: Glulam beam sizing table entries (Boise Cascade 24F-V4, editable in Admin)
 * widthIn: beam width in inches (3.5, 5.125, 6.75, 8.75)
 * depthIn: beam depth in inches (9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5, 21, 22.5, 24)
 * spanFt: post-to-post span in feet
 * maxPlfFloor: max PLF capacity at 100% load duration (floor/hot tub loads)
 * maxPlfSnow: max PLF capacity at 115% load duration (snow loads)
 * species: "24F-V4" (default)
 */
export const glulamBeamEntries = mysqlTable("glulam_beam_entries", {
  id: int("id").autoincrement().primaryKey(),
  widthIn: decimal("widthIn", { precision: 5, scale: 3 }).notNull(),    // 3.5, 5.125, 6.75, 8.75
  depthIn: decimal("depthIn", { precision: 5, scale: 2 }).notNull(),    // 9, 10.5, 12, etc.
  spanFt: int("spanFt").notNull(),                                       // 6, 8, 10, ... 40
  maxPlfFloor: int("maxPlfFloor").notNull(),                             // PLF at 100% load duration
  maxPlfSnow: int("maxPlfSnow").notNull().default(0),                    // PLF at 115% load duration
  species: varchar("species", { length: 32 }).notNull().default("24F-V4"),
  notes: varchar("notes", { length: 256 }),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlulamBeamEntry = typeof glulamBeamEntries.$inferSelect;
export type InsertGlulamBeamEntry = typeof glulamBeamEntries.$inferInsert;

/**
 * Railing options: wire railing and custom welded powder-coated railing
 * railingType: "wire" | "welded"
 * orientation: "horizontal" | "vertical" | null (only for welded)
 * pricePerLf: displayed price per linear foot (edge-mounted)
 * costPerLf: internal cost per LF (before markup)
 * marginPct: (price - cost) / price * 100
 * isActive: 1 = shown to customers, 0 = hidden
 */
export const railingOptions = mysqlTable("railing_options", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  railingType: varchar("railingType", { length: 32 }).notNull().default("wire"), // "wire" | "welded"
  orientation: varchar("orientation", { length: 32 }),                           // "horizontal" | "vertical" | null
  description: varchar("description", { length: 512 }),
  pricePerLf: decimal("pricePerLf", { precision: 8, scale: 2 }).notNull().default("0.00"),
  /** Material cost per LF (before margin) */
  costPerLf: decimal("costPerLf", { precision: 8, scale: 2 }).notNull().default("0.00"),
  /** Install/labor cost per LF (before margin) */
  installCostPerLf: decimal("installCostPerLf", { precision: 8, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  /** Color variant: "white" | "black" | "stainless" | null (null = color-agnostic) */
  colorVariant: varchar("colorVariant", { length: 32 }),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RailingOption = typeof railingOptions.$inferSelect;
export type InsertRailingOption = typeof railingOptions.$inferInsert;

/**
 * Spiral stair pricing: price matrix keyed by diameter (inches) and tread material.
 * diameter: 60 | 72 | 84 | 96 (inches)
 * treadMaterial: "metal-diamond-grate" | "dekton" | "stone-decking" | "resin-rock"
 * costPrice: internal cost before markup
 * marginPct: margin percentage (default 35)
 * price: selling price (auto-computed from cost + margin)
 */
export const spiralStairPricing = mysqlTable("spiral_stair_pricing", {
  id: int("id").autoincrement().primaryKey(),
  diameter: int("diameter").notNull(), // 60, 72, 84, 96
  treadMaterial: varchar("treadMaterial", { length: 64 }).notNull(), // "metal-diamond-grate" | "dekton" | "stone-decking" | "resin-rock"
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SpiralStairPricing = typeof spiralStairPricing.$inferSelect;
export type InsertSpiralStairPricing = typeof spiralStairPricing.$inferInsert;

/**
 * Sign requests: created when an estimate email is sent.
 * Stores a unique token so the customer can sign the contract
 * and pay the deposit from a link in their email — no login required.
 * status: 'pending' | 'signed' | 'expired'
 */
export const signRequests = mysqlTable("sign_requests", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(), // UUID v4
  // Customer info (copied from the estimate email)
  customerName: varchar("customerName", { length: 256 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 64 }),
  customerAddress: varchar("customerAddress", { length: 512 }),
  customerCity: varchar("customerCity", { length: 128 }),
  // Estimate snapshot (JSON string — same shape as orders.estimateSnapshot)
  estimateSnapshot: text("estimateSnapshot").notNull(),
  collectionName: varchar("collectionName", { length: 128 }),
  colorName: varchar("colorName", { length: 128 }),
  sqft: int("sqft").default(0).notNull(),
  grandTotal: decimal("grandTotal", { precision: 10, scale: 2 }).notNull(),
  finalTotal: decimal("finalTotal", { precision: 10, scale: 2 }).notNull(),
  pricePerSqft: decimal("pricePerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  laborName: varchar("laborName", { length: 128 }),
  deliveryName: varchar("deliveryName", { length: 128 }),
  contractText: text("contractText").notNull(), // resolved contract text (tokens replaced)
  scopeOfWork: text("scopeOfWork"),
  pricingBreakdown: text("pricingBreakdown"),
  showPricing: int("showPricing").notNull().default(1),
  // Signing result
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | signed | expired
  signedName: varchar("signedName", { length: 256 }),
  signedAt: timestamp("signedAt"),
  // Stripe deposit checkout (created after signing)
  stripeDepositSessionId: varchar("stripeDepositSessionId", { length: 256 }),
  checkoutUrl: text("checkoutUrl"),
  // Linked order (set after customer signs and pays)
  orderId: int("orderId"),
  // Project photos (uploaded by customer during signing, stored as JSON array of S3 URLs)
  photoUrls: json("photoUrls").$type<string[]>(),
  // Reminder tracking
  reminderCount: int("reminderCount").notNull().default(0),
  lastReminderAt: timestamp("lastReminderAt"),
  // Assigned calculator user (the rep/manager who sent this estimate)
  assignedUserId: int("assignedUserId"),
  // Project management fields
  projectStatus: varchar("projectStatus", { length: 32 }).notNull().default("estimate-sent"),
  // 'lead' | 'estimate-sent' | 'contract-signed' | 'in-progress' | 'complete' | 'cancelled'
  projectNotes: text("projectNotes"),
  projectPhotos: json("projectPhotos").$type<string[]>(), // admin-uploaded job site photos
  // Material quantity snapshot (stored as JSON for rich project card display)
  materialSnapshot: json("materialSnapshot").$type<{
    deckingPieces?: number;
    deckingBoards?: number;
    edgeLinearFt?: number;
    edgeTrimPieces?: number;
    railingLf?: number;
    railingStyle?: string;
    concreteWork?: string;
    demoWork?: string;
    lumberPackageCost?: number;
    lumberPackageItems?: { name: string; qty: number; cost: number }[];
    planDetails?: string;
    stairRuns?: { stairType: string; treads: number; lf: number }[];
  }>(),
  // Discount fields
  discountApplied: int("discountApplied").notNull().default(0),
  discountName: varchar("discountName", { length: 128 }).notNull().default(""),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discount2Applied: int("discount2Applied").notNull().default(0),
  discount2Name: varchar("discount2Name", { length: 128 }).notNull().default(""),
  discount2Value: decimal("discount2Value", { precision: 10, scale: 2 }).notNull().default("0.00"),
  // Linked dynamic questionnaire session
  questionnaireSessionId: int("questionnaireSessionId"),
  // Expiry
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SignRequest = typeof signRequests.$inferSelect;
export type InsertSignRequest = typeof signRequests.$inferInsert;

/**
 * Custom project detail options — admin-managed list of tags/details
 * that can be applied to any estimate (e.g., "Hot Tub Cutout", "Pergola", "Gate").
 */
export const projectDetailOptions = mysqlTable("project_detail_options", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProjectDetailOption = typeof projectDetailOptions.$inferSelect;
export type InsertProjectDetailOption = typeof projectDetailOptions.$inferInsert;

/**
 * Sent emails log — records every email sent via GHL.
 * emailType: 'estimate' | 'reminder' | 'signed_contract' | 'resend'
 */
export const sentEmails = mysqlTable("sent_emails", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customerName", { length: 256 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 64 }),
  customerAddress: varchar("customerAddress", { length: 512 }),
  customerCity: varchar("customerCity", { length: 128 }),
  emailType: varchar("emailType", { length: 32 }).notNull(),
  subject: varchar("subject", { length: 512 }),
  signRequestId: int("signRequestId"),
  signRequestToken: varchar("signRequestToken", { length: 64 }),
  estimateSnapshot: text("estimateSnapshot"),
  collectionName: varchar("collectionName", { length: 128 }),
  colorName: varchar("colorName", { length: 128 }),
  sqft: int("sqft").default(0),
  finalTotal: decimal("finalTotal", { precision: 10, scale: 2 }),
  ghlContactId: varchar("ghlContactId", { length: 128 }),
  ghlOpportunityId: varchar("ghlOpportunityId", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("sent"),
  errorMessage: text("errorMessage"),
  // Assigned calculator user (the rep/manager who sent this email)
  assignedUserId: int("assignedUserId"),
  // Jobtread integration
  jobtreadJobId: varchar("jobtreadJobId", { length: 128 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type SentEmail = typeof sentEmails.$inferSelect;
export type InsertSentEmail = typeof sentEmails.$inferInsert;

/**
 * Contract templates — admin-managed contract language for different service types.
 * projectType allows per-project-type contracts (e.g. "addition", "bathroom", "kitchen", "full_home_remodel").
 * Use projectType = "default" for the generic fallback contract.
 */
export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  serviceType: varchar("serviceType", { length: 64 }).notNull(),
  /** Project type key — "default" for generic, or specific type like "addition", "bathroom", "kitchen", "full_home_remodel" */
  projectType: varchar("projectType", { length: 64 }).notNull().default("default"),
  contractText: text("contractText").notNull(),
  isDefault: int("isDefault").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  serviceTypeProjectTypeUnique: uniqueIndex("serviceType_projectType_unique").on(table.serviceType, table.projectType),
}));
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;

/**
 * Calculator users — people who have a 4-digit PIN to access the cost estimator.
 * Roles: super_admin > manager > rep
 * Permissions: JSON object of feature flags that can be toggled by a superior.
 */
export const calculatorUsers = mysqlTable("calculator_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  title: varchar("title", { length: 128 }),
  companyPhone: varchar("companyPhone", { length: 32 }),
  pin: varchar("pin", { length: 4 }).notNull(),
  // Role hierarchy: super_admin > manager > rep
  role: varchar("role", { length: 32 }).notNull().default("rep"),
  // Self-referencing FK: reps point to their manager, managers point to their super_admin
  managerId: int("managerId"),
  // JSON object of permission flags, e.g. { viewEstimates: true, viewContracts: true, managePricing: false }
  permissions: json("permissions").$type<Record<string, boolean>>(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CalculatorUser = typeof calculatorUsers.$inferSelect;
export type InsertCalculatorUser = typeof calculatorUsers.$inferInsert;

/**
 * Frost Footing Sizes — lookup table derived from the Frost Footing Detail chart.
 * Each row represents one cell in the table: given a joist length (span) and post spacing,
 * it stores the required footing diameter (inches) for corner and intermediate footings.
 *
 * Three diameter values per cell correspond to the three columns in the chart:
 *   col1 (largest), col2 (medium), col3 (smallest) — representing different load/soil conditions.
 * Admin can set a price per footing for each diameter size.
 */
export const frostFootingSizes = mysqlTable("frost_footing_sizes", {
  id: int("id").autoincrement().primaryKey(),
  joistLengthFt: int("joistLengthFt").notNull(),   // 6–16
  postSpacingFt: int("postSpacingFt").notNull(),    // 4–14
  footingType: varchar("footingType", { length: 32 }).notNull(), // 'corner' | 'intermediate'
  diameterIn1: int("diameterIn1").notNull(),  // largest (col 1)
  diameterIn2: int("diameterIn2").notNull(),  // medium  (col 2)
  diameterIn3: int("diameterIn3").notNull(),  // smallest (col 3)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FrostFootingSize = typeof frostFootingSizes.$inferSelect;
export type InsertFrostFootingSize = typeof frostFootingSizes.$inferInsert;

/**
 * Frost Footing Diameter Pricing — admin-managed price per footing for each diameter.
 * The calculator selects the appropriate diameter from the lookup table and applies this price.
 */
export const frostFootingPricing = mysqlTable("frost_footing_pricing", {
  id: int("id").autoincrement().primaryKey(),
  diameterIn: int("diameterIn").notNull().unique(),  // e.g. 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26
  label: varchar("label", { length: 64 }).notNull(), // e.g. "6\" Footing"
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).notNull().default("35.00"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FrostFootingPricing = typeof frostFootingPricing.$inferSelect;
export type InsertFrostFootingPricing = typeof frostFootingPricing.$inferInsert;

/**
 * Frost Footing Formula Settings — admin-editable formula parameters.
 * Controls which diameter column to use (col1/col2/col3) and other calculation settings.
 */
export const frostFootingFormulas = mysqlTable("frost_footing_formulas", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  value: varchar("value", { length: 256 }).notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FrostFootingFormula = typeof frostFootingFormulas.$inferSelect;
export type InsertFrostFootingFormula = typeof frostFootingFormulas.$inferInsert;

/**
 * Install Slots — admin-configurable availability windows shown in the calculator
 * as urgency/availability signals to help close deals in-home.
 */
export const installSlots = mysqlTable("install_slots", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 256 }).notNull(),         // e.g. "Week of May 12"
  startDate: varchar("startDate", { length: 16 }).notNull(),  // ISO date string YYYY-MM-DD
  endDate: varchar("endDate", { length: 16 }).notNull(),      // ISO date string YYYY-MM-DD
  isAvailable: int("isAvailable").notNull().default(1),       // 0 = booked/hidden
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InstallSlot = typeof installSlots.$inferSelect;
export type InsertInstallSlot = typeof installSlots.$inferInsert;

/**
 * Post / Beam Wrap Options
 * Options for wrapping structural posts and beams on the deck.
 */
export const postWrapOptions = mysqlTable("post_wrap_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  /** Legacy flat rate per LF (kept for backward compat) */
  pricePerLf: decimal("pricePerLf", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Legacy flat labor rate per LF (kept for backward compat) */
  laborPricePerLf: decimal("laborPricePerLf", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Labor charge per post wrapped */
  laborPricePerPost: decimal("laborPricePerPost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Labor charge per lineal foot of beam wrapped */
  laborPricePerBeamLf: decimal("laborPricePerBeamLf", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PostWrapOption = typeof postWrapOptions.$inferSelect;
export type InsertPostWrapOption = typeof postWrapOptions.$inferInsert;

/**
 * Post / Beam Wrap Length Tiers
 * Material pricing by specific lumber length (8', 10', 12', etc.) for each wrap option.
 * The calculator picks the shortest tier that covers the required height/span.
 */
export const postWrapLengthTiers = mysqlTable("post_wrap_length_tiers", {
  id: int("id").autoincrement().primaryKey(),
  postWrapOptionId: int("postWrapOptionId").notNull().references(() => postWrapOptions.id, { onDelete: "cascade" }),
  lengthFt: int("lengthFt").notNull(), // e.g. 8, 10, 12, 16
  /** Material cost (what you pay) */
  materialCostPerPiece: decimal("materialCostPerPiece", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Material sell price (what customer pays) */
  materialPricePerPiece: decimal("materialPricePerPiece", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PostWrapLengthTier = typeof postWrapLengthTiers.$inferSelect;
export type InsertPostWrapLengthTier = typeof postWrapLengthTiers.$inferInsert;

/**
 * Design Package Items
 * Line items for design package pricing (architectural engineering, structural engineering,
 * 3D renderings, material selections, cabinet drawings, manual j, REScheck, etc.)
 *
 * pricingType:
 *   "sqft"      — cost = costPerSqft * sqft, applies to sqft-based project types
 *   "flat"      — cost = flatCost, always applies regardless of sqft
 *   "rendering" — cost = flatCost, applies only when the matching renderingType is selected
 *
 * projectTypes: comma-separated list of project types this item applies to.
 *   Values: "addition", "full_home_remodel", "kitchen", "bathroom", "all"
 *
 * renderingType (only for pricingType="rendering"):
 *   "small_bathroom", "large_bathroom", "kitchen", "exterior"
 */
export const designPackageItems = mysqlTable("design_package_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Optional subtitle shown below the item name in the calculator */
  subtitle: varchar("subtitle", { length: 500 }).default(""),
  description: varchar("description", { length: 500 }).default(""),
  /** "sqft" | "flat" | "rendering" */
  pricingType: varchar("pricingType", { length: 20 }).notNull().default("flat"),
  /** Cost per sqft (used when pricingType = "sqft") */
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  /** Flat cost (used when pricingType = "flat" or "rendering") */
  flatCost: decimal("flatCost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Markup percentage applied on top of cost to get sell price (default 50) */
  markupPct: decimal("markupPct", { precision: 5, scale: 2 }).notNull().default("50.00"),
  /** Comma-separated project types this item applies to, e.g. "addition,full_home_remodel" or "all" */
  projectTypes: varchar("projectTypes", { length: 255 }).notNull().default("all"),
  /** For rendering items: which rendering type this represents */
  renderingType: varchar("renderingType", { length: 50 }),
  /** Whether this item is enabled/visible */
  isActive: int("isActive").notNull().default(1),
  /**
   * Whether this item is toggled ON by default in the calculator.
   * 1 = default on (included unless user turns it off)
   * 0 = default off (optional — user must turn it on)
   * Items with isDefaultEnabled=0 still appear in the Included Services step
   * but start unchecked, making them opt-in add-ons.
   */
  isDefaultEnabled: int("isDefaultEnabled").notNull().default(1),
  /** Base design hours for this item (used for rendering/space items volume discount calculation) */
  designHours: decimal("designHours", { precision: 6, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DesignPackageItem = typeof designPackageItems.$inferSelect;
export type InsertDesignPackageItem = typeof designPackageItems.$inferInsert;

/**
 * Sales rep commission rates for design packages, keyed by project type.
 * One row per project type (addition, full_home_remodel, kitchen, bathroom).
 */
export const designPackageCommission = mysqlTable("design_package_commission", {
  id: int("id").autoincrement().primaryKey(),
  /** Project type key: addition | full_home_remodel | kitchen | bathroom */
  projectType: varchar("projectType", { length: 64 }).notNull().unique(),
  /** Human-readable label shown in admin */
  label: varchar("label", { length: 128 }).notNull(),
  /** Commission amount in dollars added to the bulk total (hidden from customer) */
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DesignPackageCommission = typeof designPackageCommission.$inferSelect;
export type InsertDesignPackageCommission = typeof designPackageCommission.$inferInsert;

/**
 * Discount buttons for the design package calculator (early bird + same day).
 * Two rows maximum, identified by discountType.
 */
export const designPackageDiscounts = mysqlTable("design_package_discounts", {
  id: int("id").autoincrement().primaryKey(),
  /** "early_bird" | "same_day" */
  discountType: varchar("discountType", { length: 32 }).notNull().unique(),
  /** Display name shown on the button */
  name: varchar("name", { length: 128 }).notNull(),
  /** Discount percentage (0-100) */
  discountPct: decimal("discountPct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  /** Whether this discount button is enabled */
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DesignPackageDiscount = typeof designPackageDiscounts.$inferSelect;
export type InsertDesignPackageDiscount = typeof designPackageDiscounts.$inferInsert;

/**
 * Free features that can be offered at $0 to customers in the Design Package Calculator.
 * Each feature has a name, photo URL, and a list price that shows as fully discounted.
 */
export const dpFreeFeatures = mysqlTable("dp_free_features", {
  id: int("id").autoincrement().primaryKey(),
  /** Display name shown on the calculator button */
  name: varchar("name", { length: 255 }).notNull(),
  /** Short description shown on hover/detail */
  description: varchar("description", { length: 500 }).default(""),
  /** URL to an image of the feature (uploaded via admin) */
  photoUrl: varchar("photoUrl", { length: 1024 }).default(""),
  /** List price in dollars (shown as strikethrough, discounted to $0) */
  listPrice: decimal("listPrice", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Whether this feature is shown in the calculator */
  isActive: int("isActive").notNull().default(1),
  /**
   * Comma-separated project types this parade stopper applies to.
   * e.g. "addition,bathroom" or "all" (default).
   * Used to show/hide parade stoppers per project type in the calculator.
   */
  projectTypes: varchar("projectTypes", { length: 255 }).notNull().default("all"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpFreeFeature = typeof dpFreeFeatures.$inferSelect;
export type InsertDpFreeFeature = typeof dpFreeFeatures.$inferInsert;

/**
 * Questionnaire questions for the Rough Pricing step of the Design Package Calculator.
 * Questions can have image options (finish levels, room types, affected areas).
 */
export const dpQuestionnaireQuestions = mysqlTable("dp_questionnaire_questions", {
  id: int("id").autoincrement().primaryKey(),
  /** Question text shown to the user */
  question: varchar("question", { length: 500 }).notNull(),
  /** "single_choice" | "multi_choice" | "number" | "text" */
  questionType: varchar("questionType", { length: 32 }).notNull().default("single_choice"),
  /** JSON array of options: [{label, value, photoUrl, description}] — stored as JSON string */
  options: text("options"),
  /** Whether this question is shown in the calculator */
  isActive: int("isActive").notNull().default(1),
  /** Sort order for display */
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpQuestionnaireQuestion = typeof dpQuestionnaireQuestions.$inferSelect;
export type InsertDpQuestionnaireQuestion = typeof dpQuestionnaireQuestions.$inferInsert;

/**
 * Per-project-type section configuration for the Design Package Calculator.
 * Controls which calculator sections (steps) are visible for each project type,
 * and their display order.
 *
 * projectType: "addition" | "full_home_remodel" | "kitchen" | "bathroom"
 * sectionKey: "sqft" | "renderings" | "included_services" | "parade_stoppers" | "feasibility_study"
 */
export const dpProjectTypeSections = mysqlTable("dp_project_type_sections", {
  id: int("id").autoincrement().primaryKey(),
  /** Project type this config applies to */
  projectType: varchar("projectType", { length: 64 }).notNull(),
  /** Section identifier key */
  sectionKey: varchar("sectionKey", { length: 64 }).notNull(),
  /** Human-readable label for the section (admin can rename) */
  sectionLabel: varchar("sectionLabel", { length: 255 }).notNull(),
  /** Whether this section is shown for this project type */
  isEnabled: int("isEnabled").notNull().default(1),
  /** Display order within the project type */
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpProjectTypeSection = typeof dpProjectTypeSections.$inferSelect;
export type InsertDpProjectTypeSection = typeof dpProjectTypeSections.$inferInsert;

/**
 * Admin-configurable settings for the Feasibility Study step in the Design Package Calculator.
 * Single-row table (id = 1 always).
 */
export const dpFeasibilityConfig = mysqlTable("dp_feasibility_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Name/label for this feasibility study configuration */
  name: varchar("name", { length: 255 }).notNull().default("Feasibility Study"),
  /** Sort order for display in the admin panel and calculator */
  sortOrder: int("sortOrder").notNull().default(0),
  /** Whether this config is active/visible in the calculator */
  isActive: mysqlBoolean("isActive").notNull().default(true),
  /** Customer-facing price for the feasibility study */
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  /** Internal rep commission (hidden from customer) */
  repCommission: decimal("repCommission", { precision: 10, scale: 2 }).notNull().default("250.00"),
  /** Internal drafter cost (hidden from customer) */
  drafterCost: decimal("drafterCost", { precision: 10, scale: 2 }).notNull().default("500.00"),
  /** Short description shown in the calculator card */
  description: varchar("description", { length: 1000 }).notNull().default("A feasibility study determines if your addition is structurally and legally viable before committing to a full design package. Includes a site visit, preliminary drawings, and a written report."),
  /** Comma-separated bullet tags shown in the calculator (e.g. \"Zoning Review,Structural Assessment\") */
  tags: varchar("tags", { length: 500 }).notNull().default("Zoning Review,Structural Assessment,Preliminary Drawings,Cost Validation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpFeasibilityConfig = typeof dpFeasibilityConfig.$inferSelect;
export type InsertDpFeasibilityConfig = typeof dpFeasibilityConfig.$inferInsert;

/**
 * Engineer's Letter add-on config for the Basement design package.
 * Shown as an optional selectable item in the basement calculator.
 * Price is admin-configurable; internal cost is hidden from the customer.
 */
export const dpEngineerLetterConfig = mysqlTable("dp_engineer_letter_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Customer-facing price for the engineer's letter */
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("500.00"),
  /** Internal cost (hidden from customer) */
  internalCost: decimal("internalCost", { precision: 10, scale: 2 }).notNull().default("250.00"),
  /** Short description shown in the calculator card */
  description: varchar("description", { length: 1000 }).notNull().default("A stamped letter from a licensed structural engineer confirming the design meets local building code requirements. Required by some municipalities for permit approval."),
  /** Whether this option is active/visible in the calculator */
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpEngineerLetterConfig = typeof dpEngineerLetterConfig.$inferSelect;
export type InsertDpEngineerLetterConfig = typeof dpEngineerLetterConfig.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Rough Pricing Questionnaire System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A questionnaire submission created when a rep sends the questionnaire link
 * to a homeowner. The homeowner fills it out at /questionnaire/:token.
 */
export const roughQuestionnaireSubmissions = mysqlTable("rough_questionnaire_submissions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 50 }).notNull(),
  customerAddress: varchar("customerAddress", { length: 500 }),
  mode: varchar("mode", { length: 20 }),
  status: varchar("status", { length: 30 }).notNull().default("sent"),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RoughQuestionnaireSubmission = typeof roughQuestionnaireSubmissions.$inferSelect;
export type InsertRoughQuestionnaireSubmission = typeof roughQuestionnaireSubmissions.$inferInsert;

/**
 * Which rooms the homeowner selected as part of their project scope.
 * One row per room per submission.
 */
export const roughQuestionnaireRooms = mysqlTable("rough_questionnaire_rooms", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  roomKey: varchar("roomKey", { length: 50 }).notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RoughQuestionnaireRoom = typeof roughQuestionnaireRooms.$inferSelect;
export type InsertRoughQuestionnaireRoom = typeof roughQuestionnaireRooms.$inferInsert;

/**
 * Trade + finish-level selections for the "I know what I need" mode.
 * One row per selected trade per submission.
 */
export const roughQuestionnaireTradeSelections = mysqlTable("rough_questionnaire_trade_selections", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  tradeKey: varchar("tradeKey", { length: 50 }).notNull(),
  selectedPhotoIds: json("selectedPhotoIds"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RoughQuestionnaireTradeSelection = typeof roughQuestionnaireTradeSelections.$inferSelect;
export type InsertRoughQuestionnaireTradeSelection = typeof roughQuestionnaireTradeSelections.$inferInsert;

/**
 * Admin-uploaded inspiration photos for the finish-level picker.
 * Each photo is tagged to a specific trade so only relevant photos show
 * when a homeowner selects that trade.
 */
export const roughInspirationPhotos = mysqlTable("rough_inspiration_photos", {
  id: int("id").autoincrement().primaryKey(),
  tradeKey: varchar("tradeKey", { length: 50 }).notNull().default("general"),
  photoUrl: varchar("photoUrl", { length: 1000 }).notNull(),
  title: varchar("title", { length: 255 }).notNull().default(""),
  subtitle: varchar("subtitle", { length: 500 }).notNull().default(""),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RoughInspirationPhoto = typeof roughInspirationPhotos.$inferSelect;
export type InsertRoughInspirationPhoto = typeof roughInspirationPhotos.$inferInsert;

// ─── Dynamic Questionnaire Builder ───────────────────────────────────────────

/**
 * Questions in the dynamic pre-visit questionnaire.
 * Supports single-select and multi-select answer types.
 * Branching: if parentQuestionId + parentOptionId are set, this question
 * only appears when that specific option was selected on the parent question.
 */
export const questionnaireQuestions = mysqlTable("questionnaire_questions", {
  id: int("id").autoincrement().primaryKey(),
  text: text("text").notNull(),
  subtext: text("subtext"),                          // optional helper text below the question
  type: mysqlEnum("type", ["single", "multi", "quantity_select", "voice_photo", "photo_upload", "number", "text"]).notNull().default("single"),
  /** Input type for the question: options (use option cards), yes_no, number, dropdown, checkboxes, text */
  inputType: varchar("inputType", { length: 32 }).notNull().default("options"),
  /** For dropdown/checkboxes input types: JSON array of string choices (when not using the options table) */
  dropdownOptions: json("dropdownOptions").$type<string[]>(),
  imageUrl: text("imageUrl"),                        // optional header image for the question card
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  /**
   * Calculation rules: JSON array of rules that apply pricing based on the answer.
   * Each rule: { name, conditionType, conditionValue, fixedCost, formula, description }
   * conditionType: "always_apply" | "equals" | "greater_than" | "less_than" | "between" | "contains"
   * conditionValue: string or number or [min, max] for between
   * fixedCost: flat dollar amount to add when rule matches
   * formula: optional expression using variables: answer, sqft, room_sqft
   */
  calculationRules: json("calculationRules").$type<Array<{
    name: string;
    conditionType: "always_apply" | "equals" | "greater_than" | "less_than" | "between" | "contains";
    conditionValue?: string | number | [number, number];
    fixedCost?: number;
    formula?: string;
    description?: string;
  }>>(),
  /** Trade category for CSI division grouping (e.g. "07 - Thermal and Moisture Protection") */
  tradeCategory: varchar("tradeCategory", { length: 128 }),
  /** Precise display order (decimal for sub-ordering follow-ups, e.g. 1.0, 1.1, 1.2) */
  displayOrder: decimal("displayOrder", { precision: 10, scale: 2 }),
  /**
   * Section key for grouping questions into the 10 sections:
   * project_basics | existing_conditions | site_access | structure_foundation_roof |
   * mechanical_electrical_plumbing | exterior_finishes | interior_finishes |
   * trade_upgrades | overall_finish_level | photos_inspiration
   */
  section: varchar("section", { length: 64 }),
  // Branching: show this question only when a specific option was chosen
  parentQuestionId: int("parentQuestionId"),         // null = always shown (root question)
  parentOptionId: int("parentOptionId"),             // null = always shown
  /**
   * Which design package project types this question applies to.
   * JSON array of: "bathroom" | "kitchen" | "addition" | "basement"
   * null or empty array = shown for ALL project types.
   */
  applicableProjectTypes: json("applicableProjectTypes").$type<Array<"bathroom" | "kitchen" | "addition" | "basement">>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type InsertQuestionnaireQuestion = typeof questionnaireQuestions.$inferInsert;

/**
 * Answer options for each question.
 * Each option can carry a price adjustment that feeds the rough estimate engine.
 * priceAdjustmentType:
 *   "flat"    → add/subtract a fixed dollar amount from the base range
 *   "percent" → multiply the running total by (1 + value/100)
 *   "none"    → no price effect
 */
export const questionnaireOptions = mysqlTable("questionnaire_options", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  text: varchar("text", { length: 255 }).notNull(),
  subtext: text("subtext"),
  imageUrl: text("imageUrl"),                        // optional thumbnail image for the option
  sortOrder: int("sortOrder").notNull().default(0),
  priceAdjustment: decimal("priceAdjustment", { precision: 12, scale: 2 }).default("0"),
  priceAdjustmentType: mysqlEnum("priceAdjustmentType", ["flat", "percent", "none"]).notNull().default("none"),
  /** Pricing tier level 1-5 for visual-choice questions (Overall Finish Level section) */
  pricingTier: int("pricingTier"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnaireOption = typeof questionnaireOptions.$inferSelect;
export type InsertQuestionnaireOption = typeof questionnaireOptions.$inferInsert;

/**
 * Price rules define the base estimate range for a questionnaire.
 * Each rule has a base min/max and a JSON array of conditions.
 * The engine picks the first matching rule (or the default rule with no conditions).
 * conditions: Array<{ questionId: number; optionIds: number[] }> — all must match.
 */
export const questionnairePriceRules = mysqlTable("questionnaire_price_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  baseMin: decimal("baseMin", { precision: 12, scale: 2 }).notNull(),
  baseMax: decimal("baseMax", { precision: 12, scale: 2 }).notNull(),
  conditions: json("conditions").$type<Array<{ questionId: number; optionIds: number[] }>>().default([]),
  sortOrder: int("sortOrder").notNull().default(0),  // lower = higher priority
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnairePriceRule = typeof questionnairePriceRules.$inferSelect;
export type InsertQuestionnairePriceRule = typeof questionnairePriceRules.$inferInsert;

/**
 * A questionnaire session represents one customer filling out the questionnaire.
 * Created when the sales rep sends the link; completed when the customer submits.
 * sessionToken is the unique URL token (/q/:sessionToken).
 */
export const questionnaireSessions = mysqlTable("questionnaire_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 30 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  salesRepName: varchar("salesRepName", { length: 255 }),
  notes: text("notes"),                              // internal notes from sales rep
  estimatedMin: decimal("estimatedMin", { precision: 12, scale: 2 }),
  estimatedMax: decimal("estimatedMax", { precision: 12, scale: 2 }),
  completedAt: timestamp("completedAt"),
  knowledgePath: mysqlEnum("knowledgePath", ["help_me_figure_out", "i_know_what_i_want", "i_have_plans"]),
  /** Which design package type this session is for (bathroom | kitchen | addition | basement) */
  projectType: varchar("projectType", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnaireSession = typeof questionnaireSessions.$inferSelect;
export type InsertQuestionnaireSession = typeof questionnaireSessions.$inferInsert;

/**
 * Individual answers submitted by a customer for a session.
 * selectedOptionIds is a JSON array of option IDs (supports multi-select).
 */
export const questionnaireAnswers = mysqlTable("questionnaire_answers", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOptionIds: json("selectedOptionIds").$type<number[]>().notNull(),
  /** For non-option input types (number, text, dropdown, yes_no, checkboxes): the freeform answer value */
  freeformValue: text("freeformValue"),
  /** For quantity_select: map of optionId (as string key) → quantity number */
  quantities: json("quantities").$type<Record<string, number>>(),
  /** For voice_photo: transcribed text from the customer's voice recording */
  voiceTranscription: text("voiceTranscription"),
  /** For voice_photo: S3 URLs of uploaded inspiration photos */
  photoUrls: json("photoUrls").$type<string[]>(),
  /** For photo_upload: the category label (e.g. "Electrical Panel", "Existing Roofline") */
  photoCategory: varchar("photoCategory", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestionnaireAnswer = typeof questionnaireAnswers.$inferSelect;
export type InsertQuestionnaireAnswer = typeof questionnaireAnswers.$inferInsert;

/**
 * Pricing tier multipliers for the questionnaire pricing engine.
 * For each section (e.g. "interior_finishes") and tier level (1-5),
 * defines a multiplier applied to the base price.
 * Example: section="interior_finishes", tier=3, multiplier=1.00 (baseline)
 *          section="interior_finishes", tier=5, multiplier=1.35 (premium)
 */
export const questionnairePricingTierMultipliers = mysqlTable("questionnaire_pricing_tier_multipliers", {
  id: int("id").autoincrement().primaryKey(),
  /** Section key matching questionnaire_questions.section */
  sectionKey: varchar("sectionKey", { length: 64 }).notNull(),
  /** Human-readable section label for display */
  sectionLabel: varchar("sectionLabel", { length: 128 }).notNull(),
  /** Tier level 1-5 */
  tier: int("tier").notNull(),
  /** Multiplier applied to the running estimate (e.g. 1.15 = +15%) */
  multiplier: decimal("multiplier", { precision: 6, scale: 4 }).notNull().default("1.0000"),
  /** Display label for this tier (e.g. "Level 3 — Mid-Grade") */
  tierLabel: varchar("tierLabel", { length: 128 }).notNull().default(""),
  /** Weight of this section's multiplier (0-1, controls how much this section contributes) */
  weight: decimal("weight", { precision: 5, scale: 4 }).notNull().default("1.0000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnairePricingTierMultiplier = typeof questionnairePricingTierMultipliers.$inferSelect;
export type InsertQuestionnairePricingTierMultiplier = typeof questionnairePricingTierMultipliers.$inferInsert;

/**
 * Flat dollar add-ons for specific option selections in the questionnaire.
 * When a customer selects a specific option, this amount is added to the estimate.
 * Used for trade-specific upgrades (e.g. smart home, custom built-ins).
 */
export const questionnairePricingAddons = mysqlTable("questionnaire_pricing_addons", {
  id: int("id").autoincrement().primaryKey(),
  /** The question this add-on applies to */
  questionId: int("questionId").notNull(),
  /** The specific option that triggers this add-on (null = any selection of the question) */
  optionId: int("optionId"),
  /** Human-readable label for this add-on */
  label: varchar("label", { length: 255 }).notNull(),
  /** Flat dollar amount added to the estimate */
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  /** Whether this add-on is active */
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuestionnairePricingAddon = typeof questionnairePricingAddons.$inferSelect;
export type InsertQuestionnairePricingAddon = typeof questionnairePricingAddons.$inferInsert;

/**
 * Design Package Cost Catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the DesignYourPriceCatelog spreadsheet.
 * Each row is a single billable line item from one of the 16 trade sheets.
 *
 * Pricing model (same as the spreadsheet):
 *   estimatedPrice = (laborCost + materialCost) / (1 - marginPct/100)
 *   When estimatedPrice is set directly (e.g. from the spreadsheet) it takes
 *   precedence; laborCost / materialCost are stored for admin reference.
 *
 * quantityFormula: optional JS expression evaluated at estimate time.
 *   Available variables: sqft, lf (linear feet), qty (default 1), rooms,
 *   floors, bedrooms, bathrooms.
 *   Example: "sqft / 100"  →  number of squares of roofing
 *            "lf * 2"      →  double the linear footage
 *            "1"           →  fixed quantity of 1
 */
export const dpCatalogItems = mysqlTable("dp_catalog_items", {
  id: int("id").autoincrement().primaryKey(),
  /** Trade sheet name from the spreadsheet (e.g. "Roofing", "Electrical", "Framing") */
  tradeSheet: varchar("tradeSheet", { length: 64 }).notNull(),
  /** Sub-category within the sheet (e.g. "Recepticals", "Plumbing", "Carpentry") */
  category: varchar("category", { length: 128 }),
  /** Product / line item name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Unit of measure: "each" | "sqft" | "lf" | "square" | "hour" | "day" | "cy" | "ton" */
  unit: varchar("unit", { length: 32 }).notNull().default("each"),
  /** Internal labor cost per unit (before margin) */
  laborCost: decimal("laborCost", { precision: 12, scale: 2 }).default("0.00"),
  /** Internal material cost per unit (before margin) */
  materialCost: decimal("materialCost", { precision: 12, scale: 2 }).default("0.00"),
  /** Gross margin percentage (e.g. 37.5 means 37.5%) */
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }).default("37.50"),
  /** Customer-facing price per unit (overrides the labor+material+margin formula when set) */
  estimatedPrice: decimal("estimatedPrice", { precision: 12, scale: 2 }).default("0.00"),
  /** Minimum charge floor — if qty × estimatedPrice < minimumPrice, use minimumPrice */
  minimumPrice: decimal("minimumPrice", { precision: 12, scale: 2 }).default("0.00"),
  /** Optional URL to product page (Amazon, Lowes, etc.) */
  productLink: text("productLink"),
  /** For Electrical: pricing context — "new_construction" | "changes" | "post_drywall" | null */
  electricalContext: varchar("electricalContext", { length: 32 }),
  /** Default quantity formula (JS expression). Null = use qty from pricing rule. */
  defaultQtyFormula: text("defaultQtyFormula"),
  /** Notes visible to admin only */
  notes: text("notes"),
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpCatalogItem = typeof dpCatalogItems.$inferSelect;
export type InsertDpCatalogItem = typeof dpCatalogItems.$inferInsert;

/**
 * Design Package Pricing Rules
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps questionnaire answers to specific catalog items with quantities.
 * The pricing engine evaluates all active rules and sums the triggered items.
 *
 * A rule fires when ALL of its conditions are satisfied.
 * conditions: Array<{ questionId: number; optionIds: number[]; operator?: "any"|"all" }>
 *   - optionIds: the option IDs that must be selected (operator "any" = at least one)
 *   - Empty conditions array = always fires (used for base items like Permitting)
 *
 * quantity: how many units of the catalog item to include.
 *   Can be a number or a formula string (same variables as defaultQtyFormula).
 *   Examples: "1", "sqft / 100", "lf", "rooms * 2"
 *
 * tradeSection: display grouping in the estimate breakdown
 *   (e.g. "Permitting", "Excavation", "Foundation", "Framing", "Roofing", ...)
 */
export const dpPricingRules = mysqlTable("dp_pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  /** Human-readable rule name for admin display */
  name: varchar("name", { length: 255 }).notNull(),
  /** The catalog item this rule adds to the estimate */
  catalogItemId: int("catalogItemId").notNull(),
  /**
   * Conditions that must ALL be true for this rule to fire.
   * Empty array = unconditional (always included).
   */
  conditions: json("conditions").$type<Array<{
    questionId: number;
    optionIds: number[];
    operator?: "any" | "all";
  }>>().notNull().default([]),
  /**
   * Quantity of the catalog item to include.
   * Can be a number string ("1", "2") or a formula ("sqft / 100", "lf").
   */
  quantity: varchar("quantity", { length: 128 }).notNull().default("1"),
  /** Trade section for grouping in the estimate breakdown */
  tradeSection: varchar("tradeSection", { length: 128 }).notNull().default("General"),
  /** Display order within the trade section */
  sortOrder: int("sortOrder").notNull().default(0),
  /** Whether this rule is active */
  isActive: int("isActive").notNull().default(1),
  /** Optional notes for the admin */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpPricingRule = typeof dpPricingRules.$inferSelect;
export type InsertDpPricingRule = typeof dpPricingRules.$inferInsert;

// ── Cabinet Pricing ────────────────────────────────────────────────────────
/**
 * Cabinet pricing from Woodoo Cabinetry and US Cabinet Depot.
 * Each cabinet option has 3 rows: base (LF), upper (LF), pantry (EA).
 * estimatedPrice = discountedUnitPrice after applying marginPct markup.
 */
export const dpCabinetPricing = mysqlTable("dp_cabinet_pricing", {
  id: int("id").autoincrement().primaryKey(),
  vendor: varchar("vendor", { length: 100 }).notNull(),
  collection: varchar("collection", { length: 100 }),
  style: varchar("style", { length: 100 }).notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  optionLabel: varchar("option_label", { length: 200 }).notNull(),
  lineItemType: mysqlEnum("line_item_type", ["base", "upper", "pantry"]).notNull(),
  unit: varchar("unit", { length: 10 }).notNull().default("LF"),
  msrpUnitPrice: decimal("msrp_unit_price", { precision: 10, scale: 4 }).notNull().default("0"),
  discountedUnitPrice: decimal("discounted_unit_price", { precision: 10, scale: 4 }).notNull().default("0"),
  marginPct: decimal("margin_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  isActive: int("is_active").notNull().default(1),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
});

export type DpCabinetPricing = typeof dpCabinetPricing.$inferSelect;
export type NewDpCabinetPricing = typeof dpCabinetPricing.$inferInsert;

/**
 * Files uploaded by customers during a questionnaire session.
 * Covers both architectural plan uploads (plan_based path) and
 * structured photo prompts (photo_upload question type).
 * File bytes live in S3; only metadata is stored here.
 */
export const questionnaireSessionFiles = mysqlTable("questionnaire_session_files", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to questionnaire_sessions.id */
  sessionId: int("sessionId").notNull(),
  /** Foreign key to questionnaire_questions.id (nullable for session-level uploads) */
  questionId: int("questionId"),
  /** S3 object key (used for deletion / presigned URLs) */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  /** Public CDN URL returned by storagePut */
  fileUrl: text("fileUrl").notNull(),
  /** Original filename provided by the browser */
  fileName: varchar("fileName", { length: 255 }).notNull(),
  /** File size in bytes */
  fileSize: int("fileSize").notNull().default(0),
  /** MIME type (e.g. application/pdf, image/jpeg) */
  mimeType: varchar("mimeType", { length: 128 }).notNull().default("application/octet-stream"),
  /** Logical category: "project_plans" | "reference_photo" | "site_photo" | "other" */
  fileCategory: varchar("fileCategory", { length: 64 }).notNull().default("other"),
  /** Human-readable label from the question prompt (e.g. "Existing Roofline") */
  questionLabel: varchar("questionLabel", { length: 255 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type QuestionnaireSessionFile = typeof questionnaireSessionFiles.$inferSelect;
export type InsertQuestionnaireSessionFile = typeof questionnaireSessionFiles.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Bathroom Remodel — Design Package Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level bathroom remodel configuration.
 * Controls markup %, commission, and design package items.
 */
export const dpBathroomConfig = mysqlTable("dp_bathroom_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Gross profit margin applied to all bathroom line items (0–1, e.g. 0.40 = 40%) */
  markupPct: decimal("markupPct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  /** Sales rep commission — flat dollar amount, admin-only, not shown on estimate */
  repCommission: decimal("repCommission", { precision: 10, scale: 2 }).notNull().default("500.00"),
  /** Cost of architectural/structural engineering for design package */
  dpArchEngineeringCost: decimal("dpArchEngineeringCost", { precision: 10, scale: 2 }).notNull().default("800.00"),
  /** Cost of 3D renderings for design package */
  dp3dRenderingsCost: decimal("dp3dRenderingsCost", { precision: 10, scale: 2 }).notNull().default("400.00"),
  /** Cost of plumbing schematic for design package */
  dpPlumbingSchematicCost: decimal("dpPlumbingSchematicCost", { precision: 10, scale: 2 }).notNull().default("200.00"),
  /** Cost of electrical schematic for design package */
  dpElectricalSchematicCost: decimal("dpElectricalSchematicCost", { precision: 10, scale: 2 }).notNull().default("200.00"),
  /** Cost of material selections service for design package */
  dpMaterialSelectionsCost: decimal("dpMaterialSelectionsCost", { precision: 10, scale: 2 }).notNull().default("300.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomConfig = typeof dpBathroomConfig.$inferSelect;
export type InsertDpBathroomConfig = typeof dpBathroomConfig.$inferInsert;

/**
 * Bathroom size tiers — base cost per tier.
 * Half Bath / Full Bath / Master Bath / Custom (uses sqft × rate).
 */
export const dpBathroomSizeTiers = mysqlTable("dp_bathroom_size_tiers", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  /** Typical sqft range for display only */
  sqftRange: varchar("sqftRange", { length: 64 }),
  /** Base cost for this tier (used when not custom) */
  baseCost: decimal("baseCost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** Cost per sqft — used only when slug = 'custom' */
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomSizeTier = typeof dpBathroomSizeTiers.$inferSelect;
export type InsertDpBathroomSizeTier = typeof dpBathroomSizeTiers.$inferInsert;

/**
 * Plumbing fixture relocation options.
 * Each fixture is a toggle; selecting it adds its cost to the estimate.
 */
export const dpBathroomPlumbingItems = mysqlTable("dp_bathroom_plumbing_items", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  /** Internal cost to relocate this fixture */
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomPlumbingItem = typeof dpBathroomPlumbingItems.$inferSelect;
export type InsertDpBathroomPlumbingItem = typeof dpBathroomPlumbingItems.$inferInsert;

/**
 * Electrical scope options — single-select menu.
 */
export const dpBathroomElectricalOptions = mysqlTable("dp_bathroom_electrical_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  pricingType: varchar("pricingType", { length: 32 }).notNull().default("per_unit"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomElectricalOption = typeof dpBathroomElectricalOptions.$inferSelect;
export type InsertDpBathroomElectricalOption = typeof dpBathroomElectricalOptions.$inferInsert;

/**
 * HVAC scope options — single-select menu.
 */
export const dpBathroomHvacOptions = mysqlTable("dp_bathroom_hvac_options", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomHvacOption = typeof dpBathroomHvacOptions.$inferSelect;
export type InsertDpBathroomHvacOption = typeof dpBathroomHvacOptions.$inferInsert;

/**
 * Finish level tiers — single-select menu.
 * Sets a per-sqft material allowance cost.
 */
export const dpBathroomFinishTiers = mysqlTable("dp_bathroom_finish_tiers", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  /** Cost per sqft for materials at this finish level */
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomFinishTier = typeof dpBathroomFinishTiers.$inferSelect;
export type InsertDpBathroomFinishTier = typeof dpBathroomFinishTiers.$inferInsert;

/**
 * Add-on items — multi-select checklist.
 * Each add-on has a flat cost.
 */
export const dpBathroomAddons = mysqlTable("dp_bathroom_addons", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomAddon = typeof dpBathroomAddons.$inferSelect;
export type InsertDpBathroomAddon = typeof dpBathroomAddons.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// BATHROOM MATERIAL SELECTIONS — replaces simple finish tier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shower / Tub Surround options.
 * type: 'fiberglass' | 'cultured_marble' | 'tile'
 * For tile: tileSize and tilePattern are used.
 * costPerSqft applies to cultured_marble and tile.
 * flatCost applies to fiberglass.
 */
export const dpBathroomShowerSurround = mysqlTable("dp_bathroom_shower_surround", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'fiberglass' | 'cultured_marble' | 'tile'
  tileSize: varchar("tileSize", { length: 32 }), // e.g. '4x4', '6x6', '12x12', '12x24', '24x24'
  tilePattern: varchar("tilePattern", { length: 64 }), // e.g. 'straight', 'offset', 'herringbone', 'diagonal', 'basketweave'
  flatCost: decimal("flatCost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomShowerSurround = typeof dpBathroomShowerSurround.$inferSelect;
export type InsertDpBathroomShowerSurround = typeof dpBathroomShowerSurround.$inferInsert;

/**
 * Vanity options.
 * type: 'custom' | 'prebuilt_wood' | 'prebuilt_painted'
 * For prebuilt: sizeInches is the vanity width (24, 30, 36, 48, 60, 72).
 * custom uses costPerLinearFt.
 * prebuilt uses flatCost (varies by size).
 */
export const dpBathroomVanity = mysqlTable("dp_bathroom_vanity", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'custom' | 'prebuilt_wood' | 'prebuilt_painted'
  sizeInches: int("sizeInches"), // 24, 30, 36, 48, 60, 72 — null for custom
  costPerLinearFt: decimal("costPerLinearFt", { precision: 10, scale: 2 }).notNull().default("0.00"),
  flatCost: decimal("flatCost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomVanity = typeof dpBathroomVanity.$inferSelect;
export type InsertDpBathroomVanity = typeof dpBathroomVanity.$inferInsert;

/**
 * Flooring options.
 * type: 'lvp' | 'tile'
 * LVP: costPerSqft only.
 * Tile: tileSize + tilePattern + costPerSqft.
 */
export const dpBathroomFlooring = mysqlTable("dp_bathroom_flooring", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'lvp' | 'tile'
  tileSize: varchar("tileSize", { length: 32 }), // '6x6', '12x12', '12x24', '24x24'
  tilePattern: varchar("tilePattern", { length: 64 }), // 'straight', 'offset', 'herringbone', 'diagonal'
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomFlooring = typeof dpBathroomFlooring.$inferSelect;
export type InsertDpBathroomFlooring = typeof dpBathroomFlooring.$inferInsert;

/**
 * Countertop options.
 * type: 'remnant' | 'full_slab'
 * Both use costPerSqft.
 * edgeProfile is a separate add-on cost stored in dpBathroomCountertopEdge.
 */
export const dpBathroomCountertop = mysqlTable("dp_bathroom_countertop", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'remnant' | 'full_slab'
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomCountertop = typeof dpBathroomCountertop.$inferSelect;
export type InsertDpBathroomCountertop = typeof dpBathroomCountertop.$inferInsert;

/**
 * Countertop edge profile add-ons.
 * Each profile has a flat add-on cost per linear foot of edge.
 */
export const dpBathroomCountertopEdge = mysqlTable("dp_bathroom_countertop_edge", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  costPerLinearFt: decimal("costPerLinearFt", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomCountertopEdge = typeof dpBathroomCountertopEdge.$inferSelect;
export type InsertDpBathroomCountertopEdge = typeof dpBathroomCountertopEdge.$inferInsert;

/**
 * Toilet options.
 * type: 'standard' | 'concealed_ptrap' | 'smart'
 * Each has a flat cost.
 */
export const dpBathroomToilet = mysqlTable("dp_bathroom_toilet", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'standard' | 'concealed_ptrap' | 'smart'
  flatCost: decimal("flatCost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomToilet = typeof dpBathroomToilet.$inferSelect;
export type InsertDpBathroomToilet = typeof dpBathroomToilet.$inferInsert;

/**
 * Wall finish options.
 * type: 'paint' | 'wallpaper' | 'tile'
 * Paint and wallpaper: costPerSqft only.
 * Tile: tileSize + tilePattern + costPerSqft.
 */
export const dpBathroomWallFinish = mysqlTable("dp_bathroom_wall_finish", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  description: varchar("description", { length: 500 }),
  type: varchar("type", { length: 32 }).notNull(), // 'paint' | 'wallpaper' | 'tile'
  tileSize: varchar("tileSize", { length: 32 }), // for tile only
  tilePattern: varchar("tilePattern", { length: 64 }), // for tile only
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder: int("sortOrder").notNull().default(0),
  isActive: mysqlBoolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomWallFinish = typeof dpBathroomWallFinish.$inferSelect;
export type InsertDpBathroomWallFinish = typeof dpBathroomWallFinish.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Bathroom — Expanded Configuration (added for brochure-based pricing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plumbing feasibility checklist items.
 * Admin can add/edit/reorder these. Customer must check all of them before
 * plumbing changes are enabled in the calculator.
 */
export const dpBathroomPlumbingChecklist = mysqlTable("dp_bathroom_plumbing_checklist", {
  id: int("id").autoincrement().primaryKey(),
  itemKey: varchar("itemKey", { length: 64 }),  // e.g. 'move_toilet', 'move_shower', 'add_fixture'
  itemText: text("item_text").notNull(),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomPlumbingChecklist = typeof dpBathroomPlumbingChecklist.$inferSelect;
export type InsertDpBathroomPlumbingChecklist = typeof dpBathroomPlumbingChecklist.$inferInsert;

/**
 * HVAC feasibility checklist items.
 * Admin can add/edit/reorder these. Customer must check all of them before
 * HVAC changes are enabled in the calculator.
 */
export const dpBathroomHvacChecklist = mysqlTable("dp_bathroom_hvac_checklist", {
  id: int("id").autoincrement().primaryKey(),
  itemKey: varchar("itemKey", { length: 64 }),  // e.g. 'exhaust_fan_replace', 'new_exhaust_fan', 'full_vent_reroute'
  itemText: text("item_text").notNull(),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomHvacChecklist = typeof dpBathroomHvacChecklist.$inferSelect;
export type InsertDpBathroomHvacChecklist = typeof dpBathroomHvacChecklist.$inferInsert;

/**
 * Tub configuration options.
 * tubType: 'alcove' | 'drop_in' | 'freestanding'
 * Each type has an install cost (from brochure: alcove/drop-in $700, freestanding $1,450).
 * sizeLabel is a display string (e.g. "60×30", "66×32") — admin-configurable.
 */
export const dpBathroomTubConfig = mysqlTable("dp_bathroom_tub_config", {
  id: int("id").autoincrement().primaryKey(),
  tubType: varchar("tub_type", { length: 32 }).notNull(), // 'alcove' | 'drop_in' | 'freestanding'
  label: varchar("label", { length: 128 }).notNull(),
  installCost: decimal("install_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomTubConfig = typeof dpBathroomTubConfig.$inferSelect;
export type InsertDpBathroomTubConfig = typeof dpBathroomTubConfig.$inferInsert;

/**
 * Shower configuration options.
 * configType groups options by role:
 *   'pan_size'         — shower pan install cost by size range
 *   'curbless_upcharge' — flat upcharge for curbless shower
 *   'surround_prep'    — per-sqft waterproofing/prep cost
 *   'niche'            — niche type and cost
 *   'bench'            — bench type and cost (per_lf or flat)
 *   'shelf'            — shelf type and cost
 *   'glass'            — glass enclosure type (single door, L, sliding, single wall)
 */
export const dpBathroomShowerConfig = mysqlTable("dp_bathroom_shower_config", {
  id: int("id").autoincrement().primaryKey(),
  configType: varchar("config_type", { length: 32 }).notNull(),
  optionKey: varchar("option_key", { length: 80 }).notNull().unique(),
  label: varchar("label", { length: 150 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** 'flat' | 'per_sqft' | 'per_lf' */
  pricingType: varchar("pricing_type", { length: 20 }).notNull().default("flat"),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomShowerConfig = typeof dpBathroomShowerConfig.$inferSelect;
export type InsertDpBathroomShowerConfig = typeof dpBathroomShowerConfig.$inferInsert;

/**
 * Tile size categories with per-sqft install costs for floor, wall, and ceiling.
 * Based on brochure page 9 pricing table.
 */
export const dpBathroomTileSizes = mysqlTable("dp_bathroom_tile_sizes", {
  id: int("id").autoincrement().primaryKey(),
  sizeKey: varchar("size_key", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  floorCostPerSqft: decimal("floor_cost_per_sqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  wallCostPerSqft: decimal("wall_cost_per_sqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  ceilingCostPerSqft: decimal("ceiling_cost_per_sqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomTileSize = typeof dpBathroomTileSizes.$inferSelect;
export type InsertDpBathroomTileSize = typeof dpBathroomTileSizes.$inferInsert;

/**
 * Tile layout pattern upcharges (per sqft, added on top of base tile install cost).
 * Based on brochure page 9 pattern diagram.
 */
export const dpBathroomTilePatterns = mysqlTable("dp_bathroom_tile_patterns", {
  id: int("id").autoincrement().primaryKey(),
  patternKey: varchar("pattern_key", { length: 80 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  upchargePerSqft: decimal("upcharge_per_sqft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomTilePattern = typeof dpBathroomTilePatterns.$inferSelect;
export type InsertDpBathroomTilePattern = typeof dpBathroomTilePatterns.$inferInsert;

/**
 * Vanity pricing matrix: width (inches) × material family.
 * materials: 'painted' | 'alder_maple' | 'white_oak' | 'walnut'
 * Prices from brochure page 3.
 */
export const dpBathroomVanityPricing = mysqlTable("dp_bathroom_vanity_pricing", {
  id: int("id").autoincrement().primaryKey(),
  widthInches: int("width_inches").notNull(),
  material: varchar("material", { length: 50 }).notNull(), // 'painted' | 'alder_maple' | 'white_oak' | 'walnut'
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: mysqlBoolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (t) => [uniqueIndex("uq_vanity_width_material").on(t.widthInches, t.material)]);
export type DpBathroomVanityPricing = typeof dpBathroomVanityPricing.$inferSelect;
export type InsertDpBathroomVanityPricing = typeof dpBathroomVanityPricing.$inferInsert;

/**
 * Floating vanity support pricing config (singleton row, id=1).
 * From brochure: $175 per support, every 16 inches, minimum 2 supports.
 */
export const dpBathroomVanitySupport = mysqlTable("dp_bathroom_vanity_support", {
  id: int("id").autoincrement().primaryKey(),
  costPerSupport: decimal("cost_per_support", { precision: 10, scale: 2 }).notNull().default("175.00"),
  spacingInches: int("spacing_inches").notNull().default(16),
  minSupports: int("min_supports").notNull().default(2),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomVanitySupport = typeof dpBathroomVanitySupport.$inferSelect;

/**
 * Self-leveler config (singleton row, id=1).
 * From brochure page 12: $100/bag, 50 sqft at 1/4", 25 sqft at 1/2", 12 sqft at 3/4".
 */
export const dpBathroomSelfLeveler = mysqlTable("dp_bathroom_self_leveler", {
  id: int("id").autoincrement().primaryKey(),
  costPerBag: decimal("cost_per_bag", { precision: 10, scale: 2 }).notNull().default("100.00"),
  sqftPerBagQuarterInch: int("sqft_per_bag_quarter_inch").notNull().default(50),
  sqftPerBagHalfInch: int("sqft_per_bag_half_inch").notNull().default(25),
  sqftPerBagThreeQuarterInch: int("sqft_per_bag_three_quarter_inch").notNull().default(12),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomSelfLeveler = typeof dpBathroomSelfLeveler.$inferSelect;

// ── Bathroom Fixture Inventory ────────────────────────────────────────────────
/**
 * Fixture types present in the bathroom (toilet, shower, tub, vanity_sink, etc.)
 */
export const dpBathroomFixtureTypes = mysqlTable("dp_bathroom_fixture_types", {
  id:         int("id").primaryKey().autoincrement(),
  fixtureKey: varchar("fixture_key", { length: 64 }).notNull(),
  label:      varchar("label", { length: 128 }).notNull(),
  icon:       varchar("icon", { length: 32 }),
  sortOrder:  int("sort_order").notNull().default(0),
  isActive:   tinyint("is_active").notNull().default(1),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpBathroomFixtureType = typeof dpBathroomFixtureTypes.$inferSelect;

/**
 * Actions available per fixture type: leave_as_is | relocate | update | add_new
 */
export const dpBathroomFixtureActions = mysqlTable("dp_bathroom_fixture_actions", {
  id:                int("id").primaryKey().autoincrement(),
  fixtureKey:        varchar("fixture_key", { length: 64 }).notNull(),
  actionType:        varchar("action_type", { length: 32 }).notNull(),
  label:             varchar("label", { length: 128 }).notNull(),
  cost:              decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  costPerFixture:    decimal("cost_per_fixture", { precision: 10, scale: 2 }).notNull().default("0"),
  costNote:          varchar("cost_note", { length: 256 }),
  requiresChecklist: tinyint("requires_checklist").notNull().default(0),
  sortOrder:         int("sort_order").notNull().default(0),
  isActive:          tinyint("is_active").notNull().default(1),
  createdAt:         timestamp("created_at").defaultNow(),
  updatedAt:         timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpBathroomFixtureAction = typeof dpBathroomFixtureActions.$inferSelect;

/**
 * Bathroom Painting Options
 */
export const dpBathroomPainting = mysqlTable("dp_bathroom_painting", {
  id:          int("id").autoincrement().primaryKey(),
  slug:        varchar("slug", { length: 80 }).notNull(),
  label:       varchar("label", { length: 120 }).notNull(),
  description: text("description"),
  pricingType: mysqlEnum("pricing_type", ["per_sqft", "flat", "per_unit"]).notNull().default("per_sqft"),
  cost:        decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder:   int("sort_order").notNull().default(0),
  isActive:    tinyint("is_active").notNull().default(1),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpBathroomPainting = typeof dpBathroomPainting.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// BATHROOM ACCESSORIES
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Accessories that can be added to a bathroom remodel.
 * quantityType: 'none' (just toggle on/off), 'count' (user picks how many)
 */
export const dpBathroomAccessories = mysqlTable("dp_bathroom_accessories", {
  id:           int("id").autoincrement().primaryKey(),
  slug:         varchar("slug", { length: 64 }).notNull().unique(),
  label:        varchar("label", { length: 128 }).notNull(),
  description:  varchar("description", { length: 500 }),
  quantityType: mysqlEnum("quantity_type", ["none", "count"]).notNull().default("none"),
  cost:         decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder:    int("sort_order").notNull().default(0),
  isActive:     tinyint("is_active").notNull().default(1),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomAccessory = typeof dpBathroomAccessories.$inferSelect;
export type InsertDpBathroomAccessory = typeof dpBathroomAccessories.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING VANITY TURN-DOWN CONFIG (singleton, id = 1)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pricing for the floating countertop vanity upgrade with 8" turn-down.
 * turnDownCostPerLinearFt: cost per linear foot of the 8" turn-down panel.
 * floatingMountCost: flat additional cost for wall-mounting the vanity.
 */
export const dpBathroomFloatingVanityConfig = mysqlTable("dp_bathroom_floating_vanity_config", {
  id:                      int("id").autoincrement().primaryKey(),
  turnDownCostPerLinearFt: decimal("turn_down_cost_per_linear_ft", { precision: 10, scale: 2 }).notNull().default("0.00"),
  floatingMountCost:       decimal("floating_mount_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  updatedAt:               timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type DpBathroomFloatingVanityConfig = typeof dpBathroomFloatingVanityConfig.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// KITCHEN PRICE CONSULT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Configurable line items for the Kitchen Price Consult tool.
 * pricingType: flat | per_sqft | per_unit | per_lf
 */
export const dpKitchenOptions = mysqlTable("dp_kitchen_options", {
  id:          int("id").autoincrement().primaryKey(),
  category:    varchar("category", { length: 64 }).notNull(),
  slug:        varchar("slug", { length: 80 }).notNull().unique(),
  label:       varchar("label", { length: 128 }).notNull(),
  description: text("description"),
  pricingType: mysqlEnum("pricing_type", ["flat", "per_sqft", "per_unit", "per_lf"]).notNull().default("flat"),
  cost:        decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder:   int("sort_order").notNull().default(0),
  isActive:    tinyint("is_active").notNull().default(1),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpKitchenOption = typeof dpKitchenOptions.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// ADDITION PRICE CONSULT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Configurable line items for the Addition Price Consult tool.
 */
export const dpAdditionOptions = mysqlTable("dp_addition_options", {
  id:          int("id").autoincrement().primaryKey(),
  category:    varchar("category", { length: 64 }).notNull(),
  slug:        varchar("slug", { length: 80 }).notNull().unique(),
  label:       varchar("label", { length: 128 }).notNull(),
  description: text("description"),
  pricingType: mysqlEnum("pricing_type", ["flat", "per_sqft", "per_unit", "per_lf"]).notNull().default("flat"),
  cost:        decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  costGood:    decimal("cost_good", { precision: 10, scale: 2 }).notNull().default("0.00"),
  costBetter:  decimal("cost_better", { precision: 10, scale: 2 }).notNull().default("0.00"),
  costBest:    decimal("cost_best", { precision: 10, scale: 2 }).notNull().default("0.00"),
  hasTiers:    tinyint("has_tiers").notNull().default(0),
  sortOrder:   int("sort_order").notNull().default(0),
  isActive:    tinyint("is_active").notNull().default(1),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpAdditionOption = typeof dpAdditionOptions.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// BASEMENT PRICE CONSULT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Configurable line items for the Basement Price Consult tool.
 */
export const dpBasementOptions = mysqlTable("dp_basement_options", {
  id:          int("id").autoincrement().primaryKey(),
  category:    varchar("category", { length: 64 }).notNull(),
  slug:        varchar("slug", { length: 80 }).notNull().unique(),
  label:       varchar("label", { length: 128 }).notNull(),
  description: text("description"),
  pricingType: mysqlEnum("pricing_type", ["flat", "per_sqft", "per_unit", "per_lf"]).notNull().default("flat"),
  cost:        decimal("cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  sortOrder:   int("sort_order").notNull().default(0),
  isActive:    tinyint("is_active").notNull().default(1),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type DpBasementOption = typeof dpBasementOptions.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// KITCHEN PRICE CONSULT CONFIG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Global config for the Kitchen Price Consult tool.
 * Single row (id=1).
 */
export const dpKitchenConfig = mysqlTable("dp_kitchen_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Gross profit margin applied to all kitchen line items (0–1, e.g. 0.40 = 40%) */
  markupPct: decimal("markupPct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  /** Sales rep commission — flat dollar amount, admin-only */
  repCommission: decimal("repCommission", { precision: 10, scale: 2 }).notNull().default("500.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpKitchenConfig = typeof dpKitchenConfig.$inferSelect;
export type InsertDpKitchenConfig = typeof dpKitchenConfig.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// ADDITION PRICE CONSULT CONFIG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Global config for the Addition Price Consult tool.
 * Single row (id=1).
 */
export const dpAdditionConfig = mysqlTable("dp_addition_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Gross profit margin applied to all addition line items (0–1, e.g. 0.40 = 40%) */
  markupPct: decimal("markupPct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  /** Sales rep commission — flat dollar amount, admin-only */
  repCommission: decimal("repCommission", { precision: 10, scale: 2 }).notNull().default("1500.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpAdditionConfig = typeof dpAdditionConfig.$inferSelect;
export type InsertDpAdditionConfig = typeof dpAdditionConfig.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// BASEMENT PRICE CONSULT CONFIG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Global config for the Basement Finish Price Consult tool.
 * Single row (id=1).
 */
export const dpBasementConfig = mysqlTable("dp_basement_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Gross profit margin applied to all basement line items (0–1, e.g. 0.40 = 40%) */
  markupPct: decimal("markupPct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  /** Sales rep commission — flat dollar amount, admin-only */
  repCommission: decimal("repCommission", { precision: 10, scale: 2 }).notNull().default("750.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpBasementConfig = typeof dpBasementConfig.$inferSelect;
export type InsertDpBasementConfig = typeof dpBasementConfig.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// CABINET PRICING CONFIG
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Cabinet pricing configuration.
 * Stores base Shaker price per LF for each cabinet type,
 * finish multipliers, add-on prices, and assembly/install rates.
 * Single row (id=1).
 */
export const dpCabinetConfig = mysqlTable("dp_cabinet_config", {
  id: int("id").autoincrement().primaryKey(),
  // Base Shaker prices per linear foot (cost, before markup)
  baseShaker_baseCabinet: decimal("base_shaker_base_cabinet", { precision: 10, scale: 2 }).notNull().default("120.00"),
  baseShaker_wallCabinet: decimal("base_shaker_wall_cabinet", { precision: 10, scale: 2 }).notNull().default("90.00"),
  baseShaker_tallCabinet: decimal("base_shaker_tall_cabinet", { precision: 10, scale: 2 }).notNull().default("200.00"),
  baseShaker_vanityCabinet: decimal("base_shaker_vanity_cabinet", { precision: 10, scale: 2 }).notNull().default("130.00"),
  // Finish multipliers (stored as decimal, e.g. 1.10)
  mult_standard: decimal("mult_standard", { precision: 5, scale: 4 }).notNull().default("1.0000"),
  mult_color: decimal("mult_color", { precision: 5, scale: 4 }).notNull().default("1.1000"),
  mult_essenceOak: decimal("mult_essence_oak", { precision: 5, scale: 4 }).notNull().default("1.1600"),
  mult_essenceOakFullHeight: decimal("mult_essence_oak_full_height", { precision: 5, scale: 4 }).notNull().default("1.2100"),
  mult_havenDune: decimal("mult_haven_dune", { precision: 5, scale: 4 }).notNull().default("1.1600"),
  mult_havenEmber: decimal("mult_haven_ember", { precision: 5, scale: 4 }).notNull().default("1.2100"),
  // Wall cabinet height upcharges per LF (cost delta above 30" standard)
  wallUpcharge_36in: decimal("wall_upcharge_36in", { precision: 10, scale: 2 }).notNull().default("15.00"),
  wallUpcharge_42in: decimal("wall_upcharge_42in", { precision: 10, scale: 2 }).notNull().default("30.00"),
  // Base type upcharges per LF (cost delta above standard)
  baseUpcharge_fullHeight: decimal("base_upcharge_full_height", { precision: 10, scale: 2 }).notNull().default("20.00"),
  baseUpcharge_drawer: decimal("base_upcharge_drawer", { precision: 10, scale: 2 }).notNull().default("25.00"),
  baseUpcharge_specialty: decimal("base_upcharge_specialty", { precision: 10, scale: 2 }).notNull().default("40.00"),
  // Tall cabinet flat prices per unit (cost)
  tallPrice_pantry: decimal("tall_price_pantry", { precision: 10, scale: 2 }).notNull().default("350.00"),
  tallPrice_oven: decimal("tall_price_oven", { precision: 10, scale: 2 }).notNull().default("400.00"),
  tallPrice_linen: decimal("tall_price_linen", { precision: 10, scale: 2 }).notNull().default("300.00"),
  // Add-on flat prices per unit (cost)
  addon_trashPullout: decimal("addon_trash_pullout", { precision: 10, scale: 2 }).notNull().default("120.00"),
  addon_trayBase: decimal("addon_tray_base", { precision: 10, scale: 2 }).notNull().default("80.00"),
  addon_spicePullout: decimal("addon_spice_pullout", { precision: 10, scale: 2 }).notNull().default("90.00"),
  addon_glassDoors: decimal("addon_glass_doors", { precision: 10, scale: 2 }).notNull().default("150.00"),
  addon_decorativeEndPanels: decimal("addon_decorative_end_panels", { precision: 10, scale: 2 }).notNull().default("100.00"),
  addon_finishedSides: decimal("addon_finished_sides", { precision: 10, scale: 2 }).notNull().default("80.00"),
  addon_mouldingPackage: decimal("addon_moulding_package", { precision: 10, scale: 2 }).notNull().default("250.00"),
  addon_islandBackPanels: decimal("addon_island_back_panels", { precision: 10, scale: 2 }).notNull().default("200.00"),
  // Assembly and install rates per LF (cost)
  rate_assembly: decimal("rate_assembly", { precision: 10, scale: 2 }).notNull().default("25.00"),
  rate_install: decimal("rate_install", { precision: 10, scale: 2 }).notNull().default("45.00"),
  // Markup applied to cabinet pricing (0–1)
  markupPct: decimal("markup_pct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpCabinetConfig = typeof dpCabinetConfig.$inferSelect;
export type InsertDpCabinetConfig = typeof dpCabinetConfig.$inferInsert;

// ─── Window & Sliding Glass Door Config ──────────────────────────────────────
// Admin-configurable base prices per window type, color upcharges, pane upcharges,
// and sliding glass door pricing. One row (id=1) acts as the singleton config.
export const dpWindowConfig = mysqlTable("dp_window_config", {
  id: int("id").primaryKey().autoincrement(),
  // Base cost per window unit by type — vinyl frame
  price_vinyl_singleHung: decimal("price_vinyl_single_hung", { precision: 10, scale: 2 }).notNull().default("180.00"),
  price_vinyl_doubleHung: decimal("price_vinyl_double_hung", { precision: 10, scale: 2 }).notNull().default("220.00"),
  price_vinyl_casement: decimal("price_vinyl_casement", { precision: 10, scale: 2 }).notNull().default("260.00"),
  price_vinyl_slider: decimal("price_vinyl_slider", { precision: 10, scale: 2 }).notNull().default("200.00"),
  price_vinyl_picture: decimal("price_vinyl_picture", { precision: 10, scale: 2 }).notNull().default("150.00"),
  // Base cost per window unit — aluminum frame
  price_alum_singleHung: decimal("price_alum_single_hung", { precision: 10, scale: 2 }).notNull().default("220.00"),
  price_alum_doubleHung: decimal("price_alum_double_hung", { precision: 10, scale: 2 }).notNull().default("270.00"),
  price_alum_casement: decimal("price_alum_casement", { precision: 10, scale: 2 }).notNull().default("310.00"),
  price_alum_slider: decimal("price_alum_slider", { precision: 10, scale: 2 }).notNull().default("240.00"),
  price_alum_picture: decimal("price_alum_picture", { precision: 10, scale: 2 }).notNull().default("190.00"),
  // Base cost per window unit — wood frame
  price_wood_singleHung: decimal("price_wood_single_hung", { precision: 10, scale: 2 }).notNull().default("380.00"),
  price_wood_doubleHung: decimal("price_wood_double_hung", { precision: 10, scale: 2 }).notNull().default("450.00"),
  price_wood_casement: decimal("price_wood_casement", { precision: 10, scale: 2 }).notNull().default("520.00"),
  price_wood_slider: decimal("price_wood_slider", { precision: 10, scale: 2 }).notNull().default("420.00"),
  price_wood_picture: decimal("price_wood_picture", { precision: 10, scale: 2 }).notNull().default("320.00"),
  // Color upcharges per window (cost delta above white-on-white)
  colorUpcharge_blackOnWhite: decimal("color_upcharge_bow", { precision: 10, scale: 2 }).notNull().default("40.00"),
  colorUpcharge_blackOnBlack: decimal("color_upcharge_bob", { precision: 10, scale: 2 }).notNull().default("80.00"),
  // Pane upcharge per window (cost delta above double pane)
  paneUpcharge_triple: decimal("pane_upcharge_triple", { precision: 10, scale: 2 }).notNull().default("60.00"),
  // Sliding Glass Door pricing (cost per door unit)
  price_sgd_2panel: decimal("price_sgd_2panel", { precision: 10, scale: 2 }).notNull().default("1200.00"),
  price_sgd_3panel: decimal("price_sgd_3panel", { precision: 10, scale: 2 }).notNull().default("1800.00"),
  price_sgd_4panel: decimal("price_sgd_4panel", { precision: 10, scale: 2 }).notNull().default("2200.00"),
  sgd_movingPanelUpcharge: decimal("sgd_moving_panel_upcharge", { precision: 10, scale: 2 }).notNull().default("200.00"),
  sgd_multiSlideUpcharge: decimal("sgd_multi_slide_upcharge", { precision: 10, scale: 2 }).notNull().default("400.00"),
  sgd_alum_upcharge: decimal("sgd_alum_upcharge", { precision: 10, scale: 2 }).notNull().default("300.00"),
  sgd_wood_upcharge: decimal("sgd_wood_upcharge", { precision: 10, scale: 2 }).notNull().default("600.00"),
  // SGD color upcharges
  sgd_colorUpcharge_blackOnWhite: decimal("sgd_color_upcharge_bow", { precision: 10, scale: 2 }).notNull().default("150.00"),
  sgd_colorUpcharge_blackOnBlack: decimal("sgd_color_upcharge_bob", { precision: 10, scale: 2 }).notNull().default("300.00"),
  // Header and casing pricing
  price_header_per_lf: decimal("price_header_per_lf", { precision: 10, scale: 2 }).notNull().default("3.50"),
  price_casing_per_set: decimal("price_casing_per_set", { precision: 10, scale: 2 }).notNull().default("45.00"),
  // SGD opening type: upcharge when cutting a new opening vs using an existing one
  sgd_newOpeningUpcharge: decimal("sgd_new_opening_upcharge", { precision: 10, scale: 2 }).notNull().default("800.00"),
  // Window size multipliers (applied on top of base type price)
  // Size categories: bathroom, standard_egress, large_egress, oversized, skylight
  windowSize_bathroom: decimal("window_size_bathroom", { precision: 10, scale: 2 }).notNull().default("0.00"),
  windowSize_standardEgress: decimal("window_size_standard_egress", { precision: 10, scale: 2 }).notNull().default("0.00"),
  windowSize_largeEgress: decimal("window_size_large_egress", { precision: 10, scale: 2 }).notNull().default("80.00"),
  windowSize_oversized: decimal("window_size_oversized", { precision: 10, scale: 2 }).notNull().default("180.00"),
  windowSize_skylight: decimal("window_size_skylight", { precision: 10, scale: 2 }).notNull().default("350.00"),
  // Markup applied to window/SGD pricing (0–1)
  markupPct: decimal("markup_pct", { precision: 5, scale: 4 }).notNull().default("0.4000"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DpWindowConfig = typeof dpWindowConfig.$inferSelect;
export type InsertDpWindowConfig = typeof dpWindowConfig.$inferInsert;

// ─── Price Consult Section Visibility & Order ─────────────────────────────────
export const dpPriceConsultSections = mysqlTable("dp_price_consult_sections", {
  id: int("id").autoincrement().primaryKey(),
  consultType: varchar("consult_type", { length: 32 }).notNull(),
  sectionKey: varchar("section_key", { length: 64 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  isVisible: tinyint("is_visible").notNull().default(1),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
});
export type DpPriceConsultSection = typeof dpPriceConsultSections.$inferSelect;
export type InsertDpPriceConsultSection = typeof dpPriceConsultSections.$inferInsert;

// ─── Initial Consult (Stay vs. Move) ─────────────────────────────────────────
export const initialConsultations = mysqlTable("initial_consultations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  consultantUserId: int("consultant_user_id"),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft | complete
  inputData: text("input_data"), // JSON blob of all step inputs
  resultData: text("result_data"), // JSON blob of computed results
  clientName: varchar("client_name", { length: 128 }),
  clientEmail: varchar("client_email", { length: 256 }),
  clientPhone: varchar("client_phone", { length: 32 }),
  propertyAddress: varchar("property_address", { length: 512 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
});
export type InitialConsultation = typeof initialConsultations.$inferSelect;
export type InsertInitialConsultation = typeof initialConsultations.$inferInsert;

// ─── Mortgage Rate Cache (Freddie Mac PMMS) ───────────────────────────────────
export const mortgageRateCache = mysqlTable("mortgage_rate_cache", {
  id: int("id").autoincrement().primaryKey(),
  rate: decimal("rate", { precision: 6, scale: 4 }).notNull(), // e.g. 6.7200
  source: varchar("source", { length: 64 }).notNull().default("Freddie Mac PMMS"),
  effectiveDate: varchar("effective_date", { length: 32 }).notNull(), // e.g. "2025-01-02"
  retrievedAt: bigint("retrieved_at", { mode: "number" }).notNull().default(0),
  isFallback: tinyint("is_fallback").notNull().default(0),
});
export type MortgageRateCache = typeof mortgageRateCache.$inferSelect;
export type InsertMortgageRateCache = typeof mortgageRateCache.$inferInsert;

// ─── Initial Consult Admin Settings ─────────────────────────────────────────
export const initialConsultSettings = mysqlTable("initial_consult_settings", {
  id: int("id").autoincrement().primaryKey(),
  defaultRealtorFeePct: decimal("default_realtor_fee_pct", { precision: 5, scale: 2 }).notNull().default("6.00"),
  defaultRelocationCostPct: decimal("default_relocation_cost_pct", { precision: 5, scale: 2 }).notNull().default("1.00"),
  defaultClosingCostPct: decimal("default_closing_cost_pct", { precision: 5, scale: 2 }).notNull().default("2.00"),
  defaultPropertyTaxRatePct: decimal("default_property_tax_rate_pct", { precision: 5, scale: 2 }).notNull().default("1.20"),
  defaultReplacementInsuranceAnnual: decimal("default_replacement_insurance_annual", { precision: 10, scale: 2 }).notNull().default("1800.00"),
  defaultAppreciationRatePct: decimal("default_appreciation_rate_pct", { precision: 5, scale: 2 }).notNull().default("4.00"),
  defaultLoanTermYears: int("default_loan_term_years").notNull().default(15),
  lockRealtorFee: tinyint("lock_realtor_fee").notNull().default(0),
  lockRelocationCost: tinyint("lock_relocation_cost").notNull().default(0),
  lockClosingCost: tinyint("lock_closing_cost").notNull().default(0),
  lockPropertyTaxRate: tinyint("lock_property_tax_rate").notNull().default(0),
  lockReplacementInsurance: tinyint("lock_replacement_insurance").notNull().default(0),
  lockAppreciationRate: tinyint("lock_appreciation_rate").notNull().default(0),
  lockLoanTerm: tinyint("lock_loan_term").notNull().default(0),
  companyTagline: varchar("company_tagline", { length: 255 }).default("Stay & Build vs. Sell & Move"),
  appreciationYears: varchar("appreciation_years", { length: 64 }).default("1,3,5,10,20"),
  /** Lender email recipient for pre-approval referral emails */
  lenderEmail: varchar("lender_email", { length: 255 }).default("ODonnellTeam@ccm.com"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
  updatedBy: int("updated_by"),
});
export type InitialConsultSettings = typeof initialConsultSettings.$inferSelect;
export type InsertInitialConsultSettings = typeof initialConsultSettings.$inferInsert;

// ─── Estimate Site Photos ─────────────────────────────────────────────────────
/**
 * Photos taken on-site during an estimate appointment.
 * Linked to a session key (client-side UUID) so photos can be attached
 * before the estimate is formally saved/sent.
 */
export const estimateSitePhotos = mysqlTable("estimate_site_photos", {
  id: int("id").autoincrement().primaryKey(),
  /** Client-generated session key — ties photos to a specific estimate session */
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  /** S3 URL of the uploaded photo */
  url: text("url").notNull(),
  /** S3 key for deletion */
  s3Key: varchar("s3_key", { length: 512 }).notNull(),
  /** Optional caption entered by the rep */
  caption: varchar("caption", { length: 512 }).default(""),
  /** Category tag: site, materials, existing-deck, damage, other */
  category: varchar("category", { length: 64 }).default("site"),
  /** MIME type of the uploaded file */
  mimeType: varchar("mime_type", { length: 64 }).default("image/jpeg"),
  /** File size in bytes */
  fileSizeBytes: int("file_size_bytes").default(0),
  /** Optional: linked sign_request id once estimate is sent */
  signRequestId: int("sign_request_id"),
  /** Rep/user who took the photo */
  uploadedBy: int("uploaded_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
});
export type EstimateSitePhoto = typeof estimateSitePhotos.$inferSelect;
export type InsertEstimateSitePhoto = typeof estimateSitePhotos.$inferInsert;
