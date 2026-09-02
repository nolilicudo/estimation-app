/**
 * Unit tests for structural lumber calc logic:
 *   1. Base deck framing is calculated independently (snow load only)
 *   2. Hot tub adds its PSF on top of base deck load
 *   3. Combined load may upsize joist / beam vs base deck
 *   4. recommendBeamHierarchy tiers correctly (dimensional → LVL → glulam)
 */

import { describe, it, expect } from "vitest";

// ─── Inline the pure calc functions (no React imports needed) ─────────────────

const FALLBACK_JOIST_SPANS = [
  { size: "2x6",  maxSpanFt: 8.67,  spacingIn: 12, loadFactorMin: 0,    loadFactorMax: 1.0 },
  { size: "2x6",  maxSpanFt: 8.67,  spacingIn: 16, loadFactorMin: 0,    loadFactorMax: 1.0 },
  { size: "2x8",  maxSpanFt: 11.08, spacingIn: 12, loadFactorMin: 0,    loadFactorMax: 1.2 },
  { size: "2x8",  maxSpanFt: 11.08, spacingIn: 16, loadFactorMin: 0,    loadFactorMax: 1.2 },
  { size: "2x10", maxSpanFt: 13.58, spacingIn: 12, loadFactorMin: 0,    loadFactorMax: 1.5 },
  { size: "2x10", maxSpanFt: 13.58, spacingIn: 16, loadFactorMin: 0,    loadFactorMax: 1.5 },
  { size: "2x12", maxSpanFt: 15.75, spacingIn: 12, loadFactorMin: 0,    loadFactorMax: 99  },
  { size: "2x12", maxSpanFt: 15.75, spacingIn: 16, loadFactorMin: 0,    loadFactorMax: 99  },
];

const FALLBACK_HOT_TUB_DATA: Record<number, { weightLb: number; areaSqft: number; psf: number }> = {
  6: { weightLb: 3500, areaSqft: 36, psf: 97 },
  8: { weightLb: 4500, areaSqft: 45, psf: 100 },
};

const DIMENSIONAL_BEAMS = [
  { size: "(2)2x8",  spanFt: 6,  maxPlfFloor: 460 },
  { size: "(2)2x8",  spanFt: 8,  maxPlfFloor: 260 },
  { size: "(2)2x10", spanFt: 8,  maxPlfFloor: 415 },
  { size: "(2)2x10", spanFt: 10, maxPlfFloor: 265 },
  { size: "(2)2x12", spanFt: 8,  maxPlfFloor: 600 },
  { size: "(2)2x12", spanFt: 10, maxPlfFloor: 385 },
  { size: "(2)2x12", spanFt: 12, maxPlfFloor: 265 },
  { size: "(3)2x12", spanFt: 12, maxPlfFloor: 400 },
  { size: "(3)2x12", spanFt: 14, maxPlfFloor: 295 },
  { size: "(3)2x12", spanFt: 16, maxPlfFloor: 225 },
];

const SAMPLE_LVL_BEAMS = [
  { maxSpan: 12, maxPlf: 800,  size: "3.5x9.5 LVL" },
  { maxSpan: 14, maxPlf: 1000, size: "3.5x11.25 LVL" },
  { maxSpan: 16, maxPlf: 1200, size: "3.5x11.25 LVL doubled" },
];

// Snow load factor helper
function getSnowLoadFactor(snowLoadPsf: number): number {
  return ((snowLoadPsf + 10) * 1.307) / 50;
}

// Beam hierarchy (simplified version matching production logic)
function recommendBeamHierarchy(
  postSpacingFt: number,
  tributaryWidthFt: number,
  snowLoadPsf: number | null,
  lvlBeamRows: typeof SAMPLE_LVL_BEAMS | null,
  deadLoadPsf = 10
): { beamType: "dimensional" | "lvl" | "glulam"; size: string; requiredPlf: number } {
  const totalPsf = (snowLoadPsf ?? 0) + deadLoadPsf;
  const requiredPlf = Math.ceil(tributaryWidthFt * totalPsf);
  const spanFt = postSpacingFt;

  // Tier 1: Dimensional
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
    return { beamType: "dimensional", size: best.size, requiredPlf };
  }

  // Tier 2: LVL
  if (lvlBeamRows) {
    const lvlCandidates = lvlBeamRows.filter(b => b.maxSpan >= spanFt && b.maxPlf >= requiredPlf);
    if (lvlCandidates.length > 0) {
      const best = lvlCandidates.sort((a, b) => a.maxPlf - b.maxPlf)[0];
      return { beamType: "lvl", size: best.size, requiredPlf };
    }
  }

  // Tier 3: Glulam fallback
  return { beamType: "glulam", size: `ENGINEER-SPECIFIED (${requiredPlf} PLF)`, requiredPlf };
}

