/**
 * FramingStructuralSection
 *
 * Structural engineering inputs for the deck framing:
 *   - Joist span (post-to-post)
 *   - Project address → USU snow load lookup
 *   - Post spacing priority (minimize cost vs minimize posts)
 *   - Cantilever bay-out toggle + length
 *   - Joist and beam recommendations
 *
 * This section is shown inside the Framing sub-section of Demo & Rebuild.
 * When a hot tub is also enabled, the hot tub PSF is added on top and the
 * recommendations are re-run with the combined load.
 */

import { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  ThumbsDown,
  ThumbsUp,
  Thermometer,
  Info,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  recommendBeamHierarchy,
  recommendJoistOptions,
  type BeamRecommendation,
} from "@/components/HotTubSection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FramingStructuralState {
  joistSpanFt: number;
  address: string;
  snowLoadPsf: number | null;
  snowLoadFetching: boolean;
  snowLoadError: string | null;
  recommendedJoistSize: string | null; // base deck (no hot tub)
  recommendedBeamSize: string | null;  // base deck (no hot tub)
  // With hot tub combined load (null when hot tub disabled)
  hotTubAdjustedJoistSize: string | null;
  hotTubAdjustedBeamSize: string | null;
  joistVerified: boolean;
  hasCantilever: boolean;
  cantileverLengthFt: number;
  postPriority: "minimize-posts" | "minimize-cost";
  postSpacingFt: number;
  /**
   * Per-item lift selections: key = item slug/name, value = 0 (no lift), 1 (1 lift), 2 (2 lifts).
   * When undefined the auto-suggested value from the threshold settings applies.
   */
  liftSelections: Record<string, 0 | 1 | 2>;
  /**
   * Existing deck replacement: when true, the deck is being rebuilt in the same
   * footprint and the existing post footings are being reused. The user specifies
   * the existing post spacing, which constrains the beam sizing (beam must span
   * the existing post spacing rather than the optimized spacing).
   */
  isExistingDeckReplacement: boolean;
  existingPostSpacingFt: number; // ft, only used when isExistingDeckReplacement = true
}

export const defaultFramingStructuralState: FramingStructuralState = {
  joistSpanFt: 12,
  address: "",
  snowLoadPsf: null,
  snowLoadFetching: false,
  snowLoadError: null,
  recommendedJoistSize: null,
  recommendedBeamSize: null,
  hotTubAdjustedJoistSize: null,
  hotTubAdjustedBeamSize: null,
  joistVerified: true,
  hasCantilever: false,
  cantileverLengthFt: 2,
  postPriority: "minimize-cost",
  postSpacingFt: 8,
  liftSelections: {},
  isExistingDeckReplacement: false,
  existingPostSpacingFt: 8,
};

// ─── Engineering constants (fallback) ─────────────────────────────────────────

const FALLBACK_JOIST_SPANS: { size: string; maxSpanFt: number; spacingIn?: number; loadFactorMin?: number; loadFactorMax?: number }[] = [
  { size: "2x6",  maxSpanFt: 8.67  },
  { size: "2x8",  maxSpanFt: 11.08 },
  { size: "2x10", maxSpanFt: 13.58 },
  { size: "2x12", maxSpanFt: 15.75 },
];

// Snow load adjustment factor for joist sizing
function getSnowLoadFactor(snowLoadPsf: number): number {
  const totalPsf = (snowLoadPsf + 10) * 1.307;
  return totalPsf / 50;
}

