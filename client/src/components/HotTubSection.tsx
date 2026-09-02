/**
 * HotTubSection
 *
 * Simplified hot tub configuration — toggle + person size picker.
 * All structural calc inputs (joist span, snow load, post spacing, cantilever)
 * have moved to FramingStructuralSection inside the Demo & Rebuild framing sub-section.
 *
 * When a hot tub is enabled, FramingStructuralSection automatically re-runs
 * the structural calc with the combined deck + hot tub load and shows the
 * upsize delta if the hot tub caused a larger joist or beam.
 */

import { useMemo } from "react";
import { Info, Thermometer } from "lucide-react";
import { HotTubState } from "@/hooks/useCalculator";
import { trpc } from "@/lib/trpc";

// ─── Engineering constants (fallback — DB tables take precedence) ─────────────

const FALLBACK_HOT_TUB_DATA: Record<number, { weightLb: number; areaSqft: number; psf: number }> = {
  2:  { weightLb: 1500, areaSqft: 20, psf: 75 },
  3:  { weightLb: 2000, areaSqft: 25, psf: 80 },
  4:  { weightLb: 2500, areaSqft: 30, psf: 83 },
  5:  { weightLb: 3000, areaSqft: 32, psf: 94 },
  6:  { weightLb: 3500, areaSqft: 36, psf: 97 },
  7:  { weightLb: 4000, areaSqft: 40, psf: 100 },
  8:  { weightLb: 4500, areaSqft: 45, psf: 100 },
  9:  { weightLb: 5000, areaSqft: 48, psf: 104 },
  10: { weightLb: 5500, areaSqft: 52, psf: 105 },
};

const FALLBACK_JOIST_SPANS: { size: string; maxSpanFt: number }[] = [
  { size: "2x6",  maxSpanFt: 8.67  },
  { size: "2x8",  maxSpanFt: 11.08 },
  { size: "2x10", maxSpanFt: 13.58 },
  { size: "2x12", maxSpanFt: 15.75 },
];

// Dimensional lumber beam options
const DIMENSIONAL_BEAMS: { size: string; widthIn: number; depthIn: number; spanFt: number; maxPlfFloor: number }[] = [
  { size: '(2)2x8',  widthIn: 3.0, depthIn: 7.25,  spanFt: 6,  maxPlfFloor: 460 },
  { size: '(2)2x8',  widthIn: 3.0, depthIn: 7.25,  spanFt: 8,  maxPlfFloor: 260 },
  { size: '(2)2x8',  widthIn: 3.0, depthIn: 7.25,  spanFt: 10, maxPlfFloor: 165 },
  { size: '(2)2x8',  widthIn: 3.0, depthIn: 7.25,  spanFt: 12, maxPlfFloor: 115 },
  { size: '(2)2x10', widthIn: 3.0, depthIn: 9.25,  spanFt: 6,  maxPlfFloor: 740 },
  { size: '(2)2x10', widthIn: 3.0, depthIn: 9.25,  spanFt: 8,  maxPlfFloor: 415 },
  { size: '(2)2x10', widthIn: 3.0, depthIn: 9.25,  spanFt: 10, maxPlfFloor: 265 },
  { size: '(2)2x10', widthIn: 3.0, depthIn: 9.25,  spanFt: 12, maxPlfFloor: 185 },
  { size: '(2)2x10', widthIn: 3.0, depthIn: 9.25,  spanFt: 14, maxPlfFloor: 135 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 6,  maxPlfFloor: 1070 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 8,  maxPlfFloor: 600 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 10, maxPlfFloor: 385 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 12, maxPlfFloor: 265 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 14, maxPlfFloor: 195 },
  { size: '(2)2x12', widthIn: 3.0, depthIn: 11.25, spanFt: 16, maxPlfFloor: 150 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 6,  maxPlfFloor: 1600 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 8,  maxPlfFloor: 900 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 10, maxPlfFloor: 575 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 12, maxPlfFloor: 400 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 14, maxPlfFloor: 295 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 16, maxPlfFloor: 225 },
  { size: '(3)2x12', widthIn: 4.5, depthIn: 11.25, spanFt: 18, maxPlfFloor: 175 },
];

// Snow load adjustment factor for joist sizing
function getSnowLoadFactor(snowLoadPsf: number): number {
  const totalPsf = (snowLoadPsf + 10) * 1.307;
  return totalPsf / 50;
}

type JoistSpanRow = { size: string; maxSpanFt: number; spacingIn?: number; loadFactorMin?: number; loadFactorMax?: number };
type HotTubDataMap = Record<number, { weightLb: number; areaSqft: number; psf: number }>;
type LvlBeamRow = { maxSpan: number; maxPlf: number; size: string; isDouble?: boolean };
type GlulamBeamRow = { widthIn: number; depthIn: number; spanFt: number; maxPlfFloor: number; maxPlfSnow: number };

