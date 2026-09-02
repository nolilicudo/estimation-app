import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Info, Minus, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CornersWasteRule } from "@/hooks/useConfig";

interface DimensionsInputProps {
  deckLength: number;
  deckWidth: number;
  totalSqft: number;
  edgeLinearFt: number;
  corners: number;
  allNinetyDegrees: boolean;
  wasteFactor: number;
  cornersWasteRules: CornersWasteRule[];
  onLengthChange: (v: number) => void;
  onWidthChange: (v: number) => void;
  onSqftChange: (v: number) => void;
  onEdgeChange: (v: number) => void;
  onCornersChange: (v: number) => void;
  onAllNinetyDegreesChange: (v: boolean) => void;
}

export function DimensionsInput({
  deckLength,
  deckWidth,
  totalSqft,
  edgeLinearFt,
  corners,
  allNinetyDegrees,
  wasteFactor,
  cornersWasteRules,
  onLengthChange,
  onWidthChange,
  onSqftChange,
  onEdgeChange,
  onCornersChange,
  onAllNinetyDegreesChange,
}: DimensionsInputProps) {
  // Local mode toggle — purely UI, no need to persist
  const [mode, setMode] = useState<"lxw" | "sqft">("lxw");

  // Find the matching waste rule for current corners + angle setting
  const matchingRule = cornersWasteRules.find(
    (r) => r.corners === corners && r.allNinetyDegrees === allNinetyDegrees
  ) ?? cornersWasteRules.find((r) => r.corners === corners) ?? null;

  const displayWaste = matchingRule ? matchingRule.wastePercent : wasteFactor;

  return (
    <div className="space-y-6">
      {/* Deck Dimensions with mode toggle */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <label className="font-body font-semibold text-charcoal text-sm">
              Deck Dimensions
            </label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Enter dimensions as Length × Width, or switch to enter the total square footage directly.
                  For irregular shapes, enter the bounding dimensions and adjust the corners count below.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Mode toggle pill */}
          <div className="flex items-center gap-0.5 bg-sandstone/60 border border-border/60 rounded-full p-0.5">
            <button
              onClick={() => setMode("lxw")}
              className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-all ${
                mode === "lxw"
                  ? "bg-canyon text-white shadow-sm"
                  : "text-charcoal/70 hover:text-charcoal"
              }`}
            >
              L × W
            </button>
            <button
              onClick={() => setMode("sqft")}
              className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-all ${
                mode === "sqft"
                  ? "bg-canyon text-white shadow-sm"
                  : "text-charcoal/70 hover:text-charcoal"
              }`}
            >
              ft²
            </button>
          </div>
        </div>

        {mode === "lxw" ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Length */}
              <div>
                <label className="text-xs font-body text-muted-foreground mb-1 block">Length (ft)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLengthChange(Math.max(1, deckLength - 1))}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={deckLength}
                    min={1}
                    onChange={(e) => onLengthChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center text-base font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40 min-w-0"
                  />
                  <button
                    onClick={() => onLengthChange(deckLength + 1)}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <Slider
                  value={[deckLength]}
                  onValueChange={([v]) => onLengthChange(v)}
                  min={1}
                  max={200}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Width */}
              <div>
                <label className="text-xs font-body text-muted-foreground mb-1 block">Width (ft)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onWidthChange(Math.max(1, deckWidth - 1))}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={deckWidth}
                    min={1}
                    onChange={(e) => onWidthChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center text-base font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40 min-w-0"
                  />
                  <button
                    onClick={() => onWidthChange(deckWidth + 1)}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <Slider
                  value={[deckWidth]}
                  onValueChange={([v]) => onWidthChange(v)}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Calculated sqft display */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-canyon/10 border border-canyon/20">
              <span className="text-sm font-body text-charcoal">Total Area:</span>
              <span className="text-xl font-body font-bold text-canyon">
                {totalSqft.toLocaleString()} ft²
              </span>
              <span className="text-xs text-muted-foreground">({deckLength}' × {deckWidth}')</span>
            </div>
          </>
        ) : (
          <>
            {/* Direct sqft entry */}
            <div className="mb-3">
              <label className="text-xs font-body text-muted-foreground mb-1 block">Total Square Footage (ft²)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSqftChange(Math.max(1, totalSqft - 10))}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={totalSqft}
                  min={1}
                  onChange={(e) => onSqftChange(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center text-2xl font-body font-bold text-canyon bg-sandstone/50 border border-border rounded-md px-2 py-3 focus:outline-none focus:ring-2 focus:ring-canyon/40 min-w-0"
                />
                <button
                  onClick={() => onSqftChange(totalSqft + 10)}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors flex-shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-sm font-body text-muted-foreground w-8">ft²</span>
              </div>
              <Slider
                value={[totalSqft]}
                onValueChange={([v]) => onSqftChange(v)}
                min={10}
                max={5000}
                step={10}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-canyon/10 border border-canyon/20">
              <span className="text-sm font-body text-charcoal">Total Area:</span>
              <span className="text-xl font-body font-bold text-canyon">
                {totalSqft.toLocaleString()} ft²
              </span>
            </div>
          </>
        )}
      </div>

      {/* Corners */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="font-body font-semibold text-charcoal text-sm">
            Number of Corners
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Count the number of corners on your deck. A standard rectangular deck has 4 corners.
                Each additional corner (for L-shapes, notches, etc.) increases material waste.
                Minimum is 3 corners.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onCornersChange(Math.max(3, corners - 1))}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <input
              type="number"
              value={corners}
              min={3}
              onChange={(e) => onCornersChange(Math.max(3, parseInt(e.target.value) || 3))}
              className="w-full text-center text-lg font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40"
            />
          </div>
          <button
            onClick={() => onCornersChange(corners + 1)}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-sm font-body text-muted-foreground w-16">corners</span>
        </div>

        {/* All 90 degrees checkbox */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={allNinetyDegrees}
              onChange={(e) => onAllNinetyDegreesChange(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              allNinetyDegrees
                ? "bg-canyon border-canyon"
                : "bg-white border-border group-hover:border-canyon/60"
            }`}>
              {allNinetyDegrees && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm font-body font-medium text-charcoal">All corners are 90°</span>
            <p className="text-xs font-body text-muted-foreground">
              Uncheck if any corners are angled or non-square — this increases waste
            </p>
          </div>
        </label>

        {/* Waste factor display */}
        {matchingRule && (
          <div className="mt-3 p-2 rounded-md bg-sandstone/40 border border-border/40 flex items-center justify-between">
            <span className="text-xs font-body text-muted-foreground">
              Calculated waste factor for {corners} corners{allNinetyDegrees ? " (all 90°)" : " (angled)"}:
            </span>
            <span className="text-sm font-body font-semibold text-charcoal">{displayWaste}%</span>
          </div>
        )}
      </div>

      {/* Length of Outside Edge */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="font-body font-semibold text-charcoal text-sm">
            Length of Exposed Perimeter Edge
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Add together all outward-facing edges on the deck. Do not include
                edges against the house. If all sides are against a wall or on the
                ground, enter 0.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdgeChange(Math.max(0, edgeLinearFt - 5))}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <input
              type="number"
              value={edgeLinearFt}
              onChange={(e) => onEdgeChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-center text-lg font-body font-semibold text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40"
            />
          </div>
          <button
            onClick={() => onEdgeChange(edgeLinearFt + 5)}
            className="w-9 h-9 rounded-md border border-border flex items-center justify-center text-charcoal hover:bg-sandstone transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-sm font-body text-muted-foreground w-8">ft</span>
        </div>
        <Slider
          value={[edgeLinearFt]}
          onValueChange={([v]) => onEdgeChange(v)}
          min={0}
          max={500}
          step={5}
          className="mt-3"
        />
      </div>
    </div>
  );
}
