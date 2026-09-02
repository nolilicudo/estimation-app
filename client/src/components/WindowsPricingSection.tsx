/**
 * WindowsPricingSection
 * Handles window and sliding glass door pricing for kitchen/addition/basement price consult.
 * Supports vinyl/aluminum/wood frames, white-on-white/black-on-white/black-on-black color,
 * double/triple pane, and casement/slider/picture/single-hung/double-hung window types.
 * SGD: 2-panel, 3-panel (with moving panel count), 4-panel (center-slide or multi-slide).
 * Also includes header and casing LF inputs with 16ft piece count calculation.
 */
import React, { useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WindowFrame = "vinyl" | "aluminum" | "wood";
export type WindowColor = "white_on_white" | "black_on_white" | "black_on_black";
export type WindowType = "single_hung" | "double_hung" | "casement" | "slider" | "picture";
export type WindowSizeCategory = "bathroom" | "standard_egress" | "large_egress" | "oversized" | "skylight";
export type SgdOpeningType = "existing_opening" | "new_opening";
export type WindowPane = "double" | "triple";
export type SgdPanels = "2panel" | "3panel" | "4panel";
export type SgdSlideStyle = "center_slide" | "multi_slide"; // only for 4-panel
export type SgdFrame = "vinyl" | "aluminum" | "wood";

export interface WindowEntry {
  id: string;
  frame: WindowFrame;
  color: WindowColor;
  type: WindowType;
  pane: WindowPane;
  sizeCategory: WindowSizeCategory;
  qty: number;
}

export interface SgdEntry {
  id: string;
  panels: SgdPanels;
  movingPanels: number;       // how many panels slide (for 3-panel; 4-panel uses slideStyle)
  slideStyle: SgdSlideStyle;  // center_slide or multi_slide (only relevant for 4-panel)
  frame: SgdFrame;
  color: WindowColor;
  openingType: SgdOpeningType; // new_opening = cut new hole (upcharge), existing_opening = no upcharge
  widthFt: number;
  heightFt: number;
  qty: number;
}

export interface HeaderCasingState {
  headerLf: number;    // total linear feet of header material needed
  casingCount: number; // number of casing sets (one per window/door opening)
}

export interface WindowsState {
  windows: WindowEntry[];
  sgds: SgdEntry[];
  headerCasing: HeaderCasingState;
}

export const defaultWindowsState: WindowsState = {
  windows: [],
  sgds: [],
  headerCasing: {
    headerLf: 0,
    casingCount: 0,
  },
};

// ─── Config type (from DB) ────────────────────────────────────────────────────

export interface WindowConfigData {
  price_vinyl_singleHung: string;
  price_vinyl_doubleHung: string;
  price_vinyl_casement: string;
  price_vinyl_slider: string;
  price_vinyl_picture: string;
  price_alum_singleHung: string;
  price_alum_doubleHung: string;
  price_alum_casement: string;
  price_alum_slider: string;
  price_alum_picture: string;
  price_wood_singleHung: string;
  price_wood_doubleHung: string;
  price_wood_casement: string;
  price_wood_slider: string;
  price_wood_picture: string;
  colorUpcharge_blackOnWhite: string;
  colorUpcharge_blackOnBlack: string;
  paneUpcharge_triple: string;
  price_sgd_2panel: string;
  price_sgd_3panel: string;
  price_sgd_4panel: string;
  sgd_movingPanelUpcharge: string;   // per extra moving panel beyond 1
  sgd_multiSlideUpcharge: string;    // upcharge for multi-slide vs center-slide on 4-panel
  sgd_alum_upcharge: string;         // per-unit upcharge for aluminum frame SGD
  sgd_wood_upcharge: string;         // per-unit upcharge for wood frame SGD
  sgd_colorUpcharge_blackOnWhite: string;
  sgd_colorUpcharge_blackOnBlack: string;
  price_header_per_lf: string;       // cost per LF of header material
  price_casing_per_set: string;      // cost per casing set
  // SGD opening type upcharge (new opening vs existing)
  sgd_newOpeningUpcharge: string;
  // Window size category upcharges
  windowSize_bathroom: string;
  windowSize_standardEgress: string;
  windowSize_largeEgress: string;
  windowSize_oversized: string;
  windowSize_skylight: string;
  markupPct: string;
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────

export function getWindowBasePrice(cfg: WindowConfigData, frame: WindowFrame, type: WindowType): number {
  const key = `price_${frame === "aluminum" ? "alum" : frame}_${
    type === "single_hung" ? "singleHung" :
    type === "double_hung" ? "doubleHung" :
    type === "casement" ? "casement" :
    type === "slider" ? "slider" : "picture"
  }` as keyof WindowConfigData;
  return parseFloat(cfg[key] as string) || 0;
}

export function getWindowColorUpcharge(cfg: WindowConfigData, color: WindowColor): number {
  if (color === "black_on_white") return parseFloat(cfg.colorUpcharge_blackOnWhite) || 0;
  if (color === "black_on_black") return parseFloat(cfg.colorUpcharge_blackOnBlack) || 0;
  return 0;
}

export function getWindowPaneUpcharge(cfg: WindowConfigData, pane: WindowPane): number {
  if (pane === "triple") return parseFloat(cfg.paneUpcharge_triple) || 0;
  return 0;
}

export function getSgdBasePrice(cfg: WindowConfigData, panels: SgdPanels): number {
  if (panels === "2panel") return parseFloat(cfg.price_sgd_2panel) || 0;
  if (panels === "3panel") return parseFloat(cfg.price_sgd_3panel) || 0;
  return parseFloat(cfg.price_sgd_4panel) || 0;
}

export function getSgdColorUpcharge(cfg: WindowConfigData, color: WindowColor): number {
  if (color === "black_on_white") return parseFloat(cfg.sgd_colorUpcharge_blackOnWhite) || 0;
  if (color === "black_on_black") return parseFloat(cfg.sgd_colorUpcharge_blackOnBlack) || 0;
  return 0;
}

export function getSgdFrameUpcharge(cfg: WindowConfigData, frame: SgdFrame): number {
  if (frame === "aluminum") return parseFloat(cfg.sgd_alum_upcharge) || 0;
  if (frame === "wood") return parseFloat(cfg.sgd_wood_upcharge) || 0;
  return 0;
}

export function getSgdOpeningUpcharge(cfg: WindowConfigData, openingType: SgdOpeningType): number {
  if (openingType === "new_opening") return parseFloat(cfg.sgd_newOpeningUpcharge) || 0;
  return 0;
}

export function getWindowSizeUpcharge(cfg: WindowConfigData, sizeCategory: WindowSizeCategory): number {
  switch (sizeCategory) {
    case "bathroom": return parseFloat(cfg.windowSize_bathroom) || 0;
    case "standard_egress": return parseFloat(cfg.windowSize_standardEgress) || 0;
    case "large_egress": return parseFloat(cfg.windowSize_largeEgress) || 0;
    case "oversized": return parseFloat(cfg.windowSize_oversized) || 0;
    case "skylight": return parseFloat(cfg.windowSize_skylight) || 0;
    default: return 0;
  }
}

/** Returns total piece count for header material: ceil(totalLf / 16) */
export function headerPieceCount(lf: number): number {
  if (lf <= 0) return 0;
  return Math.ceil(lf / 16);
}

export interface WindowLineItem {
  label: string;
  cost: number;
  sellPrice: number;
  qty: number;
}

export function calcWindowsPricing(
  state: WindowsState,
  cfg: WindowConfigData | null | undefined
): { lineItems: WindowLineItem[]; total: number } {
  if (!cfg) return { lineItems: [], total: 0 };
  const markup = parseFloat(cfg.markupPct) || 0.4;
  const lineItems: WindowLineItem[] = [];

  for (const w of state.windows) {
    if (w.qty <= 0) continue;
    const base = getWindowBasePrice(cfg, w.frame, w.type);
    const colorUp = getWindowColorUpcharge(cfg, w.color);
    const paneUp = getWindowPaneUpcharge(cfg, w.pane);
    const sizeUp = getWindowSizeUpcharge(cfg, w.sizeCategory);
    const unitCost = base + colorUp + paneUp + sizeUp;
    const unitSell = unitCost * (1 + markup);
    const frameLabel = w.frame === "aluminum" ? "Aluminum" : w.frame === "vinyl" ? "Vinyl" : "Wood";
    const typeLabel = w.type === "single_hung" ? "Single Hung" : w.type === "double_hung" ? "Double Hung" : w.type === "casement" ? "Casement" : w.type === "slider" ? "Slider" : "Picture";
    const colorLabel = w.color === "white_on_white" ? "White/White" : w.color === "black_on_white" ? "Black/White" : "Black/Black";
    const paneLabel = w.pane === "triple" ? " Triple Pane" : "";
    const sizeLabelMap: Record<WindowSizeCategory, string> = {
      bathroom: "Bathroom",
      standard_egress: "Std Egress",
      large_egress: "Lg Egress",
      oversized: "Oversized",
      skylight: "Skylight",
    };
    const sizeLabel = ` [${sizeLabelMap[w.sizeCategory]}]`;
    lineItems.push({
      label: `${frameLabel} ${typeLabel}${sizeLabel} (${colorLabel}${paneLabel})`,
      cost: unitCost * w.qty,
      sellPrice: unitSell * w.qty,
      qty: w.qty,
    });
  }

  for (const s of state.sgds) {
    if (s.qty <= 0) continue;
    const base = getSgdBasePrice(cfg, s.panels);
    const colorUp = getSgdColorUpcharge(cfg, s.color);
    const frameUp = getSgdFrameUpcharge(cfg, s.frame);
    // Moving panel upcharge for 3-panel (extra panels beyond 1)
    const movingUp = s.panels === "3panel"
      ? (Math.max(0, s.movingPanels - 1)) * (parseFloat(cfg.sgd_movingPanelUpcharge) || 0)
      : 0;
    // Multi-slide upcharge for 4-panel
    const slideUp = s.panels === "4panel" && s.slideStyle === "multi_slide"
      ? (parseFloat(cfg.sgd_multiSlideUpcharge) || 0)
      : 0;
    const openingUp = getSgdOpeningUpcharge(cfg, s.openingType);
    const unitCost = base + colorUp + frameUp + movingUp + slideUp + openingUp;
    const unitSell = unitCost * (1 + markup);
    const panelLabel = s.panels === "2panel" ? "2-Panel" : s.panels === "3panel" ? "3-Panel" : "4-Panel";
    const frameLabel = s.frame === "aluminum" ? "Alum" : s.frame === "wood" ? "Wood" : "Vinyl";
    const colorLabel = s.color === "white_on_white" ? "White/White" : s.color === "black_on_white" ? "Black/White" : "Black/Black";
    const styleNote = s.panels === "4panel" ? ` ${s.slideStyle === "center_slide" ? "Center-Slide" : "Multi-Slide"}` : s.panels === "3panel" ? ` (${s.movingPanels} moving)` : "";
    const dimNote = s.widthFt > 0 && s.heightFt > 0 ? ` ${s.widthFt}'×${s.heightFt}'` : "";
    const openingNote = s.openingType === "new_opening" ? " [New Opening]" : " [Existing Opening]";
    lineItems.push({
      label: `SGD ${panelLabel}${styleNote} ${frameLabel} (${colorLabel})${dimNote}${openingNote}`,
      cost: unitCost * s.qty,
      sellPrice: unitSell * s.qty,
      qty: s.qty,
    });
  }

  // Header material
  const hc = state.headerCasing;
  if (hc.headerLf > 0) {
    const pieces = headerPieceCount(hc.headerLf);
    const unitCost = parseFloat(cfg.price_header_per_lf) || 0;
    const totalCost = unitCost * hc.headerLf;
    const totalSell = totalCost * (1 + markup);
    lineItems.push({
      label: `Header Material (${hc.headerLf} LF → ${pieces} pcs @ 16')`,
      cost: totalCost,
      sellPrice: totalSell,
      qty: pieces,
    });
  }

  // Casing sets
  if (hc.casingCount > 0) {
    const unitCost = parseFloat(cfg.price_casing_per_set) || 0;
    const totalCost = unitCost * hc.casingCount;
    const totalSell = totalCost * (1 + markup);
    lineItems.push({
      label: `Casing Sets`,
      cost: totalCost,
      sellPrice: totalSell,
      qty: hc.casingCount,
    });
  }

  const total = lineItems.reduce((sum, li) => sum + li.sellPrice, 0);
  return { lineItems, total };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const FRAME_OPTIONS: { value: WindowFrame; label: string; desc: string }[] = [
  { value: "vinyl", label: "Vinyl", desc: "Low-maintenance, energy-efficient, most affordable" },
  { value: "aluminum", label: "Aluminum", desc: "Slim profile, durable, good for modern designs" },
  { value: "wood", label: "Wood", desc: "Classic look, best insulation, premium price" },
];

const SGD_FRAME_OPTIONS: { value: SgdFrame; label: string; desc: string }[] = [
  { value: "vinyl", label: "Vinyl", desc: "Low-maintenance, most affordable" },
  { value: "aluminum", label: "Aluminum", desc: "Slim profile, modern look, upcharge applies" },
  { value: "wood", label: "Wood", desc: "Classic, premium price" },
];

const COLOR_OPTIONS: { value: WindowColor; label: string; desc: string }[] = [
  { value: "white_on_white", label: "White / White", desc: "White interior and exterior — standard, no upcharge" },
  { value: "black_on_white", label: "Black / White", desc: "Black exterior, white interior — popular modern look" },
  { value: "black_on_black", label: "Black / Black", desc: "Black interior and exterior — bold, premium upcharge" },
];

const WINDOW_TYPE_OPTIONS: { value: WindowType; label: string; desc: string }[] = [
  { value: "single_hung", label: "Single Hung", desc: "Bottom sash opens, top is fixed" },
  { value: "double_hung", label: "Double Hung", desc: "Both sashes open — easier to clean" },
  { value: "casement", label: "Casement", desc: "Hinged on side, cranks outward — best seal" },
  { value: "slider", label: "Slider", desc: "Slides horizontally — great for wide openings" },
  { value: "picture", label: "Picture", desc: "Fixed, non-opening — maximum light, lowest cost" },
];

const PANE_OPTIONS: { value: WindowPane; label: string; desc: string }[] = [
  { value: "double", label: "Double Pane", desc: "Standard insulated glass — good energy performance" },
  { value: "triple", label: "Triple Pane", desc: "Extra insulation — best for cold climates, upcharge applies" },
];

const SGD_PANEL_OPTIONS: { value: SgdPanels; label: string; desc: string }[] = [
  { value: "2panel", label: "2-Panel", desc: "Standard two-panel — one fixed, one sliding" },
  { value: "3panel", label: "3-Panel", desc: "Three-panel — choose how many panels slide" },
  { value: "4panel", label: "4-Panel", desc: "Wide four-panel — center-slide or multi-slide configuration" },
];

const SGD_SLIDE_STYLE_OPTIONS: { value: SgdSlideStyle; label: string; desc: string }[] = [
  { value: "center_slide", label: "Center Slide", desc: "Two center panels slide open from the middle" },
  { value: "multi_slide", label: "Multi Slide", desc: "All panels stack — maximum opening, premium upcharge" },
];

const SGD_OPENING_TYPE_OPTIONS: { value: SgdOpeningType; label: string; desc: string }[] = [
  { value: "existing_opening", label: "Existing Opening", desc: "Door goes into an existing rough opening — no framing upcharge" },
  { value: "new_opening", label: "New Opening", desc: "New opening cut into the wall — includes framing and structural work, upcharge applies" },
];

const WINDOW_SIZE_OPTIONS: { value: WindowSizeCategory; label: string; desc: string }[] = [
  { value: "bathroom", label: "Bathroom", desc: "Small privacy window, typically 14\"–24\" wide — no size upcharge" },
  { value: "standard_egress", label: "Standard Egress", desc: "Code-minimum egress size, ~20\"×24\" opening — no size upcharge" },
  { value: "large_egress", label: "Large Egress", desc: "Larger egress window, ~36\"×48\" — small upcharge" },
  { value: "oversized", label: "Oversized", desc: "Wide or tall window beyond standard sizing — upcharge applies" },
  { value: "skylight", label: "Skylight", desc: "Roof-mounted skylight — includes flashing, curb, and install upcharge" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; desc?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            value === opt.value
              ? "bg-[#8B4513] text-white border-[#8B4513] shadow-sm"
              : "bg-white text-[#4A3728] border-[#D4B896] hover:border-[#8B4513] hover:bg-[#FDF8F4]"
          }`}
        >
          {opt.label}
          {opt.desc && <InfoTooltip description={opt.desc} />}
        </button>
      ))}
    </div>
  );
}

function QtyControl({
  value,
  onChange,
  min = 1,
  max = 99,
  label = "Qty",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">{label}</span>
      <div className="flex items-center border border-[#D4B896] rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-2.5 py-1 text-[#8B4513] hover:bg-[#FDF8F4] transition-colors text-base font-bold leading-none"
        >
          −
        </button>
        <span className="px-3 py-1 text-sm font-semibold text-[#4A3728] min-w-[2.5rem] text-center border-x border-[#D4B896]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-2.5 py-1 text-[#8B4513] hover:bg-[#FDF8F4] transition-colors text-base font-bold leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Window Type Diagram ────────────────────────────────────────────────────

/**
 * Inline SVG diagram showing how a window opens.
 * Supports casement (side-hinged, swings out), slider (horizontal), single hung (bottom sash up).
 */
function WindowTypeDiagram({ type }: { type: "casement" | "slider" | "single_hung" }) {
  const W = 110;
  const H = 100;
  const FRAME = 4;
  const iW = W - FRAME * 2; // inner width
  const iH = H - FRAME * 2; // inner height

  if (type === "casement") {
    // Casement: hinged on left, swings open to the right
    // Show the window frame + a panel that's slightly ajar with a curved arc indicating swing
    const arcR = iW * 0.85;
    return (
      <div className="rounded-xl border border-[#D4B896] bg-white p-3 space-y-1">
        <p className="text-xs font-semibold text-[#8B4513] text-center">Casement — hinged on side, swings out</p>
        <div className="flex justify-center">
          <svg viewBox={`0 0 ${W + 30} ${H}`} width={W + 30} height={H} className="overflow-visible" aria-label="Casement window diagram">
            {/* Outer frame */}
            <rect x={0} y={0} width={W} height={H} rx={3} fill="none" stroke="#8B4513" strokeWidth={FRAME} />
            {/* Fixed glass pane (left half, stays in frame) */}
            <rect x={FRAME} y={FRAME} width={iW * 0.5} height={iH} fill="#EEF6FC" stroke="#C4A882" strokeWidth={1.2} rx={1} />
            {/* Hinge marks on left */}
            <circle cx={FRAME + 3} cy={FRAME + 10} r={2.5} fill="#8B4513" />
            <circle cx={FRAME + 3} cy={H - FRAME - 10} r={2.5} fill="#8B4513" />
            {/* Open panel (right half, shown ajar at an angle) */}
            <polygon
              points={`${FRAME + iW * 0.5},${FRAME} ${W - FRAME},${FRAME} ${W + 20},${FRAME + iH * 0.3} ${FRAME + iW * 0.5},${H - FRAME}`}
              fill="#FEF3E8" stroke="#8B4513" strokeWidth={1.5}
            />
            {/* Glass lines on open panel */}
            <line x1={FRAME + iW * 0.5 + 4} y1={FRAME + 8} x2={W + 14} y2={FRAME + iH * 0.3 + 4}
              stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
            <line x1={W - FRAME - 4} y1={FRAME + 8} x2={FRAME + iW * 0.5 + 4} y2={H - FRAME - 8}
              stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
            {/* Swing arc */}
            <path
              d={`M ${W - FRAME} ${FRAME + iH / 2} A ${arcR} ${arcR} 0 0 1 ${W + 20} ${FRAME + iH * 0.3}`}
              fill="none" stroke="#8B4513" strokeWidth={1} strokeDasharray="3 2" opacity={0.6}
            />
            {/* Arrow at arc end */}
            <polygon points={`${W + 20},${FRAME + iH * 0.3} ${W + 14},${FRAME + iH * 0.3 - 5} ${W + 15},${FRAME + iH * 0.3 + 5}`} fill="#8B4513" opacity={0.7} />
            {/* Label */}
            <text x={FRAME + iW * 0.25} y={H / 2 + 4} textAnchor="middle" fontSize={8} fill="#8B7355" fontWeight="500">FIXED</text>
            <text x={W - FRAME / 2 + 10} y={FRAME + iH * 0.55} textAnchor="middle" fontSize={8} fill="#8B4513" fontWeight="600">OPEN</text>
          </svg>
        </div>
        <p className="text-xs text-[#8B7355] text-center italic">Panel swings outward on a side hinge</p>
      </div>
    );
  }

  if (type === "slider") {
    // Slider: left panel is fixed, right panel slides left
    return (
      <div className="rounded-xl border border-[#D4B896] bg-white p-3 space-y-1">
        <p className="text-xs font-semibold text-[#8B4513] text-center">Slider — one panel slides horizontally</p>
        <div className="flex justify-center">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="overflow-visible" aria-label="Slider window diagram">
            {/* Outer frame */}
            <rect x={0} y={0} width={W} height={H} rx={3} fill="none" stroke="#8B4513" strokeWidth={FRAME} />
            {/* Fixed left panel */}
            <rect x={FRAME} y={FRAME} width={iW * 0.5 - 1} height={iH} fill="#EEF6FC" stroke="#C4A882" strokeWidth={1.2} rx={1} />
            <text x={FRAME + iW * 0.25} y={H / 2 + 4} textAnchor="middle" fontSize={9} fill="#8B7355" fontWeight="500">FIXED</text>
            {/* Sliding right panel — shown slightly overlapping left panel */}
            <rect x={FRAME + iW * 0.35} y={FRAME + 3} width={iW * 0.5} height={iH - 6} fill="#FEF3E8" stroke="#8B4513" strokeWidth={1.5} rx={1} />
            {/* Glass lines on sliding panel */}
            <line x1={FRAME + iW * 0.35 + 5} y1={FRAME + 10} x2={FRAME + iW * 0.85 - 5} y2={H - FRAME - 10}
              stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
            <line x1={FRAME + iW * 0.85 - 5} y1={FRAME + 10} x2={FRAME + iW * 0.35 + 5} y2={H - FRAME - 10}
              stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
            {/* Handle on right panel */}
            <rect x={FRAME + iW * 0.38} y={H / 2 - 6} width={4} height={12} rx={2} fill="#8B4513" />
            {/* Arrow showing slide direction */}
            <g transform={`translate(${FRAME + iW * 0.6}, ${H - FRAME - 6})`}>
              <line x1={8} y1={0} x2={-8} y2={0} stroke="#8B4513" strokeWidth={1.8} strokeLinecap="round" />
              <polygon points="-8,0 -2,-3.5 -2,3.5" fill="#8B4513" />
            </g>
            <text x={FRAME + iW * 0.6} y={H / 2 + 4} textAnchor="middle" fontSize={9} fill="#8B4513" fontWeight="600">SLIDE</text>
          </svg>
        </div>
        <p className="text-xs text-[#8B7355] text-center italic">Right panel slides left over the fixed panel</p>
      </div>
    );
  }

  // single_hung: bottom sash slides up, top sash is fixed
  return (
    <div className="rounded-xl border border-[#D4B896] bg-white p-3 space-y-1">
      <p className="text-xs font-semibold text-[#8B4513] text-center">Single Hung — bottom sash slides up</p>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="overflow-visible" aria-label="Single hung window diagram">
          {/* Outer frame */}
          <rect x={0} y={0} width={W} height={H} rx={3} fill="none" stroke="#8B4513" strokeWidth={FRAME} />
          {/* Top fixed sash */}
          <rect x={FRAME} y={FRAME} width={iW} height={iH * 0.5 - 1} fill="#EEF6FC" stroke="#C4A882" strokeWidth={1.2} rx={1} />
          {/* Glass lines top sash */}
          <line x1={FRAME + 6} y1={FRAME + 6} x2={W - FRAME - 6} y2={FRAME + iH * 0.5 - 8}
            stroke="#C4B8A8" strokeWidth={0.7} opacity={0.5} />
          <line x1={W - FRAME - 6} y1={FRAME + 6} x2={FRAME + 6} y2={FRAME + iH * 0.5 - 8}
            stroke="#C4B8A8" strokeWidth={0.7} opacity={0.5} />
          <text x={W / 2} y={FRAME + iH * 0.25 + 4} textAnchor="middle" fontSize={9} fill="#8B7355" fontWeight="500">FIXED</text>
          {/* Rail between sashes */}
          <rect x={FRAME} y={FRAME + iH * 0.5 - 1} width={iW} height={4} fill="#C4A882" />
          {/* Bottom sliding sash — shown raised slightly */}
          <rect x={FRAME} y={FRAME + iH * 0.5 + 3} width={iW} height={iH * 0.5 - 3} fill="#FEF3E8" stroke="#8B4513" strokeWidth={1.5} rx={1} />
          {/* Glass lines bottom sash */}
          <line x1={FRAME + 6} y1={FRAME + iH * 0.5 + 9} x2={W - FRAME - 6} y2={H - FRAME - 6}
            stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
          <line x1={W - FRAME - 6} y1={FRAME + iH * 0.5 + 9} x2={FRAME + 6} y2={H - FRAME - 6}
            stroke="#D4956A" strokeWidth={0.7} opacity={0.5} />
          {/* Handle on bottom sash */}
          <rect x={W / 2 - 6} y={FRAME + iH * 0.5 + 5} width={12} height={4} rx={2} fill="#8B4513" />
          {/* Arrow showing upward slide */}
          <g transform={`translate(${W - FRAME - 10}, ${FRAME + iH * 0.7})`}>
            <line x1={0} y1={10} x2={0} y2={-10} stroke="#8B4513" strokeWidth={1.8} strokeLinecap="round" />
            <polygon points="0,-10 -3.5,-4 3.5,-4" fill="#8B4513" />
          </g>
          <text x={W / 2} y={FRAME + iH * 0.75 + 4} textAnchor="middle" fontSize={9} fill="#8B4513" fontWeight="600">SLIDE ↑</text>
        </svg>
      </div>
      <p className="text-xs text-[#8B7355] text-center italic">Bottom sash slides up — top sash stays fixed</p>
    </div>
  );
}

function WindowEntryRow({
  entry,
  cfg,
  onChange,
  onRemove,
}: {
  entry: WindowEntry;
  cfg: WindowConfigData | null | undefined;
  onChange: (updated: WindowEntry) => void;
  onRemove: () => void;
}) {
  const markup = cfg ? parseFloat(cfg.markupPct) || 0.4 : 0.4;
  const base = cfg ? getWindowBasePrice(cfg, entry.frame, entry.type) : 0;
  const colorUp = cfg ? getWindowColorUpcharge(cfg, entry.color) : 0;
  const paneUp = cfg ? getWindowPaneUpcharge(cfg, entry.pane) : 0;
  const sizeUp = cfg ? getWindowSizeUpcharge(cfg, entry.sizeCategory) : 0;
  const unitCost = base + colorUp + paneUp + sizeUp;
  const unitSell = unitCost * (1 + markup);
  const lineSell = unitSell * entry.qty;

  return (
    <div className="border border-[#D4B896] rounded-xl p-4 bg-[#FDFAF7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#4A3728]">Window</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Frame Material</label>
        <OptionPill options={FRAME_OPTIONS} value={entry.frame} onChange={(v) => onChange({ ...entry, frame: v })} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Color</label>
        <OptionPill options={COLOR_OPTIONS} value={entry.color} onChange={(v) => onChange({ ...entry, color: v })} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Window Type</label>
        <OptionPill options={WINDOW_TYPE_OPTIONS} value={entry.type} onChange={(v) => onChange({ ...entry, type: v })} />
        {(entry.type === "casement" || entry.type === "slider" || entry.type === "single_hung") && (
          <WindowTypeDiagram type={entry.type} />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Window Size</label>
        <OptionPill options={WINDOW_SIZE_OPTIONS} value={entry.sizeCategory} onChange={(v) => onChange({ ...entry, sizeCategory: v })} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Pane</label>
        <OptionPill options={PANE_OPTIONS} value={entry.pane} onChange={(v) => onChange({ ...entry, pane: v })} />
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <QtyControl
          value={entry.qty}
          onChange={(v) => onChange({ ...entry, qty: v })}
          label="Quantity"
        />
        {cfg && (
          <div className="text-sm text-[#4A3728]">
            <span className="text-[#8B7355]">Unit: </span>
            <span className="font-medium">${unitSell.toFixed(0)}</span>
            <span className="text-[#8B7355] ml-3">Total: </span>
            <span className="font-semibold text-[#8B4513]">${lineSell.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SGD Diagram Components ─────────────────────────────────────────────────

/**
 * 3-Panel SGD diagram. Shows which panels are fixed (F) and which slide (→).
 * movingPanels: 1 = right slides; 2 = left+right slide; 3 = all slide
 */
function SgdDiagram3Panel({ movingPanels }: { movingPanels: number }) {
  // Panel configs: [isMoving, arrowDir] for [left, center, right]
  const configs: Record<number, [boolean, boolean, boolean]> = {
    1: [false, false, true],   // only right slides
    2: [true,  false, true],   // left and right slide
    3: [true,  true,  true],   // all slide
  };
  const [leftMoving, centerMoving, rightMoving] = configs[movingPanels] ?? configs[1];

  const PANEL_W = 64;
  const PANEL_H = 90;
  const GAP = 4;
  const FRAME = 3;
  const TOTAL_W = PANEL_W * 3 + GAP * 2 + FRAME * 2;
  const TOTAL_H = PANEL_H + FRAME * 2 + 32; // extra for arrows below

  const panels = [
    { x: FRAME, moving: leftMoving, dir: "left" as const },
    { x: FRAME + PANEL_W + GAP, moving: centerMoving, dir: "left" as const },
    { x: FRAME + (PANEL_W + GAP) * 2, moving: rightMoving, dir: "right" as const },
  ];

  const descriptions: Record<number, string> = {
    1: "Fixed · Fixed · Slides →",
    2: "← Slides · Fixed · Slides →",
    3: "← Slides · Slides · Slides →",
  };

  return (
    <div className="rounded-xl border border-[#D4B896] bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-[#8B4513] text-center">{descriptions[movingPanels]}</p>
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
          width={TOTAL_W}
          height={TOTAL_H}
          className="overflow-visible"
          aria-label={`3-panel SGD: ${descriptions[movingPanels]}`}
        >
          {/* Outer frame */}
          <rect x={0} y={0} width={TOTAL_W} height={PANEL_H + FRAME * 2} rx={3} ry={3}
            fill="none" stroke="#8B4513" strokeWidth={FRAME} />
          {/* Panels */}
          {panels.map((p, i) => (
            <g key={i}>
              {/* Panel background */}
              <rect
                x={p.x} y={FRAME}
                width={PANEL_W} height={PANEL_H}
                fill={p.moving ? "#FEF3E8" : "#F0EBE3"}
                stroke={p.moving ? "#8B4513" : "#C4A882"}
                strokeWidth={1.5}
                rx={1}
              />
              {/* Glass cross-hatch lines */}
              <line x1={p.x + 8} y1={FRAME + 8} x2={p.x + PANEL_W - 8} y2={FRAME + PANEL_H - 8}
                stroke={p.moving ? "#D4956A" : "#C4B8A8"} strokeWidth={0.75} opacity={0.5} />
              <line x1={p.x + PANEL_W - 8} y1={FRAME + 8} x2={p.x + 8} y2={FRAME + PANEL_H - 8}
                stroke={p.moving ? "#D4956A" : "#C4B8A8"} strokeWidth={0.75} opacity={0.5} />
              {/* Label */}
              <text
                x={p.x + PANEL_W / 2} y={FRAME + PANEL_H / 2 + 5}
                textAnchor="middle" fontSize={11} fontWeight="600"
                fill={p.moving ? "#8B4513" : "#8B7355"}
              >
                {p.moving ? "SLIDE" : "FIXED"}
              </text>
              {/* Arrow below moving panels */}
              {p.moving && (
                <g transform={`translate(${p.x + PANEL_W / 2}, ${FRAME + PANEL_H + 8})`}>
                  {/* Arrow shaft */}
                  <line
                    x1={p.dir === "right" ? -10 : 10}
                    y1={0}
                    x2={p.dir === "right" ? 10 : -10}
                    y2={0}
                    stroke="#8B4513" strokeWidth={2} strokeLinecap="round"
                  />
                  {/* Arrowhead */}
                  {p.dir === "right" ? (
                    <polygon points="10,0 4,-4 4,4" fill="#8B4513" />
                  ) : (
                    <polygon points="-10,0 -4,-4 -4,4" fill="#8B4513" />
                  )}
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
      <p className="text-xs text-[#8B7355] text-center italic">
        {movingPanels === 1 && "One panel slides to the right"}
        {movingPanels === 2 && "Both outer panels slide outward"}
        {movingPanels === 3 && "All three panels slide — full pocket open"}
      </p>
    </div>
  );
}

/**
 * 4-Panel SGD diagram. Shows center-slide (two center panels open) or multi-slide (all stack).
 */
function SgdDiagram4Panel({ slideStyle }: { slideStyle: "center_slide" | "multi_slide" }) {
  const PANEL_W = 52;
  const PANEL_H = 90;
  const GAP = 3;
  const FRAME = 3;
  const TOTAL_W = PANEL_W * 4 + GAP * 3 + FRAME * 2;
  const TOTAL_H = PANEL_H + FRAME * 2 + 32;

  // center_slide: panels 1 and 2 (0-indexed) slide outward (left and right)
  // multi_slide: all panels stack to one side
  const isCenterSlide = slideStyle === "center_slide";

  const panelConfigs = isCenterSlide
    ? [
        { moving: false, dir: "left" as const, label: "FIXED" },
        { moving: true,  dir: "left" as const, label: "SLIDE" },
        { moving: true,  dir: "right" as const, label: "SLIDE" },
        { moving: false, dir: "right" as const, label: "FIXED" },
      ]
    : [
        { moving: true,  dir: "left" as const, label: "SLIDE" },
        { moving: true,  dir: "left" as const, label: "SLIDE" },
        { moving: true,  dir: "left" as const, label: "SLIDE" },
        { moving: false, dir: "left" as const, label: "FIXED" },
      ];

  return (
    <div className="rounded-xl border border-[#D4B896] bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-[#8B4513] text-center">
        {isCenterSlide ? "Center Slide — two center panels open" : "Multi-Slide — all panels stack"}
      </p>
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
          width={TOTAL_W}
          height={TOTAL_H}
          className="overflow-visible"
          aria-label={`4-panel SGD: ${isCenterSlide ? "center slide" : "multi slide"}`}
        >
          {/* Outer frame */}
          <rect x={0} y={0} width={TOTAL_W} height={PANEL_H + FRAME * 2} rx={3} ry={3}
            fill="none" stroke="#8B4513" strokeWidth={FRAME} />
          {panelConfigs.map((p, i) => {
            const px = FRAME + i * (PANEL_W + GAP);
            return (
              <g key={i}>
                <rect
                  x={px} y={FRAME}
                  width={PANEL_W} height={PANEL_H}
                  fill={p.moving ? "#FEF3E8" : "#F0EBE3"}
                  stroke={p.moving ? "#8B4513" : "#C4A882"}
                  strokeWidth={1.5}
                  rx={1}
                />
                {/* Glass lines */}
                <line x1={px + 6} y1={FRAME + 6} x2={px + PANEL_W - 6} y2={FRAME + PANEL_H - 6}
                  stroke={p.moving ? "#D4956A" : "#C4B8A8"} strokeWidth={0.75} opacity={0.5} />
                <line x1={px + PANEL_W - 6} y1={FRAME + 6} x2={px + 6} y2={FRAME + PANEL_H - 6}
                  stroke={p.moving ? "#D4956A" : "#C4B8A8"} strokeWidth={0.75} opacity={0.5} />
                <text
                  x={px + PANEL_W / 2} y={FRAME + PANEL_H / 2 + 5}
                  textAnchor="middle" fontSize={9} fontWeight="600"
                  fill={p.moving ? "#8B4513" : "#8B7355"}
                >
                  {p.label}
                </text>
                {p.moving && (
                  <g transform={`translate(${px + PANEL_W / 2}, ${FRAME + PANEL_H + 8})`}>
                    <line
                      x1={p.dir === "right" ? -8 : 8}
                      y1={0}
                      x2={p.dir === "right" ? 8 : -8}
                      y2={0}
                      stroke="#8B4513" strokeWidth={2} strokeLinecap="round"
                    />
                    {p.dir === "right" ? (
                      <polygon points="8,0 2,-3.5 2,3.5" fill="#8B4513" />
                    ) : (
                      <polygon points="-8,0 -2,-3.5 -2,3.5" fill="#8B4513" />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-[#8B7355] text-center italic">
        {isCenterSlide
          ? "Two center panels slide apart — fixed panels on each end"
          : "Three panels stack to one side — maximum opening width"}
      </p>
    </div>
  );
}

function SgdEntryRow({
  entry,
  cfg,
  onChange,
  onRemove,
}: {
  entry: SgdEntry;
  cfg: WindowConfigData | null | undefined;
  onChange: (updated: SgdEntry) => void;
  onRemove: () => void;
}) {
  const markup = cfg ? parseFloat(cfg.markupPct) || 0.4 : 0.4;
  const base = cfg ? getSgdBasePrice(cfg, entry.panels) : 0;
  const colorUp = cfg ? getSgdColorUpcharge(cfg, entry.color) : 0;
  const frameUp = cfg ? getSgdFrameUpcharge(cfg, entry.frame) : 0;
  const movingUp = entry.panels === "3panel"
    ? (Math.max(0, entry.movingPanels - 1)) * (cfg ? parseFloat(cfg.sgd_movingPanelUpcharge) || 0 : 0)
    : 0;
  const slideUp = entry.panels === "4panel" && entry.slideStyle === "multi_slide"
    ? (cfg ? parseFloat(cfg.sgd_multiSlideUpcharge) || 0 : 0)
    : 0;
  const openingUp = cfg ? getSgdOpeningUpcharge(cfg, entry.openingType) : 0;
  const unitCost = base + colorUp + frameUp + movingUp + slideUp + openingUp;
  const unitSell = unitCost * (1 + markup);
  const lineSell = unitSell * entry.qty;

  // Max moving panels for 3-panel is 3 (all panels), min is 1
  const maxMoving = entry.panels === "3panel" ? 3 : 2;

  return (
    <div className="border border-[#D4B896] rounded-xl p-4 bg-[#FDFAF7] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#4A3728]">Sliding Glass Door</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Panel count */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Panel Configuration</label>
        <OptionPill
          options={SGD_PANEL_OPTIONS}
          value={entry.panels}
          onChange={(v) => onChange({
            ...entry,
            panels: v,
            // Reset moving panels and slide style when switching
            movingPanels: v === "3panel" ? 1 : entry.movingPanels,
            slideStyle: v === "4panel" ? "center_slide" : entry.slideStyle,
          })}
        />
      </div>

      {/* 3-panel: moving panel count + diagram */}
      {entry.panels === "3panel" && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">
            Moving Panels
            <InfoTooltip description="How many of the 3 panels slide open. 1 = one side slides; 2 = both outer panels slide; 3 = all panels slide (pocket door style)" />
          </label>
          <QtyControl
            value={entry.movingPanels}
            onChange={(v) => onChange({ ...entry, movingPanels: v })}
            min={1}
            max={maxMoving}
            label="Moving"
          />
          {/* Inline diagram */}
          <SgdDiagram3Panel movingPanels={entry.movingPanels} />
        </div>
      )}

      {/* 4-panel: slide style + diagram */}
      {entry.panels === "4panel" && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Slide Style</label>
          <OptionPill
            options={SGD_SLIDE_STYLE_OPTIONS}
            value={entry.slideStyle}
            onChange={(v) => onChange({ ...entry, slideStyle: v })}
          />
          {/* Inline diagram */}
          <SgdDiagram4Panel slideStyle={entry.slideStyle} />
        </div>
      )}

      {/* Opening type */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Opening Type</label>
        <OptionPill
          options={SGD_OPENING_TYPE_OPTIONS}
          value={entry.openingType}
          onChange={(v) => onChange({ ...entry, openingType: v })}
        />
        {entry.openingType === "new_opening" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            New opening upcharge applies — includes framing, header, and structural work.
          </p>
        )}
      </div>

      {/* Frame material */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Frame Material</label>
        <OptionPill
          options={SGD_FRAME_OPTIONS}
          value={entry.frame}
          onChange={(v) => onChange({ ...entry, frame: v })}
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Color</label>
        <OptionPill options={COLOR_OPTIONS} value={entry.color} onChange={(v) => onChange({ ...entry, color: v })} />
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">Door Dimensions</label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B7355]">Width (ft)</span>
            <input
              type="number"
              min={1}
              max={40}
              step={0.5}
              value={entry.widthFt || ""}
              placeholder="e.g. 12"
              onChange={(e) => onChange({ ...entry, widthFt: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 border border-[#D4B896] rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#8B4513]/30"
            />
          </div>
          <span className="text-[#8B7355] text-sm">×</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B7355]">Height (ft)</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={entry.heightFt || ""}
              placeholder="e.g. 8"
              onChange={(e) => onChange({ ...entry, heightFt: parseFloat(e.target.value) || 0 })}
              className="w-20 px-2 py-1 border border-[#D4B896] rounded-lg text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#8B4513]/30"
            />
          </div>
        </div>
      </div>

      {/* Quantity + pricing */}
      <div className="flex items-center gap-6 flex-wrap">
        <QtyControl
          value={entry.qty}
          onChange={(v) => onChange({ ...entry, qty: v })}
          label="Quantity"
        />
        {cfg && (
          <div className="text-sm text-[#4A3728]">
            <span className="text-[#8B7355]">Unit: </span>
            <span className="font-medium">${unitSell.toFixed(0)}</span>
            <span className="text-[#8B7355] ml-3">Total: </span>
            <span className="font-semibold text-[#8B4513]">${lineSell.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Header & Casing sub-component ───────────────────────────────────────────

function HeaderCasingSection({
  state,
  onChange,
  cfg,
}: {
  state: HeaderCasingState;
  onChange: (updated: HeaderCasingState) => void;
  cfg: WindowConfigData | null | undefined;
}) {
  const markup = cfg ? parseFloat(cfg.markupPct) || 0.4 : 0.4;
  const pieces = headerPieceCount(state.headerLf);
  const headerCostPerLf = cfg ? parseFloat(cfg.price_header_per_lf) || 0 : 0;
  const casingCostPerSet = cfg ? parseFloat(cfg.price_casing_per_set) || 0 : 0;
  const headerSell = state.headerLf * headerCostPerLf * (1 + markup);
  const casingSell = state.casingCount * casingCostPerSet * (1 + markup);

  return (
    <div className="border border-[#D4B896] rounded-xl p-4 bg-[#FDFAF7] space-y-4">
      <h4 className="text-sm font-semibold text-[#4A3728] uppercase tracking-wide">Headers & Casings</h4>

      {/* Header LF */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">
          Header Material (Linear Feet)
          <InfoTooltip description="Total LF of header material needed. Automatically divided into 16-foot pieces." />
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center border border-[#D4B896] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => onChange({ ...state, headerLf: Math.max(0, state.headerLf - 1) })}
              className="px-2.5 py-1 text-[#8B4513] hover:bg-[#FDF8F4] transition-colors text-base font-bold leading-none"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              step={1}
              value={state.headerLf || ""}
              placeholder="0"
              onChange={(e) => onChange({ ...state, headerLf: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-20 px-2 py-1 text-sm font-semibold text-[#4A3728] text-center bg-white border-x border-[#D4B896] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange({ ...state, headerLf: state.headerLf + 1 })}
              className="px-2.5 py-1 text-[#8B4513] hover:bg-[#FDF8F4] transition-colors text-base font-bold leading-none"
            >
              +
            </button>
          </div>
          {state.headerLf > 0 && (
            <div className="text-sm text-[#4A3728]">
              <span className="font-semibold text-[#8B4513]">{pieces} piece{pieces !== 1 ? "s" : ""}</span>
              <span className="text-[#8B7355] ml-1">@ 16 ft each</span>
              {cfg && (
                <span className="ml-3 text-[#8B7355]">
                  → <span className="font-medium text-[#4A3728]">${headerSell.toFixed(0)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Casing count */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8B7355] uppercase tracking-wide">
          Casing Sets
          <InfoTooltip description="Number of casing sets — typically one set per window or door opening." />
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          <QtyControl
            value={state.casingCount}
            onChange={(v) => onChange({ ...state, casingCount: Math.max(0, v) })}
            min={0}
            max={99}
            label="Sets"
          />
          {state.casingCount > 0 && cfg && (
            <div className="text-sm text-[#4A3728]">
              <span className="text-[#8B7355]">Total: </span>
              <span className="font-medium">${casingSell.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WindowsPricingSectionProps {
  state: WindowsState;
  onChange: (updated: WindowsState) => void;
  cfg: WindowConfigData | null | undefined;
}

export function WindowsPricingSection({ state, onChange, cfg }: WindowsPricingSectionProps) {
  function addWindow() {
    onChange({
      ...state,
      windows: [
        ...state.windows,
        {
          id: uid(),
          frame: "vinyl",
          color: "white_on_white",
          type: "double_hung",
          pane: "double",
          sizeCategory: "standard_egress" as WindowSizeCategory,
          qty: 1,
        },
      ],
    });
  }

  function updateWindow(id: string, updated: WindowEntry) {
    onChange({
      ...state,
      windows: state.windows.map((w) => (w.id === id ? updated : w)),
    });
  }

  function removeWindow(id: string) {
    onChange({ ...state, windows: state.windows.filter((w) => w.id !== id) });
  }

  function addSgd() {
    onChange({
      ...state,
      sgds: [
        ...state.sgds,
        {
          id: uid(),
          panels: "2panel",
          movingPanels: 1,
          slideStyle: "center_slide",
          frame: "vinyl",
          color: "white_on_white",
          openingType: "existing_opening" as SgdOpeningType,
          widthFt: 0,
          heightFt: 0,
          qty: 1,
        },
      ],
    });
  }

  function updateSgd(id: string, updated: SgdEntry) {
    onChange({
      ...state,
      sgds: state.sgds.map((s) => (s.id === id ? updated : s)),
    });
  }

  function removeSgd(id: string) {
    onChange({ ...state, sgds: state.sgds.filter((s) => s.id !== id) });
  }

  const { total } = calcWindowsPricing(state, cfg);
  const hasItems = state.windows.length > 0 || state.sgds.length > 0 || state.headerCasing.headerLf > 0 || state.headerCasing.casingCount > 0;

  return (
    <div className="space-y-6">
      {/* Windows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#4A3728] uppercase tracking-wide">Windows</h4>
          <button
            type="button"
            onClick={addWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#8B4513] text-white hover:bg-[#7A3B10] transition-colors"
          >
            + Add Window
          </button>
        </div>

        {state.windows.length === 0 && (
          <p className="text-sm text-[#8B7355] italic">No windows added yet. Click "Add Window" to get started.</p>
        )}

        {state.windows.map((w) => (
          <WindowEntryRow
            key={w.id}
            entry={w}
            cfg={cfg}
            onChange={(updated) => updateWindow(w.id, updated)}
            onRemove={() => removeWindow(w.id)}
          />
        ))}
      </div>

      {/* Sliding Glass Doors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#4A3728] uppercase tracking-wide">Sliding Glass Doors</h4>
          <button
            type="button"
            onClick={addSgd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#8B4513] text-white hover:bg-[#7A3B10] transition-colors"
          >
            + Add SGD
          </button>
        </div>

        {state.sgds.length === 0 && (
          <p className="text-sm text-[#8B7355] italic">No sliding glass doors added yet.</p>
        )}

        {state.sgds.map((s) => (
          <SgdEntryRow
            key={s.id}
            entry={s}
            cfg={cfg}
            onChange={(updated) => updateSgd(s.id, updated)}
            onRemove={() => removeSgd(s.id)}
          />
        ))}
      </div>

      {/* Headers & Casings */}
      <HeaderCasingSection
        state={state.headerCasing}
        onChange={(hc) => onChange({ ...state, headerCasing: hc })}
        cfg={cfg}
      />

      {/* Running total */}
      {hasItems && cfg && (
        <div className="flex items-center justify-between p-3 bg-[#F5EDE3] rounded-xl border border-[#D4B896]">
          <span className="text-sm font-medium text-[#4A3728]">Windows & Doors Subtotal</span>
          <span className="text-lg font-bold text-[#8B4513]">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      )}
    </div>
  );
}
