/**
 * Initial Consult Tool — "Stay vs. Move" Analysis
 * 8-step guided wizard for Addition price consult mode
 *
 * Steps:
 *  1. Current Home Details (address lookup + manual inputs)
 *  2. Addition Details (sqft, bedrooms, bathrooms, budget)
 *  3. Comparable Homes (CMA from RentCast)
 *  4. Renovation Funding (loan calc, monthly payment)
 *  5. Current Mortgage Rate (Freddie Mac PMMS)
 *  6. Sell & Move Analysis (net proceeds, replacement home)
 *  7. Stay vs. Move Comparison (side-by-side monthly)
 *  8. Long-Term Appreciation (chart)
 *  Results: Summary + Save/Email/PDF/Continue to Design Package
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Home, Building2, BarChart3, DollarSign, TrendingUp,
  ArrowRight, ArrowLeft, Check, Search, Loader2,
  MapPin, Bed, Bath, Ruler, ChevronRight, Star,
  RefreshCw, AlertCircle, Info, RotateCcw, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ConsultHandoffData, CachedConsultState } from "./consultTypes";
import { defaultCachedConsultState } from "./consultTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyData {
  formattedAddress?: string;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  lotSize?: number;
  geocodedFallback?: boolean; // true when RentCast was unavailable and Google Maps geocoder was used
}

interface ComparableHome {
  address: string;
  soldPrice: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  soldDate: string;
  distanceMiles: number;
  score: number;
  pricePerSqft: number;
  yearBuilt?: number;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface FinancialResults {
  renovation: {
    loanAmount?: number;
    monthlyLoanPayment: number;
    totalStayAndBuildMonthly: number;
    existingMonthlyHousing: number;
    addedMonthlyFromRenovation?: number;
  };
  sellMove: {
    netProceedsBeforeClosing: number;
    replacementHomePurchasePrice: number;
    monthlyPI: number;
    totalMonthlyHousingPayment: number;
    realtorFee: number;
    relocationCost: number;
    availableDownPayment: number;
    monthlyTaxes: number;
    monthlyInsurance: number;
    monthlyHOA: number;
    loanAmount: number;
    replacementHomeClosingCosts: number;
    totalTransactionCosts: number;
  };
  appreciation: Array<{
    year: number;
    stayValue: number;
    moveValue: number;
    stayAppreciation: number;
    moveAppreciation: number;
    difference: number;
  }>;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Current Home", icon: Home },
  { id: 2, label: "Addition", icon: Building2 },
  { id: 3, label: "Comparables", icon: BarChart3 },
  { id: 4, label: "Funding", icon: DollarSign },
  { id: 5, label: "Rates", icon: TrendingUp },
  { id: 6, label: "Sell & Move", icon: ArrowRight },
  { id: 7, label: "Comparison", icon: BarChart3 },
  { id: 8, label: "Appreciation", icon: TrendingUp },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function NumericInput({
  label, value, onChange, prefix, suffix, min, max, step, hint, required, locked,
}: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; min?: number; max?: number; step?: number;
  hint?: string; required?: boolean; locked?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className={`text-sm font-medium ${locked ? "text-muted-foreground" : "text-foreground"}`}>
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {locked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Locked
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-muted-foreground text-sm font-medium pointer-events-none">{prefix}</span>
        )}
        <Input
          type="number"
          value={value || ""}
          onChange={e => !locked && onChange(parseFloat(e.target.value) || 0)}
          readOnly={locked}
          min={min}
          max={max}
          step={step ?? 1}
          className={`${prefix ? "pl-7" : ""} ${suffix ? "pr-12" : ""} bg-background border-border ${locked ? "opacity-60 cursor-not-allowed bg-muted/30" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 text-muted-foreground text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Pre-Approval Email Section ─────────────────────────────────────────────
function PreApprovalEmailSection({
  clientName, clientEmail, clientPhone, clientAddress,
}: {
  clientName: string; clientEmail: string; clientPhone: string; clientAddress: string;
}) {
  const [clientGoals, setClientGoals] = useState("");
  const [sent, setSent] = useState(false);
  const sendMutation = trpc.initialConsult.sendPreApprovalEmail.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        setSent(true);
        toast.success("Pre-approval email sent!");
      } else {
        toast.error(res.error ?? "Failed to send email");
      }
    },
    onError: () => toast.error("Failed to send pre-approval email"),
  });

  const canSend = clientName.trim().length > 0 && clientEmail.trim().length > 0;

  return (
    <div className="rounded-2xl border border-canyon/20 bg-gradient-to-br from-warm-cream to-sandstone/40 overflow-hidden shadow-sm">
      {/* Header band */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-canyon/15 bg-canyon/5">
        <div className="w-9 h-9 rounded-xl bg-canyon flex items-center justify-center flex-shrink-0 shadow-sm">
          <Mail className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-charcoal leading-tight">Send Financing Pre-Approval</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            Connects client with O'Donnell Team · CrossCountry Mortgage
          </p>
        </div>
        {sent && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 shrink-0">
            <Check className="w-3 h-3" /> Sent
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3.5">
        {/* Recipient preview */}
        {(clientName || clientEmail) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-white/60 border border-border/40 rounded-lg px-3 py-2">
            {clientName && <span><span className="font-semibold text-charcoal">To:</span> {clientName}</span>}
            {clientEmail && <span><span className="font-semibold text-charcoal">Email:</span> {clientEmail}</span>}
            {clientPhone && <span><span className="font-semibold text-charcoal">Phone:</span> {clientPhone}</span>}
          </div>
        )}

        {/* Goals textarea */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-charcoal/70 uppercase tracking-wide">
            Client Goals <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            value={clientGoals}
            onChange={e => setClientGoals(e.target.value)}
            placeholder="e.g. adding a master suite and updating their kitchen to increase home value"
            rows={2}
            disabled={sent}
            className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-white/80 resize-none focus:outline-none focus:ring-2 focus:ring-canyon/30 focus:border-canyon/50 placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Fills in: <span className="italic">"They are [your text here]."</span> in the lender intro.
          </p>
        </div>

        {/* Missing info warning */}
        {!canSend && (
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>Enter the client's <strong>name</strong> and <strong>email</strong> in the fields above before sending.</span>
          </div>
        )}

        {/* Send button */}
        <Button
          onClick={() => sendMutation.mutate({ clientName, clientEmail, clientPhone, clientAddress, clientGoals })}
          disabled={!canSend || sendMutation.isPending || sent}
          className={`w-full h-10 text-sm font-semibold transition-all shadow-sm ${
            sent
              ? "bg-emerald-600 hover:bg-emerald-600 text-white cursor-default"
              : "bg-canyon hover:bg-canyon/90 text-white"
          }`}
        >
          {sendMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
          ) : sent ? (
            <><Check className="w-4 h-4 mr-2" /> Pre-Approval Email Sent</>
          ) : (
            <><Mail className="w-4 h-4 mr-2" /> Send Pre-Approval Email</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ConsultSettings {
  defaultRealtorFeePct: number;
  defaultRelocationCostPct: number;
  defaultClosingCostPct: number;
  defaultPropertyTaxRatePct: number;
  defaultReplacementInsuranceAnnual: number;
  defaultAppreciationRatePct: number;
  defaultLoanTermYears: number;
  lockRealtorFee: boolean;
  lockRelocationCost: boolean;
  lockClosingCost: boolean;
  lockPropertyTaxRate: boolean;
  lockReplacementInsurance: boolean;
  lockAppreciationRate: boolean;
  lockLoanTerm: boolean;
}

interface InitialConsultToolProps {
  onContinueToDesignPackage?: (data: ConsultHandoffData) => void;
  sessionId?: string;
  /** Cached state to restore when re-mounting after a tab switch */
  initialState?: CachedConsultState;
  /** Called whenever any wizard value changes so the parent can cache it */
  onStateChange?: (state: CachedConsultState) => void;
  /** Called when the user confirms a full reset so the parent can clear its cache */
  onReset?: () => void;
}

export function InitialConsultTool({ onContinueToDesignPackage, sessionId: propSessionId, initialState, onStateChange, onReset }: InitialConsultToolProps) {
  const sessionId = useRef(propSessionId ?? `ic-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const s0 = initialState;

  // ─── Fetch admin-configured financial assumption defaults ─────────────────
  const { data: consultSettings } = trpc.initialConsult.getConsultSettings.useQuery(undefined, {
    staleTime: 0, // always fetch fresh so admin setting changes reflect immediately
  });
  const cs = consultSettings as ConsultSettings | undefined;

  // ─── Step state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(s0?.step ?? 1);
  const [completed, setCompleted] = useState<Set<number>>(new Set(s0?.completed ?? []));

  // ─── Step 1: Current Home ─────────────────────────────────────────────────
  const [addressInput, setAddressInput] = useState(s0?.addressInput ?? "");
  const [propertyData, setPropertyData] = useState<PropertyData | null>(s0?.propertyData ?? null);
  const [homeValue, setHomeValue] = useState(s0?.homeValue ?? 0);
  const [mortgageBalance, setMortgageBalance] = useState(s0?.mortgageBalance ?? 0);
  const [existingMortgagePI, setExistingMortgagePI] = useState(s0?.existingMortgagePI ?? 0);
  const [propertyTaxesMonthly, setPropertyTaxesMonthly] = useState(s0?.propertyTaxesMonthly ?? 0);
  const [insuranceMonthly, setInsuranceMonthly] = useState(s0?.insuranceMonthly ?? 0);
  const [hoaMonthly, setHoaMonthly] = useState(s0?.hoaMonthly ?? 0);
  const [additionalMonthly, setAdditionalMonthly] = useState(s0?.additionalMonthly ?? 0);

  // ─── Step 2: Addition Details ─────────────────────────────────────────────
  const [additionSqft, setAdditionSqft] = useState(s0?.additionSqft ?? 0);
  const [additionBedrooms, setAdditionBedrooms] = useState(s0?.additionBedrooms ?? 0);
  const [additionBathrooms, setAdditionBathrooms] = useState(s0?.additionBathrooms ?? 0);
  const [additionKitchens, setAdditionKitchens] = useState(s0?.additionKitchens ?? 0);
  const [renovationBudget, setRenovationBudget] = useState(s0?.renovationBudget ?? 0);
  const [projectedAfterValue, setProjectedAfterValue] = useState(s0?.projectedAfterValue ?? 0);

  // ─── Step 3: Comparables ──────────────────────────────────────────────────
  const [comparables, setComparables] = useState<ComparableHome[]>(s0?.comparables ?? []);
  const [selectedComps, setSelectedComps] = useState<Set<number>>(new Set(s0?.selectedComps ?? []));
  const [cmaValue, setCmaValue] = useState(s0?.cmaValue ?? 0);
  const [manualCmaOverride, setManualCmaOverride] = useState(s0?.manualCmaOverride ?? false);

  // ─── Step 4: Renovation Funding ───────────────────────────────────────────
  const [cashContribution, setCashContribution] = useState(s0?.cashContribution ?? 0);
  const [loanTermYears, setLoanTermYears] = useState(s0?.loanTermYears ?? 15);

  // ─── Step 5: Mortgage Rate ────────────────────────────────────────────────
  const [mortgageRatePercent, setMortgageRatePercent] = useState(s0?.mortgageRatePercent ?? 7.0);
  const [loanRatePercent, setLoanRatePercent] = useState(s0?.loanRatePercent ?? 7.5);

  // ─── Step 6: Sell & Move ──────────────────────────────────────────────────
  const [realtorFeePct, setRealtorFeePct] = useState(s0?.realtorFeePct ?? 6);
  const [relocationCostPct, setRelocationCostPct] = useState(s0?.relocationCostPct ?? 1);
  const [closingCostPct, setClosingCostPct] = useState(s0?.closingCostPct ?? 2);
  const [propertyTaxRatePct, setPropertyTaxRatePct] = useState(s0?.propertyTaxRatePct ?? 1.2);
  const [replacementInsuranceAnnual, setReplacementInsuranceAnnual] = useState(s0?.replacementInsuranceAnnual ?? 1800);
  const [replacementHoaMonthly, setReplacementHoaMonthly] = useState(s0?.replacementHoaMonthly ?? 0);
  const [appreciationRatePct, setAppreciationRatePct] = useState(s0?.appreciationRatePct ?? 4);

  // ─── Sync Step 6 fields from admin settings ─────────────────────────────
  // Track which fields the rep has manually overridden so we don't clobber them.
  // A field is considered "user-modified" when its value differs from the last
  // value we applied from admin settings.
  const settingsSeedApplied = useRef(false);
  const lastAppliedSettings = useRef<Partial<ConsultSettings>>({});

  useEffect(() => {
    if (!cs) return;
    const last = lastAppliedSettings.current;

    // For each setting field, apply the new value if:
    //  (a) we haven't seeded yet (first load), OR
    //  (b) the setting changed AND the wizard field still matches the OLD admin value
    //      (meaning the rep hasn't manually overridden it)
    const applyIfUnchanged = (
      newVal: number,
      oldVal: number | undefined,
      currentWizardVal: number,
      setter: (v: number) => void,
    ) => {
      if (!settingsSeedApplied.current) {
        // First load — always apply
        setter(newVal);
      } else if (newVal !== oldVal && currentWizardVal === oldVal) {
        // Admin changed the setting AND rep hasn't deviated from it
        setter(newVal);
      }
    };

    applyIfUnchanged(cs.defaultRealtorFeePct,           last.defaultRealtorFeePct,           realtorFeePct,           setRealtorFeePct);
    applyIfUnchanged(cs.defaultRelocationCostPct,       last.defaultRelocationCostPct,       relocationCostPct,       setRelocationCostPct);
    applyIfUnchanged(cs.defaultClosingCostPct,          last.defaultClosingCostPct,          closingCostPct,          setClosingCostPct);
    applyIfUnchanged(cs.defaultPropertyTaxRatePct,      last.defaultPropertyTaxRatePct,      propertyTaxRatePct,      setPropertyTaxRatePct);
    applyIfUnchanged(cs.defaultReplacementInsuranceAnnual, last.defaultReplacementInsuranceAnnual, replacementInsuranceAnnual, setReplacementInsuranceAnnual);
    applyIfUnchanged(cs.defaultAppreciationRatePct,     last.defaultAppreciationRatePct,     appreciationRatePct,     setAppreciationRatePct);
    applyIfUnchanged(cs.defaultLoanTermYears,           last.defaultLoanTermYears,           loanTermYears,           setLoanTermYears);

    lastAppliedSettings.current = { ...cs };
    settingsSeedApplied.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs]);

  // ─── Results ──────────────────────────────────────────────────────────────
  const [financialResults, setFinancialResults] = useState<FinancialResults | null>(s0?.financialResults ?? null);

  // ─── Client info (for save/email) ─────────────────────────────────────────
  const [clientName, setClientName] = useState(s0?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(s0?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(s0?.clientPhone ?? "");

  // ─── Bubble state to parent (ref-based to avoid infinite re-render loop) ────
  // Storing onStateChange in a ref means calling it never invalidates the
  // effect's dependency array, breaking the setState→render→effect→setState cycle.
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => { onStateChangeRef.current = onStateChange; });

  // Snapshot-guarded effect: only fires when actual values change.
  const prevSnapshotRef = useRef<string>("");
  useEffect(() => {
    if (!onStateChangeRef.current) return;
    // Build a cheap snapshot of primitive values to detect real changes
    const snapshot = JSON.stringify([
      step, Array.from(completed), addressInput,
      homeValue, mortgageBalance, existingMortgagePI,
      propertyTaxesMonthly, insuranceMonthly, hoaMonthly, additionalMonthly,
      additionSqft, additionBedrooms, additionBathrooms,
      renovationBudget, projectedAfterValue,
      cmaValue, manualCmaOverride,
      cashContribution, loanTermYears,
      mortgageRatePercent, loanRatePercent,
      realtorFeePct, relocationCostPct, closingCostPct,
      propertyTaxRatePct, replacementInsuranceAnnual, replacementHoaMonthly,
      appreciationRatePct, financialResults,
      clientName, clientEmail, clientPhone,
    ]);
    if (snapshot === prevSnapshotRef.current) return;
    prevSnapshotRef.current = snapshot;
    onStateChangeRef.current({
      step, completed: Array.from(completed),
      addressInput, propertyData,
      homeValue, mortgageBalance, existingMortgagePI,
      propertyTaxesMonthly, insuranceMonthly, hoaMonthly, additionalMonthly,
      additionSqft, additionBedrooms, additionBathrooms, additionKitchens,
      renovationBudget, projectedAfterValue,
      comparables, selectedComps: Array.from(selectedComps), cmaValue, manualCmaOverride,
      cashContribution, loanTermYears,
      mortgageRatePercent, loanRatePercent,
      realtorFeePct, relocationCostPct, closingCostPct,
      propertyTaxRatePct, replacementInsuranceAnnual, replacementHoaMonthly,
      appreciationRatePct, financialResults,
      clientName, clientEmail, clientPhone,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, completed, addressInput, propertyData, homeValue, mortgageBalance, existingMortgagePI, propertyTaxesMonthly, insuranceMonthly, hoaMonthly, additionalMonthly, additionSqft, additionBedrooms, additionBathrooms, renovationBudget, projectedAfterValue, comparables, selectedComps, cmaValue, manualCmaOverride, cashContribution, loanTermYears, mortgageRatePercent, loanRatePercent, realtorFeePct, relocationCostPct, closingCostPct, propertyTaxRatePct, replacementInsuranceAnnual, replacementHoaMonthly, appreciationRatePct, financialResults, clientName, clientEmail, clientPhone]);

  // ─── tRPC mutations ───────────────────────────────────────────────────────
  const lookupProperty = trpc.initialConsult.lookupProperty.useMutation();
  const searchComps = trpc.initialConsult.searchComparables.useMutation();
  const calcFinancials = trpc.initialConsult.calculateFinancials.useMutation();
  const saveConsultation = trpc.initialConsult.saveConsultation.useMutation();
  const mortgageRateQuery = trpc.initialConsult.getMortgageRate.useQuery(undefined, {
    enabled: step >= 5,
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
  });

  // ─── Auto-populate mortgage rate when query loads ─────────────────────────
  const rateLoaded = useRef(false);
  if (mortgageRateQuery.data && !rateLoaded.current) {
    rateLoaded.current = true;
    const r = mortgageRateQuery.data.rate;
    if (r > 0) {
      setMortgageRatePercent(r);
      setLoanRatePercent(Math.round((r + 0.5) * 10) / 10);
    }
  }

  // ─── Reset all wizard state ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (!window.confirm("Reset the Stay vs. Move Analysis? All entered data will be cleared.")) return;
    const d = defaultCachedConsultState();
    setStep(d.step);
    setCompleted(new Set());
    setAddressInput(d.addressInput);
    setPropertyData(d.propertyData);
    setHomeValue(d.homeValue);
    setMortgageBalance(d.mortgageBalance);
    setExistingMortgagePI(d.existingMortgagePI);
    setPropertyTaxesMonthly(d.propertyTaxesMonthly);
    setInsuranceMonthly(d.insuranceMonthly);
    setHoaMonthly(d.hoaMonthly);
    setAdditionalMonthly(d.additionalMonthly);
    setAdditionSqft(d.additionSqft);
    setAdditionBedrooms(d.additionBedrooms);
    setAdditionBathrooms(d.additionBathrooms);
    setAdditionKitchens(d.additionKitchens);
    setRenovationBudget(d.renovationBudget);
    setProjectedAfterValue(d.projectedAfterValue);
    setComparables(d.comparables);
    setSelectedComps(new Set());
    setCmaValue(d.cmaValue);
    setManualCmaOverride(d.manualCmaOverride);
    setCashContribution(d.cashContribution);
    setLoanTermYears(d.loanTermYears);
    setMortgageRatePercent(d.mortgageRatePercent);
    setLoanRatePercent(d.loanRatePercent);
    setRealtorFeePct(d.realtorFeePct);
    setRelocationCostPct(d.relocationCostPct);
    setClosingCostPct(d.closingCostPct);
    setPropertyTaxRatePct(d.propertyTaxRatePct);
    setReplacementInsuranceAnnual(d.replacementInsuranceAnnual);
    setReplacementHoaMonthly(d.replacementHoaMonthly);
    setAppreciationRatePct(d.appreciationRatePct);
    setFinancialResults(d.financialResults);
    setClientName(d.clientName);
    setClientEmail(d.clientEmail);
    setClientPhone(d.clientPhone);
    rateLoaded.current = false;
    prevSnapshotRef.current = "";
    settingsSeedApplied.current = false; // allow settings to re-seed on next render
    lastAppliedSettings.current = {}; // clear last-applied so all fields re-sync from admin settings
    onReset?.();
    toast.success("Analysis reset — ready for a new consultation.");
  }, [onReset]);

  // ─── Step navigation ──────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCompleted(prev => new Set(prev).add(step));
    setStep(s => Math.min(s + 1, 8));
  }, [step]);

  const goPrev = useCallback(() => {
    setStep(s => Math.max(s - 1, 1));
  }, []);

  // ─── Step 1: Address Lookup ───────────────────────────────────────────────
  const handleAddressLookup = async () => {
    if (!addressInput.trim()) return;
    const res = await lookupProperty.mutateAsync({ address: addressInput });
    if (res.success && res.property) {
      const p = res.property as PropertyData;
      setPropertyData(p);
      if (p.estimatedValue && !homeValue) setHomeValue(p.estimatedValue);
      toast.success("Property found!");
    } else {
      toast.error(res.error ?? "Property not found. Please enter details manually.");
      setPropertyData({ formattedAddress: addressInput });
    }
  };

  // ─── Step 3: Search Comparables ───────────────────────────────────────────
  const handleSearchComps = async () => {
    if (!propertyData?.latitude || !propertyData?.longitude) {
      toast.error("No property coordinates available. Please look up an address first.");
      return;
    }
    const projectedSqft = (propertyData.squareFootage ?? 1500) + additionSqft;
    const res = await searchComps.mutateAsync({
      latitude: propertyData.latitude,
      longitude: propertyData.longitude,
      squareFootage: projectedSqft,
      bedrooms: propertyData.bedrooms ?? 3,
      bathrooms: propertyData.bathrooms ?? 2,
      propertyType: propertyData.propertyType ?? "Single Family",
      radiusMiles: 1,
      daysBack: 180,
    });
    if (res.success) {
      const comps = res.comparables as ComparableHome[];
      setComparables(comps);
      // Auto-select top 3
      const top3 = new Set<number>(comps.slice(0, 3).map((_, i) => i));
      setSelectedComps(top3);
      // Calculate initial CMA
      const selected = comps.filter((_, i) => top3.has(i));
      if (selected.length > 0) {
        const avg = selected.reduce((s, c) => s + c.soldPrice, 0) / selected.length;
        setCmaValue(Math.round(avg));
        if (!projectedAfterValue) setProjectedAfterValue(Math.round(avg));
      }
      toast.success(`Found ${comps.length} comparable sales`);
    } else {
      toast.error(res.error ?? "Could not fetch comparables");
    }
  };

  const toggleComp = (idx: number) => {
    setSelectedComps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      // Recalculate CMA
      const selected = comparables.filter((_, i) => next.has(i));
      if (selected.length > 0 && !manualCmaOverride) {
        const avg = selected.reduce((s, c) => s + c.soldPrice, 0) / selected.length;
        setCmaValue(Math.round(avg));
        setProjectedAfterValue(Math.round(avg));
      }
      return next;
    });
  };

  // ─── Step 7+8: Calculate Financials ──────────────────────────────────────
  const handleCalculate = async () => {
    const res = await calcFinancials.mutateAsync({
      currentHomeValue: homeValue,
      mortgageBalance,
      existingMortgagePI,
      propertyTaxesMonthly,
      insuranceMonthly,
      hoaMonthly,
      additionalMonthly,
      renovationBudget,
      cashContribution,
      loanRatePercent,
      loanTermYears,
      marketRatePercent: mortgageRatePercent,
      realtorFeePct,
      relocationCostPct,
      closingCostPct,
      propertyTaxRatePercent: propertyTaxRatePct,
      replacementInsuranceAnnual,
      replacementHoaMonthly,
      appreciationRatePercent: appreciationRatePct,
      projectedAfterAdditionValue: projectedAfterValue,
      appreciationYears: [1, 3, 5, 10, 20],
    });
    setFinancialResults(res as unknown as FinancialResults);
    setCompleted(prev => new Set<number>(Array.from(prev).concat([5, 6, 7, 8])));
  };

  // ─── Save Consultation ────────────────────────────────────────────────────
  const handleSave = async () => {
    await saveConsultation.mutateAsync({
      sessionId,
      clientName,
      clientEmail,
      clientPhone,
      propertyAddress: propertyData?.formattedAddress ?? addressInput,
      status: financialResults ? "complete" : "draft",
      inputData: JSON.stringify({
        homeValue, mortgageBalance, existingMortgagePI, propertyTaxesMonthly,
        insuranceMonthly, hoaMonthly, additionalMonthly,
        additionSqft, additionBedrooms, additionBathrooms, additionKitchens, renovationBudget,
        projectedAfterValue, cashContribution, loanTermYears, loanRatePercent,
        mortgageRatePercent, realtorFeePct, relocationCostPct, closingCostPct,
        propertyTaxRatePct, replacementInsuranceAnnual, replacementHoaMonthly,
        appreciationRatePct,
        propertyData,
      }),
      resultData: financialResults ? JSON.stringify({
        ...financialResults,
        comparablesUsed: Array.from(selectedComps).map(i => comparables[i]).filter(Boolean),
        cmaValue,
        projectedAfterValue,
        verdict: (
          financialResults.renovation.totalStayAndBuildMonthly > 0 &&
          financialResults.sellMove.totalMonthlyHousingPayment > 0
        ) ? (
          financialResults.renovation.totalStayAndBuildMonthly <= financialResults.sellMove.totalMonthlyHousingPayment
            ? "stay" : "move"
        ) : null,
        monthlySavings: Math.abs(
          (financialResults.sellMove.totalMonthlyHousingPayment || 0) -
          (financialResults.renovation.totalStayAndBuildMonthly || 0)
        ),
      }) : undefined,
    });
    toast.success("Consultation saved!");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const existingMonthly = existingMortgagePI + propertyTaxesMonthly + insuranceMonthly + hoaMonthly + additionalMonthly;
  const loanAmount = Math.max(0, renovationBudget - cashContribution);
  const r = loanRatePercent / 100 / 12;
  const n = loanTermYears * 12;
  const monthlyLoanPayment = loanAmount > 0 && r > 0
    ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : 0;
  const totalStayMonthly = existingMonthly + monthlyLoanPayment;

  return (
    <div className="w-full">
      {/* Step Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Stay vs. Move Analysis</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
            <button
              onClick={handleReset}
              title="Reset analysis"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {STEPS.map(s => (
            <button
              key={s.id}
              onClick={() => s.id <= Math.max(...Array.from(completed), step) && setStep(s.id)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s.id === step ? "bg-amber-500" :
                completed.has(s.id) ? "bg-amber-500/60" :
                "bg-border"
              }`}
              title={s.label}
            />
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          {STEPS.map(s => (
            <div key={s.id} className="flex-1 flex justify-center">
              <span className={`text-[9px] font-medium ${s.id === step ? "text-amber-600" : "text-muted-foreground/60"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* ─── Step 1: Current Home ───────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <StepHeader
                icon={Home}
                title="Current Home Details"
                description="Look up the property or enter details manually to begin the analysis."
              />

              {/* Address Lookup */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Property Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    placeholder="123 Main St, Orem, UT 84057"
                    onKeyDown={e => e.key === "Enter" && handleAddressLookup()}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddressLookup}
                    disabled={lookupProperty.isPending || !addressInput.trim()}
                    className="shrink-0"
                  >
                    {lookupProperty.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {propertyData && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm flex-1">
                      <p className="font-medium text-amber-900 dark:text-amber-100">{propertyData.formattedAddress}</p>
                      {propertyData.squareFootage && (
                        <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                          {fmt(propertyData.squareFootage)} sqft · {propertyData.bedrooms} bed · {propertyData.bathrooms} bath
                          {propertyData.yearBuilt ? ` · Built ${propertyData.yearBuilt}` : ""}
                        </p>
                      )}
                      {propertyData.geocodedFallback && (
                        <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                          Address geocoded via Google Maps — property details not available from RentCast. Enter home value manually.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Financial Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <NumericInput
                  label="Estimated Home Value"
                  value={homeValue}
                  onChange={setHomeValue}
                  prefix="$"
                  min={0}
                  step={1000}
                  required
                  hint={propertyData?.estimatedValue ? `RentCast estimate: ${fmtCurrency(propertyData.estimatedValue)}` : undefined}
                />
                <NumericInput
                  label="Mortgage Balance"
                  value={mortgageBalance}
                  onChange={setMortgageBalance}
                  prefix="$"
                  min={0}
                  step={1000}
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Monthly Housing Costs</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumericInput label="Mortgage P&I" value={existingMortgagePI} onChange={setExistingMortgagePI} prefix="$" min={0} />
                  <NumericInput label="Property Taxes" value={propertyTaxesMonthly} onChange={setPropertyTaxesMonthly} prefix="$" min={0} />
                  <NumericInput label="Homeowner's Insurance" value={insuranceMonthly} onChange={setInsuranceMonthly} prefix="$" min={0} />
                  <NumericInput label="HOA (if any)" value={hoaMonthly} onChange={setHoaMonthly} prefix="$" min={0} />
                  <NumericInput label="Other Monthly Costs" value={additionalMonthly} onChange={setAdditionalMonthly} prefix="$" min={0} />
                </div>
                {existingMonthly > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Monthly Housing</span>
                    <span className="font-semibold text-foreground">{fmtCurrency(existingMonthly)}/mo</span>
                  </div>
                )}
              </div>

              <StepNav onNext={goNext} nextDisabled={!homeValue} />
            </div>
          )}

          {/* ─── Step 2: Addition Details ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <StepHeader
                icon={Building2}
                title="Addition Details"
                description="Enter the planned addition specifications and renovation budget."
              />

              <div className="grid grid-cols-2 gap-4">
                <NumericInput
                  label="Addition Square Footage"
                  value={additionSqft}
                  onChange={setAdditionSqft}
                  suffix="sqft"
                  min={0}
                  step={50}
                  required
                />
                <NumericInput
                  label="Renovation Budget"
                  value={renovationBudget}
                  onChange={v => {
                    setRenovationBudget(v);
                    // Auto-estimate after-addition value
                    if (homeValue && !projectedAfterValue) {
                      setProjectedAfterValue(Math.round(homeValue + v * 0.7));
                    }
                  }}
                  prefix="$"
                  min={0}
                  step={5000}
                  required
                  hint="Total cost of the addition project"
                />
                <NumericInput
                  label="Added Bedrooms"
                  value={additionBedrooms}
                  onChange={setAdditionBedrooms}
                  min={0}
                  max={10}
                />
                <NumericInput
                  label="Added Bathrooms"
                  value={additionBathrooms}
                  onChange={setAdditionBathrooms}
                  min={0}
                  max={10}
                  step={0.5}
                />
                <NumericInput
                  label="Added Kitchens"
                  value={additionKitchens}
                  onChange={setAdditionKitchens}
                  min={0}
                  max={5}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Projected Home Value After Addition</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground text-sm font-medium pointer-events-none">$</span>
                  <Input
                    type="number"
                    value={projectedAfterValue || ""}
                    onChange={e => {
                      setProjectedAfterValue(parseFloat(e.target.value) || 0);
                      setManualCmaOverride(true);
                    }}
                    className="pl-7"
                    min={0}
                    step={1000}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {homeValue > 0 && renovationBudget > 0
                    ? `Suggested: ${fmtCurrency(homeValue + renovationBudget * 0.7)} (70% cost recovery)`
                    : "Will be refined by comparable sales in the next step"}
                </p>
              </div>

              {propertyData && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <p className="font-medium text-foreground mb-1">Projected Home After Addition</p>
                  <div className="flex gap-4 text-muted-foreground text-xs">
                    <span><Ruler className="w-3 h-3 inline mr-1" />{fmt((propertyData.squareFootage ?? 0) + additionSqft)} sqft</span>
                    <span><Bed className="w-3 h-3 inline mr-1" />{(propertyData.bedrooms ?? 0) + additionBedrooms} bed</span>
                    <span><Bath className="w-3 h-3 inline mr-1" />{(propertyData.bathrooms ?? 0) + additionBathrooms} bath</span>
                  </div>
                </div>
              )}

              <StepNav onPrev={goPrev} onNext={goNext} nextDisabled={!renovationBudget || !additionSqft} />
            </div>
          )}

          {/* ─── Step 3: Comparable Homes ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <StepHeader
                icon={BarChart3}
                title="Comparable Home Sales"
                description="Find recent sales of similar homes to establish the projected after-addition value."
              />

              {propertyData?.latitude ? (
                <Button
                  onClick={handleSearchComps}
                  disabled={searchComps.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {searchComps.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Searching MLS Data…</>
                    : <><Search className="w-4 h-4 mr-2" />Search Comparable Sales</>
                  }
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    No property coordinates found. Enter the projected value manually below.
                  </p>
                </div>
              )}

              {comparables.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {comparables.length} Sales Found — Select to Include in CMA
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {selectedComps.size} selected
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {comparables.map((comp, i) => (
                      <button
                        key={i}
                        onClick={() => toggleComp(i)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedComps.has(i)
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                            : "border-border bg-card hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{comp.address}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{fmt(comp.squareFootage)} sqft</span>
                              <span>{comp.bedrooms}bd/{comp.bathrooms}ba</span>
                              <span>{comp.distanceMiles.toFixed(2)} mi</span>
                              <span>{new Date(comp.soldDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{fmtCurrency(comp.soldPrice)}</p>
                            <p className="text-xs text-muted-foreground">{fmtCurrency(comp.pricePerSqft)}/sqft</p>
                            <div className="flex items-center justify-end gap-0.5 mt-0.5">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} className={`w-2.5 h-2.5 ${j < Math.round(comp.score / 20) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CMA Value */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Projected After-Addition Value (CMA)</p>
                  {cmaValue > 0 && !manualCmaOverride && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                      Auto-calculated
                    </Badge>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground text-sm font-medium pointer-events-none">$</span>
                  <Input
                    type="number"
                    value={projectedAfterValue || ""}
                    onChange={e => {
                      setProjectedAfterValue(parseFloat(e.target.value) || 0);
                      setManualCmaOverride(true);
                    }}
                    className="pl-7 text-lg font-bold"
                    min={0}
                    step={1000}
                  />
                </div>
                {cmaValue > 0 && manualCmaOverride && (
                  <button
                    onClick={() => { setProjectedAfterValue(cmaValue); setManualCmaOverride(false); }}
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to CMA average ({fmtCurrency(cmaValue)})
                  </button>
                )}
                {homeValue > 0 && projectedAfterValue > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>Value increase</span>
                    <span className={projectedAfterValue > homeValue ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                      {projectedAfterValue > homeValue ? "+" : ""}{fmtCurrency(projectedAfterValue - homeValue)}
                    </span>
                  </div>
                )}
              </div>

              <StepNav onPrev={goPrev} onNext={goNext} nextDisabled={!projectedAfterValue} />
            </div>
          )}

          {/* ─── Step 4: Renovation Funding ─────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <StepHeader
                icon={DollarSign}
                title="Renovation Funding"
                description="How will the addition be financed? Enter the cash contribution and loan details."
              />

              <div className="grid grid-cols-2 gap-4">
                <NumericInput
                  label="Cash / Down Payment"
                  value={cashContribution}
                  onChange={setCashContribution}
                  prefix="$"
                  min={0}
                  step={1000}
                  hint="Amount paid out of pocket"
                />
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Amount to Finance</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm font-semibold text-foreground">
                    {fmtCurrency(Math.max(0, renovationBudget - cashContribution))}
                  </div>
                  <p className="text-xs text-muted-foreground">Loan amount needed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Loan Term</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[10, 15, 20].map(y => (
                      <button
                        key={y}
                        onClick={() => setLoanTermYears(y)}
                        className={`py-2 rounded-md text-sm font-medium border transition-colors ${
                          loanTermYears === y
                            ? "bg-amber-500 text-white border-amber-500"
                            : "border-border text-foreground hover:border-amber-400"
                        }`}
                      >
                        {y} yr
                      </button>
                    ))}
                  </div>
                </div>
                <NumericInput
                  label="Estimated Loan Rate"
                  value={loanRatePercent}
                  onChange={setLoanRatePercent}
                  suffix="%"
                  min={0}
                  max={30}
                  step={0.125}
                  hint="Will be refined in Step 5"
                />
              </div>

              {/* Monthly Payment Preview */}
              {loanAmount > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-3">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Monthly Payment Preview</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Renovation loan payment</span>
                      <span className="font-medium">{fmtCurrency(monthlyLoanPayment)}/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Existing housing costs</span>
                      <span className="font-medium">{fmtCurrency(existingMonthly)}/mo</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-amber-900 dark:text-amber-100">Total Stay & Build</span>
                      <span className="text-amber-700 dark:text-amber-300 text-base">{fmtCurrency(totalStayMonthly)}/mo</span>
                    </div>
                  </div>
                </div>
              )}

              <StepNav onPrev={goPrev} onNext={goNext} />
            </div>
          )}

          {/* ─── Step 5: Mortgage Rate ──────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <StepHeader
                icon={TrendingUp}
                title="Current Mortgage Rates"
                description="Freddie Mac Primary Mortgage Market Survey (PMMS) rates are used to calculate the sell & move scenario."
              />

              {mortgageRateQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching current Freddie Mac PMMS rate…
                </div>
              ) : mortgageRateQuery.data ? (
                <div className="p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Freddie Mac PMMS</p>
                    <Badge variant={mortgageRateQuery.data.isFallback ? "secondary" : "default"} className="text-xs">
                      {mortgageRateQuery.data.isFallback ? "Estimated" : "Live"}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{mortgageRateQuery.data.rate.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    30-yr fixed · {mortgageRateQuery.data.source}
                    {mortgageRateQuery.data.effectiveDate ? ` · ${mortgageRateQuery.data.effectiveDate}` : ""}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <NumericInput
                  label="Market Rate for Sell & Move"
                  value={mortgageRatePercent}
                  onChange={setMortgageRatePercent}
                  suffix="%"
                  min={0}
                  max={30}
                  step={0.125}
                  hint="Rate used for replacement home purchase"
                />
                <NumericInput
                  label="Renovation Loan Rate"
                  value={loanRatePercent}
                  onChange={setLoanRatePercent}
                  suffix="%"
                  min={0}
                  max={30}
                  step={0.125}
                  hint="HELOC / construction loan rate"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  The market rate is used to calculate what the homeowner would pay on a replacement home if they sell and move.
                  The renovation loan rate applies to the HELOC or construction loan for the addition.
                </p>
              </div>

              <StepNav onPrev={goPrev} onNext={goNext} />
            </div>
          )}

          {/* ─── Step 6: Sell & Move ────────────────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-5">
              <StepHeader
                icon={ArrowRight}
                title="Sell & Move Analysis"
                description="Configure the costs of selling and buying a replacement home."
              />

              <div className="grid grid-cols-2 gap-4">
                <NumericInput
                  label="Realtor Fee"
                  value={realtorFeePct}
                  onChange={setRealtorFeePct}
                  suffix="%"
                  min={0}
                  max={10}
                  step={0.5}
                  locked={cs?.lockRealtorFee}
                />
                <NumericInput
                  label="Relocation Costs"
                  value={relocationCostPct}
                  onChange={setRelocationCostPct}
                  suffix="% of sale"
                  min={0}
                  max={5}
                  step={0.25}
                  locked={cs?.lockRelocationCost}
                />
                <NumericInput
                  label="Buyer Closing Costs"
                  value={closingCostPct}
                  onChange={setClosingCostPct}
                  suffix="%"
                  min={0}
                  max={5}
                  step={0.25}
                  locked={cs?.lockClosingCost}
                />
                <NumericInput
                  label="Property Tax Rate"
                  value={propertyTaxRatePct}
                  onChange={setPropertyTaxRatePct}
                  suffix="%"
                  min={0}
                  max={5}
                  step={0.1}
                  hint="Annual rate on replacement home"
                  locked={cs?.lockPropertyTaxRate}
                />
                <NumericInput
                  label="Replacement Insurance"
                  value={replacementInsuranceAnnual}
                  onChange={setReplacementInsuranceAnnual}
                  prefix="$"
                  suffix="/yr"
                  min={0}
                  step={100}
                  locked={cs?.lockReplacementInsurance}
                />
                <NumericInput
                  label="Replacement HOA"
                  value={replacementHoaMonthly}
                  onChange={setReplacementHoaMonthly}
                  prefix="$"
                  suffix="/mo"
                  min={0}
                  step={25}
                />
              </div>

              <Separator />

              <NumericInput
                label="Annual Home Appreciation Rate"
                value={appreciationRatePct}
                onChange={setAppreciationRatePct}
                suffix="%"
                min={0}
                max={20}
                step={0.5}
                hint="Used for long-term appreciation comparison (Step 8)"
                locked={cs?.lockAppreciationRate}
              />

              <StepNav
                onPrev={goPrev}
                onNext={async () => {
                  await handleCalculate();
                  goNext();
                }}
                nextLabel="Calculate Results"
                nextLoading={calcFinancials.isPending}
              />
            </div>
          )}

          {/* ─── Step 7: Stay vs. Move Comparison ──────────────────────────── */}
          {step === 7 && financialResults && (
            <div className="space-y-5">
              <StepHeader
                icon={BarChart3}
                title="Stay vs. Move Comparison"
                description="Monthly cost breakdown for each path."
              />

              {/* ── Verdict Banner ── */}
              {(() => {
                const diff = financialResults.sellMove.totalMonthlyHousingPayment - financialResults.renovation.totalStayAndBuildMonthly;
                const stayWins = diff > 0;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${
                      stayWins
                        ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/40"
                        : "border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100/40"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                      stayWins ? "bg-emerald-500" : "bg-slate-500"
                    }`}>
                      {stayWins
                        ? <Check className="w-5 h-5 text-white" />
                        : <ArrowRight className="w-5 h-5 text-white" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${
                        stayWins ? "text-emerald-900" : "text-slate-800"
                      }`}>
                        {stayWins
                          ? `Stay & Build saves ${fmtCurrency(Math.abs(diff))}/month`
                          : `Selling saves ${fmtCurrency(Math.abs(diff))}/month`}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        stayWins ? "text-emerald-700" : "text-slate-600"
                      }`}>
                        {stayWins
                          ? `That's ${fmtCurrency(Math.abs(diff) * 12)}/year — and you keep your equity.`
                          : `Staying still builds equity and avoids transaction costs.`}
                      </p>
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── Side-by-Side Cards ── */}
              <div className="grid grid-cols-2 gap-3">
                {/* Stay & Build */}
                {(() => {
                  const diff = financialResults.sellMove.totalMonthlyHousingPayment - financialResults.renovation.totalStayAndBuildMonthly;
                  const stayWins = diff > 0;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`rounded-2xl overflow-hidden border-2 ${
                        stayWins ? "border-amber-400 shadow-md" : "border-border"
                      }`}
                    >
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        stayWins
                          ? "bg-stone-800 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Stay & Build</span>
                        </div>
                        {stayWins && (
                          <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full tracking-wide">BEST VALUE</span>
                        )}
                      </div>
                      <div className={`p-4 space-y-3 ${
                        stayWins ? "bg-amber-50/60" : "bg-card"
                      }`}>
                        <div>
                          <p className={`text-3xl font-bold ${
                            stayWins ? "text-amber-700" : "text-foreground"
                          }`}>
                            {fmtCurrency(financialResults.renovation.totalStayAndBuildMonthly)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">per month</p>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Existing housing</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(financialResults.renovation.existingMonthlyHousing)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Renovation loan</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(financialResults.renovation.monthlyLoanPayment)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/40">
                            <span className="font-bold text-foreground">Total / mo</span>
                            <span className={`font-bold tabular-nums ${
                              stayWins ? "text-amber-700" : "text-foreground"
                            }`}>{fmtCurrency(financialResults.renovation.totalStayAndBuildMonthly)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Sell & Move */}
                {(() => {
                  const diff = financialResults.sellMove.totalMonthlyHousingPayment - financialResults.renovation.totalStayAndBuildMonthly;
                  const moveWins = diff < 0;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className={`rounded-2xl overflow-hidden border-2 ${
                        moveWins ? "border-slate-400 shadow-md" : "border-border"
                      }`}
                    >
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        moveWins ? "bg-slate-700 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Sell & Move</span>
                        </div>
                        {moveWins && (
                          <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full tracking-wide">BEST VALUE</span>
                        )}
                      </div>
                      <div className={`p-4 space-y-3 ${
                        moveWins ? "bg-slate-50" : "bg-card"
                      }`}>
                        <div>
                          <p className={`text-3xl font-bold ${
                            moveWins ? "text-slate-700" : "text-foreground"
                          }`}>
                            {fmtCurrency(financialResults.sellMove.totalMonthlyHousingPayment)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">per month</p>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Net proceeds</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(financialResults.sellMove.netProceedsBeforeClosing)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Replacement home</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(financialResults.sellMove.replacementHomePurchasePrice)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">New mortgage P&I</span>
                            <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(financialResults.sellMove.monthlyPI)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/40">
                            <span className="font-bold text-foreground">Total / mo</span>
                            <span className={`font-bold tabular-nums ${
                              moveWins ? "text-slate-700" : "text-foreground"
                            }`}>{fmtCurrency(financialResults.sellMove.totalMonthlyHousingPayment)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>

              <StepNav onPrev={goPrev} onNext={goNext} nextLabel="View Appreciation →" />
            </div>
          )}

          {/* ─── Step 8: Long-Term Appreciation ────────────────────────────── */}
          {step === 8 && financialResults && (
            <div className="space-y-5">
              <StepHeader
                icon={TrendingUp}
                title="Long-Term Appreciation"
                description={`At ${appreciationRatePct}% annual appreciation, here's how both paths compare over time.`}
              />

              {/* ── Appreciation Line Chart ── */}
              <div className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Home Value Over Time</p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={financialResults.appreciation.map((pt) => ({
                      year: `Yr ${pt.year}`,
                      "Stay & Build": Math.round(pt.stayValue),
                      "Sell & Move": Math.round(pt.moveValue),
                    }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `$${(v / 1_000_000).toFixed(1)}M`
                          : `$${(v / 1_000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value),
                        name,
                      ]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Line
                      type="monotone"
                      dataKey="Stay & Build"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#d97706" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Sell & Move"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 4, fill: "#6b7280" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* ── Appreciation Table ── */}
              <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Year</th>
                      <th className="text-right px-3 py-2.5 text-amber-700 font-semibold text-xs uppercase tracking-wide">Stay Value</th>
                      <th className="text-right px-3 py-2.5 text-amber-600 font-semibold text-xs uppercase tracking-wide">Stay Gain</th>
                      <th className="text-right px-3 py-2.5 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Move Value</th>
                      <th className="text-right px-3 py-2.5 text-foreground font-semibold text-xs uppercase tracking-wide">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialResults.appreciation.map((pt, i) => {
                      const stayAhead = pt.stayValue >= pt.moveValue;
                      return (
                        <tr key={pt.year} className={`border-t border-border/40 ${
                          i % 2 === 0 ? "bg-card" : "bg-muted/20"
                        }`}>
                          <td className="px-3 py-2.5 text-foreground font-semibold text-xs">Yr {pt.year}</td>
                          <td className="px-3 py-2.5 text-right text-amber-700 font-semibold text-xs tabular-nums">
                            {fmtCurrency(pt.stayValue)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-amber-500 text-xs tabular-nums">
                            +{fmtCurrency(pt.stayAppreciation)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground text-xs tabular-nums">
                            {fmtCurrency(pt.moveValue)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold text-xs tabular-nums ${
                            stayAhead ? "text-emerald-600" : "text-slate-500"
                          }`}>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                              stayAhead
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {stayAhead ? "↑ Stay" : "↑ Move"} {fmtCurrency(Math.abs(pt.difference))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Save & Continue ── */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Save Consultation</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Client Name</Label>
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Homeowner name" className="h-9 text-sm bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Client Email</Label>
                    <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@example.com" type="email" className="h-9 text-sm bg-background" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Client Phone</Label>
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(801) 555-0100" type="tel" className="h-9 text-sm bg-background" />
                  </div>
                </div>

                {/* ─── Send Pre-Approval Email ─────────────────────────── */}
                <PreApprovalEmailSection
                  clientName={clientName}
                  clientEmail={clientEmail}
                  clientPhone={clientPhone}
                  clientAddress={propertyData?.formattedAddress ?? addressInput}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={saveConsultation.isPending}
                    className="flex-1 bg-background"
                  >
                    {saveConsultation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  {onContinueToDesignPackage && (
                    <Button
                      onClick={() => onContinueToDesignPackage({
                          additionSqft,
                          additionBedrooms,
                          additionBathrooms,
                          additionKitchens,
                          renovationBudget,
                          propertyAddress: propertyData?.formattedAddress ?? addressInput,
                          homeValue,
                          clientName,
                          clientEmail,
                          clientPhone,
                          mortgageBalance,
                          appreciationRatePct,
                          loanRatePercent,
                          loanTermYears,
                          financialResults: financialResults ? {
                            renovation: financialResults.renovation,
                            sellMove: financialResults.sellMove,
                            appreciation: financialResults.appreciation,
                          } : null,
                        })}
                      className="flex-1 bg-stone-800 hover:bg-stone-900 text-white"
                    >
                      Continue to Design Package
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-start">
                <Button variant="ghost" size="sm" onClick={goPrev} className="text-muted-foreground">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </div>
            </div>
          )}

          {/* Fallback for steps 7/8 without results */}
          {(step === 7 || step === 8) && !financialResults && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please complete Steps 1–6 to calculate results.</p>
              <Button variant="outline" onClick={() => setStep(1)} className="mt-3">
                Start Over
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function StepNav({
  onPrev, onNext, nextDisabled, nextLabel, nextLoading,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextLoading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onPrev ? (
        <Button variant="ghost" size="sm" onClick={onPrev} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      ) : <div />}
      {onNext && (
        <Button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {nextLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {nextLabel ?? "Next"}
          {!nextLoading && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>
      )}
    </div>
  );
}
