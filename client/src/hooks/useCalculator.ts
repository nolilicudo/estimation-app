import { useState, useMemo, useCallback } from "react";
import type {
  Collection,
  ColorOption,
  CollectionInfo,
  EdgeOption,
  LaborTier,
  DeliveryOption,
  AccessoryItem,
} from "@/lib/pricing-data";
import { useConfig, type SiteConfig } from "./useConfig";
import { type DemoRebuildState, defaultDemoRebuildState } from "@/components/DemoRebuildSection";
import { type FramingStructuralState, defaultFramingStructuralState } from "@/components/FramingStructuralSection";
import { type StairRun, makeDefaultStairRun } from "@/components/StairsSection";

export interface HotTubState {
  enabled: boolean;
  personSize: number; // 2-10 persons
  // Legacy fields kept for backward compat (structural data now lives in framingStructural)
  joistSpanFt: number;
  address: string;
  snowLoadPsf: number | null;
  snowLoadFetching: boolean;
  snowLoadError: string | null;
  recommendedJoistSize: string | null;
  recommendedBeamSize: string | null;
  joistVerified: boolean;
  hasCantilever: boolean;
  cantileverLengthFt: number;
  postPriority: "minimize-posts" | "minimize-cost";
  postSpacingFt: number;
}

export interface CalculatorState {
  collection: Collection;
  selectedColor: string;
  // Dimensions: L x W instead of raw sqft
  deckLength: number;
  deckWidth: number;
  totalSqft: number; // computed from deckLength * deckWidth
  edgeLinearFt: number;
  edgeOptionId: string;
  // Multiple stair runs (replaces flat stair fields)
  stairRuns: StairRun[];
  // Corners-based waste
  corners: number; // min 3, default 4
  allNinetyDegrees: boolean;
  wasteFactor: number; // computed from corners + allNinetyDegrees lookup
  laborTierId: string;
  deliveryId: string;
  includePermit: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectAddress: string; // primary project address, auto-synced to hot tub snow load address
  // Railing
  railingEnabled: boolean;
  railingOptionId: number | null;
  railingColorNote: string;
  stairRailingSides: "one" | "both";
  deckHeightIn: number; // deck height above grade in inches (triggers 24" check)
  // Handrail removal/reset (existing handrail on new deck) — $15/lf, no margin
  handrailRemovalEnabled: boolean;
  handrailRemovalLf: number;
  // Hot tub
  hotTub: HotTubState;
  // Framing structural calc (deck-first, hot tub is additive)
  framingStructural: FramingStructuralState;
  // Appalachian waterproof add-on
  rainEscapeEnabled: boolean;
  rainEscapeOptionId: string;
  rainEscapeGutterLinearFt: number;
  soffitEnabled: boolean;
  soffitMaterialId: string;
  soffitSqft: number;
  // A Steel Jacket waterproofing (Appalachian only)
  steelJacketEnabled: boolean;
  steelJacketOptionId: number | null;
  steelJacketSelectedPhotoUrl: string | null;
  // Builder Pricing: 10% off materials, 15% off labor
  builderPricingEnabled: boolean;
  // Post / Beam Wrap
  postWrapEnabled: boolean;
  postWrapOptionId: number | null;
  postWrapLinearFt: number;
  postWrapPostCount: number;  // number of posts to wrap (auto-filled from framing)
  postWrapBeamLf: number;    // lineal feet of beam to wrap (auto-filled from framing)
  // Mood board customer notes — travels through estimate, contract PDF, and admin card
  moodboardNotes: string;
  // Design Package
  designPackageEnabled: boolean;
  designPackageProjectType: string; // 'addition' | 'full_home_remodel' | 'kitchen' | 'bathroom'
  designPackageSqft: number;
  designPackageSmallBathroomCount: number;
  designPackageLargeBathroomCount: number;
  designPackageKitchenCount: number;
  designPackageExteriorCount: number;
  designPackageItemOverrides: Record<number, boolean>;
}

export interface DemoRebuildBreakdown {
  demoCost: number;
  footingCost: number;
  concreteCost: number;
  framingCost: number;
  facadeCost: number;
  subtotal: number;
  details: { name: string; cost: number }[];
}

export interface RainEscapeBreakdown {
  systemCost: number;
  gutterCost: number;
  laborCost: number;
  soffitMaterialCost: number;
  soffitLaborCost: number;
  subtotal: number;
  details: { name: string; cost: number }[];
}

export interface RailingBreakdown {
  deckEdgeLf: number;
  stairLf: number;
  totalLf: number;
  pricePerLf: number;
  subtotal: number;
  railingName: string;
  requiresRailing: boolean; // true if deck >= 24" high
}

export interface SteelJacketBreakdown {
  materialCost: number;
  installCost: number;
  subtotal: number;
  details: { name: string; cost: number }[];
}

export interface CostBreakdown {
  deckMaterial: number;
  edgeMaterial: number;
  stairMaterial: number;
  accessoriesTotal: number;
  wasteSurcharge: number;
  subtotalMaterials: number;
  laborCost: number;
  deliveryCost: number;
  permitCost: number;
  demoRebuild: DemoRebuildBreakdown;
  rainEscape: RainEscapeBreakdown;
  steelJacket: SteelJacketBreakdown;
  railing: RailingBreakdown;
  handrailRemovalCost: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
  pricePerSqft: number;
  accessoryDetails: { name: string; cost: number; showInScope?: boolean }[];
  laborLineItemDetails: { name: string; cost: number }[];
  taxRate: number;
  // Post / Beam Wrap cost
  postWrapCost: number;
  /** Material cost portion of post wrap (for breakdown display) */
  postWrapMaterialCost: number;
  /** Labor cost portion of post wrap (for breakdown display) */
  postWrapLaborCost: number;
  /** Pieces needed for posts, by length tier */
  postWrapPostPieces: { lengthFt: number; count: number; priceEach: number }[];
  /** Pieces needed for beams, by length tier */
  postWrapBeamPieces: { lengthFt: number; count: number; priceEach: number }[];
  /** Name of the selected post wrap option */
  postWrapOptionName: string;
  // Builder pricing discounts (0 when not active)
  builderMaterialDiscount: number;
  builderLaborDiscount: number;
  // Design Package
  designPackageCost: number;
  designPackageLineItems: { id: number; name: string; cost: number; sellPrice: number; quantity: number; pricingType: string }[];
}

