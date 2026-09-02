/**
 * DesignPackageCalculator — standalone design package estimator
 *
 * Toggled by clicking the logo in the hero section.
 * Mirrors the decking calculator's Mountain Modern style but focuses
 * on additions and remodels. Uses the same design package items from
 * the admin panel.
 *
 * Customer-facing estimate shows ONLY a single bulk total.
 * Itemized costs, markups, and commission are hidden from the customer.
 * Commission is baked into the total silently.
 *
 * Four calculator modes (toggled at the top):
 *   - "bathroom": Bathroom Remodel — flat-rate, no sqft input
 *   - "kitchen": Kitchen Remodel — flat-rate, no sqft input
 *   - "addition": Addition — includes Feasibility Study, sqft-based pricing
 *   - "basement": Basement Finish — includes Feasibility Study, sqft-based pricing
 *
 * Both modes share the same admin panel pricing data (items, add-ons,
 * parade stoppers, questionnaire, discounts, commissions).
 *
 * Changes (Apr 2026):
 * - Gross profit % pricing (50% GP = cost / (1 - 0.50)) instead of markup
 * - Project-type service exclusions (no Manual J / REScheck / structural for full remodels)
 * - Push-button included services (Step 4) instead of toggle switches
 * - Hero CTAs: Get a Brochure, Book an Appointment, Order a Design Package
 * - Admin-configurable discount buttons (early bird + same day)
 * - Full bottom bar: financing, email estimate, order design package, discounts, reset
 * - Removed back-to-decking button from summary panel
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Settings, FileText, ChevronDown, ChevronUp, Tag, Mail, ShoppingCart, RotateCcw, Loader2, CheckCircle, AlertCircle, X, BookOpen, Calendar, Zap, Eye, ClipboardList, Gift, Home, Plus, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useConfig } from "@/hooks/useConfig";
import { useCalcUser } from "@/hooks/useCalcUser";
import { trpc } from "@/lib/trpc";
import { BrochureModal } from "@/components/BrochureModal";
import { TilePatternThumbnail } from "@/components/TilePatternThumbnail";
import { BenchTypeThumbnail } from "@/components/BenchTypeThumbnail";
import { AppointmentModal } from "@/components/AppointmentModal";
import { EnhancifyWidget } from "@/components/EnhancifyWidget";
import { OrderMaterialModal } from "@/components/OrderMaterialModal";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CabinetPricingSection, calcCabinetPricing, defaultCabinetState } from "@/components/CabinetPricingSection";
import type { CabinetState } from "@/components/CabinetPricingSection";
import { WindowsPricingSection, calcWindowsPricing, defaultWindowsState } from "@/components/WindowsPricingSection";
import type { WindowsState } from "@/components/WindowsPricingSection";
import type { CostBreakdown } from "@/hooks/useCalculator";
import { InitialConsultTool } from "@/components/InitialConsultTool";
import type { ConsultHandoffData, CachedConsultState } from "@/components/consultTypes";
import { defaultCachedConsultState } from "@/components/consultTypes";
import { ConsultSummaryCard } from "@/components/ConsultSummaryCard";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/hero-banner-cYhm2o8M4K9nNSwiDhehg6.webp";
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/102194369_padded_logo_59e28746.png";

/** Calculator mode: which type of project is being estimated */
type CalcMode = "bathroom" | "kitchen" | "addition" | "basement";

/** Project types available per mode */
const REMODEL_PROJECT_TYPES = [
  { value: "bathroom", label: "Bathroom Remodel" },
  { value: "kitchen", label: "Kitchen Remodel" },
];

const ADDITION_PROJECT_TYPES = [
  { value: "addition", label: "Addition" },
];

const BASEMENT_PROJECT_TYPES = [
  { value: "basement", label: "Basement Finish" },
];

/** All project types (for label lookups) */
const ALL_PROJECT_TYPES = [
  { value: "addition", label: "Addition" },
  { value: "basement", label: "Basement Finish" },
  { value: "full_home_remodel", label: "Full Home Remodel" },
  { value: "kitchen", label: "Kitchen Remodel" },
  { value: "bathroom", label: "Bathroom Remodel" },
];

const SQFT_BASED_TYPES = ["addition", "full_home_remodel", "basement"];

/**
 * Services that are typically NOT needed for full home remodels.
 * These are excluded by default when projectType === "full_home_remodel".
 * The user can still toggle them back on via the push-button UI.
 */
const FULL_REMODEL_DEFAULT_EXCLUDED_NAMES = [
  "Manual J",
  "REScheck",
  "Structural Engineering",
];

interface LineItemResult {
  id: number;
  name: string;
  sellPrice: number;
  quantity: number;
  pricingType: string;
  /** Base design hours per space (rendering items only) */
  baseDesignHours?: number;
  /** Discounted hours after volume discount (rendering items only) */
  discountedHours?: number;
}

interface DesignPackageCalculatorProps {
  onBack: () => void;
}