// Recommend joist for base deck load (snow only, no hot tub)
function recommendJoistForDeck(
  spanFt: number,
  snowLoadPsf: number | null,
  joistSpans: typeof FALLBACK_JOIST_SPANS
): { spacing12: string; spacing16: string } {
  // For base deck, use a simplified PSF (no hot tub load)
  // Standard deck live load = 40 psf + snow
  const snowFactor = snowLoadPsf != null ? getSnowLoadFactor(snowLoadPsf) : 1.0;

  // Find adequate joist for each spacing
  function findForSpacing(spacingIn: 12 | 16): string {
    const rows = joistSpans.filter(j => j.spacingIn === spacingIn);
    if (rows.length === 0) {
      // No spacing-specific rows — use generic span table
      const generic = joistSpans.filter(j => j.spacingIn == null || j.spacingIn === undefined);
      const base = generic.find(j => j.maxSpanFt >= spanFt) ?? generic[generic.length - 1];
      if (!base) return "2x10";
      if (snowFactor >= 2.0) {
        const idx = generic.indexOf(base);
        const upsized = generic[Math.min(idx + 2, generic.length - 1)];
        return `${upsized.size} doubled`;
      } else if (snowFactor >= 1.5) {
        const idx = generic.indexOf(base);
        const upsized = generic[Math.min(idx + 1, generic.length - 1)];
        return `${upsized.size} doubled`;
      } else if (snowFactor >= 1.3) {
        const idx = generic.indexOf(base);
        const upsized = generic[Math.min(idx + 1, generic.length - 1)];
        return upsized.size;
      }
      return base.size;
    }

    // Use spacing-specific rows with load factor bands
    const candidates = rows.filter(j =>
      j.maxSpanFt >= spanFt &&
      (j.loadFactorMin == null || snowFactor >= j.loadFactorMin) &&
      (j.loadFactorMax == null || snowFactor <= j.loadFactorMax)
    );
    if (candidates.length > 0) {
      const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];
      return candidates.sort((a, b) => JOIST_ORDER.indexOf(a.size) - JOIST_ORDER.indexOf(b.size))[0].size;
    }
    const spanOk = rows.filter(j => j.maxSpanFt >= spanFt);
    if (spanOk.length > 0) {
      const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];
      return spanOk.sort((a, b) => JOIST_ORDER.indexOf(b.size) - JOIST_ORDER.indexOf(a.size))[0].size;
    }
    return "2x12";
  }

  const s12 = findForSpacing(12);
  const s16 = findForSpacing(16);
  return { spacing12: s12, spacing16: s16 };
}

// ─── Beam type badge ──────────────────────────────────────────────────────────

