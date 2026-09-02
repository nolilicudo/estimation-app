import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import type {
  CollectionInfo,
  ColorOption,
  AccessoryItem,
  EdgeOption,
  LaborTier,
  DeliveryOption,
  Collection,
} from "@/lib/pricing-data";
import {
  collections as staticCollections,
  accessories as staticAccessories,
  edgeOptions as staticEdgeOptions,
  laborTiers as staticLaborTiers,
  deliveryOptions as staticDeliveryOptions,
  UTAH_TAX_RATE,
  DEFAULT_WASTE_FACTOR,
  STAIR_TREAD_PRICE_PER_SQFT,
  STAIR_RISER_PRICE_PER_LINEAR_FT,
} from "@/lib/pricing-data";

export interface DemolitionOption {
  id: string;
  name: string;
  description: string;
  pricePerSqft: number;
  /** Minimum charge floor (0 = no floor) */
  minimumPrice: number;
  /** When true, this option uses its own separate sqft input */
  hasSeparateSqft: boolean;
}

export interface FootingOption {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
}

export interface ConcreteOption {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
}

export interface FramingOption {
  id: string;
  name: string;
  description: string;
  /** Rate for Appalachian collection (and default) */
  pricePerSqft: number;
  /** Rate for Rainier collection; null means use pricePerSqft */
  rainierRate: number | null;
  /** Minimum charge when selected (0 = no minimum) */
  minimumPrice: number;
}

export interface FacadeOption {
  id: string;
  name: string;
  description: string;
  pricePerSqft: number;
  minimumPrice: number;
}

export interface ComparisonMaterial {
  id: string;
  name: string;
  description: string;
  materialCostPerSqft: number;
  laborCostPerSqft: number;
  annualMaintenanceCostPerSqft: number;
  lifespanYears: number;
  warrantyYears: number;
  colorHex: string;
  pros: string[];
  cons: string[];
  /** Whether this material is toggled ON by default in the comparison section */
  showByDefault: boolean;
}

// ─── Resin Rock types ─────────────────────────────────────────────────────
export interface ResinSurface {
  id: string;
  name: string;
  description: string;
  pricePerSqft: number;
  requiresWaterproofing: boolean;
}

export interface ResinColor {
  id: string;
  name: string;
  hex: string;
  category: string;
  pricePerSqft: number;
}

export interface WaterproofingOption {
  id: string;
  name: string;
  description: string;
  pricePerSqft: number;
}

// ─── Duradek / Tiledek types ──────────────────────────────────────────────
export interface DuradekColor {
  id: string;
  name: string;
  series: string;
  hex: string;
  pricePerSqft: number;
}

export interface TileSize {
  id: string;
  name: string;
  description: string;
  laborPerSqft: number;
  materialPerSqft: number;
}

// ─── Post / Beam Wrap types ─────────────────────────────────────────────────
export interface PostWrapOption {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  pricePerLf: number;
  laborPricePerLf: number;
  /** Labor charge per post wrapped */
  laborPricePerPost: number;
  /** Labor charge per lineal foot of beam wrapped */
  laborPricePerBeamLf: number;
}

export interface PostWrapLengthTier {
  id: number;
  postWrapOptionId: number;
  /** Length of the material piece in feet (e.g. 8, 10, 12, 16) */
  lengthFt: number;
  /** Material cost (what you pay per piece) */
  materialCostPerPiece: number;
  /** Material sell price (what customer pays per piece) */
  materialPricePerPiece: number;
  sortOrder: number;
}

// ─── Appalachian: A Steel Jacket types ──────────────────────────────────────
export interface SteelJacketOption {
  id: number;
  slug: string;
  name: string;
  description: string;
  materialCostPerSqft: number;
  installCostPerSqft: number;
  marginPct: number;
  pricePerSqft: number;
  photoUrls: string[];
}

// ─── Appalachian Waterproof Add-on types ─────────────────────────────────────
export interface RainEscapeOption {
  id: string;
  name: string;
  description: string;
  // New cost model fields
  gutterMaterialCostPerLf: number;
  gutterInstallCostPerLf: number;
  systemMaterialCostPerSqft: number;
  systemInstallCostPerSqft: number;
  marginPct: number;
  // Legacy fields (kept for backward compat)
  gutterPricePerLinearFt: number;
  systemPricePerSqft: number;
  laborPricePerSqft: number;
}

