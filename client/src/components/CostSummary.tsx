import { type CostBreakdown, type HotTubState } from "@/hooks/useCalculator";
import { type FramingStructuralState } from "@/components/FramingStructuralSection";
import { LumberPackageCallout } from "@/components/LumberPackageCallout";
import { type CollectionInfo, type ColorOption, type LaborTier, type DeliveryOption } from "@/lib/pricing-data";
import { formatCurrency } from "@/lib/utils";
import { RotateCcw, ChevronDown, ChevronUp, Tag, Mail, X, CheckCircle, AlertCircle, Loader2, ShoppingCart, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useCalcUser } from "@/hooks/useCalcUser";
import { useConfig, type LumberItem } from "@/hooks/useConfig";
import { trpc } from "@/lib/trpc";
import { OrderMaterialModal } from "@/components/OrderMaterialModal";
import { EnhancifyWidget } from "@/components/EnhancifyWidget";

interface CostSummaryProps {
  breakdown: CostBreakdown;
  collection: CollectionInfo;
  color: ColorOption;
  labor: LaborTier;
  delivery: DeliveryOption;
  sqft: number;
  onReset: () => void;
  // Optional: pass state for scope-of-work display
  stairRuns?: import("@/components/StairsSection").StairRun[];
  edgeLinearFt?: number;
  wasteFactor?: number;
  includePermit?: boolean;
  // Structural lumber package
  hotTub?: HotTubState;
  framingStructural?: FramingStructuralState;
  lumberItems?: LumberItem[];
  deckWidthFt?: number;
  deckLengthFt?: number;
  // Lift threshold settings
  liftThreshold1DepthIn?: number;
  liftThreshold2DepthIn?: number;
  liftCost1?: number;
  liftCost2?: number;
  // Contract signing
  contractText?: string;
  estimateSnapshot?: string;
  // Mood board notes — travels to email, contract, and admin card
  moodboardNotes?: string;
  /** When true, hides the Early Bird and Same Day discount toggles */
  builderPricingEnabled?: boolean;
  /** Callback to toggle builder pricing on/off from within the summary panel */
  onBuilderToggle?: () => void;
  /** Session key for site photos taken during this estimate appointment */
  photoSessionKey?: string;
}

