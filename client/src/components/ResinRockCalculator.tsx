import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Droplets, AlertTriangle, Ruler, Palette, Layers } from "lucide-react";
import type { SiteConfig, ResinSurface, ResinColor, WaterproofingOption } from "@/hooks/useConfig";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ResinRockState {
  surfaceId: string;
  colorId: string;
  waterproofingId: string;
  sqft: number;
  wasteFactor: number;
}

interface ResinRockBreakdown {
  surfacePrepCost: number;
  materialCost: number;
  waterproofingCost: number;
  laborCost: number;
  subtotal: number;
  tax: number;
  grandTotal: number;
  pricePerSqft: number;
  effectiveSqft: number;
  needsWaterproofing: boolean;
}

interface ResinRockCalculatorProps {
  config: SiteConfig;
  sharedSqft?: number;
  onSqftChange?: (sqft: number) => void;
}

export function ResinRockCalculator({ config, sharedSqft, onSqftChange }: ResinRockCalculatorProps) {
  const { resinSurfaces, resinColors, waterproofingOptions, productSettings, taxRate } = config;

  const resinSettings = productSettings["resin-rock"] || {};
  const laborRate = parseFloat(resinSettings.labor_rate_per_sqft || "8");
  const minOrder = parseFloat(resinSettings.minimum_order_sqft || "100");

  const [state, setState] = useState<ResinRockState>({
    surfaceId: resinSurfaces[0]?.id || "",
    colorId: resinColors[0]?.id || "",
    waterproofingId: waterproofingOptions[0]?.id || "",
    sqft: sharedSqft ?? 200,
    wasteFactor: 10,
  });

  // Sync sqft from shared state when it changes externally
  useEffect(() => {
    if (sharedSqft !== undefined && sharedSqft !== state.sqft) {
      setState(s => ({ ...s, sqft: sharedSqft }));
    }
  }, [sharedSqft]);

  // Auto-select first items when data loads
  useEffect(() => {
    if (resinSurfaces.length && !state.surfaceId) {
      setState(s => ({ ...s, surfaceId: resinSurfaces[0].id }));
    }
    if (resinColors.length && !state.colorId) {
      setState(s => ({ ...s, colorId: resinColors[0].id }));
    }
  }, [resinSurfaces, resinColors]);

  const selectedSurface = resinSurfaces.find(s => s.id === state.surfaceId);
  const selectedColor = resinColors.find(c => c.id === state.colorId);
  const selectedWaterproofing = waterproofingOptions.find(w => w.id === state.waterproofingId);
  const needsWaterproofing = selectedSurface?.requiresWaterproofing || false;

  // Group colors by category
  const colorsByCategory = useMemo(() => {
    const groups: Record<string, ResinColor[]> = {};
    for (const c of resinColors) {
      const cat = c.category || "standard";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    return groups;
  }, [resinColors]);

  const breakdown = useMemo<ResinRockBreakdown>(() => {
    const effectiveSqft = state.sqft * (1 + state.wasteFactor / 100);
    const surfacePrepCost = selectedSurface ? selectedSurface.pricePerSqft * effectiveSqft : 0;
    const materialCost = selectedColor ? selectedColor.pricePerSqft * effectiveSqft : 0;
    const waterproofingCost = needsWaterproofing && selectedWaterproofing
      ? selectedWaterproofing.pricePerSqft * effectiveSqft
      : 0;
    const laborCost = laborRate * effectiveSqft;
    const subtotal = surfacePrepCost + materialCost + waterproofingCost + laborCost;
    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;
    const pricePerSqft = state.sqft > 0 ? grandTotal / state.sqft : 0;

    return {
      surfacePrepCost,
      materialCost,
      waterproofingCost,
      laborCost,
      subtotal,
      tax,
      grandTotal,
      pricePerSqft,
      effectiveSqft,
      needsWaterproofing,
    };
  }, [state, selectedSurface, selectedColor, selectedWaterproofing, needsWaterproofing, laborRate, taxRate]);

  const update = <K extends keyof ResinRockState>(key: K, value: ResinRockState[K]) => {
    setState(s => ({ ...s, [key]: value }));
    if (key === "sqft" && onSqftChange) {
      onSqftChange(value as number);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 xl:gap-12">
      {/* Left: Calculator inputs */}
      <div className="space-y-6 lg:space-y-8">
        {/* Step 1: Surface Type */}
        <SectionSlab step={1} title="Surface Type" icon={<Layers className="w-5 h-5" />}>
          <p className="text-sm text-muted-foreground font-body mb-4">
            Select the surface where the resin stone will be applied. Some surfaces require waterproofing underneath.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resinSurfaces.map(surface => {
              const isActive = state.surfaceId === surface.id;
              return (
                <button
                  key={surface.id}
                  onClick={() => update("surfaceId", surface.id)}
                  className={`relative text-left rounded-lg p-4 border-2 transition-all ${
                    isActive
                      ? "border-canyon bg-canyon/5 shadow-md"
                      : "border-border/60 bg-white hover:border-canyon/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`font-semibold text-sm ${isActive ? "text-canyon" : "text-charcoal"}`}>
                        {surface.name}
                      </span>
                      <p className="text-xs text-muted-foreground font-body mt-1">{surface.description}</p>
                    </div>
                    <span className="text-sm font-semibold text-charcoal font-body">
                      {formatCurrency(surface.pricePerSqft)}/sqft
                    </span>
                  </div>
                  {surface.requiresWaterproofing && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-body">
                      <Droplets className="w-3.5 h-3.5" />
                      Requires waterproofing membrane
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </SectionSlab>

        {/* Step 2: Waterproofing (conditional) */}
        {needsWaterproofing && (
          <SectionSlab step={2} title="Waterproofing Membrane" icon={<Droplets className="w-5 h-5" />}>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Waterproofing Required</p>
                  <p className="text-xs text-amber-700 font-body mt-1">
                    The selected surface ({selectedSurface?.name}) requires a poured rubber membrane waterproofing layer to prevent moisture damage.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {waterproofingOptions.map(wp => {
                const isActive = state.waterproofingId === wp.id;
                return (
                  <button
                    key={wp.id}
                    onClick={() => update("waterproofingId", wp.id)}
                    className={`w-full text-left rounded-lg p-4 border-2 transition-all ${
                      isActive
                        ? "border-canyon bg-canyon/5 shadow-md"
                        : "border-border/60 bg-white hover:border-canyon/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-semibold text-sm ${isActive ? "text-canyon" : "text-charcoal"}`}>
                          {wp.name}
                        </span>
                        <p className="text-xs text-muted-foreground font-body mt-1">{wp.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-charcoal font-body">
                        {formatCurrency(wp.pricePerSqft)}/sqft
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionSlab>
        )}

        {/* Step 2/3: Color Selection */}
        <SectionSlab
          step={needsWaterproofing ? 3 : 2}
          title="Resin Stone Color"
          icon={<Palette className="w-5 h-5" />}
        >
          {Object.entries(colorsByCategory).map(([category, colors]) => (
            <div key={category} className="mb-4 last:mb-0">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-body font-semibold mb-2">
                {category}
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {colors.map(color => {
                  const isActive = state.colorId === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => update("colorId", color.id)}
                      className={`group relative rounded-lg p-2 border-2 transition-all ${
                        isActive
                          ? "border-canyon shadow-md"
                          : "border-transparent hover:border-canyon/30"
                      }`}
                      title={`${color.name} — ${formatCurrency(color.pricePerSqft)}/sqft`}
                    >
                      <div
                        className="w-full aspect-square rounded-md shadow-inner"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="block text-[10px] sm:text-xs text-center mt-1 font-body text-charcoal truncate">
                        {color.name}
                      </span>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-canyon rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {selectedColor && (
            <div className="mt-3 p-3 bg-sandstone/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md shadow-inner" style={{ backgroundColor: selectedColor.hex }} />
                <span className="text-sm font-semibold text-charcoal">{selectedColor.name}</span>
              </div>
              <span className="text-sm font-body text-charcoal">
                {formatCurrency(selectedColor.pricePerSqft)}/sqft
              </span>
            </div>
          )}
        </SectionSlab>

        {/* Step 3/4: Dimensions */}
        <SectionSlab
          step={needsWaterproofing ? 4 : 3}
          title="Project Dimensions"
          icon={<Ruler className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Total Area (sqft)
              </label>
              <input
                type="number"
                min={0}
                value={state.sqft || ""}
                onChange={e => update("sqft", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/50 focus:border-canyon transition-colors"
                placeholder="e.g. 200"
              />
              {state.sqft > 0 && state.sqft < minOrder && (
                <p className="text-xs text-amber-600 font-body mt-1">
                  Minimum order is {formatNumber(minOrder)} sqft
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Waste Factor (%)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={state.wasteFactor}
                onChange={e => update("wasteFactor", Math.min(30, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/50 focus:border-canyon transition-colors"
              />
              <p className="text-xs text-muted-foreground font-body mt-1">
                Effective area: {formatNumber(breakdown.effectiveSqft)} sqft
              </p>
            </div>
          </div>
        </SectionSlab>
      </div>

      {/* Right: Sticky cost summary */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ResinCostSummary breakdown={breakdown} surface={selectedSurface} color={selectedColor} waterproofing={needsWaterproofing ? selectedWaterproofing : undefined} sqft={state.sqft} taxRate={taxRate} laborRate={laborRate} />
          </motion.div>
        </div>
      </div>

      {/* Mobile sticky summary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-body">Estimated Total</p>
            <p className="text-xl font-bold text-charcoal">{formatCurrency(breakdown.grandTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-body">Per sqft</p>
            <p className="text-lg font-semibold text-canyon">{formatCurrency(breakdown.pricePerSqft)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResinCostSummary({
  breakdown,
  surface,
  color,
  waterproofing,
  sqft,
  taxRate,
  laborRate,
}: {
  breakdown: ResinRockBreakdown;
  surface?: ResinSurface;
  color?: ResinColor;
  waterproofing?: WaterproofingOption;
  sqft: number;
  taxRate: number;
  laborRate: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="bg-charcoal px-5 py-4">
        <h3 className="text-white text-lg font-semibold">Resin Rock Estimate</h3>
        <p className="text-warm-cream/60 text-sm font-body">{formatNumber(sqft)} sqft project</p>
      </div>

      {/* Selections */}
      <div className="px-5 py-4 border-b border-border/40 space-y-2">
        {surface && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-body">Surface</span>
            <span className="font-medium text-charcoal">{surface.name}</span>
          </div>
        )}
        {color && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-body">Color</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: color.hex }} />
              <span className="font-medium text-charcoal">{color.name}</span>
            </div>
          </div>
        )}
        {waterproofing && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-body">Waterproofing</span>
            <span className="font-medium text-charcoal">{waterproofing.name}</span>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="px-5 py-4 space-y-2.5">
        <LineItem label="Surface Preparation" amount={breakdown.surfacePrepCost} />
        <LineItem label="Resin Stone Material" amount={breakdown.materialCost} />
        {breakdown.needsWaterproofing && (
          <LineItem label="Waterproofing Membrane" amount={breakdown.waterproofingCost} />
        )}
        <LineItem label={`Installation Labor ($${laborRate}/sqft)`} amount={breakdown.laborCost} />

        <div className="border-t border-border/40 pt-2.5 mt-2.5">
          <LineItem label="Subtotal" amount={breakdown.subtotal} />
          <LineItem label={`Tax (${taxRate}%)`} amount={breakdown.tax} />
        </div>
      </div>

      {/* Grand total */}
      <div className="bg-canyon/5 border-t-2 border-canyon px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-charcoal">Total Estimate</span>
          <span className="text-2xl font-bold text-canyon">{formatCurrency(breakdown.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground font-body mt-1">
          <span>Price per sqft</span>
          <span className="font-semibold text-charcoal">{formatCurrency(breakdown.pricePerSqft)}/sqft</span>
        </div>
      </div>
    </div>
  );
}

function LineItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground font-body">{label}</span>
      <span className="font-medium text-charcoal">{formatCurrency(amount)}</span>
    </div>
  );
}

function SectionSlab({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-canyon text-white text-sm font-semibold font-body shrink-0">
            {step}
          </span>
          <h2 className="text-xl sm:text-2xl text-charcoal">{title}</h2>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </motion.section>
  );
}
