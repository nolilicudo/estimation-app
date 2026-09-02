import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Settings, Trash2, Lock, Unlock, RefreshCw, User, MapPin, Phone, Mail, Calendar, DollarSign,
  Home, TrendingUp, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtDate = (ts: number) => ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5 text-canyon shrink-0" />
      <p className="text-xs font-semibold text-charcoal uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color = "slate" }: { label: string; value: string; color?: string }) {
  const bg: Record<string, string> = {
    slate: "bg-slate-50",
    amber: "bg-amber-50",
    blue: "bg-blue-50",
    green: "bg-green-50",
    canyon: "bg-canyon/5",
    warm: "bg-warm-cream",
  };
  const text: Record<string, string> = {
    slate: "text-charcoal",
    amber: "text-amber-700",
    blue: "text-blue-700",
    green: "text-green-700",
    canyon: "text-canyon",
    warm: "text-charcoal",
  };
  return (
    <div className={`${bg[color] ?? bg.slate} rounded-lg p-2.5 text-center`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${text[color] ?? text.slate}`}>{value}</p>
    </div>
  );
}

// ─── Consult Sessions Panel ───────────────────────────────────────────────────
function ConsultSessionsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data, isLoading } = trpc.initialConsult.listConsultations.useQuery();
  const deleteMutation = trpc.initialConsult.deleteConsultation.useMutation({
    onSuccess: () => { utils.initialConsult.listConsultations.invalidate(); toast.success("Consultation deleted"); },
    onError: () => toast.error("Failed to delete"),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const consultations = data?.consultations ?? [];

  if (isLoading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (consultations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No consultations yet</p>
        <p className="text-xs mt-1">Completed Initial Consult sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{consultations.length} session{consultations.length !== 1 ? "s" : ""} saved</p>
      </div>
      {consultations.map((c: any) => {
        const isOpen = expanded === c.sessionId;
        let resultData: any = null;
        try { resultData = c.resultData ? JSON.parse(c.resultData) : null; } catch {}
        let inputData: any = null;
        try { inputData = c.inputData ? JSON.parse(c.inputData) : null; } catch {}

        const stayMonthly = resultData?.renovation?.totalStayAndBuildMonthly ?? resultData?.stayMonthly;
        const moveMonthly = resultData?.sellMove?.totalMonthlyHousingPayment ?? resultData?.moveMonthly;
        const verdict = resultData?.verdict ?? (stayMonthly != null && moveMonthly != null ? (stayMonthly <= moveMonthly ? "stay" : "move") : null);
        const monthlySavings = resultData?.monthlySavings ?? (stayMonthly != null && moveMonthly != null ? Math.abs(stayMonthly - moveMonthly) : null);

        return (
          <div key={c.sessionId} className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-warm-cream/40 transition-colors"
              onClick={() => setExpanded(isOpen ? null : c.sessionId)}
            >
              <div className="w-9 h-9 rounded-full bg-canyon/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-canyon" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{c.clientName || "Unknown Client"}</p>
                <p className="text-xs text-muted-foreground truncate">{c.propertyAddress || "No address"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {verdict && (
                  <Badge className={`text-xs ${verdict === "stay" ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200"}`} variant="outline">
                    {verdict === "stay" ? "Stay wins" : "Move wins"}
                  </Badge>
                )}
                <Badge variant={c.status === "complete" ? "default" : "secondary"} className="text-xs">
                  {c.status === "complete" ? "Complete" : "Draft"}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">{fmtDate(c.createdAt)}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-border/40 px-4 pb-5 pt-4 space-y-5">

                {/* ── Contact Info ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {c.clientEmail && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.clientEmail}</span>
                    </div>
                  )}
                  {c.clientPhone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{c.clientPhone}</span>
                    </div>
                  )}
                  {c.propertyAddress && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.propertyAddress}</span>
                    </div>
                  )}
                </div>

                {/* ── Property Details ── */}
                {inputData?.propertyData && (
                  <div>
                    <SectionHeader icon={Home} label="Property Details" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {inputData.propertyData.estimatedValue > 0 && <StatTile label="Est. Value" value={fmt(inputData.propertyData.estimatedValue)} color="warm" />}
                      {inputData.propertyData.squareFootage > 0 && <StatTile label="Sq Ft" value={inputData.propertyData.squareFootage.toLocaleString()} color="warm" />}
                      {inputData.propertyData.bedrooms > 0 && <StatTile label="Beds / Baths" value={`${inputData.propertyData.bedrooms} / ${inputData.propertyData.bathrooms}`} color="warm" />}
                      {inputData.propertyData.yearBuilt > 0 && <StatTile label="Year Built" value={String(inputData.propertyData.yearBuilt)} color="warm" />}
                    </div>
                  </div>
                )}

                {/* ── Addition Scope ── */}
                {inputData && (inputData.additionSqft > 0 || inputData.additionBedrooms > 0 || inputData.additionBathrooms > 0 || inputData.additionKitchens > 0) && (
                  <div>
                    <SectionHeader icon={Home} label="Addition Scope" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {inputData.additionSqft > 0 && <StatTile label="Added Sq Ft" value={inputData.additionSqft.toLocaleString()} color="canyon" />}
                      {inputData.additionBedrooms > 0 && <StatTile label="Added Beds" value={String(inputData.additionBedrooms)} color="canyon" />}
                      {inputData.additionBathrooms > 0 && <StatTile label="Added Baths" value={String(inputData.additionBathrooms)} color="canyon" />}
                      {inputData.additionKitchens > 0 && <StatTile label="Added Kitchens" value={String(inputData.additionKitchens)} color="canyon" />}
                    </div>
                  </div>
                )}

                {/* ── Financial Inputs ── */}
                {inputData && (
                  <div>
                    <SectionHeader icon={DollarSign} label="Financial Inputs" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {inputData.homeValue > 0 && <StatTile label="Home Value" value={fmt(inputData.homeValue)} />}
                      {inputData.mortgageBalance > 0 && <StatTile label="Mortgage Balance" value={fmt(inputData.mortgageBalance)} />}
                      {inputData.renovationBudget > 0 && <StatTile label="Reno Budget" value={fmt(inputData.renovationBudget)} />}
                      {inputData.cashContribution > 0 && <StatTile label="Cash Down" value={fmt(inputData.cashContribution)} />}
                      {inputData.existingMortgagePI > 0 && <StatTile label="Existing P&I" value={`${fmt(inputData.existingMortgagePI)}/mo`} />}
                      {inputData.loanRatePercent > 0 && <StatTile label="Loan Rate / Term" value={`${inputData.loanRatePercent}% / ${inputData.loanTermYears}yr`} />}
                    </div>
                  </div>
                )}

                {/* ── Stay vs. Move Analysis ── */}
                {resultData?.renovation && resultData?.sellMove && (
                  <div>
                    <SectionHeader icon={BarChart2} label="Stay vs. Move Analysis" />
                    {/* Verdict banner */}
                    {verdict && (
                      <div className={`rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-sm font-semibold ${
                        verdict === "stay" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        <span>{verdict === "stay" ? "✓ Stay & Build wins" : "→ Sell & Move wins"}</span>
                        {monthlySavings != null && monthlySavings > 0 && (
                          <span className="ml-auto text-xs font-normal opacity-80">{fmt(monthlySavings)}/mo savings</span>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Stay & Build */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-2">Stay &amp; Build</p>
                        <div className="space-y-1 text-xs">
                          {resultData.renovation.existingMonthlyHousing != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Existing housing</span>
                              <span className="font-medium">{fmt(resultData.renovation.existingMonthlyHousing)}/mo</span>
                            </div>
                          )}
                          {resultData.renovation.monthlyLoanPayment != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loan payment</span>
                              <span className="font-medium">{fmt(resultData.renovation.monthlyLoanPayment)}/mo</span>
                            </div>
                          )}
                          {resultData.renovation.totalStayAndBuildMonthly != null && (
                            <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                              <span className="font-semibold text-amber-900">Total</span>
                              <span className="font-bold text-amber-900">{fmt(resultData.renovation.totalStayAndBuildMonthly)}/mo</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Sell & Move */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-800 mb-2">Sell &amp; Move</p>
                        <div className="space-y-1 text-xs">
                          {resultData.sellMove.realtorFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Realtor fee</span>
                              <span className="font-medium">{fmt(resultData.sellMove.realtorFee)}</span>
                            </div>
                          )}
                          {resultData.sellMove.relocationCost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Relocation</span>
                              <span className="font-medium">{fmt(resultData.sellMove.relocationCost)}</span>
                            </div>
                          )}
                          {resultData.sellMove.closingCost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Closing costs</span>
                              <span className="font-medium">{fmt(resultData.sellMove.closingCost)}</span>
                            </div>
                          )}
                          {resultData.sellMove.newMortgagePayment != null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">New mortgage</span>
                              <span className="font-medium">{fmt(resultData.sellMove.newMortgagePayment)}/mo</span>
                            </div>
                          )}
                          {resultData.sellMove.totalMonthlyHousingPayment != null && (
                            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                              <span className="font-semibold text-blue-900">Total</span>
                              <span className="font-bold text-blue-900">{fmt(resultData.sellMove.totalMonthlyHousingPayment)}/mo</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Appreciation Table ── */}
                {resultData?.appreciation && resultData.appreciation.length > 0 && (
                  <div>
                    <SectionHeader icon={TrendingUp} label="Long-Term Appreciation" />
                    <div className="overflow-x-auto rounded-lg border border-border/40">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-warm-cream border-b border-border/40">
                            <th className="text-left px-3 py-2 text-muted-foreground font-medium">Year</th>
                            <th className="text-right px-3 py-2 text-muted-foreground font-medium">Stay Value</th>
                            <th className="text-right px-3 py-2 text-muted-foreground font-medium">Move Value</th>
                            <th className="text-right px-3 py-2 text-muted-foreground font-medium">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.appreciation.map((row: any, i: number) => (
                            <tr key={i} className={`${i % 2 === 0 ? "" : "bg-warm-cream/30"} border-b border-border/20 last:border-0`}>
                              <td className="px-3 py-2 font-medium text-charcoal">{row.year}yr</td>
                              <td className="px-3 py-2 text-right text-amber-700 font-medium">{fmt(row.stayValue)}</td>
                              <td className="px-3 py-2 text-right text-blue-700 font-medium">{fmt(row.moveValue)}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={`font-semibold ${row.stayValue >= row.moveValue ? "text-green-700" : "text-red-600"}`}>
                                  {row.stayValue >= row.moveValue ? "+" : "-"}{fmt(Math.abs(row.stayValue - row.moveValue))}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── CMA Comparables ── */}
                {resultData?.comparablesUsed && resultData.comparablesUsed.length > 0 && (
                  <div>
                    <SectionHeader icon={BarChart2} label={`CMA Comparables Used (${resultData.comparablesUsed.length})`} />
                    {resultData.cmaValue > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        After-renovation estimate: <span className="font-semibold text-canyon">{fmt(resultData.cmaValue)}</span>
                        {resultData.projectedAfterValue > 0 && resultData.projectedAfterValue !== resultData.cmaValue && (
                          <span> · Manual override: <span className="font-semibold text-charcoal">{fmt(resultData.projectedAfterValue)}</span></span>
                        )}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {resultData.comparablesUsed.map((comp: any, i: number) => (
                        <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs border border-border/30">
                          <span className="font-medium text-charcoal truncate max-w-[220px]">{comp.formattedAddress || comp.address || "—"}</span>
                          {comp.price > 0 && <span className="text-green-700 font-semibold">{fmt(comp.price)}</span>}
                          {comp.squareFootage > 0 && <span className="text-muted-foreground">{comp.squareFootage.toLocaleString()} sq ft</span>}
                          {comp.price > 0 && comp.squareFootage > 0 && (
                            <span className="text-muted-foreground">{fmt(Math.round(comp.price / comp.squareFootage))}/sqft</span>
                          )}
                          {comp.daysAgo != null && <span className="text-muted-foreground">{comp.daysAgo}d ago</span>}
                          {comp.bedrooms > 0 && <span className="text-muted-foreground">{comp.bedrooms}bd/{comp.bathrooms}ba</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Session Meta + Delete ── */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created {fmtDate(c.createdAt)}</span>
                    {c.updatedAt > c.createdAt && <span>· Updated {fmtDate(c.updatedAt)}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 text-xs h-7"
                    onClick={() => {
                      if (confirm(`Delete consultation for ${c.clientName || "this client"}?`)) {
                        deleteMutation.mutate({ sessionId: c.sessionId });
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Financial Assumptions Settings Panel ────────────────────────────────────
// Numeric field keys that need string-based editing to allow clearing
const NUMERIC_FIELD_KEYS = [
  "defaultRealtorFeePct", "defaultRelocationCostPct", "defaultClosingCostPct",
  "defaultPropertyTaxRatePct", "defaultAppreciationRatePct", "defaultLoanTermYears",
  "defaultReplacementInsuranceAnnual",
];

function ConsultSettingsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: settings, isLoading } = trpc.initialConsult.getConsultSettings.useQuery();
  const updateMutation = trpc.initialConsult.updateConsultSettings.useMutation({
    onSuccess: () => { utils.initialConsult.getConsultSettings.invalidate(); toast.success("Settings saved"); },
    onError: () => toast.error("Failed to save settings"),
  });

  // Use string for numeric fields so the user can clear/type freely without snapping to 0
  const [form, setForm] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  // When settings load, seed the string form values so inputs are controlled from the start
  const settingsLoaded = useRef(false);
  useEffect(() => {
    if (settings && !settingsLoaded.current) {
      settingsLoaded.current = true;
      const seed: Record<string, any> = {};
      for (const k of NUMERIC_FIELD_KEYS) {
        const v = settings[k as keyof typeof settings];
        if (v !== undefined) seed[k] = String(v);
      }
      setForm(seed);
    }
  }, [settings]);

  // For numeric fields, store as string; for booleans, store as boolean
  const val = (key: string, fallback: any) => {
    if (form[key] !== undefined) return form[key];
    const sv = settings?.[key as keyof typeof settings];
    if (sv !== undefined) return NUMERIC_FIELD_KEYS.includes(key) ? String(sv) : sv;
    return NUMERIC_FIELD_KEYS.includes(key) ? String(fallback) : fallback;
  };
  const set = (key: string, value: any) => { setForm(f => ({ ...f, [key]: value })); setDirty(true); };

  const handleSave = () => {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(form)) {
      if (NUMERIC_FIELD_KEYS.includes(k)) {
        const n = parseFloat(v);
        payload[k] = isNaN(n) ? 0 : n;
      } else {
        payload[k] = v;
      }
    }
    updateMutation.mutate(payload as any);
    setDirty(false);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const fields: Array<{
    key: string; label: string; lockKey: string; unit: string; step: number; min: number; max: number; description: string;
  }> = [
    { key: "defaultRealtorFeePct", label: "Realtor Fee", lockKey: "lockRealtorFee", unit: "%", step: 0.5, min: 0, max: 15, description: "Seller's agent + buyer's agent commission when selling" },
    { key: "defaultRelocationCostPct", label: "Relocation Cost", lockKey: "lockRelocationCost", unit: "% of home value", step: 0.25, min: 0, max: 10, description: "Moving expenses as % of home value" },
    { key: "defaultClosingCostPct", label: "Closing Costs (Buy)", lockKey: "lockClosingCost", unit: "%", step: 0.25, min: 0, max: 10, description: "Closing costs on replacement home purchase" },
    { key: "defaultPropertyTaxRatePct", label: "Property Tax Rate", lockKey: "lockPropertyTaxRate", unit: "% annual", step: 0.05, min: 0, max: 5, description: "Annual property tax rate on replacement home" },
    { key: "defaultAppreciationRatePct", label: "Annual Appreciation", lockKey: "lockAppreciationRate", unit: "% per year", step: 0.5, min: 0, max: 20, description: "Expected annual home value appreciation rate" },
    { key: "defaultLoanTermYears", label: "Loan Term", lockKey: "lockLoanTerm", unit: "years", step: 5, min: 5, max: 30, description: "Default construction/renovation loan term" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-display text-charcoal">Financial Assumption Defaults</h3>
        <p className="text-sm text-muted-foreground mt-1">
          These values pre-populate Step 6 (Sell &amp; Move Costs) in the Initial Consult tool.
          Toggle the lock icon to prevent reps from changing a value.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map(f => {
          const isLocked = val(f.lockKey, false) as boolean;
          const currentVal = val(f.key, 0) as number;
          return (
            <div key={f.key} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-charcoal">{f.label}</p>
                    {isLocked && <Badge variant="secondary" className="text-[10px] gap-0.5 py-0"><Lock className="w-2.5 h-2.5" /> Locked</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
                <button
                  onClick={() => set(f.lockKey, !isLocked)}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${isLocked ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
                  title={isLocked ? "Unlock — reps can change this" : "Lock — reps cannot change this"}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="number"
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  value={currentVal}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-28 px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canyon"
                />
                <span className="text-xs text-muted-foreground">{f.unit}</span>
              </div>
            </div>
          );
        })}

        {/* Insurance — flat dollar amount */}
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-charcoal">Replacement Home Insurance</p>
                {val("lockReplacementInsurance", false) && <Badge variant="secondary" className="text-[10px] gap-0.5 py-0"><Lock className="w-2.5 h-2.5" /> Locked</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Annual homeowner's insurance on replacement home</p>
            </div>
            <button
              onClick={() => set("lockReplacementInsurance", !val("lockReplacementInsurance", false))}
              className={`shrink-0 p-1.5 rounded-lg transition-colors ${val("lockReplacementInsurance", false) ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
            >
              {val("lockReplacementInsurance", false) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="number"
                step={100}
                min={0}
                max={20000}
                value={val("defaultReplacementInsuranceAnnual", 1800) as number}
                onChange={e => set("defaultReplacementInsuranceAnnual", e.target.value)}
                className="pl-7 w-32 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canyon"
              />
            </div>
            <span className="text-xs text-muted-foreground">$ / year</span>
          </div>
        </div>
      </div>

      {/* Lender Email */}
      <div>
        <h3 className="text-base font-display text-charcoal">Pre-Approval Email Recipient</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The lender email address that receives a CC on every financing pre-approval referral email sent from the Initial Consult wizard.
        </p>
        <div className="mt-3 bg-white rounded-xl border border-border/60 p-4 space-y-2">
          <label className="text-sm font-semibold text-charcoal block">Lender Email</label>
          <input
            type="email"
            value={val("lenderEmail", "ODonnellTeam@ccm.com") as string}
            onChange={e => set("lenderEmail", e.target.value)}
            placeholder="ODonnellTeam@ccm.com"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canyon"
          />
          <p className="text-xs text-muted-foreground">Default: ODonnellTeam@ccm.com</p>
        </div>
      </div>

      {dirty && (
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-canyon hover:bg-canyon/90 text-white w-full sm:w-auto">
          {updateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export function InitialConsultAdminPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display text-charcoal">Initial Consult</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage saved consultation sessions and configure default financial assumptions.</p>
      </div>
      <Tabs defaultValue="sessions">
        <TabsList className="mb-4">
          <TabsTrigger value="sessions" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <ConsultSessionsPanel utils={utils} />
        </TabsContent>
        <TabsContent value="settings">
          <ConsultSettingsPanel utils={utils} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