export function CostSummary({
  breakdown,
  collection,
  color,
  labor,
  delivery,
  sqft,
  onReset,
  stairRuns = [],
  edgeLinearFt = 0,
  wasteFactor = 10,
  includePermit = false,
  hotTub,
  framingStructural,
  lumberItems = [],
  deckWidthFt = 12,
  deckLengthFt = 16,
  liftThreshold1DepthIn = 10,
  liftThreshold2DepthIn = 14,
  liftCost1 = 450,
  liftCost2 = 800,
  contractText = "",
  estimateSnapshot = "",
  moodboardNotes = "",
  builderPricingEnabled = false,
  onBuilderToggle,
  photoSessionKey,
}: CostSummaryProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discount2Applied, setDiscount2Applied] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [emailSignUrl, setEmailSignUrl] = useState<string | undefined>(undefined);
  const [emailName, setEmailName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [emailStreetAddress, setEmailStreetAddress] = useState("");
  const [emailCity, setEmailCity] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const config = useConfig();
  const calUser = useCalcUser();

  // Auto-fill rep contact info when the email dialog opens
  useEffect(() => {
    if (showEmailDialog && calUser) {
      if (!emailName) setEmailName("");
      // We don't auto-fill customer fields — those are the customer's info
      // But we track the rep for assignment
    }
  }, [showEmailDialog, calUser]);

  // When builder pricing is turned on, clear any active discounts so they
  // don't silently remain applied while hidden
  useEffect(() => {
    if (builderPricingEnabled) {
      setDiscountApplied(false);
      setDiscount2Applied(false);
    }
  }, [builderPricingEnabled]);

  // Admin-controlled settings
  const showItemized = config.settings?.show_itemized_pricing !== "0";
  const showPricing = config.settings?.show_pricing !== "0";
  const discountEnabled = config.settings?.discount_enabled === "1";
  const discountName = config.settings?.discount_name || "Special Discount";
  const discountType = config.settings?.discount_type || "percent"; // "percent" | "flat"
  const discountAmount = parseFloat(config.settings?.discount_amount || "0");

  // Discount 2
  const discount2Enabled = config.settings?.discount2_enabled === "1";
  const discount2Name = config.settings?.discount2_name || "Seasonal Discount";
  const discount2Type = config.settings?.discount2_type || "percent";
  const discount2Amount = parseFloat(config.settings?.discount2_amount || "0");
  // Whether discount2 blocks the email estimate button (default: true — same-day discount is in-person only)
  const discount2BlocksEmail = config.settings?.discount2_blocks_email !== "0";

  // Compute discount values (applied off the grand total)
  const discountValue = discountApplied && discountEnabled
    ? discountType === "percent"
      ? breakdown.grandTotal * (discountAmount / 100)
      : discountAmount
    : 0;

  const discount2Value = discount2Applied && discount2Enabled
    ? discount2Type === "percent"
      ? breakdown.grandTotal * (discount2Amount / 100)
      : discount2Amount
    : 0;

  // ─── Frost Footing Auto-Calculation ────────────────────────────────────────
  // Only runs when framing is active and snow load has been calculated
  const frostFootingEnabled = !!(framingStructural && framingStructural.snowLoadPsf != null && framingStructural.joistSpanFt && framingStructural.postSpacingFt);
  const { data: frostFootingResult } = trpc.frostFooting.calculate.useQuery(
    {
      joistLengthFt: framingStructural?.joistSpanFt ?? 12,
      postSpacingFt: framingStructural?.postSpacingFt ?? 8,
      deckWidthFt: deckWidthFt,
    },
    { enabled: frostFootingEnabled }
  );
  const frostFootingCost = frostFootingEnabled && frostFootingResult ? frostFootingResult.totalCost : 0;

  const finalTotal = breakdown.grandTotal + frostFootingCost - discountValue - discount2Value;
  const finalPricePerSqft = sqft > 0 ? finalTotal / sqft : 0;

  // Enhancify financing: estimate monthly payment using standard amortization
  // Default assumptions: 12.4% APR, 5-year term (matches Enhancify widget defaults)
  const [showEnhancifyModal, setShowEnhancifyModal] = useState(false);
  const [includeFinancing, setIncludeFinancing] = useState(true);
  const enhancifyMonthlyPayment = (() => {
    if (finalTotal <= 0) return 0;
    const principal = finalTotal;
    const annualRate = 0.124; // 12.4% APR (Enhancify widget default)
    const monthlyRate = annualRate / 12;
    const numPayments = 60; // 5 years
    if (monthlyRate === 0) return principal / numPayments;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  })();

  const sendEmailMutation = trpc.estimate.sendEmail.useMutation();

  const handleSendEmail = async () => {
    if (!emailName.trim() || !emailAddress.trim() || !emailPhone.trim()) return;
    setEmailStatus("sending");
    setEmailError("");

    try {
      const result = await sendEmailMutation.mutateAsync({
        customerName: emailName.trim(),
        customerEmail: emailAddress.trim(),
        customerPhone: emailPhone.trim(),
        customerAddress: emailStreetAddress.trim(),
        customerCity: emailCity.trim(),
        collectionName: collection.name,
        colorName: color.name,
        colorHex: color.hex,
        sqft,
        laborName: labor.name,
        deliveryName: delivery.name,
        grandTotal: breakdown.grandTotal + frostFootingCost,
        finalTotal,
        pricePerSqft: finalPricePerSqft,
        discountApplied: builderPricingEnabled ? false : discountApplied,
        discountName,
        discountValue: builderPricingEnabled ? 0 : discountValue,
        discount2Applied: builderPricingEnabled ? false : discount2Applied,
        discount2Name,
        discount2Value: builderPricingEnabled ? 0 : discount2Value,
        showPricing,
        showItemized,
        breakdown: {
          materialCost: breakdown.subtotalMaterials,
          laborCost: breakdown.laborCost,
          deliveryCost: breakdown.deliveryCost,
          accessoryCost: breakdown.accessoriesTotal,
          taxAmount: breakdown.taxAmount,
          demoRebuildSubtotal: breakdown.demoRebuild.subtotal,
          rainEscapeSubtotal: breakdown.rainEscape?.subtotal ?? 0,
          steelJacketSubtotal: breakdown.steelJacket?.subtotal ?? 0,
          demoRebuildDetails: breakdown.demoRebuild.details,
          rainEscapeDetails: breakdown.rainEscape?.details ?? [],
          steelJacketDetails: breakdown.steelJacket?.details ?? [],
          accessoryDetails: breakdown.accessoryDetails,
          laborLineItemDetails: breakdown.laborLineItemDetails,
          frostFootingCost,
          frostFootingCornerCount: frostFootingResult?.cornerCount ?? 0,
          frostFootingIntermediateCount: frostFootingResult?.intermediateCount ?? 0,
          frostFootingCornerDiameter: frostFootingResult?.cornerDiameterIn ?? 0,
          frostFootingIntermediateDiameter: frostFootingResult?.intermediateDiameterIn ?? 0,
          builderMaterialDiscount: breakdown.builderMaterialDiscount ?? 0,
          builderLaborDiscount: breakdown.builderLaborDiscount ?? 0,
          postWrapCost: breakdown.postWrapCost ?? 0,
          postWrapMaterialCost: breakdown.postWrapMaterialCost ?? 0,
          postWrapLaborCost: breakdown.postWrapLaborCost ?? 0,
          postWrapOptionName: breakdown.postWrapOptionName ?? '',
          postWrapPostPieces: breakdown.postWrapPostPieces ?? [],
          postWrapBeamPieces: breakdown.postWrapBeamPieces ?? [],
        },
        stairRuns,
        edgeLinearFt,
        wasteFactor,
        includePermit,
        contractText,
        estimateSnapshot,
        origin: window.location.origin,
        assignedUserId: calUser ? (calUser as any).id : undefined,
        repName: calUser ? calUser.name : undefined,
        repEmail: calUser ? calUser.email : undefined,
        repPhone: calUser ? (calUser as any).phone ?? undefined : undefined,
        repTitle: calUser ? (calUser as any).title ?? undefined : undefined,
        includeFinancing,
        monthlyPayment: includeFinancing ? enhancifyMonthlyPayment : undefined,
        moodboardNotes: moodboardNotes || undefined,
        photoSessionKey: photoSessionKey || undefined,
      });

      if (result.success) {
        setEmailStatus("success");
        if (result.signUrl) setEmailSignUrl(result.signUrl);
      } else {
        setEmailStatus("error");
        setEmailError(result.error || "Failed to send email. Please check your SMTP configuration.");
      }
    } catch (err: unknown) {
      setEmailStatus("error");
      setEmailError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailStatus("idle");
    setEmailError("");
    setEmailName("");
    setEmailPhone("");
    setEmailStreetAddress("");
    setEmailCity("");
    setEmailAddress("");
    setEmailSignUrl(undefined);
  };

  return (
    <>
      <div id="estimate-panel" className="bg-white rounded-lg shadow-lg border border-border/60 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-charcoal text-white print:bg-charcoal print:text-white">
          <h3 className="text-lg font-display">Your Project Estimate</h3>
          <p className="text-warm-cream/70 text-xs font-body mt-1">
            {config.settings?.company_name || "Design Your Price"} — {config.settings?.company_location || "Orem, Utah"}
          </p>
        </div>

        {/* Grand total — only shown when pricing is enabled */}
        {showPricing ? (
          <div className="px-5 py-5 bg-gradient-to-br from-canyon/10 to-canyon/5 border-b border-border/40">
            <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">
              Estimated Total
            </p>
            {!builderPricingEnabled && ((discountApplied && discountValue > 0) || (discount2Applied && discount2Value > 0)) ? (
              <>
                <p className="text-lg font-body text-muted-foreground line-through">
                  {formatCurrency(breakdown.grandTotal)}
                </p>
                <p className="text-3xl font-display text-canyon">
                  {formatCurrency(finalTotal)}
                </p>
                {discountApplied && discountValue > 0 && (
                  <p className="text-xs font-body text-green-700 bg-green-50 rounded px-2 py-0.5 inline-block mt-1 mr-1">
                    {discountName}: −{discountType === "percent" ? `${discountAmount}%` : formatCurrency(discountAmount)} (−{formatCurrency(discountValue)})
                  </p>
                )}
                {discount2Applied && discount2Value > 0 && (
                  <p className="text-xs font-body text-green-700 bg-green-50 rounded px-2 py-0.5 inline-block mt-1">
                    {discount2Name}: −{discount2Type === "percent" ? `${discount2Amount}%` : formatCurrency(discount2Amount)} (−{formatCurrency(discount2Value)})
                  </p>
                )}
              </>
            ) : (
              <p className="text-3xl font-display text-charcoal">
                {formatCurrency(finalTotal)}
              </p>
            )}
            <p className="text-sm font-body text-muted-foreground mt-1">
              {formatCurrency(finalPricePerSqft)} per sq ft &middot; {sqft} ft² total
            </p>
            {/* Enhancify financing teaser */}
            {finalTotal > 0 && (
              <button
                onClick={() => setShowEnhancifyModal(true)}
                className="mt-2 flex items-center gap-1.5 text-sm font-body text-[#1C418C] hover:text-[#68BA62] transition-colors group"
              >
                <Zap className="w-3.5 h-3.5 text-[#68BA62]" />
                <span>
                  or payments starting at{" "}
                  <span className="font-semibold underline underline-offset-2 group-hover:no-underline">
                    {formatCurrency(enhancifyMonthlyPayment)}/mo
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">(financing available)</span>
              </button>
            )}
          </div>
        ) : (
          /* Scope of work header — no pricing */
          <div className="px-5 py-4 bg-sandstone/30 border-b border-border/40">
            <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-1">
              Scope of Work
            </p>
            <p className="text-sm font-body text-charcoal font-medium">
              {sqft} ft² · {collection.name} Collection · {color.name}
            </p>
          </div>
        )}

        {/* Config summary */}
        <div className="px-5 py-3 border-b border-border/40 bg-sandstone/20">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded-sm border border-border shrink-0"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-sm font-body font-medium text-charcoal">
              {collection.name} — {color.name}
            </span>
          </div>
          <div className="text-xs font-body text-muted-foreground space-y-0.5">
            <p>{labor.name}{showPricing && labor.pricePerSqft > 0 ? ` ($${labor.pricePerSqft.toFixed(2)}/ft²)` : ""}</p>
            <p>{delivery.name}{showPricing && delivery.price > 0 ? ` ($${delivery.price})` : ""}</p>
            {sqft > 0 && <p>{sqft} ft² total area{wasteFactor > 0 ? ` · ${wasteFactor}% waste factor` : ""}</p>}
            {stairRuns.length > 0 && stairRuns.map((run, i) => (
              <p key={i}>Stair Run {stairRuns.length > 1 ? i + 1 : ""}: {run.stairTreads} treads × {run.stairLength} ft{run.stairTreads > 10 ? " (center support included)" : ""}</p>
            ))}
            {edgeLinearFt > 0 && <p>Edge finishing: {edgeLinearFt} linear ft</p>}
            {includePermit && <p>Permit assistance included</p>}
          </div>
        </div>

        {/* Scope of work items (always shown when pricing is off; optional when on) */}
        {!showPricing && (
          <div className="px-5 py-4 border-b border-border/40">
            <h4 className="text-xs font-body font-semibold text-charcoal uppercase tracking-wider mb-3">
              Work Included
            </h4>
            <div className="space-y-2 text-sm font-body text-stone-dark">
              <ScopeItem label="Tanzite Stone Decking" detail={`${sqft} ft² ${collection.name} — ${color.name}`} />
              {edgeLinearFt > 0 && <ScopeItem label="Edge Finishing" detail={`${edgeLinearFt} linear ft`} />}
              {stairRuns.map((run, i) => (
                <ScopeItem key={i} label={stairRuns.length > 1 ? `Stair Run ${i + 1}` : "Stair Installation"} detail={`${run.stairTreads} treads × ${run.stairLength} ft`} />
              ))}
              {stairRuns.some(r => r.stairTreads > 10) && <ScopeItem label="  — Center Support (>10 treads)" detail="Doubled 2×12 + 2×4×4 posts + 2 footings" />}
              {labor.name && <ScopeItem label="Installation Labor" detail={labor.name} />}
              {delivery.name && <ScopeItem label="Delivery" detail={delivery.name} />}
              {includePermit && <ScopeItem label="Permit Assistance" detail="" />}
              {breakdown.demoRebuild.subtotal > 0 && (
                <>
                  <div className="pt-1 pb-0.5 border-t border-border/30">
                    <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">Demo & Rebuild</span>
                  </div>
                  {breakdown.demoRebuild.details.map(item => (
                    <ScopeItem key={item.name} label={item.name} detail="" />
                  ))}
                </>
              )}
              {breakdown.rainEscape?.subtotal > 0 && (
                <>
                  <div className="pt-1 pb-0.5 border-t border-border/30">
                    <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">Waterproof Under-Deck System</span>
                  </div>
                  {breakdown.rainEscape.details.map(item => (
                    <ScopeItem key={item.name} label={item.name} detail="" />
                  ))}
                </>
              )}
              {(breakdown.steelJacket?.subtotal ?? 0) > 0 && (
                <div className="pt-1 pb-0.5 border-t border-border/30">
                  <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">A Steel Jacket</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed pricing breakdown — only shown when admin enables itemized pricing AND show_pricing is on */}
        {showPricing && showItemized ? (
          <div className="px-5 py-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-sm font-body font-semibold text-charcoal mb-2 print:hidden"
            >
              <span>Cost Breakdown</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {(showDetails || true) && (
              <div className={`space-y-0 text-sm font-body custom-scrollbar max-h-[340px] overflow-y-auto print:max-h-none print:overflow-visible ${!showDetails ? "print:block hidden" : ""}`}>
                <LineItem
                  label={`Materials (${sqft} ft² + ${wasteFactor}% waste)`}
                  value={breakdown.subtotalMaterials}
                />
                {breakdown.accessoryDetails.length > 0 && (
                  <>
                    <LineItem label="Accessories & Extras" value={breakdown.accessoriesTotal} />
                    {breakdown.accessoryDetails.map(acc => (
                      <LineItem key={acc.name} label={`  — ${acc.name}`} value={acc.cost} muted />
                    ))}
                  </>
                )}
                {breakdown.laborCost > 0 && (
                  <>
                    <LineItem label="Installation Labor" value={breakdown.laborCost} />
                    {breakdown.laborLineItemDetails.map(li => (
                      <LineItem key={li.name} label={`  — ${li.name}`} value={li.cost} muted />
                    ))}
                  </>
                )}
                {breakdown.deliveryCost > 0 && (
                  <LineItem label="Delivery" value={breakdown.deliveryCost} />
                )}
                {breakdown.permitCost > 0 && (
                  <LineItem label="Permit Assistance" value={breakdown.permitCost} />
                )}
                {breakdown.taxAmount > 0 && (
                  <LineItem
                    label={`Sales Tax (${(breakdown.taxRate * 100).toFixed(2)}% on materials)`}
                    value={breakdown.taxAmount}
                    muted
                  />
                )}
                {breakdown.demoRebuild.subtotal > 0 && (
                  <>
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <LineItem label="Demo & Rebuild" value={breakdown.demoRebuild.subtotal} bold />
                    </div>
                    {breakdown.demoRebuild.details.map(item => (
                      <LineItem key={item.name} label={`  — ${item.name}`} value={item.cost} muted />
                    ))}
                  </>
                )}
              {breakdown.rainEscape?.subtotal > 0 && (
                <>
                  <div className="border-t border-border/30 mt-1 pt-1">
                    <LineItem label="Waterproof Under-Deck System" value={breakdown.rainEscape.subtotal} bold />
                  </div>
                  {breakdown.rainEscape.details.map(item => (
                    <LineItem key={item.name} label={`  — ${item.name}`} value={item.cost} muted />
                  ))}
                </>
              )}
              {(breakdown.steelJacket?.subtotal ?? 0) > 0 && (
                <div className="border-t border-border/30 mt-1 pt-1">
                  <LineItem label="A Steel Jacket" value={breakdown.steelJacket.subtotal} bold />
                </div>
              )}
              {(breakdown.railing?.subtotal ?? 0) > 0 && (
                  <>
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <LineItem label={`Railing System — ${breakdown.railing.railingName}`} value={breakdown.railing.subtotal} bold />
                    </div>
                    <LineItem label={`  — Deck edge (${breakdown.railing.deckEdgeLf} LF)`} value={breakdown.railing.deckEdgeLf * breakdown.railing.pricePerLf} muted />
                    {breakdown.railing.stairLf > 0 && (
                      <LineItem label={`  — Stair railing (${breakdown.railing.stairLf} LF)`} value={breakdown.railing.stairLf * breakdown.railing.pricePerLf} muted />
                    )}
                  </>
                )}
                {(breakdown.handrailRemovalCost ?? 0) > 0 && (
                  <>
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <LineItem label="Handrail Removal & Reset" value={breakdown.handrailRemovalCost} bold />
                    </div>
                    <LineItem label="  — $15/LF (no markup)" value={breakdown.handrailRemovalCost} muted />
                  </>
                )}
                {frostFootingCost > 0 && frostFootingResult && (
                  <>
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <LineItem label="Frost Footings (Auto)" value={frostFootingCost} bold />
                    </div>
                    <LineItem label={`  — ${frostFootingResult.cornerCount} Corner Footings (${frostFootingResult.cornerDiameterIn}"⌀)`} value={frostFootingResult.cornerTotal} muted />
                    {frostFootingResult.intermediateCount > 0 && (
                      <LineItem label={`  — ${frostFootingResult.intermediateCount} Intermediate Footings (${frostFootingResult.intermediateDiameterIn}"⌀)`} value={frostFootingResult.intermediateTotal} muted />
                    )}
                  </>
                )}
                {!builderPricingEnabled && discountApplied && discountValue > 0 && (
                  <LineItem label={discountName} value={-discountValue} discount />
                )}
                {!builderPricingEnabled && discount2Applied && discount2Value > 0 && (
                  <LineItem label={discount2Name} value={-discount2Value} discount />
                )}
                {((breakdown.builderMaterialDiscount ?? 0) > 0 || (breakdown.builderLaborDiscount ?? 0) > 0) && (
                  <BuilderPricingCollapsible
                    materialDiscount={breakdown.builderMaterialDiscount ?? 0}
                    laborDiscount={breakdown.builderLaborDiscount ?? 0}
                    variant="detailed"
                  />
                )}
                {(breakdown.designPackageCost ?? 0) > 0 && (
                  <>
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <LineItem label="Design Package" value={breakdown.designPackageCost} bold />
                    </div>
                    {(breakdown.designPackageLineItems ?? []).map(item => (
                      <LineItem key={item.id} label={`  — ${item.name}`} value={item.sellPrice} muted />
                    ))}
                  </>
                )}
                <div className="border-t border-border/40 mt-2 pt-2">
                  <LineItem label="Grand Total" value={finalTotal} bold />
                </div>
              </div>
            )}
          </div>
        ) : showPricing ? (
          <div className="px-5 py-4">
            <div className="space-y-2 text-sm font-body">
              {breakdown.laborCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installation Labor</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.laborCost)}</span>
                </div>
              )}
              {breakdown.demoRebuild.subtotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Demo & Rebuild</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.demoRebuild.subtotal)}</span>
                </div>
              )}
              {breakdown.rainEscape?.subtotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waterproof Under-Deck</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.rainEscape.subtotal)}</span>
                </div>
              )}
              {(breakdown.steelJacket?.subtotal ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">A Steel Jacket</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.steelJacket.subtotal)}</span>
                </div>
              )}
              {(breakdown.railing?.subtotal ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Railing System</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.railing.subtotal)}</span>
                </div>
              )}
              {(breakdown.handrailRemovalCost ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Handrail Removal & Reset</span>
                  <span className="text-charcoal">{formatCurrency(breakdown.handrailRemovalCost)}</span>
                </div>
              )}
              {frostFootingCost > 0 && frostFootingResult && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frost Footings ({frostFootingResult.cornerCount + frostFootingResult.intermediateCount} total)</span>
                  <span className="text-charcoal">{formatCurrency(frostFootingCost)}</span>
                </div>
              )}
              {!builderPricingEnabled && discountApplied && discountValue > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>{discountName}</span>
                  <span>−{formatCurrency(discountValue)}</span>
                </div>
              )}
              {!builderPricingEnabled && discount2Applied && discount2Value > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>{discount2Name}</span>
                  <span>−{formatCurrency(discount2Value)}</span>
                </div>
              )}
              {((breakdown.builderMaterialDiscount ?? 0) > 0 || (breakdown.builderLaborDiscount ?? 0) > 0) && (
                <BuilderPricingCollapsible
                  materialDiscount={breakdown.builderMaterialDiscount ?? 0}
                  laborDiscount={breakdown.builderLaborDiscount ?? 0}
                  variant="simple"
                />
              )}
              <div className="border-t border-border/40 pt-2 flex justify-between font-semibold text-charcoal">
                <span>Grand Total</span>
                <span className="text-base">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Structural Lumber Package Callout */}
        {framingStructural && framingStructural.snowLoadPsf != null && lumberItems.length > 0 && (
          <div className="px-5 pb-4">
            <LumberPackageCallout
              framingStructural={framingStructural}
              lumberItems={lumberItems}
              deckWidthFt={deckWidthFt}
              deckLengthFt={deckLengthFt}
              showPricing={showPricing}
              hotTubEnabled={hotTub?.enabled}
              hotTubPersonSize={hotTub?.personSize}
              liftThreshold1DepthIn={liftThreshold1DepthIn}
              liftThreshold2DepthIn={liftThreshold2DepthIn}
              liftCost1={liftCost1}
              liftCost2={liftCost2}
            />
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-border/40 space-y-2 print:hidden">
          {/* Discount button 1 — only shown when admin enables it, hidden when builder pricing is on */}
          {discountEnabled && !builderPricingEnabled && (
            <button
              onClick={() => setDiscountApplied(!discountApplied)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
                discountApplied
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              }`}
            >
              <Tag className="w-4 h-4" />
              {discountApplied
                ? `${discountName} Applied ✓`
                : `Apply ${discountName}`}
            </button>
          )}
          {/* Discount button 2 — only shown when admin enables it, hidden when builder pricing is on */}
          {discount2Enabled && !builderPricingEnabled && (
            <button
              onClick={() => setDiscount2Applied(!discount2Applied)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors ${
                discount2Applied
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <Tag className="w-4 h-4" />
              {discount2Applied
                ? `${discount2Name} Applied ✓`
                : `Apply ${discount2Name}`}
            </button>
          )}
          {/* Builder Discount button — shown in place of Early Bird / Same Day when builder mode is active */}
          {builderPricingEnabled && (
            <div className="space-y-1.5">
              <button
                onClick={onBuilderToggle}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-md font-body font-semibold text-sm transition-colors bg-amber-600 text-white hover:bg-amber-700"
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Builder Pricing Applied ✓
                </span>
                <span className="text-xs font-normal opacity-90">
                  −{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
                    (breakdown.builderMaterialDiscount ?? 0) + (breakdown.builderLaborDiscount ?? 0)
                  )}
                </span>
              </button>
              <div className="flex gap-2 text-[11px] text-amber-700 font-body px-1">
                <span className="flex-1 text-center bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Materials −10% (−{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(breakdown.builderMaterialDiscount ?? 0)})
                </span>
                <span className="flex-1 text-center bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Labor −15% (−{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(breakdown.builderLaborDiscount ?? 0)})
                </span>
              </div>
            </div>
          )}
          {/* Order Material button */}
          <button
            onClick={() => setShowOrderModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-green-700 text-white font-body font-semibold text-sm hover:bg-green-800 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Order Material
          </button>
          {/* Email Estimate button — blocked when same-day discount is active (not applicable in builder mode) */}
          {!builderPricingEnabled && discount2Applied && discount2Enabled && discount2BlocksEmail ? (
            <div className="w-full flex flex-col items-center gap-1">
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue/40 text-white/60 font-body font-semibold text-sm cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                Email Estimate
              </button>
              <p className="text-[11px] text-amber-700 font-body text-center px-1">
                Remove the {discount2Name} before emailing — this discount is for in-person presentations only.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowEmailDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue text-white font-body font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              Email Estimate
            </button>
          )}
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border text-muted-foreground font-body text-sm hover:bg-sandstone/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Calculator
          </button>
        </div>

        {/* Disclaimer */}
        <div className="px-5 py-3 bg-sandstone/30 border-t border-border/40">
          <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
            {config.settings?.estimate_disclaimer ||
              "* This estimate is for informational purposes only and does not constitute a binding quote. Final pricing may vary based on site conditions, material availability, and project complexity."}
            {showPricing && " Sales tax applied to materials only."} Contact {config.settings?.company_name || "Design Your Price"} for a detailed proposal.
          </p>
        </div>
      </div>

      {/* Email Estimate Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-border/60 overflow-hidden">
            {/* Dialog Header */}
            <div className="px-6 py-4 bg-charcoal text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <h3 className="font-display text-lg">Email Estimate</h3>
              </div>
              <button
                onClick={handleCloseEmailDialog}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="px-6 py-5">
              {emailStatus === "success" ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                  <p className="font-display text-xl text-charcoal mb-1">Estimate Sent!</p>
                  <p className="text-sm text-muted-foreground">
                    Emailed to <strong>{emailAddress}</strong>. The email includes a
                    <strong> Review &amp; Sign Contract</strong> button so they can sign and pay their deposit directly from their inbox.
                  </p>
                  {emailSignUrl && (
                    <div className="mt-4 p-4 bg-amber-50 border border-canyon/30 rounded-lg text-left">
                      <p className="text-xs font-medium text-charcoal mb-2">Share the signing link directly:</p>
                      <a
                        href={emailSignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-canyon text-white font-body font-semibold text-sm hover:bg-canyon/90 transition-colors w-full justify-center"
                      >
                        ✍ Open Signing Page
                      </a>
                      <button
                        onClick={() => { navigator.clipboard.writeText(emailSignUrl); }}
                        className="mt-2 text-xs text-canyon hover:underline w-full text-center"
                      >
                        Copy link to clipboard
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">Link valid for 30 days</p>
                    </div>
                  )}
                  <button
                    onClick={handleCloseEmailDialog}
                    className="mt-4 px-6 py-2 rounded-md border border-border text-charcoal font-body font-semibold text-sm hover:bg-stone-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {calUser && (
                    <div className="mb-4 p-3 bg-canyon/5 border border-canyon/20 rounded-md">
                      <p className="text-xs font-medium text-canyon mb-0.5">Sending as</p>
                      <p className="text-sm font-semibold text-charcoal">{calUser.name}</p>
                      <p className="text-xs text-muted-foreground">{calUser.email}</p>
                      {(calUser as any).phone && <p className="text-xs text-muted-foreground">{(calUser as any).phone}</p>}
                      {(calUser as any).title && <p className="text-xs text-muted-foreground italic">{(calUser as any).title}</p>}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-5">
                    Enter the customer's contact details to send them a copy of this estimate.
                  </p>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-body font-medium text-charcoal mb-1">
                        Full Name <span className="text-canyon">*</span>
                      </label>
                      <input
                        type="text"
                        value={emailName}
                        onChange={e => setEmailName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-3 py-2 rounded-md border border-border text-sm font-body bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/40 focus:border-canyon"
                        disabled={emailStatus === "sending"}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-body font-medium text-charcoal mb-1">
                        Phone Number <span className="text-canyon">*</span>
                      </label>
                      <input
                        type="tel"
                        value={emailPhone}
                        onChange={e => setEmailPhone(e.target.value)}
                        placeholder="(801) 555-1234"
                        className="w-full px-3 py-2 rounded-md border border-border text-sm font-body bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/40 focus:border-canyon"
                        disabled={emailStatus === "sending"}
                      />
                    </div>

                    {/* Street Address */}
                    <div>
                      <label className="block text-sm font-body font-medium text-charcoal mb-1">
                        Project Address
                      </label>
                      <input
                        type="text"
                        value={emailStreetAddress}
                        onChange={e => setEmailStreetAddress(e.target.value)}
                        placeholder="123 Main St"
                        className="w-full px-3 py-2 rounded-md border border-border text-sm font-body bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/40 focus:border-canyon"
                        disabled={emailStatus === "sending"}
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-body font-medium text-charcoal mb-1">
                        City <span className="text-canyon">*</span>
                      </label>
                      <input
                        type="text"
                        value={emailCity}
                        onChange={e => setEmailCity(e.target.value)}
                        placeholder="Orem"
                        className="w-full px-3 py-2 rounded-md border border-border text-sm font-body bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/40 focus:border-canyon"
                        disabled={emailStatus === "sending"}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-body font-medium text-charcoal mb-1">
                        Email Address <span className="text-canyon">*</span>
                      </label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={e => setEmailAddress(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full px-3 py-2 rounded-md border border-border text-sm font-body bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-canyon/40 focus:border-canyon"
                        disabled={emailStatus === "sending"}
                        onKeyDown={e => {
                          if (e.key === "Enter" && emailName && emailPhone && emailAddress) handleSendEmail();
                        }}
                      />
                    </div>
                  </div>

                  {/* Financing badge toggle */}
                  {finalTotal > 0 && enhancifyMonthlyPayment > 0 && (
                    <div className="mt-4 p-3 bg-[#f0f7f0] border border-[#68BA62]/40 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeFinancing}
                          onChange={e => setIncludeFinancing(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#68BA62]"
                          disabled={emailStatus === "sending"}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#1C418C]">
                            Include Financing Info
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Add a badge showing {formatCurrency(enhancifyMonthlyPayment)}/mo (12.4% APR, 60 months) to the email
                          </p>
                        </div>
                        <Zap className="w-4 h-4 text-[#68BA62] shrink-0" />
                      </label>
                    </div>
                  )}

                  {emailStatus === "error" && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700">{emailError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleCloseEmailDialog}
                      className="flex-1 px-4 py-2.5 rounded-md border border-border text-muted-foreground font-body text-sm hover:bg-sandstone/50 transition-colors"
                      disabled={emailStatus === "sending"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={!emailName.trim() || !emailPhone.trim() || !emailCity.trim() || !emailAddress.trim() || emailStatus === "sending"}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-slate-blue text-white font-body font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {emailStatus === "sending" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Estimate
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Material Modal */}
      <OrderMaterialModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        breakdown={breakdown}
        sqft={sqft}
        productType={collection?.id || "tanzite"}
        collectionName={collection?.name || "Stone"}
        config={config}
        finalTotal={finalTotal}
        discountApplied={builderPricingEnabled ? false : discountApplied}
        discountName={discountName}
        discountValue={builderPricingEnabled ? 0 : discountValue}
        discount2Applied={builderPricingEnabled ? false : discount2Applied}
        discount2Name={discount2Name}
        discount2Value={builderPricingEnabled ? 0 : discount2Value}
      />

      {/* Enhancify Financing Modal */}
      {showEnhancifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEnhancifyModal(false); }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-[#1C418C]">Apply for Financing</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Estimated project cost: <span className="font-medium text-gray-700">{formatCurrency(finalTotal)}</span>
                  {" "}·{" "}
                  Payments starting at <span className="font-medium text-[#1C418C]">{formatCurrency(enhancifyMonthlyPayment)}/mo</span>
                </p>
              </div>
              <button
                onClick={() => setShowEnhancifyModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Enhancify Widget */}
            <div className="px-6 py-6">
              <EnhancifyWidget />
            </div>
            {/* Footer disclaimer */}
            <div className="px-6 pb-5">
              <p className="text-xs text-gray-400 text-center">
                Financing is provided by Enhancify. Rates and terms are subject to credit approval.
                The monthly payment shown is an estimate based on a 12.4% APR over 60 months.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LineItem({
  label,
  value,
  bold,
  muted,
  discount,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
  discount?: boolean;
}) {
  return (
    <div className="flex justify-between py-1">
      <span
        className={
          discount
            ? "text-green-700 font-medium"
            : bold
              ? "font-semibold text-charcoal"
              : muted
                ? "text-muted-foreground text-xs"
                : "text-stone-dark"
        }
      >
        {label}
      </span>
      <span
        className={
          discount
            ? "text-green-700 font-medium"
            : bold
              ? "font-semibold text-charcoal"
              : muted
                ? "text-muted-foreground text-xs"
                : "text-charcoal"
        }
      >
        {discount && value < 0 ? `−${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </span>
    </div>
  );
}

function ScopeItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-canyon mt-0.5 shrink-0">✓</span>
      <span className="text-stone-dark">
        {label}
        {detail && <span className="text-muted-foreground ml-1">— {detail}</span>}
      </span>
    </div>
  );
}

/** Collapsible builder pricing breakdown — shows total savings with optional detail expansion */
function BuilderPricingCollapsible({
  materialDiscount,
  laborDiscount,
  variant,
}: {
  materialDiscount: number;
  laborDiscount: number;
  variant: "detailed" | "simple";
}) {
  const [open, setOpen] = useState(false);
  const total = materialDiscount + laborDiscount;

  if (variant === "detailed") {
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between text-sm py-0.5 group"
        >
          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            Builder Pricing Discount
          </span>
          <span className="text-green-700 font-medium">−{formatCurrency(total)}</span>
        </button>
        {open && (
          <div className="pl-5 space-y-0.5 pb-1">
            {materialDiscount > 0 && (
              <LineItem label="Materials (15% off)" value={-materialDiscount} discount />
            )}
            {laborDiscount > 0 && (
              <LineItem label="Labor (10% off)" value={-laborDiscount} discount />
            )}
          </div>
        )}
      </div>
    );
  }

  // simple variant
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-sm py-0.5"
      >
        <span className="flex items-center gap-1.5 text-amber-700 font-medium">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          Builder Pricing Discount
        </span>
        <span className="text-amber-700">−{formatCurrency(total)}</span>
      </button>
      {open && (
        <div className="pl-5 space-y-0.5 pb-1 text-sm">
          {materialDiscount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Materials (15% off)</span>
              <span>−{formatCurrency(materialDiscount)}</span>
            </div>
          )}
          {laborDiscount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Labor (10% off)</span>
              <span>−{formatCurrency(laborDiscount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
