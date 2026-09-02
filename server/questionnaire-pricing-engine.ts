/**
 * Questionnaire Pricing Engine
 *
 * Computes a rough project cost estimate from questionnaire answers.
 * The engine runs in these layers:
 *
 *  0. CATALOG RULES (primary) — dp_pricing_rules rows whose conditions match
 *     the submitted answers. Each rule references a dp_catalog_items row.
 *     The engine evaluates the quantity formula (may reference sqft, lf,
 *     rooms, bedrooms, bathrooms, floors) and sums:
 *       catalogItem.estimatedPrice × resolvedQty
 *     Results are grouped by tradeSection for the breakdown.
 *     If ANY catalog rules are configured and active, layers 1–2 are skipped.
 *
 *  1. BASE PRICE FALLBACK — questionnaire_price_rules matched by project type
 *     (only used when no catalog rules are configured/triggered).
 *
 *  2. PRICING TIER MULTIPLIERS — section × tier multipliers applied to base.
 *     (only used in fallback mode)
 *
 *  3. TRADE UPGRADE ADD-ONS — flat dollar amounts from questionnaire_pricing_addons.
 *
 *  4. OPTION PRICE ADJUSTMENTS — per-option flat/percent adjustments.
 *
 *  5. CALCULATION RULES — formula/fixed-cost rules on questions.
 *
 *  6. RANGE — low = midpoint × 0.90, high = midpoint × 1.10, rounded to $100.
 *
 * All inputs are plain data (no DB calls) so the engine is fully testable.
 */

export interface CatalogItemInput {
  id: number;
  name: string;
  tradeSheet: string;
  unit: string;
  estimatedPrice: string | null;
  minimumPrice: string | null;
  defaultQtyFormula: string | null;
}

export interface DpPricingRuleInput {
  id: number;
  name: string;
  catalogItemId: number;
  conditions: Array<{
    questionId: number;
    optionIds: number[];
    operator?: "any" | "all";
  }>;
  quantity: string;
  tradeSection: string;
  sortOrder: number;
  isActive: number;
}

export interface PricingEngineInput {
  /**
   * Knowledge path selected by the customer in Section 0:
   *   "help_me_figure_out" → ±10% range (idea pricing)
   *   "i_know_what_i_want"  → ±7%  range (guided pricing)
   *   "i_have_plans"        → ±5%  range (plan-based pricing)
   * Defaults to "help_me_figure_out" if not provided.
   */
  knowledgePath?: "help_me_figure_out" | "i_know_what_i_want" | "i_have_plans";
  answers: Array<{
    questionId: number;
    selectedOptionIds: number[];
    quantities?: Record<string, number>;
    freeformValue?: string | number | string[];
  }>;
  sqft?: number;
  lf?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  // Catalog-based pricing (Layer 0)
  catalogItems?: CatalogItemInput[];
  dpPricingRules?: DpPricingRuleInput[];
  // Legacy fallback pricing (Layers 1-2)
  priceRules: Array<{
    id: number;
    name: string;
    baseMin: string;
    baseMax: string;
    conditions: Array<{ questionId: number; optionIds: number[] }>;
    isActive: number;
    sortOrder: number;
  }>;
  options: Array<{
    id: number;
    questionId: number;
    text: string;
    priceAdjustment: string;
    priceAdjustmentType: string;
    pricingTier: number | null;
  }>;
  questions: Array<{
    id: number;
    text: string;
    section: string | null;
    calculationRules: unknown;
  }>;
  tierMultipliers: Array<{
    sectionKey: string;
    tier: number;
    multiplier: string;
    weight: string;
    tierLabel: string;
  }>;
  pricingAddons: Array<{
    questionId: number;
    optionId: number | null;
    label: string;
    amount: string;
    isActive: number;
  }>;
}

export interface PricingEngineResult {
  /** The computed midpoint before range spread */
  midpoint: number;
  /** Low end = midpoint × (1 - rangeFactor) */
  low: number;
  /** High end = midpoint × (1 + rangeFactor) */
  high: number;
  /** The range factor used (0.10, 0.07, or 0.05) */
  rangeFactor: number;
  /** Human-readable range label e.g. "±10%" */
  rangeLabel: string;
  /** Human-readable breakdown of how the estimate was built */
  breakdown: PricingBreakdownItem[];
  /** Whether a base price rule was matched */
  hasBaseRule: boolean;
  /** Name of the matched base rule */
  baseRuleName: string | null;
  /** Whether catalog-based pricing was used */
  usedCatalogPricing: boolean;
  /** Breakdown grouped by trade section (catalog mode only) */
  tradeSectionBreakdown?: Record<string, { items: PricingBreakdownItem[]; subtotal: number }>;
}

