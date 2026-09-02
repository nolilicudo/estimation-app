import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Hammer,
  CircleDot,
  Layers,
  Frame,
  Building2,
  Info,
  Check,
  Zap,
} from "lucide-react";
import type {
  DemolitionOption,
  FootingOption,
  ConcreteOption,
  FramingOption,
  FacadeOption,
  LumberItem,
} from "@/hooks/useConfig";
import { formatCurrency } from "@/lib/utils";
import { LumberPackageCallout } from "@/components/LumberPackageCallout";
import type { HotTubState } from "@/hooks/useCalculator";
import { FramingStructuralSection, type FramingStructuralState } from "@/components/FramingStructuralSection";

export interface DemoRebuildState {
  enabled: boolean;
  // Demolition — multi-select
  needsDemo: boolean;
  selectedDemoOptions: string[];
  demoSqft: number;
  /** Separate sqft for concrete removal (hasSeparateSqft options) */
  concreteDemoSqfts: Record<string, number>; // optionId -> sqft
  // Footings — multi-select
  needsFootings: boolean;
  selectedFootingOptions: string[];
  footingCounts: Record<string, number>; // id -> count
  // Concrete — multi-select
  needsConcrete: boolean;
  selectedConcreteOptions: string[];
  concreteSqfts: Record<string, number>; // id -> sqft
  concreteStepCounts: Record<string, number>; // id -> step count (for "each" unit)
  // Framing — multi-select
  needsFraming: boolean;
  selectedFramingOptions: string[];
  framingSqfts: Record<string, number>; // id -> sqft
  /** Whether the Rainier subfloor option is selected (only applies when collection = rainier) */
  subfloorEnabled: boolean;
  // Facade — multi-select
  needsFacade: boolean;
  selectedFacadeOptions: string[];
  facadeSqfts: Record<string, number>; // id -> sqft

  // Legacy single-select fields (kept for backward compat with useCalculator)
  selectedDemoOption: string;
  demoSqftLegacy?: number;
  selectedFootingOption: string;
  footingCount: number;
  selectedConcreteOption: string;
  concreteSqft: number;
  concreteStepCount: number;
  selectedFramingOption: string;
  framingSqft: number;
  selectedFacadeOption: string;
  facadeSqft: number;
}

export const defaultDemoRebuildState: DemoRebuildState = {
  enabled: false,
  // Multi-select
  needsDemo: false,
  selectedDemoOptions: [],
  demoSqft: 0,
  concreteDemoSqfts: {},
  needsFootings: false,
  selectedFootingOptions: [],
  footingCounts: {},
  needsConcrete: false,
  selectedConcreteOptions: [],
  concreteSqfts: {},
  concreteStepCounts: {},
  needsFraming: false,
  selectedFramingOptions: [],
  framingSqfts: {},
  subfloorEnabled: false,
  needsFacade: false,
  selectedFacadeOptions: [],
  facadeSqfts: {},
  // Legacy
  selectedDemoOption: "",
  selectedFootingOption: "",
  footingCount: 6,
  selectedConcreteOption: "",
  concreteSqft: 0,
  concreteStepCount: 0,
  selectedFramingOption: "",
  framingSqft: 0,
  selectedFacadeOption: "",
  facadeSqft: 0,
};

interface Props {
  state: DemoRebuildState;
  onChange: (state: DemoRebuildState) => void;
  demolitionOptions: DemolitionOption[];
  footingOptions: FootingOption[];
  concreteOptions: ConcreteOption[];
  framingOptions: FramingOption[];
  facadeOptions: FacadeOption[];
  deckSqft: number;
  /** Current collection slug — used to show subfloor option only for Rainier */
  collection?: string;
  // Structural calc state (deck-first, hot tub is additive)
  framingStructural?: FramingStructuralState;
  onFramingStructuralChange?: (partial: Partial<FramingStructuralState>) => void;
  onAutoToggleDemoFraming?: () => void;
  projectAddress?: string;
  lumberItems?: LumberItem[];
  deckWidthFt?: number;
  deckLengthFt?: number;
  // Hot tub for combined load (additive on top of deck structural)
  hotTub?: HotTubState;
  hotTubPsf?: number;
  // Lift threshold settings from useConfig
  liftThreshold1DepthIn?: number;
  liftThreshold2DepthIn?: number;
  liftCost1?: number;
  liftCost2?: number;
}

