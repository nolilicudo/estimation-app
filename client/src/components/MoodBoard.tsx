/**
 * MoodBoard — Project Mood Board & Customer Notes
 *
 * Shows a live visual preview of the customer's selections:
 *   • Stone color swatch + name
 *   • Railing style (if selected)
 *   • Soffit material (if selected)
 *   • A Steel Jacket badge (if enabled)
 *
 * Includes a notes textarea whose value travels through the entire workflow:
 * estimate email, contract PDF, and admin order/project card.
 */

import { type CalculatorState } from "@/hooks/useCalculator";
import { type SiteConfig } from "@/hooks/useConfig";
import { type ColorOption, type CollectionInfo } from "@/lib/pricing-data";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Palette, Fence, LayoutGrid, Shield, StickyNote } from "lucide-react";

interface MoodBoardProps {
  state: CalculatorState;
  currentColor: ColorOption | null;
  currentCollection: CollectionInfo | null;
  config: SiteConfig;
  onNotesChange: (notes: string) => void;
}

export function MoodBoard({
  state,
  currentColor,
  currentCollection,
  config,
  onNotesChange,
}: MoodBoardProps) {
  const railingOption = state.railingEnabled && state.railingOptionId != null
    ? config.railingOptions?.find((r) => r.id === state.railingOptionId)
    : null;

  const soffitMaterial = state.soffitEnabled && state.soffitMaterialId
    ? config.soffitMaterials?.find((s) => s.id === state.soffitMaterialId)
    : null;

  const hasAnySelection = currentColor || railingOption || soffitMaterial || state.steelJacketEnabled;

  return (
    <div className="space-y-5">
      {/* Visual Preview Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Your Project Selections
        </p>

        {!hasAnySelection ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
            <Palette className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/60 font-body">
              Complete the steps above to see your project preview here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Stone Color */}
            {currentColor && (
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
                <div
                  className="h-16 w-full"
                  style={{ backgroundColor: currentColor.hex }}
                />
                <div className="px-2 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Palette className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Stone</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{currentColor.name}</p>
                  {currentCollection && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{currentCollection.name}</p>
                  )}
                </div>
              </div>
            )}

            {/* Railing */}
            {railingOption && (
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="h-16 w-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
                  <Fence className="w-8 h-8 text-slate-600/70" />
                </div>
                <div className="px-2 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Fence className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Railing</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{railingOption.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {state.stairRailingSides === "both" ? "Both sides" : "One side"}
                  </p>
                </div>
              </div>
            )}

            {/* Soffit */}
            {soffitMaterial && (
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="h-16 w-full bg-gradient-to-br from-amber-100 to-amber-300 flex items-center justify-center">
                  <LayoutGrid className="w-8 h-8 text-amber-700/60" />
                </div>
                <div className="px-2 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <LayoutGrid className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Soffit</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{soffitMaterial.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{state.soffitSqft} sqft</p>
                </div>
              </div>
            )}

            {/* A Steel Jacket */}
            {state.steelJacketEnabled && (
              <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="h-16 w-full bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-zinc-700/70" />
                </div>
                <div className="px-2 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Waterproof</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">A Steel Jacket</p>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-0.5 h-4">Enabled</Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="w-4 h-4 text-canyon-rust" />
          <p className="text-sm font-semibold text-charcoal">Project Notes</p>
        </div>
        <p className="text-xs text-muted-foreground font-body mb-2">
          Capture anything important about this project — customer preferences, site conditions, special requests, or follow-up items. These notes will appear on the estimate email, contract, and admin project card.
        </p>
        <Textarea
          placeholder="e.g. Customer wants the deck to wrap around the hot tub pad. Prefers lighter stone colors. Existing railing needs removal. Follow up about adding a pergola..."
          value={state.moodboardNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={5}
          className="font-body text-sm resize-none bg-amber-50/30 border-amber-200/60 focus:border-canyon-rust/50 placeholder:text-muted-foreground/50"
        />
        {state.moodboardNotes.trim().length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {state.moodboardNotes.trim().length} characters · saved automatically
          </p>
        )}
      </div>
    </div>
  );
}
