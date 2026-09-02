/**
 * Cross-Product Comparison
 * Enables side-by-side estimates across Tanzite, Resin Rock, and Duradek/Tiledek
 * for the same project area. Users configure each product independently and see
 * a unified comparison table.
 */

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Award,
  ArrowRight,
} from "lucide-react";
import type { SiteConfig } from "@/hooks/useConfig";
import type { CostBreakdown } from "@/hooks/useCalculator";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface CrossProductComparisonProps {
  config: SiteConfig;
  /** Tanzite breakdown from the main calculator */
  tanziteBreakdown: CostBreakdown;
  tanziteSqft: number;
  tanziteCollectionName: string;
}

interface ProductEstimate {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  sqft: number;
  grandTotal: number;
  pricePerSqft: number;
  details: string;
  enabled: boolean;
}

export function CrossProductComparison({
  config,
  tanziteBreakdown,
  tanziteSqft,
  tanziteCollectionName,
}: CrossProductComparisonProps) {
  const [expanded, setExpanded] = useState(false);
  const [sharedSqft, setSharedSqft] = useState(tanziteSqft);

  // Sync shared sqft when Tanzite sqft changes
  useEffect(() => {
    setSharedSqft(tanziteSqft);
  }, [tanziteSqft]);

  // ─── Resin Rock estimate (using first surface + first color) ──────
  const resinEstimate = useMemo(() => {
    const surface = config.resinSurfaces[0];
    const color = config.resinColors[0];
    const resinSettings = config.productSettings["resin-rock"] || {};
    const laborRate = parseFloat(resinSettings.labor_rate_per_sqft || "8");
    const wasteFactor = 10;
    const effectiveSqft = sharedSqft * (1 + wasteFactor / 100);

    if (!surface || !color) return null;

    const surfacePrepCost = surface.pricePerSqft * effectiveSqft;
    const materialCost = color.pricePerSqft * effectiveSqft;
    const waterproofingCost =
      surface.requiresWaterproofing && config.waterproofingOptions[0]
        ? config.waterproofingOptions[0].pricePerSqft * effectiveSqft
        : 0;
    const laborCost = laborRate * effectiveSqft;
    const subtotal = surfacePrepCost + materialCost + waterproofingCost + laborCost;
    const tax = subtotal * (config.taxRate / 100);
    const grandTotal = subtotal + tax;

    return {
      id: "resin-rock",
      name: "Resin Rock",
      icon: "💎",
      colorHex: "#7C9885",
      sqft: sharedSqft,
      grandTotal,
      pricePerSqft: sharedSqft > 0 ? grandTotal / sharedSqft : 0,
      details: `${surface.name} surface, ${color.name} color${surface.requiresWaterproofing ? ", incl. waterproofing" : ""}`,
      enabled: config.resinSurfaces.length > 0 && config.resinColors.length > 0,
    };
  }, [config, sharedSqft]);

  // ─── Duradek Vinyl estimate (using first color) ───────────────────
  const duradekEstimate = useMemo(() => {
    const color = config.duradekColors[0];
    const duradekSettings = config.productSettings["duradek"] || {};
    const laborRate = parseFloat(duradekSettings.labor_rate_per_sqft || "6");
    const membraneRate = parseFloat(duradekSettings.membrane_price_per_sqft || "4.50");
    const wasteFactor = 10;
    const effectiveSqft = sharedSqft * (1 + wasteFactor / 100);

    const colorPremium = color ? color.pricePerSqft : 0;
    const membraneCost = (membraneRate + colorPremium) * effectiveSqft;
    const laborCost = laborRate * effectiveSqft;
    const subtotal = membraneCost + laborCost;
    const tax = subtotal * (config.taxRate / 100);
    const grandTotal = subtotal + tax;

    return {
      id: "duradek-vinyl",
      name: "Duradek Vinyl",
      icon: "🛡️",
      colorHex: "#8B7D6B",
      sqft: sharedSqft,
      grandTotal,
      pricePerSqft: sharedSqft > 0 ? grandTotal / sharedSqft : 0,
      details: color ? `${color.name} (${color.series} Series)` : "Standard membrane",
      enabled: true,
    };
  }, [config, sharedSqft]);

  // ─── Tiledek estimate (using first tile size) ─────────────────────
  const tiledekEstimate = useMemo(() => {
    const tileSize = config.tileSizes[0];
    const tiledekSettings = config.productSettings["tiledek"] || {};
    const membraneRate = parseFloat(tiledekSettings.tiledek_membrane_per_sqft || "3.75");
    const mortarRate = parseFloat(tiledekSettings.mortar_per_sqft || "2.50");
    const wasteFactor = 10;
    const effectiveSqft = sharedSqft * (1 + wasteFactor / 100);

    if (!tileSize) return null;

    const membraneCost = membraneRate * effectiveSqft;
    const mortarCost = mortarRate * effectiveSqft;
    const tileLaborCost = tileSize.laborPerSqft * effectiveSqft;
    const tileMatCost = tileSize.materialPerSqft * effectiveSqft;
    const subtotal = membraneCost + mortarCost + tileLaborCost + tileMatCost;
    const tax = subtotal * (config.taxRate / 100);
    const grandTotal = subtotal + tax;

    return {
      id: "tiledek",
      name: "Tiledek + Tile",
      icon: "🧱",
      colorHex: "#A0522D",
      sqft: sharedSqft,
      grandTotal,
      pricePerSqft: sharedSqft > 0 ? grandTotal / sharedSqft : 0,
      details: `${tileSize.name} tile, incl. membrane & mortar`,
      enabled: config.tileSizes.length > 0,
    };
  }, [config, sharedSqft]);

  // ─── Tanzite estimate ─────────────────────────────────────────────
  const tanziteEstimate: ProductEstimate = {
    id: "tanzite",
    name: `Tanzite ${tanziteCollectionName}`,
    icon: "🪨",
    colorHex: "#C8956C",
    sqft: tanziteSqft,
    grandTotal: tanziteBreakdown.grandTotal,
    pricePerSqft: tanziteBreakdown.pricePerSqft,
    details: "Your configured Tanzite estimate (above)",
    enabled: true,
  };

  // Collect all enabled estimates
  const allEstimates: ProductEstimate[] = [
    tanziteEstimate,
    ...(resinEstimate?.enabled ? [resinEstimate] : []),
    ...(duradekEstimate?.enabled ? [duradekEstimate] : []),
    ...(tiledekEstimate?.enabled ? [tiledekEstimate] : []),
  ];

  if (allEstimates.length <= 1 || sharedSqft <= 0) return null;

  const maxTotal = Math.max(...allEstimates.map((e) => e.grandTotal));
  const lowestTotal = Math.min(...allEstimates.map((e) => e.grandTotal));

  return (
    <section className="mt-10 mb-8">
      {/* Toggle header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-white rounded-xl shadow-sm border border-border/60 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-canyon/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-canyon" />
              </div>
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl text-charcoal">
                  Cross-Product Comparison
                </h2>
                <p className="text-sm text-muted-foreground font-body mt-0.5">
                  Compare all product estimates side-by-side for {formatNumber(sharedSqft)} sqft
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-canyon font-body font-medium">
                {expanded ? "Collapse" : "Expand"}
              </span>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-canyon" />
              ) : (
                <ChevronDown className="w-5 h-5 text-canyon" />
              )}
            </div>
          </div>
        </button>
      </motion.div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 space-y-6"
        >
          {/* Info banner */}
          <div className="bg-sandstone/30 rounded-lg px-4 py-3 text-sm text-charcoal/70 font-body">
            Estimates for Resin Rock, Duradek, and Tiledek use default selections (first available options) at{" "}
            <strong>{formatNumber(sharedSqft)} sqft</strong> with 10% waste factor. For detailed customization, switch products using the toggle above.
          </div>

          {/* Bar chart comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
              <h3 className="text-lg text-charcoal font-body font-semibold">
                Estimated Total by Product
              </h3>
              <p className="text-sm text-muted-foreground font-body mt-1">
                Based on {formatNumber(sharedSqft)} sqft project area
              </p>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-4">
              {allEstimates.map((est, i) => {
                const barWidth =
                  maxTotal > 0
                    ? Math.max(8, (est.grandTotal / maxTotal) * 100)
                    : 0;
                const isLowest = est.grandTotal === lowestTotal;

                return (
                  <motion.div
                    key={est.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{est.icon}</span>
                        <span
                          className={`font-body text-sm sm:text-base font-semibold ${
                            est.id === "tanzite" ? "text-canyon" : "text-charcoal"
                          }`}
                        >
                          {est.name}
                        </span>
                        {est.id === "tanzite" && (
                          <span className="text-xs bg-canyon/10 text-canyon px-2 py-0.5 rounded-full font-semibold font-body">
                            YOUR CONFIG
                          </span>
                        )}
                        {isLowest && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold font-body">
                            LOWEST
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-body text-sm sm:text-base font-bold ${
                          est.id === "tanzite" ? "text-canyon" : "text-charcoal"
                        }`}
                      >
                        {formatCurrency(est.grandTotal)}
                      </span>
                    </div>
                    <div className="w-full bg-sandstone/50 rounded-full h-7 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{
                          duration: 0.8,
                          delay: 0.2 + i * 0.1,
                          ease: "easeOut",
                        }}
                        className={`h-full rounded-full flex items-center justify-end pr-3 ${
                          est.id === "tanzite"
                            ? "bg-gradient-to-r from-canyon/80 to-canyon"
                            : isLowest
                              ? "bg-gradient-to-r from-green-500/70 to-green-600"
                              : "bg-stone-medium/70"
                        }`}
                      >
                        <span className="text-xs font-body font-semibold text-white drop-shadow-sm">
                          {formatCurrency(est.pricePerSqft)}/sqft
                        </span>
                      </motion.div>
                    </div>
                    <p className="text-xs text-muted-foreground font-body mt-1 ml-8">
                      {est.details}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border/40 bg-sandstone/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Area
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Per Sqft
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Estimate
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      vs. Tanzite
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allEstimates.map((est) => {
                    const diff = est.grandTotal - tanziteEstimate.grandTotal;
                    return (
                      <tr
                        key={est.id}
                        className={`border-b border-border/20 ${
                          est.id === "tanzite"
                            ? "bg-canyon/5 font-semibold"
                            : "hover:bg-sandstone/10"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{est.icon}</span>
                            <span
                              className={
                                est.id === "tanzite"
                                  ? "text-canyon font-semibold"
                                  : "text-charcoal"
                              }
                            >
                              {est.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-charcoal">
                          {formatNumber(est.sqft)} sqft
                        </td>
                        <td className="text-right px-4 py-3 text-charcoal">
                          {formatCurrency(est.pricePerSqft)}
                        </td>
                        <td
                          className={`text-right px-4 py-3 font-semibold ${
                            est.id === "tanzite" ? "text-canyon" : "text-charcoal"
                          }`}
                        >
                          {formatCurrency(est.grandTotal)}
                        </td>
                        <td className="text-right px-4 py-3">
                          {est.id === "tanzite" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : diff > 0 ? (
                            <span className="text-red-500 font-medium">
                              +{formatCurrency(diff)}
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(diff)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Same</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-sandstone/10 border-t border-border/40">
              <p className="text-xs text-muted-foreground font-body">
                * Cross-product estimates use default options for each product type.
                Switch to the specific product tab above for fully customized pricing.
                All estimates include applicable sales tax.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
