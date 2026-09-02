/**
 * CabinetPricingSection
 * Self-contained cabinet pricing question flow for the kitchen price consult.
 * Steps:
 *   1. Collection / finish (with image thumbnails + hover popup previews)
 *   2. Room type (Kitchen / Bathroom / Built-in)
 *   3. Linear feet inputs (bases, walls, vanities)
 *   4. Base type (standard / full-height / drawer / specialty)
 *   5. Wall cabinet height (30" / 36" / 42" / stacked)
 *   6. Tall cabinets (pantry, oven, linen — qty)
 *   7. Add-on accessories (yes/no checkboxes)
 *   8. Assembly / install
 */

import { useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";

// ─── Cabinet image map ────────────────────────────────────────────────────────
// Keys match the finishKey values below; values are /manus-storage/ paths
const CABINET_IMAGES: Record<string, string> = {
  // US Cabinet Depot — Shaker
  "shaker-white":          "/manus-storage/uscd-shaker-white_45378ab9.png",
  "shaker-antique-white":  "/manus-storage/uscd-shaker-antique-white_fec3e4e8.png",
  "shaker-dove":           "/manus-storage/uscd-shaker-dove_bb1ef6fa.png",
  "shaker-grey":           "/manus-storage/uscd-shaker-grey_5b3c2844.png",
  "shaker-unfinished":     "/manus-storage/uscd-shaker-unfinished_c621e39d.png",
  "shaker-ivy":            "/manus-storage/uscd-shaker-ivy_8c84cc15.png",
  "shaker-navy":           "/manus-storage/uscd-shaker-navy_4811835e.png",
  "shaker-black":          "/manus-storage/uscd-shaker-black_f67aa78b.png",
  "shaker-honey":          "/manus-storage/uscd-shaker-honey_e0437f7c.png",
  "shaker-cinder":         "/manus-storage/uscd-shaker-cinder_19dfda80.png",
  "shaker-essence-oak":    "/manus-storage/uscd-shaker-essence-oak_0414a020.jpg",
  "shaker-essence-oak-fh": "/manus-storage/uscd-shaker-essence-oak_0414a020.jpg",
  // US Cabinet Depot — Haven
  "haven-dune":            "/manus-storage/uscd-haven-dune_68a96b5f.png",
  "haven-ember":           "/manus-storage/uscd-haven-ember_97efed77.png",
  // Woodoo Cabinetry — Shaker
  "woodoo-white":          "/manus-storage/woodoo-frosty-white-shaker_47e224af.png",
  "woodoo-iron-ore":       "/manus-storage/woodoo-iron-black-shaker_9fe53588.webp",
  "woodoo-premium-oak":    "/manus-storage/woodoo-premium-oak-shaker_4c0a930d.webp",
  "woodoo-walnut":         "/manus-storage/woodoo-walnut-shaker_b558d42c.png",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type CabinetCollection = "shaker" | "haven" | "woodoo" | "custom";
export type CustomFinishKey = "custom-painted" | "custom-white-oak" | "custom-walnut";

// Shaker finish keys — each maps to a specific finish line
export type ShakerFinishKey =
  | "shaker-white"
  | "shaker-antique-white"
  | "shaker-dove"
  | "shaker-grey"
  | "shaker-unfinished"
  | "shaker-ivy"
  | "shaker-navy"
  | "shaker-black"
  | "shaker-honey"
  | "shaker-cinder"
  | "shaker-essence-oak"
  | "shaker-essence-oak-fh";

export type HavenFinishKey = "haven-dune" | "haven-ember";
export type WoodooFinishKey = "woodoo-white" | "woodoo-iron-ore" | "woodoo-premium-oak" | "woodoo-walnut";

export type RoomType = "kitchen" | "bathroom" | "builtin";
export type BaseType = "standard" | "fullHeight" | "drawer" | "specialty";
export type WallHeight = "30" | "36" | "42" | "stacked";
export type AssemblyOption = "none" | "assembly" | "install" | "both";

export interface CabinetState {
  collection: CabinetCollection;
  shakerFinish: ShakerFinishKey;
  havenFinish: HavenFinishKey;
  woodooFinish: WoodooFinishKey;
  customFinish: CustomFinishKey;
  customCostPainted: string;   // cost per LF for Painted
  customCostWhiteOak: string;  // cost per LF for White Oak
  customCostWalnut: string;    // cost per LF for Walnut
  roomType: RoomType;
  baseLF: string;
  wallLF: string;
  vanityLF: string;
  baseType: BaseType;
  wallHeight: WallHeight;
  tallPantry: string;
  tallOven: string;
  tallLinen: string;
  addon_trash: boolean;
  addon_tray: boolean;
  addon_spice: boolean;
  addon_glass: boolean;
  addon_endPanels: boolean;
  addon_finishedSides: boolean;
  addon_moulding: boolean;
  addon_islandPanels: boolean;
  assembly: AssemblyOption;
}

export const defaultCabinetState: CabinetState = {
  collection: "shaker",
  shakerFinish: "shaker-white",
  havenFinish: "haven-dune",
  woodooFinish: "woodoo-white",
  customFinish: "custom-painted",
  customCostPainted: "",
  customCostWhiteOak: "",
  customCostWalnut: "",
  roomType: "kitchen",
  baseLF: "",
  wallLF: "",
  vanityLF: "",
  baseType: "standard",
  wallHeight: "30",
  tallPantry: "",
  tallOven: "",
  tallLinen: "",
  addon_trash: false,
  addon_tray: false,
  addon_spice: false,
  addon_glass: false,
  addon_endPanels: false,
  addon_finishedSides: false,
  addon_moulding: false,
  addon_islandPanels: false,
  assembly: "none",
};

// ─── Multiplier helpers ───────────────────────────────────────────────────────
const SHAKER_MULTIPLIERS: Record<ShakerFinishKey, number> = {
  "shaker-white": 1.00,
  "shaker-antique-white": 1.00,
  "shaker-dove": 1.00,
  "shaker-grey": 1.00,
  "shaker-unfinished": 1.00,
  "shaker-ivy": 1.10,
  "shaker-navy": 1.10,
  "shaker-black": 1.10,
  "shaker-honey": 1.10,
  "shaker-cinder": 1.10,
  "shaker-essence-oak": 1.16,
  "shaker-essence-oak-fh": 1.21,
};

const HAVEN_MULTIPLIERS: Record<HavenFinishKey, number> = {
  "haven-dune": 1.16,
  "haven-ember": 1.21,
};

// Woodoo uses same multiplier structure as Shaker for now
const WOODOO_MULTIPLIERS: Record<WoodooFinishKey, number> = {
  "woodoo-white": 1.00,
  "woodoo-iron-ore": 1.10,
  "woodoo-premium-oak": 1.16,
  "woodoo-walnut": 1.21,
};

function getFinishMultiplier(state: CabinetState): number {
  if (state.collection === "shaker") return SHAKER_MULTIPLIERS[state.shakerFinish];
  if (state.collection === "haven") return HAVEN_MULTIPLIERS[state.havenFinish];
  if (state.collection === "woodoo") return WOODOO_MULTIPLIERS[state.woodooFinish];
  return 1; // custom — multiplier not used; per-finish cost is used directly
}

function getActiveFinishKey(state: CabinetState): string {
  if (state.collection === "shaker") return state.shakerFinish;
  if (state.collection === "haven") return state.havenFinish;
  if (state.collection === "woodoo") return state.woodooFinish;
  return state.customFinish;
}

function getCustomCostPerLF(state: CabinetState): number {
  if (state.customFinish === "custom-painted") return parseFloat(state.customCostPainted) || 0;
  if (state.customFinish === "custom-white-oak") return parseFloat(state.customCostWhiteOak) || 0;
  if (state.customFinish === "custom-walnut") return parseFloat(state.customCostWalnut) || 0;
  return 0;
}

// ─── Pricing calculation ──────────────────────────────────────────────────────
export interface CabinetLineItem {
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  cost: number;
  sellPrice: number;
}

export interface CabinetPricingResult {
  lineItems: CabinetLineItem[];
  total: number;
}

export function calcCabinetPricing(
  state: CabinetState,
  config: Record<string, string> | null | undefined,
  markupPct: number
): CabinetPricingResult {
  if (!config) return { lineItems: [], total: 0 };
  const gpDivisor = markupPct >= 1 ? 0.01 : 1 - markupPct;
  const n = (key: string, fallback: number) => parseFloat(config[key] ?? String(fallback)) || fallback;
  const pf = (v: string) => parseFloat(v) || 0;

  const finishMult = getFinishMultiplier(state);
  const baseShakerPrice = n("base_shaker_lf", 120);
  // For fully custom, use the rep-entered cost per LF for the selected finish; otherwise apply multiplier to base Shaker price
  const customCostPerLF = getCustomCostPerLF(state);
  const finishPrice = state.collection === "custom"
    ? customCostPerLF
    : baseShakerPrice * finishMult;

  const lineItems: CabinetLineItem[] = [];

  const baseLF = pf(state.baseLF);
  const wallLF = pf(state.wallLF);
  const vanityLF = pf(state.vanityLF);

  // Base cabinets
  if (baseLF > 0) {
    let baseUpcharge = 0;
    if (state.baseType === "fullHeight") baseUpcharge = n("upcharge_full_height", 30);
    if (state.baseType === "drawer") baseUpcharge = n("upcharge_drawer", 40);
    if (state.baseType === "specialty") baseUpcharge = n("upcharge_specialty", 60);
    const unitCost = finishPrice + baseUpcharge;
    const cost = unitCost * baseLF;
    lineItems.push({ name: "Base Cabinets", qty: baseLF, unit: "LF", unitCost, cost, sellPrice: cost / gpDivisor });
  }

  // Wall cabinets
  if (wallLF > 0) {
    let wallUpcharge = 0;
    if (state.wallHeight === "36") wallUpcharge = n("upcharge_wall_36", 15);
    if (state.wallHeight === "42") wallUpcharge = n("upcharge_wall_42", 25);
    if (state.wallHeight === "stacked") wallUpcharge = n("upcharge_wall_stacked", 50);
    const unitCost = finishPrice + wallUpcharge;
    const cost = unitCost * wallLF;
    lineItems.push({ name: `Wall Cabinets (${state.wallHeight === "stacked" ? "Stacked" : `${state.wallHeight}"`})`, qty: wallLF, unit: "LF", unitCost, cost, sellPrice: cost / gpDivisor });
  }

  // Vanity cabinets
  if (vanityLF > 0) {
    const unitCost = finishPrice;
    const cost = unitCost * vanityLF;
    lineItems.push({ name: "Vanity Cabinets", qty: vanityLF, unit: "LF", unitCost, cost, sellPrice: cost / gpDivisor });
  }

  // Tall cabinets
  const tallPantry = pf(state.tallPantry);
  const tallOven = pf(state.tallOven);
  const tallLinen = pf(state.tallLinen);
  if (tallPantry > 0) {
    const unitCost = n("price_pantry", 350) * finishMult;
    const cost = unitCost * tallPantry;
    lineItems.push({ name: "Pantry Cabinets", qty: tallPantry, unit: "ea", unitCost, cost, sellPrice: cost / gpDivisor });
  }
  if (tallOven > 0) {
    const unitCost = n("price_oven", 400) * finishMult;
    const cost = unitCost * tallOven;
    lineItems.push({ name: "Oven Cabinets", qty: tallOven, unit: "ea", unitCost, cost, sellPrice: cost / gpDivisor });
  }
  if (tallLinen > 0) {
    const unitCost = n("price_linen", 320) * finishMult;
    const cost = unitCost * tallLinen;
    lineItems.push({ name: "Linen Cabinets", qty: tallLinen, unit: "ea", unitCost, cost, sellPrice: cost / gpDivisor });
  }

  // Add-ons
  const addons: Array<[boolean, string, string, number]> = [
    [state.addon_trash, "Trash Pullout", "addon_trash", 85],
    [state.addon_tray, "Tray Base", "addon_tray", 95],
    [state.addon_spice, "Spice Pullout", "addon_spice", 75],
    [state.addon_glass, "Glass Doors", "addon_glass", 120],
    [state.addon_endPanels, "Decorative End Panels", "addon_end_panels", 150],
    [state.addon_finishedSides, "Finished Sides", "addon_finished_sides", 100],
    [state.addon_moulding, "Crown/Moulding Package", "addon_moulding", 400],
    [state.addon_islandPanels, "Island/Back Panels", "addon_island_panels", 250],
  ];
  for (const [active, name, key, fallback] of addons) {
    if (active) {
      const cost = n(key, fallback);
      lineItems.push({ name, qty: 1, unit: "ea", unitCost: cost, cost, sellPrice: cost / gpDivisor });
    }
  }

  // Assembly / install
  const totalLF = baseLF + wallLF + vanityLF;
  if ((state.assembly === "assembly" || state.assembly === "both") && totalLF > 0) {
    const cost = n("rate_assembly", 25) * totalLF;
    lineItems.push({ name: "Assembly", qty: totalLF, unit: "LF", unitCost: n("rate_assembly", 25), cost, sellPrice: cost / gpDivisor });
  }
  if ((state.assembly === "install" || state.assembly === "both") && totalLF > 0) {
    const cost = n("rate_install", 45) * totalLF;
    lineItems.push({ name: "Installation", qty: totalLF, unit: "LF", unitCost: n("rate_install", 45), cost, sellPrice: cost / gpDivisor });
  }

  const total = lineItems.reduce((s, li) => s + li.sellPrice, 0);
  return { lineItems, total };
}

// ─── ImageFinishButton ────────────────────────────────────────────────────────
// A cabinet selection button with a thumbnail image and hover popup preview
function ImageFinishButton({
  finishKey,
  label,
  multiplierLabel,
  active,
  onClick,
}: {
  finishKey: string;
  label: string;
  multiplierLabel: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const imgSrc = CABINET_IMAGES[finishKey];

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
          active
            ? "border-canyon bg-canyon/10 shadow-sm"
            : "border-border/40 bg-white hover:border-canyon/50 hover:bg-sandstone/20"
        }`}
      >
        {imgSrc && (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border/30">
            <img
              src={imgSrc}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-body font-medium leading-tight ${active ? "text-canyon" : "text-charcoal"}`}>
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{multiplierLabel}</p>
        </div>
        {active && (
          <svg className="w-4 h-4 text-canyon ml-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Hover popup — larger image preview */}
      {hovered && imgSrc && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl overflow-hidden shadow-2xl border border-border/20 bg-white"
          style={{ width: 260, pointerEvents: "none" }}
        >
          <img
            src={imgSrc}
            alt={label}
            className="w-full h-auto object-cover"
            style={{ maxHeight: 200 }}
          />
          <div className="px-3 py-2 bg-white">
            <p className="text-sm font-semibold text-charcoal">{label}</p>
            <p className="text-xs text-muted-foreground">{multiplierLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UI Component ─────────────────────────────────────────────────────────────
interface Props {
  state: CabinetState;
  onChange: (patch: Partial<CabinetState>) => void;
  config: Record<string, string> | null | undefined;
  markupPct: number;
  formatCurrency: (n: number) => string;
  SectionSlab: React.ComponentType<{ step: number; title: string; delay?: number; children: React.ReactNode }>;
  nextStep: () => number;
}

export function CabinetPricingSection({ state, onChange, config, markupPct, formatCurrency, SectionSlab, nextStep }: Props) {
  const pricing = calcCabinetPricing(state, config, markupPct);

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-body font-medium transition-colors ${
        active ? "bg-canyon text-white" : "bg-sandstone/40 text-charcoal hover:bg-sandstone/70"
      }`}
    >
      {label}
    </button>
  );

  const numInput = (value: string, onChangeVal: (v: string) => void, placeholder: string, label: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-body text-stone-dark">{label}</label>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value}
        onChange={e => onChangeVal(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border/60 text-sm font-body text-charcoal bg-white focus:outline-none focus:border-canyon"
      />
    </div>
  );

  const checkbox = (label: string, checked: boolean, onToggle: () => void, tooltip?: string) => (
    <label key={label} className="flex items-center gap-2.5 cursor-pointer">
      <span
        onClick={onToggle}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? "border-canyon bg-canyon" : "border-border/60 bg-white"
        }`}
      >
        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      <span className="text-sm font-body text-charcoal">{label}</span>
      {tooltip && <InfoTooltip description={tooltip} />}
    </label>
  );

  // Shaker finish options
  const shakerOptions: Array<{ key: ShakerFinishKey; label: string; mult: string }> = [
    { key: "shaker-white",         label: "Shaker White",         mult: "Base price" },
    { key: "shaker-antique-white", label: "Shaker Antique White", mult: "Base price" },
    { key: "shaker-dove",          label: "Shaker Dove",          mult: "Base price" },
    { key: "shaker-grey",          label: "Shaker Grey",          mult: "Base price" },
    { key: "shaker-unfinished",    label: "Shaker Unfinished",    mult: "Base price" },
    { key: "shaker-ivy",           label: "Shaker Ivy",           mult: "Base × 1.10" },
    { key: "shaker-navy",          label: "Shaker Navy",          mult: "Base × 1.10" },
    { key: "shaker-black",         label: "Shaker Black",         mult: "Base × 1.10" },
    { key: "shaker-honey",         label: "Shaker Honey",         mult: "Base × 1.10" },
    { key: "shaker-cinder",        label: "Shaker Cinder",        mult: "Base × 1.10" },
    { key: "shaker-essence-oak",   label: "Shaker Essence Oak",   mult: "Base × 1.16" },
    { key: "shaker-essence-oak-fh",label: "Essence Oak Full-Height", mult: "Base × 1.21" },
  ];

  // Haven finish options
  const havenOptions: Array<{ key: HavenFinishKey; label: string; mult: string }> = [
    { key: "haven-dune",  label: "Haven Dune",  mult: "Base × 1.16" },
    { key: "haven-ember", label: "Haven Ember", mult: "Base × 1.21" },
  ];

  // Woodoo finish options
  const woodooOptions: Array<{ key: WoodooFinishKey; label: string; mult: string }> = [
    { key: "woodoo-white",       label: "Woodoo Frosty White",  mult: "Base price" },
    { key: "woodoo-iron-ore",    label: "Woodoo Iron Black",    mult: "Base × 1.10" },
    { key: "woodoo-premium-oak", label: "Woodoo Premium Oak",   mult: "Base × 1.16" },
    { key: "woodoo-walnut",      label: "Woodoo Walnut",        mult: "Base × 1.21" },
  ];

  return (
    <>
      {/* Step 1: Collection & Finish */}
      <SectionSlab step={nextStep()} title="Cabinet Collection & Finish" delay={0.02}>
        <div className="space-y-5">
          {/* Collection selector */}
          <div>
            <p className="text-xs font-body text-stone-dark mb-2 uppercase tracking-wide font-semibold">Supplier / Collection</p>
            <div className="flex flex-wrap gap-2">
              {pill("US Cabinet Depot — Shaker", state.collection === "shaker", () => onChange({ collection: "shaker" }))}
              {pill("US Cabinet Depot — Haven", state.collection === "haven", () => onChange({ collection: "haven" }))}
              {pill("Woodoo Cabinetry — Shaker", state.collection === "woodoo", () => onChange({ collection: "woodoo" }))}
              {pill("Fully Custom", state.collection === "custom", () => onChange({ collection: "custom" }))}
            </div>
          </div>

          {/* Shaker finish grid */}
          {state.collection === "shaker" && (
            <div>
              <p className="text-xs font-body text-stone-dark mb-3 uppercase tracking-wide font-semibold">Select Shaker Finish</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {shakerOptions.map(opt => (
                  <ImageFinishButton
                    key={opt.key}
                    finishKey={opt.key}
                    label={opt.label}
                    multiplierLabel={opt.mult}
                    active={state.shakerFinish === opt.key}
                    onClick={() => onChange({ shakerFinish: opt.key })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Haven finish grid */}
          {state.collection === "haven" && (
            <div>
              <p className="text-xs font-body text-stone-dark mb-3 uppercase tracking-wide font-semibold">Select Haven Finish</p>
              <div className="grid grid-cols-2 gap-2">
                {havenOptions.map(opt => (
                  <ImageFinishButton
                    key={opt.key}
                    finishKey={opt.key}
                    label={opt.label}
                    multiplierLabel={opt.mult}
                    active={state.havenFinish === opt.key}
                    onClick={() => onChange({ havenFinish: opt.key })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Woodoo finish grid */}
          {state.collection === "woodoo" && (
            <div>
              <p className="text-xs font-body text-stone-dark mb-3 uppercase tracking-wide font-semibold">Select Woodoo Finish</p>
              <div className="grid grid-cols-2 gap-2">
                {woodooOptions.map(opt => (
                  <ImageFinishButton
                    key={opt.key}
                    finishKey={opt.key}
                    label={opt.label}
                    multiplierLabel={opt.mult}
                    active={state.woodooFinish === opt.key}
                    onClick={() => onChange({ woodooFinish: opt.key })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fully Custom — finish selection + cost per LF inputs */}
          {state.collection === "custom" && (
            <div className="space-y-4">
              {/* Finish sub-selection */}
              <div>
                <p className="text-xs font-body text-stone-dark mb-2 uppercase tracking-wide font-semibold">Select Custom Finish</p>
                <div className="flex flex-wrap gap-2">
                  {pill("Painted", state.customFinish === "custom-painted", () => onChange({ customFinish: "custom-painted" }))}
                  {pill("White Oak", state.customFinish === "custom-white-oak", () => onChange({ customFinish: "custom-white-oak" }))}
                  {pill("Walnut", state.customFinish === "custom-walnut", () => onChange({ customFinish: "custom-walnut" }))}
                </div>
              </div>

              {/* Cost per LF inputs for each finish */}
              <div className="rounded-xl border border-canyon/30 bg-canyon/5 px-4 py-4 space-y-4">
                <p className="text-xs font-body text-stone-dark uppercase tracking-wide font-semibold">Custom Cabinet Pricing</p>
                <p className="text-xs text-muted-foreground">Enter the raw cost per linear foot for each finish. The markup % from your cabinet config will be applied to calculate sell prices.</p>

                {([
                  { key: "custom-painted" as CustomFinishKey, label: "Painted", field: "customCostPainted" as const, value: state.customCostPainted },
                  { key: "custom-white-oak" as CustomFinishKey, label: "White Oak", field: "customCostWhiteOak" as const, value: state.customCostWhiteOak },
                  { key: "custom-walnut" as CustomFinishKey, label: "Walnut", field: "customCostWalnut" as const, value: state.customCostWalnut },
                ] as const).map(({ key, label, field, value }) => {
                  const gpDivisor = markupPct >= 1 ? 0.01 : 1 - markupPct;
                  const sellPerLF = parseFloat(value) > 0 ? parseFloat(value) / gpDivisor : null;
                  const isActive = state.customFinish === key;
                  return (
                    <div key={key} className={`flex flex-col gap-1 ${isActive ? "" : "opacity-60"}`}>
                      <label className="text-xs font-body text-stone-dark">{label} — Cost per LF ($)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={value}
                          onChange={e => onChange({ [field]: e.target.value } as Partial<CabinetState>)}
                          placeholder="e.g. 185"
                          className="w-full max-w-xs px-3 py-2 rounded-lg border border-border/60 text-sm font-body text-charcoal bg-white focus:outline-none focus:border-canyon"
                        />
                        {sellPerLF !== null && config && (
                          <span className="text-xs text-charcoal whitespace-nowrap">→ <span className="font-semibold text-canyon">{formatCurrency(sellPerLF)}</span>/LF</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active finish multiplier note — only for non-custom collections */}
          {state.collection !== "custom" && (
            <p className="text-xs text-muted-foreground">
              Active multiplier: <span className="font-semibold text-canyon">{getFinishMultiplier(state).toFixed(2)}×</span> — finish key: <span className="font-mono text-xs">{getActiveFinishKey(state)}</span>
            </p>
          )}
        </div>
      </SectionSlab>

      {/* Step 2: Room type */}
      <SectionSlab step={nextStep()} title="Room Type" delay={0.02}>
        <div className="flex flex-wrap gap-2">
          {pill("Kitchen", state.roomType === "kitchen", () => onChange({ roomType: "kitchen" }))}
          {pill("Bathroom", state.roomType === "bathroom", () => onChange({ roomType: "bathroom" }))}
          {pill("Built-in", state.roomType === "builtin", () => onChange({ roomType: "builtin" }))}
        </div>
      </SectionSlab>

      {/* Step 3: Linear feet */}
      <SectionSlab step={nextStep()} title="Linear Feet of Cabinets" delay={0.02}>
        <div className="grid grid-cols-2 gap-4">
          {(state.roomType === "kitchen" || state.roomType === "builtin") && (
            <>
              {numInput(state.baseLF, v => onChange({ baseLF: v }), "0", "Base Cabinets (LF)")}
              {numInput(state.wallLF, v => onChange({ wallLF: v }), "0", "Wall Cabinets (LF)")}
            </>
          )}
          {state.roomType === "bathroom" && (
            numInput(state.vanityLF, v => onChange({ vanityLF: v }), "0", "Vanity Cabinets (LF)")
          )}
        </div>
      </SectionSlab>

      {/* Step 4: Base type */}
      {(state.roomType === "kitchen" || state.roomType === "builtin" || state.roomType === "bathroom") && (
        <SectionSlab step={nextStep()} title="Base Cabinet Type" delay={0.02}>
          <div className="flex flex-wrap gap-2">
            {pill("Standard", state.baseType === "standard", () => onChange({ baseType: "standard" }))}
            {pill("Full-Height Doors", state.baseType === "fullHeight", () => onChange({ baseType: "fullHeight" }))}
            {pill("Drawer Bases", state.baseType === "drawer", () => onChange({ baseType: "drawer" }))}
            {pill("Specialty", state.baseType === "specialty", () => onChange({ baseType: "specialty" }))}
          </div>
        </SectionSlab>
      )}

      {/* Step 5: Wall height */}
      {(state.roomType === "kitchen" || state.roomType === "builtin") && (
        <SectionSlab step={nextStep()} title="Wall Cabinet Height" delay={0.02}>
          <div className="flex flex-wrap gap-2">
            {pill('30" Uppers (Standard)', state.wallHeight === "30", () => onChange({ wallHeight: "30" }))}
            {pill('36" Uppers', state.wallHeight === "36", () => onChange({ wallHeight: "36" }))}
            {pill('42" Uppers', state.wallHeight === "42", () => onChange({ wallHeight: "42" }))}
            {pill("Stacked Uppers", state.wallHeight === "stacked", () => onChange({ wallHeight: "stacked" }))}
          </div>
          {state.wallHeight === "stacked" && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 mt-2">Stacked uppers should be priced by exact SKU — add an allowance or pull exact pricing separately.</p>
          )}
        </SectionSlab>
      )}

      {/* Step 6: Tall cabinets */}
      <SectionSlab step={nextStep()} title="Tall / Pantry Cabinets" delay={0.02}>
        <div className="grid grid-cols-3 gap-4">
          {numInput(state.tallPantry, v => onChange({ tallPantry: v }), "0", "Pantry Cabinets (qty)")}
          {numInput(state.tallOven, v => onChange({ tallOven: v }), "0", "Oven Cabinets (qty)")}
          {numInput(state.tallLinen, v => onChange({ tallLinen: v }), "0", "Linen Cabinets (qty)")}
        </div>
      </SectionSlab>

      {/* Step 7: Add-ons */}
      <SectionSlab step={nextStep()} title="Add-Ons & Accessories" delay={0.02}>
        <div className="grid grid-cols-2 gap-3">
          {checkbox("Trash Pullout", state.addon_trash, () => onChange({ addon_trash: !state.addon_trash }))}
          {checkbox("Tray Base", state.addon_tray, () => onChange({ addon_tray: !state.addon_tray }))}
          {checkbox("Spice Pullout", state.addon_spice, () => onChange({ addon_spice: !state.addon_spice }))}
          {checkbox("Glass Doors", state.addon_glass, () => onChange({ addon_glass: !state.addon_glass }))}
          {checkbox("Decorative End Panels", state.addon_endPanels, () => onChange({ addon_endPanels: !state.addon_endPanels }))}
          {checkbox("Finished Sides", state.addon_finishedSides, () => onChange({ addon_finishedSides: !state.addon_finishedSides }))}
          {checkbox("Crown / Moulding Package", state.addon_moulding, () => onChange({ addon_moulding: !state.addon_moulding }))}
          {checkbox("Island / Back Panels", state.addon_islandPanels, () => onChange({ addon_islandPanels: !state.addon_islandPanels }))}
        </div>
      </SectionSlab>

      {/* Step 8: Assembly / install */}
      <SectionSlab step={nextStep()} title="Assembly & Installation" delay={0.02}>
        <div className="flex flex-wrap gap-2">
          {pill("Boxes Only (RTA)", state.assembly === "none", () => onChange({ assembly: "none" }))}
          {pill("Assembly Included", state.assembly === "assembly", () => onChange({ assembly: "assembly" }))}
          {pill("Install Included", state.assembly === "install", () => onChange({ assembly: "install" }))}
          {pill("Assembly + Install", state.assembly === "both", () => onChange({ assembly: "both" }))}
        </div>
      </SectionSlab>

      {/* Live cabinet subtotal */}
      {pricing.total > 0 && (
        <div className="rounded-xl border border-canyon/30 bg-canyon/5 px-5 py-4 space-y-2">
          <p className="text-xs font-body text-stone-dark uppercase tracking-wide font-semibold">Cabinet Pricing Subtotal</p>
          {pricing.lineItems.map((li, i) => (
            <div key={i} className="flex items-center justify-between text-sm font-body">
              <span className="text-charcoal">{li.name} {li.qty > 1 && li.unit !== "ea" ? `(${li.qty} ${li.unit})` : ""}</span>
              <span className="text-canyon font-semibold">{formatCurrency(li.sellPrice)}</span>
            </div>
          ))}
          <div className="border-t border-canyon/20 pt-2 flex items-center justify-between font-semibold">
            <span className="text-sm text-charcoal">Cabinet Total</span>
            <span className="text-canyon">{formatCurrency(pricing.total)}</span>
          </div>
        </div>
      )}
    </>
  );
}