export default function DesignPackageCalculator({ onBack }: DesignPackageCalculatorProps) {
  const config = useConfig();
  const calUser = useCalcUser();

  // ─── Calculator mode ────────────────────────────────────────────────────────
  const [calcMode, setCalcMode] = useState<CalcMode>("bathroom");
  // ─── Sub-mode: Design Package vs Initial Consult ─────────────────────────
  const [bathroomMode, setBathroomMode] = useState<"design_package" | "initial_consult">("design_package");
  const [kitchenMode, setKitchenMode] = useState<"design_package" | "initial_consult">("design_package");
  const [additionMode, setAdditionMode] = useState<"design_package" | "initial_consult">("design_package");
  const [basementMode, setBasementMode] = useState<"design_package" | "initial_consult">("design_package");
  // ── Multi-bathroom support ──────────────────────────────────────────────────
  const [bathroomInstances, setBathroomInstances] = useState<any[]>([{ id: 1, label: "Bathroom 1" }]);
  const [activeBathroomIdx, setActiveBathroomIdx] = useState(0);
  const [bathroomStates, setBathroomStates] = useState<Map<number, any>>(new Map());


  // ─── Calculator state ───────────────────────────────────────────────────────
  // Default project type per mode
  const defaultProjectType = (mode: CalcMode) =>
    mode === "bathroom" ? "bathroom" : mode === "kitchen" ? "kitchen" : mode === "basement" ? "basement" : "addition";

  const [projectType, setProjectType] = useState<string>(defaultProjectType("bathroom"));
  const [sqft, setSqft] = useState<number>(0);
  const [sqftInput, setSqftInput] = useState("");
  const [smallBathroomCount, setSmallBathroomCount] = useState(0);
  const [largeBathroomCount, setLargeBathroomCount] = useState(0);
  const [kitchenCount, setKitchenCount] = useState(0);
  const [exteriorCount, setExteriorCount] = useState(0);
  // itemOverrides: undefined = default (on), true = explicitly on, false = explicitly off
  const [itemOverrides, setItemOverrides] = useState<Record<number, boolean>>({});
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Collapsible questionnaire section (Step 1) — open by default
  const [questionnaireOpen, setQuestionnaireOpen] = useState(true);

  // Questionnaire answers: questionId -> answer value(s)
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<number, string | string[]>>({});

  // Phone lookup for pre-submitted questionnaire answers
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupPhoneInput, setLookupPhoneInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "not_found">("idle");
  const { data: lookupResult, isLoading: lookupLoading } = trpc.questionnaire.getByPhone.useQuery(
    { phone: lookupPhone },
    { enabled: lookupPhone.length >= 7 }
  );

  // Dynamic questionnaire session (loaded by phone lookup)
  const [dynSessionId, setDynSessionId] = useState<number | null>(null);
  const { data: dynSessionLookup, isLoading: dynLookupLoading } = trpc.questionnaire.getSessionByPhone.useQuery(
    { phone: lookupPhone },
    { enabled: lookupPhone.length >= 7 }
  );
  const { data: dynBreakdown } = trpc.questionnaire.getEstimateBreakdown.useQuery(
    { sessionId: dynSessionId!, sqft },
    { enabled: dynSessionId !== null }
  );
  // Total adjustment from dynamic questionnaire calculation rules
  const questionnaireAdjustment = dynBreakdown?.totalAdjustment ?? 0;

  // Free features: set of selected feature IDs
  const [selectedFreeFeatures, setSelectedFreeFeatures] = useState<Set<number>>(new Set());
  const [freeFeaturePreviewUrl, setFreeFeaturePreviewUrl] = useState<string | null>(null);

  // Feasibility Study (additions only)
  const [feasibilityEnabled, setFeasibilityEnabled] = useState(false);
  const { data: feasibilityConfig } = trpc.designPackage.getFeasibilityConfig.useQuery();
  const FEASIBILITY_PRICE = feasibilityConfig ? Number(feasibilityConfig.price) : 1000;
  const FEASIBILITY_REP_COMMISSION = feasibilityConfig ? Number(feasibilityConfig.repCommission) : 250;
  const FEASIBILITY_DRAFTER_COST = feasibilityConfig ? Number(feasibilityConfig.drafterCost) : 500;
  const FEASIBILITY_DESCRIPTION = feasibilityConfig?.description ?? "A comprehensive site and project evaluation to validate your addition plan before committing to full design services.";
  const FEASIBILITY_TAGS = feasibilityConfig?.tags ? feasibilityConfig.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : ["Zoning Review", "Structural Assessment", "Preliminary Drawings", "Cost Validation"];

  // Engineer's Letter (basement mode only)
  const [engineerLetterEnabled, setEngineerLetterEnabled] = useState(false);
  const { data: engineerLetterConfig } = trpc.designPackage.getEngineerLetterConfig.useQuery();
  const ENGINEER_LETTER_PRICE = engineerLetterConfig ? Number(engineerLetterConfig.price) : 500;
  const ENGINEER_LETTER_DESCRIPTION = engineerLetterConfig?.description ?? "A stamped letter from a licensed structural engineer confirming the design meets local building code requirements. Required by some municipalities for permit approval.";
  const ENGINEER_LETTER_ACTIVE = engineerLetterConfig ? Boolean(engineerLetterConfig.isActive) : true;

  // Floor Plan Drawing toggle (basement mode only, defaults to true = included)
  const [floorPlanEnabled, setFloorPlanEnabled] = useState(false);

  // ─── Bathroom Remodel State ─────────────────────────────────────────────────
  const [bathroomSizeTierId, setBathroomSizeTierId] = useState<number | null>(null);
  const [bathroomPlumbingIds, setBathroomPlumbingIds] = useState<Set<number>>(new Set());
  const [bathroomElectricalId, setBathroomElectricalId] = useState<number | null>(null);
  const [bathroomHvacId, setBathroomHvacId] = useState<number | null>(null);
  const [bathroomFinishTierId, setBathroomFinishTierId] = useState<number | null>(null);
  const [bathroomAddonIds, setBathroomAddonIds] = useState<Set<number>>(new Set());
  const [bathroomSqft, setBathroomSqft] = useState<number>(0);
  const [bathroomSqftInput, setBathroomSqftInput] = useState("");
  // Length × Width OR direct sqft toggle
  const [bathroomSizeMode, setBathroomSizeMode] = useState<"sqft" | "dimensions">("sqft");
  const [bathroomLengthInput, setBathroomLengthInput] = useState("");
  const [bathroomWidthInput, setBathroomWidthInput] = useState("");
  // Plumbing feasibility checklist — per-item: Map<itemKey, Set<checklistId>>
  const [plumbingChecklistChecked, setPlumbingChecklistChecked] = useState<Map<string, Set<number>>>(new Map());
  const [plumbingChecklistExpanded, setPlumbingChecklistExpanded] = useState<Set<string>>(new Set());
  // Fixture inventory: which fixtures are present (Set<fixtureKey>)
  const [selectedFixtures, setSelectedFixtures] = useState<Set<string>>(new Set());
  // Per-fixture action: Map<fixtureKey, actionType>
  const [fixtureActions, setFixtureActions] = useState<Map<string, string>>(new Map());
  // Per-fixture add-new quantity: Map<fixtureKey, number>
  const [fixtureAddQty, setFixtureAddQty] = useState<Map<string, number>>(new Map());
  // Per-fixture-action feasibility checklist: Map<"fixtureKey:actionType", Set<checklistId>>
  const [fixtureChecklistChecked, setFixtureChecklistChecked] = useState<Map<string, Set<number>>>(new Map());
  const [fixtureChecklistExpanded, setFixtureChecklistExpanded] = useState<Set<string>>(new Set());
  // HVAC feasibility checklist — per-item: Map<itemKey, Set<checklistId>>
  const [hvacChecklistChecked, setHvacChecklistChecked] = useState<Map<string, Set<number>>>(new Map());
  const [hvacChecklistExpanded, setHvacChecklistExpanded] = useState<Set<string>>(new Set());
  // Tub/Shower selector
  const [bathroomFixtureType, setBathroomFixtureType] = useState<"tub" | "shower" | null>(null);
  const [bathroomTubConfigId, setBathroomTubConfigId] = useState<number | null>(null);
  // Shower config
  const [showerCurbType, setShowerCurbType] = useState<"curbed" | "curbless" | null>(null);
  // Curbless shower joist verification
  const [curblessJoistType, setCurblessJoistType] = useState<'i_joist' | 'engineered_truss' | 'dimensional' | null>(null);
  const [showerPanSizeKey, setShowerPanSizeKey] = useState<string | null>(null);
  const [showerNicheIds, setShowerNicheIds] = useState<Set<number>>(new Set());
  const [nicheQuantities, setNicheQuantities] = useState<Map<number, number>>(new Map());
  const [nicheLighting, setNicheLighting] = useState<boolean>(false);
  const [showerBenchId, setShowerBenchId] = useState<number | null>(null);
  const [showerBenchLf, setShowerBenchLf] = useState<number>(0);
  const [showerShelfIds, setShowerShelfIds] = useState<Set<number>>(new Set());
  const [showerGlassId, setShowerGlassId] = useState<number | null>(null);
  const [showerGlassWallLf, setShowerGlassWallLf] = useState<number>(0);
  const [glassFrameType, setGlassFrameType] = useState<'frameless' | 'wrought_iron' | null>(null);
  const [glassHeight, setGlassHeight] = useState<'78' | 'taller' | null>(null);
  const [glassDoorMount, setGlassDoorMount] = useState<'glass_mounted' | 'wall_mounted' | null>(null);
  const [stoneCasing, setStoneCasing] = useState<boolean>(false);
  // Tile size + pattern for flooring and walls
  const [floorTileSizeId, setFloorTileSizeId] = useState<number | null>(null);
  const [floorTilePatternId, setFloorTilePatternId] = useState<number | null>(null);
  const [wallTileSizeId, setWallTileSizeId] = useState<number | null>(null);
  const [wallTilePatternId, setWallTilePatternId] = useState<number | null>(null);
  // Vanity pricing matrix
  const [vanityWidthInches, setVanityWidthInches] = useState<number | null>(null);
  const [vanityMaterial, setVanityMaterial] = useState<string | null>(null);
  const [vanityType, setVanityType] = useState<'custom' | 'stock' | 'install_only' | null>(null);
  const [floatingCountertopLength, setFloatingCountertopLength] = useState<number>(0);
  // Floating vanity option with 8" turn-down
  const [isFloatingVanity, setIsFloatingVanity] = useState(false);
  // Accessories: Set of selected slugs, plus quantity map for count-type items
  const [accessorySlugs, setAccessorySlugs] = useState<Set<string>>(new Set());
  const [accessoryQtys, setAccessoryQtys] = useState<Map<string, number>>(new Map());
  // Electrical per-unit quantities: Map<slug, quantity>
  const [electricalQtys, setElectricalQtys] = useState<Map<string, number>>(new Map());
  // Radiant heat options
  const [radiantHeatMode, setRadiantHeatMode] = useState<'none' | 'bench_only' | 'sqft'>('none');
  const [radiantHeatCoverage, setRadiantHeatCoverage] = useState<'full' | 'sections'>('full');
  const [radiantHeatBrand, setRadiantHeatBrand] = useState<'schluter' | 'vevor'>('schluter');
  const [radiantHeatSqft, setRadiantHeatSqft] = useState<number>(0);
  const [radiantPanelCapacity, setRadiantPanelCapacity] = useState<'yes' | 'no' | null>(null);

  const [showerExteriorWall, setShowerExteriorWall] = useState<boolean>(false);
  // Bench drawer add-on
  const [showerBenchDrawer, setShowerBenchDrawer] = useState<boolean>(false);
  // Bench type (floating / floor_mounted / corner)
  const [showerBenchTypeId, setShowerBenchTypeId] = useState<number | null>(null);
  // Tile outside shower area
  const [tileOutsideShower, setTileOutsideShower] = useState<boolean>(false);
  const [tileOutsideInputMode, setTileOutsideInputMode] = useState<'sqft' | 'dimensions'>('sqft');
  const [tileOutsideSqft, setTileOutsideSqft] = useState<number>(0);
  const [tileOutsideLength, setTileOutsideLength] = useState<number>(0);
  const [tileOutsideWidth, setTileOutsideWidth] = useState<number>(0);
  const [tileOutsideSizeId, setTileOutsideSizeId] = useState<number | null>(null);
  const [tileOutsidePatternId, setTileOutsidePatternId] = useState<number | null>(null);
  // Painting selections: Map<slug, quantity> (walls/ceiling use sqft, trim uses LF)
  const [paintingQtys, setPaintingQtys] = useState<Map<string, number>>(new Map());
  const [paintingScope, setPaintingScope] = useState<'bathroom_only' | 'other_areas' | null>(null);
  const [paintingCeilingHeight, setPaintingCeilingHeight] = useState<number>(8);
  const [paintingNeedsDrywall, setPaintingNeedsDrywall] = useState<boolean>(false);

  const { data: bathroomConfig } = trpc.designPackage.getBathroomConfig.useQuery();
  const { data: bathroomSizeTiers = [] } = trpc.designPackage.getBathroomSizeTiers.useQuery();
  const { data: bathroomPlumbingItems = [] } = trpc.designPackage.getBathroomPlumbingItems.useQuery();
  const { data: bathroomElectricalOptions = [] } = trpc.designPackage.getBathroomElectricalOptions.useQuery();
  const { data: bathroomHvacOptions = [] } = trpc.designPackage.getBathroomHvacOptions.useQuery();
  const { data: bathroomFinishTiers = [] } = trpc.designPackage.getBathroomFinishTiers.useQuery();
  const { data: bathroomAddons = [] } = trpc.designPackage.getBathroomAddons.useQuery();

  // ─── Bathroom Material Selection State ─────────────────────────────────────
  const [bathroomShowerSurroundId, setBathroomShowerSurroundId] = useState<number | null>(null);
  const [bathroomVanityId, setBathroomVanityId] = useState<number | null>(null);
  const [bathroomFlooringId, setBathroomFlooringId] = useState<number | null>(null);
  const [bathroomCountertopId, setBathroomCountertopId] = useState<number | null>(null);
  const [bathroomCountertopEdgeId, setBathroomCountertopEdgeId] = useState<number | null>(null);
  const [bathroomToiletId, setBathroomToiletId] = useState<number | null>(null);
  const [bathroomWallFinishId, setBathroomWallFinishId] = useState<number | null>(null);
  const { data: bathroomShowerSurroundOptions = [] } = trpc.designPackage.getBathroomShowerSurround.useQuery();
  const { data: bathroomVanityOptions = [] } = trpc.designPackage.getBathroomVanity.useQuery();
  const { data: bathroomFlooringOptions = [] } = trpc.designPackage.getBathroomFlooring.useQuery();
  const { data: bathroomCountertopOptions = [] } = trpc.designPackage.getBathroomCountertop.useQuery();
  const { data: bathroomCountertopEdgeOptions = [] } = trpc.designPackage.getBathroomCountertopEdge.useQuery();
  const { data: bathroomToiletOptions = [] } = trpc.designPackage.getBathroomToilet.useQuery();
  const { data: bathroomWallFinishOptions = [] } = trpc.designPackage.getBathroomWallFinish.useQuery();
  // New expanded bathroom queries — fetch ALL checklist items (no filter); group by itemKey in UI
  const { data: bathroomPlumbingChecklist = [] } = trpc.designPackage.getBathroomPlumbingChecklist.useQuery({});
  const { data: bathroomHvacChecklist = [] } = trpc.designPackage.getBathroomHvacChecklist.useQuery({});
  const { data: bathroomTubConfigs = [] } = trpc.designPackage.getBathroomTubConfig.useQuery();
  const { data: bathroomShowerConfigs = [] } = trpc.designPackage.getBathroomShowerConfig.useQuery();
  const { data: bathroomTileSizes = [] } = trpc.designPackage.getBathroomTileSizes.useQuery();
  const { data: bathroomTilePatterns = [] } = trpc.designPackage.getBathroomTilePatterns.useQuery();
  const { data: bathroomVanityPricing = [] } = trpc.designPackage.getBathroomVanityPricing.useQuery();
  const { data: bathroomFixtureTypes = [] } = trpc.designPackage.getBathroomFixtureTypes.useQuery();
  const { data: bathroomFixtureActions = [] } = trpc.designPackage.getBathroomFixtureActions.useQuery();
  const { data: bathroomPaintingOptions = [] } = trpc.designPackage.getBathroomPaintingOptions.useQuery();
  const { data: bathroomAccessories = [] } = trpc.designPackage.getBathroomAccessories.useQuery();
  const { data: floatingVanityConfig } = trpc.designPackage.getBathroomFloatingVanityConfig.useQuery();

  // Bathroom pricing engine
  const bathroomPricing = useMemo(() => {
    if (calcMode !== "bathroom") return { lineItems: [], total: 0 };
    const config = bathroomConfig;
    const gpPct = config ? Number(config.markupPct) : 0.50;
    const gpDivisor = gpPct >= 1 ? 0.01 : 1 - gpPct;
    const commission = config ? Number(config.repCommission) : 0;
    const lineItems: { id: number; name: string; sellPrice: number; cost: number }[] = [];
    let totalCost = 0;
    let idCounter = 10000; // synthetic IDs for computed items

    // Size tier (base cost + per-sqft cost)
    const sizeTier = (bathroomSizeTiers as any[]).find((t: any) => t.id === bathroomSizeTierId);
    if (sizeTier) {
      const baseCost = Number(sizeTier.baseCost);
      const perSqftCost = Number(sizeTier.costPerSqft);
      const sqftCost = bathroomSqft > 0 ? perSqftCost * bathroomSqft : 0;
      const cost = baseCost + sqftCost;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: sizeTier.id, name: sizeTier.label, sellPrice, cost });
      totalCost += cost;
    }

    // Fixture inventory pricing (new model)
    const allFixtureActions = bathroomFixtureActions as any[];
    for (const fixtureKey of Array.from(selectedFixtures)) {
      const actionType = fixtureActions.get(fixtureKey);
      if (!actionType || actionType === "leave_as_is") continue;
      const actionRow = allFixtureActions.find((a: any) => a.fixtureKey === fixtureKey && a.actionType === actionType);
      if (!actionRow) continue;
      const fixtureType = (bathroomFixtureTypes as any[]).find((ft: any) => ft.fixtureKey === fixtureKey);
      const fixtureLabel = fixtureType?.label ?? fixtureKey;
      if (actionType === "add_new") {
        const qty = fixtureAddQty.get(fixtureKey) ?? 1;
        const cost = Number(actionRow.costPerFixture) * qty;
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: actionRow.id + 90000, name: `${fixtureLabel}: ${actionRow.label} ×${qty}`, sellPrice, cost });
        totalCost += cost;
      } else {
        const cost = Number(actionRow.cost);
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: actionRow.id + 90000, name: `${fixtureLabel}: ${actionRow.label}`, sellPrice, cost });
        totalCost += cost;
      }
    }

    // Electrical (per-unit quantities — excluding radiant heat which is handled separately)
    for (const elecOpt of (bathroomElectricalOptions as any[])) {
      if (elecOpt.slug === 'radiant_heat') continue; // handled below
      const qty = electricalQtys.get(elecOpt.slug) ?? 0;
      if (qty <= 0) continue;
      const unitCost = Number(elecOpt.cost);
      const cost = elecOpt.pricingType === 'per_unit' || elecOpt.pricingType === 'per_sqft' ? unitCost * qty : unitCost;
      const sellPrice = cost / gpDivisor;
      const label = elecOpt.pricingType === 'per_sqft' ? `${elecOpt.label} (${qty} sqft)` : elecOpt.pricingType === 'per_unit' ? `${elecOpt.label} \u00d7${qty}` : elecOpt.label;
      lineItems.push({ id: elecOpt.id + 70000, name: label, sellPrice, cost });
      totalCost += cost;
    }
    // Radiant heat (separate multi-step pricing)
    if (radiantHeatMode !== 'none') {
      const radiantOpt = (bathroomElectricalOptions as any[]).find((o: any) => o.slug === 'radiant_heat');
      const baseCostPerSqft = radiantOpt ? Number(radiantOpt.cost) : 12;
      // Vevor is cheaper, Schluter is premium
      const brandMultiplier = radiantHeatBrand === 'vevor' ? 0.6 : 1.0;
      let heatSqft = 0;
      if (radiantHeatMode === 'bench_only') {
        heatSqft = 6; // typical bench area ~6 sqft
      } else {
        heatSqft = radiantHeatCoverage === 'full' ? (bathroomSqft > 0 ? bathroomSqft : radiantHeatSqft) : radiantHeatSqft;
      }
      if (heatSqft > 0) {
        const radiantCost = heatSqft * baseCostPerSqft * brandMultiplier;
        const brandLabel = radiantHeatBrand === 'schluter' ? 'Schluter' : 'Vevor';
        const modeLabel = radiantHeatMode === 'bench_only' ? 'Bench Only' : (radiantHeatCoverage === 'full' ? 'Full Overlay' : 'Sections');
        lineItems.push({ id: 70999, name: `Radiant Heat — ${brandLabel} (${modeLabel}, ${heatSqft} sqft)`, sellPrice: radiantCost / gpDivisor, cost: radiantCost });
        totalCost += radiantCost;
      }
      // Panel upgrade if not enough capacity
      if (radiantPanelCapacity === 'no') {
        const panelUpgradeCost = 2500; // typical panel upgrade cost
        lineItems.push({ id: 70998, name: 'Electrical Panel Upgrade (for radiant heat)', sellPrice: panelUpgradeCost / gpDivisor, cost: panelUpgradeCost });
        totalCost += panelUpgradeCost;
      }
    }

    // HVAC (single select)
    const hvacOption = (bathroomHvacOptions as any[]).find((o: any) => o.id === bathroomHvacId);
    if (hvacOption) {
      const cost = Number(hvacOption.cost);
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: hvacOption.id, name: hvacOption.label, sellPrice, cost });
      totalCost += cost;
    }

    // Finish tier (per-sqft)
    const finishTier = (bathroomFinishTiers as any[]).find((t: any) => t.id === bathroomFinishTierId);
    if (finishTier && bathroomSqft > 0) {
      const cost = Number(finishTier.costPerSqft) * bathroomSqft;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: finishTier.id, name: `${finishTier.label} Finishes`, sellPrice, cost });
      totalCost += cost;
    }

    // Add-ons (multi-select)
    for (const addon of (bathroomAddons as any[])) {
      if (!bathroomAddonIds.has(addon.id)) continue;
      const cost = Number(addon.cost);
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: addon.id, name: addon.label, sellPrice, cost });
      totalCost += cost;
    }

    // ── Tub Install ──────────────────────────────────────────────────────────
    if (bathroomFixtureType === "tub" && bathroomTubConfigId) {
      const tubConfig = (bathroomTubConfigs as any[]).find((t: any) => t.id === bathroomTubConfigId);
      if (tubConfig) {
        const cost = Number(tubConfig.installCost);
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: tubConfig.id, name: `Tub Install: ${tubConfig.label}`, sellPrice, cost });
        totalCost += cost;
      }
    }

    // ── Shower Config ─────────────────────────────────────────────────────────
    if (bathroomFixtureType === "shower") {
      const showerCfgs = bathroomShowerConfigs as any[];
      // Pan size
      if (showerPanSizeKey) {
        const panItem = showerCfgs.find((c: any) => c.optionKey === showerPanSizeKey);
        if (panItem) {
          const cost = Number(panItem.cost);
          lineItems.push({ id: panItem.id, name: `Shower Pan: ${panItem.label}`, sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
      // Curbless upcharge
      if (showerCurbType === "curbless") {
        const curblessItem = showerCfgs.find((c: any) => c.optionKey === "curbless");
        if (curblessItem) {
          const cost = Number(curblessItem.cost);
          lineItems.push({ id: curblessItem.id, name: "Curbless Shower Upcharge", sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
        // Joist type floor leveling
        if (curblessJoistType && curblessJoistType !== 'dimensional') {
          // I-joist or engineered truss: full floor leveling (cement board + recess kit)
          const floorLevelCost = 1200;
          lineItems.push({ id: idCounter++, name: 'Floor Leveling (cement board + recess kit)', sellPrice: floorLevelCost / gpDivisor, cost: floorLevelCost });
          totalCost += floorLevelCost;
        } else if (curblessJoistType === 'dimensional') {
          // Dimensional lumber: recess kit only
          const recessCost = 600;
          lineItems.push({ id: idCounter++, name: 'Subfloor Recess Kit', sellPrice: recessCost / gpDivisor, cost: recessCost });
          totalCost += recessCost;
        }
      }
      // Niches (multi-select with quantities)
      let totalNicheCount = 0;
      for (const nicheId of Array.from(showerNicheIds)) {
        const nicheItem = showerCfgs.find((c: any) => c.id === nicheId);
        if (nicheItem) {
          const qty = nicheQuantities.get(nicheId) ?? 1;
          totalNicheCount += qty;
          const cost = Number(nicheItem.cost) * qty;
          lineItems.push({ id: nicheItem.id, name: `Niche: ${nicheItem.label}${qty > 1 ? ` \u00d7${qty}` : ''}`, sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
      // Niche lighting
      if (nicheLighting && totalNicheCount > 0) {
        const lightingCost = 150 * totalNicheCount;
        lineItems.push({ id: idCounter++, name: `Niche Track Lighting \u00d7${totalNicheCount}`, sellPrice: lightingCost / gpDivisor, cost: lightingCost });
        totalCost += lightingCost;
      }
      // Bench
      if (showerBenchId) {
        const benchItem = showerCfgs.find((c: any) => c.id === showerBenchId);
        if (benchItem) {
          const perLf = benchItem.pricingType === "per_lf";
          const cost = perLf && showerBenchLf > 0 ? Number(benchItem.cost) * showerBenchLf : Number(benchItem.cost);
          lineItems.push({ id: benchItem.id, name: `Bench: ${benchItem.label}${perLf ? ` (${showerBenchLf} LF)` : ""}`, sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
      // Shelves (multi-select)
      for (const shelfId of Array.from(showerShelfIds)) {
        const shelfItem = showerCfgs.find((c: any) => c.id === shelfId);
        if (shelfItem) {
          const cost = Number(shelfItem.cost);
          lineItems.push({ id: shelfItem.id, name: `Shelf: ${shelfItem.label}`, sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
      // Glass enclosure
      if (showerGlassId) {
        const glassItem = showerCfgs.find((c: any) => c.id === showerGlassId);
        if (glassItem) {
          const perLf = glassItem.pricingType === "per_lf";
          const cost = perLf && showerGlassWallLf > 0 ? Number(glassItem.cost) * showerGlassWallLf : Number(glassItem.cost);
          if (cost > 0) {
            const frameLabel = glassFrameType === 'wrought_iron' ? ' (Wrought Iron)' : glassFrameType === 'frameless' ? ' (Frameless)' : '';
            lineItems.push({ id: glassItem.id, name: `Glass: ${glassItem.label}${frameLabel}${perLf ? ` (${showerGlassWallLf} LF)` : ""}`, sellPrice: cost / gpDivisor, cost });
            totalCost += cost;
          }
          // Wrought iron frame upcharge
          if (glassFrameType === 'wrought_iron') {
            const ironCost = 500;
            lineItems.push({ id: idCounter++, name: 'Wrought Iron Frame Upcharge', sellPrice: ironCost / gpDivisor, cost: ironCost });
            totalCost += ironCost;
          }
          // Taller glass upcharge
          if (glassHeight === 'taller') {
            const tallCost = 300;
            lineItems.push({ id: idCounter++, name: 'Taller Glass Upcharge', sellPrice: tallCost / gpDivisor, cost: tallCost });
            totalCost += tallCost;
          }
          // Stone casing
          if (stoneCasing) {
            const stoneCost = 400;
            lineItems.push({ id: idCounter++, name: 'Stone Casing for Door Opening', sellPrice: stoneCost / gpDivisor, cost: stoneCost });
            totalCost += stoneCost;
          }
        }
      }

      // Bench type upcharge (Floating = $0, Floor Mounted = +$150, Corner = +$200)
      if (showerBenchId && showerBenchTypeId) {
        const btItem = showerCfgs.find((c: any) => c.id === showerBenchTypeId);
        if (btItem && Number(btItem.cost) > 0) {
          const cost = Number(btItem.cost);
          lineItems.push({ id: btItem.id + 62000, name: `Bench Type: ${btItem.label}`, sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
      // Bench drawer add-on
      if (showerBenchId && showerBenchDrawer) {
        const drawerItem = showerCfgs.find((c: any) => c.configType === 'bench_drawer');
        if (drawerItem) {
          const cost = Number(drawerItem.cost);
          lineItems.push({ id: drawerItem.id + 61000, name: 'Bench Drawer', sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        } else {
          // Fallback flat cost if not configured
          const cost = 350;
          lineItems.push({ id: idCounter++, name: 'Bench Drawer', sellPrice: cost / gpDivisor, cost });
          totalCost += cost;
        }
      }
    }

    // ── Tile Outside Shower ───────────────────────────────────────────────────
    const computedTileOutsideSqft = tileOutsideInputMode === 'dimensions' ? tileOutsideLength * tileOutsideWidth : tileOutsideSqft;
    if (tileOutsideShower && computedTileOutsideSqft > 0 && tileOutsideSizeId) {
      const tileSize = (bathroomTileSizes as any[]).find((s: any) => s.id === tileOutsideSizeId);
      if (tileSize) {
        let perSqft = Number(tileSize.floorCostPerSqft);
        if (tileOutsidePatternId) {
          const pattern = (bathroomTilePatterns as any[]).find((p: any) => p.id === tileOutsidePatternId);
          if (pattern) perSqft += Number(pattern.upchargePerSqft);
        }
        const cost = perSqft * computedTileOutsideSqft;
        lineItems.push({ id: idCounter++, name: `Tile Outside Shower (${computedTileOutsideSqft} sqft)`, sellPrice: cost / gpDivisor, cost });
        totalCost += cost;
      }
    }

    // ── Painting ──────────────────────────────────────────────────────────────
    for (const paintOpt of (bathroomPaintingOptions as any[])) {
      const qty = paintingQtys.get(paintOpt.slug) ?? 0;
      if (qty <= 0) continue;
      const unitCost = Number(paintOpt.cost);
      const cost = paintOpt.pricingType === 'per_sqft' || paintOpt.pricingType === 'per_unit' ? unitCost * qty : unitCost;
      const sellPrice = cost / gpDivisor;
      const label = paintOpt.pricingType === 'per_sqft' ? `${paintOpt.label} (${qty} sqft)` : paintOpt.label;
      lineItems.push({ id: paintOpt.id + 80000, name: label, sellPrice, cost });
      totalCost += cost;
    }

    // ── Vanity Pricing Matrix ─────────────────────────────────────────────────
    if (vanityMaterial === 'floating_vanity') {
      // Floating countertop vanity pricing uses the floatingVanityConfig
      if (floatingCountertopLength > 0 && floatingVanityConfig) {
        const mountCost = Number((floatingVanityConfig as any).floatingMountCost);
        const turnDownRate = Number((floatingVanityConfig as any).turnDownCostPerLinearFt);
        const lf = floatingCountertopLength / 12;
        const cost = mountCost + turnDownRate * lf;
        lineItems.push({ id: idCounter++, name: `Floating Countertop Vanity (${floatingCountertopLength}")`, sellPrice: cost / gpDivisor, cost });
        totalCost += cost;
      }
    } else if (vanityWidthInches && vanityMaterial) {
      const vanityRow = (bathroomVanityPricing as any[]).find(
        (v: any) => v.widthInches === vanityWidthInches && v.material === vanityMaterial
      );
      if (vanityRow) {
        const cost = Number(vanityRow.cost);
        const materialLabel = { painted: "Painted", alder_maple: "Alder/Maple", white_oak: "White Oak", walnut: "Walnut" }[vanityMaterial] ?? vanityMaterial;
        const typeLabel = vanityType ? ` (${vanityType === 'custom' ? 'Custom' : vanityType === 'stock' ? 'Stock' : 'Install Only'})` : '';
        lineItems.push({ id: idCounter++, name: `Vanity${typeLabel}: ${vanityWidthInches}" ${materialLabel}`, sellPrice: cost / gpDivisor, cost });
        totalCost += cost;
      }
    }

    // ── Flooring with tile size + pattern ────────────────────────────────────
    const flooring = (bathroomFlooringOptions as any[]).find((o: any) => o.id === bathroomFlooringId);
    if (flooring) {
      let perSqft = Number(flooring.costPerSqft ?? 0);
      // If tile flooring, use tile size cost + pattern upcharge
      if (flooring.type === "tile" && floorTileSizeId) {
        const tileSize = (bathroomTileSizes as any[]).find((s: any) => s.id === floorTileSizeId);
        if (tileSize) perSqft = Number(tileSize.floorCostPerSqft);
        if (floorTilePatternId) {
          const pattern = (bathroomTilePatterns as any[]).find((p: any) => p.id === floorTilePatternId);
          if (pattern) perSqft += Number(pattern.upchargePerSqft);
        }
      }
      const flat = Number(flooring.cost ?? 0);
      const cost = perSqft > 0 && bathroomSqft > 0 ? perSqft * bathroomSqft : flat;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: flooring.id, name: `Flooring: ${flooring.label}`, sellPrice, cost });
      totalCost += cost;
    }

    // Countertop (single select — per-sqft)
    const countertop = (bathroomCountertopOptions as any[]).find((o: any) => o.id === bathroomCountertopId);
    if (countertop) {
      const perSqft = Number(countertop.costPerSqft ?? 0);
      const flat = Number(countertop.cost ?? 0);
      const cost = perSqft > 0 && bathroomSqft > 0 ? perSqft * bathroomSqft : flat;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: countertop.id, name: `Countertop: ${countertop.label}`, sellPrice, cost });
      totalCost += cost;
    }

    // Countertop edge profile (single select — flat add-on)
    const ctEdge = (bathroomCountertopEdgeOptions as any[]).find((o: any) => o.id === bathroomCountertopEdgeId);
    if (ctEdge) {
      const cost = Number(ctEdge.cost);
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: ctEdge.id, name: `Edge Profile: ${ctEdge.label}`, sellPrice, cost });
      totalCost += cost;
    }

    // Toilet (single select)
    const toilet = (bathroomToiletOptions as any[]).find((o: any) => o.id === bathroomToiletId);
    if (toilet) {
      const cost = Number(toilet.flatCost ?? toilet.cost ?? 0);
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: toilet.id, name: `Toilet: ${toilet.label}`, sellPrice, cost });
      totalCost += cost;
    }

    // ── Wall Finish with tile size + pattern ──────────────────────────────────
    const wallFinish = (bathroomWallFinishOptions as any[]).find((o: any) => o.id === bathroomWallFinishId);
    if (wallFinish) {
      let perSqft = Number(wallFinish.costPerSqft ?? 0);
      if (wallFinish.type === "tile" && wallTileSizeId) {
        const tileSize = (bathroomTileSizes as any[]).find((s: any) => s.id === wallTileSizeId);
        if (tileSize) perSqft = Number(tileSize.wallCostPerSqft);
        if (wallTilePatternId) {
          const pattern = (bathroomTilePatterns as any[]).find((p: any) => p.id === wallTilePatternId);
          if (pattern) perSqft += Number(pattern.upchargePerSqft);
        }
      }
      const flat = Number(wallFinish.cost ?? 0);
      // Estimate wall area as ~2.5× floor sqft for a typical bathroom
      const wallSqft = bathroomSqft > 0 ? bathroomSqft * 2.5 : 0;
      const cost = perSqft > 0 && wallSqft > 0 ? perSqft * wallSqft : flat;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: wallFinish.id, name: `Walls: ${wallFinish.label}`, sellPrice, cost });
      totalCost += cost;
    }

    // Legacy shower surround (only if new fixture type not selected)
    if (!bathroomFixtureType) {
      const showerSurround = (bathroomShowerSurroundOptions as any[]).find((o: any) => o.id === bathroomShowerSurroundId);
      if (showerSurround) {
        const cost = Number(showerSurround.cost);
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: showerSurround.id, name: `Shower/Tub: ${showerSurround.label}`, sellPrice, cost });
        totalCost += cost;
      }
      // Legacy vanity
      const vanity = (bathroomVanityOptions as any[]).find((o: any) => o.id === bathroomVanityId);
      if (vanity) {
        const cost = Number(vanity.cost);
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: vanity.id, name: `Vanity: ${vanity.label}`, sellPrice, cost });
        totalCost += cost;
      }
    }
    // Floating vanity upgrade with 8" turn-down
    if (isFloatingVanity && floatingVanityConfig) {
      const mountCost = Number(floatingVanityConfig.floatingMountCost);
      const turnDownRate = Number(floatingVanityConfig.turnDownCostPerLinearFt);
      const vanityLf = vanityWidthInches ? vanityWidthInches / 12 : 0;
      const turnDownCost = turnDownRate * vanityLf;
      const totalFloatCost = mountCost + turnDownCost;
      if (totalFloatCost > 0) {
        const sellPrice = totalFloatCost / gpDivisor;
        lineItems.push({ id: idCounter++, name: 'Floating Vanity w/ 8" Turn-Down', sellPrice, cost: totalFloatCost });
        totalCost += totalFloatCost;
      }
    }
    // Accessories
    for (const acc of (bathroomAccessories as any[])) {
      if (!acc.isActive) continue;
      if (!accessorySlugs.has(acc.slug)) continue;
      const qty = acc.quantityType === 'count' ? (accessoryQtys.get(acc.slug) ?? 1) : 1;
      const cost = Number(acc.cost) * qty;
      if (cost > 0) {
        const sellPrice = cost / gpDivisor;
        const label = qty > 1 ? `${acc.label} (×${qty})` : acc.label;
        lineItems.push({ id: idCounter++, name: label, sellPrice, cost });
        totalCost += cost;
      }
    }

    const total = lineItems.reduce((sum, l) => sum + l.sellPrice, 0) + commission;
    return { lineItems, total };
  }, [
    calcMode, bathroomConfig, bathroomSizeTiers, bathroomSizeTierId, bathroomSqft,
    bathroomPlumbingItems, bathroomPlumbingIds,
    bathroomElectricalOptions, bathroomElectricalId,
    bathroomHvacOptions, bathroomHvacId,
    bathroomFinishTiers, bathroomFinishTierId,
    bathroomAddons, bathroomAddonIds,
    bathroomShowerSurroundOptions, bathroomShowerSurroundId,
    bathroomVanityOptions, bathroomVanityId,
    bathroomFlooringOptions, bathroomFlooringId,
    bathroomCountertopOptions, bathroomCountertopId,
    bathroomCountertopEdgeOptions, bathroomCountertopEdgeId,
    bathroomToiletOptions, bathroomToiletId,
    bathroomWallFinishOptions, bathroomWallFinishId,
    bathroomFixtureType, bathroomTubConfigId, bathroomTubConfigs,
    bathroomShowerConfigs, showerCurbType, showerPanSizeKey,
    showerNicheIds, nicheQuantities, nicheLighting, showerBenchId, showerBenchLf,
    showerShelfIds, showerGlassId, showerGlassWallLf, glassFrameType, glassHeight, glassDoorMount, stoneCasing,
    vanityWidthInches, vanityMaterial, vanityType, floatingCountertopLength, bathroomVanityPricing,
    floorTileSizeId, floorTilePatternId, wallTileSizeId, wallTilePatternId,
    bathroomTileSizes, bathroomTilePatterns,
    electricalQtys, bathroomPaintingOptions, paintingQtys,
    radiantHeatMode, radiantHeatCoverage, radiantHeatBrand, radiantHeatSqft, radiantPanelCapacity,
    showerExteriorWall, showerBenchDrawer, showerBenchTypeId, curblessJoistType,
    tileOutsideShower, tileOutsideInputMode, tileOutsideSqft, tileOutsideLength, tileOutsideWidth, tileOutsideSizeId, tileOutsidePatternId,
    bathroomFixtureTypes, bathroomFixtureActions, selectedFixtures, fixtureActions, fixtureAddQty,
    isFloatingVanity, floatingVanityConfig,
    bathroomAccessories, accessorySlugs, accessoryQtys,
  ]);

  // ─── Kitchen / Addition / Basement Price Consult State ─────────────────────
  // Kitchen: per-item quantities (Map<slug, quantity>)
  const [kitchenItemQtys, setKitchenItemQtys] = useState<Map<string, number>>(new Map());
  const [kitchenSqft, setKitchenSqft] = useState<number>(0);
  const [kitchenSqftInput, setKitchenSqftInput] = useState("");
  // Addition: per-item quantities
  const [additionItemQtys, setAdditionItemQtys] = useState<Map<string, number>>(new Map());
  const [additionSqft, setAdditionSqft] = useState<number>(0);
  const [additionSqftInput, setAdditionSqftInput] = useState("");
  // Addition: Interior Finish tier selections (Map<slug, 'good'|'better'|'best'>)
  const [additionInteriorTiers, setAdditionInteriorTiers] = useState<Map<string, 'good' | 'better' | 'best'>>(new Map());
  // Addition: Paint scope
  const [additionPaintScope, setAdditionPaintScope] = useState<'addition_only' | 'addition_and_other' | null>(null);
  const [additionPaintCeilingHeight, setAdditionPaintCeilingHeight] = useState<number>(9);
  const [additionPaintNumRooms, setAdditionPaintNumRooms] = useState<number>(0);
  const [additionPaintIncludeCeilings, setAdditionPaintIncludeCeilings] = useState<boolean>(true);
  const [additionPaintOtherSqft, setAdditionPaintOtherSqft] = useState<number>(0);
  // Basement: per-item quantities
  const [basementItemQtys, setBasementItemQtys] = useState<Map<string, number>>(new Map());
  const [basementSqft, setBasementSqft] = useState<number>(0);
  const [basementSqftInput, setBasementSqftInput] = useState("");

  // Cabinet pricing state
  const [cabinetState, setCabinetState] = useState<CabinetState>(defaultCabinetState);
  const { data: cabinetConfigRaw } = trpc.designPackage.getCabinetConfig.useQuery();
  // Convert cabinetConfigRaw (typed Drizzle row) to plain Record<string,string> for calcCabinetPricing
  const cabinetConfig = cabinetConfigRaw
    ? Object.fromEntries(Object.entries(cabinetConfigRaw).map(([k, v]) => [k, String(v ?? "")]))
    : null;
  const cabinetMarkupPct = cabinetConfigRaw ? Number(cabinetConfigRaw.markupPct) : 0.40;

  // Windows & SGD pricing state
  const [windowsState, setWindowsState] = useState<WindowsState>(defaultWindowsState);
  const { data: windowConfigRaw } = trpc.designPackage.getWindowConfig.useQuery();
  const windowConfig = windowConfigRaw
    ? Object.fromEntries(Object.entries(windowConfigRaw).map(([k, v]) => [k, String(v ?? "")]))
    : null;

  const { data: kitchenConfig } = trpc.designPackage.getKitchenConfig.useQuery();
  const { data: kitchenOptions = [] } = trpc.designPackage.getKitchenOptions.useQuery();
  const { data: additionConfig } = trpc.designPackage.getAdditionConfig.useQuery();
  const { data: additionOptions = [] } = trpc.designPackage.getAdditionOptions.useQuery();
  const { data: basementConfig } = trpc.designPackage.getBasementConfig.useQuery();
  const { data: basementOptions = [] } = trpc.designPackage.getBasementOptions.useQuery();

  // Kitchen pricing engine
  const kitchenPricing = useMemo(() => {
    return { lineItems: [], total: 0 }; // Price Consult removed
    const gpPct = kitchenConfig ? Number(kitchenConfig!.markupPct) : 0.40;
    const gpDivisor = gpPct >= 1 ? 0.01 : 1 - gpPct;
    const commission = kitchenConfig ? Number(kitchenConfig!.repCommission) : 0;
    const lineItems: { id: number; name: string; sellPrice: number; cost: number }[] = [];
    let totalCost = 0;
    const activeOpts = (kitchenOptions as any[]).filter((o: any) => o.isActive !== 0);
    for (const opt of activeOpts) {
      const qty = kitchenItemQtys.get(opt.slug) ?? 0;
      if (qty <= 0) continue;
      const unitCost = Number(opt.cost);
      let cost = 0;
      if (opt.pricingType === "flat") cost = unitCost;
      else if (opt.pricingType === "per_unit") cost = unitCost * qty;
      else if (opt.pricingType === "per_sqft") cost = unitCost * (kitchenSqft > 0 ? kitchenSqft : qty);
      else if (opt.pricingType === "per_lf") cost = unitCost * qty;
      const sellPrice = cost / gpDivisor;
      totalCost += cost;
      lineItems.push({ id: opt.id, name: opt.label, sellPrice, cost });
    }
    // Cabinet pricing
    const cabinetResult = calcCabinetPricing(cabinetState, cabinetConfig, cabinetMarkupPct);
    for (const li of cabinetResult.lineItems) {
      lineItems.push({ id: 99800 + lineItems.length, name: `Cabinets — ${li.name}`, sellPrice: li.sellPrice, cost: li.cost });
    }
    // Windows & SGD pricing
    const windowsResult = calcWindowsPricing(windowsState, windowConfig as any);
    for (const li of windowsResult.lineItems) {
      lineItems.push({ id: 99700 + lineItems.length, name: `Windows — ${li.label}`, sellPrice: li.sellPrice, cost: li.cost });
    }
    const commissionSell = commission / gpDivisor;
    if (commission > 0) lineItems.push({ id: 99901, name: "Sales Commission", sellPrice: commissionSell, cost: commission });
    const total = lineItems.reduce((s, li) => s + li.sellPrice, 0);
    return { lineItems, total };
  }, [calcMode, kitchenMode, kitchenConfig, kitchenOptions, kitchenItemQtys, kitchenSqft, cabinetState, cabinetConfig, cabinetMarkupPct, windowsState, windowConfig]);

  // Addition paint sqft calculator (Excel logic)
  const additionPaintSqft = useMemo(() => {
    if (additionSqft <= 0) return 0;
    const shapeFactor = 1.15;
    const perimeter = 4 * Math.sqrt(additionSqft) * shapeFactor;
    const exteriorWallArea = perimeter * additionPaintCeilingHeight;
    const numRooms = additionPaintNumRooms > 0 ? additionPaintNumRooms : Math.max(1, Math.round(additionSqft / 200));
    const avgPartitionLf = 24;
    const partitionWallArea = avgPartitionLf * numRooms * additionPaintCeilingHeight * 2;
    const grossWallArea = exteriorWallArea + partitionWallArea;
    const openingDeduction = grossWallArea * 0.12;
    const netWallArea = grossWallArea - openingDeduction;
    const ceilingArea = additionPaintIncludeCeilings ? additionSqft : 0;
    const additionTotal = netWallArea + ceilingArea;
    const otherTotal = additionPaintScope === 'addition_and_other' && additionPaintOtherSqft > 0 ? additionPaintOtherSqft : 0;
    return Math.round(additionTotal + otherTotal);
  }, [additionSqft, additionPaintCeilingHeight, additionPaintNumRooms, additionPaintIncludeCeilings, additionPaintScope, additionPaintOtherSqft]);

  // Addition pricing engine
  const additionPricing = useMemo(() => {
    return { lineItems: [], total: 0 }; // Price Consult removed
    const gpPct = additionConfig ? Number(additionConfig!.markupPct) : 0.40;
    const gpDivisor = gpPct >= 1 ? 0.01 : 1 - gpPct;
    const commission = additionConfig ? Number(additionConfig!.repCommission) : 0;
    const lineItems: { id: number; name: string; sellPrice: number; cost: number }[] = [];
    const activeOpts = (additionOptions as any[]).filter((o: any) => o.isActive !== 0);
    for (const opt of activeOpts) {
      const hasTiers = Number(opt.hasTiers) === 1;
      if (hasTiers) {
        // Interior finish tier item — use tier cost if a tier is selected
        const tier = additionInteriorTiers.get(opt.slug);
        if (!tier) continue;
        const tierCost = tier === 'good' ? Number(opt.costGood ?? opt.cost)
          : tier === 'better' ? Number(opt.costBetter ?? opt.cost)
          : Number(opt.costBest ?? opt.cost);
        // For paint/drywall items, use calculated paint sqft; for flooring use additionSqft; for trim use qty
        let qty: number;
        if (opt.pricingType === 'per_sqft' && (opt.slug === 'a_int_paint' || opt.slug === 'a_int_drywall')) {
          qty = additionPaintSqft > 0 ? additionPaintSqft : additionSqft;
        } else if (opt.pricingType === 'per_sqft') {
          qty = additionSqft;
        } else {
          qty = additionItemQtys.get(opt.slug) ?? 0;
        }
        if (qty <= 0) continue;
        const cost = opt.pricingType === 'flat' ? tierCost : tierCost * qty;
        const sellPrice = cost / gpDivisor;
        const tierLabel = tier === 'good' ? 'Good' : tier === 'better' ? 'Better' : 'Best';
        lineItems.push({ id: opt.id, name: `${opt.label} [${tierLabel}]`, sellPrice, cost });
      } else {
        const qty = additionItemQtys.get(opt.slug) ?? 0;
        if (qty <= 0) continue;
        const unitCost = Number(opt.cost);
        let cost = 0;
        if (opt.pricingType === "flat") cost = unitCost;
        else if (opt.pricingType === "per_unit") cost = unitCost * qty;
        else if (opt.pricingType === "per_sqft") cost = unitCost * (additionSqft > 0 ? additionSqft : qty);
        else if (opt.pricingType === "per_lf") cost = unitCost * qty;
        const sellPrice = cost / gpDivisor;
        lineItems.push({ id: opt.id, name: opt.label, sellPrice, cost });
      }
    }
    // Windows & SGD pricing
    const windowsResult = calcWindowsPricing(windowsState, windowConfig as any);
    for (const li of windowsResult.lineItems) {
      lineItems.push({ id: 99700 + lineItems.length, name: `Windows — ${li.label}`, sellPrice: li.sellPrice, cost: li.cost });
    }
    const commissionSell = commission / gpDivisor;
    if (commission > 0) lineItems.push({ id: 99902, name: "Sales Commission", sellPrice: commissionSell, cost: commission });
    const total = lineItems.reduce((s, li) => s + li.sellPrice, 0);
    return { lineItems, total };
  }, [calcMode, additionMode, additionConfig, additionOptions, additionItemQtys, additionInteriorTiers, additionSqft, additionPaintSqft, windowsState, windowConfig]);

  // Basement pricing engine
  const basementPricing = useMemo(() => {
    return { lineItems: [], total: 0 }; // Price Consult removed
    const gpPct = basementConfig ? Number(basementConfig!.markupPct) : 0.40;
    const gpDivisor = gpPct >= 1 ? 0.01 : 1 - gpPct;
    const commission = basementConfig ? Number(basementConfig!.repCommission) : 0;
    const lineItems: { id: number; name: string; sellPrice: number; cost: number }[] = [];
    const activeOpts = (basementOptions as any[]).filter((o: any) => o.isActive !== 0);
    for (const opt of activeOpts) {
      const qty = basementItemQtys.get(opt.slug) ?? 0;
      if (qty <= 0) continue;
      const unitCost = Number(opt.cost);
      let cost = 0;
      if (opt.pricingType === "flat") cost = unitCost;
      else if (opt.pricingType === "per_unit") cost = unitCost * qty;
      else if (opt.pricingType === "per_sqft") cost = unitCost * (basementSqft > 0 ? basementSqft : qty);
      else if (opt.pricingType === "per_lf") cost = unitCost * qty;
      const sellPrice = cost / gpDivisor;
      lineItems.push({ id: opt.id, name: opt.label, sellPrice, cost });
    }
    // Windows & SGD pricing
    const windowsResult = calcWindowsPricing(windowsState, windowConfig as any);
    for (const li of windowsResult.lineItems) {
      lineItems.push({ id: 99700 + lineItems.length, name: `Windows — ${li.label}`, sellPrice: li.sellPrice, cost: li.cost });
    }
    const commissionSell = commission / gpDivisor;
    if (commission > 0) lineItems.push({ id: 99903, name: "Sales Commission", sellPrice: commissionSell, cost: commission });
    const total = lineItems.reduce((s, li) => s + li.sellPrice, 0);
    return { lineItems, total };
  }, [calcMode, basementMode, basementConfig, basementOptions, basementItemQtys, basementSqft, windowsState, windowConfig]);

  // Discount state
  const [discount1Applied, setDiscount1Applied] = useState(false);
  const [discount2Applied, setDiscount2Applied] = useState(false);

  // tRPC queries for questionnaire and free features
  const { data: questions = [] } = trpc.designPackage.getAllQuestions.useQuery();
  const { data: freeFeatures = [] } = trpc.designPackage.getAllFreeFeatures.useQuery();
  const { data: allSections = [] } = trpc.designPackage.getAllSections.useQuery();
  const activeQuestions = questions.filter((q: any) => q.isActive !== 0);
  // Filter parade stoppers: active AND applicable to the current project type
  const activeFreeFeatures = freeFeatures.filter((f: any) => {
    if (!f.isActive) return false;
    const types: string = f.projectTypes || "all";
    if (types === "all") return true;
    return types.split(",").map((t: string) => t.trim()).includes(projectType);
  });

  // Section visibility helper — defaults to true if no config loaded yet
  const isSectionEnabled = (sectionKey: string): boolean => {
    const typeSections = allSections.filter((s: any) => s.projectType === projectType);
    if (typeSections.length === 0) return true; // fallback: show all until loaded
    const sec = typeSections.find((s: any) => s.sectionKey === sectionKey);
    return sec ? sec.isEnabled !== 0 : true;
  };

  // Section label helper — returns admin-configured label or fallback
  const getSectionLabel = (sectionKey: string, fallback: string): string => {
    const typeSections = allSections.filter((s: any) => s.projectType === projectType);
    const sec = typeSections.find((s: any) => s.sectionKey === sectionKey);
    return sec?.sectionLabel || fallback;
  };

  // ── Price Consult Section Visibility ────────────────────────────────────────
  // Fetch section visibility configs for each price consult mode
  const { data: bathroomPCSections = [] } = trpc.designPackage.getPriceConsultSections.useQuery(
    { consultType: "bathroom" },
    { enabled: false }
  );
  const { data: kitchenPCSections = [] } = trpc.designPackage.getPriceConsultSections.useQuery(
    { consultType: "kitchen" },
    { enabled: false }
  );
  const { data: additionPCSections = [] } = trpc.designPackage.getPriceConsultSections.useQuery(
    { consultType: "addition" },
    { enabled: false }
  );
  const { data: basementPCSections = [] } = trpc.designPackage.getPriceConsultSections.useQuery(
    { consultType: "basement" },
    { enabled: false }
  );

  // Helper: check if a price consult section is visible (defaults to true while loading)
  const isPCSectionVisible = (consultType: string, sectionKey: string): boolean => {
    let sections: any[] = [];
    if (consultType === "bathroom") sections = bathroomPCSections;
    else if (consultType === "kitchen") sections = kitchenPCSections;
    else if (consultType === "addition") sections = additionPCSections;
    else if (consultType === "basement") sections = basementPCSections;
    if (sections.length === 0) return true; // show all while loading
    const sec = sections.find((s: any) => s.sectionKey === sectionKey);
    return sec ? Boolean(sec.isVisible) : true;
  };

  // Helper: get sorted index of a price consult section (for ordering)
  const getPCSectionOrder = (consultType: string, sectionKey: string): number => {
    let sections: any[] = [];
    if (consultType === "bathroom") sections = bathroomPCSections;
    else if (consultType === "kitchen") sections = kitchenPCSections;
    else if (consultType === "addition") sections = additionPCSections;
    else if (consultType === "basement") sections = basementPCSections;
    const sec = sections.find((s: any) => s.sectionKey === sectionKey);
    return sec?.sortOrder ?? 999;
  };

  // Switch calculator mode — resets state to defaults for the new mode

  // ── Multi-bathroom helpers ──────────────────────────────────────────────────
  const saveBathroomState = () => {
    const currentId = bathroomInstances[activeBathroomIdx]?.id;
    if (!currentId) return;
    const state = {
      bathroomSizeTierId, bathroomPlumbingIds: Array.from(bathroomPlumbingIds),
      bathroomElectricalId, bathroomHvacId, bathroomFinishTierId,
      bathroomAddonIds: Array.from(bathroomAddonIds), bathroomSqft, bathroomSqftInput,
      bathroomSizeMode, bathroomLengthInput, bathroomWidthInput,
      plumbingChecklistChecked: Object.fromEntries(Array.from(plumbingChecklistChecked.entries()).map(([k, v]) => [k, Array.from(v)])),
      hvacChecklistChecked: Object.fromEntries(Array.from(hvacChecklistChecked.entries()).map(([k, v]) => [k, Array.from(v)])),
      bathroomFixtureType, bathroomTubConfigId, showerCurbType, curblessJoistType,
      showerPanSizeKey, showerNicheIds: Array.from(showerNicheIds),
      nicheQuantities: Object.fromEntries(nicheQuantities), nicheLighting,
      showerBenchId, showerBenchLf, showerBenchDrawer, showerBenchTypeId,
      showerShelfIds: Array.from(showerShelfIds), showerGlassId, showerGlassWallLf,
      glassFrameType, glassHeight, glassDoorMount, stoneCasing,
      floorTileSizeId, floorTilePatternId, wallTileSizeId, wallTilePatternId,
      vanityWidthInches, vanityMaterial, vanityType, floatingCountertopLength, isFloatingVanity,
      accessorySlugs: Array.from(accessorySlugs),
      accessoryQtys: Object.fromEntries(accessoryQtys),
      electricalQtys: Object.fromEntries(electricalQtys),
      radiantHeatMode, radiantHeatCoverage, radiantHeatBrand, radiantHeatSqft, radiantPanelCapacity,
      paintingQtys: Object.fromEntries(paintingQtys), paintingScope, paintingCeilingHeight, paintingNeedsDrywall,
      tileOutsideShower, tileOutsideInputMode, tileOutsideSqft, tileOutsideLength, tileOutsideWidth,
      tileOutsideSizeId, tileOutsidePatternId,
      bathroomShowerSurroundId, bathroomVanityId, bathroomFlooringId,
      bathroomCountertopId, bathroomCountertopEdgeId, bathroomToiletId, bathroomWallFinishId,
    };
    const stateWithTotal = { ...state, _cachedTotal: bathroomPricing.total, _cachedCost: bathroomPricing.lineItems.reduce((s, li) => s + li.cost, 0) };
    setBathroomStates(prev => new Map(prev).set(currentId, stateWithTotal));
    return state;
  };

  const loadBathroomState = (id: number) => {
    const state = bathroomStates.get(id);
    if (!state) {
      // Reset to defaults for a new bathroom
      resetBathroomFields();
      return;
    }
    setBathroomSizeTierId(state.bathroomSizeTierId);
    setBathroomPlumbingIds(new Set(state.bathroomPlumbingIds));
    setBathroomElectricalId(state.bathroomElectricalId);
    setBathroomHvacId(state.bathroomHvacId);
    setBathroomFinishTierId(state.bathroomFinishTierId);
    setBathroomAddonIds(new Set(state.bathroomAddonIds));
    setBathroomSqft(state.bathroomSqft);
    setBathroomSqftInput(state.bathroomSqftInput);
    setBathroomSizeMode(state.bathroomSizeMode);
    setBathroomLengthInput(state.bathroomLengthInput);
    setBathroomWidthInput(state.bathroomWidthInput);
    setPlumbingChecklistChecked(new Map(Object.entries(state.plumbingChecklistChecked).map(([k, v]: [string, any]) => [k, new Set(v)])));
    setHvacChecklistChecked(new Map(Object.entries(state.hvacChecklistChecked).map(([k, v]: [string, any]) => [k, new Set(v)])));
    setBathroomFixtureType(state.bathroomFixtureType);
    setBathroomTubConfigId(state.bathroomTubConfigId);
    setShowerCurbType(state.showerCurbType);
    setCurblessJoistType(state.curblessJoistType);
    setShowerPanSizeKey(state.showerPanSizeKey);
    setShowerNicheIds(new Set(state.showerNicheIds));
    setNicheQuantities(new Map(Object.entries(state.nicheQuantities).map(([k, v]) => [Number(k), v as number])));
    setNicheLighting(state.nicheLighting);
    setShowerBenchId(state.showerBenchId);
    setShowerBenchLf(state.showerBenchLf);
    setShowerBenchDrawer(state.showerBenchDrawer);
    setShowerBenchTypeId(state.showerBenchTypeId);
    setShowerShelfIds(new Set(state.showerShelfIds));
    setShowerGlassId(state.showerGlassId);
    setShowerGlassWallLf(state.showerGlassWallLf);
    setGlassFrameType(state.glassFrameType);
    setGlassHeight(state.glassHeight);
    setGlassDoorMount(state.glassDoorMount);
    setStoneCasing(state.stoneCasing);
    setFloorTileSizeId(state.floorTileSizeId);
    setFloorTilePatternId(state.floorTilePatternId);
    setWallTileSizeId(state.wallTileSizeId);
    setWallTilePatternId(state.wallTilePatternId);
    setVanityWidthInches(state.vanityWidthInches);
    setVanityMaterial(state.vanityMaterial);
    setVanityType(state.vanityType);
    setFloatingCountertopLength(state.floatingCountertopLength);
    setIsFloatingVanity(state.isFloatingVanity);
    setAccessorySlugs(new Set(state.accessorySlugs));
    setAccessoryQtys(new Map(Object.entries(state.accessoryQtys)));
    setElectricalQtys(new Map(Object.entries(state.electricalQtys)));
    setRadiantHeatMode(state.radiantHeatMode);
    setRadiantHeatCoverage(state.radiantHeatCoverage);
    setRadiantHeatBrand(state.radiantHeatBrand);
    setRadiantHeatSqft(state.radiantHeatSqft);
    setRadiantPanelCapacity(state.radiantPanelCapacity);
    setPaintingQtys(new Map(Object.entries(state.paintingQtys)));
    setPaintingScope(state.paintingScope);
    setPaintingCeilingHeight(state.paintingCeilingHeight);
    setPaintingNeedsDrywall(state.paintingNeedsDrywall);
    setTileOutsideShower(state.tileOutsideShower);
    setTileOutsideInputMode(state.tileOutsideInputMode);
    setTileOutsideSqft(state.tileOutsideSqft);
    setTileOutsideLength(state.tileOutsideLength);
    setTileOutsideWidth(state.tileOutsideWidth);
    setTileOutsideSizeId(state.tileOutsideSizeId);
    setTileOutsidePatternId(state.tileOutsidePatternId);
    setBathroomShowerSurroundId(state.bathroomShowerSurroundId);
    setBathroomVanityId(state.bathroomVanityId);
    setBathroomFlooringId(state.bathroomFlooringId);
    setBathroomCountertopId(state.bathroomCountertopId);
    setBathroomCountertopEdgeId(state.bathroomCountertopEdgeId);
    setBathroomToiletId(state.bathroomToiletId);
    setBathroomWallFinishId(state.bathroomWallFinishId);
  };

  const resetBathroomFields = () => {
    setBathroomSizeTierId(null);
    setBathroomPlumbingIds(new Set());
    setBathroomElectricalId(null);
    setBathroomHvacId(null);
    setBathroomFinishTierId(null);
    setBathroomAddonIds(new Set());
    setBathroomSqft(0);
    setBathroomSqftInput("");
    setBathroomSizeMode("sqft");
    setBathroomLengthInput("");
    setBathroomWidthInput("");
    setPlumbingChecklistChecked(new Map());
    setHvacChecklistChecked(new Map());
    setBathroomFixtureType(null);
    setBathroomTubConfigId(null);
    setShowerCurbType(null);
    setCurblessJoistType(null);
    setShowerPanSizeKey(null);
    setShowerNicheIds(new Set());
    setNicheQuantities(new Map());
    setNicheLighting(false);
    setShowerBenchId(null);
    setShowerBenchLf(0);
    setShowerBenchDrawer(false);
    setShowerBenchTypeId(null);
    setShowerShelfIds(new Set());
    setShowerGlassId(null);
    setShowerGlassWallLf(0);
    setGlassFrameType(null);
    setGlassHeight(null);
    setGlassDoorMount(null);
    setStoneCasing(false);
    setFloorTileSizeId(null);
    setFloorTilePatternId(null);
    setWallTileSizeId(null);
    setWallTilePatternId(null);
    setVanityWidthInches(null);
    setVanityMaterial(null);
    setVanityType(null);
    setFloatingCountertopLength(0);
    setIsFloatingVanity(false);
    setAccessorySlugs(new Set());
    setAccessoryQtys(new Map());
    setElectricalQtys(new Map());
    setRadiantHeatMode('none');
    setRadiantHeatCoverage('full');
    setRadiantHeatBrand('schluter');
    setRadiantHeatSqft(0);
    setRadiantPanelCapacity(null);
    setPaintingQtys(new Map());
    setPaintingScope(null);
    setPaintingCeilingHeight(8);
    setPaintingNeedsDrywall(false);
    setTileOutsideShower(false);
    setTileOutsideInputMode('sqft');
    setTileOutsideSqft(0);
    setTileOutsideLength(0);
    setTileOutsideWidth(0);
    setTileOutsideSizeId(null);
    setTileOutsidePatternId(null);
    setBathroomShowerSurroundId(null);
    setBathroomVanityId(null);
    setBathroomFlooringId(null);
    setBathroomCountertopId(null);
    setBathroomCountertopEdgeId(null);
    setBathroomToiletId(null);
    setBathroomWallFinishId(null);
  };

  const switchBathroom = (newIdx: number) => {
    if (newIdx === activeBathroomIdx) return;
    // Save current bathroom state
    saveBathroomState();
    // Load new bathroom state
    setActiveBathroomIdx(newIdx);
    const targetId = bathroomInstances[newIdx]?.id;
    if (targetId) loadBathroomState(targetId);
  };

  const addBathroom = () => {
    saveBathroomState();
    const newId = Math.max(...bathroomInstances.map(b => b.id)) + 1;
    const newInstances = [...bathroomInstances, { id: newId, label: `Bathroom ${newId}` }];
    setBathroomInstances(newInstances);
    setActiveBathroomIdx(newInstances.length - 1);
    resetBathroomFields();
  };

  const removeBathroom = (idx: number) => {
    if (bathroomInstances.length <= 1) return;
    const removedId = bathroomInstances[idx].id;
    const newInstances = bathroomInstances.filter((_, i) => i !== idx);
    setBathroomInstances(newInstances);
    // Remove saved state
    setBathroomStates(prev => { const m = new Map(prev); m.delete(removedId); return m; });
    // Adjust active index
    const newIdx = Math.min(activeBathroomIdx, newInstances.length - 1);
    setActiveBathroomIdx(newIdx);
    const targetId = newInstances[newIdx]?.id;
    if (targetId) {
      const state = bathroomStates.get(targetId);
      if (state) loadBathroomState(targetId);
      else resetBathroomFields();
    }
  };

  // Compute combined pricing for all bathrooms
  const allBathroomsPricing = useMemo(() => {
    return { lineItems: [], total: 0 }; // Price Consult removed
    // Current bathroom pricing is already computed by bathroomPricing
    // For other bathrooms, we need their saved states' pricing
    // We'll compute a combined total: current active + all saved others
    let combinedLineItems: { id: number; name: string; sellPrice: number; cost: number }[] = [];
    let combinedTotal = 0;

    // Add current bathroom pricing
    combinedLineItems = bathroomPricing.lineItems.map(li => ({
      ...li,
      name: bathroomInstances.length > 1 ? `[${bathroomInstances[activeBathroomIdx]?.label}] ${li.name}` : li.name,
    }));
    combinedTotal = bathroomPricing.total;

    // For other saved bathrooms, we show their saved totals
    for (let i = 0; i < bathroomInstances.length; i++) {
      if (i === activeBathroomIdx) continue;
      const bId = bathroomInstances[i].id;
      const savedState = bathroomStates.get(bId);
      if (!savedState || !savedState._cachedTotal) continue;
      combinedLineItems.push({
        id: 90000 + bId,
        name: `${bathroomInstances[i].label} (saved)`,
        sellPrice: savedState._cachedTotal,
        cost: savedState._cachedCost || 0,
      });
      combinedTotal += savedState._cachedTotal;
    }

    return { lineItems: combinedLineItems, total: combinedTotal };
  }, [calcMode, bathroomMode, bathroomPricing, bathroomInstances, activeBathroomIdx, bathroomStates]);

  const handleModeSwitch = (mode: CalcMode) => {
    if (mode === calcMode) return;
    setCalcMode(mode);
    setProjectType(defaultProjectType(mode));
    setSqft(0);
    setSqftInput("");
    setSmallBathroomCount(0);
    setLargeBathroomCount(0);
    setKitchenCount(0);
    setExteriorCount(0);
    setItemOverrides({});
    setDiscount1Applied(false);
    setDiscount2Applied(false);
    setQuestionnaireAnswers({});
    setSelectedFreeFeatures(new Set());
    setFeasibilityEnabled(false);
    setEngineerLetterEnabled(false);
    setFloorPlanEnabled(false);
    setDynSessionId(null);
    // Reset bathroom state
    setBathroomSizeTierId(null);
    setBathroomPlumbingIds(new Set());
    setBathroomElectricalId(null);
    setBathroomHvacId(null);
    setBathroomFinishTierId(null);
    setBathroomAddonIds(new Set());
    setBathroomSqft(0);
    setBathroomSqftInput("");
    setBathroomShowerSurroundId(null);
    setBathroomVanityId(null);
    setBathroomFlooringId(null);
    setBathroomCountertopId(null);
    setBathroomCountertopEdgeId(null);
    setBathroomToiletId(null);
    setBathroomWallFinishId(null);
    setIsFloatingVanity(false);
    setAccessorySlugs(new Set());
    setAccessoryQtys(new Map());
    // Reset sub-modes and state
    setBathroomMode("design_package");
    setKitchenMode("design_package");
    setKitchenItemQtys(new Map());
    setKitchenSqft(0);
    setKitchenSqftInput("");
    setAdditionMode("design_package");
    setAdditionItemQtys(new Map());
    setAdditionSqft(0);
    setAdditionSqftInput("");
    setBasementMode("design_package");
    setBasementItemQtys(new Map());
    setBasementSqft(0);
    setBasementSqftInput("");
  };

  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEnhancifyModal, setShowEnhancifyModal] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [emailStreetAddress, setEmailStreetAddress] = useState("");
  const [emailCity, setEmailCity] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  // Handoff data from Initial Consult wizard
  const [consultHandoff, setConsultHandoff] = useState<ConsultHandoffData | null>(null);
  // Per-mode cached wizard state so values persist when switching tabs
  const [bathroomConsultCache, setBathroomConsultCache] = useState<CachedConsultState>(defaultCachedConsultState);
  const [kitchenConsultCache, setKitchenConsultCache] = useState<CachedConsultState>(defaultCachedConsultState);
  const [additionConsultCache, setAdditionConsultCache] = useState<CachedConsultState>(defaultCachedConsultState);
  const [basementConsultCache, setBasementConsultCache] = useState<CachedConsultState>(defaultCachedConsultState);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  const isSqftBased = SQFT_BASED_TYPES.includes(projectType);
  // Feasibility study is available in addition and basement modes
  const isFeasibilityMode = calcMode === "addition" || calcMode === "basement";

  const settings = config.settings || {};
  const companyName = settings.company_name || "Design Your Price";
  const companyLocation = settings.company_location || "Orem, Utah";
  const companyPhone = settings.company_phone || "Contact Us for a Quote";
  const dpAppointmentUrl = settings.design_package_appointment_url || "https://api.leadconnectorhq.com/widget/booking/WfipIjVQBk9mvkKjZhTO";

  // Admin-configured discounts
  const discounts = config.designPackageDiscounts || [];
  const discount1 = discounts.find((d) => d.discountType === "early_bird");
  const discount2 = discounts.find((d) => d.discountType === "same_day");
  const discount1Enabled = !!(discount1 && discount1.isActive === 1);
  const discount2Enabled = !!(discount2 && discount2.isActive === 1);
  // Same-day discount blocks email (in-person only)
  const discount2BlocksEmail = true;

  // Commission for this project type (hidden from customer, baked into total)
  const commissionAmount = useMemo(() => {
    const entry = (config.designPackageCommission || []).find(
      (c) => c.projectType === projectType
    );
    return entry ? entry.commissionAmount : 0;
  }, [config.designPackageCommission, projectType]);

  // Items applicable to this project type
  const applicableItems = useMemo(() => {
    return (config.designPackageItems || []).filter((item) => {
      if (!item.isActive) return false;
      const types = item.projectTypes.split(",").map((t) => t.trim());
      return types.includes("all") || types.includes(projectType);
    });
  }, [config.designPackageItems, projectType]);

  // Determine if an item is enabled (push-button toggle)
  const isItemEnabled = (item: (typeof applicableItems)[0]) => {
    // Explicit user override always wins
    if (item.id in itemOverrides) return itemOverrides[item.id];
    // For rendering items: the count input IS the selection signal.
    // If the user has set a count > 0, the item is implicitly enabled.
    if (item.pricingType === "rendering" && item.renderingType) {
      const countMap: Record<string, number> = {
        small_bathroom: smallBathroomCount,
        large_bathroom: largeBathroomCount,
        kitchen: kitchenCount,
        exterior: exteriorCount,
      };
      return (countMap[item.renderingType] ?? 0) > 0;
    }
    // All other items start OFF until the user explicitly toggles them on
    return false;
  };

  /**
   * Pricing engine — uses GROSS PROFIT % (not markup).
   * GP% = 50% means sell price = cost / (1 - 0.50) = cost * 2
   * The markupPct field in the DB is treated as gross profit %.
   */
  const { lineItems, servicesTotal, grandTotal, baseTotal, totalDesignHours, totalBaseHours } = useMemo(() => {
    const items = config.designPackageItems || [];
    const resultItems: LineItemResult[] = [];
    let servicesSum = 0;

    // First pass: collect rendering items that will be included (for volume discount)
    const renderingEntries: { item: typeof items[0]; count: number }[] = [];
    for (const item of items) {
      if (!item.isActive) continue;
      if (item.pricingType !== "rendering") continue;
      const types = item.projectTypes.split(",").map((t) => t.trim());
      if (!types.includes("all") && !types.includes(projectType)) continue;
      if (!isItemEnabled(item)) continue;
      const countMap: Record<string, number> = {
        small_bathroom: smallBathroomCount,
        large_bathroom: largeBathroomCount,
        kitchen: kitchenCount,
        exterior: exteriorCount,
      };
      const count = item.renderingType ? (countMap[item.renderingType] ?? 0) : 0;
      if (count > 0) {
        renderingEntries.push({ item, count });
      }
    }

    // Calculate total rendering spaces for volume discount
    // Each individual space gets a stacked 10% discount: 1st = full, 2nd = 90%, 3rd = 81%, etc.
    // We expand all spaces into a flat list sorted by base hours (descending) so the most expensive spaces get the smallest discount
    const expandedSpaces: { item: typeof items[0]; spaceIndex: number }[] = [];
    for (const entry of renderingEntries) {
      for (let i = 0; i < entry.count; i++) {
        expandedSpaces.push({ item: entry.item, spaceIndex: i });
      }
    }
    // Sort by designHours descending so most expensive spaces come first (get least discount)
    expandedSpaces.sort((a, b) => b.item.designHours - a.item.designHours);

    // Assign volume discount to each space
    const spaceDiscountedHours = new Map<number, number[]>(); // itemId -> array of discounted hours per space
    expandedSpaces.forEach((space, globalIdx) => {
      const discountFactor = Math.pow(0.9, globalIdx); // 0th=1.0, 1st=0.9, 2nd=0.81, ...
      const rawHours = space.item.designHours * discountFactor;
      const roundedHours = Math.ceil(rawHours); // round up
      if (!spaceDiscountedHours.has(space.item.id)) {
        spaceDiscountedHours.set(space.item.id, []);
      }
      spaceDiscountedHours.get(space.item.id)!.push(roundedHours);
    });

    for (const item of items) {
      if (!item.isActive) continue;
      const types = item.projectTypes.split(",").map((t) => t.trim());
      if (!types.includes("all") && !types.includes(projectType)) continue;
      if (!isItemEnabled(item)) continue;

      const gpPct = item.markupPct / 100; // e.g. 0.50 for 50% GP
      const gpDivisor = gpPct >= 1 ? 0.01 : 1 - gpPct; // guard against 100%

      let itemSellPrice = 0;
      let quantity = 1;
      let baseDesignHours: number | undefined;
      let discountedHours: number | undefined;

      if (item.pricingType === "sqft") {
        if (sqft <= 0) continue;
        const sellPerSqft = item.costPerSqft / gpDivisor;
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
        itemSellPrice = (item.flatCost / gpDivisor) * count;
        quantity = count;
        // Design hours with volume discount
        if (item.designHours > 0) {
          baseDesignHours = item.designHours;
          const hoursArr = spaceDiscountedHours.get(item.id) || [];
          discountedHours = hoursArr.reduce((sum, h) => sum + h, 0);
        }
      } else {
        // flat
        itemSellPrice = item.flatCost / gpDivisor;
        quantity = 1;
      }

      resultItems.push({
        id: item.id,
        name: item.name,
        sellPrice: itemSellPrice,
        quantity,
        pricingType: item.pricingType,
        baseDesignHours,
        discountedHours,
      });
      servicesSum += itemSellPrice;
    }

    // Basement mode: add floor plan drawing as a fixed line item
    // Cost: $0.50/sqft, GP: 50% → sell price = $0.50 / (1 - 0.50) = $1.00/sqft
    if (projectType === "basement" && sqft > 0 && floorPlanEnabled) {
      const FLOOR_PLAN_COST_PER_SQFT = 0.50;
      const FLOOR_PLAN_GP = 0.50; // 50% gross profit
      const floorPlanSellPerSqft = FLOOR_PLAN_COST_PER_SQFT / (1 - FLOOR_PLAN_GP);
      const floorPlanSellPrice = floorPlanSellPerSqft * sqft;
      resultItems.push({
        id: -1, // synthetic ID for floor plan
        name: "Floor Plan Drawing",
        sellPrice: floorPlanSellPrice,
        quantity: sqft,
        pricingType: "sqft",
      });
      servicesSum += floorPlanSellPrice;
    }

    // Commission is baked into the total but never shown as a line item.
    // Only apply when at least one service has been selected — prevents a non-zero
    // total from appearing on an empty order summary.
    const base = servicesSum > 0 ? servicesSum + commissionAmount : 0;

    // Total design hours across all rendering items
    const totalDesignHours = resultItems
      .filter(r => r.discountedHours !== undefined)
      .reduce((sum, r) => sum + (r.discountedHours ?? 0), 0);
    const totalBaseHours = resultItems
      .filter(r => r.baseDesignHours !== undefined)
      .reduce((sum, r) => sum + (r.baseDesignHours ?? 0) * r.quantity, 0);

    return { lineItems: resultItems, servicesTotal: servicesSum, grandTotal: base, baseTotal: base, totalDesignHours, totalBaseHours };
  }, [
    config.designPackageItems,
    projectType,
    sqft,
    smallBathroomCount,
    largeBathroomCount,
    kitchenCount,
    exteriorCount,
    itemOverrides,
    commissionAmount,
    floorPlanEnabled,
  ]);

  // Feasibility study adds to total (additions only)
  const feasibilityTotal = (isFeasibilityMode && feasibilityEnabled) ? FEASIBILITY_PRICE : 0;
  // Internal cost for feasibility (not shown to customer)
  const feasibilityInternalCost = feasibilityEnabled ? (FEASIBILITY_REP_COMMISSION + FEASIBILITY_DRAFTER_COST) : 0;

  // Engineer's Letter adds to total (basement and addition modes)
  const engineerLetterTotal = ((calcMode === "basement" || calcMode === "addition") && engineerLetterEnabled && ENGINEER_LETTER_ACTIVE) ? ENGINEER_LETTER_PRICE : 0;

  // Discount calculations (applied to design package services only, not feasibility study or engineer letter)
  // True only when the current project type is in Design Package mode (not Initial Consult)
  const activeSubMode =
    calcMode === "bathroom" ? bathroomMode
    : calcMode === "kitchen" ? kitchenMode
    : calcMode === "addition" ? additionMode
    : basementMode;
  const isDesignPackageMode = activeSubMode === "design_package";
  const discountBase = baseTotal;
  const discount1Value = discount1Applied && discount1Enabled && discount1
    ? discountBase * (discount1.discountPct / 100)
    : 0;
  const discount2Value = discount2Applied && discount2Enabled && discount2
    ? discountBase * (discount2.discountPct / 100)
    : 0;
  // Design package subtotal (before feasibility and engineer letter)
  const designPackageSubtotal = baseTotal - discount1Value - discount2Value;
  // finalTotal = what the customer sees in the summary panel
  // Includes questionnaire-derived pricing adjustments from calculation rules
  const finalTotal = designPackageSubtotal + feasibilityTotal + engineerLetterTotal + questionnaireAdjustment;
  // checkoutTotal = what is actually charged at checkout
  // When feasibility study is selected, only charge the feasibility fee;
  // the design package is shown as a rough estimate reference, not a checkout item.
  const checkoutTotal = feasibilityEnabled ? FEASIBILITY_PRICE : finalTotal;

  // Financing estimate (12.4% APR, 60 months)
  const monthlyPayment = (() => {
    if (finalTotal <= 0) return 0;
    const principal = finalTotal;
    const monthlyRate = 0.124 / 12;
    const n = 60;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
      (Math.pow(1 + monthlyRate, n) - 1);
  })();

  const sendEmailMutation = trpc.estimate.sendEmail.useMutation();
  const createJobtreadMutation = trpc.estimate.createJobtreadProject.useMutation();
  const sendQuestionnaireMutation = trpc.questionnaire.send.useMutation();
  const [jobtreadStatus, setJobtreadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [jobtreadError, setJobtreadError] = useState("");
  const [jobtreadJobId, setJobtreadJobId] = useState<string | null>(null);
  const [questionnaireStatus, setQuestionnaireStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [questionnaireError, setQuestionnaireError] = useState("");

  // Fetch the design_package contract template for Jobtread proposals
  // Map calculator projectType to contract template projectType key
  // addition -> "addition", full_home_remodel -> "full_home_remodel",
  // kitchen -> "kitchen", bathroom -> "bathroom"
  const contractProjectType = projectType; // values already match template keys
  const { data: dpContractTemplate } = trpc.contractTemplates.getByServiceType.useQuery(
    { serviceType: "design_package", projectType: contractProjectType },
    { staleTime: 60_000 }
  );

  const handleCreateJobtreadProject = async () => {
    if (!emailName.trim() || !emailAddress.trim()) return;
    setJobtreadStatus("loading");
    setJobtreadError("");
    try {
      const modeLabel = calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel";
      const projectLabel = ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType;
      const projectDescription = feasibilityEnabled
        ? `Feasibility Study — ${projectLabel}`
        : `Design Package — ${modeLabel} — ${projectLabel}${sqft > 0 ? ` (${sqft.toLocaleString()} sq ft)` : ""}`;

      const scopeLines = lineItems.filter(l => !(l.pricingType === "rendering" && l.quantity === 0)).map((l) => `• ${l.name}`).join("\n");
      const designHoursLine = totalDesignHours > 0
        ? `\n\nAllocated Design Hours: ${totalDesignHours} hour${totalDesignHours !== 1 ? "s" : ""}`
        : "";
      const scopeOfWork = feasibilityEnabled
        ? `Feasibility Study Fee: ${formatCurrency(FEASIBILITY_PRICE)}\n\nIncludes: ${FEASIBILITY_TAGS.join(", ")}`
        : `Included Services:\n${scopeLines}${designHoursLine}\n\nDesign Package Total: ${formatCurrency(finalTotal)}`;

      const result = await createJobtreadMutation.mutateAsync({
        customerName: emailName.trim(),
        customerEmail: emailAddress.trim(),
        customerPhone: emailPhone.trim() || undefined,
        customerAddress: emailStreetAddress.trim() || undefined,
        customerCity: emailCity.trim() || undefined,
        projectDescription,
        totalAmount: checkoutTotal,
        scopeOfWork,
        contractText: dpContractTemplate?.contractText || "",
      });

      if (result.success) {
        setJobtreadStatus("success");
        setJobtreadJobId(result.jobId || null);
      } else {
        setJobtreadStatus("error");
        setJobtreadError(result.error || "Failed to create Jobtread project.");
      }
    } catch (err: unknown) {
      setJobtreadStatus("error");
      setJobtreadError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const handleSendEmail = async () => {
    if (!emailName.trim() || !emailAddress.trim() || !emailPhone.trim()) return;
    setEmailStatus("sending");
    setEmailError("");
    try {
      const modeLabel = calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel";
      const result = await sendEmailMutation.mutateAsync({
        customerName: emailName.trim(),
        customerEmail: emailAddress.trim(),
        customerPhone: emailPhone.trim(),
        customerAddress: emailStreetAddress.trim(),
        customerCity: emailCity.trim(),
        // Use design package as collection/color placeholders
        collectionName: "Design Package",
        colorName: ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType,
        colorHex: "#8B6914",
        sqft: sqft || 0,
        laborName: "Design Package",
        deliveryName: "N/A",
        grandTotal: checkoutTotal,
        finalTotal: checkoutTotal,
        pricePerSqft: sqft > 0 ? checkoutTotal / sqft : 0,
        discountApplied: discount1Applied,
        discountName: discount1?.name || "Early Bird Discount",
        discountValue: discount1Value,
        discount2Applied: discount2Applied,
        discount2Name: discount2?.name || "Same Day Discount",
        discount2Value: discount2Value,
        showPricing: true,
        showItemized: false, // always show bulk total only for design package
        breakdown: {
          materialCost: 0,
          laborCost: 0,
          deliveryCost: 0,
          accessoryCost: 0,
          taxAmount: 0,
          demoRebuildSubtotal: 0,
          rainEscapeSubtotal: 0,
          steelJacketSubtotal: 0,
          demoRebuildDetails: [],
          rainEscapeDetails: [],
          steelJacketDetails: [],
          accessoryDetails: [],
          laborLineItemDetails: [],
          frostFootingCost: 0,
          frostFootingCornerCount: 0,
          frostFootingIntermediateCount: 0,
          frostFootingCornerDiameter: 0,
          frostFootingIntermediateDiameter: 0,
          builderMaterialDiscount: 0,
          builderLaborDiscount: 0,
          postWrapCost: 0,
          postWrapMaterialCost: 0,
          postWrapLaborCost: 0,
          postWrapOptionName: "",
          postWrapPostPieces: [],
          postWrapBeamPieces: [],
        },
        stairRuns: [],
        edgeLinearFt: 0,
        wasteFactor: 0,
        includePermit: false,
        contractText: "",
        estimateSnapshot: (() => {
          const projectLabel = ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType;
          const answeredQs = activeQuestions.filter((q: any) => {
            const ans = questionnaireAnswers[q.id];
            return ans !== undefined && ans !== null && ans !== "" && !(Array.isArray(ans) && ans.length === 0);
          });
          const questionnaireSection = answeredQs.length > 0
            ? `\n\n— Rough Pricing Inputs —\n${answeredQs.map((q: any) => {
                const ans = questionnaireAnswers[q.id];
                const display = Array.isArray(ans) ? ans.join(", ") : String(ans);
                return `• ${q.questionText}: ${display}`;
              }).join("\n")}`
            : "";
          const qaSection = dynBreakdown && dynBreakdown.breakdown.length > 0
            ? `\n\n— Questionnaire Adjustments —\n${dynBreakdown.breakdown.map((item: any) => `• ${item.questionText}: ${item.amount >= 0 ? '+' : ''}${formatCurrency(item.amount)}`).join("\n")}\nTotal Adjustment: ${questionnaireAdjustment >= 0 ? '+' : ''}${formatCurrency(questionnaireAdjustment)}`
            : "";
          if (feasibilityEnabled) {
            return `Feasibility Study Estimate — ${projectLabel}${sqft > 0 ? ` — ${sqft} sq ft` : ""}${questionnaireSection}${qaSection}\n\nFeasibility Study Fee: ${formatCurrency(FEASIBILITY_PRICE)}\n\n— Rough Estimate (for reference only) —\nIncluded Services:\n${lineItems.filter(l => !(l.pricingType === "rendering" && l.quantity === 0)).map((l) => `• ${l.name}`).join("\n")}\n\nEstimated Design Package Total (pending feasibility): ${formatCurrency(designPackageSubtotal)}`;
          }
          return `Design Package Estimate — ${modeLabel} — ${projectLabel}${sqft > 0 ? ` — ${sqft} sq ft` : ""}${questionnaireSection}${qaSection}\n\nIncluded Services:\n${lineItems.filter(l => !(l.pricingType === "rendering" && l.quantity === 0)).map((l) => `• ${l.name}`).join("\n")}\n\nDesign Package Total: ${formatCurrency(finalTotal)}`;
        })(),
        origin: window.location.origin,
        assignedUserId: calUser ? (calUser as any).id : undefined,
        repName: calUser ? calUser.name : undefined,
        repEmail: calUser ? calUser.email : undefined,
        repPhone: calUser ? (calUser as any).phone ?? undefined : undefined,
        repTitle: calUser ? (calUser as any).title ?? undefined : undefined,
        includeFinancing: monthlyPayment > 0,
        monthlyPayment: monthlyPayment > 0 ? monthlyPayment : undefined,
        questionnaireSessionId: dynSessionId || undefined,
      });
      if (result.success) {
        setEmailStatus("success");
      } else {
        setEmailStatus("error");
        setEmailError(result.error || "Failed to send email.");
      }
    } catch (err: unknown) {
      setEmailStatus("error");
      setEmailError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const handleSendQuestionnaire = async () => {
    if (!emailName.trim() || !emailAddress.trim() || !emailPhone.trim()) return;
    setQuestionnaireStatus("loading");
    setQuestionnaireError("");
    try {
      const result = await sendQuestionnaireMutation.mutateAsync({
        customerName: emailName.trim(),
        customerEmail: emailAddress.trim(),
        customerPhone: emailPhone.trim(),
        customerAddress: emailStreetAddress.trim() || undefined,
        origin: window.location.origin,
      });
      if (result.success) {
        setQuestionnaireStatus("success");
      } else {
        setQuestionnaireStatus("error");
        setQuestionnaireError("Failed to send questionnaire.");
      }
    } catch (err: unknown) {
      setQuestionnaireStatus("error");
      setQuestionnaireError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailStatus("idle");
    setEmailError("");
    setEmailName("");
    setEmailPhone("");
    setEmailStreetAddress("");
    setEmailCity("");
    setJobtreadStatus("idle");
    setJobtreadError("");
    setJobtreadJobId(null);
    setQuestionnaireStatus("idle");
    setQuestionnaireError("");
    setEmailAddress("");
  };

  const handleReset = () => {
    setProjectType(defaultProjectType(calcMode));
    setSqft(0);
    setSqftInput("");
    setLargeBathroomCount(0);
    setSmallBathroomCount(0);
    setKitchenCount(0);
    setExteriorCount(0);
    setItemOverrides({});
    setDiscount1Applied(false);
    setDiscount2Applied(false);
    setQuestionnaireAnswers({});
    setSelectedFreeFeatures(new Set());
    setFeasibilityEnabled(false);
    setEngineerLetterEnabled(false);
    setFloorPlanEnabled(false);
    setDynSessionId(null);
    setLookupPhone("");
    setLookupPhoneInput("");
    setLookupStatus("idle");
    // Reset sub-modes and state
    setBathroomMode("design_package");
    setKitchenMode("design_package");
    setKitchenItemQtys(new Map());
    setKitchenSqft(0);
    setKitchenSqftInput("");
    setAdditionMode("design_package");
    setAdditionItemQtys(new Map());
    setAdditionSqft(0);
    setAdditionSqftInput("");
    setBasementMode("design_package");
    setBasementItemQtys(new Map());
    setBasementSqft(0);
    setBasementSqftInput("");
    // Reset cabinet pricing
    setCabinetState(defaultCabinetState);
    setWindowsState(defaultWindowsState);
  };

  // Project types available for the current mode
  // currentProjectTypes is only used for the sub-picker (remodel mode had two choices).
  // With bathroom/kitchen as separate modes, this is kept for reference only.
  const currentProjectTypes = calcMode === "basement" ? BASEMENT_PROJECT_TYPES : ADDITION_PROJECT_TYPES;

  // Step counter helper — increments only for visible steps
  let stepCounter = 0;
  const nextStep = () => { stepCounter++; return stepCounter; };

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Design package hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-charcoal/30" />
        </div>
        <div className="relative container py-8 sm:py-12 lg:py-16">
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-12"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                title="Back to Decking Calculator"
                className="group relative shrink-0"
              >
                <img
                  src={LOGO_URL}
                  alt={companyName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-lg transition-transform group-hover:scale-105 cursor-pointer"
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-warm-cream/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  ← Decking Calc
                </span>
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight truncate">
                  {companyName}
                </h1>
                <p className="text-warm-cream/80 text-sm sm:text-base font-body mt-1">
                  Design Package Estimator
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-warm-cream/90 text-sm font-body">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-canyon-light" />
                {companyLocation}
              </span>
              <span className="hidden sm:inline text-warm-cream/40">|</span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-canyon-light" />
                {companyPhone}
              </span>
              <span className="hidden sm:inline text-warm-cream/40">|</span>
              <a
                href="/admin"
                className="flex items-center gap-1.5 text-canyon-light hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                Admin
              </a>
            </div>
          </motion.div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-2xl"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
              Design Package
              <br />
              <span className="text-canyon-light">Cost Estimator</span>
            </h2>
            <p className="text-warm-cream/80 text-base sm:text-lg font-body leading-relaxed max-w-xl">
              Get an instant estimate for your design package. Includes architectural &amp; structural engineering, 3D renderings, and all required design documents for additions and remodels.
            </p>
          </motion.div>

          {/* Hero CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-3 mt-6 sm:mt-8"
          >
            <button
              onClick={() => setShowBrochureModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-sm text-white text-sm font-body font-medium border border-white/25 hover:bg-white/25 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-canyon-light" />
              Get a Brochure
            </button>
            <button
              onClick={() => setShowAppointmentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/15 backdrop-blur-sm text-white text-sm font-body font-medium border border-white/25 hover:bg-white/25 transition-colors"
            >
              <Calendar className="w-4 h-4 text-canyon-light" />
              Book an Appointment
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-canyon text-white text-sm font-body font-semibold border border-canyon hover:bg-canyon/90 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Order Now
            </button>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3 mt-4"
          >
            {["Additions", "Kitchen Remodels", "Bathroom Remodels", "3D Renderings"].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-sm bg-white/10 backdrop-blur-sm text-warm-cream text-xs sm:text-sm font-body font-medium border border-white/15"
              >
                {badge}
              </span>
            ))}
          </motion.div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 sm:h-8 lg:h-10">
            <path d="M0 40V20C240 0 480 10 720 20C960 30 1200 0 1440 20V40H0Z" className="fill-warm-cream" />
          </svg>
        </div>
      </header>

      {/* Calculator body */}
      <div className="container py-8 lg:py-12">

        {/* ─── Mode Toggle ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 bg-white rounded-xl shadow-sm border border-border/60 overflow-hidden max-w-3xl mx-auto">
            {/* Bathroom Remodel */}
            <button
              onClick={() => handleModeSwitch("bathroom")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-body font-semibold transition-all ${
                calcMode === "bathroom"
                  ? "bg-canyon text-white shadow-inner"
                  : "bg-white text-stone-dark hover:bg-sandstone/40"
              }`}
            >
              <Home className={`w-4 h-4 shrink-0 ${calcMode === "bathroom" ? "text-white" : "text-canyon"}`} />
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">Bathroom</div>
                <div className={`text-xs font-normal leading-tight mt-0.5 ${calcMode === "bathroom" ? "text-white/75" : "text-muted-foreground"}`}>
                  Flat-rate package
                </div>
              </div>
            </button>

            <div className="w-px self-stretch bg-border/40" />

            {/* Kitchen Remodel */}
            <button
              onClick={() => handleModeSwitch("kitchen")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-body font-semibold transition-all ${
                calcMode === "kitchen"
                  ? "bg-canyon text-white shadow-inner"
                  : "bg-white text-stone-dark hover:bg-sandstone/40"
              }`}
            >
              <Home className={`w-4 h-4 shrink-0 ${calcMode === "kitchen" ? "text-white" : "text-canyon"}`} />
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">Kitchen</div>
                <div className={`text-xs font-normal leading-tight mt-0.5 ${calcMode === "kitchen" ? "text-white/75" : "text-muted-foreground"}`}>
                  Flat-rate package
                </div>
              </div>
            </button>

            <div className="w-px self-stretch bg-border/40" />

            {/* Addition */}
            <button
              onClick={() => handleModeSwitch("addition")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-body font-semibold transition-all ${
                calcMode === "addition"
                  ? "bg-canyon text-white shadow-inner"
                  : "bg-white text-stone-dark hover:bg-sandstone/40"
              }`}
            >
              <Plus className={`w-4 h-4 shrink-0 ${calcMode === "addition" ? "text-white" : "text-canyon"}`} />
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">Addition</div>
                <div className={`text-xs font-normal leading-tight mt-0.5 ${calcMode === "addition" ? "text-white/75" : "text-muted-foreground"}`}>
                  Sqft + feasibility
                </div>
              </div>
            </button>

            <div className="w-px self-stretch bg-border/40" />

            {/* Basement */}
            <button
              onClick={() => handleModeSwitch("basement")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-body font-semibold transition-all ${
                calcMode === "basement"
                  ? "bg-canyon text-white shadow-inner"
                  : "bg-white text-stone-dark hover:bg-sandstone/40"
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 ${calcMode === "basement" ? "text-white" : "text-canyon"}`} />
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight">Basement</div>
                <div className={`text-xs font-normal leading-tight mt-0.5 ${calcMode === "basement" ? "text-white/75" : "text-muted-foreground"}`}>
                  Sqft + feasibility
                </div>
              </div>
            </button>
          </div>

          {/* Mode description pill */}
          <div className="flex justify-center mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sandstone/60 border border-border/40 text-xs font-body text-stone-dark">
              {calcMode === "bathroom" ? (
                <>
                  <Home className="w-3 h-3 text-canyon" />
                  Estimating a bathroom remodel design package
                </>
              ) : calcMode === "kitchen" ? (
                <>
                  <Home className="w-3 h-3 text-canyon" />
                  Estimating a kitchen remodel design package
                </>
              ) : calcMode === "basement" ? (
                <>
                  <Layers className="w-3 h-3 text-canyon" />
                  Estimating a basement finish design package with optional feasibility study
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 text-canyon" />
                  Estimating an addition design package with optional feasibility study
                </>
              )}
            </span>
          </div>
        </motion.div>

        {/* ─── Sub-mode toggle: Design Package / Initial Consult ──────────────────────── */}
        {(calcMode === "bathroom" || calcMode === "kitchen" || calcMode === "addition" || calcMode === "basement") && (
          <div className="flex justify-center mt-4 mb-2">
            <div className="inline-flex rounded-full border border-border/60 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => {
                  if (calcMode === "bathroom") setBathroomMode("initial_consult");
                  else if (calcMode === "kitchen") setKitchenMode("initial_consult");
                  else if (calcMode === "addition") setAdditionMode("initial_consult");
                  else if (calcMode === "basement") setBasementMode("initial_consult");
                }}
                className={`px-5 py-2 text-sm font-body font-semibold transition-all ${
                  (calcMode === "bathroom" ? bathroomMode : calcMode === "kitchen" ? kitchenMode : calcMode === "addition" ? additionMode : basementMode) === "initial_consult"
                    ? "bg-canyon text-white"
                    : "bg-white text-stone-dark hover:bg-sandstone/40"
                }`}
              >
                Initial Consult
              </button>
              <div className="w-px self-stretch bg-border/40" />
              <button
                onClick={() => {
                  if (calcMode === "bathroom") setBathroomMode("design_package");
                  else if (calcMode === "kitchen") setKitchenMode("design_package");
                  else if (calcMode === "addition") setAdditionMode("design_package");
                  else if (calcMode === "basement") setBasementMode("design_package");
                }}
                className={`px-5 py-2 text-sm font-body font-semibold transition-all ${
                  (calcMode === "bathroom" ? bathroomMode : calcMode === "kitchen" ? kitchenMode : calcMode === "addition" ? additionMode : basementMode) === "design_package"
                    ? "bg-canyon text-white"
                    : "bg-white text-stone-dark hover:bg-sandstone/40"
                }`}
              >
                Design Package
              </button>
            </div>
          </div>
        )}
        {/* ─── Addition sub-mode toggle (legacy - replaced by unified toggle above) ─── */}
        {false && calcMode === "addition" && (
          <div className="flex justify-center mt-4 mb-2">
            <div className="inline-flex rounded-full border border-border/60 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setAdditionMode("design_package")}
                className={`px-5 py-2 text-sm font-body font-semibold transition-all ${
                  additionMode === "design_package"
                    ? "bg-canyon text-white"
                    : "bg-white text-stone-dark hover:bg-sandstone/40"
                }`}
              >
                Design Package
              </button>
              <div className="w-px self-stretch bg-border/40" />
              <button
                onClick={() => setAdditionMode("initial_consult")}
                className={`px-5 py-2 text-sm font-body font-semibold transition-all ${
                  additionMode === "initial_consult"
                    ? "bg-canyon text-white"
                    : "bg-white text-stone-dark hover:bg-sandstone/40"
                }`}
              >
                Initial Consult
              </button>
            </div>
          </div>
        )}

        {/* ─── Multi-bathroom tabs (Price Consult only) ──────────────────── */}

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 xl:gap-12">
          {/* Left: Steps */}
          <div className="space-y-6 lg:space-y-8">

            {/* Initial Consult Summary — shown whenever wizard data exists (both modes) */}
            {consultHandoff && (
              <ConsultSummaryCard data={consultHandoff} />
            )}

            {/* Step: Rough Pricing Questionnaire (shown only if questions exist) — collapsible */}
            {isDesignPackageMode && activeQuestions.length > 0 && (() => { const s = nextStep();
              // Count answered questions for the collapsed summary badge
              const answeredCount = activeQuestions.filter((q: any) => {
                const a = questionnaireAnswers[q.id];
                return a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && a.length === 0);
              }).length;
              return (
              <CollapsibleSectionSlab
                step={s}
                title="Rough Pricing Questionnaire"
                delay={0}
                isOpen={questionnaireOpen}
                onToggle={() => setQuestionnaireOpen(o => !o)}
                badge={answeredCount > 0 ? `${answeredCount} / ${activeQuestions.length} answered` : undefined}
              >
                <div className="space-y-5">
                  <p className="text-sm font-body text-stone-dark">
                    Answer a few quick questions to help us understand your project. This helps us give you the most accurate estimate.
                  </p>

                  {/* Phone lookup — pull pre-submitted questionnaire answers */}
                  <div className="rounded-lg border border-border/60 bg-sandstone/20 p-4 space-y-3">
                    <p className="text-xs font-body font-semibold text-charcoal uppercase tracking-wide">Load Homeowner's Pre-Submitted Answers</p>
                    <p className="text-xs text-muted-foreground">Enter the homeowner's phone number to load answers they submitted before this meeting.</p>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        value={lookupPhoneInput}
                        onChange={e => setLookupPhoneInput(e.target.value)}
                        placeholder="(801) 555-0100"
                        className="flex-1 text-sm"
                        onKeyDown={e => {
                          if (e.key === "Enter" && lookupPhoneInput.trim().length >= 7) {
                            setLookupPhone(lookupPhoneInput.trim());
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={lookupPhoneInput.trim().length < 7 || lookupLoading}
                        onClick={() => {
                          setLookupPhone(lookupPhoneInput.trim());
                          setLookupStatus("idle");
                        }}
                      >
                        {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
                      </Button>
                    </div>
                    {lookupPhone.length >= 7 && !lookupLoading && lookupResult && (
                      <div className="space-y-2">
                        {lookupResult.submission ? (
                          <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                              <p className="text-xs font-semibold text-green-800">Found: {lookupResult.submission.customerName}</p>
                            </div>
                            <p className="text-xs text-green-700">
                              Submitted {new Date(lookupResult.submission.createdAt).toLocaleDateString()}.
                              {lookupResult.rooms.length > 0 && ` Rooms: ${lookupResult.rooms.map((r: any) => r.roomKey.replace(/_/g, " ")).join(", ")}.`}
                              {lookupResult.trades.length > 0 && ` Trades: ${lookupResult.trades.map((t: any) => t.tradeKey.replace(/_/g, " ")).join(", ")}.`}
                            </p>
                            <Button
                              size="sm"
                              className="w-full bg-green-700 hover:bg-green-800 text-white text-xs"
                              onClick={() => {
                                // Pre-fill questionnaire answers from the submission's mode
                                // The homeowner's questionnaire mode and trade selections are surfaced as notes
                                setLookupStatus("found");
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Answers Loaded
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-800">No questionnaire found for this phone number.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dynamic questionnaire session lookup */}
                    {lookupPhone.length >= 7 && !dynLookupLoading && dynSessionLookup && (
                      <div className="space-y-2 mt-2">
                        {dynSessionLookup.session ? (
                          <div className={`rounded-md border p-3 space-y-2 ${
                            dynSessionId === dynSessionLookup.session.id
                              ? "bg-blue-50 border-blue-200"
                              : "bg-indigo-50 border-indigo-200"
                          }`}>
                            <div className="flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                              <p className="text-xs font-semibold text-indigo-800">
                                Design Questionnaire Found: {dynSessionLookup.session.customerName}
                              </p>
                            </div>
                            <p className="text-xs text-indigo-700">
                              Completed {new Date(dynSessionLookup.session.completedAt || dynSessionLookup.session.createdAt).toLocaleDateString()}.
                              {dynSessionLookup.session.completedAt && ` Questionnaire completed.`}
                            </p>
                            {dynSessionId !== dynSessionLookup.session.id ? (
                              <Button
                                size="sm"
                                className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-xs"
                                onClick={() => setDynSessionId(dynSessionLookup.session!.id)}
                              >
                                <Zap className="w-3 h-3 mr-1" /> Apply Pricing Adjustments
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-blue-600" />
                                  <p className="text-xs font-semibold text-blue-800">Pricing adjustments applied</p>
                                </div>
                                {dynBreakdown && dynBreakdown.breakdown.length > 0 && (
                                  <div className="rounded-md bg-white/60 p-2 space-y-1">
                                    {dynBreakdown.breakdown.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-[11px]">
                                        <span className="text-stone-600 truncate mr-2">
                                          {item.questionText}: <span className="font-medium text-stone-700">{item.ruleName}</span>
                                        </span>
                                        <span className={`font-mono font-semibold shrink-0 ${item.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                          {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="border-t border-indigo-200 pt-1 mt-1 flex justify-between text-xs font-semibold">
                                      <span className="text-indigo-800">Total Questionnaire Adjustment</span>
                                      <span className={`font-mono ${dynBreakdown.totalAdjustment >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                        {dynBreakdown.totalAdjustment >= 0 ? '+' : ''}{formatCurrency(dynBreakdown.totalAdjustment)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                  onClick={() => setDynSessionId(null)}
                                >
                                  Remove Adjustments
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {activeQuestions.map((q: any) => {
                    const opts: Array<{ label: string; value: string; photoUrl?: string; description?: string }> = (() => {
                      try { return JSON.parse(q.options || "[]"); } catch { return []; }
                    })();
                    const answer = questionnaireAnswers[q.id];
                    return (
                      <div key={q.id} className="space-y-2">
                        <p className="text-sm font-body font-semibold text-charcoal">{q.question}</p>
                        {(q.questionType === "single_choice" || q.questionType === "multi_choice") && opts.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {opts.map((opt) => {
                              const isSelected = q.questionType === "multi_choice"
                                ? Array.isArray(answer) && answer.includes(opt.value)
                                : answer === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    if (q.questionType === "multi_choice") {
                                      const cur = Array.isArray(answer) ? answer : [];
                                      setQuestionnaireAnswers(prev => ({
                                        ...prev,
                                        [q.id]: isSelected ? cur.filter((v: string) => v !== opt.value) : [...cur, opt.value],
                                      }));
                                    } else {
                                      setQuestionnaireAnswers(prev => ({ ...prev, [q.id]: opt.value }));
                                    }
                                  }}
                                  className={`relative flex flex-col items-start gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                                    isSelected
                                      ? "border-canyon bg-canyon/10 text-charcoal"
                                      : "border-border/60 bg-white text-stone-dark hover:border-canyon/40"
                                  }`}
                                >
                                  {opt.photoUrl && (
                                    <img src={opt.photoUrl} alt={opt.label} className="w-full h-20 object-cover rounded-md" />
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-xs font-body font-medium leading-tight">{opt.label}</span>
                                    <InfoTooltip description={opt.description} />
                                  </div>
                                  {isSelected && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-canyon rounded-full flex items-center justify-center">
                                      <svg viewBox="0 0 8 8" className="w-2.5 h-2.5"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : q.questionType === "number" ? (
                          <Input
                            type="number"
                            min={0}
                            value={typeof answer === "string" ? answer : ""}
                            onChange={e => setQuestionnaireAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Enter a number"
                            className="max-w-xs text-base"
                          />
                        ) : (
                          <textarea
                            value={typeof answer === "string" ? answer : ""}
                            onChange={e => setQuestionnaireAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-canyon/40"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSectionSlab>
            ); })()}

            {/* Project Type sub-step removed: bathroom/kitchen are now separate top-level modes */}

            {/* Step: Square Footage — addition and basement modes */}
            {isDesignPackageMode && (calcMode === "addition" || calcMode === "basement") && isSqftBased && isSectionEnabled("sqft") && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title={getSectionLabel("sqft", "Project Square Footage")} delay={0.05}>
                <div className="space-y-3">
                  {consultHandoff && consultHandoff.additionSqft > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">From Initial Consult:</span>
                      <span>Pre-filled with {consultHandoff.additionSqft.toLocaleString()} sq ft from the Stay vs. Move analysis.</span>
                    </div>
                  )}
                  <p className="text-sm font-body text-stone-dark">
                    Enter the total square footage of the {calcMode === "basement" ? "basement" : "addition"} area. This is used to calculate architectural and structural engineering fees.
                  </p>
                  <div className="flex items-center gap-3 max-w-xs">
                    <Input
                      type="number"
                      min={0}
                      value={sqftInput}
                      onChange={(e) => {
                        setSqftInput(e.target.value);
                        setSqft(parseFloat(e.target.value) || 0);
                      }}
                      placeholder="e.g. 500"
                      className="text-base"
                    />
                    <span className="text-sm font-body text-muted-foreground shrink-0">sq ft</span>
                  </div>
                  {sqft > 0 && (
                    <p className="text-xs font-body text-muted-foreground">
                      {sqft.toLocaleString()} sq ft entered
                    </p>
                  )}
                </div>
              </SectionSlab>
            ); })()}

            {/* Step: 3D Renderings */}
            {isDesignPackageMode && isSectionEnabled("renderings") && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title={getSectionLabel("renderings", "3D Renderings")} delay={0.1}>
                <div className="space-y-4">
                  <p className="text-sm font-body text-stone-dark">
                    Select the number of 3D renderings needed for each area type. Set to 0 to exclude.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bathroom mode: only bathroom renderings */}
                    {calcMode === "bathroom" ? (
                      <>
                        <CountInput
                          label="Small Bathroom"
                          value={smallBathroomCount}
                          onChange={setSmallBathroomCount}
                        />
                        <CountInput
                          label="Large Bathroom"
                          value={largeBathroomCount}
                          onChange={setLargeBathroomCount}
                        />
                      </>
                    ) : calcMode === "kitchen" ? (
                      /* Kitchen mode: only kitchen renderings */
                      <>
                        <CountInput
                          label="Kitchen"
                          value={kitchenCount}
                          onChange={setKitchenCount}
                        />
                      </>
                    ) : calcMode === "basement" ? (
                      /* Basement mode: basement-specific rendering types */
                      <>
                        <CountInput
                          label="Small Area / Bathroom"
                          value={smallBathroomCount}
                          onChange={setSmallBathroomCount}
                        />
                        <CountInput
                          label="Large Area / Bathroom"
                          value={largeBathroomCount}
                          onChange={setLargeBathroomCount}
                        />
                        <CountInput
                          label="Kitchen / Bar"
                          value={kitchenCount}
                          onChange={setKitchenCount}
                        />
                      </>
                    ) : (
                      /* Addition mode: show all rendering types */
                      <>
                        <CountInput
                          label="Small Bathroom / Area"
                          value={smallBathroomCount}
                          onChange={setSmallBathroomCount}
                        />
                        <CountInput
                          label="Large Bathroom / Area"
                          value={largeBathroomCount}
                          onChange={setLargeBathroomCount}
                        />
                        <CountInput
                          label="Kitchen"
                          value={kitchenCount}
                          onChange={setKitchenCount}
                        />
                        <CountInput
                          label="Exterior"
                          value={exteriorCount}
                          onChange={setExteriorCount}
                        />
                      </>
                    )}
                  </div>
                </div>
              </SectionSlab>
            ); })()}

            {/* Step: Included Services — push buttons */}
            {isDesignPackageMode && applicableItems.length > 0 && isSectionEnabled("included_services") && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title={getSectionLabel("included_services", "Included Services")} delay={0.15}>
                <div className="space-y-3">
                  <p className="text-sm font-body text-stone-dark">
                    The following services are included in your design package. Click any service to toggle it on or off.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {applicableItems.filter((item) => {
                      // Hide rendering items whose count is 0 in Section 3
                      if (item.pricingType === "rendering" && item.renderingType) {
                        const cMap: Record<string, number> = {
                          small_bathroom: smallBathroomCount,
                          large_bathroom: largeBathroomCount,
                          kitchen: kitchenCount,
                          exterior: exteriorCount,
                        };
                        return (cMap[item.renderingType] ?? 0) > 0;
                      }
                      return true;
                    }).map((item) => {
                      const enabled = isItemEnabled(item);
                      // Compute sell price for display
                      const gpPct = item.markupPct / 100;
                      const gpDiv = gpPct >= 1 ? 0.01 : 1 - gpPct;
                      let displayPrice: string | null = null;
                      let displayQty: string | null = null;
                      if (item.pricingType === "sqft" && sqft > 0) {
                        const sellPerSqft = item.costPerSqft / gpDiv;
                        displayPrice = formatCurrency(sellPerSqft * sqft);
                        displayQty = `${sqft.toLocaleString()} sq ft`;
                      } else if (item.pricingType === "rendering") {
                        const cMap: Record<string, number> = {
                          small_bathroom: smallBathroomCount,
                          large_bathroom: largeBathroomCount,
                          kitchen: kitchenCount,
                          exterior: exteriorCount,
                        };
                        const cnt = item.renderingType ? (cMap[item.renderingType] ?? 0) : 0;
                        if (cnt > 0) {
                          displayPrice = formatCurrency((item.flatCost / gpDiv) * cnt);
                          if (cnt > 1) displayQty = `Qty ${cnt}`;
                        }
                      } else if (item.pricingType === "flat") {
                        displayPrice = formatCurrency(item.flatCost / gpDiv);
                      }
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            const nowEnabled = !enabled;
                            if (item.pricingType === "rendering" && item.renderingType) {
                              // For rendering items, count IS the selection signal.
                              // Toggling off: zero the count (hides the item from the list naturally).
                              // Toggling on: restore count to 1 so the item re-appears.
                              // No itemOverride needed — clear any stale override.
                              setItemOverrides((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                              if (!nowEnabled) {
                                if (item.renderingType === "small_bathroom") setSmallBathroomCount(0);
                                else if (item.renderingType === "large_bathroom") setLargeBathroomCount(0);
                                else if (item.renderingType === "kitchen") setKitchenCount(0);
                                else if (item.renderingType === "exterior") setExteriorCount(0);
                              } else {
                                if (item.renderingType === "small_bathroom") setSmallBathroomCount((c) => c > 0 ? c : 1);
                                else if (item.renderingType === "large_bathroom") setLargeBathroomCount((c) => c > 0 ? c : 1);
                                else if (item.renderingType === "kitchen") setKitchenCount((c) => c > 0 ? c : 1);
                                else if (item.renderingType === "exterior") setExteriorCount((c) => c > 0 ? c : 1);
                              }
                            } else {
                              // Non-rendering items: use itemOverrides as before
                              setItemOverrides((prev) => ({ ...prev, [item.id]: nowEnabled }));
                            }
                          }}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                            enabled
                              ? "border-canyon bg-canyon/8 text-charcoal"
                              : "border-border/40 bg-white/60 text-muted-foreground opacity-60"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors mt-0.5 ${
                              enabled ? "border-canyon bg-canyon" : "border-border/60 bg-white"
                            }`}
                          >
                            {enabled && (
                              <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 fill-white">
                                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-sm font-body font-medium leading-tight">{item.name}</p>
                                <InfoTooltip description={item.description} />
                              </div>
                              {/* Per-service prices hidden from customer view */}
                            </div>
                            {(item as any).subtitle && (
                              <p className="text-xs font-body text-muted-foreground mt-0.5 leading-tight italic">{(item as any).subtitle}</p>
                            )}
                            {displayQty && (
                              <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                enabled
                                  ? "bg-canyon/10 text-canyon border-canyon/20"
                                  : "bg-muted/40 text-muted-foreground border-border/30"
                              }`}>
                                <span className="w-1 h-1 rounded-full bg-current inline-block" />
                                {displayQty}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionSlab>
            ); })()}

            {/* Step: Parade Stoppers */}
            {isDesignPackageMode && activeFreeFeatures.length > 0 && isSectionEnabled("parade_stoppers") && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title={getSectionLabel("parade_stoppers", "Parade Stoppers")} delay={0.2}>
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <Gift className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                    <p className="text-sm font-body text-green-800">
                      <span className="font-bold">Free for same-day decision makers.</span> Choose one Parade Stopper to include with your design package at no charge — a thank-you for committing today.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeFreeFeatures.map((feature: any) => {
                      const isSelected = selectedFreeFeatures.has(feature.id);
                      return (
                        <div key={feature.id} className="relative">
                          <button
                            onClick={() => {
                              // Single-select: selecting a new one clears the previous
                              setSelectedFreeFeatures(prev => {
                                if (isSelected) return new Set(); // deselect if already selected
                                return new Set([feature.id]); // select only this one
                              });
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? "border-green-500 bg-green-50 text-charcoal"
                                : "border-border/60 bg-white text-stone-dark hover:border-green-300"
                            }`}
                          >
                            {feature.photoUrl && (
                              <img src={feature.photoUrl} alt={feature.name} className="w-14 h-14 object-cover rounded-md shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-body font-semibold leading-tight">{feature.name}</p>
                                {/* Strike-through price showing $0 discount */}
                                {parseFloat(feature.listPrice || "0") > 0 && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <span className="line-through text-muted-foreground">{formatCurrency(parseFloat(feature.listPrice))}</span>
                                    <span className="font-bold text-green-700">FREE</span>
                                  </span>
                                )}
                              </div>
                              {feature.description && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <InfoTooltip description={feature.description} />
                                  <span className="text-xs font-body text-muted-foreground leading-tight">{feature.description.length > 60 ? feature.description.slice(0, 60) + '…' : feature.description}</span>
                                </div>
                              )}
                            </div>
                            <span
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors mt-0.5 ${
                                isSelected ? "border-green-500 bg-green-500" : "border-border/60 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <svg viewBox="0 0 8 8" className="w-2.5 h-2.5"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              )}
                            </span>
                          </button>
                          {/* Preview photo button */}
                          {feature.photoUrl && (
                            <button
                              onClick={() => setFreeFeaturePreviewUrl(feature.photoUrl)}
                              className="absolute top-2 right-8 p-1 rounded bg-black/30 hover:bg-black/50 transition-colors"
                              title="Preview photo"
                            >
                              <Eye className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedFreeFeatures.size > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-xs font-body text-green-800 font-semibold">
                        <Gift className="w-3.5 h-3.5 inline mr-1" />
                        Parade Stopper selected — included free with your same-day commitment
                      </p>
                    </div>
                  )}
                </div>
              </SectionSlab>
            ); })()}

                        {/* ─── Bathroom Initial Consult (Stay vs. Move) ───────────────────────── */}
            {calcMode === "bathroom" && bathroomMode === "initial_consult" && (
              <InitialConsultTool
                initialState={bathroomConsultCache}
                onStateChange={(s) => {
                  setBathroomConsultCache(s);
                  // Keep the summary card live as values change
                }}
                onReset={() => {
                  setBathroomConsultCache(defaultCachedConsultState());
                  setConsultHandoff(null);
                }}
                onContinueToDesignPackage={(data) => {
                  setConsultHandoff(data);
                  if (data.clientName) setEmailName(data.clientName);
                  if (data.clientEmail) setEmailAddress(data.clientEmail);
                  if (data.clientPhone) setEmailPhone(data.clientPhone);
                  if (data.propertyAddress) setEmailStreetAddress(data.propertyAddress);
                  setBathroomMode("design_package");
                }}
              />
            )}
            {/* ─── Bathroom Remodel Steps (bathroom mode only) ─────────────────── */}
            {/* Bathroom Step 1: Bathroom Size */}

            {/* Bathroom Step 2: Plumbing — Fixture Inventory */}

            {/* Bathroom Step 3: Electrical */}

            {/* Bathroom Step 4: HVAC */}

            {/* Bathroom Step 5: Tub / Shower Configurator */}

            {/* Bathroom Step 6: Wall Finish */}

            {/* Bathroom Step 7: Tile Outside Shower */}

            {/* Bathroom Step 7b: Painting & Drywall */}

            {/* Bathroom Step 9: Vanity (pricing matrix) */}

            {/* Bathroom Step 10: Countertop */}

            {/* Bathroom Step 7: Flooring */}


            {/* Bathroom Step 9: Toilet */}

            {/* Bathroom Step: Add-ons */}

            {/* Bathroom Step: Accessories */}

            {/* ─── Kitchen Cabinet Pricing ─────────────────────────────────────────────── */}

            {/* ─── Kitchen Price Consult Sections ────────────────────────────────────────── */}
            {/* ─── Kitchen Initial Consult (Stay vs. Move) ─────────────────────────────── */}
            {calcMode === "kitchen" && kitchenMode === "initial_consult" && (
              <InitialConsultTool
                initialState={kitchenConsultCache}
                onStateChange={(s) => {
                  setKitchenConsultCache(s);
                }}
                onReset={() => {
                  setKitchenConsultCache(defaultCachedConsultState());
                  setConsultHandoff(null);
                }}
                onContinueToDesignPackage={(data) => {
                  setConsultHandoff(data);
                  if (data.clientName) setEmailName(data.clientName);
                  if (data.clientEmail) setEmailAddress(data.clientEmail);
                  if (data.clientPhone) setEmailPhone(data.clientPhone);
                  if (data.propertyAddress) setEmailStreetAddress(data.propertyAddress);
                  setKitchenMode("design_package");
                }}
              />
            )}

                        {/* ─── Kitchen Windows & SGD Pricing ──────────────────────────────────────────── */}
            {/* ─── Addition Initial Consult (Stay vs. Move) ──────────────────────────────── */}
            {calcMode === "addition" && additionMode === "initial_consult" && (
              <InitialConsultTool
                initialState={additionConsultCache}
                onStateChange={(s) => {
                  setAdditionConsultCache(s);
                }}
                onReset={() => {
                  setAdditionConsultCache(defaultCachedConsultState());
                  setConsultHandoff(null);
                }}
                onContinueToDesignPackage={(data) => {
                  setConsultHandoff(data);
                  if (data.clientName) setEmailName(data.clientName);
                  if (data.clientEmail) setEmailAddress(data.clientEmail);
                  if (data.clientPhone) setEmailPhone(data.clientPhone);
                  if (data.propertyAddress) setEmailStreetAddress(data.propertyAddress);
                  setAdditionMode("design_package");
                }}
              />
            )}
            {/* ─── Basement Initial Consult (Stay vs. Move) ──────────────────────────────── */}
            {calcMode === "basement" && basementMode === "initial_consult" && (
              <InitialConsultTool
                initialState={basementConsultCache}
                onStateChange={(s) => {
                  setBasementConsultCache(s);
                }}
                onReset={() => {
                  setBasementConsultCache(defaultCachedConsultState());
                  setConsultHandoff(null);
                }}
                onContinueToDesignPackage={(data) => {
                  setConsultHandoff(data);
                  if (data.clientName) setEmailName(data.clientName);
                  if (data.clientEmail) setEmailAddress(data.clientEmail);
                  if (data.clientPhone) setEmailPhone(data.clientPhone);
                  if (data.propertyAddress) setEmailStreetAddress(data.propertyAddress);
                  setBasementMode("design_package");
                }}
              />
            )}
            {/* ─── Addition Windows & SGD Pricing ──────────────────────────────────────────── */}
            {/* ─── Basement Windows & SGD Pricing ──────────────────────────────────────────── */}

            {/* Step: Feasibility Study — addition mode only */}
            {isDesignPackageMode && isFeasibilityMode && isSectionEnabled("feasibility_study") && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title={getSectionLabel("feasibility_study", "Feasibility Study")} delay={0.25}>
                <div className="space-y-4">
                  <p className="text-sm font-body text-stone-dark">
                    {FEASIBILITY_DESCRIPTION}
                  </p>
                  <div className="flex items-start gap-4 p-4 rounded-lg border-2 border-border/60 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        <ClipboardList className="w-4 h-4 text-canyon shrink-0" />
                        <p className="text-sm font-body font-semibold text-charcoal">Add Feasibility Study</p>
                        <span className="text-sm font-bold text-canyon">{formatCurrency(FEASIBILITY_PRICE)}</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground leading-relaxed">
                        Recommended before ordering a full design package for additions. Covers zoning review, structural assessment, and preliminary cost validation.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {FEASIBILITY_TAGS.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-sandstone/60 text-xs font-body text-stone-dark border border-border/40">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => setFeasibilityEnabled(p => !p)}
                      className={`shrink-0 w-12 h-6 rounded-full border-2 transition-all relative ${
                        feasibilityEnabled
                          ? "bg-canyon border-canyon"
                          : "bg-white border-border/60"
                      }`}
                      title="Toggle feasibility study"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          feasibilityEnabled ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {feasibilityEnabled && (
                    <div className="p-3 rounded-lg bg-canyon/5 border border-canyon/20">
                      <p className="text-xs font-body text-canyon font-semibold">
                        Feasibility Study added — {formatCurrency(FEASIBILITY_PRICE)} included in total
                      </p>
                    </div>
                  )}
                </div>
              </SectionSlab>
            ); })()}

            {/* Step: Engineer's Letter — basement and addition modes */}
            {isDesignPackageMode && (calcMode === "basement" || calcMode === "addition") && ENGINEER_LETTER_ACTIVE && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title="Engineer's Letter" delay={0.3}>
                <div className="space-y-4">
                  <p className="text-sm font-body text-stone-dark">
                    {ENGINEER_LETTER_DESCRIPTION}
                  </p>
                  <div className="flex items-start gap-4 p-4 rounded-lg border-2 border-border/60 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        <FileText className="w-4 h-4 text-canyon shrink-0" />
                        <p className="text-sm font-body font-semibold text-charcoal">Add Engineer's Letter</p>
                        <span className="text-sm font-bold text-canyon">{formatCurrency(ENGINEER_LETTER_PRICE)}</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground leading-relaxed">
                        Optional add-on. Required by some municipalities for permit approval. A licensed structural engineer reviews and stamps your design documents.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Stamped Letter", "Structural Review", "Permit Support", "Code Compliance"].map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-sandstone/60 text-xs font-body text-stone-dark border border-border/40">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => setEngineerLetterEnabled(p => !p)}
                      className={`shrink-0 w-12 h-6 rounded-full border-2 transition-all relative ${
                        engineerLetterEnabled
                          ? "bg-canyon border-canyon"
                          : "bg-white border-border/60"
                      }`}
                      title="Toggle engineer's letter"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          engineerLetterEnabled ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {engineerLetterEnabled && (
                    <div className="p-3 rounded-lg bg-canyon/5 border border-canyon/20">
                      <p className="text-xs font-body text-canyon font-semibold">
                        Engineer's Letter added — {formatCurrency(ENGINEER_LETTER_PRICE)} included in total
                      </p>
                    </div>
                  )}
                </div>
              </SectionSlab>
            ); })()}

            {/* Step: Floor Plan Drawing — basement mode only */}
            {calcMode === "basement" && sqft > 0 && (() => { const s = nextStep(); return (
              <SectionSlab step={s} title="Floor Plan Drawing" delay={0.35}>
                <div className="space-y-4">
                  <p className="text-sm font-body text-stone-dark">
                    A to-scale 2D floor plan of your basement layout, drafted by our design team. Required for permit applications in most municipalities. Priced at $1.00/sqft.
                  </p>
                  <div className="flex items-start gap-4 p-4 rounded-lg border-2 border-border/60 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-body font-semibold text-charcoal">Include Floor Plan Drawing</span>
                        <span className="text-sm font-bold text-canyon">{formatCurrency(sqft * 1.00)}</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground leading-relaxed">
                        Included by default. Uncheck if you already have an existing floor plan or if it is not needed for your project.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["To-Scale Drawing", "Permit Ready", "Room Labels", "Dimensions"].map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-sandstone/60 text-xs font-body text-stone-dark border border-border/40">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => setFloorPlanEnabled(p => !p)}
                      className={`shrink-0 w-12 h-6 rounded-full border-2 transition-all relative ${
                        floorPlanEnabled
                          ? "bg-canyon border-canyon"
                          : "bg-white border-border/60"
                      }`}
                      title="Toggle floor plan drawing"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          floorPlanEnabled ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  {floorPlanEnabled ? (
                    <div className="p-3 rounded-lg bg-canyon/5 border border-canyon/20">
                      <p className="text-xs font-body text-canyon font-semibold">
                        Floor Plan Drawing included — {formatCurrency(sqft * 1.00)} added to total
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <p className="text-xs font-body text-muted-foreground">
                        Floor Plan Drawing excluded from estimate.
                      </p>
                    </div>
                  )}
                </div>
              </SectionSlab>
            ); })()}

          </div>

          {/* Right: Sticky summary (desktop) — always visible */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <DesignPackageSummary
                  calcMode={calcMode}
                  bathroomMode={bathroomMode}
                  projectType={projectType}
                  sqft={sqft}
                  lineItems={lineItems}
                  baseTotal={baseTotal}
                  discount1Applied={discount1Applied}
                  discount1Value={discount1Value}
                  discount1Name={discount1?.name}
                  discount2Applied={discount2Applied}
                  discount2Value={discount2Value}
                  discount2Name={discount2?.name}
                  finalTotal={finalTotal}
                  monthlyPayment={monthlyPayment}
                  discount1Enabled={discount1Enabled}
                  discount2Enabled={discount2Enabled}
                  discount2BlocksEmail={discount2BlocksEmail}
                  feasibilityEnabled={feasibilityEnabled}
                  designPackageSubtotal={designPackageSubtotal}
                  questionnaireAnswers={questionnaireAnswers}
                  questions={activeQuestions}
                  questionnaireAdjustment={questionnaireAdjustment}
                  questionnaireBreakdown={dynBreakdown ?? null}
                  engineerLetterEnabled={engineerLetterEnabled}
                  engineerLetterTotal={engineerLetterTotal}
                  bathroomLineItems={undefined}
                  allBathroomsTotalLabel={undefined}
                  allBathroomsTotal={undefined}
                  activeBathroomLabel={undefined}
                  onToggleDiscount1={() => setDiscount1Applied((p) => !p)}
                  onToggleDiscount2={() => setDiscount2Applied((p) => !p)}
                  onEmailEstimate={() => setShowEmailDialog(true)}
                  onOrderPackage={() => setShowOrderModal(true)}
                  onShowFinancing={() => setShowEnhancifyModal(true)}
                  onReset={handleReset}
                  consultHandoff={consultHandoff}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile sticky summary — always visible */}
        <div className="lg:hidden mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 border-b border-border/40 bg-sandstone/30"
              onClick={() => setSummaryExpanded((p) => !p)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-canyon shrink-0" />
                <span className="font-semibold text-charcoal truncate">
                  {calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen" : "Bathroom"} Estimate
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold text-canyon">{formatCurrency(finalTotal)}</span>
                {summaryExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {summaryExpanded && (
              <div className="px-5 py-4">
                <DesignPackageSummaryContent
                  calcMode={calcMode}
                  bathroomMode={bathroomMode}
                  projectType={projectType}
                  sqft={sqft}
                  lineItems={lineItems}
                  baseTotal={baseTotal}
                  discount1Applied={discount1Applied}
                  discount1Value={discount1Value}
                  discount1Name={discount1?.name}
                  discount2Applied={discount2Applied}
                  discount2Value={discount2Value}
                  discount2Name={discount2?.name}
                  finalTotal={finalTotal}
                  monthlyPayment={monthlyPayment}
                  questionnaireAnswers={questionnaireAnswers}
                  questions={activeQuestions}
                  questionnaireAdjustment={questionnaireAdjustment}
                  questionnaireBreakdown={dynBreakdown ?? null}
                  engineerLetterEnabled={engineerLetterEnabled}
                  engineerLetterTotal={engineerLetterTotal}
                  bathroomLineItems={undefined}
                  allBathroomsTotalLabel={undefined}
                  allBathroomsTotal={undefined}
                  activeBathroomLabel={undefined}
                />
                {/* Mobile action buttons */}
                <div className="mt-4 space-y-2">
                  {discount1Enabled && (
                    <button
                      onClick={() => setDiscount1Applied((p) => !p)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
                        discount1Applied
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      {discount1Applied ? `${discount1?.name} Applied ✓` : `Apply ${discount1?.name}`}
                    </button>
                  )}
                  {discount2Enabled && (
                    <button
                      onClick={() => setDiscount2Applied((p) => !p)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
                        discount2Applied
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      {discount2Applied ? `${discount2?.name} Applied ✓` : `Apply ${discount2?.name}`}
                    </button>
                  )}
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-green-700 text-white font-body font-semibold text-sm hover:bg-green-800 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {feasibilityEnabled ? "Order Feasibility Study" : "Order Design Package"}
                  </button>
                  {(!discount2Applied || !discount2BlocksEmail) ? (
                    <button
                      onClick={() => setShowEmailDialog(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue text-white font-body font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <Mail className="w-4 h-4" />
                      Email Estimate
                    </button>
                  ) : (
                    <div className="w-full flex flex-col items-center gap-1">
                      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue/40 text-white/60 font-body font-semibold text-sm cursor-not-allowed">
                        <Mail className="w-4 h-4" />
                        Email Estimate
                      </button>
                      <p className="text-[11px] text-amber-700 font-body text-center px-1">
                        Remove the {discount2?.name} before emailing — in-person only.
                      </p>
                    </div>
                  )}
                  {monthlyPayment > 0 && (
                    <button
                      onClick={() => setShowEnhancifyModal(true)}
                      className="w-full flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#1C418C]/10 text-[#1C418C] border border-[#1C418C]/20 font-body font-semibold text-sm hover:bg-[#1C418C]/20 transition-colors"
                    >
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>~{formatCurrency(monthlyPayment)}/mo — Apply for Financing</span>
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-muted-foreground font-body text-sm hover:bg-sandstone/50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Calculator
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <BrochureModal open={showBrochureModal} onClose={() => setShowBrochureModal(false)} variant="design-package" />
      <AppointmentModal open={showAppointmentModal} onClose={() => setShowAppointmentModal(false)} bookingUrl={dpAppointmentUrl} variant="design-package" />

      {/* Parade Stopper Photo Preview Modal */}
      {freeFeaturePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setFreeFeaturePreviewUrl(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFreeFeaturePreviewUrl(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-sandstone transition-colors"
            >
              <X className="w-4 h-4 text-charcoal" />
            </button>
            <img
              src={freeFeaturePreviewUrl}
              alt="Feature preview"
              className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}

      {/* Enhancify Financing Modal */}
      {showEnhancifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-border/60 overflow-hidden">
            <div className="px-6 py-4 bg-charcoal text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <h3 className="font-display text-lg">Financing Options</h3>
              </div>
              <button onClick={() => setShowEnhancifyModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <EnhancifyWidget />
            </div>
          </div>
        </div>
      )}

      {/* Email Estimate Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-border/60 overflow-hidden">
            <div className="px-6 py-4 bg-charcoal text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <h3 className="font-display text-lg">Email Estimate</h3>
              </div>
              <button onClick={handleCloseEmailDialog} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {emailStatus === "success" ? (
                <div className="py-4 space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="font-semibold text-charcoal">Estimate Sent!</p>
                    <p className="text-sm text-muted-foreground mt-1">The design package estimate has been emailed successfully.</p>
                  </div>

                  {/* Jobtread project creation step */}
                  {jobtreadStatus === "success" ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-800 text-sm">Jobtread Project Created!</p>
                      <p className="text-xs text-green-700 mt-1">A project, design package contract, and proposal with 100% payment schedule have been created and sent to {emailAddress}.</p>
                      {jobtreadJobId && (
                        <p className="text-xs text-green-600 mt-1 font-mono">Job ID: {jobtreadJobId}</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-sandstone/20 p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-charcoal text-sm">Next Step: Create Jobtread Project</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Creates a project in Jobtread with a design package contract, lump-sum budget of {formatCurrency(checkoutTotal)}, and a proposal sent to {emailAddress} with a 100% payment schedule due on signing.
                        </p>
                      </div>
                      {jobtreadStatus === "error" && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="text-xs">{jobtreadError}</span>
                        </div>
                      )}
                      <Button
                        className="w-full bg-canyon hover:bg-canyon/90"
                        onClick={handleCreateJobtreadProject}
                        disabled={jobtreadStatus === "loading"}
                      >
                        {jobtreadStatus === "loading" ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Project…</>
                        ) : (
                          <><ClipboardList className="w-4 h-4 mr-2" />Create Jobtread Project &amp; Send Proposal</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Send Questionnaire step */}
                  {questionnaireStatus === "success" ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-semibold text-blue-800 text-sm">Questionnaire Sent!</p>
                      <p className="text-xs text-blue-700 mt-1">A personalized questionnaire link has been sent to {emailAddress} and {emailPhone}.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-sandstone/20 p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-charcoal text-sm">Send Questionnaire</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sends a personalized questionnaire link to the homeowner so they can select rooms, trades, and finish levels before the design meeting.
                        </p>
                      </div>
                      {questionnaireStatus === "error" && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="text-xs">{questionnaireError}</span>
                        </div>
                      )}
                      <Button
                        className="w-full bg-slate-blue hover:bg-slate-blue/90"
                        onClick={handleSendQuestionnaire}
                        disabled={questionnaireStatus === "loading"}
                      >
                        {questionnaireStatus === "loading" ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                        ) : (
                          <><ClipboardList className="w-4 h-4 mr-2" />Send Questionnaire</>
                        )}
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={handleCloseEmailDialog}>Close</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {consultHandoff && (consultHandoff.clientName || consultHandoff.clientEmail || consultHandoff.propertyAddress) && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                        <span className="font-semibold shrink-0">From Initial Consult:</span>
                        <span>Contact info pre-filled from the Stay vs. Move analysis. You can edit any field below.</span>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Customer Name *</label>
                      <Input value={emailName} onChange={(e) => setEmailName(e.target.value)} placeholder="Full name" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Email Address *</label>
                      <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="customer@email.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Phone *</label>
                      <Input type="tel" value={emailPhone} onChange={(e) => setEmailPhone(e.target.value)} placeholder="(801) 555-0100" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Street Address</label>
                      <Input value={emailStreetAddress} onChange={(e) => setEmailStreetAddress(e.target.value)} placeholder="123 Main St" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">City</label>
                      <Input value={emailCity} onChange={(e) => setEmailCity(e.target.value)} placeholder="Orem" className="mt-1" />
                    </div>
                  </div>
                  {emailStatus === "error" && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={handleCloseEmailDialog}>Cancel</Button>
                    <Button
                      className="flex-1 bg-slate-blue hover:bg-slate-blue/90"
                      onClick={handleSendEmail}
                      disabled={emailStatus === "sending" || !emailName.trim() || !emailAddress.trim() || !emailPhone.trim()}
                    >
                      {emailStatus === "sending" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                      ) : (
                        <><Mail className="w-4 h-4 mr-2" />Send Estimate</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Design Package Modal — full sign-and-deposit checkout */}
      <OrderMaterialModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        breakdown={{
          deckMaterial: 0,
          edgeMaterial: 0,
          stairMaterial: 0,
          accessoriesTotal: 0,
          wasteSurcharge: 0,
          subtotalMaterials: checkoutTotal,
          laborCost: 0,
          deliveryCost: 0,
          permitCost: 0,
          demoRebuild: { demoCost: 0, footingCost: 0, concreteCost: 0, framingCost: 0, facadeCost: 0, subtotal: 0, details: [] },
          rainEscape: { systemCost: 0, gutterCost: 0, laborCost: 0, soffitMaterialCost: 0, soffitLaborCost: 0, subtotal: 0, details: [] },
          steelJacket: { materialCost: 0, installCost: 0, subtotal: 0, details: [] },
          railing: { deckEdgeLf: 0, stairLf: 0, totalLf: 0, pricePerLf: 0, subtotal: 0, railingName: "", requiresRailing: false },
          handrailRemovalCost: 0,
          subtotalBeforeTax: checkoutTotal,
          taxAmount: 0,
          grandTotal: checkoutTotal,
          pricePerSqft: sqft > 0 ? checkoutTotal / sqft : 0,
          accessoryDetails: [],
          laborLineItemDetails: [],
          taxRate: 0,
          postWrapCost: 0,
          postWrapMaterialCost: 0,
          postWrapLaborCost: 0,
          postWrapPostPieces: [],
          postWrapBeamPieces: [],
          postWrapOptionName: "",
          builderMaterialDiscount: 0,
          builderLaborDiscount: 0,
          designPackageCost: checkoutTotal,
          designPackageLineItems: lineItems.map((l) => ({ id: l.id, name: l.name, cost: 0, sellPrice: l.sellPrice, quantity: l.quantity, pricingType: l.pricingType })),
        } as CostBreakdown}
        sqft={sqft || 0}
        productType="design_package"
        collectionName="Design Package"
        config={config}
        finalTotal={checkoutTotal}
        discountApplied={discount1Applied}
        discountName={discount1?.name || "Early Bird Discount"}
        discountValue={discount1Value}
        discount2Applied={discount2Applied}
        discount2Name={discount2?.name || "Same Day Discount"}
        discount2Value={discount2Value}
        contractServiceType="design_package"
        dialogTitle={feasibilityEnabled ? "Order Feasibility Study" : "Order Design Package"}
        estimateDescription={feasibilityEnabled
          ? `Feasibility Study — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}`
          : `${calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel"} Design Package — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}${sqft > 0 ? ` — ${sqft.toLocaleString()} sq ft` : ""}`
        }
        isDesignPackage={true}
        jobtreadParams={{
          projectDescription: feasibilityEnabled
            ? `Feasibility Study — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}`
            : `Design Package — ${calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel"} — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}${sqft > 0 ? ` (${sqft.toLocaleString()} sq ft)` : ""}`,
          budgetLineItemName: feasibilityEnabled
            ? `Feasibility Study — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}`
            : "Dreams to Reality Design Package",
          costGroupName: ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType,
          scopeOfWork: (() => {
            const projectLabel = ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType;
            const lines: string[] = [];

            // ── Project Overview ────────────────────────────────────────────
            lines.push("=== PROJECT OVERVIEW ===");
            lines.push(`Mode: ${calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel"}`);
            lines.push(`Project Type: ${projectLabel}`);
            if (isSqftBased && sqft > 0) lines.push(`Square Footage: ${sqft.toLocaleString()} sq ft`);

            // Rendering counts (for remodel modes)
            if (!isSqftBased) {
              if (smallBathroomCount > 0) lines.push(`Small Bathrooms: ${smallBathroomCount}`);
              if (largeBathroomCount > 0) lines.push(`Large Bathrooms: ${largeBathroomCount}`);
              if (kitchenCount > 0) lines.push(`Kitchens: ${kitchenCount}`);
              if (exteriorCount > 0) lines.push(`Exterior Areas: ${exteriorCount}`);
            }

            if (feasibilityEnabled) {
              // ── Feasibility Study ──────────────────────────────────────────
              lines.push("");
              lines.push("=== FEASIBILITY STUDY ===");
              lines.push(`Fee: ${formatCurrency(FEASIBILITY_PRICE)}`);
                            if (FEASIBILITY_TAGS.length > 0) {
                lines.push("Includes:");
                FEASIBILITY_TAGS.forEach((tag: string) => lines.push(`  • ${tag}`));
              }
            }
            // ── Questionnaire Answers ──────────────────────────────────────
            const answeredQuestions = activeQuestions.filter(
              (q: any) => questionnaireAnswers[q.id] !== undefined && questionnaireAnswers[q.id] !== ""
            );
            if (answeredQuestions.length > 0) {
              lines.push("");
              lines.push("=== QUESTIONNAIRE RESPONSES ===");
              answeredQuestions.forEach((q: any) => {
                const ans = questionnaireAnswers[q.id];
                const ansStr = Array.isArray(ans) ? ans.join(", ") : String(ans);
                lines.push(`  ${q.questionText}: ${ansStr}`);
              });
            }

            // ── Pricing Summary ────────────────────────────────────────────
            lines.push("");
            lines.push("=== PRICING SUMMARY ===");
            if (!feasibilityEnabled) {
              lines.push(`Services Subtotal: ${formatCurrency(servicesTotal)}`);
              if (discount1Value > 0) lines.push(`${discount1?.name || "Early Bird Discount"}: -${formatCurrency(discount1Value)}`);
              if (discount2Value > 0) lines.push(`${discount2?.name || "Same Day Discount"}: -${formatCurrency(discount2Value)}`);
            }
            if (feasibilityEnabled) {
              lines.push(`Feasibility Study Fee: ${formatCurrency(FEASIBILITY_PRICE)}`);
            }
            lines.push(`TOTAL DUE AT SIGNING: ${formatCurrency(checkoutTotal)}`);

            return lines.join("\n");
          })(),
          contractText: dpContractTemplate?.contractText || "",
          totalAmount: checkoutTotal,
          // Individual service line items for the Jobtread budget tab
          services: feasibilityEnabled
            ? [{
                name: `Feasibility Study — ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}`,
                amount: FEASIBILITY_PRICE,
                scopeOfWork: `Feasibility Study for ${ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType}. Includes: ${FEASIBILITY_TAGS.join(", ")}.`,
              }]
            : lineItems.map((l) => {
                const detail = l.pricingType === "sqft"
                  ? `${l.quantity.toLocaleString()} sq ft`
                  : l.pricingType === "rendering" && l.quantity > 1
                  ? `×${l.quantity}`
                  : undefined;
                // Build per-service scope text for the Jobtread budget item description
                const projectLabel = ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType;
                const modeLabel = calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel";
                const qtyNote = l.pricingType === "sqft"
                  ? ` — ${l.quantity.toLocaleString()} sq ft @ ${formatCurrency(l.sellPrice / l.quantity)}/sqft`
                  : l.pricingType === "rendering" && l.quantity > 1
                  ? ` — ${l.quantity} renderings`
                  : "";
                const scopeOfWork = [
                  `Service: ${l.name}${qtyNote}`,
                  `Project: ${modeLabel} — ${projectLabel}`,
                  ...(isSqftBased && sqft > 0 ? [`Square Footage: ${sqft.toLocaleString()} sq ft`] : []),
                  `Price: ${formatCurrency(l.sellPrice)}`,
                ].join("\n");
                return { name: l.name, amount: l.sellPrice, detail, scopeOfWork };
              }),
          // "Prepared By" — sales rep + company info for the Jobtread proposal
          salesRepName: calUser ? calUser.name : "Design Your Price",
          salesRepEmail: calUser ? calUser.email : undefined,
          salesRepPhone: calUser?.phone || calUser?.companyPhone || "801-762-8267",
          companyAddress: "751 E Technology Way Suite F11-03, Orem UT 84097",
        }}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionSlab({
  step,
  title,
  children,
  delay = 0,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-canyon text-white text-sm font-semibold font-body shrink-0">
            {step}
          </span>
          <h2 className="text-lg sm:text-xl text-charcoal min-w-0 break-words">{title}</h2>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </motion.section>
  );
}

function CollapsibleSectionSlab({
  step,
  title,
  children,
  delay = 0,
  isOpen,
  onToggle,
  badge,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  delay?: number;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden"
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30 flex items-center gap-3 text-left hover:bg-sandstone/50 transition-colors group"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-canyon text-white text-sm font-semibold font-body shrink-0">
          {step}
        </span>
        <h2 className="text-lg sm:text-xl text-charcoal min-w-0 break-words flex-1">{title}</h2>
        {badge && !isOpen && (
          <span className="text-xs font-medium text-canyon bg-canyon/10 border border-canyon/20 rounded-full px-2.5 py-0.5 shrink-0">
            {badge}
          </span>
        )}
        <span className="shrink-0 ml-1 text-muted-foreground group-hover:text-charcoal transition-colors">
          {isOpen
            ? <ChevronUp className="w-5 h-5" />
            : <ChevronDown className="w-5 h-5" />}
        </span>
      </button>
      {/* Collapsible body */}
      {isOpen && (
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      )}
    </motion.section>
  );
}

function CountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-white gap-3">
      <p className="text-sm font-body font-medium text-charcoal min-w-0">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-charcoal hover:bg-sandstone/40 transition-colors text-base font-semibold"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold text-charcoal">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-charcoal hover:bg-sandstone/40 transition-colors text-base font-semibold"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Customer-facing summary content.
 * Shows ONLY the list of included service names and a single bulk total.
 * No individual prices, costs, or markups are shown.
 */
function DesignPackageSummaryContent({
  calcMode,
  bathroomMode,
  projectType,
  sqft,
  lineItems,
  baseTotal,
  discount1Applied,
  discount1Value,
  discount1Name,
  discount2Applied,
  discount2Value,
  discount2Name,
  finalTotal,
  monthlyPayment,
  questionnaireAnswers,
  questions,
  questionnaireAdjustment,
  questionnaireBreakdown,
  engineerLetterEnabled,
  engineerLetterTotal,
  bathroomLineItems,
  allBathroomsTotalLabel,
  allBathroomsTotal,
  activeBathroomLabel,
}: {
  calcMode: CalcMode;
  bathroomMode?: "design_package" | "initial_consult";
  projectType: string;
  sqft: number;
  lineItems: LineItemResult[];
  baseTotal: number;
  discount1Applied: boolean;
  discount1Value: number;
  discount1Name?: string;
  discount2Applied: boolean;
  discount2Value: number;
  discount2Name?: string;
  finalTotal: number;
  monthlyPayment: number;
  questionnaireAnswers?: Record<number, string | string[]>;
  questions?: any[];
  questionnaireAdjustment?: number;
  questionnaireBreakdown?: { breakdown: Array<{ questionText: string; ruleName: string; amount: number }>; totalAdjustment: number } | null;
  engineerLetterEnabled?: boolean;
  engineerLetterTotal?: number;
  bathroomLineItems?: { id: number; name: string; sellPrice: number; cost: number }[];
  allBathroomsTotalLabel?: string;
  allBathroomsTotal?: number;
  activeBathroomLabel?: string;
}) {
  const projectLabel = ALL_PROJECT_TYPES.find((p) => p.value === projectType)?.label || projectType;
  const modeLabel = calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel";
  const answeredQuestions = questions && questionnaireAnswers
    ? questions.filter((q: any) => {
        const ans = questionnaireAnswers[q.id];
        return ans !== undefined && ans !== null && ans !== "" && !(Array.isArray(ans) && ans.length === 0);
      })
    : [];
  return (
    <div className="space-y-2 text-sm font-body">
      <div className="flex justify-between gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
        <span className="shrink-0">Calculator Mode</span>
        <span className="font-medium text-canyon text-right min-w-0 break-words">{modeLabel}</span>
      </div>
      <div className="flex justify-between gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
        <span className="shrink-0">Project Type</span>
        <span className="text-right min-w-0 break-words">{projectLabel}</span>
      </div>
      {/* Rough Pricing Questionnaire Answers */}
      {answeredQuestions.length > 0 && (
        <div className="border-t border-border/30 pt-2 mt-2 space-y-1.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rough Pricing Inputs</p>
          {answeredQuestions.map((q: any) => {
            const ans = questionnaireAnswers![q.id];
            const displayAns = Array.isArray(ans) ? ans.join(", ") : String(ans);
            return (
              <div key={q.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs min-w-0 max-w-[55%] break-words">{q.questionText}</span>
                <span className="text-stone-dark text-xs text-right font-medium min-w-0 break-words">{displayAns}</span>
              </div>
            );
          })}
        </div>
      )}
      {sqft > 0 && SQFT_BASED_TYPES.includes(projectType) && (
        <div className="flex justify-between text-muted-foreground">
          <span>Square Footage</span>
          <span>{sqft.toLocaleString()} sq ft</span>
        </div>
      )}
      {lineItems.length === 0 ? (
        <p className="text-muted-foreground text-xs py-2">
          {SQFT_BASED_TYPES.includes(projectType) && sqft <= 0
            ? "Enter square footage above to see pricing."
            : "No applicable services for this project type."}
        </p>
      ) : (
        <>
          {/* Services list — with quantity badge and price */}
          <div className="border-t border-border/30 pt-2 mt-2 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Included Services</p>
            {lineItems.filter(item => {
              // Hide rendering items with 0 quantity
              if (item.pricingType === "rendering" && item.quantity === 0) return false;
              return true;
            }).map((item) => {
              // Determine quantity badge
              const showQty = item.pricingType !== "flat" && item.quantity > 0 && item.quantity !== 1;
              const qtyBadge = item.pricingType === "per_sqft"
                ? `${item.quantity.toLocaleString()} sq ft`
                : item.pricingType === "per_count"
                  ? `Qty ${item.quantity}`
                  : showQty ? `Qty ${item.quantity}` : null;
              return (
                <div key={item.id} className="bg-sandstone/40 rounded-lg px-3 py-2 border border-border/20">
                  <span className="text-stone-dark text-sm font-medium leading-snug break-words block">{item.name}</span>
                  {qtyBadge && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 bg-canyon/10 text-canyon text-xs font-semibold px-2 py-0.5 rounded-full border border-canyon/20">
                        <span className="w-1 h-1 rounded-full bg-canyon inline-block" />
                        {qtyBadge}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Design Hours Summary */}
          {(() => {
            const renderingItems = lineItems.filter(l => l.pricingType === "rendering" && l.discountedHours !== undefined && l.discountedHours > 0);
            const totalHrs = renderingItems.reduce((sum, l) => sum + (l.discountedHours ?? 0), 0);
            if (renderingItems.length === 0 || totalHrs === 0) return null;
            return (
              <div className="border-t border-border/30 pt-2 mt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Design Hours</p>
                <div className="flex justify-between gap-2 font-medium text-charcoal text-sm">
                  <span>Total Design Hours</span>
                  <span className="text-canyon">{totalHrs}h</span>
                </div>
              </div>
            );
          })()}
          {/* Questionnaire Pricing Adjustments */}
          {questionnaireAdjustment !== undefined && questionnaireAdjustment !== 0 && (
            <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questionnaire Adjustments</p>
              {questionnaireBreakdown && questionnaireBreakdown.breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-xs">
                  <span className="text-muted-foreground min-w-0 max-w-[60%] break-words">{item.questionText}</span>
                  <span className={`font-mono font-medium shrink-0 ${item.amount >= 0 ? 'text-canyon' : 'text-green-700'}`}>
                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-2 text-sm font-medium">
                <span className="text-charcoal">Subtotal Adjustments</span>
                <span className={`font-mono ${questionnaireAdjustment >= 0 ? 'text-canyon' : 'text-green-700'}`}>
                  {questionnaireAdjustment >= 0 ? '+' : ''}{formatCurrency(questionnaireAdjustment)}
                </span>
              </div>
            </div>
          )}
          {/* Discounts */}
          {(discount1Applied && discount1Value > 0) && (
            <div className="flex justify-between gap-2 text-green-700 text-sm">
              <span className="min-w-0 break-words">{discount1Name || "Early Bird Discount"}</span>
              <span className="shrink-0">−{formatCurrency(discount1Value)}</span>
            </div>
          )}
          {(discount2Applied && discount2Value > 0) && (
            <div className="flex justify-between gap-2 text-green-700 text-sm">
              <span className="min-w-0 break-words">{discount2Name || "Same Day Discount"}</span>
              <span className="shrink-0">−{formatCurrency(discount2Value)}</span>
            </div>
          )}
          {/* Engineer's Letter add-on */}
          {engineerLetterEnabled && engineerLetterTotal && engineerLetterTotal > 0 && (
            <div className="flex justify-between gap-2 text-canyon text-sm">
              <span className="min-w-0 break-words">Engineer's Letter</span>
              <span className="shrink-0">+{formatCurrency(engineerLetterTotal)}</span>
            </div>
          )}
          {/* Single bulk total */}
          <div className="border-t border-border/40 mt-3 pt-3">
            <div className="flex justify-between gap-2 font-semibold text-charcoal text-base">
              <span className="min-w-0">Design Package Total</span>
              <span className="text-canyon shrink-0">{formatCurrency(finalTotal)}</span>
            </div>
            {monthlyPayment > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                or ~{formatCurrency(monthlyPayment)}/mo with financing
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              All-inclusive design package contract price
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function DesignPackageSummary({
  calcMode,
  bathroomMode,
  projectType,
  sqft,
  lineItems,
  baseTotal,
  discount1Applied,
  discount1Value,
  discount1Name,
  discount2Applied,
  discount2Value,
  discount2Name,
  finalTotal,
  monthlyPayment,
  discount1Enabled,
  discount2Enabled,
  discount2BlocksEmail,
  feasibilityEnabled,
  designPackageSubtotal,
  questionnaireAnswers,
  questions,
  questionnaireAdjustment,
  questionnaireBreakdown,
  engineerLetterEnabled,
  engineerLetterTotal,
  bathroomLineItems,
  allBathroomsTotalLabel,
  allBathroomsTotal,
  activeBathroomLabel,
  onToggleDiscount1,
  onToggleDiscount2,
  onEmailEstimate,
  onOrderPackage,
  onShowFinancing,
  onReset,
  consultHandoff,
}: {
  calcMode: CalcMode;
  bathroomMode?: "design_package" | "initial_consult";
  projectType: string;
  sqft: number;
  lineItems: LineItemResult[];
  baseTotal: number;
  discount1Applied: boolean;
  discount1Value: number;
  discount1Name?: string;
  discount2Applied: boolean;
  discount2Value: number;
  discount2Name?: string;
  finalTotal: number;
  monthlyPayment: number;
  discount1Enabled: boolean;
  discount2Enabled: boolean;
  discount2BlocksEmail: boolean;
  feasibilityEnabled: boolean;
  designPackageSubtotal: number;
  questionnaireAnswers?: Record<number, string | string[]>;
  questions?: any[];
  questionnaireAdjustment?: number;
  questionnaireBreakdown?: { breakdown: Array<{ questionText: string; ruleName: string; amount: number }>; totalAdjustment: number } | null;
  engineerLetterEnabled?: boolean;
  engineerLetterTotal?: number;
  bathroomLineItems?: { id: number; name: string; sellPrice: number; cost: number }[];
  allBathroomsTotalLabel?: string;
  allBathroomsTotal?: number;
  activeBathroomLabel?: string;
  onToggleDiscount1: () => void;
  onToggleDiscount2: () => void;
  onEmailEstimate: () => void;
  onOrderPackage: () => void;
  onShowFinancing: () => void;
  onReset: () => void;
  consultHandoff?: ConsultHandoffData | null;
}) {
  const emailBlocked = discount2Applied && discount2Enabled && discount2BlocksEmail;
  const modeLabel = calcMode === "addition" ? "Addition" : calcMode === "basement" ? "Basement" : calcMode === "kitchen" ? "Kitchen Remodel" : "Bathroom Remodel";
  const orderButtonLabel = feasibilityEnabled
    ? "Order Feasibility Study"
    : "Order Design Package";
  const summaryHeaderLabel = "Design Package";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-sandstone/30">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-canyon shrink-0" />
          <h3 className="font-semibold text-charcoal min-w-0 truncate">{summaryHeaderLabel}</h3>
        </div>
      </div>

      {/* Consult context banner */}
      {consultHandoff && consultHandoff.renovationBudget > 0 && (
        <div className="px-5 py-2.5 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-700 dark:text-amber-300 font-medium">Renovation Budget (from consult)</span>
            <span className="font-bold text-amber-800 dark:text-amber-200">{formatCurrency(consultHandoff.renovationBudget)}</span>
          </div>
          {consultHandoff.clientName && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">{consultHandoff.clientName}{consultHandoff.propertyAddress ? ` • ${consultHandoff.propertyAddress}` : ""}</p>
          )}
        </div>
      )}

      {/* Bulk total */}
      <div className="px-5 py-4 border-b border-border/20 bg-gradient-to-br from-canyon/5 to-sandstone/20">
        {feasibilityEnabled ? (
          <>
            <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">Today's Charge</p>
            <p className="text-3xl font-bold text-canyon">{formatCurrency(1000)}</p>
            <p className="text-xs font-body text-muted-foreground mt-1">Feasibility Study only — design package billed separately after approval</p>
          </>
        ) : (
          <>
            <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">Estimated Total</p>
            <p className="text-3xl font-bold text-canyon">{formatCurrency(finalTotal)}</p>
            {monthlyPayment > 0 && (
              <button
                onClick={onShowFinancing}
                className="text-xs font-body text-slate-blue hover:underline mt-1 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                ~{formatCurrency(monthlyPayment)}/mo with financing
              </button>
            )}
            {finalTotal > 0 && (
              <p className="text-xs font-body text-muted-foreground mt-1">
                All-inclusive design package contract price
              </p>
            )}
          </>
        )}
      </div>

      {/* Rough Estimate Reference — shown when feasibility study is selected */}
      {feasibilityEnabled && designPackageSubtotal > 0 && (
        <div className="px-5 py-3 border-b border-border/20 bg-amber-50/60">
          <p className="text-xs font-body text-amber-800 uppercase tracking-wider font-semibold mb-1">Rough Estimate (Reference Only)</p>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(designPackageSubtotal)}</p>
          <p className="text-[11px] font-body text-amber-700/80 mt-0.5">Estimated design package cost — subject to change after feasibility study results</p>
        </div>
      )}

      {/* Services list + total */}
      <div className="px-5 py-4">
        <DesignPackageSummaryContent
          calcMode={calcMode}
          bathroomMode={bathroomMode}
          projectType={projectType}
          sqft={sqft}
          lineItems={lineItems}
          baseTotal={baseTotal}
          discount1Applied={discount1Applied}
          discount1Value={discount1Value}
          discount1Name={discount1Name}
          discount2Applied={discount2Applied}
          discount2Value={discount2Value}
          discount2Name={discount2Name}
          finalTotal={finalTotal}
          monthlyPayment={monthlyPayment}
          questionnaireAnswers={questionnaireAnswers}
          questions={questions}
          questionnaireAdjustment={questionnaireAdjustment}
          questionnaireBreakdown={questionnaireBreakdown}
          engineerLetterEnabled={engineerLetterEnabled}
          engineerLetterTotal={engineerLetterTotal}
          bathroomLineItems={bathroomLineItems}
          allBathroomsTotalLabel={allBathroomsTotalLabel}
          allBathroomsTotal={allBathroomsTotal}
          activeBathroomLabel={activeBathroomLabel}
        />
      </div>
      {/* Actions */}
      <div className="px-5 py-4 border-t border-border/30 space-y-2 print:hidden">
        {/* Discount 1 — Early Bird */}
        {discount1Enabled && (
          <button
            onClick={onToggleDiscount1}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
              discount1Applied
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            }`}
          >
            <Tag className="w-4 h-4" />
            {discount1Applied ? `${discount1Name || "Early Bird Discount"} Applied ✓` : `Apply ${discount1Name || "Early Bird Discount"}`}
          </button>
        )}
        {/* Discount 2 — Same Day */}
        {discount2Enabled && (
          <button
            onClick={onToggleDiscount2}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
              discount2Applied
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <Tag className="w-4 h-4" />
            {discount2Applied ? `${discount2Name || "Same Day Discount"} Applied ✓` : `Apply ${discount2Name || "Same Day Discount"}`}
          </button>
        )}
        {/* Order Now / Order Design Package / Order Feasibility Study */}
        <button
          onClick={onOrderPackage}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-green-700 text-white font-body font-semibold text-sm hover:bg-green-800 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {orderButtonLabel}
        </button>
        {/* Email Estimate */}
        {emailBlocked ? (
          <div className="w-full flex flex-col items-center gap-1">
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue/40 text-white/60 font-body font-semibold text-sm cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              Email Estimate
            </button>
            <p className="text-[11px] text-amber-700 font-body text-center px-1">
              Remove the {discount2Name || "Same Day Discount"} before emailing — in-person only.
            </p>
          </div>
        ) : (
          <button
            onClick={onEmailEstimate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue text-white font-body font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Mail className="w-4 h-4" />
            Email Estimate
          </button>
        )}
        {/* Financing */}
        {monthlyPayment > 0 && (
          <button
            onClick={onShowFinancing}
            className="w-full flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#1C418C]/10 text-[#1C418C] border border-[#1C418C]/20 font-body font-semibold text-sm hover:bg-[#1C418C]/20 transition-colors"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>~{formatCurrency(monthlyPayment)}/mo — Apply for Financing</span>
          </button>
        )}
        {/* Reset Calculator */}
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-muted-foreground font-body text-sm hover:bg-sandstone/50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Calculator
        </button>
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-3 bg-sandstone/30 border-t border-border/40">
        <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
          * This estimate is for informational purposes only and does not constitute a binding quote. Final pricing may vary based on project scope and complexity.
        </p>
      </div>
    </div>
  );
}
