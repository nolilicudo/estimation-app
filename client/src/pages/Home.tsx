/**
 * Design Your Price — Multi-Product Decking Calculator
 * Mountain Modern Design: warm sandstone, charcoal, canyon rust accents
 * Supports: Tanzite Stone, Resin Rock, Duradek/Tiledek
 */

import { useState, useMemo } from "react";
import { useCalculator } from "@/hooks/useCalculator";
import { useConfig, type ProductType } from "@/hooks/useConfig";
import { HeroSection } from "@/components/HeroSection";
import { CollectionPicker } from "@/components/CollectionPicker";
import { ColorPicker } from "@/components/ColorPicker";
import { DimensionsInput } from "@/components/DimensionsInput";
import { EdgeOptions } from "@/components/EdgeOptions";
import { StairsSection } from "@/components/StairsSection";
import { LaborPicker } from "@/components/LaborPicker";
import { DeliveryPicker } from "@/components/DeliveryPicker";
import { CostSummary } from "@/components/CostSummary";
import { Footer } from "@/components/Footer";
import { StickyMobileSummary } from "@/components/StickyMobileSummary";
import { ComparisonSection } from "@/components/ComparisonSection";
import { DemoRebuildSection } from "@/components/DemoRebuildSection";
import { ProductToggle } from "@/components/ProductToggle";
import { ResinRockCalculator } from "@/components/ResinRockCalculator";
import { DuradekCalculator } from "@/components/DuradekCalculator";
import { CrossProductComparison } from "@/components/CrossProductComparison";
import { AppalachianWaterproofSection } from "@/components/AppalachianWaterproofSection";
import { SteelJacketSection } from "@/components/SteelJacketSection";
import { MoodBoard } from "@/components/MoodBoard";
import { PostWrapSection } from "@/components/PostWrapSection";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { HotTubSection } from "@/components/HotTubSection";
import { RailingSection } from "@/components/RailingSection";
import { motion } from "framer-motion";
import { CustomerPathSection } from "@/components/CustomerPathSection";
import { PriceComparisonTable } from "@/components/PriceComparisonTable";
import { MapPin } from "lucide-react";
import { PinGate } from "@/components/PinGate";
import DesignPackageCalculator from "@/pages/DesignPackageCalculator";
import { PhotoCapture } from "@/components/PhotoCapture";

