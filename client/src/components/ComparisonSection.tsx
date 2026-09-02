/**
 * Material Comparison Section
 * Shows side-by-side cost comparison of the user's Tanzite estimate
 * vs. composite, wood, and resin stone for the same project dimensions.
 * Includes toggles to control which materials appear in the chart.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import type { ComparisonMaterial, RainEscapeOption } from "@/hooks/useConfig";
import type { CostBreakdown } from "@/hooks/useCalculator";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Wrench,
  DollarSign,
  TrendingDown,
  Award,
  Check,
  X,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";

interface ComparisonSectionProps {
  breakdown: CostBreakdown;
  comparisonMaterials: ComparisonMaterial[];
  sqft: number;
  collectionName: string;
  /** The selected collection slug — used to add RainEscape cost to wood/composite when 'rainier' */
  collectionSlug?: string;
  /** Rain escape options from config — used to get system + labor cost per sqft */
  rainEscapeOptions?: RainEscapeOption[];
  /** Live Resin Rock grand total for the same sqft (replaces static Resin Stone row) */
  resinRockTotal?: number;
  /** Live Duradek Vinyl grand total for the same sqft */
  duradekTotal?: number;
  /** Whether the admin has enabled the Duradek/Tiledek tab — hides the Duradek toggle when false */
  showDuradek?: boolean;
}

interface MaterialEstimate {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  installCost: number;
  costPerSqft: number;
  annualMaintenance: number;
  tenYearCost: number;
  lifespanYears: number;
  warrantyYears: number;
  pros: string[];
  cons: string[];
  isTanzite: boolean;
}