export interface PricingBreakdownItem {
  label: string;
  amount: number;
  type: "catalog_item" | "base" | "tier_multiplier" | "addon" | "option_flat" | "option_percent" | "calc_fixed" | "calc_formula" | "range";
  description?: string;
  tradeSection?: string;
  qty?: number;
  unitPrice?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function evaluateCondition(
  conditionType: string,
  conditionValue: string | number | [number, number] | undefined,
  answerValue: string | number | string[]
): boolean {
  if (conditionType === "always_apply") return true;
  const strAnswer = Array.isArray(answerValue) ? answerValue.join(", ") : String(answerValue);
  const numAnswer = typeof answerValue === "number" ? answerValue : parseFloat(String(answerValue));

  switch (conditionType) {
    case "equals":
      if (conditionValue === undefined) return false;
      if (typeof conditionValue === "string") return strAnswer.toLowerCase() === conditionValue.toLowerCase();
      if (typeof conditionValue === "number") return numAnswer === conditionValue;
      return false;
    case "greater_than":
      if (typeof conditionValue !== "number" || isNaN(numAnswer)) return false;
      return numAnswer > conditionValue;
    case "less_than":
      if (typeof conditionValue !== "number" || isNaN(numAnswer)) return false;
      return numAnswer < conditionValue;
    case "between": {
      if (!Array.isArray(conditionValue) || conditionValue.length !== 2 || isNaN(numAnswer)) return false;
      const [min, max] = conditionValue;
      return numAnswer >= min && numAnswer <= max;
    }
    case "contains":
      if (typeof conditionValue !== "string") return false;
      if (Array.isArray(answerValue)) return answerValue.some(v => v.toLowerCase().includes((conditionValue as string).toLowerCase()));
      return strAnswer.toLowerCase().includes((conditionValue as string).toLowerCase());
    default:
      return false;
  }
}

function evaluateFormula(formula: string, answer: number, sqft: number, room_sqft: number): number {
  let expr = formula
    .replace(/\banswer\b/g, String(answer))
    .replace(/\broom_sqft\b/g, String(room_sqft))
    .replace(/\bsqft\b/g, String(sqft));
  if (!/^[\d.+\-*/() ]+$/.test(expr)) throw new Error(`Invalid formula: ${expr}`);
  const result = new Function(`"use strict"; return (${expr});`)();
  return typeof result === "number" && isFinite(result) ? result : 0;
}

/**
 * Evaluate a quantity formula for a catalog pricing rule.
 * Supports: sqft, lf, rooms, bedrooms, bathrooms, floors, and arithmetic.
 */
function resolveQuantity(
  formula: string,
  vars: { sqft: number; lf: number; rooms: number; bedrooms: number; bathrooms: number; floors: number }
): number {
  if (!formula || formula.trim() === "") return 1;
  let expr = formula
    .replace(/\bsqft\b/g, String(vars.sqft))
    .replace(/\blf\b/g, String(vars.lf))
    .replace(/\brooms\b/g, String(vars.rooms))
    .replace(/\bbedrooms\b/g, String(vars.bedrooms))
    .replace(/\bbathrooms\b/g, String(vars.bathrooms))
    .replace(/\bfloors\b/g, String(vars.floors));
  // Allow only safe arithmetic
  if (!/^[\d.+\-*/() ]+$/.test(expr)) return 1;
  try {
    const result = new Function(`"use strict"; return (${expr});`)();
    return typeof result === "number" && isFinite(result) && result > 0 ? result : 1;
  } catch {
    return 1;
  }
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// ─── main engine ──────────────────────────────────────────────────────────────

export function computeRoughPricing(input: PricingEngineInput): PricingEngineResult {
  const {
    answers, sqft = 0, lf = 0, rooms = 0, bedrooms = 0, bathrooms = 0, floors = 1,
    priceRules, options, questions, tierMultipliers, pricingAddons,
    catalogItems = [], dpPricingRules = [],
    knowledgePath = "help_me_figure_out",
  } = input;

  // Determine range factor from knowledge path
  const rangeFactor =
    knowledgePath === "i_have_plans" ? 0.05 :
    knowledgePath === "i_know_what_i_want" ? 0.07 :
    0.10;
  const rangeLabel = `±${Math.round(rangeFactor * 100)}%`;

  const breakdown: PricingBreakdownItem[] = [];

  // Build lookup maps
  const answerMap = new Map<number, number[]>();
  const quantityMap = new Map<number, Record<string, number>>();
  const freeformMap = new Map<number, string | number | string[]>();
  for (const a of answers) {
    answerMap.set(a.questionId, a.selectedOptionIds);
    if (a.quantities) quantityMap.set(a.questionId, a.quantities);
    if (a.freeformValue !== undefined) freeformMap.set(a.questionId, a.freeformValue);
  }

  const qtyVars = { sqft, lf, rooms, bedrooms, bathrooms, floors };

  // ── Layer 0: Catalog-based pricing ────────────────────────────────────────
  const activeDpRules = dpPricingRules
    .filter(r => r.isActive === 1)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let usedCatalogPricing = false;
  let catalogTotal = 0;
  const tradeSectionTotals = new Map<string, number>();
  const tradeSectionItems = new Map<string, PricingBreakdownItem[]>();

  if (activeDpRules.length > 0 && catalogItems.length > 0) {
    const catalogMap = new Map<number, CatalogItemInput>();
    for (const item of catalogItems) catalogMap.set(item.id, item);

    for (const rule of activeDpRules) {
      // Evaluate conditions
      const conditions = rule.conditions ?? [];
      let conditionsMet = true;

      if (conditions.length > 0) {
        conditionsMet = conditions.every(cond => {
          const selected = answerMap.get(cond.questionId) ?? [];
          const operator = cond.operator ?? "any";
          if (operator === "all") {
            return cond.optionIds.every(oid => selected.includes(oid));
          } else {
            // "any" — at least one of the required option IDs must be selected
            return cond.optionIds.length === 0 || cond.optionIds.some(oid => selected.includes(oid));
          }
        });
      }

      if (!conditionsMet) continue;

      const catalogItem = catalogMap.get(rule.catalogItemId);
      if (!catalogItem) continue;

      const unitPrice = parseFloat(String(catalogItem.estimatedPrice ?? "0")) || 0;
      if (unitPrice <= 0) continue;

      const qty = resolveQuantity(rule.quantity, qtyVars);
      const lineTotal = unitPrice * qty;

      const section = rule.tradeSection || "General";
      tradeSectionTotals.set(section, (tradeSectionTotals.get(section) ?? 0) + lineTotal);

      const item: PricingBreakdownItem = {
        label: `${rule.name}`,
        amount: lineTotal,
        type: "catalog_item",
        description: `${catalogItem.name} — ${fmt(unitPrice)}/${catalogItem.unit} × ${qty.toFixed(qty % 1 === 0 ? 0 : 2)}`,
        tradeSection: section,
        qty,
        unitPrice,
      };
      breakdown.push(item);

      if (!tradeSectionItems.has(section)) tradeSectionItems.set(section, []);
      tradeSectionItems.get(section)!.push(item);

      catalogTotal += lineTotal;
    }

    if (catalogTotal > 0) {
      usedCatalogPricing = true;
    }
  }

  let running = catalogTotal;

  // ── Layer 1 & 2: Base price fallback (only when no catalog pricing) ────────
  let matchedRule: typeof priceRules[0] | null = null;

  if (!usedCatalogPricing) {
    const activeRules = priceRules
      .filter(r => r.isActive === 1)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let defaultRule: typeof activeRules[0] | null = null;

    for (const rule of activeRules) {
      const conditions = rule.conditions ?? [];
      if (conditions.length === 0) {
        if (!defaultRule) defaultRule = rule;
        continue;
      }
      const allMatch = conditions.every(cond => {
        const selected = answerMap.get(cond.questionId) ?? [];
        return cond.optionIds.some(oid => selected.includes(oid));
      });
      if (allMatch) { matchedRule = rule; break; }
    }

    if (!matchedRule) matchedRule = defaultRule;

    if (!matchedRule) {
      return {
        midpoint: 0, low: 0, high: 0,
        rangeFactor,
        rangeLabel,
        breakdown: [],
        hasBaseRule: false, baseRuleName: null,
        usedCatalogPricing: false,
      };
    }

    const baseMin = parseFloat(String(matchedRule.baseMin));
    const baseMax = parseFloat(String(matchedRule.baseMax));
    running = (baseMin + baseMax) / 2;

    breakdown.push({
      label: `Base Price (${matchedRule.name})`,
      amount: running,
      type: "base",
      description: `${fmt(baseMin)} – ${fmt(baseMax)}`,
    });

    // ── Layer 2: pricingTier multipliers (fallback mode only) ────────────────
    const tierMultipliersBySection = new Map<string, Map<number, { multiplier: number; weight: number; tierLabel: string }>>();
    for (const tm of tierMultipliers) {
      if (!tierMultipliersBySection.has(tm.sectionKey)) {
        tierMultipliersBySection.set(tm.sectionKey, new Map());
      }
      tierMultipliersBySection.get(tm.sectionKey)!.set(tm.tier, {
        multiplier: parseFloat(String(tm.multiplier)),
        weight: parseFloat(String(tm.weight)),
        tierLabel: tm.tierLabel,
      });
    }

    const appliedSections = new Set<string>();
    let totalWeightedMultiplier = 0;
    let totalWeight = 0;

    for (const a of answers) {
      const question = questions.find(q => q.id === a.questionId);
      if (!question?.section) continue;
      const sectionKey = question.section;
      const sectionTiers = tierMultipliersBySection.get(sectionKey);
      if (!sectionTiers) continue;
      if (appliedSections.has(sectionKey)) continue;

      let chosenTier: number | null = null;
      for (const optId of a.selectedOptionIds) {
        const opt = options.find(o => o.id === optId);
        if (opt?.pricingTier != null) {
          if (chosenTier === null || opt.pricingTier > chosenTier) {
            chosenTier = opt.pricingTier;
          }
        }
      }
      if (chosenTier === null) continue;

      const tierConfig = sectionTiers.get(chosenTier);
      if (!tierConfig) continue;

      appliedSections.add(sectionKey);
      totalWeightedMultiplier += tierConfig.multiplier * tierConfig.weight;
      totalWeight += tierConfig.weight;

      const adjustmentAmount = running * (tierConfig.multiplier - 1);
      breakdown.push({
        label: `Finish Level — ${sectionKey.replace(/_/g, " ")} (${tierConfig.tierLabel || `Level ${chosenTier}`})`,
        amount: adjustmentAmount,
        type: "tier_multiplier",
        description: `×${tierConfig.multiplier.toFixed(4)} (${tierConfig.multiplier >= 1 ? "+" : ""}${((tierConfig.multiplier - 1) * 100).toFixed(1)}%)`,
      });
    }

    if (totalWeight > 0) {
      const combinedMultiplier = totalWeightedMultiplier / totalWeight;
      const beforeTier = running;
      running = running * combinedMultiplier;
      const totalTierDelta = running - beforeTier;
      const tierItems = breakdown.filter(b => b.type === "tier_multiplier");
      if (tierItems.length > 0) {
        const sumAmounts = tierItems.reduce((s, b) => s + b.amount, 0);
        if (sumAmounts !== 0) {
          for (const item of tierItems) {
            item.amount = (item.amount / sumAmounts) * totalTierDelta;
          }
        } else {
          for (const item of tierItems) {
            item.amount = totalTierDelta / tierItems.length;
          }
        }
      }
    }
  }

  // ── Layer 3: Trade upgrade add-ons ────────────────────────────────────────
  const activeAddons = pricingAddons.filter(a => a.isActive === 1);
  for (const addon of activeAddons) {
    const selectedIds = answerMap.get(addon.questionId) ?? [];
    if (selectedIds.length === 0) continue;
    const triggered = addon.optionId === null
      ? true
      : selectedIds.includes(addon.optionId);
    if (!triggered) continue;
    const amount = parseFloat(String(addon.amount));
    running += amount;
    breakdown.push({
      label: addon.label,
      amount,
      type: "addon",
    });
  }

  // ── Layer 4: Option price adjustments ─────────────────────────────────────
  for (const a of answers) {
    const qtys = quantityMap.get(a.questionId) ?? {};
    for (const optionId of a.selectedOptionIds) {
      const opt = options.find(o => o.id === optionId);
      if (!opt || opt.priceAdjustmentType === "none") continue;
      const adj = parseFloat(String(opt.priceAdjustment ?? "0"));
      if (adj === 0) continue;
      const qty = qtys[String(optionId)] ?? 1;
      const question = questions.find(q => q.id === a.questionId);

      if (opt.priceAdjustmentType === "flat") {
        const amount = adj * qty;
        running += amount;
        breakdown.push({
          label: `${question?.text ?? "Option"}: ${opt.text}${qty > 1 ? ` ×${qty}` : ""}`,
          amount,
          type: "option_flat",
        });
      } else if (opt.priceAdjustmentType === "percent") {
        const factor = Math.pow(1 + adj / 100, qty);
        const before = running;
        running *= factor;
        breakdown.push({
          label: `${question?.text ?? "Option"}: ${opt.text} (${adj > 0 ? "+" : ""}${adj}%${qty > 1 ? ` ×${qty}` : ""})`,
          amount: running - before,
          type: "option_percent",
        });
      }
    }
  }

  // ── Layer 5: Calculation rules (formula-based) ────────────────────────────
  for (const a of answers) {
    const question = questions.find(q => q.id === a.questionId);
    if (!question) continue;
    const rules = (question.calculationRules as Array<{
      name: string;
      conditionType: string;
      conditionValue?: string | number | [number, number];
      fixedCost?: number;
      formula?: string;
      description?: string;
    }>) ?? [];
    if (!rules.length) continue;

    const freeform = freeformMap.get(a.questionId);
    let answerValue: number | string | string[] = "";
    if (freeform !== undefined) {
      answerValue = freeform;
    } else if (a.selectedOptionIds.length > 0) {
      const selectedOpts = options.filter(o => a.selectedOptionIds.includes(o.id));
      answerValue = selectedOpts.length === 1 ? selectedOpts[0].text : selectedOpts.map(o => o.text);
    }

    for (const rule of rules) {
      if (!evaluateCondition(rule.conditionType, rule.conditionValue, answerValue)) continue;
      if (rule.fixedCost) {
        running += rule.fixedCost;
        breakdown.push({
          label: rule.name || "Fixed Cost",
          amount: rule.fixedCost,
          type: "calc_fixed",
          description: rule.description,
        });
      }
      if (rule.formula) {
        try {
          const numAnswer = typeof answerValue === "number" ? answerValue : parseFloat(String(answerValue)) || 0;
          const result = evaluateFormula(rule.formula, numAnswer, sqft, sqft);
          running += result;
          breakdown.push({
            label: rule.name || "Formula",
            amount: result,
            type: "calc_formula",
            description: rule.description || `Formula: ${rule.formula}`,
          });
        } catch {
          // skip broken formulas silently
        }
      }
    }
  }

  // ── Layer 6: path-specific range ─────────────────────────────────────────
  const midpoint = Math.round(running / 100) * 100;
  const low = Math.round((midpoint * (1 - rangeFactor)) / 100) * 100;
  const high = Math.round((midpoint * (1 + rangeFactor)) / 100) * 100;

  // Add a range breakdown item so the UI can display the range factor
  breakdown.push({
    label: `${rangeLabel} estimate range applied`,
    amount: 0,
    type: "range",
    description: `Low: $${low.toLocaleString()} — High: $${high.toLocaleString()}`,
  });

  // Build trade section breakdown for catalog mode
  const tradeSectionBreakdown: Record<string, { items: PricingBreakdownItem[]; subtotal: number }> = {};
  if (usedCatalogPricing) {
    Array.from(tradeSectionItems.entries()).forEach(([section, items]) => {
      tradeSectionBreakdown[section] = {
        items,
        subtotal: tradeSectionTotals.get(section) ?? 0,
      };
    });
  }

  return {
    midpoint,
    low,
    high,
    rangeFactor,
    rangeLabel,
    breakdown,
    hasBaseRule: usedCatalogPricing || matchedRule !== null,
    baseRuleName: usedCatalogPricing ? "Catalog Pricing" : (matchedRule?.name ?? null),
    usedCatalogPricing,
    tradeSectionBreakdown: usedCatalogPricing ? tradeSectionBreakdown : undefined,
  };
}