function SubSection({
  icon: Icon,
  title,
  enabled,
  onToggle,
  children,
}: {
  icon: any;
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-warm-sand/60 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-warm-cream/50 hover:bg-warm-cream transition-colors"
        onClick={() => onToggle(!enabled)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              enabled ? "bg-canyon-rust text-white" : "bg-warm-sand/40 text-charcoal/40"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className={`font-semibold text-sm ${enabled ? "text-charcoal" : "text-charcoal/50"}`}>
            {title}
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {enabled && <div className="px-4 py-4 space-y-4 border-t border-warm-sand/40">{children}</div>}
    </div>
  );
}

function MultiSelectCard({
  selected,
  onClick,
  name,
  description,
  price,
  unit,
}: {
  selected: boolean;
  onClick: () => void;
  name: string;
  description: string;
  price: string;
  unit: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
        selected
          ? "border-canyon-rust bg-canyon-rust/5 shadow-sm"
          : "border-warm-sand/60 hover:border-warm-sand bg-white"
      }`}
    >
      <div className="absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected ? 'bg-canyon-rust border-canyon-rust' : 'border-warm-sand/80 bg-white'}">
        {selected ? (
          <div className="w-5 h-5 rounded bg-canyon-rust border-2 border-canyon-rust flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded border-2 border-warm-sand/80 bg-white" />
        )}
      </div>
      <div className="font-semibold text-sm text-charcoal pr-6">{name}</div>
      <div className="text-xs text-charcoal/60 mt-1 leading-relaxed">{description}</div>
      <div className="mt-2 text-canyon-rust font-bold text-sm">
        {price} <span className="text-xs font-normal text-charcoal/50">/ {unit}</span>
      </div>
    </div>
  );
}

function toggleInArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
}

export function DemoRebuildSection({
  state,
  onChange,
  demolitionOptions,
  footingOptions,
  concreteOptions,
  framingOptions,
  facadeOptions,
  deckSqft,
  collection,
  framingStructural,
  onFramingStructuralChange,
  onAutoToggleDemoFraming,
  projectAddress,
  hotTub,
  hotTubPsf = 0,
  lumberItems,
  deckWidthFt,
  deckLengthFt,
  liftThreshold1DepthIn = 10,
  liftThreshold2DepthIn = 14,
  liftCost1 = 450,
  liftCost2 = 800,
}: Props) {
  const isRainier = collection === "rainier";
  // Determine if framing structural data is available for lumber package
  const framingHasStructuralData = !!(framingStructural?.snowLoadPsf != null && framingStructural?.recommendedJoistSize);
  // Governing joist/beam (hot tub may have upsized them)
  const governingJoistSize = framingStructural?.hotTubAdjustedJoistSize ?? framingStructural?.recommendedJoistSize ?? null;
  const governingBeamSize = framingStructural?.hotTubAdjustedBeamSize ?? framingStructural?.recommendedBeamSize ?? null;
  const update = (partial: Partial<DemoRebuildState>) => {
    onChange({ ...state, ...partial });
  };

  // Toggle handlers for sub-sections
  const toggleDemo = (v: boolean) => {
    update({
      needsDemo: v,
      selectedDemoOptions: v && state.selectedDemoOptions.length === 0 && demolitionOptions.length > 0
        ? [demolitionOptions[0].id]
        : state.selectedDemoOptions,
      demoSqft: v && state.demoSqft === 0 ? deckSqft : state.demoSqft,
    });
  };

  const toggleFootings = (v: boolean) => {
    update({
      needsFootings: v,
      selectedFootingOptions: v && state.selectedFootingOptions.length === 0 && footingOptions.length > 0
        ? [footingOptions[0].id]
        : state.selectedFootingOptions,
      footingCounts: v && Object.keys(state.footingCounts).length === 0 && footingOptions.length > 0
        ? { [footingOptions[0].id]: 6 }
        : state.footingCounts,
    });
  };

  const toggleConcrete = (v: boolean) => {
    update({
      needsConcrete: v,
      selectedConcreteOptions: v && state.selectedConcreteOptions.length === 0 && concreteOptions.length > 0
        ? [concreteOptions[0].id]
        : state.selectedConcreteOptions,
    });
  };

  const toggleFraming = (v: boolean) => {
    update({
      needsFraming: v,
      selectedFramingOptions: v && state.selectedFramingOptions.length === 0 && framingOptions.length > 0
        ? [framingOptions[0].id]
        : state.selectedFramingOptions,
      framingSqfts: v && Object.keys(state.framingSqfts).length === 0 && framingOptions.length > 0
        ? { [framingOptions[0].id]: deckSqft }
        : state.framingSqfts,
    });
  };

  const toggleFacade = (v: boolean) => {
    update({
      needsFacade: v,
      selectedFacadeOptions: v && state.selectedFacadeOptions.length === 0 && facadeOptions.length > 0
        ? [facadeOptions[0].id]
        : state.selectedFacadeOptions,
    });
  };

  // Count selected items for summary
  const selectedDemoCount = state.selectedDemoOptions.length;
  const selectedFootingCount = state.selectedFootingOptions.length;
  const selectedConcreteCount = state.selectedConcreteOptions.length;
  const selectedFramingCount = state.selectedFramingOptions.length;
  const selectedFacadeCount = state.selectedFacadeOptions.length;

  return (
    <div>
      {/* Master toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-charcoal/60 bg-warm-sand/30 px-3 py-1.5 rounded-full">
            <Info className="w-3.5 h-3.5" />
            <span>Does your project need demolition & rebuild work?</span>
          </div>
        </div>
        <Switch
          checked={state.enabled}
          onCheckedChange={(v) => update({ enabled: v })}
        />
      </div>

      {state.enabled && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-body bg-sandstone/30 px-3 py-2 rounded-lg">
            You can select <strong>multiple options</strong> within each category. Each selected option will be added to your total estimate.
          </p>

          {/* ─── Demolition ─── */}
          <SubSection
            icon={Hammer}
            title={`Deck Demolition & Removal${selectedDemoCount > 0 ? ` (${selectedDemoCount} selected)` : ""}`}
            enabled={state.needsDemo}
            onToggle={toggleDemo}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {demolitionOptions.map((opt) => (
                <MultiSelectCard
                  key={opt.id}
                  selected={state.selectedDemoOptions.includes(opt.id)}
                  onClick={() => update({ selectedDemoOptions: toggleInArray(state.selectedDemoOptions, opt.id) })}
                  name={opt.name}
                  description={opt.description}
                  price={formatCurrency(opt.pricePerSqft)}
                  unit="sqft"
                />
              ))}
            </div>

            {/* Shared sqft slider for non-separate-sqft options */}
            {state.selectedDemoOptions.some(id => {
              const opt = demolitionOptions.find(d => d.id === id);
              return opt && !opt.hasSeparateSqft;
            }) && (
              <div className="mt-3 bg-sandstone/20 rounded-lg p-3">
                <Label className="text-xs text-charcoal/60 mb-2 block">
                  Deck / structure area to demolish: <span className="font-bold text-charcoal">{state.demoSqft} sqft</span>
                </Label>
                <Slider
                  value={[state.demoSqft]}
                  onValueChange={([v]) => update({ demoSqft: v })}
                  min={0}
                  max={Math.max(2000, deckSqft * 2)}
                  step={10}
                />
                <div className="flex justify-between text-xs text-charcoal/40 mt-1">
                  <span>0 sqft</span>
                  <button
                    className="text-canyon-rust underline text-xs"
                    onClick={() => update({ demoSqft: deckSqft })}
                  >
                    Match deck size ({deckSqft} sqft)
                  </button>
                  <span>{Math.max(2000, deckSqft * 2)} sqft</span>
                </div>
              </div>
            )}

            {/* Separate sqft slider per option (e.g. concrete removal) */}
            {state.selectedDemoOptions
              .filter(id => {
                const opt = demolitionOptions.find(d => d.id === id);
                return opt?.hasSeparateSqft;
              })
              .map(id => {
                const opt = demolitionOptions.find(d => d.id === id)!;
                const sqft = state.concreteDemoSqfts[id] || 0;
                return (
                  <div key={id} className="mt-3 bg-sandstone/20 rounded-lg p-3">
                    <Label className="text-xs text-charcoal/60 mb-2 block">
                      {opt.name} area: <span className="font-bold text-charcoal">{sqft} sqft</span>
                    </Label>
                    <Slider
                      value={[sqft]}
                      onValueChange={([v]) => update({ concreteDemoSqfts: { ...state.concreteDemoSqfts, [id]: v } })}
                      min={0}
                      max={Math.max(2000, deckSqft * 2)}
                      step={10}
                    />
                    <div className="flex justify-between text-xs text-charcoal/40 mt-1">
                      <span>0 sqft</span>
                      <button
                        className="text-canyon-rust underline text-xs"
                        onClick={() => update({ concreteDemoSqfts: { ...state.concreteDemoSqfts, [id]: deckSqft } })}
                      >
                        Match deck size ({deckSqft} sqft)
                      </button>
                      <span>{Math.max(2000, deckSqft * 2)} sqft</span>
                    </div>
                    {Number(opt.minimumPrice) > 0 && (
                      <p className="text-xs text-charcoal/50 mt-1">
                        Minimum charge: {formatCurrency(Number(opt.minimumPrice))}
                      </p>
                    )}
                  </div>
                );
              })
            }
          </SubSection>

          {/* ─── Post Footings ─── */}
          <SubSection
            icon={CircleDot}
            title={`Post Footings${selectedFootingCount > 0 ? ` (${selectedFootingCount} selected)` : ""}`}
            enabled={state.needsFootings}
            onToggle={toggleFootings}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {footingOptions.map((opt) => (
                <MultiSelectCard
                  key={opt.id}
                  selected={state.selectedFootingOptions.includes(opt.id)}
                  onClick={() => {
                    const newSelected = toggleInArray(state.selectedFootingOptions, opt.id);
                    const newCounts = { ...state.footingCounts };
                    if (!newCounts[opt.id]) newCounts[opt.id] = 6;
                    update({ selectedFootingOptions: newSelected, footingCounts: newCounts });
                  }}
                  name={opt.name}
                  description={opt.description}
                  price={formatCurrency(opt.pricePerUnit)}
                  unit="each"
                />
              ))}
            </div>
            {state.selectedFootingOptions.map(optId => {
              const opt = footingOptions.find(f => f.id === optId);
              if (!opt) return null;
              const count = state.footingCounts[optId] || 6;
              return (
                <div key={optId} className="mt-3 bg-sandstone/20 rounded-lg p-3">
                  <Label className="text-xs text-charcoal/60 mb-2 block">
                    {opt.name} — Number of footings: <span className="font-bold text-charcoal">{count}</span>
                  </Label>
                  <Slider
                    value={[count]}
                    onValueChange={([v]) => update({ footingCounts: { ...state.footingCounts, [optId]: v } })}
                    min={1}
                    max={30}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-charcoal/40 mt-1">
                    <span>1</span>
                    <span className="text-charcoal/50">Typical: 1 per 6-8 ft of beam span</span>
                    <span>30</span>
                  </div>
                </div>
              );
            })}
          </SubSection>

          {/* ─── Concrete Work ─── */}
          <SubSection
            icon={Layers}
            title={`Concrete Work${selectedConcreteCount > 0 ? ` (${selectedConcreteCount} selected)` : ""}`}
            enabled={state.needsConcrete}
            onToggle={toggleConcrete}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {concreteOptions.map((opt) => (
                <MultiSelectCard
                  key={opt.id}
                  selected={state.selectedConcreteOptions.includes(opt.id)}
                  onClick={() => update({ selectedConcreteOptions: toggleInArray(state.selectedConcreteOptions, opt.id) })}
                  name={opt.name}
                  description={opt.description}
                  price={formatCurrency(opt.pricePerUnit)}
                  unit={opt.unit === "each" ? "each" : "sqft"}
                />
              ))}
            </div>
            {state.selectedConcreteOptions.map(optId => {
              const opt = concreteOptions.find(c => c.id === optId);
              if (!opt) return null;
              const isPerEach = opt.unit === "each";
              return (
                <div key={optId} className="mt-3 bg-sandstone/20 rounded-lg p-3">
                  {!isPerEach ? (
                    <div>
                      <Label className="text-xs text-charcoal/60 mb-2 block">
                        {opt.name} area: <span className="font-bold text-charcoal">{state.concreteSqfts[optId] || 0} sqft</span>
                      </Label>
                      <Slider
                        value={[state.concreteSqfts[optId] || 0]}
                        onValueChange={([v]) => update({ concreteSqfts: { ...state.concreteSqfts, [optId]: v } })}
                        min={0}
                        max={500}
                        step={5}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs text-charcoal/60 mb-2 block">
                        {opt.name} — Number of steps: <span className="font-bold text-charcoal">{state.concreteStepCounts[optId] || 0}</span>
                      </Label>
                      <Slider
                        value={[state.concreteStepCounts[optId] || 0]}
                        onValueChange={([v]) => update({ concreteStepCounts: { ...state.concreteStepCounts, [optId]: v } })}
                        min={0}
                        max={20}
                        step={1}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </SubSection>

          {/* ─── Framing ─── */}
          <SubSection
            icon={Frame}
            title={`Deck Framing / Substructure${selectedFramingCount > 0 ? ` (${selectedFramingCount} selected)` : ""}`}
            enabled={state.needsFraming}
            onToggle={toggleFraming}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {framingOptions.map((opt) => (
                <MultiSelectCard
                  key={opt.id}
                  selected={state.selectedFramingOptions.includes(opt.id)}
                  onClick={() => {
                    const newSelected = toggleInArray(state.selectedFramingOptions, opt.id);
                    const newSqfts = { ...state.framingSqfts };
                    if (!newSqfts[opt.id]) newSqfts[opt.id] = deckSqft;
                    update({ selectedFramingOptions: newSelected, framingSqfts: newSqfts });
                  }}
                  name={opt.name}
                  description={opt.description}
                  price={formatCurrency(opt.pricePerSqft)}
                  unit="sqft"
                />
              ))}
            </div>
            {state.selectedFramingOptions.map(optId => {
              const opt = framingOptions.find(f => f.id === optId);
              if (!opt) return null;
              const sqft = state.framingSqfts[optId] || 0;
              return (
                <div key={optId} className="mt-3 bg-sandstone/20 rounded-lg p-3">
                  <Label className="text-xs text-charcoal/60 mb-2 block">
                    {opt.name} area: <span className="font-bold text-charcoal">{sqft} sqft</span>
                  </Label>
                  <Slider
                    value={[sqft]}
                    onValueChange={([v]) => update({ framingSqfts: { ...state.framingSqfts, [optId]: v } })}
                    min={0}
                    max={Math.max(2000, deckSqft * 2)}
                    step={10}
                  />
                  <div className="flex justify-between text-xs text-charcoal/40 mt-1">
                    <span>0 sqft</span>
                    <button
                      className="text-canyon-rust underline text-xs"
                      onClick={() => update({ framingSqfts: { ...state.framingSqfts, [optId]: deckSqft } })}
                    >
                      Match deck size ({deckSqft} sqft)
                    </button>
                    <span>{Math.max(2000, deckSqft * 2)} sqft</span>
                  </div>
                </div>
              );
            })}

            {/* ─── Subfloor Option (Rainier only) ─── */}
            {isRainier && (
              <div className="mt-3 border border-warm-sand/60 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer bg-warm-cream/30 hover:bg-warm-cream/60 transition-colors"
                  onClick={() => update({ subfloorEnabled: !state.subfloorEnabled })}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      state.subfloorEnabled ? "bg-canyon-rust text-white" : "bg-warm-sand/40 text-charcoal/40"
                    }`}>
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className={`font-semibold text-sm ${
                        state.subfloorEnabled ? "text-charcoal" : "text-charcoal/50"
                      }`}>New Subfloor</span>
                      <p className="text-xs text-charcoal/50 mt-0.5">OSB/plywood subfloor sheets for Rainier installation</p>
                    </div>
                  </div>
                  <Switch
                    checked={state.subfloorEnabled}
                    onCheckedChange={(v) => update({ subfloorEnabled: v })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* ─── Structural Framing Specifications ─── */}
            {framingStructural && onFramingStructuralChange ? (
              <FramingStructuralSection
                state={framingStructural}
                onChange={onFramingStructuralChange}
                onAutoToggleDemoFraming={onAutoToggleDemoFraming}
                projectAddress={projectAddress}
                deckWidthFt={deckWidthFt}
                deckLengthFt={deckLengthFt}
                hotTubEnabled={hotTub?.enabled}
                hotTubPersonSize={hotTub?.personSize}
                hotTubPsf={hotTubPsf}
              />
            ) : (
              <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Enter joist span and project address above to auto-generate the structural lumber package.
                </p>
              </div>
            )}

            {/* ─── Lumber Package Callout ─── */}
            {framingHasStructuralData && lumberItems && deckWidthFt && deckLengthFt && framingStructural ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-medium">
                    Structural lumber package auto-configured from framing specs
                    {governingJoistSize && (
                      <span className="font-normal"> &mdash; {governingJoistSize}, {governingBeamSize ?? "beam TBD"}</span>
                    )}
                  </p>
                </div>
                <LumberPackageCallout
                  framingStructural={framingStructural}
                  lumberItems={lumberItems}
                  deckWidthFt={deckWidthFt}
                  deckLengthFt={deckLengthFt}
                  showPricing={true}
                  hotTubEnabled={hotTub?.enabled}
                  hotTubPersonSize={hotTub?.personSize}
                  liftThreshold1DepthIn={liftThreshold1DepthIn}
                  liftThreshold2DepthIn={liftThreshold2DepthIn}
                  liftCost1={liftCost1}
                  liftCost2={liftCost2}
                  onLiftSelectionsChange={(selections) =>
                    onFramingStructuralChange?.({ liftSelections: selections })
                  }
                />
              </div>
            ) : null}
          </SubSection>

          {/* ─── Exterior Facade ─── */}
          <SubSection
            icon={Building2}
            title={`Exterior Facade Repair${selectedFacadeCount > 0 ? ` (${selectedFacadeCount} selected)` : ""}`}
            enabled={state.needsFacade}
            onToggle={toggleFacade}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {facadeOptions.map((opt) => (
                <MultiSelectCard
                  key={opt.id}
                  selected={state.selectedFacadeOptions.includes(opt.id)}
                  onClick={() => {
                    const newSelected = toggleInArray(state.selectedFacadeOptions, opt.id);
                    const newSqfts = { ...state.facadeSqfts };
                    if (!newSqfts[opt.id]) newSqfts[opt.id] = 50;
                    update({ selectedFacadeOptions: newSelected, facadeSqfts: newSqfts });
                  }}
                  name={opt.name}
                  description={opt.description}
                  price={formatCurrency(opt.pricePerSqft)}
                  unit="sqft"
                />
              ))}
            </div>
            {state.selectedFacadeOptions.map(optId => {
              const opt = facadeOptions.find(f => f.id === optId);
              if (!opt) return null;
              const sqft = state.facadeSqfts[optId] || 0;
              return (
                <div key={optId} className="mt-3 bg-sandstone/20 rounded-lg p-3">
                  <Label className="text-xs text-charcoal/60 mb-2 block">
                    {opt.name} area: <span className="font-bold text-charcoal">{sqft} sqft</span>
                  </Label>
                  <Slider
                    value={[sqft]}
                    onValueChange={([v]) => update({ facadeSqfts: { ...state.facadeSqfts, [optId]: v } })}
                    min={0}
                    max={500}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-charcoal/40 mt-1">
                    <span>0 sqft</span>
                    <span className="text-charcoal/50">Area where deck meets house exterior</span>
                    <span>500 sqft</span>
                  </div>
                </div>
              );
            })}
          </SubSection>
        </div>
      )}
    </div>
  );
}