export type BeamRecommendation = {
  beamType: "dimensional" | "lvl" | "glulam";
  size: string;
  requiredPlf: number;
  capacityPlf: number;
  note?: string;
};

/**
 * Three-tier beam sizing: dimensional -> LVL -> glulam
 * Exported so FramingStructuralSection can import it.
 */
export function recommendBeamHierarchy(
  postSpacingFt: number,
  tributaryWidthFt: number,
  snowLoadPsf: number | null,
  lvlBeamRows: LvlBeamRow[] | null,
  glulamBeamRows: GlulamBeamRow[] | null,
  deadLoadPsf = 10
): BeamRecommendation {
  const totalPsf = (snowLoadPsf ?? 0) + deadLoadPsf;
  const requiredPlf = Math.ceil(tributaryWidthFt * totalPsf);
  const spanFt = postSpacingFt;

  // Tier 1: Dimensional lumber
  const dimBySize: Record<string, typeof DIMENSIONAL_BEAMS[0]> = {};
  for (const b of DIMENSIONAL_BEAMS) {
    if (b.spanFt >= spanFt) {
      if (!dimBySize[b.size] || b.spanFt < dimBySize[b.size].spanFt) {
        dimBySize[b.size] = b;
      }
    }
  }
  const dimCandidates = Object.values(dimBySize).filter(b => b.maxPlfFloor >= requiredPlf);
  if (dimCandidates.length > 0) {
    const best = dimCandidates.sort((a, b) => a.maxPlfFloor - b.maxPlfFloor)[0];
    return { beamType: "dimensional", size: best.size, requiredPlf, capacityPlf: best.maxPlfFloor };
  }

  // Tier 2: LVL
  if (lvlBeamRows && lvlBeamRows.length > 0) {
    const lvlCandidates = lvlBeamRows.filter(b => b.maxSpan >= spanFt && b.maxPlf >= requiredPlf);
    if (lvlCandidates.length > 0) {
      const best = lvlCandidates.sort((a, b) => a.maxPlf - b.maxPlf)[0];
      return { beamType: "lvl", size: best.size, requiredPlf, capacityPlf: best.maxPlf };
    }
  }

  // Tier 3: Glulam
  if (glulamBeamRows && glulamBeamRows.length > 0) {
    const glulamCandidates = glulamBeamRows.filter(b =>
      b.spanFt >= spanFt && b.maxPlfFloor >= requiredPlf
    );
    if (glulamCandidates.length > 0) {
      const best = glulamCandidates.sort((a, b) => a.maxPlfFloor - b.maxPlfFloor)[0];
      const sizeStr = `${best.widthIn}"x${best.depthIn}" Glulam`;
      return { beamType: "glulam", size: sizeStr, requiredPlf, capacityPlf: best.maxPlfFloor };
    }
  }

  // Fallback: engineer-specified glulam
  return {
    beamType: "glulam",
    size: `ENGINEER-SPECIFIED Glulam (${requiredPlf} PLF req'd @ ${spanFt}' span)`,
    requiredPlf,
    capacityPlf: 0,
    note: "Exceeds standard tables — consult structural engineer",
  };
}

const JOIST_SIZE_ORDER = ['2x6', '2x8', '2x10', '2x12'];
function joistSizeRank(size: string): number {
  const clean = size.replace(/[^0-9x]/g, '').toLowerCase();
  const idx = JOIST_SIZE_ORDER.indexOf(clean);
  return idx >= 0 ? idx : JOIST_SIZE_ORDER.length;
}

/**
 * Recommend joist for hot tub — returns both 12" OC and 16" OC options.
 * Exported so FramingStructuralSection can import it.
 */