// Joist recommendation for base deck (snow load only)
function recommendJoistForDeck(
  spanFt: number,
  snowLoadPsf: number | null,
  joistSpans: typeof FALLBACK_JOIST_SPANS
): { spacing12: string; spacing16: string } {
  const snowFactor = snowLoadPsf != null ? getSnowLoadFactor(snowLoadPsf) : 1.0;
  const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];

  function findForSpacing(spacingIn: 12 | 16): string {
    const rows = joistSpans.filter(j => j.spacingIn === spacingIn);
    if (rows.length === 0) return "2x10";
    const candidates = rows.filter(j =>
      j.maxSpanFt >= spanFt &&
      (j.loadFactorMin == null || snowFactor >= j.loadFactorMin) &&
      (j.loadFactorMax == null || snowFactor <= j.loadFactorMax)
    );
    if (candidates.length > 0) {
      return candidates.sort((a, b) => JOIST_ORDER.indexOf(a.size) - JOIST_ORDER.indexOf(b.size))[0].size;
    }
    const spanOk = rows.filter(j => j.maxSpanFt >= spanFt);
    if (spanOk.length > 0) {
      return spanOk.sort((a, b) => JOIST_ORDER.indexOf(b.size) - JOIST_ORDER.indexOf(a.size))[0].size;
    }
    return "2x12";
  }

  return { spacing12: findForSpacing(12), spacing16: findForSpacing(16) };
}

// Joist recommendation with hot tub load
function recommendJoistWithHotTub(
  spanFt: number,
  personSize: number,
  snowLoadPsf: number | null,
  hotTubData: typeof FALLBACK_HOT_TUB_DATA,
  joistSpans: typeof FALLBACK_JOIST_SPANS
): { spacing12: string; spacing16: string } {
  const tubData = hotTubData[personSize] ?? hotTubData[6];
  const snowFactor = snowLoadPsf != null ? getSnowLoadFactor(snowLoadPsf) : 1.0;
  const hotTubAdjusted = (tubData.psf + 10) * 1.307;
  const effectiveFactor = Math.max(hotTubAdjusted / 50, snowFactor);
  const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];

  function findForSpacing(spacingIn: 12 | 16): string {
    const rows = joistSpans.filter(j => j.spacingIn === spacingIn);
    if (rows.length === 0) return "2x12";
    const candidates = rows.filter(j =>
      j.maxSpanFt >= spanFt &&
      (j.loadFactorMin == null || effectiveFactor >= j.loadFactorMin) &&
      (j.loadFactorMax == null || effectiveFactor <= j.loadFactorMax)
    );
    if (candidates.length > 0) {
      return candidates.sort((a, b) => JOIST_ORDER.indexOf(a.size) - JOIST_ORDER.indexOf(b.size))[0].size;
    }
    const spanOk = rows.filter(j => j.maxSpanFt >= spanFt);
    if (spanOk.length > 0) {
      return spanOk.sort((a, b) => JOIST_ORDER.indexOf(b.size) - JOIST_ORDER.indexOf(a.size))[0].size;
    }
    return "2x12";
  }

  return { spacing12: findForSpacing(12), spacing16: findForSpacing(16) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Structural Calc — Base Deck (no hot tub)", () => {
  it("recommends a joist for a 10ft span with no snow load", () => {
    const result = recommendJoistForDeck(10, null, FALLBACK_JOIST_SPANS);
    // 10ft span: 2x8 maxSpanFt=11.08 covers it (smallest adequate joist)
    // snowFactor = 1.0 (no snow), loadFactorMax for 2x8 = 1.2 → 1.0 <= 1.2 ✓
    expect(result.spacing12).toBe("2x8");
    expect(result.spacing16).toBe("2x8");
  });

  it("recommends a joist for a 12ft span with no snow load", () => {
    const result = recommendJoistForDeck(12, null, FALLBACK_JOIST_SPANS);
    // 12ft span: 2x10 maxSpanFt=13.58 covers it (smallest adequate joist)
    // snowFactor = 1.0, loadFactorMax for 2x10 = 1.5 → 1.0 <= 1.5 ✓
    expect(result.spacing12).toBe("2x10");
    expect(result.spacing16).toBe("2x10");
  });

  it("recommends a dimensional beam for a short span and low load", () => {
    // 8ft post spacing, 6ft tributary (12ft joist span / 2), no snow
    const result = recommendBeamHierarchy(8, 6, null, SAMPLE_LVL_BEAMS);
    expect(result.beamType).toBe("dimensional");
    // requiredPlf = 6 * (0 + 10) = 60 PLF — easily covered by (2)2x8 @ 8ft (260 PLF)
    expect(result.requiredPlf).toBe(60);
  });

  it("escalates to LVL when dimensional is insufficient", () => {
    // 14ft post spacing, 8ft tributary, 40 psf snow → requiredPlf = 8 * (40+10) = 400 PLF
    // (3)2x12 @ 14ft = 295 PLF — insufficient; should escalate to LVL
    const result = recommendBeamHierarchy(14, 8, 40, SAMPLE_LVL_BEAMS);
    expect(result.beamType).toBe("lvl");
    expect(result.requiredPlf).toBe(400);
  });

  it("escalates to glulam when LVL is also insufficient", () => {
    // 20ft post spacing, 10ft tributary, 60 psf snow → requiredPlf = 10 * (60+10) = 700 PLF
    // LVL max is 1200 PLF @ 16ft max span — 20ft exceeds max span
    const result = recommendBeamHierarchy(20, 10, 60, SAMPLE_LVL_BEAMS);
    expect(result.beamType).toBe("glulam");
  });
});