export function ComparisonSection({
  breakdown,
  comparisonMaterials,
  sqft,
  collectionName,
  collectionSlug,
  rainEscapeOptions,
  resinRockTotal,
  duradekTotal,
  showDuradek = false,
}: ComparisonSectionProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  // Initialize visibility from each material's showByDefault flag (admin-controlled).
  // All materials default to OFF (false) unless the admin has explicitly set showByDefault = true.
  const [visibleMaterials, setVisibleMaterials] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    // Set all comparison materials to their admin-configured default (false = off)
    for (const mat of comparisonMaterials) {
      initial[mat.id] = mat.showByDefault === true;
    }
    // Duradek is always off by default (controlled by showDuradek prop)
    initial["duradek-vinyl"] = false;
    initial["duradek"] = false;
    return initial;
  });
  const [showToggles, setShowToggles] = useState(false);

  // When Rainier is selected, compute the RainEscape add-on cost per sqft
  // (system + labor) that must be added to wood/composite to make them waterproof.
  const rainEscapeCostPerSqft = useMemo(() => {
    if (collectionSlug !== "rainier" || !rainEscapeOptions?.length) return 0;
    const opt = rainEscapeOptions[0];
    return (opt.systemPricePerSqft ?? 0) + (opt.laborPricePerSqft ?? 0);
  }, [collectionSlug, rainEscapeOptions]);

  const allEstimates = useMemo((): MaterialEstimate[] => {
    if (sqft <= 0) return [];

    const tanziteInstall = breakdown.grandTotal;
    const tanziteCostPerSqft = breakdown.pricePerSqft;
    const tanziteAnnualMaint = sqft * 0.25;
    const tanziteTenYear = tanziteInstall + tanziteAnnualMaint * 10;

    const tanzite: MaterialEstimate = {
      id: "tanzite",
      name: `Tanzite ${collectionName}`,
      description:
        "Premium stone decking — coolest surface, best wet grip, virtually zero maintenance, and the longest lifespan of any decking material.",
      colorHex: "#C8956C",
      installCost: tanziteInstall,
      costPerSqft: tanziteCostPerSqft,
      annualMaintenance: tanziteAnnualMaint,
      tenYearCost: tanziteTenYear,
      lifespanYears: 40,
      warrantyYears: 30,
      pros: [
        "Coolest surface in direct sun",
        "Excellent wet grip texture",
        "Scratch and stain resistant",
        "Virtually zero maintenance",
        "30+ year lifespan",
      ],
      cons: [
        "Higher upfront cost",
        "Heavier material to handle",
        "Requires diamond blade for cuts",
      ],
      isTanzite: true,
    };

    // Determine which material IDs are "wood" or "composite" — these need RainEscape
    // added when the Rainier collection is selected.
    const needsRainEscape = (id: string) =>
      rainEscapeCostPerSqft > 0 &&
      (id.includes("wood") || id.includes("composite") || id.includes("cedar") || id.includes("redwood"));

    // Map comparison materials — if a material slug is "resin-stone" or "resin-rock",
    // replace its install cost with the live Resin Rock calculator total.
    // If Rainier is selected and the material is wood/composite, add RainEscape cost.
    const others: MaterialEstimate[] = comparisonMaterials.map((mat) => {
      const isResinRow = mat.id === "resin-stone" || mat.id === "resin-rock";
      const baseInstall = (isResinRow && resinRockTotal != null && resinRockTotal > 0)
        ? resinRockTotal
        : sqft * (mat.materialCostPerSqft + mat.laborCostPerSqft);

      // Add RainEscape system cost to wood/composite when Rainier is selected
      const rainEscapeAddon = needsRainEscape(mat.id) ? sqft * rainEscapeCostPerSqft : 0;
      const installCost = baseInstall + rainEscapeAddon;

      const annualMaint = sqft * mat.annualMaintenanceCostPerSqft;
      const tenYearCost = installCost + annualMaint * 10;

      // Append a note to the name when RainEscape is added
      let displayName = isResinRow && resinRockTotal != null ? "Resin Rock (live estimate)" : mat.name;
      if (rainEscapeAddon > 0) {
        displayName += " + RainEscape System";
      }

      return {
        id: mat.id,
        name: displayName,
        description: rainEscapeAddon > 0
          ? mat.description + " Includes Trex RainEscape waterproofing system required to match Rainier's under-deck waterproof capability."
          : mat.description,
        colorHex: mat.colorHex,
        installCost,
        costPerSqft: sqft > 0 ? installCost / sqft : 0,
        annualMaintenance: annualMaint,
        tenYearCost,
        lifespanYears: mat.lifespanYears,
        warrantyYears: mat.warrantyYears,
        pros: mat.pros,
        cons: mat.cons,
        isTanzite: false,
      };
    });

    // Add Duradek as a live comparison row if total is provided and not already in comparisonMaterials
    const hasDuradekRow = comparisonMaterials.some(m => m.id === "duradek" || m.id === "duradek-vinyl");
    if (duradekTotal != null && duradekTotal > 0 && !hasDuradekRow) {
      const annualMaint = sqft * 0.30; // ~$0.30/sqft/yr for vinyl
      others.push({
        id: "duradek-vinyl",
        name: "Duradek Vinyl (live estimate)",
        description: "Waterproof vinyl membrane decking — excellent moisture protection, flexible design options.",
        colorHex: "#8B7D6B",
        installCost: duradekTotal,
        costPerSqft: sqft > 0 ? duradekTotal / sqft : 0,
        annualMaintenance: annualMaint,
        tenYearCost: duradekTotal + annualMaint * 10,
        lifespanYears: 15,
        warrantyYears: 10,
        pros: ["Waterproof membrane", "Wide color selection", "Lower upfront cost", "Easy to clean"],
        cons: ["Shorter lifespan than stone", "Can fade in UV", "Requires re-coating over time"],
        isTanzite: false,
      });
    }

    return [tanzite, ...others];
  }, [breakdown, comparisonMaterials, sqft, collectionName, resinRockTotal, duradekTotal, rainEscapeCostPerSqft]);

  // A material is visible only if it has been explicitly set to true in state.
  // Default is OFF for all materials (undefined in state = false).
  const isVisible = (id: string) => visibleMaterials[id] === true;

  const toggleMaterialVisibility = (id: string) => {
    setVisibleMaterials((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const estimates = allEstimates.filter((est) => isVisible(est.id));

  if (allEstimates.length <= 1 || sqft <= 0) return null;

  const maxTenYear = estimates.length > 0 ? Math.max(...estimates.map((e) => e.tenYearCost)) : 0;
  const tanziteEstimate = estimates.find((e) => e.isTanzite) || allEstimates[0];

  return (
    <section className="mt-12 mb-8">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl sm:text-4xl text-charcoal mb-3">
          How Does Tanzite Compare?
        </h2>
        <p className="text-muted-foreground font-body max-w-2xl mx-auto text-base sm:text-lg">
          See how your {formatCurrency(breakdown.grandTotal)} Tanzite estimate
          stacks up against other decking materials for a{" "}
          <strong>{sqft} sq ft</strong> project.
        </p>
      </motion.div>

      {/* Material Visibility Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mb-4"
      >
        <button
          onClick={() => setShowToggles(!showToggles)}
          className="flex items-center gap-2 text-sm font-body font-medium text-charcoal hover:text-canyon transition-colors mx-auto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Customize Comparison</span>
          {showToggles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showToggles && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 bg-white rounded-lg shadow-sm border border-border/60 p-4"
          >
            <p className="text-xs text-muted-foreground font-body mb-3">
              Toggle which materials appear in the comparison chart:
            </p>
            <div className="flex flex-wrap gap-2">
              {allEstimates.filter((est) => {
                // Hide the Duradek toggle entirely when admin has disabled the Duradek tab
                if ((est.id === "duradek-vinyl" || est.id === "duradek") && !showDuradek) return false;
                return true;
              }).map((est) => {
                const visible = isVisible(est.id);
                return (
                  <button
                    key={est.id}
                    onClick={() => toggleMaterialVisibility(est.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-body transition-all ${
                      visible
                        ? "border-canyon/40 bg-canyon/5 text-charcoal shadow-sm"
                        : "border-border/40 bg-sandstone/20 text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: est.colorHex, opacity: visible ? 1 : 0.3 }}
                    />
                    {visible ? (
                      <Eye className="w-3.5 h-3.5 text-canyon" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span className={visible ? "font-medium" : "line-through opacity-60"}>
                      {est.name}
                    </span>
                    {est.isTanzite && (
                      <span className="text-[10px] bg-canyon/10 text-canyon px-1.5 py-0.5 rounded-full font-semibold">
                        YOUR ESTIMATE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {estimates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-border/60 p-8 text-center">
          <EyeOff className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-body">
            All materials are hidden. Use the toggles above to show materials in the comparison.
          </p>
        </div>
      ) : (
        <>
          {/* Visual Bar Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden mb-6"
          >
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-canyon" />
                <h3 className="text-lg sm:text-xl text-charcoal font-body font-semibold">
                  10-Year Total Cost of Ownership
                </h3>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Installation cost + 10 years of maintenance for {sqft} sq ft
              </p>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-4">
              {estimates.map((est, i) => {
                const barWidth =
                  maxTenYear > 0
                    ? Math.max(8, (est.tenYearCost / maxTenYear) * 100)
                    : 0;
                const savings = est.isTanzite
                  ? 0
                  : est.tenYearCost - tanziteEstimate.tenYearCost;

                return (
                  <motion.div
                    key={est.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: est.colorHex }}
                        />
                        <span
                          className={`font-body text-sm sm:text-base ${est.isTanzite ? "font-bold text-charcoal" : "text-stone-dark"}`}
                        >
                          {est.name}
                          {est.isTanzite && (
                            <span className="ml-2 text-xs bg-canyon/10 text-canyon px-2 py-0.5 rounded-full font-semibold">
                              YOUR ESTIMATE
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-body text-sm sm:text-base font-semibold ${est.isTanzite ? "text-canyon" : "text-charcoal"}`}
                        >
                          {formatCurrency(est.tenYearCost)}
                        </span>
                        {!est.isTanzite && savings !== 0 && (
                          <span
                            className={`ml-2 text-xs font-body ${savings > 0 ? "text-red-500" : "text-green-600"}`}
                          >
                            {savings > 0
                              ? `+${formatCurrency(savings)}`
                              : formatCurrency(savings)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-sandstone/50 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${barWidth}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.8,
                          delay: 0.2 + i * 0.1,
                          ease: "easeOut",
                        }}
                        className={`h-full rounded-full flex items-center justify-end pr-2 ${est.isTanzite ? "bg-gradient-to-r from-canyon/80 to-canyon" : "bg-stone-medium/70"}`}
                      >
                        <span className="text-xs font-body font-semibold text-white drop-shadow-sm">
                          {formatCurrency(est.costPerSqft)}/sqft
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Detailed Comparison Cards */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 ${
              estimates.length >= 4
                ? "xl:grid-cols-4"
                : estimates.length === 3
                  ? "xl:grid-cols-3"
                  : "xl:grid-cols-2"
            } gap-4`}
          >
            {estimates.map((est, i) => (
              <motion.div
                key={est.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-shadow hover:shadow-md ${est.isTanzite ? "border-canyon/40 ring-1 ring-canyon/20" : "border-border/60"}`}
              >
                {/* Card Header */}
                <div
                  className="px-4 py-3 border-b"
                  style={{
                    borderColor: est.isTanzite ? "rgba(180, 100, 50, 0.2)" : undefined,
                    background: est.isTanzite
                      ? "linear-gradient(135deg, rgba(180, 100, 50, 0.08), rgba(180, 100, 50, 0.03))"
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: est.colorHex }}
                    />
                    <h4
                      className={`font-body font-bold text-base ${est.isTanzite ? "text-canyon" : "text-charcoal"}`}
                    >
                      {est.name}
                    </h4>
                  </div>
                  {est.isTanzite && (
                    <span className="inline-flex items-center gap-1 text-xs bg-canyon text-white px-2 py-0.5 rounded-full font-body font-semibold">
                      <Award className="w-3 h-3" /> Recommended
                    </span>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Install Cost
                    </span>
                    <span className="font-body font-semibold text-sm text-charcoal">
                      {formatCurrency(est.installCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Annual Maint.
                    </span>
                    <span className="font-body font-semibold text-sm text-charcoal">
                      {formatCurrency(est.annualMaintenance)}/yr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" /> 10-Year Total
                    </span>
                    <span
                      className={`font-body font-bold text-sm ${est.isTanzite ? "text-canyon" : "text-charcoal"}`}
                    >
                      {formatCurrency(est.tenYearCost)}
                    </span>
                  </div>

                  <div className="border-t border-border/40 pt-2.5 mt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Lifespan
                      </span>
                      <span className="font-body font-semibold text-sm text-charcoal">
                        {est.lifespanYears}+ years
                      </span>
                    </div>
                    {est.warrantyYears > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Warranty
                        </span>
                        <span className="font-body font-semibold text-sm text-charcoal">
                          {est.warrantyYears} years
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cost per sqft per year of lifespan */}
                  <div className="bg-sandstone/40 rounded-md px-3 py-2 mt-2">
                    <div className="text-xs text-muted-foreground font-body mb-0.5">
                      Cost per sqft per year of life
                    </div>
                    <div
                      className={`font-body font-bold text-lg ${est.isTanzite ? "text-canyon" : "text-charcoal"}`}
                    >
                      {formatCurrency(est.tenYearCost / sqft / est.lifespanYears)}
                    </div>
                  </div>
                </div>

                {/* Expandable Pros/Cons */}
                <div className="border-t border-border/40">
                  <button
                    onClick={() =>
                      setExpandedCard(expandedCard === est.id ? null : est.id)
                    }
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground font-body hover:bg-sandstone/20 transition-colors"
                  >
                    <span>Pros & Cons</span>
                    {expandedCard === est.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {expandedCard === est.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-3"
                    >
                      {est.pros.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-body font-semibold text-green-700 mb-1">
                            Advantages
                          </div>
                          <ul className="space-y-0.5">
                            {est.pros.map((pro, j) => (
                              <li
                                key={j}
                                className="text-xs font-body text-stone-dark flex items-start gap-1.5"
                              >
                                <Check className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {est.cons.length > 0 && (
                        <div>
                          <div className="text-xs font-body font-semibold text-red-700 mb-1">
                            Considerations
                          </div>
                          <ul className="space-y-0.5">
                            {est.cons.map((con, j) => (
                              <li
                                key={j}
                                className="text-xs font-body text-stone-dark flex items-start gap-1.5"
                              >
                                <X className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden"
          >
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
              <h3 className="text-lg sm:text-xl text-charcoal font-body font-semibold">
                Quick Comparison Summary
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border/40 bg-sandstone/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Material
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Install Cost
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Per Sqft
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Annual Maint.
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      10-Year Total
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Lifespan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est) => (
                    <tr
                      key={est.id}
                      className={`border-b border-border/20 ${est.isTanzite ? "bg-canyon/5 font-semibold" : "hover:bg-sandstone/10"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: est.colorHex }}
                          />
                          <span className={est.isTanzite ? "text-canyon" : "text-charcoal"}>
                            {est.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">
                        {formatCurrency(est.installCost)}
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">
                        {formatCurrency(est.costPerSqft)}
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">
                        {formatCurrency(est.annualMaintenance)}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-semibold ${est.isTanzite ? "text-canyon" : "text-charcoal"}`}
                      >
                        {formatCurrency(est.tenYearCost)}
                      </td>
                      <td className="text-right px-4 py-3 text-charcoal">
                        {est.lifespanYears}+ yrs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-sandstone/10 border-t border-border/40">
              <p className="text-xs text-muted-foreground font-body">
                * Comparison estimates are based on average Utah market rates for a{" "}
                {sqft} sq ft project. Actual costs may vary based on site conditions,
                contractor, and material selections. Tanzite estimate reflects your
                specific configuration above. All comparison materials include typical
                material and labor costs.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </section>
  );
}