export default function Home() {
  const config = useConfig();
  const calc = useCalculator();
  const [productType, setProductType] = useState<ProductType>("tanzite");
  const [utahMarkupActive, setUtahMarkupActive] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState<"decking" | "design-package">("decking");
  /** Existing Deck Stair Addition mode — stairs-only, no sqft minimum */
  const [existingDeckMode, setExistingDeckMode] = useState(false);
  /** Stable session key for site photos — generated once per calculator session */
  const [photoSessionKey] = useState(() => `est-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [photoCount, setPhotoCount] = useState(0);

  // Utah Installation markup — multiplies all costs by (1 + markupPct/100)
  const utahMarkupEnabled = config.settings?.utah_markup_enabled === "1";
  const utahMarkupPct = parseFloat(config.settings?.utah_markup_percent || "25");
  const utahMultiplier = utahMarkupActive && utahMarkupEnabled ? (1 + utahMarkupPct / 100) : 1;

  // Apply markup to the breakdown for display purposes
  const displayBreakdown = utahMultiplier === 1 ? calc.breakdown : {
    ...calc.breakdown,
    deckMaterial: calc.breakdown.deckMaterial * utahMultiplier,
    edgeMaterial: calc.breakdown.edgeMaterial * utahMultiplier,
    stairMaterial: calc.breakdown.stairMaterial * utahMultiplier,
    accessoriesTotal: calc.breakdown.accessoriesTotal * utahMultiplier,
    wasteSurcharge: calc.breakdown.wasteSurcharge * utahMultiplier,
    subtotalMaterials: calc.breakdown.subtotalMaterials * utahMultiplier,
    laborCost: calc.breakdown.laborCost * utahMultiplier,
    deliveryCost: calc.breakdown.deliveryCost * utahMultiplier,
    permitCost: calc.breakdown.permitCost * utahMultiplier,
    demoRebuild: { ...calc.breakdown.demoRebuild, subtotal: calc.breakdown.demoRebuild.subtotal * utahMultiplier },
    rainEscape: { ...calc.breakdown.rainEscape, subtotal: calc.breakdown.rainEscape.subtotal * utahMultiplier },
    railing: { ...calc.breakdown.railing, subtotal: calc.breakdown.railing.subtotal * utahMultiplier },
    handrailRemovalCost: calc.breakdown.handrailRemovalCost * utahMultiplier,
    subtotalBeforeTax: calc.breakdown.subtotalBeforeTax * utahMultiplier,
    taxAmount: calc.breakdown.taxAmount * utahMultiplier,
    grandTotal: calc.breakdown.grandTotal * utahMultiplier,
    pricePerSqft: calc.breakdown.pricePerSqft * utahMultiplier,
  };
  // Build contract text for virtual signing (same template as OrderMaterialModal)
  const contractTemplate = config.settings?.contract_text || "";
  const contractGrandTotal = displayBreakdown.grandTotal;
  const contractDeposit = Math.round(contractGrandTotal * 0.5 * 100) / 100;
  const contractBalance = Math.round((contractGrandTotal - contractDeposit) * 100) / 100;
  const contractText = contractTemplate
    .replace(/\{customerName\}/g, "[Customer Name]")
    .replace(/\{collectionName\}/g, calc.currentCollection?.name || "Tanzite Stone Decking")
    .replace(/\{sqft\}/g, String(calc.state.totalSqft))
    .replace(/\{grandTotal\}/g, new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(contractGrandTotal))
    .replace(/\{depositAmount\}/g, new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(contractDeposit))
    .replace(/\{balanceAmount\}/g, new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(contractBalance));

  // Auto-fill post count and beam LF from deck dimensions + framing structural
  // Post count: posts along the outer beam row = Math.ceil(deckWidth / postSpacingFt) + 1
  // Beam LF: total beam length = deckWidth (outer beam) + deckWidth (ledger side) ≈ deckWidth × 2
  // We use deckWidth as the beam span and postSpacingFt from framingStructural
  const autoPostCount = useMemo(() => {
    const { deckWidth, framingStructural } = calc.state;
    const spacing = framingStructural.postSpacingFt || 8;
    // Posts along the outer beam: ceil(width / spacing) + 1
    // Typically 2 rows of posts (outer + mid if cantilever), but base case = 1 row
    return Math.ceil(deckWidth / spacing) + 1;
  }, [calc.state.deckWidth, calc.state.framingStructural.postSpacingFt]);

  const autoBeamLf = useMemo(() => {
    const { deckWidth } = calc.state;
    // Primary beam runs the full deck width; outer beam + any mid-span beam
    // Base case: 1 beam × deckWidth; with cantilever H-frame: 3 beams
    const beamCount = calc.state.framingStructural.hasCantilever ? 3 : 1;
    return Math.round(deckWidth * beamCount);
  }, [calc.state.deckWidth, calc.state.framingStructural.hasCantilever]);

  // Shared square footage — synced across all product tabs
  const [sharedSqft, setSharedSqft] = useState<number>(200);

  // When Tanzite sqft changes, update shared state
  const handleTanziteSqftChange = (v: number) => {
    calc.updateField("totalSqft", v);
    setSharedSqft(v);
  };

  // Keep sharedSqft in sync with Tanzite calc state (Tanzite is the source of truth when on that tab)
  const tanziteSqft = calc.state.totalSqft;

  // Compute live Resin Rock total for the same sqft as Tanzite (for comparison)
  const resinRockTotal = useMemo(() => {
    const sqft = calc.state.totalSqft;
    if (sqft <= 0 || !config.resinSurfaces?.length || !config.resinColors?.length) return 0;
    const surface = config.resinSurfaces[0];
    const color = config.resinColors[0];
    const resinSettings = config.productSettings?.["resin-rock"] || {};
    const laborRate = parseFloat(resinSettings.labor_rate_per_sqft || "8");
    const effectiveSqft = sqft * 1.10; // 10% waste
    const surfacePrepCost = surface.pricePerSqft * effectiveSqft;
    const materialCost = color.pricePerSqft * effectiveSqft;
    const waterproofingCost = surface.requiresWaterproofing && config.waterproofingOptions?.[0]
      ? config.waterproofingOptions[0].pricePerSqft * effectiveSqft : 0;
    const laborCost = laborRate * effectiveSqft;
    const subtotal = surfacePrepCost + materialCost + waterproofingCost + laborCost;
    const tax = subtotal * ((config.taxRate || 7.45) / 100);
    return subtotal + tax;
  }, [calc.state.totalSqft, config.resinSurfaces, config.resinColors, config.waterproofingOptions, config.productSettings, config.taxRate]);

  // Compute live Duradek Vinyl total for the same sqft as Tanzite (for comparison)
  const duradekTotal = useMemo(() => {
    const sqft = calc.state.totalSqft;
    if (sqft <= 0) return 0;
    const color = config.duradekColors?.[0];
    const duradekSettings = config.productSettings?.["duradek"] || {};
    const laborRate = parseFloat(duradekSettings.labor_rate_per_sqft || "6");
    const membraneRate = parseFloat(duradekSettings.membrane_price_per_sqft || "4.50");
    const effectiveSqft = sqft * 1.10;
    const colorPremium = color ? color.pricePerSqft : 0;
    const membraneCost = (membraneRate + colorPremium) * effectiveSqft;
    const laborCost = laborRate * effectiveSqft;
    const subtotal = membraneCost + laborCost;
    const tax = subtotal * ((config.taxRate || 7.45) / 100);
    return subtotal + tax;
  }, [calc.state.totalSqft, config.duradekColors, config.productSettings, config.taxRate]);

  const calculatorPin = config.settings?.calculator_pin ?? "";

  return (
    <PinGate legacyPin={calculatorPin}>
    {calculatorMode === "design-package" ? (
      <DesignPackageCalculator onBack={() => setCalculatorMode("decking")} />
    ) : (
    <div className="min-h-screen bg-warm-cream">
      <HeroSection
        settings={config.settings}
        utahMarkupEnabled={utahMarkupEnabled}
        utahMarkupActive={utahMarkupActive}
        onUtahMarkupToggle={() => setUtahMarkupActive(prev => !prev)}
        builderPricingEnabled={calc.state.builderPricingEnabled}
        onBuilderToggle={() => calc.updateField("builderPricingEnabled", !calc.state.builderPricingEnabled)}
        onLogoClick={() => setCalculatorMode("design-package")}
      />

      <CustomerPathSection
        breakdown={displayBreakdown}
        sqft={calc.state.totalSqft}
        productType={productType}
        collectionName={calc.currentCollection?.name || ""}
        config={config}
        finalTotal={displayBreakdown.grandTotal}
        discountApplied={false}
        discountName=""
        discountValue={0}
        discount2Applied={false}
        discount2Name=""
        discount2Value={0}
      />

      <div className="container py-8 lg:py-12">
        {/* Product Type Toggle */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl text-charcoal text-center mb-4">
            Choose Your Decking Product
          </h2>
          <p className="text-center text-muted-foreground font-body mb-6 max-w-2xl mx-auto">
            Select the type of decking material for your project. Each product has its own configuration options and pricing.
          </p>
          <ProductToggle
            selected={productType}
            onChange={(p) => {
              // If Duradek is hidden and user somehow has it selected, reset to tanzite
              if (p === "duradek" && config.settings.show_duradek !== "1") return;
              setProductType(p);
            }}
            showDuradek={config.settings.show_duradek === "1"}
          />
        </div>

        {/* Tanzite Stone Calculator */}
        {productType === "tanzite" && (
          <>
            {/* Project Address — primary field, auto-synced to hot tub snow load */}
            <div className="mb-6 p-4 bg-sandstone/60 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-charcoal flex-shrink-0">
                <MapPin className="w-4 h-4 text-canyon" />
                <span className="text-sm font-body font-semibold">Project Address</span>
              </div>
              <input
                type="text"
                placeholder="123 Main St, Salt Lake City, UT"
                value={calc.state.projectAddress}
                onChange={(e) => {
                  const addr = e.target.value;
                  calc.updateField("projectAddress", addr);
                  // Auto-sync to hot tub address so snow load lookup is pre-filled
                  calc.updateHotTub({ address: addr });
                }}
                className="flex-1 text-sm font-body text-charcoal bg-white border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-canyon/40"
              />
              <p className="text-xs text-muted-foreground sm:hidden">Used for snow load calculations when a hot tub is added.</p>
            </div>

            <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 xl:gap-12">
              {/* Left: Calculator inputs */}
              <div className="space-y-6 lg:space-y-8">
                {/* Step 1: Collection */}
                <SectionSlab step={1} title="Choose Your Collection" delay={0}
                  hasSelection={!!calc.state.collection}
                  selectionLabel={calc.currentCollection?.name}
                >
                  <CollectionPicker
                    collection={calc.state.collection}
                    onChange={(v) => calc.updateField("collection", v)}
                    collections={calc.collections}
                  />
                </SectionSlab>

                {/* Step 2: Color */}
                <SectionSlab step={2} title="Select Stone Color" delay={0.05}
                  hasSelection={!!calc.state.selectedColor}
                  selectionLabel={calc.currentColor?.name}
                >
                  <ColorPicker
                    colors={calc.currentCollection?.colors ?? []}
                    selectedColor={calc.state.selectedColor}
                    onChange={(v) => calc.updateField("selectedColor", v)}
                  />
                </SectionSlab>

                {/* Project Mode Toggle: New Deck vs Existing Deck Stair Addition */}
                <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-body font-semibold text-charcoal">Project Type</p>
                    <p className="text-xs text-muted-foreground">New deck surface, or adding stairs to an existing deck?</p>
                  </div>
                  <div className="inline-flex rounded-full border border-border/60 bg-sandstone/40 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExistingDeckMode(false)}
                      className={`px-4 py-1.5 text-xs font-body font-semibold transition-all ${
                        !existingDeckMode ? "bg-canyon text-white" : "text-stone-dark hover:bg-sandstone/60"
                      }`}
                    >
                      New Deck
                    </button>
                    <div className="w-px self-stretch bg-border/40" />
                    <button
                      onClick={() => setExistingDeckMode(true)}
                      className={`px-4 py-1.5 text-xs font-body font-semibold transition-all ${
                        existingDeckMode ? "bg-canyon text-white" : "text-stone-dark hover:bg-sandstone/60"
                      }`}
                    >
                      Existing Deck Stair Addition
                    </button>
                  </div>
                </div>

                {/* Step 3: Dimensions — hidden in existing deck mode */}
                {!existingDeckMode && (<SectionSlab step={3} title="Project Dimensions" delay={0.1}
                  hasSelection={calc.state.totalSqft > 0}
                  selectionLabel={`${calc.state.totalSqft} sq ft`}
                >
                  <DimensionsInput
                    deckLength={calc.state.deckLength}
                    deckWidth={calc.state.deckWidth}
                    totalSqft={calc.state.totalSqft}
                    edgeLinearFt={calc.state.edgeLinearFt}
                    corners={calc.state.corners}
                    allNinetyDegrees={calc.state.allNinetyDegrees}
                    wasteFactor={calc.state.wasteFactor}
                    cornersWasteRules={config.cornersWasteRules}
                    onLengthChange={(v: number) => {
                      calc.updateField("deckLength", v);
                      const newSqft = v * calc.state.deckWidth;
                      calc.updateField("totalSqft", newSqft);
                      setSharedSqft(newSqft);
                    }}
                    onWidthChange={(v: number) => {
                      calc.updateField("deckWidth", v);
                      const newSqft = calc.state.deckLength * v;
                      calc.updateField("totalSqft", newSqft);
                      setSharedSqft(newSqft);
                    }}
                    onSqftChange={(v: number) => {
                      calc.updateField("totalSqft", v);
                      setSharedSqft(v);
                    }}
                    onEdgeChange={(v: number) => calc.updateField("edgeLinearFt", v)}
                    onCornersChange={(v: number) => {
                      calc.updateField("corners", v);
                      // Auto-update waste factor from rules
                      const rule = config.cornersWasteRules.find(
                        r => r.corners === v && r.allNinetyDegrees === calc.state.allNinetyDegrees
                      ) ?? config.cornersWasteRules.find(r => r.corners === v);
                      if (rule) calc.updateField("wasteFactor", rule.wastePercent);
                    }}
                    onAllNinetyDegreesChange={(v: boolean) => {
                      calc.updateField("allNinetyDegrees", v);
                      // Auto-update waste factor from rules
                      const rule = config.cornersWasteRules.find(
                        r => r.corners === calc.state.corners && r.allNinetyDegrees === v
                      ) ?? config.cornersWasteRules.find(r => r.corners === calc.state.corners);
                      if (rule) calc.updateField("wasteFactor", rule.wastePercent);
                    }}
                  />
                </SectionSlab>)}

                {/* Step 4: Edge Finishing — hidden in existing deck mode */}
                {!existingDeckMode && (<SectionSlab step={4} title="Edge Finishing" delay={0.15}
                  hasSelection={!!calc.state.edgeOptionId}
                  selectionLabel={calc.availableEdges.find(e => e.id === calc.state.edgeOptionId)?.name}
                >
                  <EdgeOptions
                    edges={calc.availableEdges}
                    selectedEdge={calc.state.edgeOptionId}
                    onChange={(v) => calc.updateField("edgeOptionId", v)}
                  />
                </SectionSlab>)}

                {/* Step 5: Stairs */}
<SectionSlab step={5} title={existingDeckMode ? "Stair Addition" : "Stairs"} delay={0.2}
                  hasSelection={existingDeckMode || calc.state.stairRuns.length > 0}
                  selectionLabel={calc.state.stairRuns.length > 0 ? `${calc.state.stairRuns.length} stair run${calc.state.stairRuns.length > 1 ? "s" : ""}` : existingDeckMode ? "Existing deck mode" : undefined}
                >
                  {existingDeckMode && calc.state.stairRuns.length === 0 && (() => {
                    // Auto-seed one stair run when entering existing deck mode
                    setTimeout(() => { const { makeDefaultStairRun } = require("@/components/StairsSection"); calc.updateField("stairRuns", [makeDefaultStairRun(0)]); }, 0);
                    return null;
                  })()}
                  <StairsSection
                    stairRuns={calc.state.stairRuns}
                    onStairRunsChange={(runs) => calc.updateField("stairRuns", runs)}
                    existingDeckMode={existingDeckMode}
                  />
                </SectionSlab>

                {/* Step 6: Installation */}
                <SectionSlab step={6} title="Installation Service" delay={0.25}
                  hasSelection={!!calc.state.laborTierId}
                  selectionLabel={calc.currentLabor?.name}
                >
                  <LaborPicker
                    tiers={calc.laborTiers}
                    selectedTier={calc.state.laborTierId}
                    onChange={(v) => calc.updateField("laborTierId", v)}
                  />
                </SectionSlab>



                {/* Step 7: Delivery */}
                <SectionSlab step={7} title="Delivery" delay={0.3}
                  hasSelection={!!calc.state.deliveryId}
                  selectionLabel={calc.currentDelivery?.name}
                >
                  <DeliveryPicker
                    options={calc.deliveryOptions}
                    selectedOption={calc.state.deliveryId}
                    onChange={(v) => calc.updateField("deliveryId", v)}
                    includePermit={calc.state.includePermit}
                    onPermitChange={(v: boolean) => calc.updateField("includePermit", v)}
                    framingActive={calc.demoRebuildState.enabled && calc.demoRebuildState.needsFraming}
                  />
                </SectionSlab>

                {/* Step 8: Demo & Rebuild */}
                <SectionSlab step={8} title="Demo & Rebuild" delay={0.35}
                  hasSelection={calc.demoRebuildState.enabled}
                  selectionLabel={calc.demoRebuildState.enabled ? `${calc.breakdown.demoRebuild.details.length} item${calc.breakdown.demoRebuild.details.length !== 1 ? "s" : ""} selected` : undefined}
                >
                  <DemoRebuildSection
                    state={calc.demoRebuildState}
                    onChange={calc.setDemoRebuildState}
                    demolitionOptions={config.demolitionOptions}
                    footingOptions={config.footingOptions}
                    concreteOptions={config.concreteOptions}
                    framingOptions={config.framingOptions}
                    facadeOptions={config.facadeOptions}
                    deckSqft={calc.state.totalSqft}
                    collection={calc.state.collection}
                    framingStructural={calc.state.framingStructural}
                    onFramingStructuralChange={calc.updateFramingStructural}
                    onAutoToggleDemoFraming={calc.handleHotTubJoistMismatch}
                    projectAddress={calc.state.projectAddress}
                    hotTub={calc.state.hotTub}
                    lumberItems={config.lumberItems}
                    deckWidthFt={calc.state.deckWidth}
                    deckLengthFt={calc.state.deckLength}
                    liftThreshold1DepthIn={config.liftThreshold1DepthIn}
                    liftThreshold2DepthIn={config.liftThreshold2DepthIn}
                    liftCost1={config.liftCost1}
                    liftCost2={config.liftCost2}
                  />
                </SectionSlab>

                {/* Step 9: Hot Tub Engineering */}
                <SectionSlab step={9} title="Hot Tub on Deck" delay={0.4}
                  hasSelection={calc.state.hotTub.enabled}
                  selectionLabel={calc.state.hotTub.enabled ? `${calc.state.hotTub.personSize}-person hot tub` : undefined}
                >
                  <HotTubSection
                    hotTub={calc.state.hotTub}
                    onChange={calc.updateHotTub}
                    onAutoToggleDemoFraming={calc.handleHotTubJoistMismatch}
                    projectAddress={calc.state.projectAddress}
                  />
                </SectionSlab>

                {/* Step 10: Railing System */}
                <SectionSlab step={10} title="Railing System" delay={0.43}
                  hasSelection={calc.state.railingEnabled && calc.state.railingOptionId !== null}
                  selectionLabel={calc.state.railingEnabled && calc.state.railingOptionId !== null ? calc.config.railingOptions.find(r => r.id === calc.state.railingOptionId)?.name : undefined}
                >
                  <RailingSection
                    railingEnabled={calc.state.railingEnabled}
                    railingOptionId={calc.state.railingOptionId}
                    stairRailingSides={calc.state.stairRailingSides}
                    deckHeightIn={calc.state.deckHeightIn}
                    stairRuns={calc.state.stairRuns}
                    deckLength={calc.state.deckLength}
                    deckWidth={calc.state.deckWidth}
                    edgeLinearFt={calc.state.edgeLinearFt}
                    railingOptions={calc.config.railingOptions}
                    onToggle={(enabled) => calc.updateField("railingEnabled", enabled)}
                    onSelectOption={(id) => calc.updateField("railingOptionId", id)}
                    onStairSidesChange={(sides) => calc.updateField("stairRailingSides", sides)}
                    onDeckHeightChange={(h) => calc.updateField("deckHeightIn", h)}
                    handrailRemovalEnabled={calc.state.handrailRemovalEnabled}
                    handrailRemovalLf={calc.state.handrailRemovalLf}
                    handrailRemovalRate={calc.config.settings?.handrail_removal_rate ? parseFloat(calc.config.settings.handrail_removal_rate) : 15}
                    onHandrailRemovalToggle={(enabled) => calc.updateField("handrailRemovalEnabled", enabled)}
                    onHandrailRemovalLfChange={(lf) => calc.updateField("handrailRemovalLf", lf)}
                    railingColorNote={calc.state.railingColorNote}
                    onRailingColorNoteChange={(note) => calc.updateField("railingColorNote", note)}
                  />
                </SectionSlab>

                {/* Step 11: Appalachian Waterproof Under-Deck System (RainEscape + A Steel Jacket) */}
                {calc.state.collection === "appalachian" && (
                  <SectionSlab step={11} title="Waterproof Under-Deck System" delay={0.45}
                    hasSelection={calc.state.rainEscapeEnabled || calc.state.steelJacketEnabled}
                    selectionLabel={
                      calc.state.rainEscapeEnabled && calc.state.steelJacketEnabled
                        ? "RainEscape + A Steel Jacket"
                        : calc.state.rainEscapeEnabled
                        ? "RainEscape Enabled"
                        : calc.state.steelJacketEnabled
                        ? "A Steel Jacket Enabled"
                        : undefined
                    }
                  >
                    {/* Option A: Trex RainEscape */}
                    <AppalachianWaterproofSection
                      state={calc.state}
                      updateField={calc.updateField}
                      rainEscapeOptions={config.rainEscapeOptions}
                      soffitMaterials={config.soffitMaterials}
                      rainEscapeSubtotal={displayBreakdown.rainEscape.subtotal}
                    />
                    {/* Option B: A Steel Jacket */}
                    <SteelJacketSection
                      state={calc.state}
                      updateField={calc.updateField}
                      steelJacketOptions={config.steelJacketOptions}
                      steelJacketSubtotal={displayBreakdown.steelJacket.subtotal}
                    />
                  </SectionSlab>
                )}

                {/* Step 12: Post & Beam Wrap */}
                <SectionSlab
                  step={12}
                  title="Post & Beam Wrap"
                  delay={0.48}
                  hasSelection={calc.state.postWrapEnabled}
                  selectionLabel={calc.state.postWrapEnabled ? "Post wrap selected" : undefined}
                >
                  <PostWrapSection
                    enabled={calc.state.postWrapEnabled}
                    onToggle={(v) => calc.updateField("postWrapEnabled", v)}
                    selectedOptionId={calc.state.postWrapOptionId}
                    onSelectOption={(id) => calc.updateField("postWrapOptionId", id)}
                    linearFt={calc.state.postWrapLinearFt}
                    onLinearFtChange={(v) => calc.updateField("postWrapLinearFt", v)}
                    postCount={calc.state.postWrapPostCount || autoPostCount}
                    onPostCountChange={(v) => calc.updateField("postWrapPostCount", v)}
                    beamLf={calc.state.postWrapBeamLf || autoBeamLf}
                    onBeamLfChange={(v) => calc.updateField("postWrapBeamLf", v)}
                    autoPostCount={autoPostCount}
                    autoBeamLf={autoBeamLf}
                    options={config.postWrapOptions}
                    lengthTiers={config.postWrapLengthTiers}
                    postWrapCost={displayBreakdown.postWrapCost}
                    postWrapMaterialCost={displayBreakdown.postWrapMaterialCost}
                    postWrapLaborCost={displayBreakdown.postWrapLaborCost}
                    postWrapPostPieces={displayBreakdown.postWrapPostPieces}
                    postWrapBeamPieces={displayBreakdown.postWrapBeamPieces}
                    deckHeightIn={calc.state.deckHeightIn ?? 0}
                  />
                </SectionSlab>

                {/* Step 13: Project Mood Board & Notes */}
                <SectionSlab
                  step={13}
                  title="Project Mood Board & Notes"
                  delay={0.5}
                  hasSelection={calc.state.moodboardNotes.trim().length > 0}
                  selectionLabel={calc.state.moodboardNotes.trim().length > 0 ? "Notes added" : undefined}
                >
                  <MoodBoard
                    state={calc.state}
                    currentColor={calc.currentColor ?? null}
                    currentCollection={calc.currentCollection}
                    config={config}
                    onNotesChange={(notes) => calc.updateField("moodboardNotes", notes)}
                  />
                </SectionSlab>

                {/* Step 13: Site Photos */}
                <SectionSlab
                  step={13}
                  title="Site Photos"
                  delay={0.52}
                  hasSelection={photoCount > 0}
                  selectionLabel={photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? "s" : ""}` : undefined}
                >
                  <PhotoCapture
                    sessionKey={photoSessionKey}
                    onPhotoCountChange={setPhotoCount}
                  />
                </SectionSlab>

                {/* Step 14: Availability Calendar — urgency closing tool */}
                <SectionSlab
                  step={14}
                  title="Available Install Dates"
                  delay={0.55}
                >
                  <AvailabilityCalendar />
                </SectionSlab>

              </div>

              {/* Right: Sticky cost summary (desktop) */}
              <div className="hidden lg:block">
                <div className="sticky top-6">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <CostSummary
                      breakdown={displayBreakdown}
                      collection={calc.currentCollection}
                      color={calc.currentColor ?? calc.currentCollection?.colors?.[0]}
                      labor={calc.currentLabor}
                      delivery={calc.currentDelivery}
                      sqft={calc.state.totalSqft}
                      onReset={calc.resetCalculator}
                      stairRuns={calc.state.stairRuns}
                      edgeLinearFt={calc.state.edgeLinearFt}
                      wasteFactor={calc.state.wasteFactor}
                      includePermit={calc.state.includePermit}
                      hotTub={calc.state.hotTub}
                      framingStructural={calc.state.framingStructural}
                      lumberItems={calc.config.lumberItems}
                      deckWidthFt={calc.state.deckWidth}
                      deckLengthFt={calc.state.deckLength}
                      liftThreshold1DepthIn={config.liftThreshold1DepthIn}
                      liftThreshold2DepthIn={config.liftThreshold2DepthIn}
                      liftCost1={config.liftCost1}
                      liftCost2={config.liftCost2}
                      contractText={contractText}
                      estimateSnapshot={JSON.stringify({ collection: calc.currentCollection?.name, color: calc.currentColor?.name, sqft: calc.state.totalSqft, grandTotal: contractGrandTotal })}
                      moodboardNotes={calc.state.moodboardNotes}
                      builderPricingEnabled={calc.state.builderPricingEnabled}
                      onBuilderToggle={() => calc.updateField("builderPricingEnabled", !calc.state.builderPricingEnabled)}
                      photoSessionKey={photoSessionKey}
                    />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Price Comparison Table — stone deck vs competitors, with railing + stairs */}
            {config.settings.show_comparison_table !== "0" && (
              <div className="mt-8">
                <PriceComparisonTable
                  breakdown={displayBreakdown}
                  comparisonMaterials={config.comparisonMaterials}
                  sqft={calc.state.totalSqft}
                  collectionName={calc.currentCollection?.name || "Stone"}
                  railingSubtotal={displayBreakdown.railing.subtotal}
                  stairsSubtotal={displayBreakdown.stairMaterial}
                />
              </div>
            )}

            {/* Material Comparison Section */}
            <div className="mt-8">
              <ComparisonSection
                breakdown={displayBreakdown}
                comparisonMaterials={config.comparisonMaterials}
                sqft={calc.state.totalSqft}
                collectionName={calc.currentCollection?.name || "Stone"}
                collectionSlug={calc.state.collection}
                rainEscapeOptions={config.rainEscapeOptions}
                resinRockTotal={resinRockTotal}
                duradekTotal={duradekTotal}
                showDuradek={config.settings.show_duradek === "1"}
              />
            </div>

            {/* Cross-Product Comparison */}
            <CrossProductComparison
              config={config}
              tanziteBreakdown={displayBreakdown}
              tanziteSqft={calc.state.totalSqft}
              tanziteCollectionName={calc.currentCollection?.name || "Stone"}
            />

            {/* Mobile sticky summary */}
            <StickyMobileSummary
              grandTotal={displayBreakdown.grandTotal}
              pricePerSqft={displayBreakdown.pricePerSqft}
              breakdown={displayBreakdown}
              collection={calc.currentCollection}
              color={calc.currentColor ?? calc.currentCollection?.colors?.[0]}
              labor={calc.currentLabor}
              delivery={calc.currentDelivery}
              sqft={calc.state.totalSqft}
              onReset={calc.resetCalculator}
              hotTub={calc.state.hotTub}
              framingStructural={calc.state.framingStructural}
              lumberItems={calc.config.lumberItems}
              deckWidthFt={calc.state.deckWidth}
              deckLengthFt={calc.state.deckLength}
              moodboardNotes={calc.state.moodboardNotes}
              photoSessionKey={photoSessionKey}
            />
          </>
        )}

        {/* Resin Rock Calculator */}
        {productType === "resin-rock" && (
          <ResinRockCalculator
            config={config}
            sharedSqft={sharedSqft}
            onSqftChange={(v) => setSharedSqft(v)}
          />
        )}

        {/* Duradek / Tiledek Calculator — only shown when admin has enabled it */}
        {productType === "duradek" && config.settings.show_duradek === "1" && (
          <DuradekCalculator
            config={config}
            sharedSqft={sharedSqft}
            onSqftChange={(v) => setSharedSqft(v)}
          />
        )}
      </div>

      <Footer settings={config.settings} />
    </div>
    )}
    </PinGate>
  );
}

function SectionSlab({
  step,
  title,
  children,
  delay = 0,
  hasSelection = false,
  selectionLabel,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  delay?: number;
  hasSelection?: boolean;
  selectionLabel?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-300 ${
        hasSelection ? "border-green-400/50 shadow-green-100" : "border-border/60"
      }`}
    >
      <div className={`px-5 py-4 sm:px-6 sm:py-5 border-b border-border/40 transition-colors duration-300 ${
        hasSelection ? "bg-green-50/60" : "bg-sandstone/30"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-semibold font-body shrink-0 transition-colors duration-300 ${
            hasSelection ? "bg-green-600" : "bg-canyon"
          }`}>
            {hasSelection ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : step}
          </span>
          <h2 className="text-xl sm:text-2xl text-charcoal">{title}</h2>
          {hasSelection && selectionLabel && (
            <span className="ml-auto text-xs font-body font-medium text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
              {selectionLabel}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </motion.section>
  );
}
