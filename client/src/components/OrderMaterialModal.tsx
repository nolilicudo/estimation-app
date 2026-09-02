/**
 * OrderMaterialModal
 * Multi-step flow:
 *   Step 1: Customer info (name, email, phone, address)
 *   Step 2: Review estimate + read contract
 *   Step 3: Sign contract (typed name + checkbox)
 *   Step 4: Stripe 50% deposit checkout (opens in new tab)
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, CheckCircle, Loader2, ArrowLeft, ArrowRight, FileText, CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { CostBreakdown } from "@/hooks/useCalculator";
import type { SiteConfig } from "@/hooks/useConfig";
import { ProjectDetailsMultiSelect } from "@/components/ProjectDetailsMultiSelect";

interface OrderMaterialModalProps {
  open: boolean;
  onClose: () => void;
  breakdown: CostBreakdown;
  sqft: number;
  productType: string;
  collectionName: string;
  config: SiteConfig;
  // Post-discount totals passed from CostSummary
  finalTotal: number;
  discountApplied: boolean;
  discountName: string;
  discountValue: number;
  discount2Applied: boolean;
  discount2Name: string;
  discount2Value: number;
  /** Optional: if provided, fetch the contract template with this serviceType from the DB */
  contractServiceType?: string;
  /** Optional: override the dialog title */
  dialogTitle?: string;
  /** Optional: override the estimate description line (replaces Product/Area rows) */
  estimateDescription?: string;
  /** When true: full price billed at signing (no deposit/balance split), hides materials/labor breakdown */
  isDesignPackage?: boolean;
  /**
   * Optional: Jobtread project creation params.
   * When provided, a Jobtread project is automatically created after the customer signs.
   */
  jobtreadParams?: {
    projectDescription: string;
    budgetLineItemName: string;
    /** Name for the cost group (budget section header) — project type label */
    costGroupName?: string;
    scopeOfWork: string;
    contractText: string;
    totalAmount: number;
    customerCity?: string;
    /** Individual service line items for the Jobtread budget tab */
    services?: Array<{ name: string; amount: number; detail?: string; scopeOfWork?: string }>;
    /** Sales rep name ("Prepared By" on proposal) */
    salesRepName?: string;
    /** Sales rep email ("Prepared By" on proposal) */
    salesRepEmail?: string;
    /** Sales rep phone ("Prepared By" on proposal) */
    salesRepPhone?: string;
    /** Company office address ("Prepared By" on proposal) */
    companyAddress?: string;
  };
}

const STEPS = ["Your Info", "Review Estimate", "Sign Contract", "Pay in Full"];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * Applies {placeholder} tokens from the admin-editable contract template.
 * Supported tokens: {customerName}, {collectionName}, {sqft}, {grandTotal}, {depositAmount}, {balanceAmount}
 */
function applyContractTemplate(
  template: string,
  customerName: string,
  collectionName: string,
  sqft: number,
  grandTotal: number,
  depositAmount: number,
  balanceAmount: number
): string {
  return template
    .replace(/\{customerName\}/g, customerName || "[Customer Name]")
    .replace(/\{collectionName\}/g, collectionName || "Tanzite Stone Decking")
    .replace(/\{sqft\}/g, String(sqft))
    .replace(/\{grandTotal\}/g, formatCurrency(grandTotal))
    .replace(/\{depositAmount\}/g, formatCurrency(depositAmount))
    .replace(/\{balanceAmount\}/g, formatCurrency(balanceAmount));
}

const DEFAULT_CONTRACT_TEMPLATE = `MATERIAL PURCHASE AGREEMENT

This Material Purchase Agreement ("Agreement") is entered into as of the date signed below between Design Your Price ("Seller") and {customerName} ("Buyer").

PROJECT DETAILS
Product: {collectionName}
Estimated Area: {sqft} sq ft
Total Estimate: {grandTotal}

PAYMENT TERMS
A deposit of {depositAmount} is due upon signing this agreement to confirm your order and reserve your materials.

IMPORTANT: No work, material sourcing, or project scheduling will begin until the full deposit of {depositAmount} has been received and cleared.

The remaining balance of {balanceAmount} is due upon delivery of materials to your project site.

CANCELLATION POLICY
Orders cancelled within 48 hours of signing will receive a full refund of the deposit. Cancellations after 48 hours are subject to a 20% restocking fee.

ESTIMATE DISCLAIMER
This estimate is based on the dimensions and options provided through the online calculator. Final pricing may vary based on on-site measurements and conditions. Any changes to the scope of work will be documented in a written change order.

MATERIAL DELIVERY
Delivery timelines will be communicated after order confirmation. Design Your Price is not responsible for delays caused by supply chain disruptions, weather, or other factors outside our control.

By signing below, Buyer acknowledges that they have read and agree to the terms of this Agreement.`;