export interface SoffitMaterial {
  id: string;
  name: string;
  description: string;
  // New cost model fields
  materialCostPerSqft: number;
  installCostPerSqft: number;
  marginPct: number;
  // Computed customer price
  pricePerSqft: number;
  // Legacy field
  laborPricePerSqft: number;
}

export interface CornersWasteRule {
  id: number;
  corners: number;
  allNinetyDegrees: boolean;
  wastePercent: number;
}

export interface LumberItem {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  category: string;
  costPrice: number;
  markupMultiplier: number;
  displayPrice: number;
}

export type ProductType = "tanzite" | "resin-rock" | "duradek";
export type DuradekSubType = "duradek-vinyl" | "tiledek";

export interface SpiralStairPricingEntry {
  id: number;
  diameter: string;
  treadMaterial: string;
  costPrice: number;
  marginPct: number;
  price: number;
}

export interface RailingOption {
  id: number;
  name: string;
  railingType: string; // 'wire' | 'welded'
  orientation: string | null; // 'horizontal' | 'vertical' | null
  description: string;
  pricePerLf: number;
  costPerLf: number;
  installCostPerLf: number;
  marginPct: number;
  /** Color variant: 'white' | 'black' | 'stainless' | null */
  colorVariant: string | null;
}

export interface ProjectDetailOption {
  id: number;
  label: string;
  sortOrder: number;
  isActive: number;
}

export interface DesignPackageCommissionEntry {
  projectType: string;
  label: string;
  commissionAmount: number;
}

export interface DesignPackageDiscount {
  id: number;
  discountType: string; // 'early_bird' | 'same_day'
  name: string;
  discountPct: number;
  isActive: number;
}

export interface DesignPackageItem {
  id: number;
  name: string;
  description: string;
  pricingType: 'sqft' | 'flat' | 'rendering';
  costPerSqft: number;
  flatCost: number;
  markupPct: number;
  projectTypes: string; // comma-separated: addition,full_home_remodel,kitchen,bathroom,all
  renderingType: string | null; // small_bathroom | large_bathroom | kitchen | exterior
  designHours: number; // base design hours (for volume discount calculation)
  sortOrder: number;
  isActive?: number; // 1 = active, 0 = inactive
}

export interface SiteConfig {
  // Tanzite
  collections: CollectionInfo[];
  accessories: AccessoryItem[];
  edgeOptions: EdgeOption[];
  laborTiers: LaborTier[];
  deliveryOptions: DeliveryOption[];
  comparisonMaterials: ComparisonMaterial[];
  // Demo & Rebuild
  demolitionOptions: DemolitionOption[];
  footingOptions: FootingOption[];
  concreteOptions: ConcreteOption[];
  framingOptions: FramingOption[];
  facadeOptions: FacadeOption[];
  // Resin Rock
  resinSurfaces: ResinSurface[];
  resinColors: ResinColor[];
  waterproofingOptions: WaterproofingOption[];
  // Duradek / Tiledek
  duradekColors: DuradekColor[];
  tileSizes: TileSize[];
  // Appalachian Waterproof Add-on
  rainEscapeOptions: RainEscapeOption[];
  soffitMaterials: SoffitMaterial[];
  steelJacketOptions: SteelJacketOption[];
  // Product-specific settings
  productSettings: Record<string, Record<string, string>>;
  // Corners / Waste
  cornersWasteRules: CornersWasteRule[];
  // Lumber package
  lumberItems: LumberItem[];
  // Railing
  railingOptions: RailingOption[];
  // Spiral Stair Pricing
  spiralStairPricing: SpiralStairPricingEntry[];
  // Post / Beam Wrap
  postWrapOptions: PostWrapOption[];
  postWrapLengthTiers: PostWrapLengthTier[];
  // Design Package
  designPackageItems: DesignPackageItem[];
  designPackageCommission: DesignPackageCommissionEntry[];
  designPackageDiscounts: DesignPackageDiscount[];
  // Custom project detail options
  projectDetailOptions: ProjectDetailOption[];
  // Global
  taxRate: number;
  defaultWasteFactor: number;
  stairTreadPrice: number;
  stairRiserPrice: number;
  stairBasePrice: number;
  stairPerLfOver4ft: number;
  stairCenterSupportCost: number; // flat cost for center support when stairs > 10 treads
  permitCost: number;
  engineerLetterCost: number;
  permitCostFraming: number;
  /** Beam depth (inches) at or above which 1 material lift is auto-suggested */
  liftThreshold1DepthIn: number;
  /** Beam depth (inches) at or above which a 2nd material lift is auto-suggested */
  liftThreshold2DepthIn: number;
  /** Price for 1 material lift */
  liftCost1: number;
  /** Price for 2 material lifts (replaces liftCost1, not additive) */
  liftCost2: number;
  settings: Record<string, string>;
  isLoading: boolean;
}

