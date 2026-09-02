import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Palette, Ruler, Layers, Grid3X3 } from "lucide-react";
import type { SiteConfig, DuradekColor, TileSize, DuradekSubType } from "@/hooks/useConfig";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface DuradekState {
  subType: DuradekSubType;
  // Duradek vinyl
  colorId: string;
  // Tiledek
  tileSizeId: string;
  // Shared
  sqft: number;
  wasteFactor: number;
}

interface DuradekBreakdown {
  membraneCost: number;
  mortarCost: number;
  tileLaborCost: number;
  tileMatCost: number;
  laborCost: number;
  subtotal: number;
  tax: number;
  grandTotal: number;
  pricePerSqft: number;
  effectiveSqft: number;
  subType: DuradekSubType;
}

interface DuradekCalculatorProps {
  config: SiteConfig;
  sharedSqft?: number;
  onSqftChange?: (sqft: number) => void;
}

export function DuradekCalculator({ config, sharedSqft, onSqftChange }: DuradekCalculatorProps) {
  const { duradekColors, tileSizes, productSettings, taxRate } = config;

  const duradekSettings = productSettings["duradek"] || {};
  const tiledekSettings = productSettings["tiledek"] || {};

  const duradekLaborRate = parseFloat(duradekSettings.labor_rate_per_sqft || "6");
  const duradekMembraneRate = parseFloat(duradekSettings.membrane_price_per_sqft || "4.50");
  const tiledekMembraneRate = parseFloat(tiledekSettings.tiledek_membrane_per_sqft || "3.75");
  const mortarRate = parseFloat(tiledekSettings.mortar_per_sqft || "2.50");

  // Group Duradek colors by series
  const colorsBySeries = useMemo(() => {
    const groups: Record<string, DuradekColor[]> = {};
    for (const c of duradekColors) {
      const series = c.series || "Standard";
      if (!groups[series]) groups[series] = [];
      groups[series].push(c);
    }
    return groups;
  }, [duradekColors]);

  const [state, setState] = useState<DuradekState>({
    subType: "duradek-vinyl",
    colorId: duradekColors[0]?.id || "",
    tileSizeId: tileSizes[0]?.id || "",
    sqft: sharedSqft ?? 200,
    wasteFactor: 10,
  });

  useEffect(() => {
    if (duradekColors.length && !state.colorId) {
      setState(s => ({ ...s, colorId: duradekColors[0].id }));
    }
    if (tileSizes.length && !state.tileSizeId) {
      setState(s => ({ ...s, tileSizeId: tileSizes[0].id }));
    }
  }, [duradekColors, tileSizes]);

  // Sync sqft from shared state when it changes externally
  useEffect(() => {
    if (sharedSqft !== undefined && sharedSqft !== state.sqft) {
      setState(s => ({ ...s, sqft: sharedSqft }));
    }
  }, [sharedSqft]);

  const selectedColor = duradekColors.find(c => c.id === state.colorId);
  const selectedTileSize = tileSizes.find(t => t.id === state.tileSizeId);

  const breakdown = useMemo<DuradekBreakdown>(() => {
    const effectiveSqft = state.sqft * (1 + state.wasteFactor / 100);

    if (state.subType === "duradek-vinyl") {
      // Duradek vinyl: membrane + color premium + labor
      const colorPremium = selectedColor ? selectedColor.pricePerSqft : 0;
      const membraneCost = (duradekMembraneRate + colorPremium) * effectiveSqft;
      const laborCost = duradekLaborRate * effectiveSqft;
      const subtotal = membraneCost + laborCost;
      const tax = subtotal * (taxRate / 100);
      return {
        membraneCost,
        mortarCost: 0,
        tileLaborCost: 0,
        tileMatCost: 0,
        laborCost,
        subtotal,
        tax,
        grandTotal: subtotal + tax,
        pricePerSqft: state.sqft > 0 ? (subtotal + tax) / state.sqft : 0,
        effectiveSqft,
        subType: "duradek-vinyl",
      };
    } else {
      // Tiledek: membrane + mortar + tile labor + tile material
      const membraneCost = tiledekMembraneRate * effectiveSqft;
      const mortarCost = mortarRate * effectiveSqft;
      const tileLaborCost = selectedTileSize ? selectedTileSize.laborPerSqft * effectiveSqft : 0;
      const tileMatCost = selectedTileSize ? selectedTileSize.materialPerSqft * effectiveSqft : 0;
      const subtotal = membraneCost + mortarCost + tileLaborCost + tileMatCost;
      const tax = subtotal * (taxRate / 100);
      return {
        membraneCost,
        mortarCost,
        tileLaborCost,
        tileMatCost,
        laborCost: 0,
        subtotal,
        tax,
        grandTotal: subtotal + tax,
        pricePerSqft: state.sqft > 0 ? (subtotal + tax) / state.sqft : 0,
        effectiveSqft,
        subType: "tiledek",
      };
    }
  }, [state, selectedColor, selectedTileSize, duradekMembraneRate, duradekLaborRate, tiledekMembraneRate, mortarRate, taxRate]);

  const update = <K extends keyof DuradekState>(key: K, value: DuradekState[K]) => {
    setState(s => ({ ...s, [key]: value }));
    if (key === "sqft" && onSqftChange) {
      onSqftChange(value as number);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 xl:gap-12">
      {/* Left: Calculator inputs */}
      <div className="space-y-6 lg:space-y-8">
        {/* Sub-type toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 bg-sandstone/30">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-canyon text-white text-sm font-semibold font-body shrink-0">
                1
              </span>
              <h2 className="text-xl sm:text-2xl text-charcoal">Product Type</h2>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update("subType", "duradek-vinyl")}
                className={`relative text-left rounded-lg p-4 border-2 transition-all ${
                  state.subType === "duradek-vinyl"
                    ? "border-canyon bg-canyon/5 shadow-md"
                    : "border-border/60 bg-white hover:border-canyon/40"
                }`}
              >
                <Shield className={`w-6 h-6 mb-2 ${state.subType === "duradek-vinyl" ? "text-canyon" : "text-stone-medium"}`} />
                <span className={`block font-semibold text-sm ${state.subType === "duradek-vinyl" ? "text-canyon" : "text-charcoal"}`}>
                  Duradek Vinyl
                </span>
                <span className="block text-xs text-muted-foreground font-body mt-1">
                  Waterproof vinyl membrane decking with printed color patterns
                </span>
              </button>
              <button
                onClick={() => update("subType", "tiledek")}
                className={`relative text-left rounded-lg p-4 border-2 transition-all ${
                  state.subType === "tiledek"
                    ? "border-canyon bg-canyon/5 shadow-md"
                    : "border-border/60 bg-white hover:border-canyon/40"
                }`}
              >
                <Grid3X3 className={`w-6 h-6 mb-2 ${state.subType === "tiledek" ? "text-canyon" : "text-stone-medium"}`} />
                <span className={`block font-semibold text-sm ${state.subType === "tiledek" ? "text-canyon" : "text-charcoal"}`}>
                  Tiledek + Tile
                </span>
                <span className="block text-xs text-muted-foreground font-body mt-1">
                  Tiledek membrane with Mapei Grani-Rapid mortar and tile install
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Duradek Vinyl: Color Selection */}
        {state.subType === "duradek-vinyl" && (
          <SectionSlab step={2} title="Duradek Color" icon={<Palette className="w-5 h-5" />}>
            <p className="text-sm text-muted-foreground font-body mb-4">
              Choose from Duradek's range of vinyl membrane colors and patterns.
            </p>
            {Object.entries(colorsBySeries).map(([series, colors]) => (
              <div key={series} className="mb-4 last:mb-0">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-body font-semibold mb-2">
                  {series} Series
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
                        title={`${color.name} (${series}) — +${formatCurrency(color.pricePerSqft)}/sqft`}
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
                  <div>
                    <span className="text-sm font-semibold text-charcoal">{selectedColor.name}</span>
                    <span className="text-xs text-muted-foreground font-body ml-2">{selectedColor.series} Series</span>
                  </div>
                </div>
                <span className="text-sm font-body text-charcoal">
                  +{formatCurrency(selectedColor.pricePerSqft)}/sqft
                </span>
              </div>
            )}
          </SectionSlab>
        )}

        {/* Tiledek: Tile Size Selection */}
        {state.subType === "tiledek" && (
          <SectionSlab step={2} title="Tile Size & Install" icon={<Grid3X3 className="w-5 h-5" />}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Layers className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Tiledek System</p>
                  <p className="text-xs text-blue-700 font-body mt-1">
                    Includes Tiledek waterproof membrane + Mapei Grani-Rapid latex hydraulic mortar + tile installation. Price varies by tile size.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {tileSizes.map(tile => {
                const isActive = state.tileSizeId === tile.id;
                const totalPerSqft = tile.laborPerSqft + tile.materialPerSqft;
                return (
                  <button
                    key={tile.id}
                    onClick={() => update("tileSizeId", tile.id)}
                    className={`w-full text-left rounded-lg p-4 border-2 transition-all ${
                      isActive
                        ? "border-canyon bg-canyon/5 shadow-md"
                        : "border-border/60 bg-white hover:border-canyon/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-semibold text-sm ${isActive ? "text-canyon" : "text-charcoal"}`}>
                          {tile.name}
                        </span>
                        <p className="text-xs text-muted-foreground font-body mt-1">{tile.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-charcoal font-body">
                          {formatCurrency(totalPerSqft)}/sqft
                        </span>
                        <p className="text-[10px] text-muted-foreground font-body">
                          Labor: {formatCurrency(tile.laborPerSqft)} + Mat: {formatCurrency(tile.materialPerSqft)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionSlab>
        )}

        {/* Dimensions */}
        <SectionSlab step={3} title="Project Dimensions" icon={<Ruler className="w-5 h-5" />}>
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
            <DuradekCostSummary
              breakdown={breakdown}
              color={state.subType === "duradek-vinyl" ? selectedColor : undefined}
              tileSize={state.subType === "tiledek" ? selectedTileSize : undefined}
              sqft={state.sqft}
              taxRate={taxRate}
              duradekMembraneRate={duradekMembraneRate}
              tiledekMembraneRate={tiledekMembraneRate}
              mortarRate={mortarRate}
              duradekLaborRate={duradekLaborRate}
            />
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

function DuradekCostSummary({
  breakdown,
  color,
  tileSize,
  sqft,
  taxRate,
  duradekMembraneRate,
  tiledekMembraneRate,
  mortarRate,
  duradekLaborRate,
}: {
  breakdown: DuradekBreakdown;
  color?: DuradekColor;
  tileSize?: TileSize;
  sqft: number;
  taxRate: number;
  duradekMembraneRate: number;
  tiledekMembraneRate: number;
  mortarRate: number;
  duradekLaborRate: number;
}) {
  const isDuradek = breakdown.subType === "duradek-vinyl";
  const title = isDuradek ? "Duradek Vinyl Estimate" : "Tiledek + Tile Estimate";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="bg-charcoal px-5 py-4">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <p className="text-warm-cream/60 text-sm font-body">{formatNumber(sqft)} sqft project</p>
      </div>

      {/* Selections */}
      <div className="px-5 py-4 border-b border-border/40 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-body">Product</span>
          <span className="font-medium text-charcoal">{isDuradek ? "Duradek Vinyl" : "Tiledek + Tile"}</span>
        </div>
        {isDuradek && color && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-body">Color</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: color.hex }} />
              <span className="font-medium text-charcoal">{color.name}</span>
            </div>
          </div>
        )}
        {!isDuradek && tileSize && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-body">Tile Size</span>
            <span className="font-medium text-charcoal">{tileSize.name}</span>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="px-5 py-4 space-y-2.5">
        {isDuradek ? (
          <>
            <LineItem label={`Duradek Membrane ($${duradekMembraneRate}${color ? ` + $${color.pricePerSqft}` : ""}/sqft)`} amount={breakdown.membraneCost} />
            <LineItem label={`Installation Labor ($${duradekLaborRate}/sqft)`} amount={breakdown.laborCost} />
          </>
        ) : (
          <>
            <LineItem label={`Tiledek Membrane ($${tiledekMembraneRate}/sqft)`} amount={breakdown.membraneCost} />
            <LineItem label={`Mapei Grani-Rapid Mortar ($${mortarRate}/sqft)`} amount={breakdown.mortarCost} />
            {tileSize && (
              <>
                <LineItem label={`Tile Material ($${tileSize.materialPerSqft}/sqft)`} amount={breakdown.tileMatCost} />
                <LineItem label={`Tile Installation ($${tileSize.laborPerSqft}/sqft)`} amount={breakdown.tileLaborCost} />
              </>
            )}
          </>
        )}

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