function BeamTypeBadge({ type }: { type: "dimensional" | "lvl" | "glulam" }) {
  const cfg = {
    dimensional: { label: "Dimensional Lumber", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
    lvl:         { label: "LVL",                bg: "bg-blue-100",  text: "text-blue-800",  border: "border-blue-300"  },
    glulam:      { label: "Glulam",             bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  }[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FramingStructuralSectionProps {
  state: FramingStructuralState;
  onChange: (updated: Partial<FramingStructuralState>) => void;
  onAutoToggleDemoFraming?: () => void;
  projectAddress?: string;
  deckWidthFt?: number;
  deckLengthFt?: number;
  // Hot tub data for combined load calculation
  hotTubEnabled?: boolean;
  hotTubPersonSize?: number;
  hotTubPsf?: number; // psf from hot tub data table
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FramingStructuralSection({
  state,
  onChange,
  onAutoToggleDemoFraming,
  projectAddress,
  deckWidthFt = 12,
  deckLengthFt = 16,
  hotTubEnabled = false,
  hotTubPersonSize = 6,
  hotTubPsf = 0,
}: FramingStructuralSectionProps) {
  const [showCantileverInfo, setShowCantileverInfo] = useState(false);
  const [beamRec, setBeamRec] = useState<BeamRecommendation | null>(null);
  const [joistOptions, setJoistOptions] = useState<{ spacing12: string; spacing16: string } | null>(null);
  const [hotTubBeamRec, setHotTubBeamRec] = useState<BeamRecommendation | null>(null);
  const [hotTubJoistOptions, setHotTubJoistOptions] = useState<{ spacing12: string; spacing16: string } | null>(null);
  const [cantileverBeamRec, setCantileverBeamRec] = useState<BeamRecommendation | null>(null);

  // Sync address from project address field
  const effectiveAddress = state.address || projectAddress || "";

  // Fetch DB-driven structural tables
  const { data: structuralTables } = trpc.config.getStructuralTables.useQuery();

  // Build joist span array from DB or fallback
  const joistSpans = useMemo(() => {
    if (structuralTables?.joistSpans?.length) {
      return structuralTables.joistSpans
        .filter((r) => r.isActive)
        .map((r) => ({
          size: r.joistSize,
          maxSpanFt: parseFloat(String(r.maxSpanFt)),
          spacingIn: r.spacingIn ?? 16,
          loadFactorMin: r.loadFactorMin != null ? parseFloat(String(r.loadFactorMin)) : undefined,
          loadFactorMax: r.loadFactorMax != null ? parseFloat(String(r.loadFactorMax)) : undefined,
        }))
        .sort((a, b) => a.spacingIn! - b.spacingIn! || a.maxSpanFt - b.maxSpanFt);
    }
    return FALLBACK_JOIST_SPANS;
  }, [structuralTables]);

  // Build LVL beam table from DB
  const lvlBeamRows = useMemo(() => {
    if (structuralTables?.lvlBeams?.length) {
      return structuralTables.lvlBeams
        .filter((r) => r.isActive)
        .map((r) => ({
          maxSpan: parseFloat(String(r.maxPostSpacingFt)),
          maxPlf: parseFloat(String(r.maxPlf)),
          size: r.beamSize,
          isDouble: !!r.isDouble,
        }))
        .sort((a, b) => a.maxPlf - b.maxPlf);
    }
    return null;
  }, [structuralTables]);

  // Build glulam beam table from DB
  const glulamBeamRows = useMemo(() => {
    if ((structuralTables as any)?.glulamBeams?.length) {
      return (structuralTables as any).glulamBeams
        .filter((r: any) => r.isActive)
        .map((r: any) => ({
          widthIn: parseFloat(String(r.widthIn)),
          depthIn: parseFloat(String(r.depthIn)),
          spanFt: r.spanFt,
          maxPlfFloor: r.maxPlfFloor,
          maxPlfSnow: r.maxPlfSnow,
        }));
    }
    return null;
  }, [structuralTables]);

  // Build hot tub data map from DB
  const hotTubDataMap = useMemo(() => {
    if (structuralTables?.hotTubWeights?.length) {
      const map: Record<number, { weightLb: number; areaSqft: number; psf: number }> = {};
      for (const row of structuralTables.hotTubWeights) {
        if (row.isActive) {
          map[row.persons] = {
            weightLb: row.weightLb,
            areaSqft: parseFloat(String(row.footprintSqft)),
            psf: parseFloat(String(row.psf)),
          };
        }
      }
      return map;
    }
    return {
      2: { weightLb: 1500, areaSqft: 20, psf: 75 },
      3: { weightLb: 2000, areaSqft: 25, psf: 80 },
      4: { weightLb: 2500, areaSqft: 30, psf: 83 },
      5: { weightLb: 3000, areaSqft: 32, psf: 94 },
      6: { weightLb: 3500, areaSqft: 36, psf: 97 },
      7: { weightLb: 4000, areaSqft: 40, psf: 100 },
      8: { weightLb: 4500, areaSqft: 45, psf: 100 },
      9: { weightLb: 5000, areaSqft: 48, psf: 104 },
      10: { weightLb: 5500, areaSqft: 52, psf: 105 },
    };
  }, [structuralTables]);

  const tributaryWidthFt = state.joistSpanFt / 2;

  const lookupSnowLoad = trpc.snowLoad.lookup.useMutation();

  // Post spacing optimizer
  const computeOptimalPostSpacing = useCallback((
    tributaryFt: number,
    snowPsf: number | null,
    priority: "minimize-posts" | "minimize-cost"
  ): number => {
    const spacingsToTry = [20, 18, 16, 14, 12, 10, 8, 6, 4];
    if (priority === "minimize-posts") {
      for (const spacing of spacingsToTry) {
        const rec = recommendBeamHierarchy(spacing, tributaryFt, snowPsf, lvlBeamRows, glulamBeamRows);
        if (rec.capacityPlf > 0 || rec.beamType !== "glulam" || !rec.size.includes("ENGINEER")) {
          return spacing;
        }
      }
      return 8;
    } else {
      const postCostApprox = 150;
      const beamAt8 = recommendBeamHierarchy(8, tributaryFt, snowPsf, lvlBeamRows, glulamBeamRows);
      const beamAt12 = recommendBeamHierarchy(12, tributaryFt, snowPsf, lvlBeamRows, glulamBeamRows);
      const beamTypeRank = { dimensional: 0, lvl: 1, glulam: 2 };
      const rankDelta = beamTypeRank[beamAt12.beamType] - beamTypeRank[beamAt8.beamType];
      if (rankDelta > 0) return 8;
      const plfDelta = beamAt12.requiredPlf - beamAt8.requiredPlf;
      if (plfDelta > 200) return 8;
      return 12;
    }
  }, [lvlBeamRows, glulamBeamRows]);

  // Compute base deck recommendations + hot tub combined recommendations
  const computeRecommendations = useCallback((
    spanFt: number,
    snowPsf: number | null,
    postSpacing: number,
    cantileverLengthFt: number,
    hasCantilever: boolean,
    htEnabled: boolean,
    htPersonSize: number
  ) => {
    const trib = spanFt / 2;

    // Base deck recommendations (snow load only)
    const deckJoistOpts = recommendJoistForDeck(spanFt, snowPsf, joistSpans);
    const deckBeamResult = recommendBeamHierarchy(postSpacing, trib, snowPsf, lvlBeamRows, glulamBeamRows);
    setBeamRec(deckBeamResult);
    setJoistOptions(deckJoistOpts);

    // Cantilever H-frame beam
    if (hasCantilever && cantileverLengthFt > 0) {
      const cantileverTrib = cantileverLengthFt;
      const cantRec = recommendBeamHierarchy(deckWidthFt, cantileverTrib, snowPsf, lvlBeamRows, glulamBeamRows);
      setCantileverBeamRec(cantRec);
    } else {
      setCantileverBeamRec(null);
    }

    // Hot tub combined load recommendations
    let htJoistOpts: { spacing12: string; spacing16: string } | null = null;
    let htBeamResult: BeamRecommendation | null = null;
    if (htEnabled) {
      const htData = hotTubDataMap[htPersonSize] ?? hotTubDataMap[6];
      // Combined snow load equivalent for hot tub: use recommendJoistOptions which handles hot tub PSF
      htJoistOpts = recommendJoistOptions(spanFt, htPersonSize, snowPsf, hotTubDataMap, joistSpans);
      // For beam: add hot tub PSF to snow load for tributary calc
      const combinedSnowPsf = (snowPsf ?? 0) + htData.psf;
      htBeamResult = recommendBeamHierarchy(postSpacing, trib, combinedSnowPsf, lvlBeamRows, glulamBeamRows);
      setHotTubJoistOptions(htJoistOpts);
      setHotTubBeamRec(htBeamResult);
    } else {
      setHotTubJoistOptions(null);
      setHotTubBeamRec(null);
    }

    // Determine final (governing) recommendations
    const finalJoist12 = htEnabled && htJoistOpts ? htJoistOpts.spacing12 : deckJoistOpts.spacing12;
    const finalBeam = htEnabled && htBeamResult ? htBeamResult.size : deckBeamResult.size;
    const htAdjJoist = htEnabled ? htJoistOpts?.spacing12 ?? null : null;
    const htAdjBeam = htEnabled ? htBeamResult?.size ?? null : null;

    onChange({
      recommendedJoistSize: deckJoistOpts.spacing12,
      recommendedBeamSize: deckBeamResult.size,
      hotTubAdjustedJoistSize: htAdjJoist,
      hotTubAdjustedBeamSize: htAdjBeam,
    });
  }, [joistSpans, lvlBeamRows, glulamBeamRows, hotTubDataMap, onChange, deckWidthFt]);

  const handleAddressLookup = useCallback(async () => {
    const addr = state.address.trim() || (projectAddress ?? "").trim();
    if (!addr) return;
    onChange({ snowLoadFetching: true, snowLoadError: null, snowLoadPsf: null });
    try {
      const result = await lookupSnowLoad.mutateAsync({ address: addr });
      const psf = result.snowLoadPsf;
      const optimalSpacing = computeOptimalPostSpacing(tributaryWidthFt, psf, state.postPriority);
      computeRecommendations(
        state.joistSpanFt, psf, optimalSpacing,
        state.cantileverLengthFt, state.hasCantilever,
        hotTubEnabled, hotTubPersonSize
      );
      onChange({
        snowLoadPsf: psf,
        snowLoadFetching: false,
        snowLoadError: null,
        joistVerified: true,
        postSpacingFt: optimalSpacing,
        address: addr,
      });
    } catch (err: any) {
      onChange({
        snowLoadFetching: false,
        snowLoadError: err?.message ?? "Could not fetch snow load. Please check the address and try again.",
      });
    }
  }, [state, projectAddress, tributaryWidthFt, lookupSnowLoad, computeOptimalPostSpacing, computeRecommendations, hotTubEnabled, hotTubPersonSize, onChange]);

  const recompute = useCallback((
    overrides: Partial<{
      spanFt: number;
      postSpacing: number;
      cantileverFt: number;
      hasCantilever: boolean;
    }>
  ) => {
    if (state.snowLoadPsf == null) return;
    computeRecommendations(
      overrides.spanFt ?? state.joistSpanFt,
      state.snowLoadPsf,
      overrides.postSpacing ?? state.postSpacingFt,
      overrides.cantileverFt ?? state.cantileverLengthFt,
      overrides.hasCantilever ?? state.hasCantilever,
      hotTubEnabled,
      hotTubPersonSize
    );
  }, [state, computeRecommendations, hotTubEnabled, hotTubPersonSize]);

  const handleVerificationChange = useCallback((matches: boolean) => {
    onChange({ joistVerified: matches });
    if (!matches && onAutoToggleDemoFraming) {
      onAutoToggleDemoFraming();
    }
  }, [onChange, onAutoToggleDemoFraming]);

  // Detect if hot tub causes an upsize vs base deck
  const hotTubCausesUpsizeJoist = hotTubEnabled &&
    state.hotTubAdjustedJoistSize != null &&
    state.recommendedJoistSize != null &&
    state.hotTubAdjustedJoistSize !== state.recommendedJoistSize;

  const hotTubCausesUpsizeBeam = hotTubEnabled &&
    state.hotTubAdjustedBeamSize != null &&
    state.recommendedBeamSize != null &&
    state.hotTubAdjustedBeamSize !== state.recommendedBeamSize;

  // Governing (final) recommendations
  const finalJoistSize = hotTubEnabled && state.hotTubAdjustedJoistSize
    ? state.hotTubAdjustedJoistSize
    : state.recommendedJoistSize;
  const finalBeamSize = hotTubEnabled && state.hotTubAdjustedBeamSize
    ? state.hotTubAdjustedBeamSize
    : state.recommendedBeamSize;

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-warm-sand/40">
      <p className="text-xs font-body font-semibold text-charcoal flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-canyon text-white flex items-center justify-center text-xs">S</span>
        Structural Framing Specifications
      </p>

      {/* Existing deck replacement toggle */}
      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-body font-semibold text-charcoal flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Replacing an Existing Deck?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle on if this deck is being rebuilt in the same footprint and the existing post footings will be reused.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer ml-4">
            <div className="relative">
              <input
                type="checkbox"
                checked={state.isExistingDeckReplacement}
                onChange={(e) => {
                  onChange({ isExistingDeckReplacement: e.target.checked });
                  if (!e.target.checked) {
                    // Revert to optimized post spacing
                    if (state.snowLoadPsf != null) {
                      const newSpacing = computeOptimalPostSpacing(tributaryWidthFt, state.snowLoadPsf, state.postPriority);
                      onChange({ postSpacingFt: newSpacing });
                      recompute({ postSpacing: newSpacing });
                    }
                  } else {
                    // Lock post spacing to existing post spacing
                    onChange({ postSpacingFt: state.existingPostSpacingFt });
                    recompute({ postSpacing: state.existingPostSpacingFt });
                  }
                }}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${state.isExistingDeckReplacement ? "bg-blue-600" : "bg-border"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${state.isExistingDeckReplacement ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>
          </label>
        </div>

        {state.isExistingDeckReplacement && (
          <div className="mt-3 space-y-3">
            <div className="p-2 rounded-md bg-blue-100 border border-blue-300">
              <p className="text-xs text-blue-800 font-semibold">Existing footings reused — beam must span existing post spacing</p>
              <p className="text-xs text-blue-700 mt-0.5">
                The beam size will be calculated to span the existing post spacing rather than an optimized spacing.
                If the existing spacing requires a larger beam, the lumber package will be updated accordingly.
              </p>
            </div>
            <div>
              <label className="block text-xs font-body font-semibold text-charcoal mb-1">
                Existing Post Spacing (ft)
              </label>
              <p className="text-xs text-muted-foreground mb-2">Measure the center-to-center distance between existing post footings.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const v = Math.max(4, state.existingPostSpacingFt - 1);
                    onChange({ existingPostSpacingFt: v, postSpacingFt: v });
                    recompute({ postSpacing: v });
                  }}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={4}
                  max={24}
                  step={0.5}
                  value={state.existingPostSpacingFt}
                  onChange={(e) => {
                    const v = Math.max(4, parseFloat(e.target.value) || 8);
                    onChange({ existingPostSpacingFt: v, postSpacingFt: v });
                    recompute({ postSpacing: v });
                  }}
                  className="w-24 text-center text-base font-body font-semibold text-charcoal bg-white border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <button
                  onClick={() => {
                    const v = Math.min(24, state.existingPostSpacingFt + 1);
                    onChange({ existingPostSpacingFt: v, postSpacingFt: v });
                    recompute({ postSpacing: v });
                  }}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-sm text-muted-foreground">ft o.c.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Joist span */}
      <div>
        <label className="block text-sm font-body font-semibold text-charcoal mb-1">
          Joist Span (ft)
        </label>
        <p className="text-xs text-muted-foreground mb-2">Post-to-post span of the joists (deck width direction).</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={4}
            max={24}
            step={0.5}
            value={state.joistSpanFt}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 12;
              onChange({ joistSpanFt: v });
              recompute({ spanFt: v });
            }}
            className="w-24 text-center text-base font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40"
          />
          <span className="text-sm text-muted-foreground">feet</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tributary width for beam sizing: {(state.joistSpanFt / 2).toFixed(1)}' (worst-case mid-span)
        </p>
      </div>

      {/* Post spacing priority */}
      <div className="p-3 rounded-lg bg-sandstone/50 border border-border">
        <p className="text-sm font-body font-semibold text-charcoal mb-1">Post Spacing Priority</p>
        <p className="text-xs text-muted-foreground mb-3">
          How should post spacing be optimized?
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {(["minimize-cost", "minimize-posts"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange({ postPriority: opt });
                if (state.snowLoadPsf != null) {
                  const newSpacing = computeOptimalPostSpacing(tributaryWidthFt, state.snowLoadPsf, opt);
                  onChange({ postSpacingFt: newSpacing });
                  recompute({ postSpacing: newSpacing });
                }
              }}
              className={`p-3 rounded-md border text-left transition-colors ${
                state.postPriority === opt
                  ? "bg-canyon/10 border-canyon text-charcoal"
                  : "border-border text-charcoal hover:border-canyon/50 hover:bg-sandstone"
              }`}
            >
              <p className="text-xs font-body font-bold">
                {opt === "minimize-cost" ? "Minimize Cost" : "Minimize Posts"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {opt === "minimize-cost"
                  ? "Add posts if cheaper than upsizing beam"
                  : "Maximize post spacing, upsize beam as needed"}
              </p>
            </button>
          ))}
        </div>
        {state.snowLoadPsf != null && (
          <div className="flex items-center gap-2 text-xs text-charcoal mt-1">
            <span className="font-semibold">Recommended post spacing:</span>
            <span className="font-mono font-bold text-canyon">{state.postSpacingFt}' o.c.</span>
          </div>
        )}
        {state.snowLoadPsf == null && (
          <p className="text-xs text-muted-foreground italic">Enter project address below to calculate optimal post spacing.</p>
        )}
      </div>

      {/* Cantilever bay-out */}
      <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-body font-semibold text-charcoal">Cantilever Bay-Out</p>
            <p className="text-xs text-muted-foreground">Is the ledger area cantilevered over the existing foundation?</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={state.hasCantilever}
                onChange={(e) => {
                  onChange({ hasCantilever: e.target.checked });
                  recompute({ hasCantilever: e.target.checked });
                }}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${state.hasCantilever ? "bg-canyon" : "bg-border"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${state.hasCantilever ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>
          </label>
        </div>

        <button
          onClick={() => setShowCantileverInfo(!showCantileverInfo)}
          className="flex items-center gap-1 text-xs text-canyon hover:underline mb-2"
        >
          {showCantileverInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          What is a cantilever bay-out?
        </button>
        {showCantileverInfo && (
          <div className="mb-3 p-2 rounded bg-white border border-amber-200 text-xs text-charcoal space-y-1">
            <p>A cantilever bay-out occurs when the deck extends beyond the foundation wall. The joists are supported by the ledger at one end and a beam at the other, with the section between the foundation and the beam hanging in the air.</p>
            <p>This requires an H-frame: two perpendicular beams running from the house to the outside edge beam, with a front beam connecting them.</p>
          </div>
        )}

        {state.hasCantilever && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-body font-semibold text-charcoal mb-1">
                Cantilever Length (ft)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const v = Math.max(1, state.cantileverLengthFt - 1);
                    onChange({ cantileverLengthFt: v });
                    recompute({ cantileverFt: v });
                  }}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={state.cantileverLengthFt}
                  min={1}
                  max={8}
                  onChange={(e) => {
                    const v = Math.max(1, parseFloat(e.target.value) || 1);
                    onChange({ cantileverLengthFt: v });
                    recompute({ cantileverFt: v });
                  }}
                  className="w-20 text-center text-sm font-body font-semibold text-charcoal bg-white border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-canyon/40"
                />
                <button
                  onClick={() => {
                    const v = Math.min(8, state.cantileverLengthFt + 1);
                    onChange({ cantileverLengthFt: v });
                    recompute({ cantileverFt: v });
                  }}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-xs text-muted-foreground">ft</span>
              </div>
            </div>

            {cantileverBeamRec && (
              <div className="p-3 rounded-md bg-white border border-amber-300 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-body font-semibold text-amber-900">H-Frame Front Beam</p>
                  <BeamTypeBadge type={cantileverBeamRec.beamType} />
                </div>
                <p className="text-xs font-mono font-semibold text-amber-800">{cantileverBeamRec.size}</p>
                <p className="text-xs text-amber-700">
                  Spans {deckWidthFt}' across deck width. Each perpendicular beam carries half this load.
                </p>
                <p className="text-xs text-amber-600">
                  Required: <strong>{cantileverBeamRec.requiredPlf} PLF</strong>
                  {cantileverBeamRec.capacityPlf > 0 && <> · Capacity: <strong>{cantileverBeamRec.capacityPlf} PLF</strong></>}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Address + snow load lookup */}
      <div>
        <label className="block text-sm font-body font-semibold text-charcoal mb-1">
          <MapPin className="w-4 h-4 inline mr-1" />
          Project Address (for snow load lookup)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="123 Main St, Salt Lake City, UT"
            value={state.address || effectiveAddress}
            onChange={(e) => onChange({ address: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAddressLookup()}
            className="flex-1 text-sm font-body text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40"
          />
          <button
            onClick={handleAddressLookup}
            disabled={state.snowLoadFetching || !(state.address || effectiveAddress).trim()}
            className="px-4 py-2 bg-canyon text-white text-sm font-body font-semibold rounded-md hover:bg-canyon/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {state.snowLoadFetching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Looking up...</>
            ) : (
              <><Thermometer className="w-4 h-4" /> Get Snow Load</>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Uses the{" "}
          <a href="https://www.usu.edu/utahsnowload/" target="_blank" rel="noopener noreferrer" className="underline text-canyon">
            USU Utah Snow Load database
          </a>{" "}
          to determine the ground snow load design spec for this address.
        </p>

        {state.snowLoadError && (
          <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{state.snowLoadError}</p>
          </div>
        )}

        {state.snowLoadPsf != null && (
          <div className="mt-2 p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm font-body font-semibold text-blue-800">
              Ground Snow Load: <span className="text-blue-900">{state.snowLoadPsf} psf</span>
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Design load (adjusted): {Math.round((state.snowLoadPsf + 10) * 1.307)} psf
            </p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {(finalJoistSize || finalBeamSize) && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-4">
          <h4 className="text-sm font-body font-bold text-amber-900">Structural Recommendations</h4>

          {/* Joist options */}
          {joistOptions && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-body font-semibold text-amber-800 mb-2">
                  Joists (all bays)
                  {hotTubCausesUpsizeJoist && (
                    <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                      Upsized for hot tub load
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-2 rounded border ${hotTubCausesUpsizeJoist ? "bg-orange-50 border-orange-300" : "bg-white border-amber-200"}`}>
                    <p className="text-xs font-semibold text-amber-900">12" o.c. option</p>
                    <p className="text-sm font-mono text-amber-800">
                      {hotTubEnabled && hotTubJoistOptions ? hotTubJoistOptions.spacing12 : joistOptions.spacing12}
                    </p>
                    {hotTubCausesUpsizeJoist && (
                      <p className="text-xs text-orange-600 mt-0.5">
                        Base deck: {joistOptions.spacing12} → Hot tub: {hotTubJoistOptions?.spacing12}
                      </p>
                    )}
                    <p className="text-xs text-amber-600 mt-0.5">
                      {Math.ceil(deckWidthFt / 1.0) + 1} joists needed
                    </p>
                  </div>
                  <div className={`p-2 rounded border ${hotTubCausesUpsizeJoist ? "bg-orange-50 border-orange-300" : "bg-white border-amber-200"}`}>
                    <p className="text-xs font-semibold text-amber-900">16" o.c. option</p>
                    <p className="text-sm font-mono text-amber-800">
                      {hotTubEnabled && hotTubJoistOptions ? hotTubJoistOptions.spacing16 : joistOptions.spacing16}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {Math.ceil(deckWidthFt / 1.333) + 1} joists needed
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Based on {state.joistSpanFt}' span
                  {state.snowLoadPsf != null ? `, ${state.snowLoadPsf} psf snow load` : ""}
                  {hotTubEnabled ? `, ${hotTubPersonSize}-person hot tub load included` : ""}.
                </p>
              </div>
            </div>
          )}

          {/* Beam recommendation */}
          {(finalBeamSize || beamRec) && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-body font-semibold text-amber-800">
                    Outside Edge Beam
                    {hotTubCausesUpsizeBeam && (
                      <span className="ml-2 text-xs font-normal text-orange-700 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                        Upsized for hot tub load
                      </span>
                    )}
                  </p>
                  {(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec) && (
                    <BeamTypeBadge type={(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec)!.beamType} />
                  )}
                </div>
                <p className="text-sm text-amber-700 font-mono">{finalBeamSize}</p>
                {hotTubCausesUpsizeBeam && (
                  <p className="text-xs text-orange-600 mt-0.5">
                    Base deck: {state.recommendedBeamSize} → Hot tub: {state.hotTubAdjustedBeamSize}
                  </p>
                )}
                {(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec) && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-amber-600">
                      Required: <strong>{(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec)!.requiredPlf} PLF</strong>
                      {(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec)!.capacityPlf > 0 && (
                        <> · Capacity: <strong>{(hotTubEnabled && hotTubBeamRec ? hotTubBeamRec : beamRec)!.capacityPlf} PLF</strong></>
                      )}
                    </p>
                    <p className="text-xs text-amber-600">
                      Based on {state.postSpacingFt}' post spacing, {tributaryWidthFt.toFixed(1)}' tributary width
                      {state.snowLoadPsf != null ? `, ${state.snowLoadPsf} psf snow load` : ""}
                      {hotTubEnabled ? " + hot tub load" : ""}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field verification */}
          <div className="pt-2 border-t border-amber-200">
            <p className="text-xs font-body font-semibold text-amber-800 mb-2">
              Field Verification — Do existing joists match the spec above?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleVerificationChange(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-body font-medium transition-colors ${
                  state.joistVerified
                    ? "bg-green-100 border-green-400 text-green-800"
                    : "border-border text-charcoal hover:border-green-400"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                Matches spec
              </button>
              <button
                onClick={() => handleVerificationChange(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-body font-medium transition-colors ${
                  !state.joistVerified
                    ? "bg-red-100 border-red-400 text-red-800"
                    : "border-border text-charcoal hover:border-red-400"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                Does not match
              </button>
            </div>

            {!state.joistVerified && (
              <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  <strong>Demo & framing have been automatically added to this project.</strong>{" "}
                  The existing structure does not meet the required spec for this installation.
                </p>
              </div>
            )}

            {state.joistVerified && finalJoistSize && (
              <div className="mt-2 p-2 rounded-md bg-green-50 border border-green-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700">Existing structure verified — no additional framing required.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