export function recommendJoistOptions(
  spanFt: number,
  personSize: number,
  snowLoadPsf: number | null,
  hotTubData: HotTubDataMap,
  joistSpans: JoistSpanRow[]
): { spacing12: string; spacing16: string } {
  const tubData = hotTubData[personSize] ?? hotTubData[6];
  const snowFactor = snowLoadPsf != null ? getSnowLoadFactor(snowLoadPsf) : 1.0;
  const hotTubAdjusted = (tubData.psf + 10) * 1.307;
  const effectiveFactor = Math.max(hotTubAdjusted / 50, snowFactor);

  const has12Rows = joistSpans.some(j => j.spacingIn === 12);
  const has16Rows = joistSpans.some(j => j.spacingIn === 16);

  function findForSpacing(spacingIn: 12 | 16): string {
    const rows = joistSpans.filter(j => j.spacingIn === spacingIn);
    if (rows.length === 0) return findFallback();

    const candidates = rows.filter(j =>
      j.maxSpanFt >= spanFt &&
      (j.loadFactorMin == null || effectiveFactor >= j.loadFactorMin) &&
      (j.loadFactorMax == null || effectiveFactor <= j.loadFactorMax)
    );

    if (candidates.length > 0) {
      return candidates.sort((a, b) => joistSizeRank(a.size) - joistSizeRank(b.size))[0].size;
    }

    const spanOk = rows.filter(j => j.maxSpanFt >= spanFt);
    if (spanOk.length > 0) {
      return spanOk.sort((a, b) => joistSizeRank(b.size) - joistSizeRank(a.size))[0].size;
    }

    return rows.sort((a, b) => joistSizeRank(b.size) - joistSizeRank(a.size))[0].size;
  }

  function findFallback(): string {
    const sorted = [...joistSpans].sort((a, b) => a.maxSpanFt - b.maxSpanFt);
    const base = sorted.find(j => j.maxSpanFt >= spanFt) ?? sorted[sorted.length - 1];
    const idx = sorted.indexOf(base);
    if (effectiveFactor >= 2.0) return sorted[Math.min(idx + 2, sorted.length - 1)].size;
    if (effectiveFactor >= 1.5) return sorted[Math.min(idx + 1, sorted.length - 1)].size;
    if (effectiveFactor >= 1.2) return sorted[Math.min(idx + 1, sorted.length - 1)].size;
    return base.size;
  }

  const joist12 = has12Rows ? findForSpacing(12) : findFallback();
  const joist16 = has16Rows ? findForSpacing(16) : findFallback();
  const finalJoist16 = joistSizeRank(joist16) >= joistSizeRank(joist12) ? joist16 : joist12;

  return {
    spacing12: `${joist12} @ 12" o.c.`,
    spacing16: `${finalJoist16} @ 16" o.c.`,
  };
}

// Legacy wrapper
export function recommendJoistForHotTub(
  spanFt: number,
  personSize: number,
  snowLoadPsf: number | null,
  hotTubData: HotTubDataMap,
  joistSpans: JoistSpanRow[]
): string {
  const opts = recommendJoistOptions(spanFt, personSize, snowLoadPsf, hotTubData, joistSpans);
  return opts.spacing12;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HotTubSectionProps {
  hotTub: HotTubState;
  onChange: (updated: Partial<HotTubState>) => void;
  onAutoToggleDemoFraming?: () => void;
  projectAddress?: string;
  deckWidthFt?: number;
  deckLengthFt?: number;
}

export function HotTubSection({ hotTub, onChange }: HotTubSectionProps) {
  // Fetch DB-driven structural tables for hot tub data display
  const { data: structuralTables } = trpc.config.getStructuralTables.useQuery();

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
    return FALLBACK_HOT_TUB_DATA;
  }, [structuralTables]);

  const tubData = hotTubDataMap[hotTub.personSize];

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={hotTub.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="sr-only"
          />
          <div className={`w-12 h-6 rounded-full transition-colors ${hotTub.enabled ? "bg-canyon" : "bg-border"}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hotTub.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </div>
        </div>
        <div>
          <span className="text-sm font-body font-semibold text-charcoal">Hot Tub on Deck</span>
          <p className="text-xs text-muted-foreground">Add hot tub load to structural framing calc</p>
        </div>
      </label>

      {hotTub.enabled && (
        <div className="space-y-5 pl-2 border-l-2 border-canyon/30">
          {/* Placement notice */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong>Hot tub can be placed anywhere on the deck.</strong> All joists are sized for worst-case mid-span placement so no zone restrictions apply.
            </p>
          </div>

          {/* Person size picker */}
          <div>
            <label className="block text-sm font-body font-semibold text-charcoal mb-2">Hot Tub Size</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => onChange({ personSize: n })}
                  className={`py-2 px-1 rounded-md border text-sm font-body font-medium transition-colors ${
                    hotTub.personSize === n
                      ? "bg-canyon text-white border-canyon"
                      : "border-border text-charcoal hover:border-canyon/60 hover:bg-sandstone"
                  }`}
                >
                  {n}-person
                </button>
              ))}
            </div>
            {tubData && (
              <p className="text-xs text-muted-foreground mt-1">
                Approx. {tubData.weightLb.toLocaleString()} lb filled
                ({tubData.psf} psf over {tubData.areaSqft} sqft)
              </p>
            )}
          </div>

          {/* Load summary — shows how hot tub affects the framing calc */}
          {tubData && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <p className="text-sm font-body font-semibold text-amber-900">Hot Tub Load Added to Framing Calc</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-md p-2 border border-amber-200">
                  <p className="text-xs text-amber-600">Weight (filled)</p>
                  <p className="text-sm font-mono font-bold text-amber-900">{tubData.weightLb.toLocaleString()} lb</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-amber-200">
                  <p className="text-xs text-amber-600">Footprint</p>
                  <p className="text-sm font-mono font-bold text-amber-900">{tubData.areaSqft} sqft</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-amber-200">
                  <p className="text-xs text-amber-600">Live load</p>
                  <p className="text-sm font-mono font-bold text-amber-900">{tubData.psf} psf</p>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                This load is automatically added to the structural framing calc in <strong>Step 8 — Demo &amp; Rebuild → Deck Framing</strong>.
                The joist and beam sizes will be upsized if needed to carry the combined deck + hot tub load.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
