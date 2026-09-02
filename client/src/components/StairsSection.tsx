import { useState } from "react";
import {
  Minus, Plus, ArrowDown, CheckCircle2, RotateCcw, Layers, Trash2,
  ChevronDown, ChevronUp, Ruler, AlertTriangle, Info, Waves, Square
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiserOption = "standard" | "easy";
export type LandingMaterial = "stone-decking" | "concrete" | "pavers" | "stone" | "composite" | "other" | "none";
export type LandingPosition = "top" | "turn" | "bottom";
export type StairType = "standard" | "spiral" | "landing-turn" | "floating";
export type SpiralDiameter = 60 | 72 | 84 | 96;
export type StairTreadMaterial = "metal-diamond-grate" | "dekton" | "stone-decking" | "resin-rock";
export type FloatingStepMaterial = "steel" | "wood" | "concrete" | "stone" | "composite" | "custom";
export type FloatingStringerType = "steel-c-channel" | "steel-flat-bar" | "wood-timber" | "concrete-wall" | "custom";

/** Tread material options for the priced floating stairs */
export type FloatingTreadMaterial = "cement" | "wood" | "tanzite";

export const FLOATING_TREAD_MATERIAL_OPTIONS: {
  id: FloatingTreadMaterial;
  label: string;
  pricePerTread: number;
  description: string;
}[] = [
  { id: "cement",  label: "Cement",  pricePerTread: 250,  description: "Poured concrete treads" },
  { id: "wood",    label: "Wood",    pricePerTread: 800,  description: "Hardwood or composite treads" },
  { id: "tanzite", label: "Tanzite", pricePerTread: 500,  description: "Tanzite stone decking treads" },
];

export const FLOATING_METALWORK_BASE = 10_000;

/** A single landing platform (top of stairs, mid-turn, or base) */
export interface LandingComponent {
  id: string;
  position: LandingPosition;
  label: string;
  widthFt: number;
  depthFt: number;
  material: LandingMaterial;
  /** True when the landing is part of the stone decking surface (same material as deck) */
  matchesDeck: boolean;
  notes: string;
}

export interface StairCalcResult {
  riserOption: RiserOption;
  riserHeightIn: number;
  stepCount: number;
  totalRunIn: number;
  totalRunFt: number;
}

export interface DeckHeightCalcResult {
  deckHeightIn: number;
  standard: StairCalcResult;
  easy: StairCalcResult;
  warnings: string[];
  hasWarnings: boolean;
}

export interface StairRun {
  id: string;
  label: string;
  stairType: StairType;
  /** Width in feet — supports decimals (e.g. 3.5) */
  stairLength: number;
  stairTreads: number;
  doorwayHeightIn: number;
  selectedRiserOption: RiserOption;
  /** Legacy: simple landing count for backward compat */
  landingCount: number;
  /** Legacy: simple landing material */
  landingMaterial: LandingMaterial;
  needsLanding: boolean;
  /** Phase 4: rich per-landing components */
  landings: LandingComponent[];
  spiralDiameter: SpiralDiameter;
  stairTreadMaterial: StairTreadMaterial;
  // Deck-height calculator
  useDeckHeightCalc: boolean;
  deckHeightFt: number;
  deckHeightInRemainder: number;
  deckHeightCalcOverride: boolean;
  isPreliminary: boolean;
  // Floating stairs
  floatingStepMaterial: FloatingStepMaterial;
  floatingOpenRiserGapIn: number;
  floatingTreadThicknessIn: number;
  floatingTreadDepthIn: number;
  floatingStringerType: FloatingStringerType;
  floatingFinishColor: string;
  floatingMinimalGaps: boolean;
  floatingNotes: string;
  /** Priced tread material for floating stairs */
  floatingTreadMaterial: FloatingTreadMaterial;
}

// ─── Default factories ────────────────────────────────────────────────────────

function makeLanding(position: LandingPosition, index: number): LandingComponent {
  const posLabel: Record<LandingPosition, string> = {
    top: "Top Landing",
    turn: `Turn Landing ${index + 1}`,
    bottom: "Bottom Landing",
  };
  return {
    id: `landing-${Date.now()}-${index}`,
    position,
    label: posLabel[position],
    widthFt: 3,
    depthFt: 3,
    material: "stone-decking",
    matchesDeck: true,
    notes: "",
  };
}

export function makeDefaultStairRun(index: number): StairRun {
  return {
    id: `run-${Date.now()}-${index}`,
    label: `Stair Run ${index + 1}`,
    stairType: "standard",
    stairLength: 4,
    stairTreads: 3,
    doorwayHeightIn: 24,
    selectedRiserOption: "standard",
    landingCount: 1,
    landingMaterial: "none",
    needsLanding: false,
    landings: [],
    spiralDiameter: 60,
    stairTreadMaterial: "metal-diamond-grate",
    useDeckHeightCalc: false,
    deckHeightFt: 0,
    deckHeightInRemainder: 0,
    deckHeightCalcOverride: false,
    isPreliminary: false,
    floatingStepMaterial: "steel",
    floatingOpenRiserGapIn: 4,
    floatingTreadThicknessIn: 2,
    floatingTreadDepthIn: 11,
    floatingStringerType: "steel-c-channel",
    floatingFinishColor: "",
    floatingMinimalGaps: false,
    floatingNotes: "",
    floatingTreadMaterial: "cement",
  };
}

// ─── Stair calculation helpers ────────────────────────────────────────────────

export function calcStairOptions(doorwayHeightIn: number): { standard: StairCalcResult; easy: StairCalcResult } {
  function calc(targetRiserIn: number, opt: RiserOption): StairCalcResult {
    const stepCount = Math.max(1, Math.ceil(doorwayHeightIn / targetRiserIn));
    const riserHeightIn = Math.round((doorwayHeightIn / stepCount) * 100) / 100;
    const totalRunIn = stepCount * 12;
    return { riserOption: opt, riserHeightIn, stepCount, totalRunIn, totalRunFt: Math.round((totalRunIn / 12) * 10) / 10 };
  }
  return { standard: calc(7.25, "standard"), easy: calc(6.25, "easy") };
}

export function calcFromDeckHeight(deckHeightFt: number, deckHeightInRemainder: number): DeckHeightCalcResult {
  const deckHeightIn = deckHeightFt * 12 + deckHeightInRemainder;
  const { standard, easy } = calcStairOptions(deckHeightIn);
  const warnings: string[] = [];
  if (standard.riserHeightIn > 7.75) warnings.push(`Standard riser ${standard.riserHeightIn.toFixed(2)}" exceeds IRC max of 7¾" — use Easy Rise or add a step.`);
  if (easy.riserHeightIn < 4) warnings.push(`Easy Rise riser ${easy.riserHeightIn.toFixed(2)}" is below IRC min of 4".`);
  if (deckHeightIn < 7) warnings.push(`Deck height ${deckHeightIn}" is very low — verify if stairs are needed or a single step-down is sufficient.`);
  if (deckHeightIn > 144) warnings.push(`Deck height over 12 ft — estimate is preliminary until field measurements are verified.`);
  return { deckHeightIn, standard, easy, warnings, hasWarnings: warnings.length > 0 };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANDING_MATERIAL_LABELS: Record<LandingMaterial, string> = {
  "stone-decking": "Stone Decking (match deck)",
  "concrete":      "Concrete pad",
  "pavers":        "Pavers",
  "stone":         "Stone / flagstone",
  "composite":     "Composite decking",
  "other":         "Other",
  "none":          "No material",
};

const LANDING_POSITION_LABELS: Record<LandingPosition, string> = {
  top:    "Top of Stairs",
  turn:   "Mid-Turn",
  bottom: "Bottom of Stairs",
};

const LANDING_POSITION_COLORS: Record<LandingPosition, string> = {
  top:    "bg-blue-50 border-blue-200 text-blue-800",
  turn:   "bg-amber-50 border-amber-200 text-amber-800",
  bottom: "bg-green-50 border-green-200 text-green-800",
};

export const SPIRAL_DIAMETER_OPTIONS: SpiralDiameter[] = [60, 72, 84, 96];
export const STAIR_TREAD_MATERIAL_LABELS: Record<StairTreadMaterial, string> = {
  "metal-diamond-grate": "Metal Diamond Grate",
  "dekton":              "Dekton",
  "stone-decking":       "Stone Decking",
  "resin-rock":          "Resin Rock",
};

export const FLOATING_STEP_MATERIAL_LABELS: Record<FloatingStepMaterial, string> = {
  "steel":     "Steel",
  "wood":      "Wood / Timber",
  "concrete":  "Concrete",
  "stone":     "Stone Slab",
  "composite": "Composite",
  "custom":    "Custom",
};

export const FLOATING_STRINGER_LABELS: Record<FloatingStringerType, string> = {
  "steel-c-channel": "Steel C-Channel",
  "steel-flat-bar":  "Steel Flat Bar",
  "wood-timber":     "Wood Timber",
  "concrete-wall":   "Concrete Wall",
  "custom":          "Custom",
};

const STAIR_TYPE_INFO: Record<StairType, { label: string; description: string; icon: React.ReactNode }> = {
  "standard":     { label: "Standard",       description: "Straight run of steps in a single direction",               icon: <ArrowDown className="w-4 h-4" /> },
  "spiral":       { label: "Spiral",         description: "Circular/spiral staircase — priced as a flat unit",         icon: <RotateCcw className="w-4 h-4" /> },
  "landing-turn": { label: "Landing Turn",   description: "Straight runs connected by flat landings to change direction", icon: <Layers className="w-4 h-4" /> },
  "floating":     { label: "Floating Steps", description: "Open-riser floating steps — pricing placeholder",            icon: <Waves className="w-4 h-4" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWidth(ft: number): string {
  return `${ft} ft (${Math.round(ft * 12)} in)`;
}

// ─── Landing Component Editor ─────────────────────────────────────────────────

interface LandingEditorProps {
  landing: LandingComponent;
  canRemove: boolean;
  onChange: (updated: LandingComponent) => void;
  onRemove: () => void;
}

function LandingEditor({ landing, canRemove, onChange, onRemove }: LandingEditorProps) {
  const upd = (p: Partial<LandingComponent>) => onChange({ ...landing, ...p });
  const sqft = Math.round(landing.widthFt * landing.depthFt * 10) / 10;
  const colorClass = LANDING_POSITION_COLORS[landing.position];

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${colorClass}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="w-3.5 h-3.5 opacity-60" />
          <input
            type="text"
            value={landing.label}
            onChange={e => upd({ label: e.target.value })}
            className="text-sm font-body font-semibold bg-transparent border-0 border-b border-dashed border-current/30 focus:outline-none focus:border-current px-0 w-36"
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60 bg-white/50 rounded px-1.5 py-0.5">
            {LANDING_POSITION_LABELS[landing.position]}
          </span>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="p-1 rounded text-red-500 hover:bg-red-100 transition-colors" title="Remove landing">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-body font-semibold opacity-70 mb-0.5 block">Width (ft)</label>
          <input
            type="number" min={1} max={20} step={0.5}
            value={landing.widthFt}
            onChange={e => upd({ widthFt: Math.max(1, parseFloat(e.target.value) || 3) })}
            className="w-full px-2 py-1 text-sm font-mono border border-current/20 rounded bg-white/60 focus:outline-none focus:ring-1 focus:ring-current/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-body font-semibold opacity-70 mb-0.5 block">Depth (ft)</label>
          <input
            type="number" min={1} max={20} step={0.5}
            value={landing.depthFt}
            onChange={e => upd({ depthFt: Math.max(1, parseFloat(e.target.value) || 3) })}
            className="w-full px-2 py-1 text-sm font-mono border border-current/20 rounded bg-white/60 focus:outline-none focus:ring-1 focus:ring-current/40"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="text-[10px] font-body font-semibold opacity-70 mb-0.5 block">Area</label>
          <div className="px-2 py-1 text-sm font-mono bg-white/40 rounded border border-current/10 text-center">
            {sqft} ft²
          </div>
        </div>
      </div>

      {/* Material */}
      <div>
        <label className="text-[10px] font-body font-semibold opacity-70 mb-1 block">Landing Material</label>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(LANDING_MATERIAL_LABELS) as LandingMaterial[]).filter(m => m !== "none").map(mat => (
            <button
              key={mat}
              onClick={() => upd({ material: mat, matchesDeck: mat === "stone-decking" })}
              className={`py-1 px-2 rounded text-[10px] font-body font-medium text-left transition-colors border ${
                landing.material === mat
                  ? "bg-white/80 border-current/40 font-semibold"
                  : "bg-white/30 border-current/10 hover:bg-white/50"
              }`}
            >
              {LANDING_MATERIAL_LABELS[mat]}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-body font-semibold opacity-70 mb-0.5 block">Notes (optional)</label>
        <input
          type="text"
          placeholder="e.g. existing concrete, match deck color..."
          value={landing.notes}
          onChange={e => upd({ notes: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-current/20 rounded bg-white/60 focus:outline-none focus:ring-1 focus:ring-current/40"
        />
      </div>

      {/* IRC note */}
      {sqft < 9 && (
        <p className="text-[10px] opacity-70">
          IRC R311.7.6: minimum landing is 3'×3' (9 ft²). Current: {sqft} ft² — increase dimensions to meet code.
        </p>
      )}
    </div>
  );
}

// ─── Landings Manager ─────────────────────────────────────────────────────────

interface LandingsManagerProps {
  run: StairRun;
  onChange: (updated: StairRun) => void;
}

function LandingsManager({ run, onChange }: LandingsManagerProps) {
  const upd = (landings: LandingComponent[]) => onChange({ ...run, landings });

  const addLanding = (position: LandingPosition) => {
    const existingOfType = run.landings.filter(l => l.position === position).length;
    upd([...run.landings, makeLanding(position, existingOfType)]);
  };

  const updateLanding = (id: string, updated: LandingComponent) =>
    upd(run.landings.map(l => l.id === id ? updated : l));

  const removeLanding = (id: string) =>
    upd(run.landings.filter(l => l.id !== id));

  const topLandings = run.landings.filter(l => l.position === "top");
  const turnLandings = run.landings.filter(l => l.position === "turn");
  const bottomLandings = run.landings.filter(l => l.position === "bottom");

  const totalSqft = run.landings.reduce((s, l) => s + l.widthFt * l.depthFt, 0);
  const stoneLandings = run.landings.filter(l => l.material === "stone-decking");
  const stoneSqft = stoneLandings.reduce((s, l) => s + l.widthFt * l.depthFt, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body font-semibold text-charcoal text-sm">Landing Platforms</p>
          <p className="text-xs text-muted-foreground">
            Configure each landing separately — top, mid-turn, and bottom. Each has its own dimensions and material.
          </p>
        </div>
        {run.landings.length > 0 && (
          <div className="text-right">
            <p className="text-xs font-mono font-semibold text-charcoal">{Math.round(totalSqft * 10) / 10} ft² total</p>
            {stoneSqft > 0 && <p className="text-[10px] text-muted-foreground">{Math.round(stoneSqft * 10) / 10} ft² stone decking</p>}
          </div>
        )}
      </div>

      {/* Top landings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-body font-semibold text-blue-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Top of Stairs ({topLandings.length})
          </p>
          <button
            onClick={() => addLanding("top")}
            className="text-[10px] font-body font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {topLandings.map(l => (
          <LandingEditor
            key={l.id}
            landing={l}
            canRemove={true}
            onChange={updated => updateLanding(l.id, updated)}
            onRemove={() => removeLanding(l.id)}
          />
        ))}
        {topLandings.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic pl-4">No top landing added. IRC requires a 3'×3' landing at the top of stairs.</p>
        )}
      </div>

      {/* Turn landings — only for landing-turn type */}
      {run.stairType === "landing-turn" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-body font-semibold text-amber-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Mid-Turn Landings ({turnLandings.length})
            </p>
            <button
              onClick={() => addLanding("turn")}
              className="text-[10px] font-body font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Add Turn
            </button>
          </div>
          {turnLandings.map(l => (
            <LandingEditor
              key={l.id}
              landing={l}
              canRemove={true}
              onChange={updated => updateLanding(l.id, updated)}
              onRemove={() => removeLanding(l.id)}
            />
          ))}
          {turnLandings.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic pl-4">No turn landings added. Add one for each direction change in this stair run.</p>
          )}
        </div>
      )}

      {/* Bottom landings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-body font-semibold text-green-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Bottom of Stairs ({bottomLandings.length})
          </p>
          <button
            onClick={() => addLanding("bottom")}
            className="text-[10px] font-body font-semibold text-green-600 hover:text-green-800 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {bottomLandings.map(l => (
          <LandingEditor
            key={l.id}
            landing={l}
            canRemove={true}
            onChange={updated => updateLanding(l.id, updated)}
            onRemove={() => removeLanding(l.id)}
          />
        ))}
        {bottomLandings.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic pl-4">No bottom landing added. IRC requires a 3'×3' landing at the base of stairs.</p>
        )}
      </div>

      {/* Quick-add presets */}
      {run.landings.length === 0 && (
        <div className="border-2 border-dashed border-border/40 rounded-lg p-3 space-y-2">
          <p className="text-xs font-body text-muted-foreground text-center">Quick-add common configurations:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => {
                upd([makeLanding("top", 0), makeLanding("bottom", 0)]);
              }}
              className="text-xs font-body font-semibold text-charcoal border border-border rounded-md px-3 py-1.5 hover:bg-sandstone transition-colors"
            >
              Top + Bottom (standard)
            </button>
            <button
              onClick={() => {
                upd([makeLanding("top", 0), makeLanding("turn", 0), makeLanding("bottom", 0)]);
              }}
              className="text-xs font-body font-semibold text-charcoal border border-border rounded-md px-3 py-1.5 hover:bg-sandstone transition-colors"
            >
              Top + 1 Turn + Bottom
            </button>
            <button
              onClick={() => {
                upd([makeLanding("bottom", 0)]);
              }}
              className="text-xs font-body font-semibold text-charcoal border border-border rounded-md px-3 py-1.5 hover:bg-sandstone transition-colors"
            >
              Bottom only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single run editor ────────────────────────────────────────────────────────

interface StairRunEditorProps {
  run: StairRun;
  index: number;
  canRemove: boolean;
  onChange: (updated: StairRun) => void;
  onRemove: () => void;
}

function StairRunEditor({ run, index, canRemove, onChange, onRemove }: StairRunEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const update = (partial: Partial<StairRun>) => onChange({ ...run, ...partial });

  const dhCalc = run.useDeckHeightCalc
    ? calcFromDeckHeight(run.deckHeightFt, run.deckHeightInRemainder)
    : null;

  const effectiveSteps = run.useDeckHeightCalc && !run.deckHeightCalcOverride && dhCalc
    ? dhCalc[run.selectedRiserOption].stepCount
    : run.stairTreads;

  const totalLandingSqft = run.landings.reduce((s, l) => s + l.widthFt * l.depthFt, 0);

  return (
    <div className="border-2 border-border rounded-xl overflow-hidden">
      {/* Run header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-sandstone/40 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4 text-charcoal/60" /> : <ChevronDown className="w-4 h-4 text-charcoal/60" />}
          <input
            type="text"
            value={run.label}
            onClick={e => e.stopPropagation()}
            onChange={e => update({ label: e.target.value })}
            className="font-body font-semibold text-charcoal text-sm bg-transparent border-0 border-b border-dashed border-charcoal/30 focus:outline-none focus:border-canyon px-0 w-40"
          />
          {!expanded && (
            <span className="text-xs text-muted-foreground">
              {run.stairType === "spiral"
                ? `Spiral ${run.spiralDiameter}"`
                : run.stairType === "floating"
                ? `Floating, ${formatWidth(run.stairLength)}`
                : `${effectiveSteps} treads, ${formatWidth(run.stairLength)}${totalLandingSqft > 0 ? `, ${run.landings.length} landing${run.landings.length !== 1 ? "s" : ""}` : ""}`}
            </span>
          )}
          {run.isPreliminary && (
            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-semibold">PRELIMINARY</span>
          )}
        </div>
        {canRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Remove this stair run"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-5">
          {/* Stair Type */}
          <div>
            <label className="font-body font-semibold text-charcoal text-sm mb-2 block">Stair Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(STAIR_TYPE_INFO) as StairType[]).map(type => {
                const info = STAIR_TYPE_INFO[type];
                const isSelected = run.stairType === type;
                return (
                  <button key={type} onClick={() => update({ stairType: type })}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${isSelected ? "border-canyon bg-canyon/5" : "border-border hover:border-canyon/50 bg-white"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={isSelected ? "text-canyon" : "text-charcoal/60"}>{info.icon}</span>
                      <span className={`text-sm font-body font-bold ${isSelected ? "text-canyon" : "text-charcoal"}`}>{info.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-canyon ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating stairs */}
          {run.stairType === "floating" && (
            <div className="space-y-4">
              {/* Pricing breakdown banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-900">Floating Stairs Pricing</p>
                <p className="text-xs text-amber-800">
                  $10,000 metalwork base &nbsp;+&nbsp; tread material cost per step
                </p>
                {(() => {
                  const treadOpt = FLOATING_TREAD_MATERIAL_OPTIONS.find(o => o.id === run.floatingTreadMaterial)!;
                  const total = FLOATING_METALWORK_BASE + run.stairTreads * treadOpt.pricePerTread;
                  return (
                    <p className="text-xs font-bold text-amber-900">
                      Estimated total: ${total.toLocaleString()} ({run.stairTreads} treads × ${treadOpt.pricePerTread.toLocaleString()} + $10,000)
                    </p>
                  );
                })()}
              </div>

              {/* Tread material picker */}
              <div>
                <label className="font-body font-semibold text-charcoal text-sm mb-2 block">Tread Material</label>
                <div className="grid grid-cols-3 gap-2">
                  {FLOATING_TREAD_MATERIAL_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => update({ floatingTreadMaterial: opt.id })}
                      className={`py-3 px-3 rounded-lg border-2 text-left transition-colors ${
                        run.floatingTreadMaterial === opt.id
                          ? "border-canyon bg-canyon/5"
                          : "border-border hover:border-canyon/50 hover:bg-sandstone"
                      }`}
                    >
                      <div className={`text-sm font-semibold font-body ${run.floatingTreadMaterial === opt.id ? "text-canyon" : "text-charcoal"}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                      <div className={`text-xs font-bold mt-1 ${run.floatingTreadMaterial === opt.id ? "text-canyon" : "text-charcoal"}`}>
                        ${opt.pricePerTread.toLocaleString()}/tread
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-body font-semibold text-charcoal text-xs mb-1 block">Notes (optional)</label>
                <textarea rows={2} placeholder="Finish color, special details, etc."
                  value={run.floatingNotes}
                  onChange={e => update({ floatingNotes: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-canyon resize-none" />
              </div>
            </div>
          )}

          {/* Spiral configuration */}
          {run.stairType === "spiral" && (
            <div className="space-y-4">
              <div>
                <label className="font-body font-semibold text-charcoal text-sm mb-1 block">Spiral Stair Diameter</label>
                <div className="grid grid-cols-4 gap-2">
                  {SPIRAL_DIAMETER_OPTIONS.map(dia => (
                    <button key={dia} onClick={() => update({ spiralDiameter: dia })}
                      className={`py-2 px-3 rounded-md border-2 text-sm font-body font-semibold transition-colors ${run.spiralDiameter === dia ? "border-canyon bg-canyon/5 text-canyon" : "border-border text-charcoal hover:border-canyon/50"}`}>
                      {dia}"
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-body font-semibold text-charcoal text-sm mb-1 block">Tread Material</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STAIR_TREAD_MATERIAL_LABELS) as StairTreadMaterial[]).map(mat => (
                    <button key={mat} onClick={() => update({ stairTreadMaterial: mat })}
                      className={`py-2 px-3 rounded-md border text-xs font-body font-medium transition-colors text-left ${run.stairTreadMaterial === mat ? "bg-canyon text-white border-canyon" : "border-border text-charcoal hover:border-canyon/60 hover:bg-sandstone"}`}>
                      {STAIR_TREAD_MATERIAL_LABELS[mat]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">Spiral stairs are priced as a flat unit based on diameter and tread material.</p>
              </div>
            </div>
          )}

          {/* Landing count (landing-turn — legacy count kept for pricing compat) */}
          {run.stairType === "landing-turn" && (
            <div>
              <label className="font-body font-semibold text-charcoal text-sm mb-1 block">Number of Direction Changes</label>
              <p className="text-xs font-body text-muted-foreground mb-2">How many times does the stair run change direction? (Each change = one mid-turn landing)</p>
              <div className="flex items-center gap-3">
                <button onClick={() => update({ landingCount: Math.max(1, run.landingCount - 1) })}
                  className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <input type="number" value={run.landingCount} min={1} max={6}
                  onChange={e => update({ landingCount: Math.max(1, Math.min(6, parseInt(e.target.value) || 1)) })}
                  className="w-20 text-center text-lg font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40" />
                <button onClick={() => update({ landingCount: Math.min(6, run.landingCount + 1) })}
                  className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm font-body text-muted-foreground">turn{run.landingCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}

          {/* Deck-height calculator */}
          {run.stairType !== "spiral" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body font-semibold text-charcoal text-sm flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-canyon" />
                    Calculate from Deck Height
                  </p>
                  <p className="text-xs text-muted-foreground">Enter finished deck height to auto-calculate risers and treads</p>
                </div>
                <input type="checkbox" checked={run.useDeckHeightCalc}
                  onChange={e => update({ useDeckHeightCalc: e.target.checked, deckHeightCalcOverride: false })}
                  className="w-5 h-5 accent-canyon cursor-pointer" />
              </div>
              {run.useDeckHeightCalc && (
                <div className="pl-3 border-l-2 border-canyon/20 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="text-xs font-body text-muted-foreground mb-1 block">Feet</label>
                      <input type="number" min={0} max={20} step={1}
                        value={run.deckHeightFt}
                        onChange={e => update({ deckHeightFt: Math.max(0, parseInt(e.target.value) || 0), deckHeightCalcOverride: false })}
                        className="w-20 text-center text-base font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40" />
                    </div>
                    <div>
                      <label className="text-xs font-body text-muted-foreground mb-1 block">Inches</label>
                      <input type="number" min={0} max={11} step={1}
                        value={run.deckHeightInRemainder}
                        onChange={e => update({ deckHeightInRemainder: Math.max(0, Math.min(11, parseInt(e.target.value) || 0)), deckHeightCalcOverride: false })}
                        className="w-20 text-center text-base font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40" />
                    </div>
                    {dhCalc && <div className="text-xs text-muted-foreground">= {dhCalc.deckHeightIn}" total</div>}
                  </div>
                  {dhCalc?.hasWarnings && dhCalc.warnings.map((w, i) => (
                    <div key={i} className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">{w}</p>
                    </div>
                  ))}
                  {dhCalc && dhCalc.deckHeightIn > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-body font-semibold text-charcoal">Recommended Configurations</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["standard", "easy"] as RiserOption[]).map(opt => {
                          const r = dhCalc[opt];
                          const isSelected = run.selectedRiserOption === opt;
                          return (
                            <button key={opt} onClick={() => update({ selectedRiserOption: opt, deckHeightCalcOverride: false })}
                              className={`p-3 rounded-lg border-2 text-left transition-colors ${isSelected ? "border-canyon bg-canyon/5" : "border-border hover:border-canyon/40"}`}>
                              <p className={`text-xs font-bold mb-1 ${isSelected ? "text-canyon" : "text-charcoal"}`}>{opt === "standard" ? "Standard Rise" : "Easy Rise"}</p>
                              <p className="text-xs text-muted-foreground">{r.stepCount} steps</p>
                              <p className="text-xs text-muted-foreground">{r.riserHeightIn}" riser · {r.totalRunFt}' run</p>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={run.deckHeightCalcOverride}
                          onChange={e => update({ deckHeightCalcOverride: e.target.checked })}
                          className="w-4 h-4 accent-canyon cursor-pointer" />
                        <label className="text-xs font-body text-charcoal">Override calculated step count manually</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={run.isPreliminary}
                          onChange={e => update({ isPreliminary: e.target.checked })}
                          className="w-4 h-4 accent-amber-500 cursor-pointer" />
                        <label className="text-xs font-body text-charcoal">Mark as preliminary (pending field measurement)</label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual step count */}
          {run.stairType !== "spiral" && run.stairType !== "floating" && (!run.useDeckHeightCalc || run.deckHeightCalcOverride) && (
            <div>
              <label className="font-body font-semibold text-charcoal text-sm mb-1 block">
                Number of Stairs {run.deckHeightCalcOverride && <span className="text-xs text-amber-600 font-normal">(manual override)</span>}
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => update({ stairTreads: Math.max(1, run.stairTreads - 1) })}
                  className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <input type="number" value={run.stairTreads} min={1} max={40}
                  onChange={e => update({ stairTreads: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-24 text-center text-lg font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40" />
                <button onClick={() => update({ stairTreads: run.stairTreads + 1 })}
                  className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm font-body text-muted-foreground">steps</span>
              </div>
            </div>
          )}

          {/* Stair width */}
          <div>
            <label className="font-body font-semibold text-charcoal text-sm mb-2 block">Stair Width</label>
            <p className="text-xs font-body text-muted-foreground mb-2">
              Minimum 3'. Decimals accepted (e.g. 3.5'). Base price covers up to 4'; extra per-LF charge applies beyond 4'.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => update({ stairLength: Math.max(3, Math.round((run.stairLength - 0.5) * 10) / 10) })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <input type="number" value={run.stairLength} min={3} step={0.5}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) update({ stairLength: Math.max(3, v) }); }}
                className="w-24 text-center text-lg font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40" />
              <button onClick={() => update({ stairLength: Math.round((run.stairLength + 0.5) * 10) / 10 })}
                className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors">
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm font-body text-muted-foreground">ft wide</span>
              <span className="text-xs text-muted-foreground bg-sandstone/60 px-2 py-0.5 rounded">= {Math.round(run.stairLength * 12)} in</span>
              {run.stairLength > 4 && (
                <span className="text-xs text-canyon font-body font-semibold bg-canyon/10 px-2 py-0.5 rounded">
                  +{Math.round((run.stairLength - 4) * 10) / 10} LF over 4'
                </span>
              )}
            </div>
            {run.stairLength < 3 && <p className="text-xs text-red-600 mt-1">IRC R311.7.1 requires minimum 36" (3') stair width.</p>}
          </div>

          {/* Summary card */}
          {run.stairType !== "spiral" && run.stairType !== "floating" && (
            <div className="p-3 rounded-lg bg-sandstone/60 border border-border">
              <p className="text-xs font-body font-semibold text-charcoal mb-1">Stair Summary</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-charcoal">{effectiveSteps}</p>
                  <p className="text-xs text-muted-foreground">steps</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal">{run.stairLength}'</p>
                  <p className="text-xs text-muted-foreground">wide ({Math.round(run.stairLength * 12)} in)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal">{run.landings.length > 0 ? `${run.landings.length}` : "—"}</p>
                  <p className="text-xs text-muted-foreground">landings</p>
                </div>
              </div>
              {run.stairType === "landing-turn" && run.landingCount > 0 && (
                <div className="mt-2 pt-2 border-t border-border/40 text-center">
                  <p className="text-xs text-muted-foreground">
                    {run.landingCount} direction {run.landingCount === 1 ? "change" : "changes"}
                    {totalLandingSqft > 0 ? ` · ${Math.round(totalLandingSqft * 10) / 10} ft² landing area` : ""}
                  </p>
                </div>
              )}
              {effectiveSteps > 10 && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <strong>Center support required</strong> — stairs over 10 treads need a doubled stringer beam with posts and footings.
                  </p>
                </div>
              )}
              {run.isPreliminary && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <strong>Preliminary estimate</strong> — verify with field measurements before finalizing.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Phase 4: Landings Manager ── */}
          {run.stairType !== "spiral" && (
            <div className="border-t border-border/30 pt-4">
              <LandingsManager run={run} onChange={onChange} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main StairsSection ───────────────────────────────────────────────────────

interface StairsSectionProps {
  stairRuns: StairRun[];
  onStairRunsChange: (runs: StairRun[]) => void;
  existingDeckMode?: boolean;
}

export function StairsSection({ stairRuns, onStairRunsChange, existingDeckMode }: StairsSectionProps) {
  const hasStairs = stairRuns.length > 0;

  const handleToggle = (enabled: boolean) => {
    onStairRunsChange(enabled ? [makeDefaultStairRun(0)] : []);
  };

  const handleAddRun = () => {
    onStairRunsChange([...stairRuns, makeDefaultStairRun(stairRuns.length)]);
  };

  const handleRemoveRun = (index: number) => {
    onStairRunsChange(stairRuns.filter((_, i) => i !== index));
  };

  const handleUpdateRun = (index: number, updated: StairRun) => {
    onStairRunsChange(stairRuns.map((r, i) => i === index ? updated : r));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body font-semibold text-charcoal text-sm">
            {existingDeckMode ? "Stair Addition Details" : "Does your project include stairs?"}
          </p>
          <p className="font-body text-muted-foreground text-xs mt-0.5">
            {existingDeckMode
              ? "Configure the stair runs being added to the existing deck."
              : "Add stair runs for multi-level decks. Each run has its own type, width, and landing configuration."}
          </p>
        </div>
        {!existingDeckMode && (
          <input type="checkbox" checked={hasStairs}
            onChange={e => handleToggle(e.target.checked)}
            className="w-5 h-5 accent-canyon cursor-pointer" />
        )}
      </div>

      {(hasStairs || existingDeckMode) && (
        <div className="space-y-4">
          {stairRuns.map((run, index) => (
            <StairRunEditor
              key={run.id}
              run={run}
              index={index}
              canRemove={stairRuns.length > 1 || !!existingDeckMode}
              onChange={updated => handleUpdateRun(index, updated)}
              onRemove={() => handleRemoveRun(index)}
            />
          ))}
          <button
            onClick={handleAddRun}
            className="w-full py-3 border-2 border-dashed border-canyon/40 rounded-xl text-sm font-body font-semibold text-canyon hover:border-canyon hover:bg-canyon/5 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Stair Run
          </button>
          {stairRuns.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">{stairRuns.length} stair runs — costs are summed in the estimate</p>
          )}
        </div>
      )}

      {existingDeckMode && stairRuns.length === 0 && (
        <button onClick={handleAddRun}
          className="w-full py-3 border-2 border-dashed border-canyon/40 rounded-xl text-sm font-body font-semibold text-canyon hover:border-canyon hover:bg-canyon/5 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add Stair Run
        </button>
      )}
    </div>
  );
}
