/**
 * LumberPackageCallout
 *
 * Auto-configured structural lumber package callout for the estimate.
 * Quantities are derived from the framing structural calc results (joist size,
 * beam type/size, deck dimensions, post spacing).
 *
 * Each line item has a "Needs Lift" checkbox. Items at or above the admin-
 * configured beam depth thresholds are auto-suggested as needing 1 or 2 lifts.
 * The user can override any item's lift selection. Lift cost is shown as a
 * separate line item in the package subtotal.
 *
 * The governing joist/beam sizes already account for hot tub load if a hot tub
 * is enabled — the hot tub section adds its PSF on top and the framing section
 * re-runs the calc with the combined load.
 */

import { useMemo } from "react";
import { Package, Info, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { type FramingStructuralState } from "@/components/FramingStructuralSection";
import { type LumberItem } from "@/hooks/useConfig";

interface LumberPackageCalloutProps {
  framingStructural: FramingStructuralState;
  lumberItems: LumberItem[];
  deckWidthFt: number;
  deckLengthFt: number;
  showPricing?: boolean;
  // Hot tub info for display only
  hotTubEnabled?: boolean;
  hotTubPersonSize?: number;
  // Lift threshold settings (from useConfig)
  liftThreshold1DepthIn?: number;
  liftThreshold2DepthIn?: number;
  liftCost1?: number;
  liftCost2?: number;
  // Callback to update lift selections in parent state
  onLiftSelectionsChange?: (selections: Record<string, 0 | 1 | 2>) => void;
}

interface LumberLineItem {
  /** Stable key used to store lift selection */
  key: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  note?: string;
  isPriceTBD?: boolean;
  /** Depth in inches extracted from item name/size — used for auto-lift suggestion */
  depthIn: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Parse joist size from a recommendation string like "2x10 @ 12\" o.c." -> { size: "2x10", spacingIn: 12 }
function parseJoistRec(rec: string | null): { size: string; spacingIn: number } {
  if (!rec) return { size: "2x10", spacingIn: 12 };
  const spacingMatch = rec.match(/(\d+)"\s*o\.c\./);
  const spacingIn = spacingMatch ? parseInt(spacingMatch[1]) : 12;
  const sizeMatch = rec.match(/2x\d+/i);
  const size = sizeMatch ? sizeMatch[0].toLowerCase() : "2x10";
  return { size, spacingIn };
}

/** Extract nominal depth (inches) from a lumber size string like "2x10", "LVL 11-7/8\"", "5-1/8\" x 16.5\"" */
function extractDepthIn(name: string): number {
  // Glulam / LVL with decimal depth like "x16.5" or "x 16.5"
  const decimalMatch = name.match(/x\s*([\d.]+)/i);
  if (decimalMatch) return parseFloat(decimalMatch[1]);
  // Fractional depth like "11-7/8" or "9-1/4"
  const fracMatch = name.match(/(\d+)-(\d+)\/(\d+)/);
  if (fracMatch) return parseInt(fracMatch[1]) + parseInt(fracMatch[2]) / parseInt(fracMatch[3]);
  // Simple 2xN pattern
  const dimMatch = name.match(/2x(\d+)/i);
  if (dimMatch) return parseInt(dimMatch[1]);
  // Fallback: last number in string
  const nums = name.match(/\d+/g);
  if (nums && nums.length > 0) return parseInt(nums[nums.length - 1]);
  return 0;
}

function findJoistItem(lumberItems: LumberItem[], joistSize: string, deckLengthFt: number): LumberItem | null {
  const sizeNorm = joistSize.toLowerCase().replace(/\s/g, "");
  const lengthFt = Math.ceil(deckLengthFt / 2) * 2;
  const candidates = lumberItems.filter(item => {
    const nameLower = item.name.toLowerCase().replace(/\s/g, "");
    return item.category === "joist" && nameLower.includes(sizeNorm);
  });
  if (candidates.length === 0) return null;
  const withLength = candidates.find(item => item.name.includes(`${lengthFt}'`));
  return withLength ?? candidates[0];
}

function findBeamItem(lumberItems: LumberItem[], beamRec: string | null): LumberItem | null {
  if (!beamRec) return null;
  const recLower = beamRec.toLowerCase();

  if (recLower.includes("glulam")) {
    const sizeMatch = beamRec.match(/(\d[\d/"-]+x\d[\d/"-]+)/i);
    if (sizeMatch) {
      const size = sizeMatch[1].toLowerCase();
      const candidates = lumberItems.filter(item =>
        item.category === "beam" &&
        item.name.toLowerCase().includes("glulam") &&
        item.name.toLowerCase().includes(size)
      );
      if (candidates.length > 0) return candidates[0];
    }
    return lumberItems.find(item => item.category === "beam" && item.name.toLowerCase().includes("glulam")) ?? null;
  }

  if (recLower.includes("lvl")) {
    const depthMatch = beamRec.match(/x([\d.]+)"/);
    if (depthMatch) {
      const depth = depthMatch[1];
      const candidates = lumberItems.filter(item =>
        item.category === "beam" &&
        item.name.toLowerCase().includes("lvl") &&
        item.name.includes(depth + '"')
      );
      return candidates[0] ?? null;
    }
  }

  const dimMatch = beamRec.match(/\(\d\)2x\d+/i);
  if (dimMatch) {
    const key = dimMatch[0].toLowerCase();
    const candidates = lumberItems.filter(item =>
      item.category === "beam" &&
      item.name.toLowerCase().replace(/\s/g, "").includes(key.replace(/\s/g, ""))
    );
    return candidates[0] ?? null;
  }

  return null;
}

function findHangerItem(lumberItems: LumberItem[], joistSize: string): LumberItem | null {
  const sizeNum = joistSize.replace(/[^0-9]/g, "").slice(-2);
  const candidates = lumberItems.filter(item =>
    item.category === "hanger" &&
    item.name.toLowerCase().includes(sizeNum) &&
    !item.name.toLowerCase().includes("heavy") &&
    !item.name.toLowerCase().includes("double")
  );
  return candidates[0] ?? null;
}

function findRimBoardItem(lumberItems: LumberItem[], joistSize: string): LumberItem | null {
  const sizeNum = joistSize.replace(/[^0-9]/g, "").slice(-2);
  const candidates = lumberItems.filter(item =>
    item.category === "rimboard" &&
    item.name.toLowerCase().includes(sizeNum)
  );
  return candidates[0] ?? null;
}

function findPostBase(lumberItems: LumberItem[]): LumberItem | null {
  return lumberItems.find(item => item.category === "hardware" && item.name.toLowerCase().includes("post base")) ?? null;
}

function findPostCap(lumberItems: LumberItem[]): LumberItem | null {
  return lumberItems.find(item => item.category === "hardware" && item.name.toLowerCase().includes("post cap")) ?? null;
}

function findPostItem(lumberItems: LumberItem[]): LumberItem | null {
  return lumberItems.find(item => item.category === "post" && item.name.toLowerCase().includes("6x6")) ?? null;
}

function findScrews(lumberItems: LumberItem[]): LumberItem | null {
  return lumberItems.find(item => item.category === "hardware" && item.name.toLowerCase().includes("screw")) ?? null;
}

function findJoistTape(lumberItems: LumberItem[]): LumberItem | null {
  return lumberItems.find(item => item.category === "hardware" && item.name.toLowerCase().includes("tape")) ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LumberPackageCallout({
  framingStructural,
  lumberItems,
  deckWidthFt,
  deckLengthFt,
  showPricing = true,
  hotTubEnabled = false,
  hotTubPersonSize,
  liftThreshold1DepthIn = 10,
  liftThreshold2DepthIn = 14,
  liftCost1 = 450,
  liftCost2 = 800,
  onLiftSelectionsChange,
}: LumberPackageCalloutProps) {
  // Use governing sizes (hot tub adjusted if applicable, otherwise base deck)
  const governingJoistSize = framingStructural.hotTubAdjustedJoistSize ?? framingStructural.recommendedJoistSize;
  const governingBeamSize = framingStructural.hotTubAdjustedBeamSize ?? framingStructural.recommendedBeamSize;
  const postSpacingFt = framingStructural.postSpacingFt;
  const liftSelections = framingStructural.liftSelections ?? {};

  const lineItems = useMemo<LumberLineItem[]>(() => {
    if (framingStructural.snowLoadPsf == null || !governingJoistSize) return [];

    const items: LumberLineItem[] = [];
    const { size: joistSize, spacingIn } = parseJoistRec(governingJoistSize);
    const spacingFt = spacingIn / 12;
    const joistCount = Math.ceil(deckWidthFt / spacingFt) + 1;
    const postCount = Math.ceil(deckWidthFt / postSpacingFt) + 1;
    const rimBoardLf = (deckWidthFt * 2) + (deckLengthFt * 2);
    const beamLf = deckWidthFt;
    const hangerCount = joistCount - 2;
    const screwBoxes = Math.ceil(joistCount / 25);
    const tapeRolls = Math.ceil(joistCount / 10);

    // Joists
    const joistItem = findJoistItem(lumberItems, joistSize, deckLengthFt);
    if (joistItem) {
      items.push({
        key: `joist-${joistSize}`,
        name: joistItem.name,
        qty: joistCount,
        unit: "ea",
        unitPrice: joistItem.displayPrice,
        total: joistCount * joistItem.displayPrice,
        note: `${spacingIn}" o.c., ${joistCount} joists for ${deckWidthFt}' deck width`,
        depthIn: extractDepthIn(joistItem.name),
      });
    } else {
      items.push({
        key: `joist-${joistSize}`,
        name: `${joistSize.toUpperCase()} Pressure Treated Joist`,
        qty: joistCount,
        unit: "ea",
        unitPrice: 0,
        total: 0,
        note: `${spacingIn}" o.c. — price not in catalog`,
        isPriceTBD: true,
        depthIn: extractDepthIn(joistSize),
      });
    }

    // Rim board
    const rimItem = findRimBoardItem(lumberItems, joistSize);
    if (rimItem) {
      items.push({
        key: `rimboard-${joistSize}`,
        name: rimItem.name,
        qty: rimBoardLf,
        unit: "LF",
        unitPrice: rimItem.displayPrice,
        total: rimBoardLf * rimItem.displayPrice,
        note: `Perimeter: (${deckWidthFt}' + ${deckLengthFt}') x 2`,
        depthIn: extractDepthIn(rimItem.name),
      });
    }

    // Beam
    const beamItem = findBeamItem(lumberItems, governingBeamSize);
    const isGlulamTBD = governingBeamSize?.toLowerCase().includes("glulam") && (!beamItem || beamItem.displayPrice === 0);
    if (beamItem && !isGlulamTBD) {
      items.push({
        key: `beam-${governingBeamSize}`,
        name: beamItem.name,
        qty: beamLf,
        unit: "LF",
        unitPrice: beamItem.displayPrice,
        total: beamLf * beamItem.displayPrice,
        note: `Outside edge beam, ${beamLf}' span`,
        depthIn: extractDepthIn(beamItem.name),
      });
    } else {
      items.push({
        key: `beam-${governingBeamSize ?? "tbd"}`,
        name: governingBeamSize ?? "Outside Edge Beam",
        qty: beamLf,
        unit: "LF",
        unitPrice: 0,
        total: 0,
        note: "Glulam pricing TBD — contact for quote",
        isPriceTBD: true,
        depthIn: extractDepthIn(governingBeamSize ?? ""),
      });
    }

    // Joist hangers
    const hangerItem = findHangerItem(lumberItems, joistSize);
    if (hangerItem) {
      items.push({
        key: `hanger-${joistSize}`,
        name: hangerItem.name,
        qty: hangerCount,
        unit: "ea",
        unitPrice: hangerItem.displayPrice,
        total: hangerCount * hangerItem.displayPrice,
        note: `1 per interior joist`,
        depthIn: 0,
      });
    }

    // Posts
    const postBase = findPostBase(lumberItems);
    const postCap = findPostCap(lumberItems);
    const postItem = findPostItem(lumberItems);

    if (postBase) {
      items.push({
        key: "post-base",
        name: postBase.name,
        qty: postCount,
        unit: "ea",
        unitPrice: postBase.displayPrice,
        total: postCount * postBase.displayPrice,
        note: `${postCount} posts at ${postSpacingFt}' o.c.`,
        depthIn: 0,
      });
    }
    if (postCap) {
      items.push({
        key: "post-cap",
        name: postCap.name,
        qty: postCount,
        unit: "ea",
        unitPrice: postCap.displayPrice,
        total: postCount * postCap.displayPrice,
        depthIn: 0,
      });
    }
    if (postItem) {
      const postHeightFt = 4;
      items.push({
        key: "post-6x6",
        name: postItem.name,
        qty: postCount * postHeightFt,
        unit: "LF",
        unitPrice: postItem.displayPrice,
        total: postCount * postHeightFt * postItem.displayPrice,
        note: `${postCount} posts x ~${postHeightFt}' height (verify on site)`,
        depthIn: 6, // 6x6 post
      });
    }

    // Structural screws
    const screwItem = findScrews(lumberItems);
    if (screwItem) {
      items.push({
        key: "screws",
        name: screwItem.name,
        qty: screwBoxes,
        unit: "box",
        unitPrice: screwItem.displayPrice,
        total: screwBoxes * screwItem.displayPrice,
        note: `~1 box per 25 joists`,
        depthIn: 0,
      });
    }

    // Joist tape
    const tapeItem = findJoistTape(lumberItems);
    if (tapeItem) {
      items.push({
        key: "joist-tape",
        name: tapeItem.name,
        qty: tapeRolls,
        unit: "roll",
        unitPrice: tapeItem.displayPrice,
        total: tapeRolls * tapeItem.displayPrice,
        note: `~1 roll per 10 joists`,
        depthIn: 0,
      });
    }

    return items;
  }, [framingStructural, governingJoistSize, governingBeamSize, postSpacingFt, lumberItems, deckWidthFt, deckLengthFt]);

  if (framingStructural.snowLoadPsf == null || lineItems.length === 0) return null;

  // ─── Lift logic ─────────────────────────────────────────────────────────────

  /** Compute the auto-suggested lift level for an item based on its depth */
  function autoLiftLevel(item: LumberLineItem): 0 | 1 | 2 {
    if (item.depthIn >= liftThreshold2DepthIn) return 2;
    if (item.depthIn >= liftThreshold1DepthIn) return 1;
    return 0;
  }

  /** Get the effective lift level: explicit selection overrides auto-suggestion */
  function effectiveLiftLevel(item: LumberLineItem): 0 | 1 | 2 {
    if (item.key in liftSelections) return liftSelections[item.key];
    return autoLiftLevel(item);
  }

  function handleLiftToggle(item: LumberLineItem, level: 0 | 1 | 2) {
    if (!onLiftSelectionsChange) return;
    const newSelections = { ...liftSelections, [item.key]: level };
    onLiftSelectionsChange(newSelections);
  }

  // Compute lift costs
  const liftItems = lineItems.filter(item => effectiveLiftLevel(item) > 0);
  const lift1Items = lineItems.filter(item => effectiveLiftLevel(item) === 1);
  const lift2Items = lineItems.filter(item => effectiveLiftLevel(item) === 2);
  const totalLiftCost = lift1Items.length * liftCost1 + lift2Items.length * liftCost2;

  const pricedItems = lineItems.filter(i => !i.isPriceTBD);
  const tbdItems = lineItems.filter(i => i.isPriceTBD);
  const materialSubtotal = pricedItems.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = materialSubtotal + totalLiftCost;
  const hasTBD = tbdItems.length > 0;

  const hotTubUpsizedJoist = hotTubEnabled &&
    framingStructural.hotTubAdjustedJoistSize != null &&
    framingStructural.hotTubAdjustedJoistSize !== framingStructural.recommendedJoistSize;
  const hotTubUpsizedBeam = hotTubEnabled &&
    framingStructural.hotTubAdjustedBeamSize != null &&
    framingStructural.hotTubAdjustedBeamSize !== framingStructural.recommendedBeamSize;

  const isEditable = !!onLiftSelectionsChange;

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-300 flex items-center gap-2">
        <Package className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-body font-bold text-amber-900">Structural Lumber Package</p>
          <p className="text-xs text-amber-700">
            Auto-configured from load calc — {framingStructural.joistSpanFt}' span, {framingStructural.snowLoadPsf} psf snow load
            {hotTubEnabled && hotTubPersonSize ? `, ${hotTubPersonSize}-person hot tub load included` : ""}
          </p>
          {(hotTubUpsizedJoist || hotTubUpsizedBeam) && (
            <p className="text-xs text-orange-700 mt-0.5 font-medium">
              ⚠ Hot tub load caused upsize:{" "}
              {hotTubUpsizedJoist && `joists ${framingStructural.recommendedJoistSize} → ${framingStructural.hotTubAdjustedJoistSize}`}
              {hotTubUpsizedJoist && hotTubUpsizedBeam && " · "}
              {hotTubUpsizedBeam && `beam ${framingStructural.recommendedBeamSize} → ${framingStructural.hotTubAdjustedBeamSize}`}
            </p>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="px-4 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-amber-200">
              <th className="text-left font-body font-semibold text-amber-900 pb-1.5 pr-2">Item</th>
              <th className="text-right font-body font-semibold text-amber-900 pb-1.5 px-2">Qty</th>
              <th className="text-right font-body font-semibold text-amber-900 pb-1.5 px-2">Unit</th>
              {showPricing && (
                <>
                  <th className="text-right font-body font-semibold text-amber-900 pb-1.5 px-2">Unit $</th>
                  <th className="text-right font-body font-semibold text-amber-900 pb-1.5 px-2">Total</th>
                </>
              )}
              <th className="text-center font-body font-semibold text-amber-900 pb-1.5 pl-2 whitespace-nowrap">
                <span className="flex items-center gap-1 justify-center">
                  <Truck className="w-3 h-3" />
                  Lift
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {lineItems.map((item) => {
              const autoLevel = autoLiftLevel(item);
              const effectiveLevel = effectiveLiftLevel(item);
              const isOverridden = item.key in liftSelections && liftSelections[item.key] !== autoLevel;

              return (
                <tr key={item.key} className={item.isPriceTBD ? "opacity-70" : ""}>
                  <td className="py-1.5 pr-2">
                    <p className="font-body text-charcoal leading-tight">{item.name}</p>
                    {item.note && (
                      <p className="text-amber-600 text-xs mt-0.5 leading-tight">{item.note}</p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-charcoal">{item.qty}</td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">{item.unit}</td>
                  {showPricing && (
                    <>
                      <td className="py-1.5 px-2 text-right font-mono text-charcoal">
                        {item.isPriceTBD ? (
                          <span className="text-amber-600 font-semibold">TBD</span>
                        ) : (
                          formatCurrency(item.unitPrice)
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-semibold text-charcoal">
                        {item.isPriceTBD ? (
                          <span className="text-amber-600">TBD</span>
                        ) : (
                          formatCurrency(item.total)
                        )}
                      </td>
                    </>
                  )}
                  {/* Lift selector */}
                  <td className="py-1.5 pl-2">
                    <div className="flex flex-col items-center gap-1">
                      {/* 1 Lift checkbox */}
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`lift1-${item.key}`}
                          checked={effectiveLevel >= 1}
                          onCheckedChange={(checked) => {
                            if (!isEditable) return;
                            if (checked) {
                              handleLiftToggle(item, effectiveLevel >= 2 ? 2 : 1);
                            } else {
                              handleLiftToggle(item, 0);
                            }
                          }}
                          disabled={!isEditable}
                          className="w-3.5 h-3.5 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <Label
                          htmlFor={`lift1-${item.key}`}
                          className={`text-xs cursor-pointer select-none ${effectiveLevel >= 1 ? "text-amber-800 font-semibold" : "text-charcoal/50"}`}
                        >
                          1
                          {autoLevel >= 1 && !isOverridden && (
                            <span className="ml-0.5 text-amber-500 text-xs">*</span>
                          )}
                        </Label>
                      </div>
                      {/* 2nd Lift checkbox — only shown when item depth reaches threshold 2 or user already has 1 lift */}
                      {(item.depthIn >= liftThreshold2DepthIn || effectiveLevel >= 1) && (
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`lift2-${item.key}`}
                            checked={effectiveLevel >= 2}
                            onCheckedChange={(checked) => {
                              if (!isEditable) return;
                              handleLiftToggle(item, checked ? 2 : 1);
                            }}
                            disabled={!isEditable || effectiveLevel < 1}
                            className="w-3.5 h-3.5 border-amber-400 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                          />
                          <Label
                            htmlFor={`lift2-${item.key}`}
                            className={`text-xs cursor-pointer select-none ${effectiveLevel >= 2 ? "text-orange-800 font-semibold" : "text-charcoal/40"}`}
                          >
                            2
                            {autoLevel >= 2 && !isOverridden && (
                              <span className="ml-0.5 text-orange-500 text-xs">*</span>
                            )}
                          </Label>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {showPricing && (
            <tfoot>
              {/* Material subtotal */}
              <tr className="border-t border-amber-300">
                <td colSpan={3} className="pt-2 text-xs font-body font-semibold text-amber-900">
                  Materials Subtotal
                  {hasTBD && <span className="text-amber-600 font-normal ml-1">(excl. TBD items)</span>}
                </td>
                <td />
                <td className="pt-2 text-right font-mono font-bold text-amber-900">
                  {formatCurrency(materialSubtotal)}
                  {hasTBD && <span className="text-amber-600 text-xs ml-1">+</span>}
                </td>
                <td />
              </tr>
              {/* Lift cost row — only shown when any lifts are selected */}
              {liftItems.length > 0 && (
                <tr>
                  <td colSpan={3} className="pt-1 text-xs font-body text-amber-800">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-600" />
                      Material Lift{liftItems.length > 1 ? "s" : ""}
                      <span className="text-amber-600 font-normal ml-0.5">
                        ({lift1Items.length > 0 && `${lift1Items.length}× 1-lift`}
                        {lift1Items.length > 0 && lift2Items.length > 0 && ", "}
                        {lift2Items.length > 0 && `${lift2Items.length}× 2-lift`})
                      </span>
                    </span>
                  </td>
                  <td />
                  <td className="pt-1 text-right font-mono font-semibold text-amber-800">
                    {formatCurrency(totalLiftCost)}
                  </td>
                  <td />
                </tr>
              )}
              {/* Grand total */}
              <tr className="border-t border-amber-400">
                <td colSpan={3} className="pt-2 text-xs font-body font-bold text-amber-900">
                  Package Total
                  {hasTBD && <span className="text-amber-600 font-normal ml-1">(excl. TBD items)</span>}
                </td>
                <td />
                <td className="pt-2 text-right font-mono font-bold text-amber-900 text-sm">
                  {formatCurrency(grandTotal)}
                  {hasTBD && <span className="text-amber-600 text-xs ml-1">+</span>}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>

        {/* Lift legend */}
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-amber-100/70 border border-amber-200">
          <Truck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Material Lift:</strong> Check items that will require a crane or lift to set in place.
            Items ≥ {liftThreshold1DepthIn}" depth are auto-suggested for 1 lift ({formatCurrency(liftCost1)});
            items ≥ {liftThreshold2DepthIn}" depth for 2 lifts ({formatCurrency(liftCost2)}).
            <span className="ml-1 text-amber-500">* = auto-suggested</span>
          </p>
        </div>

        {hasTBD && (
          <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-amber-100 border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>TBD items:</strong> {tbdItems.map(i => i.name).join(", ")} — pricing will be added once glulam quotes are received.
            </p>
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Quantities are calculated from structural load specs. Field verification recommended before ordering.
          Post heights are approximate — verify actual deck height on site.
        </p>
      </div>
    </div>
  );
}