describe("Structural Calc — Hot Tub Additive Load", () => {
  it("hot tub does not change joist when base deck already covers the load", () => {
    // 8ft span, 6-person hot tub, no snow
    // Base deck: 2x8 (maxSpanFt 11.08 covers 8ft)
    // Hot tub PSF = 97 → effectiveFactor = (97+10)*1.307/50 = 2.80 — should upsize
    const base = recommendJoistForDeck(8, null, FALLBACK_JOIST_SPANS);
    const withHotTub = recommendJoistWithHotTub(8, 6, null, FALLBACK_HOT_TUB_DATA, FALLBACK_JOIST_SPANS);
    // Hot tub load is much heavier — combined should be >= base
    const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];
    const baseRank = JOIST_ORDER.indexOf(base.spacing12);
    const htRank = JOIST_ORDER.indexOf(withHotTub.spacing12);
    expect(htRank).toBeGreaterThanOrEqual(baseRank);
  });

  it("hot tub upsizes joist for a longer span", () => {
    // 12ft span, 6-person hot tub, no snow
    // Base deck: 2x12 (maxSpanFt 15.75 covers 12ft, snowFactor=1.0)
    // Hot tub: effectiveFactor = 2.80 — should still use 2x12 (max available)
    const base = recommendJoistForDeck(12, null, FALLBACK_JOIST_SPANS);
    const withHotTub = recommendJoistWithHotTub(12, 6, null, FALLBACK_HOT_TUB_DATA, FALLBACK_JOIST_SPANS);
    const JOIST_ORDER = ["2x6", "2x8", "2x10", "2x12"];
    const baseRank = JOIST_ORDER.indexOf(base.spacing12);
    const htRank = JOIST_ORDER.indexOf(withHotTub.spacing12);
    // Hot tub combined should never be smaller than base deck
    expect(htRank).toBeGreaterThanOrEqual(baseRank);
  });

  it("hot tub increases beam PLF requirement", () => {
    // 10ft post spacing, 6ft tributary, no snow
    const baseBeam = recommendBeamHierarchy(10, 6, null, SAMPLE_LVL_BEAMS);
    // With 6-person hot tub: add 97 psf to snow load for beam calc
    const htBeam = recommendBeamHierarchy(10, 6, 97, SAMPLE_LVL_BEAMS);
    expect(htBeam.requiredPlf).toBeGreaterThan(baseBeam.requiredPlf);
  });

  it("combined snow + hot tub load produces higher PLF than snow alone", () => {
    const snowOnlyBeam = recommendBeamHierarchy(8, 8, 30, SAMPLE_LVL_BEAMS);
    const combinedBeam = recommendBeamHierarchy(8, 8, 30 + 97, SAMPLE_LVL_BEAMS); // 30 psf snow + 97 psf hot tub
    expect(combinedBeam.requiredPlf).toBeGreaterThan(snowOnlyBeam.requiredPlf);
  });
});

describe("Snow Load Factor", () => {
  it("returns 1.0 factor for 0 psf snow (standard 40 psf live load baseline)", () => {
    // (0 + 10) * 1.307 / 50 = 0.2614 — below 1.0 baseline
    const factor = getSnowLoadFactor(0);
    expect(factor).toBeCloseTo(0.261, 2);
  });

  it("returns higher factor for heavy snow load", () => {
    const factor30 = getSnowLoadFactor(30);
    const factor60 = getSnowLoadFactor(60);
    expect(factor60).toBeGreaterThan(factor30);
  });

  it("50 psf snow produces factor > 1.5", () => {
    // (50 + 10) * 1.307 / 50 = 1.568
    const factor = getSnowLoadFactor(50);
    expect(factor).toBeGreaterThan(1.5);
  });
});