export function useCalculator() {
  const config = useConfig();

  const defaultCollection = config.collections[0]?.id ?? "rainier";
  const defaultColor = config.collections[0]?.colors[0]?.id ?? "aged-teak";
  const defaultEdge = config.edgeOptions.find(e => e.collection === defaultCollection)?.id ?? "";
  const defaultLabor = config.laborTiers[2]?.id ?? config.laborTiers[0]?.id ?? "standard";
  const defaultDelivery = config.deliveryOptions[1]?.id ?? config.deliveryOptions[0]?.id ?? "local";

  const [demoRebuildState, rawSetDemoRebuildState] = useState<DemoRebuildState>(defaultDemoRebuildState);

  // Wrap setDemoRebuildState so that includePermit auto-follows needsFraming.
  // When framing is turned on → permit is automatically included.
  // When framing is turned off → permit is automatically removed.
  const setDemoRebuildState = useCallback(
    (updater: DemoRebuildState | ((prev: DemoRebuildState) => DemoRebuildState)) => {
      rawSetDemoRebuildState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        // Sync includePermit with needsFraming
        if (next.needsFraming !== prev.needsFraming) {
          setState((s) => ({ ...s, includePermit: next.needsFraming }));
        }
        return next;
      });
    },
    []
  );

  const defaultRainEscape = config.rainEscapeOptions[0]?.id ?? "standard";
  const defaultSoffit = config.soffitMaterials[0]?.id ?? "standard-aluminum";

  const defaultHotTub: HotTubState = {
    enabled: false,
    personSize: 6,
    joistSpanFt: 12,
    address: "",
    snowLoadPsf: null,
    snowLoadFetching: false,
    snowLoadError: null,
    recommendedJoistSize: null,
    recommendedBeamSize: null,
    joistVerified: true,
    hasCantilever: false,
    cantileverLengthFt: 2,
    postPriority: "minimize-cost" as const,
    postSpacingFt: 8,
  };

  const [state, setState] = useState<CalculatorState>({
    collection: defaultCollection as Collection,
    selectedColor: defaultColor,
    deckLength: 16,
    deckWidth: 12,
    totalSqft: 192,
    edgeLinearFt: 40,
    edgeOptionId: defaultEdge,
    stairRuns: [],
    corners: 4,
    allNinetyDegrees: true,
    wasteFactor: config.defaultWasteFactor,
    laborTierId: defaultLabor,
    deliveryId: defaultDelivery,
    includePermit: false,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    projectAddress: "",
    hotTub: defaultHotTub,
    framingStructural: defaultFramingStructuralState,
    railingEnabled: false,
    railingOptionId: null,
    railingColorNote: "",
    stairRailingSides: "one" as const,
    deckHeightIn: 24,
    handrailRemovalEnabled: false,
    handrailRemovalLf: 0,
    rainEscapeEnabled: false,
    rainEscapeOptionId: defaultRainEscape,
    rainEscapeGutterLinearFt: 40,
    soffitEnabled: false,
    soffitMaterialId: defaultSoffit,
    soffitSqft: 80,
    steelJacketEnabled: false,
    steelJacketOptionId: null,
    steelJacketSelectedPhotoUrl: null,
    builderPricingEnabled: false,
    postWrapEnabled: false,
    postWrapOptionId: null,
    postWrapLinearFt: 0,
    postWrapPostCount: 0,
    postWrapBeamLf: 0,
    moodboardNotes: "",
    designPackageEnabled: false,
    designPackageProjectType: "addition",
    designPackageSqft: 0,
    designPackageSmallBathroomCount: 0,
    designPackageLargeBathroomCount: 0,
    designPackageKitchenCount: 0,
    designPackageExteriorCount: 0,
    designPackageItemOverrides: {},
  }); // end useState

  const updateHotTub = useCallback((partial: Partial<HotTubState>) => {
    setState((prev) => ({ ...prev, hotTub: { ...prev.hotTub, ...partial } }));
  }, []);

  const updateFramingStructural = useCallback((partial: Partial<FramingStructuralState>) => {
    setState((prev) => ({ ...prev, framingStructural: { ...prev.framingStructural, ...partial } }));
  }, []);

  // Auto-toggle demo + framing when hot tub joists don't match spec
  const handleHotTubJoistMismatch = useCallback(() => {
    setDemoRebuildState((prev) => ({
      ...prev,
      enabled: true,
      needsDemo: true,
      needsFraming: true,
    }));
  }, []);

  const updateField = useCallback(
    <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => {
      setState((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "collection") {
          const col = config.collections.find((c) => c.id === value);
          if (col && col.colors.length > 0) {
            next.selectedColor = col.colors[0].id;
          }
          const edges = config.edgeOptions.filter((e) => e.collection === value);
          if (edges.length > 0) {
            next.edgeOptionId = edges[0].id;
          }
        }
        return next;
      });
    },
    [config.collections, config.edgeOptions]
  );

  const currentCollection = useMemo(
    () => config.collections.find((c) => c.id === state.collection) ?? config.collections[0],
    [state.collection, config.collections]
  );

  const currentColor = useMemo(() => {
    if (state.selectedColor === "__tbd__") {
      // Color TBD: use average price across collection colors as a placeholder
      const colors = currentCollection?.colors ?? [];
      if (colors.length === 0) return undefined;
      const avgPrice = colors.reduce((sum, c) => sum + c.pricePerSqft, 0) / colors.length;
      return { id: "__tbd__", name: "Color TBD", hex: "#a8a29e", pricePerSqft: avgPrice };
    }
    return currentCollection?.colors.find((c) => c.id === state.selectedColor) ??
      currentCollection?.colors[0];
  }, [currentCollection, state.selectedColor]);

  const availableEdges = useMemo(
    () => config.edgeOptions.filter((e) => e.collection === state.collection),
    [state.collection, config.edgeOptions]
  );

  const currentEdge = useMemo(
    () => availableEdges.find((e) => e.id === state.edgeOptionId) ?? availableEdges[0],
    [availableEdges, state.edgeOptionId]
  );

  // Filter labor tiers to those applicable to the current collection:
  // tiers with collectionSlug === null/undefined apply to all collections;
  // tiers with a specific collectionSlug only appear for that collection
  const laborTiers = useMemo(
    () => config.laborTiers.filter(
      (l) => l.collectionSlug == null || l.collectionSlug === state.collection
    ),
    [config.laborTiers, state.collection]
  );

  const currentLabor = useMemo(
    () => laborTiers.find((l) => l.id === state.laborTierId) ?? laborTiers[0],
    [state.laborTierId, laborTiers]
  );

  const currentDelivery = useMemo(
    () => config.deliveryOptions.find((d) => d.id === state.deliveryId) ?? config.deliveryOptions[0],
    [state.deliveryId, config.deliveryOptions]
  );

  const breakdown = useMemo((): CostBreakdown => {
    const emptyRainEscape: RainEscapeBreakdown = { systemCost: 0, gutterCost: 0, laborCost: 0, soffitMaterialCost: 0, soffitLaborCost: 0, subtotal: 0, details: [] };
    const emptySteelJacket: SteelJacketBreakdown = { materialCost: 0, installCost: 0, subtotal: 0, details: [] };
    if (!currentColor || !currentEdge || !currentLabor || !currentDelivery) {
      return {
        deckMaterial: 0, edgeMaterial: 0, stairMaterial: 0, accessoriesTotal: 0,
        wasteSurcharge: 0, subtotalMaterials: 0, laborCost: 0, deliveryCost: 0,
        permitCost: 0, demoRebuild: { demoCost: 0, footingCost: 0, concreteCost: 0, framingCost: 0, facadeCost: 0, subtotal: 0, details: [] },
        rainEscape: emptyRainEscape,
        steelJacket: emptySteelJacket,
        railing: { deckEdgeLf: 0, stairLf: 0, totalLf: 0, pricePerLf: 0, subtotal: 0, railingName: "", requiresRailing: false },
        handrailRemovalCost: 0,
        subtotalBeforeTax: 0, taxAmount: 0, grandTotal: 0,
        pricePerSqft: 0, accessoryDetails: [], laborLineItemDetails: [], taxRate: config.taxRate,
        builderMaterialDiscount: 0, builderLaborDiscount: 0,
        postWrapCost: 0, postWrapMaterialCost: 0, postWrapLaborCost: 0,
        postWrapPostPieces: [], postWrapBeamPieces: [], postWrapOptionName: '',
        designPackageCost: 0, designPackageLineItems: [],
      };
    }

    const sqft = Math.max(0, state.totalSqft);
    const edgeFt = Math.max(0, state.edgeLinearFt);

    // Compute waste factor from corners + allNinetyDegrees lookup table
    const cornersRule = config.cornersWasteRules?.find(
      (r) => r.corners === state.corners && r.allNinetyDegrees === state.allNinetyDegrees
    );
    const effectiveWastePct = cornersRule?.wastePercent ?? state.wasteFactor;
    const wasteMultiplier = 1 + effectiveWastePct / 100;

    const deckMaterial = sqft * currentColor.pricePerSqft * wasteMultiplier;
    const edgeMaterial = edgeFt * currentEdge.pricePerLinearFt * wasteMultiplier;

    // Multi-run stair cost: sum across all stair runs
    let stairMaterial = 0;
    const landingCostPerUnit = config.settings.landing_cost_per_unit ? parseFloat(config.settings.landing_cost_per_unit) : 350;
    for (const run of state.stairRuns) {
      if (run.stairType === "spiral") {
        const diameterLabel = `${run.spiralDiameter}"`;
        const materialLabel = {
          "metal-diamond-grate": "Metal Diamond Grate",
          "dekton": "Dekton",
          "stone-decking": "Stone Decking",
          "resin-rock": "Resin Rock",
        }[run.stairTreadMaterial] ?? "Metal Diamond Grate";
        const spiralRow = config.spiralStairPricing.find(
          r => r.diameter === diameterLabel && r.treadMaterial === materialLabel
        );
        stairMaterial += spiralRow ? spiralRow.price : 0;
      } else if (run.stairType === "floating") {
        // Floating stairs: $10,000 metalwork base + per-tread material cost
        const FLOATING_METALWORK_BASE = 10_000;
        const FLOATING_TREAD_PRICES: Record<string, number> = {
          cement:  250,
          wood:    800,
          tanzite: 500,
        };
        const treadMat = (run as any).floatingTreadMaterial as string ?? "cement";
        const pricePerTread = FLOATING_TREAD_PRICES[treadMat] ?? 250;
        stairMaterial += FLOATING_METALWORK_BASE + run.stairTreads * pricePerTread;
      } else {
        const extraLf = Math.max(0, run.stairLength - 4);
        const perStepCost = config.stairBasePrice + extraLf * config.stairPerLfOver4ft;
        stairMaterial += perStepCost * run.stairTreads;
        if (run.stairTreads > 10) stairMaterial += config.stairCenterSupportCost;

        // Phase 4: per-landing pricing
        const landings = (run as any).landings as Array<{ widthFt: number; depthFt: number; material: string }> | undefined;
        if (landings && landings.length > 0) {
          for (const landing of landings) {
            if (landing.material === "stone-decking") {
              // Stone decking landings: priced per sqft like deck surface
              const landingSqft = landing.widthFt * landing.depthFt;
              stairMaterial += landingSqft * currentColor.pricePerSqft * wasteMultiplier;
            } else {
              // Other materials: use the flat landing cost per unit
              stairMaterial += landingCostPerUnit;
            }
          }
        } else if (run.stairType === "landing-turn" && run.landingCount > 0) {
          // Legacy fallback: use simple count-based pricing
          stairMaterial += landingCostPerUnit * run.landingCount;
        }
      }
    }

    const accessoryDetails: { name: string; cost: number; showInScope?: boolean }[] = [];
    let accessoriesTotal = 0;

    for (const acc of config.accessories) {
      if (acc.requiredFor && !acc.requiredFor.includes(state.collection)) continue;
      if (acc.isOptional) continue;

      let cost = 0;
      if (acc.unit === "sqft") {
        cost = sqft * acc.pricePerUnit;
      } else if (acc.unit === "linear_ft") {
        cost = edgeFt * acc.pricePerUnit;
      } else {
        cost = acc.pricePerUnit;
      }
      accessoryDetails.push({ name: acc.name, cost, showInScope: acc.showInScope });
      accessoriesTotal += cost;
    }

    const baseDeckMaterial = sqft * currentColor.pricePerSqft;
    const wasteSurcharge = deckMaterial - baseDeckMaterial;

    const subtotalMaterials = deckMaterial + edgeMaterial + stairMaterial + accessoriesTotal;

    const totalStairLaborSqft = state.stairRuns.reduce((sum, run) => sum + run.stairLength * run.stairTreads, 0);
    const laborSqft = sqft + totalStairLaborSqft;
    // Base labor cost from per-sqft rate
    let laborCost = laborSqft * currentLabor.pricePerSqft;
    // Add custom line items for this tier
    const laborLineItemDetails: { name: string; cost: number }[] = [];
    for (const li of currentLabor.lineItems ?? []) {
      let liCost = 0;
      if (li.unit === 'flat') liCost = li.amount;
      else if (li.unit === 'sqft') liCost = li.amount * sqft;
      else if (li.unit === 'linear_ft') liCost = li.amount * state.edgeLinearFt;
      laborLineItemDetails.push({ name: li.name, cost: liCost });
      laborCost += liCost;
    }
    // Apply minimum price floor
    const minimumPrice = currentLabor.minimumPrice ?? 0;
    if (minimumPrice > 0 && laborCost < minimumPrice) {
      laborCost = minimumPrice;
    }

    const deliveryCost = currentDelivery.price;
    const permitCost = state.includePermit ? config.permitCost : 0;

    // ─── Demo & Rebuild costs ─────────────────────────────────────────
    const demoRebuild: DemoRebuildBreakdown = { demoCost: 0, footingCost: 0, concreteCost: 0, framingCost: 0, facadeCost: 0, subtotal: 0, details: [] };

    if (demoRebuildState.enabled) {
      // Multi-select demolition
      if (demoRebuildState.needsDemo && demoRebuildState.selectedDemoOptions?.length > 0) {
        for (const optId of demoRebuildState.selectedDemoOptions) {
          const opt = config.demolitionOptions.find(d => d.id === optId);
          if (opt) {
            // hasSeparateSqft options (e.g. concrete removal) use their own sqft input
            const sqft = opt.hasSeparateSqft
              ? (demoRebuildState.concreteDemoSqfts?.[optId] || 0)
              : demoRebuildState.demoSqft;
            const rawCost = opt.pricePerSqft * sqft;
            const cost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
            demoRebuild.demoCost += cost;
            demoRebuild.details.push({ name: `Demolition: ${opt.name}`, cost });
          }
        }
      } else if (demoRebuildState.needsDemo && demoRebuildState.selectedDemoOption) {
        // Legacy single-select fallback
        const opt = config.demolitionOptions.find(d => d.id === demoRebuildState.selectedDemoOption);
        if (opt) {
          const rawCost = opt.pricePerSqft * demoRebuildState.demoSqft;
          demoRebuild.demoCost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
          demoRebuild.details.push({ name: `Demolition: ${opt.name}`, cost: demoRebuild.demoCost });
        }
      }

      // Multi-select footings
      if (demoRebuildState.needsFootings && demoRebuildState.selectedFootingOptions?.length > 0) {
        for (const optId of demoRebuildState.selectedFootingOptions) {
          const opt = config.footingOptions.find(f => f.id === optId);
          if (opt) {
            const count = demoRebuildState.footingCounts?.[optId] || 6;
            const cost = opt.pricePerUnit * count;
            demoRebuild.footingCost += cost;
            demoRebuild.details.push({ name: `Footings: ${opt.name} x${count}`, cost });
          }
        }
      } else if (demoRebuildState.needsFootings && demoRebuildState.selectedFootingOption) {
        const opt = config.footingOptions.find(f => f.id === demoRebuildState.selectedFootingOption);
        if (opt) {
          demoRebuild.footingCost = opt.pricePerUnit * demoRebuildState.footingCount;
          demoRebuild.details.push({ name: `Footings: ${opt.name} x${demoRebuildState.footingCount}`, cost: demoRebuild.footingCost });
        }
      }

      // Multi-select concrete
      if (demoRebuildState.needsConcrete && demoRebuildState.selectedConcreteOptions?.length > 0) {
        for (const optId of demoRebuildState.selectedConcreteOptions) {
          const opt = config.concreteOptions.find(c => c.id === optId);
          if (opt) {
            const qty = opt.unit === "each"
              ? (demoRebuildState.concreteStepCounts?.[optId] || 0)
              : (demoRebuildState.concreteSqfts?.[optId] || 0);
            const cost = opt.pricePerUnit * qty;
            demoRebuild.concreteCost += cost;
            demoRebuild.details.push({ name: `Concrete: ${opt.name}`, cost });
          }
        }
      } else if (demoRebuildState.needsConcrete && demoRebuildState.selectedConcreteOption) {
        const opt = config.concreteOptions.find(c => c.id === demoRebuildState.selectedConcreteOption);
        if (opt) {
          const qty = opt.unit === "each" ? demoRebuildState.concreteStepCount : demoRebuildState.concreteSqft;
          demoRebuild.concreteCost = opt.pricePerUnit * qty;
          demoRebuild.details.push({ name: `Concrete: ${opt.name}`, cost: demoRebuild.concreteCost });
        }
      }

      // Multi-select framing
      // Rate selection: use rainierRate when collection is "rainier" (if set), otherwise pricePerSqft
      const isRainier = state.collection === "rainier";

      if (demoRebuildState.needsFraming && demoRebuildState.selectedFramingOptions?.length > 0) {
        for (const optId of demoRebuildState.selectedFramingOptions) {
          const opt = config.framingOptions.find(f => f.id === optId);
          if (opt) {
            const area = demoRebuildState.framingSqfts?.[optId] || 0;
            const rate = isRainier && opt.rainierRate != null ? opt.rainierRate : opt.pricePerSqft;
            const rawCost = rate * area;
            const cost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
            demoRebuild.framingCost += cost;
            demoRebuild.details.push({ name: `Framing: ${opt.name}`, cost });
          }
        }
      } else if (demoRebuildState.needsFraming && demoRebuildState.selectedFramingOption) {
        const opt = config.framingOptions.find(f => f.id === demoRebuildState.selectedFramingOption);
        if (opt) {
          const rate = isRainier && opt.rainierRate != null ? opt.rainierRate : opt.pricePerSqft;
          const framingSqft = demoRebuildState.framingSqft || 0;
          const rawCost = rate * framingSqft;
          demoRebuild.framingCost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
          demoRebuild.details.push({ name: `Framing: ${opt.name}`, cost: demoRebuild.framingCost });
        }
      }

      // Subfloor: added for Rainier collection when framing is selected AND subfloorEnabled is true
      // Cost = sheets × pricePerSheet, where sheets = ceil(sqft / 32)
      // Each sheet covers 4' × 8' = 32 sqft
      // Bonus sheet option: when enabled, add 1 extra sheet
      if (isRainier && demoRebuildState.needsFraming && demoRebuildState.subfloorEnabled) {
        const sheetPrice = Number(config.settings?.subfloor_sheet_price ?? 0);
        const bonusSheetEnabled = config.settings?.subfloor_sheet_bonus === "1";
        const framingArea = demoRebuildState.selectedFramingOptions?.length > 0
          ? Object.values(demoRebuildState.framingSqfts || {}).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
          : (demoRebuildState.framingSqft || 0);
        if (sheetPrice > 0 && framingArea > 0) {
          const baseSheets = Math.ceil(framingArea / 32);
          const totalSheets = bonusSheetEnabled ? baseSheets + 1 : baseSheets;
          const subfloorCost = totalSheets * sheetPrice;
          demoRebuild.framingCost += subfloorCost;
          const bonusNote = bonusSheetEnabled ? " (incl. 1 bonus sheet)" : "";
          demoRebuild.details.push({ name: `Subfloor (Rainier) – ${totalSheets} sheets × $${sheetPrice}/sheet${bonusNote}`, cost: subfloorCost });
        }
      }

      // Multi-select facade
      if (demoRebuildState.needsFacade && demoRebuildState.selectedFacadeOptions?.length > 0) {
        for (const optId of demoRebuildState.selectedFacadeOptions) {
          const opt = config.facadeOptions.find(f => f.id === optId);
          if (opt) {
            const area = demoRebuildState.facadeSqfts?.[optId] || 0;
            const rawCost = opt.pricePerSqft * area;
            const cost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
            demoRebuild.facadeCost += cost;
            demoRebuild.details.push({ name: `Facade: ${opt.name}`, cost });
          }
        }
      } else if (demoRebuildState.needsFacade && demoRebuildState.selectedFacadeOption && demoRebuildState.selectedFacadeOption !== "none") {
        const opt = config.facadeOptions.find(f => f.id === demoRebuildState.selectedFacadeOption);
        if (opt) {
          const rawCost = opt.pricePerSqft * demoRebuildState.facadeSqft;
          demoRebuild.facadeCost = opt.minimumPrice > 0 ? Math.max(rawCost, opt.minimumPrice) : rawCost;
          demoRebuild.details.push({ name: `Facade: ${opt.name}`, cost: demoRebuild.facadeCost });
        }
      }

      // ─── Engineering & Permit costs when framing is selected ───────────────
      if (demoRebuildState.needsFraming) {
        const isSecondStory = state.deckHeightIn >= 96; // 8ft+ = second story
        const engineerCost = config.engineerLetterCost;
        const permitFramingCost = config.permitCostFraming;
        // Engineer letter: always required when framing; mandatory (non-optional) for second story
        demoRebuild.framingCost += engineerCost;
        demoRebuild.details.push({ name: `Engineer Letter${isSecondStory ? " (required – 2nd story)" : ""}`, cost: engineerCost });
        // Permit: always required when framing; mandatory for second story
        demoRebuild.framingCost += permitFramingCost;
        demoRebuild.details.push({ name: `Permit${isSecondStory ? " (required – 2nd story)" : ""}`, cost: permitFramingCost });
      }

      demoRebuild.subtotal = demoRebuild.demoCost + demoRebuild.footingCost + demoRebuild.concreteCost + demoRebuild.framingCost + demoRebuild.facadeCost;
    }

    // ─── Appalachian RainEscape + Soffit costs ──────────────────────────────
    const rainEscape: RainEscapeBreakdown = { systemCost: 0, gutterCost: 0, laborCost: 0, soffitMaterialCost: 0, soffitLaborCost: 0, subtotal: 0, details: [] };
    if (state.rainEscapeEnabled && state.collection === "appalachian") {
      const opt = config.rainEscapeOptions.find(r => r.id === state.rainEscapeOptionId) ?? config.rainEscapeOptions[0];
      if (opt) {
        // Use new cost model: (materialCost + installCost) / (1 - marginPct/100)
        // Fall back to legacy price fields if new cost fields are zero
        const sysMargin = opt.marginPct > 0 ? opt.marginPct : 35;
        const sysCustomerPerSqft = (opt.systemMaterialCostPerSqft + opt.systemInstallCostPerSqft) > 0
          ? (opt.systemMaterialCostPerSqft + opt.systemInstallCostPerSqft) / (1 - sysMargin / 100)
          : opt.systemPricePerSqft + opt.laborPricePerSqft;
        const gutterCustomerPerLf = (opt.gutterMaterialCostPerLf + opt.gutterInstallCostPerLf) > 0
          ? (opt.gutterMaterialCostPerLf + opt.gutterInstallCostPerLf) / (1 - sysMargin / 100)
          : opt.gutterPricePerLinearFt;
        rainEscape.systemCost = sysCustomerPerSqft * sqft;
        rainEscape.gutterCost = gutterCustomerPerLf * state.rainEscapeGutterLinearFt;
        rainEscape.laborCost = 0; // labor is now baked into systemCost via install cost
        rainEscape.details.push({ name: `${opt.name} – System`, cost: rainEscape.systemCost });
        rainEscape.details.push({ name: `${opt.name} – Gutter (${state.rainEscapeGutterLinearFt} LF)`, cost: rainEscape.gutterCost });
      }
      if (state.soffitEnabled) {
        const soffit = config.soffitMaterials.find(s => s.id === state.soffitMaterialId) ?? config.soffitMaterials[0];
        if (soffit) {
          // Use new cost model: pricePerSqft is already computed from (material+install)/(1-margin)
          const soffitCustomerPerSqft = soffit.pricePerSqft > 0
            ? soffit.pricePerSqft
            : (soffit.materialCostPerSqft + soffit.installCostPerSqft) > 0
              ? (soffit.materialCostPerSqft + soffit.installCostPerSqft) / (1 - (soffit.marginPct || 35) / 100)
              : soffit.laborPricePerSqft; // ultimate fallback
          rainEscape.soffitMaterialCost = soffitCustomerPerSqft * state.soffitSqft;
          rainEscape.soffitLaborCost = 0; // labor baked into soffitMaterialCost via install cost
          rainEscape.details.push({ name: `Soffit: ${soffit.name}`, cost: rainEscape.soffitMaterialCost });
        }
      }
      rainEscape.subtotal = rainEscape.systemCost + rainEscape.gutterCost + rainEscape.laborCost + rainEscape.soffitMaterialCost + rainEscape.soffitLaborCost;
    }

    // ─── Lumber Package: sum active lumber items when framing is selected ──────
    // Each active lumber item's displayPrice is added as a flat line item.
    // Sales tax and delivery fee are added on top of the materials subtotal.
    if (demoRebuildState.needsFraming && config.lumberItems?.length > 0) {
      const activeItems = config.lumberItems.filter((item: any) => item.isActive !== false);
      if (activeItems.length > 0) {
        const lumberMaterialsTotal = activeItems.reduce((sum: number, item: any) => sum + (Number(item.displayPrice) || 0), 0);
        if (lumberMaterialsTotal > 0) {
          // Sales tax on lumber materials
          const lumberTaxPct = Number(config.settings?.lumber_sales_tax_pct ?? 0);
          const lumberTax = lumberTaxPct > 0 ? lumberMaterialsTotal * (lumberTaxPct / 100) : 0;
          // Lumber delivery fee (flat)
          const lumberDelivery = Number(config.settings?.lumber_delivery_fee ?? 0);
          const lumberPackageTotal = lumberMaterialsTotal + lumberTax + lumberDelivery;

          demoRebuild.framingCost += lumberPackageTotal;
          demoRebuild.details.push({ name: `Lumber Package (${activeItems.length} items)`, cost: lumberMaterialsTotal });
          if (lumberTax > 0) demoRebuild.details.push({ name: `Lumber Sales Tax (${lumberTaxPct}%)`, cost: lumberTax });
          if (lumberDelivery > 0) demoRebuild.details.push({ name: `Lumber Delivery`, cost: lumberDelivery });

          // ─── Material Lift cost ──────────────────────────────────────────────
          // Count items with lift selections from framingStructural.liftSelections
          const liftSelections = state.framingStructural?.liftSelections ?? {};
          const liftCost1 = config.liftCost1;
          const liftCost2 = config.liftCost2;
          let lift1Count = 0;
          let lift2Count = 0;
          for (const [, level] of Object.entries(liftSelections)) {
            if (level === 2) lift2Count++;
            else if (level === 1) lift1Count++;
          }
          const liftTotal = lift1Count * liftCost1 + lift2Count * liftCost2;
          if (liftTotal > 0) {
            demoRebuild.framingCost += liftTotal;
            if (lift1Count > 0) demoRebuild.details.push({ name: `Material Lift (${lift1Count}× 1-lift @ $${liftCost1})`, cost: lift1Count * liftCost1 });
            if (lift2Count > 0) demoRebuild.details.push({ name: `Material Lift (${lift2Count}× 2-lift @ $${liftCost2})`, cost: lift2Count * liftCost2 });
          }

          demoRebuild.subtotal = demoRebuild.demoCost + demoRebuild.footingCost + demoRebuild.concreteCost + demoRebuild.framingCost + demoRebuild.facadeCost;
        }
      }
    }

    // Railing calc
    const requiresRailing = state.deckHeightIn >= 24;
    const emptyRailing: RailingBreakdown = { deckEdgeLf: 0, stairLf: 0, totalLf: 0, pricePerLf: 0, subtotal: 0, railingName: "", requiresRailing };
    let railing: RailingBreakdown = emptyRailing;
    if (state.railingEnabled && state.railingOptionId !== null) {
      const railingOpt = config.railingOptions.find(r => r.id === state.railingOptionId);
      if (railingOpt) {
        // Deck edge LF = use edgeLinearFt from state (matches the configured edge quantity)
        const deckEdgeLf = state.edgeLinearFt > 0 ? state.edgeLinearFt : (state.deckLength + state.deckWidth * 2);
        // Stair railing: each step = 1 LF × 1.2 multiplier per side, rounded up
        // Sum stair railing LF across all runs: each tread = 1 LF × 1.2 multiplier per side
        const totalStairTreads = state.stairRuns.reduce((sum, run) => sum + run.stairTreads, 0);
        const stairLfPerSide = totalStairTreads > 0 ? Math.ceil(totalStairTreads * 1.0 * 1.2) : 0;
        const stairLf = totalStairTreads > 0 ? stairLfPerSide * (state.stairRailingSides === "both" ? 2 : 1) : 0;
        const totalLf = deckEdgeLf + stairLf;
        const subtotal = totalLf * railingOpt.pricePerLf;
        railing = { deckEdgeLf, stairLf, totalLf, pricePerLf: railingOpt.pricePerLf, subtotal, railingName: railingOpt.name, requiresRailing };
      }
    } else if (requiresRailing && !state.railingEnabled) {
      // Deck is 24"+ but railing not yet configured — show warning, zero cost
      railing = { ...emptyRailing, requiresRailing: true };
    }

    // Handrail removal/reset: configurable rate/lf, no margin
    const handrailRemovalRate = config.settings?.handrail_removal_rate ? parseFloat(config.settings.handrail_removal_rate) : 15;
    const handrailRemovalCost = state.handrailRemovalEnabled && state.handrailRemovalLf > 0
      ? state.handrailRemovalLf * handrailRemovalRate
      : 0;

    // ─── A Steel Jacket waterproofing (Appalachian only) ───────────────────────────────────
    const steelJacket: SteelJacketBreakdown = { materialCost: 0, installCost: 0, subtotal: 0, details: [] };
    if (state.steelJacketEnabled && state.collection === "appalachian" && state.steelJacketOptionId !== null) {
      const opt = config.steelJacketOptions.find(s => s.id === state.steelJacketOptionId);
      if (opt) {
        const margin = opt.marginPct > 0 ? opt.marginPct : 35;
        const customerPerSqft = opt.pricePerSqft > 0
          ? opt.pricePerSqft
          : (opt.materialCostPerSqft + opt.installCostPerSqft) > 0
            ? (opt.materialCostPerSqft + opt.installCostPerSqft) / (1 - margin / 100)
            : 0;
        steelJacket.materialCost = opt.materialCostPerSqft * sqft;
        steelJacket.installCost = opt.installCostPerSqft * sqft;
        steelJacket.subtotal = customerPerSqft * sqft;
        steelJacket.details.push({ name: `A Steel Jacket — ${opt.name}`, cost: steelJacket.subtotal });
      }
    }

    // ─── Post / Beam Wrap ──────────────────────────────────────────────────────
    let postWrapCost = 0;
    let postWrapMaterialCost = 0;
    let postWrapLaborCost = 0;
    let postWrapPostPieces: { lengthFt: number; count: number; priceEach: number }[] = [];
    let postWrapBeamPieces: { lengthFt: number; count: number; priceEach: number }[] = [];
    let postWrapOptionName = '';

    if (state.postWrapEnabled && state.postWrapOptionId !== null) {
      const opt = config.postWrapOptions.find(p => p.id === state.postWrapOptionId);
      if (opt && opt.slug !== 'none') {
        postWrapOptionName = opt.name;
        const tiers = (config.postWrapLengthTiers || [])
          .filter(t => t.postWrapOptionId === opt.id)
          .sort((a, b) => a.lengthFt - b.lengthFt);

        // Helper: given a required LF, pick the shortest tier that covers it
        // and return how many pieces are needed
        const pickPieces = (requiredLf: number): { lengthFt: number; count: number; priceEach: number }[] => {
          if (tiers.length === 0 || requiredLf <= 0) return [];
          const tier = tiers.find(t => t.lengthFt >= requiredLf) ?? tiers[tiers.length - 1];
          const count = Math.ceil(requiredLf / tier.lengthFt);
          return [{ lengthFt: tier.lengthFt, count, priceEach: tier.materialPricePerPiece }];
        };

        if (tiers.length > 0) {
          // ── Length-tier pricing ──
          // Posts: each post needs 1 piece long enough to cover its height
          const postHeightFt = state.deckHeightIn > 0 ? state.deckHeightIn / 12 : 0;
          const postCount = state.postWrapPostCount || 0;
          if (postCount > 0 && postHeightFt > 0) {
            const tier = tiers.find(t => t.lengthFt >= postHeightFt) ?? tiers[tiers.length - 1];
            postWrapPostPieces = [{ lengthFt: tier.lengthFt, count: postCount, priceEach: tier.materialPricePerPiece }];
            postWrapMaterialCost += postCount * tier.materialPricePerPiece;
          }
          // Beams: total beam LF divided into pieces
          const beamLf = state.postWrapBeamLf || 0;
          if (beamLf > 0) {
            postWrapBeamPieces = pickPieces(beamLf);
            postWrapMaterialCost += postWrapBeamPieces.reduce((s, p) => s + p.count * p.priceEach, 0);
          }
        } else {
          // ── Fallback: legacy flat rate per LF ──
          const totalLf = state.postWrapLinearFt || 0;
          postWrapMaterialCost = opt.pricePerLf * totalLf;
        }

        // ── Labor ──
        const hasPerPostRate = opt.laborPricePerPost > 0;
        const hasPerBeamLfRate = opt.laborPricePerBeamLf > 0;
        if (hasPerPostRate || hasPerBeamLfRate) {
          postWrapLaborCost = (opt.laborPricePerPost * (state.postWrapPostCount || 0))
            + (opt.laborPricePerBeamLf * (state.postWrapBeamLf || 0));
        } else {
          // Fallback: legacy laborPricePerLf
          postWrapLaborCost = opt.laborPricePerLf * (state.postWrapLinearFt || 0);
        }

        postWrapCost = postWrapMaterialCost + postWrapLaborCost;
      }
    }

    // ─── Design Package ────────────────────────────────────────────────────────
    let designPackageCost = 0;
    const designPackageLineItems: { id: number; name: string; cost: number; sellPrice: number; quantity: number; pricingType: string }[] = [];
    if (state.designPackageEnabled && config.designPackageItems) {
      const projectType = state.designPackageProjectType;
      const dpSqft = state.designPackageSqft > 0 ? state.designPackageSqft : sqft;
      for (const item of config.designPackageItems) {
        if (!item.isActive) continue; // skip inactive items
        // Check if item applies to this project type
        const types = item.projectTypes.split(',').map(t => t.trim());
        if (!types.includes('all') && !types.includes(projectType)) continue;
        // Check per-item override
        if (item.id in state.designPackageItemOverrides && !state.designPackageItemOverrides[item.id]) continue;
        let itemCost = 0;
        let itemSellPrice = 0;
        let quantity = 1;
        if (item.pricingType === 'sqft') {
          const sellPerSqft = item.costPerSqft * (1 + item.markupPct / 100);
          itemCost = item.costPerSqft * dpSqft;
          itemSellPrice = sellPerSqft * dpSqft;
          quantity = dpSqft;
        } else if (item.pricingType === 'rendering') {
          const countMap: Record<string, number> = {
            small_bathroom: state.designPackageSmallBathroomCount,
            large_bathroom: state.designPackageLargeBathroomCount,
            kitchen: state.designPackageKitchenCount,
            exterior: state.designPackageExteriorCount,
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
        designPackageLineItems.push({ id: item.id, name: item.name, cost: itemCost, sellPrice: itemSellPrice, quantity, pricingType: item.pricingType });
        designPackageCost += itemSellPrice;
      }
    }

    const subtotalBeforeTax = subtotalMaterials + laborCost + deliveryCost + permitCost + demoRebuild.subtotal + rainEscape.subtotal + steelJacket.subtotal + railing.subtotal + handrailRemovalCost + postWrapCost + designPackageCost;
    const taxAmount = subtotalMaterials * config.taxRate;
    const grandTotal = subtotalBeforeTax + taxAmount;
    const pricePerSqft = sqft > 0 ? grandTotal / sqft : 0;

    // ─── Builder Pricing discounts ────────────────────────────────────────────
    const builderMaterialDiscount = state.builderPricingEnabled ? subtotalMaterials * 0.10 : 0;
    const builderLaborDiscount = state.builderPricingEnabled ? laborCost * 0.15 : 0;
    const builderAdjustedMaterials = subtotalMaterials - builderMaterialDiscount;
    const builderAdjustedLabor = laborCost - builderLaborDiscount;
    const adjustedSubtotalBeforeTax = state.builderPricingEnabled
      ? builderAdjustedMaterials + builderAdjustedLabor + deliveryCost + permitCost + demoRebuild.subtotal + rainEscape.subtotal + steelJacket.subtotal + railing.subtotal + handrailRemovalCost + postWrapCost + designPackageCost
      : subtotalBeforeTax;
    const adjustedTaxAmount = state.builderPricingEnabled ? builderAdjustedMaterials * config.taxRate : taxAmount;
    const adjustedGrandTotal = adjustedSubtotalBeforeTax + adjustedTaxAmount;
    const adjustedPricePerSqft = sqft > 0 ? adjustedGrandTotal / sqft : 0;

    return {
      deckMaterial, edgeMaterial, stairMaterial, accessoriesTotal,
      wasteSurcharge, subtotalMaterials, laborCost, deliveryCost,
      permitCost, demoRebuild, rainEscape, steelJacket, railing, handrailRemovalCost,
      postWrapCost, postWrapMaterialCost, postWrapLaborCost,
      postWrapPostPieces, postWrapBeamPieces, postWrapOptionName,
      subtotalBeforeTax: adjustedSubtotalBeforeTax,
      taxAmount: adjustedTaxAmount,
      grandTotal: adjustedGrandTotal,
      pricePerSqft: adjustedPricePerSqft,
      accessoryDetails, laborLineItemDetails, taxRate: config.taxRate,
      builderMaterialDiscount, builderLaborDiscount,
      designPackageCost, designPackageLineItems,
    };
  }, [state, demoRebuildState, currentColor, currentEdge, currentLabor, currentDelivery, config]);

  const resetCalculator = useCallback(() => {
    setState({
      collection: defaultCollection as Collection,
      selectedColor: defaultColor,
      deckLength: 16,
      deckWidth: 12,
      totalSqft: 192,
      edgeLinearFt: 40,
      edgeOptionId: defaultEdge,
      stairRuns: [],
    corners: 4,
    allNinetyDegrees: true,
    wasteFactor: config.defaultWasteFactor,
    laborTierId: defaultLabor,
    deliveryId: defaultDelivery,
    includePermit: false,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    projectAddress: "",
    hotTub: defaultHotTub,
    framingStructural: defaultFramingStructuralState,
    railingEnabled: false,
    railingOptionId: null,
    railingColorNote: "",
    stairRailingSides: "one" as const,
    deckHeightIn: 24,
    handrailRemovalEnabled: false,
    handrailRemovalLf: 0,
    rainEscapeEnabled: false,
    rainEscapeOptionId: defaultRainEscape,
    rainEscapeGutterLinearFt: 40,
    soffitEnabled: false,
    soffitMaterialId: defaultSoffit,
    soffitSqft: 80,
    steelJacketEnabled: false,
    steelJacketOptionId: null,
    steelJacketSelectedPhotoUrl: null,
    builderPricingEnabled: false,
    postWrapEnabled: false,
    postWrapOptionId: null,
    postWrapLinearFt: 0,
    postWrapPostCount: 0,
    postWrapBeamLf: 0,
    moodboardNotes: "",
    designPackageEnabled: false,
    designPackageProjectType: "addition",
    designPackageSqft: 0,
    designPackageSmallBathroomCount: 0,
    designPackageLargeBathroomCount: 0,
    designPackageKitchenCount: 0,
    designPackageExteriorCount: 0,
    designPackageItemOverrides: {},
    });
  }, [defaultCollection, defaultColor, defaultEdge, defaultLabor, defaultDelivery, config.defaultWasteFactor, defaultRainEscape, defaultSoffit, defaultHotTub]);

  return {
    state,
    updateField,
    updateHotTub,
    updateFramingStructural,
    handleHotTubJoistMismatch,
    demoRebuildState,
    setDemoRebuildState,
    currentCollection,
    currentColor,
    availableEdges,
    currentEdge,
    currentLabor,
    currentDelivery,
    breakdown,
    resetCalculator,
    laborTiers,
    deliveryOptions: config.deliveryOptions,
    collections: config.collections,
    config,
  };
}