export function useConfig(): SiteConfig {
  const { data, isLoading } = trpc.config.getAll.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    if (!data || !data.collections) {
      // Fallback to static data while loading
      return {
        collections: staticCollections,
        accessories: staticAccessories,
        edgeOptions: staticEdgeOptions,
        laborTiers: staticLaborTiers,
        deliveryOptions: staticDeliveryOptions,
        comparisonMaterials: [],
        demolitionOptions: [],
        footingOptions: [],
        concreteOptions: [],
        framingOptions: [],
        facadeOptions: [],
        resinSurfaces: [],
        resinColors: [],
        waterproofingOptions: [],
        duradekColors: [],
        tileSizes: [],
        rainEscapeOptions: [],
        soffitMaterials: [],
        steelJacketOptions: [],
        productSettings: {},
        taxRate: UTAH_TAX_RATE,
        defaultWasteFactor: DEFAULT_WASTE_FACTOR,
        stairTreadPrice: STAIR_TREAD_PRICE_PER_SQFT,
        stairRiserPrice: STAIR_RISER_PRICE_PER_LINEAR_FT,
        stairBasePrice: 150,
        stairPerLfOver4ft: 37.5,
        stairCenterSupportCost: 450,
        permitCost: 250,
        engineerLetterCost: 400,
        permitCostFraming: 300,
        liftThreshold1DepthIn: 10,
        liftThreshold2DepthIn: 14,
        liftCost1: 450,
        liftCost2: 800,
        cornersWasteRules: [],
        lumberItems: [],
        railingOptions: [],
        spiralStairPricing: [],
        postWrapOptions: [],
        postWrapLengthTiers: [],
        designPackageItems: [],
        designPackageCommission: [],
        designPackageDiscounts: [],
        projectDetailOptions: [],
        settings: {},
        isLoading,
      };
    }

    const collections: CollectionInfo[] = data.collections.map((c: any) => ({
      id: c.slug as Collection,
      name: c.name,
      description: c.description || "",
      features: c.features || [],
      colors: c.colors.map((clr: any) => ({
        id: clr.id,
        name: clr.name,
        hex: clr.hex,
        pricePerSqft: clr.pricePerSqft,
      })),
      image: c.imageUrl || "",
    }));

    const edgeOpts: EdgeOption[] = (data.edgeOptions || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      pricePerLinearFt: e.pricePerLinearFt,
      collection: e.collection as Collection,
    }));

    const accs: AccessoryItem[] = (data.accessories || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      unit: a.unit,
      pricePerUnit: a.pricePerUnit,
      description: a.description || "",
      requiredFor: a.requiredFor as Collection[] | undefined,
      isOptional: a.isOptional,
    }));

    const labor: LaborTier[] = (data.laborTiers || []).map((l: any) => ({
      id: l.id,
      dbId: l.dbId,
      name: l.name,
      description: l.description || "",
      pricePerSqft: l.pricePerSqft,
      laborCostPerSqft: l.laborCostPerSqft,
      marginPercent: l.marginPercent,
      minimumPrice: l.minimumPrice ?? 0,
      collectionSlug: l.collectionSlug ?? null,
      lineItems: l.lineItems ?? [],
    }));

    const delivery: DeliveryOption[] = (data.deliveryOptions || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      price: d.price,
      description: d.description || "",
    }));

    const settings = data.settings || {};

    return {
      collections,
      accessories: accs,
      edgeOptions: edgeOpts,
      laborTiers: labor,
      deliveryOptions: delivery,
      comparisonMaterials: (data.comparisonMaterials || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || "",
        materialCostPerSqft: m.materialCostPerSqft,
        laborCostPerSqft: m.laborCostPerSqft,
        annualMaintenanceCostPerSqft: m.annualMaintenanceCostPerSqft,
        lifespanYears: m.lifespanYears,
        warrantyYears: m.warrantyYears,
        colorHex: m.colorHex || "#888888",
        pros: m.pros || [],
        cons: m.cons || [],
        showByDefault: m.showByDefault === 1 || m.showByDefault === true,
      })),
      demolitionOptions: (data.demolitionOptions || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description || "",
        pricePerSqft: d.pricePerSqft,
        minimumPrice: Number(d.minimumPrice ?? 0),
        hasSeparateSqft: Boolean(d.hasSeparateSqft),
      })),
      footingOptions: (data.footingOptions || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || "",
        pricePerUnit: f.pricePerUnit,
        unit: f.unit || "each",
      })),
      concreteOptions: (data.concreteOptions || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || "",
        pricePerUnit: c.pricePerUnit,
        unit: c.unit || "sqft",
      })),
      framingOptions: (data.framingOptions || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || "",
        pricePerSqft: f.pricePerSqft,
        rainierRate: f.rainierRate ?? null,
        minimumPrice: f.minimumPrice ?? 0,
      })),
      facadeOptions: (data.facadeOptions || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || "",
        pricePerSqft: f.pricePerSqft,
        minimumPrice: f.minimumPrice ?? 0,
      })),
      // Resin Rock
      resinSurfaces: (data.resinSurfaces || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        pricePerSqft: s.pricePerSqft,
        requiresWaterproofing: s.requiresWaterproofing,
      })),
      resinColors: (data.resinColors || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
        category: c.category || "standard",
        pricePerSqft: c.pricePerSqft,
      })),
      waterproofingOptions: (data.waterproofingOptions || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description || "",
        pricePerSqft: w.pricePerSqft,
      })),
      // Duradek / Tiledek
      duradekColors: (data.duradekColors || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        series: d.series,
        hex: d.hex,
        pricePerSqft: d.pricePerSqft,
      })),
      tileSizes: (data.tileSizes || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        laborPerSqft: t.laborPerSqft,
        materialPerSqft: t.materialPerSqft,
      })),
      productSettings: data.productSettings || {},
      rainEscapeOptions: (data.rainEscapeOptions || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        gutterMaterialCostPerLf: Number(r.gutterMaterialCostPerLf ?? 0),
        gutterInstallCostPerLf: Number(r.gutterInstallCostPerLf ?? 0),
        systemMaterialCostPerSqft: Number(r.systemMaterialCostPerSqft ?? 0),
        systemInstallCostPerSqft: Number(r.systemInstallCostPerSqft ?? 0),
        marginPct: Number(r.marginPct ?? 35),
        gutterPricePerLinearFt: Number(r.gutterPricePerLinearFt ?? 0),
        systemPricePerSqft: Number(r.systemPricePerSqft ?? 0),
        laborPricePerSqft: Number(r.laborPricePerSqft ?? 0),
      })),
      soffitMaterials: (data.soffitMaterials || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        materialCostPerSqft: Number(s.materialCostPerSqft ?? 0),
        installCostPerSqft: Number(s.installCostPerSqft ?? 0),
        marginPct: Number(s.marginPct ?? 35),
        pricePerSqft: Number(s.pricePerSqft ?? 0),
        laborPricePerSqft: Number(s.laborPricePerSqft ?? 0),
      })),
      steelJacketOptions: (data.steelJacketOptions || []).map((s: any) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description || "",
        materialCostPerSqft: Number(s.materialCostPerSqft ?? 0),
        installCostPerSqft: Number(s.installCostPerSqft ?? 0),
        marginPct: Number(s.marginPct ?? 35),
        pricePerSqft: Number(s.pricePerSqft ?? 0),
        photoUrls: s.photoUrls || [],
      })),
      cornersWasteRules: (data.cornersWasteRules || []).map((r: any) => ({
        id: r.id,
        corners: r.corners,
        allNinetyDegrees: r.allNinetyDegrees,
        wastePercent: r.wastePercent,
      })),
      lumberItems: (data.lumberItems || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        description: l.description || null,
        unit: l.unit,
        category: l.category,
        costPrice: l.costPrice,
        markupMultiplier: l.markupMultiplier,
        displayPrice: l.displayPrice,
      })),
      spiralStairPricing: (data.spiralStairPricing || []).map((s: any) => ({
        id: s.id,
        diameter: s.diameter,
        treadMaterial: s.treadMaterial,
        costPrice: Number(s.costPrice),
        marginPct: Number(s.marginPct),
        price: Number(s.price),
      })),
      railingOptions: (data.railingOptions || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        railingType: r.railingType,
        orientation: r.orientation ?? null,
        description: r.description || "",
        pricePerLf: Number(r.pricePerLf),
        costPerLf: Number(r.costPerLf),
        installCostPerLf: Number(r.installCostPerLf ?? 0),
        marginPct: Number(r.marginPct),
        colorVariant: r.colorVariant ?? null,
      })),
      taxRate: settings.tax_rate ? parseFloat(settings.tax_rate) : UTAH_TAX_RATE,
      defaultWasteFactor: settings.waste_factor_default ? parseInt(settings.waste_factor_default) : DEFAULT_WASTE_FACTOR,
      stairTreadPrice: settings.stair_tread_price ? parseFloat(settings.stair_tread_price) : STAIR_TREAD_PRICE_PER_SQFT,
      stairRiserPrice: settings.stair_riser_price ? parseFloat(settings.stair_riser_price) : STAIR_RISER_PRICE_PER_LINEAR_FT,
      stairBasePrice: settings.stair_base_price ? parseFloat(settings.stair_base_price) : 150,
      stairPerLfOver4ft: settings.stair_per_lf_over_4ft ? parseFloat(settings.stair_per_lf_over_4ft) : 37.5,
      stairCenterSupportCost: settings.stair_center_support_cost ? parseFloat(settings.stair_center_support_cost) : 450,
      permitCost: settings.permit_cost ? parseFloat(settings.permit_cost) : 250,
      engineerLetterCost: settings.engineer_letter_cost ? parseFloat(settings.engineer_letter_cost) : 400,
      permitCostFraming: settings.permit_cost_framing ? parseFloat(settings.permit_cost_framing) : 300,
      liftThreshold1DepthIn: settings.lift_threshold_1_depth_in ? parseInt(settings.lift_threshold_1_depth_in) : 10,
      liftThreshold2DepthIn: settings.lift_threshold_2_depth_in ? parseInt(settings.lift_threshold_2_depth_in) : 14,
      liftCost1: settings.lift_cost_1 ? parseFloat(settings.lift_cost_1) : 450,
      liftCost2: settings.lift_cost_2 ? parseFloat(settings.lift_cost_2) : 800,
      projectDetailOptions: (data.projectDetailOptions || []).map((p: any) => ({
        id: p.id,
        label: p.label,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
      })),
      postWrapOptions: (data.postWrapOptions || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description || null,
        pricePerLf: Number(p.pricePerLf ?? 0),
        laborPricePerLf: Number(p.laborPricePerLf ?? 0),
        laborPricePerPost: Number(p.laborPricePerPost ?? 0),
        laborPricePerBeamLf: Number(p.laborPricePerBeamLf ?? 0),
      })),
      postWrapLengthTiers: (data.postWrapLengthTiers || []).map((t: any) => ({
        id: t.id,
        postWrapOptionId: t.postWrapOptionId,
        lengthFt: Number(t.lengthFt),
        materialCostPerPiece: Number(t.materialCostPerPiece ?? 0),
        materialPricePerPiece: Number(t.materialPricePerPiece ?? 0),
        sortOrder: Number(t.sortOrder ?? 0),
      })),
      designPackageItems: (data.designPackageItems || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? '',
        pricingType: d.pricingType as 'sqft' | 'flat' | 'rendering',
        costPerSqft: Number(d.costPerSqft ?? 0),
        flatCost: Number(d.flatCost ?? 0),
        markupPct: Number(d.markupPct ?? 50),
        projectTypes: d.projectTypes ?? 'all',
        renderingType: d.renderingType ?? null,
        designHours: Number(d.designHours ?? 0),
        sortOrder: Number(d.sortOrder ?? 0),
        isActive: Number(d.isActive ?? 1),
      })),
      designPackageCommission: (data.designPackageCommission || []).map((c: any) => ({
        projectType: c.projectType,
        label: c.label,
        commissionAmount: Number(c.commissionAmount ?? 0),
      })),
      designPackageDiscounts: (data.designPackageDiscounts || []).map((d: any) => ({
        id: Number(d.id),
        discountType: d.discountType,
        name: d.name,
        discountPct: Number(d.discountPct ?? 0),
        isActive: Number(d.isActive ?? 1),
      })),
      settings,
      isLoading,
    };
  }, [data, isLoading]);
}
