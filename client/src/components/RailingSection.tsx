/**
 * RailingSection — Step 10 of the Tanzite calculator
 *
 * Two-step selection:
 *  1. Color: White | Black | Stainless | Other (write-in)
 *  2. Style: Wire | Custom Welded Horizontal | Custom Welded Vertical
 *
 * All colors share the same pricing. "Other" uses a write-in field.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2, Wrench, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { RailingOption } from "@/hooks/useConfig";
import type { StairRun } from "@/components/StairsSection";

const COLOR_VARIANTS = [
  {
    id: "white",
    label: "White",
    swatch: "#F5F5F0",
    border: "#D6D3D1",
  },
  {
    id: "black",
    label: "Black",
    swatch: "#1C1917",
    border: "#1C1917",
  },
  {
    id: "stainless",
    label: "Stainless",
    swatch: "linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 40%, #A8A8A8 70%, #D0D0D0 100%)",
    border: "#A8A8A8",
  },
  {
    id: "other",
    label: "Other",
    swatch: "linear-gradient(135deg, #e7e5e4 0%, #f5f5f4 50%, #d6d3d1 100%)",
    border: "#a8a29e",
  },
] as const;

type ColorVariant = "white" | "black" | "stainless" | "other";

interface RailingSectionProps {
  railingEnabled: boolean;
  railingOptionId: number | null;
  stairRailingSides: "one" | "both";
  deckHeightIn: number;
  stairRuns: StairRun[];
  deckLength: number;
  deckWidth: number;
  edgeLinearFt: number;
  railingOptions: RailingOption[];
  handrailRemovalEnabled: boolean;
  handrailRemovalLf: number;
  handrailRemovalRate?: number;
  railingColorNote?: string;
  onToggle: (enabled: boolean) => void;
  onSelectOption: (id: number) => void;
  onStairSidesChange: (sides: "one" | "both") => void;
  onDeckHeightChange: (heightIn: number) => void;
  onHandrailRemovalToggle: (enabled: boolean) => void;
  onHandrailRemovalLfChange: (lf: number) => void;
  onRailingColorNoteChange?: (note: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function RailingSection({
  railingEnabled,
  railingOptionId,
  stairRailingSides,
  deckHeightIn,
  stairRuns,
  deckLength,
  deckWidth,
  edgeLinearFt,
  railingOptions,
  handrailRemovalEnabled,
  handrailRemovalLf,
  handrailRemovalRate = 15,
  railingColorNote = "",
  onToggle,
  onSelectOption,
  onStairSidesChange,
  onDeckHeightChange,
  onHandrailRemovalToggle,
  onHandrailRemovalLfChange,
  onRailingColorNoteChange,
}: RailingSectionProps) {
  const isOver24in = deckHeightIn >= 24;
  const requiresRailing = isOver24in;
  const hasStairs = stairRuns.length > 0;
  const totalStairTreads = stairRuns.reduce((sum, r) => sum + r.stairTreads, 0);

  const deckEdgeLf = edgeLinearFt > 0 ? edgeLinearFt : (deckLength + deckWidth * 2);
  const stairLfPerSide = hasStairs ? Math.ceil(totalStairTreads * 1.0 * 1.2) : 0;
  const stairLf = hasStairs ? stairLfPerSide * (stairRailingSides === "both" ? 2 : 1) : 0;
  const totalLf = deckEdgeLf + stairLf;

  // Local state for selected color (independent of railingOptionId so it persists across style changes)
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(() => {
    // Initialize from the currently selected option's colorVariant
    const opt = railingOptions.find(r => r.id === railingOptionId);
    if (!opt?.colorVariant) return null;
    const cv = opt.colorVariant as ColorVariant;
    return ["white", "black", "stainless"].includes(cv) ? cv : "other";
  });

  const selectedOption = railingOptions.find(r => r.id === railingOptionId) ?? null;
  const estimatedCost = selectedOption ? totalLf * selectedOption.pricePerLf : 0;

  // All style options (using the first color's options as the canonical list — all colors share same styles/pricing)
  // We use stainless options as the "base" styles since those were the original options
  const baseStyleOptions = railingOptions.filter(r => r.colorVariant === "stainless" || !r.colorVariant);

  // When a color is picked, map the current style selection to the equivalent option for that color
  const handleColorSelect = (color: ColorVariant) => {
    setSelectedColor(color);
    if (color === "other") {
      // For "other", just keep the current style but note the color separately
      // If no option selected, pick the first base style
      if (!railingOptionId && baseStyleOptions.length > 0) {
        onSelectOption(baseStyleOptions[0].id);
      }
      return;
    }
    // Find options for this color
    const colorOpts = railingOptions.filter(r => r.colorVariant === color);
    if (colorOpts.length > 0) {
      // Try to match the current style type
      if (selectedOption) {
        const match = colorOpts.find(
          o => o.railingType === selectedOption.railingType && o.orientation === selectedOption.orientation
        );
        onSelectOption(match?.id ?? colorOpts[0].id);
      } else {
        onSelectOption(colorOpts[0].id);
      }
    } else {
      // No color-specific options — use base stainless options (same pricing)
      if (baseStyleOptions.length > 0) {
        onSelectOption(baseStyleOptions[0].id);
      }
    }
  };

  // Style options to show in Step 2 — always show the stainless/base options (same pricing for all colors)
  const styleOptionsToShow = baseStyleOptions.length > 0 ? baseStyleOptions : railingOptions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-700 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
            10
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Railing System</h3>
            <p className="text-stone-300 text-sm">Edge-mounted · Wire or Custom Welded</p>
          </div>
        </div>
        <Switch
          checked={railingEnabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-amber-500"
        />
      </div>

      {/* Code requirement banner */}
      {requiresRailing && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm font-medium">
            IRC code requires railing on decks 24&quot; or more above grade. Your deck height is{" "}
            <span className="font-bold">{deckHeightIn}&quot;</span>.
          </p>
        </div>
      )}

      <div className="px-6 py-6 space-y-6">
        {/* Deck height */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-stone-700 font-medium text-sm">
              Is the deck going to be over 24&quot; tall?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => onDeckHeightChange(val ? 30 : 12)}
                  className={`rounded-xl border-2 py-2.5 px-3 text-sm font-semibold transition-all ${
                    isOver24in === val
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              {isOver24in
                ? "24\"+ — railing required by IRC code"
                : "Under 24\" — railing is optional"}
            </p>
          </div>

          {/* LF summary */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-2">Auto-Calculated LF</p>
            <div className="space-y-1 text-sm text-stone-700">
              <div className="flex justify-between">
                <span>Deck edge</span>
                <span className="font-semibold">{deckEdgeLf} LF</span>
              </div>
              {hasStairs && (
                <div className="flex justify-between">
                  <span>Stairs ({totalStairTreads} steps × 1.2{stairRailingSides === "both" ? " × 2 sides" : ""})</span>
                  <span className="font-semibold">{stairLf} LF</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-1 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-amber-700">{totalLf} LF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stair railing sides */}
        {hasStairs && (
          <div className="space-y-2">
            <Label className="text-stone-700 font-medium text-sm">
              Stair Railing — Number of Sides
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {(["one", "both"] as const).map(side => (
                <button
                  key={side}
                  onClick={() => onStairSidesChange(side)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    stairRailingSides === side
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <p className={`font-semibold text-sm ${stairRailingSides === side ? "text-amber-800" : "text-stone-700"}`}>
                    {side === "one" ? "One Side" : "Both Sides"}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {side === "one"
                      ? `${stairLfPerSide} LF (${totalStairTreads} steps × 1.2)`
                      : `${stairLfPerSide * 2} LF (both sides)`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Color selection ── */}
        {railingEnabled && (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-stone-700 font-semibold text-sm uppercase tracking-wide">
                Step 1 — Choose Railing Color
              </p>
              <div className="grid grid-cols-4 gap-3">
                {COLOR_VARIANTS.map((cv) => {
                  const isActive = selectedColor === cv.id;
                  return (
                    <button
                      key={cv.id}
                      onClick={() => handleColorSelect(cv.id)}
                      className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                        isActive
                          ? "border-amber-500 bg-amber-50 shadow-md"
                          : "border-stone-200 bg-white hover:border-stone-400"
                      }`}
                    >
                      {/* Swatch */}
                      {cv.id === "other" ? (
                        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-stone-100"
                          style={{ borderColor: cv.border }}>
                          <Pencil className="w-4 h-4 text-stone-500" />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full border-2 shadow-inner"
                          style={{
                            background: cv.swatch,
                            borderColor: cv.border,
                          }}
                        />
                      )}
                      <span className="text-xs font-semibold text-stone-700">{cv.label}</span>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Other write-in field */}
              {selectedColor === "other" && (
                <div className="mt-2">
                  <Label className="text-stone-700 font-medium text-sm mb-1.5 block">
                    Specify Color
                  </Label>
                  <Input
                    type="text"
                    value={railingColorNote}
                    onChange={(e) => onRailingColorNoteChange?.(e.target.value)}
                    placeholder="e.g. Bronze, Copper, Custom Powder Coat..."
                    className="w-full"
                  />
                  <p className="text-xs text-stone-500 mt-1">This note will appear on the estimate and contract.</p>
                </div>
              )}
            </div>

            {/* ── Step 2: Style selection (shown once color is picked) ── */}
            {selectedColor && (
              <div className="space-y-3">
                <p className="text-stone-700 font-semibold text-sm uppercase tracking-wide">
                  Step 2 — Choose Railing Style
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {styleOptionsToShow.map(opt => (
                    <RailingOptionCard
                      key={opt.id}
                      option={opt}
                      selected={
                        // Match by type+orientation since "other" color uses stainless options
                        selectedOption?.railingType === opt.railingType &&
                        selectedOption?.orientation === opt.orientation
                      }
                      totalLf={totalLf}
                      onSelect={() => {
                        // If "other" color, select this option directly
                        // If a known color, find the matching color-specific option
                        if (selectedColor === "other" || !selectedColor) {
                          onSelectOption(opt.id);
                        } else {
                          const colorOpts = railingOptions.filter(r => r.colorVariant === selectedColor);
                          const match = colorOpts.find(
                            o => o.railingType === opt.railingType && o.orientation === opt.orientation
                          );
                          onSelectOption(match?.id ?? opt.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cost summary */}
            {selectedOption && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-stone-800 rounded-xl p-4 text-white"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-stone-300 text-sm">Railing Estimate</p>
                    <p className="font-bold text-xl text-amber-400">{fmt(estimatedCost)}</p>
                  </div>
                  <div className="text-right text-sm text-stone-300">
                    <p>{totalLf} LF total</p>
                    <p>{fmt(selectedOption.pricePerLf)}/LF</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-stone-700 flex items-center gap-2 text-xs text-stone-400">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  Edge-mounted ·{" "}
                  {selectedColor === "other" && railingColorNote
                    ? `${railingColorNote} — ${selectedOption.name}`
                    : selectedOption.name}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Handrail Removal & Reset */}
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="bg-stone-50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-stone-600" />
              <div>
                <p className="text-stone-800 font-semibold text-sm">Removal & Resetting of Existing Handrail</p>
                <p className="text-stone-500 text-xs mt-0.5">For new decks with an existing handrail — ${handrailRemovalRate}/LF, no markup</p>
              </div>
            </div>
            <Switch
              checked={handrailRemovalEnabled}
              onCheckedChange={(enabled) => {
                onHandrailRemovalToggle(enabled);
                if (enabled && handrailRemovalLf === 0 && deckEdgeLf > 0) {
                  onHandrailRemovalLfChange(deckEdgeLf);
                }
              }}
              className="data-[state=checked]:bg-stone-700"
            />
          </div>
          {handrailRemovalEnabled && (
            <div className="px-4 py-4 space-y-3 bg-white">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-stone-700 font-medium text-sm mb-1 block">Linear Feet of Handrail</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={handrailRemovalLf || ""}
                    onChange={(e) => onHandrailRemovalLfChange(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full"
                    placeholder="e.g. 24"
                  />
                </div>
                {handrailRemovalLf > 0 && (
                  <div className="bg-stone-800 rounded-xl px-4 py-3 text-white text-center shrink-0">
                    <p className="text-stone-300 text-xs">Removal Cost</p>
                    <p className="font-bold text-lg text-amber-400">{fmt(handrailRemovalLf * handrailRemovalRate)}</p>
                    <p className="text-stone-400 text-xs">{handrailRemovalLf} LF × ${handrailRemovalRate}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Not enabled but required */}
        {!railingEnabled && requiresRailing && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold text-sm">Railing Required</p>
              <p className="text-red-700 text-sm mt-1">
                IRC code requires a railing for decks over 24&quot; above grade. Enable railing above to include it in your estimate.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface RailingOptionCardProps {
  option: RailingOption;
  selected: boolean;
  totalLf: number;
  onSelect: () => void;
}

function RailingOptionCard({ option, selected, totalLf, onSelect }: RailingOptionCardProps) {
  const total = totalLf * option.pricePerLf;
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? "border-amber-500 bg-amber-50 shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${selected ? "text-amber-800" : "text-stone-800"}`}>
            {option.name}
          </p>
          {option.description && (
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{option.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="text-xs capitalize">
              {option.railingType === "wire" ? "Wire" : option.railingType === "welded" ? "Custom Welded" : option.railingType === "wood" ? "Wood" : option.railingType === "glass" ? "Glass" : option.railingType}
            </Badge>
            {option.orientation && (
              <Badge variant="outline" className="text-xs capitalize">
                {option.orientation} bars
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-base ${selected ? "text-amber-700" : "text-stone-700"}`}>
            {total.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-stone-500">{option.pricePerLf.toFixed(2)}/LF</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2 pt-2 border-t border-amber-200 flex items-center gap-1.5 text-xs text-amber-700">
          <CheckCircle2 className="w-3 h-3" />
          Selected
        </div>
      )}
    </button>
  );
}