export function OrderMaterialModal({
  open,
  onClose,
  breakdown,
  sqft,
  productType,
  collectionName,
  config,
  finalTotal,
  discountApplied,
  discountName,
  discountValue,
  discount2Applied,
  discount2Name,
  discount2Value,
  contractServiceType,
  dialogTitle,
  estimateDescription,
  isDesignPackage = false,
  jobtreadParams,
}: OrderMaterialModalProps) {
  const [step, setStep] = useState(0);

  // Step 1: Customer info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedDetailIds, setSelectedDetailIds] = useState<number[]>([]);

  // Step 3: Signature
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Deposit controls (shown on Step 1 — Review Estimate)
  const [depositType, setDepositType] = useState<"percent" | "flat">("percent");
  const [depositPct, setDepositPct] = useState(50);
  const [depositFlat, setDepositFlat] = useState<number | "">("");

  // Use finalTotal (post-discount) as the base for deposit/balance calculations
  const grandTotal = finalTotal;
  // Design packages are billed in full at signing — no deposit/balance split
  const depositAmount = isDesignPackage
    ? grandTotal
    : (() => {
        if (depositType === "percent") {
          return Math.round(grandTotal * (depositPct / 100) * 100) / 100;
        }
        const flat = typeof depositFlat === "number" ? depositFlat : 0;
        return Math.min(Math.max(flat, 0), grandTotal);
      })();
  const balanceAmount = isDesignPackage ? 0 : Math.round((grandTotal - depositAmount) * 100) / 100;

  // Fetch contract template by serviceType if provided, otherwise use config.settings.contract_text
  const { data: serviceTypeTemplate } = trpc.contractTemplates.getByServiceType.useQuery(
    { serviceType: contractServiceType! },
    { enabled: !!contractServiceType }
  );
  const contractTemplate = serviceTypeTemplate?.contractText ||
    config.settings?.contract_text ||
    DEFAULT_CONTRACT_TEMPLATE;
  const contractText = applyContractTemplate(
    contractTemplate,
    name,
    collectionName,
    sqft,
    grandTotal,
    depositAmount,
    balanceAmount
  );

  const createJobtreadProject = trpc.estimate.createJobtreadProject.useMutation();
  const [jobtreadJobId, setJobtreadJobId] = useState<string | null>(null);
  const [jobtreadError, setJobtreadError] = useState<string | null>(null);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      setCheckoutUrl(data.checkoutUrl);
      setStep(3);
    },
    onError: (err) => {
      toast.error("Failed to create order. Please try again.");
      console.error(err);
    },
  });

  function handleClose() {
    setStep(0);
    setName(""); setEmail(""); setPhone(""); setAddress("");
    setSignedName(""); setAgreed(false);
    setCheckoutUrl(null);
    setDepositType("percent");
    setDepositPct(50);
    setDepositFlat("");
    setSelectedDetailIds([]);
    setJobtreadJobId(null);
    setJobtreadError(null);
    onClose();
  }

  async function handleSign() {
    if (!signedName.trim() || !agreed) return;
    // Build selected detail labels for the order notes
    const selectedDetailLabels = (config.projectDetailOptions || [])
      .filter(o => selectedDetailIds.includes(o.id))
      .map(o => o.label)
      .join(", ");

    // Fire Jobtread project creation in parallel with the Stripe order
    if (jobtreadParams) {
      createJobtreadProject.mutate({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        customerAddress: address.trim() || undefined,
        customerCity: jobtreadParams.customerCity || undefined,
        projectDescription: jobtreadParams.projectDescription,
        totalAmount: jobtreadParams.totalAmount,
        scopeOfWork: jobtreadParams.scopeOfWork,
        contractText: jobtreadParams.contractText,
        budgetLineItemName: jobtreadParams.budgetLineItemName,
        costGroupName: jobtreadParams.costGroupName || undefined,
        services: jobtreadParams.services || undefined,
        salesRepName: jobtreadParams.salesRepName || undefined,
        salesRepEmail: jobtreadParams.salesRepEmail || undefined,
        salesRepPhone: jobtreadParams.salesRepPhone || undefined,
        companyAddress: jobtreadParams.companyAddress || undefined,
      }, {
        onSuccess: (result) => {
          if (result.success) {
            setJobtreadJobId(result.jobId || null);
            toast.success("Project created in Jobtread and sent to client.");
          } else {
            setJobtreadError(result.error || "Jobtread project creation failed.");
            toast.error(`Jobtread: ${result.error || "Failed to create project."}`);
          }
        },
        onError: (err) => {
          setJobtreadError(err.message);
          toast.error(`Jobtread error: ${err.message}`);
        },
      });
    }

    createOrder.mutate({
      customerName: name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim() || undefined,
      customerAddress: address.trim() || undefined,
      estimateSnapshot: JSON.stringify(breakdown),
      productType,
      collectionName,
      sqft,
      grandTotal,
      depositAmount,
      signedName: signedName.trim(),
      contractText,
      origin: window.location.origin,
      projectDetails: selectedDetailLabels || undefined,
    });
  }

  function openCheckout() {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  }

  const stepValid = [
    name.trim().length > 0 && email.trim().length > 0,
    true,
    signedName.trim().length > 0 && agreed,
    true,
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-canyon/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-canyon" />
            </div>
            <DialogTitle className="text-xl">{dialogTitle || "Place Your Material Order"}</DialogTitle>
          </div>
          <DialogDescription>
            {isDesignPackage
              ? "Complete the steps below to sign your agreement and pay in full."
              : "Complete the steps below to sign your agreement and pay the 50% deposit."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 my-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                i < step ? "bg-green-500 text-white" :
                i === step ? "bg-canyon text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-charcoal font-medium" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 0: Customer Info */}
        {step === 0 && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="order-name">Full Name *</Label>
                <Input id="order-name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-email">Email Address *</Label>
                <Input id="order-email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-phone">Phone Number</Label>
                <Input id="order-phone" type="tel" placeholder="(801) 555-0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-address">Project Address</Label>
                <Input id="order-address" placeholder="123 Main St, Orem, UT" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            {config.projectDetailOptions && config.projectDetailOptions.filter(o => o.isActive === 1).length > 0 && (
              <div className="space-y-1.5">
                <Label>Project Details</Label>
                <ProjectDetailsMultiSelect
                  options={config.projectDetailOptions}
                  selected={selectedDetailIds}
                  onChange={setSelectedDetailIds}
                  placeholder="Select applicable details…"
                />
                <p className="text-xs text-muted-foreground">Optional: select any special features or requirements for this project.</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button
                onClick={() => setStep(1)}
                disabled={!stepValid[0]}
                className="flex-1 bg-canyon hover:bg-canyon/90 text-white"
              >
                Next: Review Estimate <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Review Estimate */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <h4 className="font-semibold text-charcoal flex items-center gap-2">
                <FileText className="w-4 h-4" /> Estimate Summary
              </h4>
              <div className="text-sm space-y-1 font-body">
                {estimateDescription ? (
                  <div className="flex justify-between"><span>Package</span><span className="font-medium">{estimateDescription}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Product</span><span className="font-medium">{collectionName || productType}</span></div>
                    {sqft > 0 && <div className="flex justify-between"><span>Area</span><span className="font-medium">{sqft} sq ft</span></div>}
                  </>
                )}
                {!isDesignPackage && (
                  <>
                    <div className="flex justify-between"><span>Materials</span><span>{formatCurrency(breakdown.subtotalMaterials)}</span></div>
                    <div className="flex justify-between"><span>Labor</span><span>{formatCurrency(breakdown.laborCost)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>{formatCurrency(breakdown.deliveryCost)}</span></div>
                    {breakdown.demoRebuild.subtotal > 0 && (
                      <div className="flex justify-between"><span>Demo & Rebuild</span><span>{formatCurrency(breakdown.demoRebuild.subtotal)}</span></div>
                    )}
                    {breakdown.rainEscape.subtotal > 0 && (
                      <div className="flex justify-between"><span>RainEscape System</span><span>{formatCurrency(breakdown.rainEscape.subtotal)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(breakdown.taxAmount)}</span></div>
                  </>
                )}
                {discountApplied && discountValue > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>{discountName}</span><span>−{formatCurrency(discountValue)}</span>
                  </div>
                )}
                {discount2Applied && discount2Value > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>{discount2Name}</span><span>−{formatCurrency(discount2Value)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                  <span>Total</span><span className="text-canyon">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Deposit adjuster — only for non-design-package orders */}
            {!isDesignPackage && (
              <>
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="font-semibold text-charcoal text-sm">Deposit Amount</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositType("percent")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        depositType === "percent"
                          ? "bg-canyon text-white border-canyon"
                          : "border-border text-muted-foreground hover:bg-sandstone/50"
                      }`}
                    >
                      Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositType("flat")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        depositType === "flat"
                          ? "bg-canyon text-white border-canyon"
                          : "border-border text-muted-foreground hover:bg-sandstone/50"
                      }`}
                    >
                      Flat Amount
                    </button>
                  </div>
                  {depositType === "percent" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={depositPct}
                        onChange={(e) => setDepositPct(Number(e.target.value))}
                        className="flex-1 accent-canyon"
                      />
                      <span className="w-14 text-right font-semibold text-canyon text-sm">{depositPct}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">$</span>
                      <input
                        type="number"
                        min={1}
                        max={grandTotal}
                        step={50}
                        value={depositFlat}
                        onChange={(e) => setDepositFlat(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder={`e.g. ${Math.round(grandTotal * 0.5)}`}
                        className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-canyon/40"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Deposit: <strong className="text-canyon">{formatCurrency(depositAmount)}</strong>
                    {" "}· Balance on delivery: <strong>{formatCurrency(balanceAmount)}</strong>
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-body space-y-1">
                  <p className="font-semibold text-amber-800">Payment Schedule</p>
                  <div className="flex justify-between text-amber-700">
                    <span>Deposit (due now)</span>
                    <span className="font-semibold">{formatCurrency(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Balance (due on delivery)</span>
                    <span className="font-semibold">{formatCurrency(balanceAmount)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Full payment notice for design packages */}
            {isDesignPackage && (
              <div className="rounded-xl border border-canyon/30 bg-canyon/5 p-4 text-sm font-body space-y-1">
                <p className="font-semibold text-canyon">Full Payment Due at Signing</p>
                <p className="text-muted-foreground text-xs">The full project amount of <strong className="text-canyon">{formatCurrency(grandTotal)}</strong> is due upon signing this agreement. No work will commence until payment is received.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1 bg-canyon hover:bg-canyon/90 text-white">
                Next: Sign Contract <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Sign Contract */}
        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border bg-muted/20 p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs font-body whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {contractText}
              </pre>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signed-name">Type Your Full Name to Sign *</Label>
              <Input
                id="signed-name"
                placeholder="Jane Smith"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                className="font-serif italic text-lg"
              />
              <p className="text-xs text-muted-foreground">
                By typing your name, you are providing your electronic signature.
              </p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-canyon"
              />
              <span className="text-sm font-body text-charcoal">
                I have read and agree to the terms of this Material Purchase Agreement, including the payment schedule and cancellation policy.
              </span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleSign}
                disabled={!stepValid[2] || createOrder.isPending}
                className="flex-1 bg-canyon hover:bg-canyon/90 text-white"
              >
                {createOrder.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</>
                ) : (
                  <>Sign & Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Pay in Full */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-charcoal">Agreement Signed!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {isDesignPackage
                  ? <>Your contract has been recorded. Complete your full payment of{" "}<strong className="text-canyon">{formatCurrency(grandTotal)}</strong> to confirm your project.</>
                  : <>Your contract has been recorded. Complete your 50% deposit of{" "}<strong className="text-canyon">{formatCurrency(depositAmount)}</strong> to confirm your order.</>
                }
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-body w-full max-w-sm text-left space-y-1">
              <p className="font-semibold text-amber-800">Payment Summary</p>
              {isDesignPackage ? (
                <div className="flex justify-between text-amber-700">
                  <span>Full Payment Due Now</span>
                  <span className="font-semibold">{formatCurrency(grandTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-amber-700">
                    <span>Deposit Due Now</span>
                    <span className="font-semibold">{formatCurrency(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Balance Due on Delivery</span>
                    <span className="font-semibold">{formatCurrency(balanceAmount)}</span>
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={openCheckout}
              size="lg"
              className="bg-canyon hover:bg-canyon/90 text-white px-8 gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {isDesignPackage ? `Pay ${formatCurrency(grandTotal)} in Full` : `Pay ${formatCurrency(depositAmount)} Deposit`}
            </Button>
            <p className="text-xs text-muted-foreground">
              You'll be redirected to our secure Stripe checkout. Your order is saved — you can return to pay later if needed.
            </p>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close for now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
