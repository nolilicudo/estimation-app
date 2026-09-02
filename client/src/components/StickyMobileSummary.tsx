import { type CostBreakdown, type HotTubState } from "@/hooks/useCalculator";
import { type FramingStructuralState } from "@/components/FramingStructuralSection";
import { type CollectionInfo, type ColorOption, type LaborTier, type DeliveryOption } from "@/lib/pricing-data";
import { type LumberItem } from "@/hooks/useConfig";
import { formatCurrency } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { CostSummary } from "./CostSummary";

interface StickyMobileSummaryProps {
  grandTotal: number;
  pricePerSqft: number;
  breakdown: CostBreakdown;
  collection: CollectionInfo;
  color: ColorOption;
  labor: LaborTier;
  delivery: DeliveryOption;
  sqft: number;
  onReset: () => void;
  hotTub?: HotTubState;
  framingStructural?: FramingStructuralState;
  lumberItems?: LumberItem[];
  deckWidthFt?: number;
  deckLengthFt?: number;
  moodboardNotes?: string;
  photoSessionKey?: string;
}

export function StickyMobileSummary({
  grandTotal,
  pricePerSqft,
  breakdown,
  collection,
  color,
  labor,
  delivery,
  sqft,
  onReset,
  hotTub,
  framingStructural,
  lumberItems = [],
  deckWidthFt = 12,
  deckLengthFt = 16,
  moodboardNotes = "",
  photoSessionKey,
}: StickyMobileSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Overlay when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <span className="font-body font-semibold text-charcoal text-sm">
              Full Estimate
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="text-muted-foreground p-1"
            >
              <ChevronUp className="w-5 h-5 rotate-180" />
            </button>
          </div>
          <CostSummary
            breakdown={breakdown}
            collection={collection}
            color={color}
            labor={labor}
            delivery={delivery}
            sqft={sqft}
            onReset={onReset}
            hotTub={hotTub}
            framingStructural={framingStructural}
            lumberItems={lumberItems}
            deckWidthFt={deckWidthFt}
            deckLengthFt={deckLengthFt}
            moodboardNotes={moodboardNotes}
            photoSessionKey={photoSessionKey}
          />
        </div>
      )}

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-charcoal text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-body text-warm-cream/70 uppercase tracking-wider">
              Estimated Total
            </p>
            <p className="text-xl font-display">{formatCurrency(grandTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-body text-warm-cream/70">
              {formatCurrency(pricePerSqft)}/ft²
            </p>
            <p className="text-xs font-body text-canyon-light font-medium mt-0.5">
              View Details
            </p>
          </div>
        </button>
      </div>

      {/* Bottom spacer for mobile */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
