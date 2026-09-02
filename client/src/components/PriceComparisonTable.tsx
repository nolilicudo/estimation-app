/**
 * PriceComparisonTable
 * Shown at the bottom of the estimate form.
 * Compares the Tanzite Stone deck install cost against competing materials
 * for the same square footage, with railing and stairs added as shared
 * line items on every column so the customer sees a true apples-to-apples total.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Star } from "lucide-react";
import type { ComparisonMaterial } from "@/hooks/useConfig";
import type { CostBreakdown } from "@/hooks/useCalculator";

interface PriceComparisonTableProps {
  breakdown: CostBreakdown;
  comparisonMaterials: ComparisonMaterial[];
  sqft: number;
  collectionName: string;
  /** Railing subtotal from the live calculator (shared across all columns) */
  railingSubtotal: number;
  /** Stairs subtotal from the live calculator (shared across all columns) */
  stairsSubtotal: number;
}

interface Column {
  id: string;
  name: string;
  colorHex: string;
  deckOnly: number;     // material + labor for the deck surface only
  railing: number;      // same for all columns
  stairs: number;       // same for all columns
  total: number;        // deckOnly + railing + stairs
  isTanzite: boolean;
  lifespanYears: number;
  warrantyYears: number;
}

export function PriceComparisonTable({
  breakdown,
  comparisonMaterials,
  sqft,
  collectionName,
  railingSubtotal,
  stairsSubtotal,
}: PriceComparisonTableProps) {
  const columns = useMemo((): Column[] => {
    if (sqft <= 0) return [];

    // Tanzite: deck-only cost = grandTotal minus railing and stairs
    // (grandTotal already includes railing and stairs, so we back them out)
    const tanziteDeckOnly = breakdown.grandTotal - breakdown.railing.subtotal - breakdown.stairMaterial;
    const tanziteTotal = tanziteDeckOnly + railingSubtotal + stairsSubtotal;

    const tanzite: Column = {
      id: "tanzite",
      name: `Tanzite ${collectionName}`,
      colorHex: "#C8956C",
      deckOnly: tanziteDeckOnly,
      railing: railingSubtotal,
      stairs: stairsSubtotal,
      total: tanziteTotal,
      isTanzite: true,
      lifespanYears: 40,
      warrantyYears: 30,
    };

    const others: Column[] = comparisonMaterials
      .map((mat) => {
        const deckOnly = sqft * (mat.materialCostPerSqft + mat.laborCostPerSqft);
        const total = deckOnly + railingSubtotal + stairsSubtotal;
        return {
          id: mat.id,
          name: mat.name,
          colorHex: mat.colorHex,
          deckOnly,
          railing: railingSubtotal,
          stairs: stairsSubtotal,
          total,
          isTanzite: false,
          lifespanYears: mat.lifespanYears,
          warrantyYears: mat.warrantyYears,
        };
      });

    return [tanzite, ...others];
  }, [breakdown, comparisonMaterials, sqft, collectionName, railingSubtotal, stairsSubtotal]);

  if (columns.length === 0 || sqft <= 0) return null;

  const maxTotal = Math.max(...columns.map((c) => c.total));
  const tanzite = columns.find((c) => c.isTanzite)!;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="mt-10 mb-4"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-display text-charcoal mb-2">
          Complete Project Price Comparison
        </h2>
        <p className="text-muted-foreground font-body text-sm sm:text-base max-w-2xl mx-auto">
          Tanzite Stone deck vs. competing surfaces for your&nbsp;
          <strong>{sqft.toLocaleString()} sq ft</strong> project — railing and
          stairs included on every option so you're comparing the full picture.
        </p>
      </div>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-border/60 shadow-sm bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left px-4 py-3 font-semibold text-charcoal w-36 bg-warm-cream/60">
                Line Item
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`text-center px-3 py-3 font-semibold ${
                    col.isTanzite
                      ? "bg-canyon/10 text-canyon border-b-2 border-canyon"
                      : "text-charcoal"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: col.colorHex }}
                    />
                    <span className="leading-tight">{col.name}</span>
                    {col.isTanzite && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal text-canyon bg-canyon/10 px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5 fill-canyon" /> Our Product
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Stone deck row */}
            <tr className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-charcoal bg-warm-cream/30">
                Stone Deck
                <div className="text-[11px] text-muted-foreground font-normal">
                  Materials + labor
                </div>
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`text-center px-3 py-3 tabular-nums ${
                    col.isTanzite ? "bg-canyon/5 font-semibold text-charcoal" : "text-charcoal/80"
                  }`}
                >
                  {formatCurrency(col.deckOnly)}
                  {sqft > 0 && (
                    <div className="text-[11px] text-muted-foreground font-normal">
                      {formatCurrency(col.deckOnly / sqft)}/sq ft
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {/* Railing row */}
            <tr className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-charcoal bg-warm-cream/30">
                Railing
                <div className="text-[11px] text-muted-foreground font-normal">
                  {railingSubtotal > 0 ? "From your estimate" : "Not selected"}
                </div>
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`text-center px-3 py-3 tabular-nums ${
                    col.isTanzite ? "bg-canyon/5" : ""
                  } ${railingSubtotal === 0 ? "text-muted-foreground" : "text-charcoal/80"}`}
                >
                  {railingSubtotal > 0 ? (
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {formatCurrency(railingSubtotal)}
                    </span>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Stairs row */}
            <tr className="border-b border-border/40 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-charcoal bg-warm-cream/30">
                Stairs
                <div className="text-[11px] text-muted-foreground font-normal">
                  {stairsSubtotal > 0 ? "From your estimate" : "Not selected"}
                </div>
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`text-center px-3 py-3 tabular-nums ${
                    col.isTanzite ? "bg-canyon/5" : ""
                  } ${stairsSubtotal === 0 ? "text-muted-foreground" : "text-charcoal/80"}`}
                >
                  {stairsSubtotal > 0 ? (
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {formatCurrency(stairsSubtotal)}
                    </span>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Total row */}
            <tr className="bg-charcoal/5">
              <td className="px-4 py-4 font-bold text-charcoal bg-warm-cream/60 text-sm">
                Total Project
              </td>
              {columns.map((col) => {
                const barPct = maxTotal > 0 ? (col.total / maxTotal) * 100 : 0;
                const savings = col.isTanzite ? 0 : col.total - tanzite.total;
                return (
                  <td
                    key={col.id}
                    className={`text-center px-3 py-4 ${
                      col.isTanzite
                        ? "bg-canyon/10 border-t-2 border-canyon"
                        : ""
                    }`}
                  >
                    <div
                      className={`text-base font-bold tabular-nums ${
                        col.isTanzite ? "text-canyon" : "text-charcoal"
                      }`}
                    >
                      {formatCurrency(col.total)}
                    </div>

                    {/* Bar chart */}
                    <div className="mt-2 mx-auto w-full max-w-[80px] h-1.5 rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: col.isTanzite ? "#C8956C" : col.colorHex,
                        }}
                      />
                    </div>

                    {/* Savings / premium vs Tanzite */}
                    {!col.isTanzite && col.total > 0 && tanzite.total > 0 && (
                      <div
                        className={`mt-1.5 text-[11px] font-medium ${
                          savings < 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {savings < 0
                          ? `${formatCurrency(Math.abs(savings))} less`
                          : `${formatCurrency(savings)} more`}
                      </div>
                    )}

                    {/* Lifespan badge */}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {col.lifespanYears}yr lifespan
                      {col.warrantyYears > 0 && ` · ${col.warrantyYears}yr warranty`}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3 font-body">
        Competitor prices are estimated averages for the {sqft.toLocaleString()} sq ft area. Railing and stairs reflect your actual selections above.
      </p>
    </motion.section>
  );
}
