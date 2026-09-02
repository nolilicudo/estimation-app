/**
 * ConsultSummaryCard — Redesigned
 * Polished recap of the Initial Consult (Stay vs. Move) analysis.
 * Shown in the Design Package column after the rep clicks "Continue to Design Package".
 * Mountain Modern design: warm sandstone, canyon rust, charcoal, clean typography.
 */

import { useState } from "react";
import {
  ChevronDown, ChevronUp, Home, TrendingUp, ArrowRightLeft,
  User, Phone, Mail, MapPin, DollarSign, Building2,
  CheckCircle2, XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConsultHandoffData } from "@/components/consultTypes";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

export function ConsultSummaryCard({ data }: { data: ConsultHandoffData }) {
  const [expanded, setExpanded] = useState(true);

  const fr         = data.financialResults;
  const stayMonthly = fr?.renovation.totalStayAndBuildMonthly ?? 0;
  const moveMonthly = fr?.sellMove.totalMonthlyHousingPayment ?? 0;
  const diff        = moveMonthly - stayMonthly;
  const stayWins    = diff > 0;

  const chartData = fr?.appreciation?.map((pt) => ({
    year: `Yr ${pt.year}`,
    "Stay & Build": Math.round(pt.stayValue),
    "Sell & Move":  Math.round(pt.moveValue),
  })) ?? [];

  const yr10 = fr?.appreciation?.find((p) => p.year === 10);
  const yr20 = fr?.appreciation?.find((p) => p.year === 20);

  return (
    <div className="rounded-2xl border border-[color:var(--color-canyon)]/25 bg-[color:var(--color-warm-cream)] shadow-md overflow-hidden">

      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[color:var(--color-charcoal)] text-white hover:bg-[color:var(--color-charcoal)]/90 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[color:var(--color-canyon)] flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold tracking-wide font-display leading-tight">Initial Consult Summary</p>
            {data.clientName
              ? <p className="text-xs text-white/60">{data.clientName}</p>
              : <p className="text-xs text-white/60">Stay vs. Move Analysis</p>
            }
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-white/60" />
          : <ChevronDown className="w-4 h-4 text-white/60" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">

              {/* ── Verdict Banner ── */}
              {fr && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                  stayWins
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-300 bg-slate-50"
                }`}>
                  {stayWins
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-bold ${stayWins ? "text-emerald-800" : "text-slate-700"}`}>
                      {stayWins
                        ? `Stay & Build saves ${fmt(Math.abs(diff))}/mo`
                        : `Selling saves ${fmt(Math.abs(diff))}/mo`}
                    </p>
                    <p className={`text-xs mt-0.5 ${stayWins ? "text-emerald-700" : "text-slate-600"}`}>
                      {stayWins
                        ? `That's ${fmt(Math.abs(diff) * 12)}/year by staying and building.`
                        : `Staying still builds equity and avoids transaction costs.`}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Monthly Cost Comparison ── */}
              {fr && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-canyon)] mb-2 px-0.5">Monthly Cost Comparison</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Stay & Build card */}
                    <div className={`rounded-xl p-3 border-2 transition-all ${
                      stayWins
                        ? "border-[color:var(--color-canyon)] bg-[color:var(--color-sandstone)]"
                        : "border-border bg-card"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Home className={`w-3.5 h-3.5 ${stayWins ? "text-[color:var(--color-canyon)]" : "text-muted-foreground"}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stay & Build</span>
                        {stayWins && (
                          <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">BEST</span>
                        )}
                      </div>
                      <p className={`text-xl font-bold font-display ${stayWins ? "text-[color:var(--color-canyon)]" : "text-foreground"}`}>
                        {fmt(stayMonthly)}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                      <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Existing housing</span>
                          <span>{fmt(fr.renovation.existingMonthlyHousing)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Renovation loan</span>
                          <span>{fmt(fr.renovation.monthlyLoanPayment)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sell & Move card */}
                    <div className={`rounded-xl p-3 border-2 transition-all ${
                      !stayWins
                        ? "border-slate-400 bg-slate-50"
                        : "border-border bg-card"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowRightLeft className={`w-3.5 h-3.5 ${!stayWins ? "text-slate-500" : "text-muted-foreground"}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sell & Move</span>
                        {!stayWins && (
                          <span className="ml-auto text-[9px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-full">BEST</span>
                        )}
                      </div>
                      <p className={`text-xl font-bold font-display ${!stayWins ? "text-slate-700" : "text-foreground"}`}>
                        {fmt(moveMonthly)}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                      <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>New mortgage P&I</span>
                          <span>{fmt(fr.sellMove.monthlyPI)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Replacement home</span>
                          <span>{fmt(fr.sellMove.replacementHomePurchasePrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Long-Term Appreciation ── */}
              {fr && chartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-canyon)] mb-2 px-0.5">Long-Term Appreciation</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {yr10 && (
                      <div className="rounded-xl bg-[color:var(--color-sandstone)] border border-[color:var(--color-canyon)]/20 p-3 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">10-Year Value</p>
                        <p className="text-base font-bold text-[color:var(--color-canyon)] font-display">{fmt(yr10.stayValue)}</p>
                        <p className="text-[9px] text-muted-foreground">Stay & Build</p>
                      </div>
                    )}
                    {yr20 && (
                      <div className="rounded-xl bg-[color:var(--color-sandstone)] border border-[color:var(--color-canyon)]/20 p-3 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">20-Year Value</p>
                        <p className="text-base font-bold text-[color:var(--color-canyon)] font-display">{fmt(yr20.stayValue)}</p>
                        <p className="text-[9px] text-muted-foreground">Stay & Build</p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={chartData} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v: number) =>
                            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`
                          }
                          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false} tickLine={false} width={44}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [fmt(value), name]}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 11,
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={6} />
                        <Line
                          type="monotone" dataKey="Stay & Build"
                          stroke="oklch(0.52 0.14 40)" strokeWidth={2.5}
                          dot={false} activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone" dataKey="Sell & Move"
                          stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3"
                          dot={false} activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-[9px] text-center text-muted-foreground mt-1">
                      At {data.appreciationRatePct}% annual appreciation
                    </p>
                  </div>
                </div>
              )}

              {/* ── Key Figures ── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-canyon)] mb-2 px-0.5">Key Figures</p>
                <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
                  {data.propertyAddress && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <MapPin className="w-3.5 h-3.5 text-[color:var(--color-canyon)] flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 min-w-0">Property</span>
                      <span className="text-xs font-semibold text-[color:var(--color-charcoal)] text-right max-w-[55%] truncate">{data.propertyAddress}</span>
                    </div>
                  )}
                  {data.homeValue > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <Home className="w-3.5 h-3.5 text-[color:var(--color-canyon)] flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">Home Value</span>
                      <span className="text-xs font-bold text-[color:var(--color-charcoal)]">{fmt(data.homeValue)}</span>
                    </div>
                  )}
                  {data.renovationBudget > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[color:var(--color-canyon)]/5">
                      <Building2 className="w-3.5 h-3.5 text-[color:var(--color-canyon)] flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">Renovation Budget</span>
                      <span className="text-xs font-bold text-[color:var(--color-canyon)]">{fmt(data.renovationBudget)}</span>
                    </div>
                  )}
                  {data.mortgageBalance > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">Mortgage Balance</span>
                      <span className="text-xs font-semibold text-[color:var(--color-charcoal)]">{fmt(data.mortgageBalance)}</span>
                    </div>
                  )}
                  {data.additionSqft > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1">Proposed Addition</span>
                      <span className="text-xs font-semibold text-[color:var(--color-charcoal)]">
                        {fmtNum(data.additionSqft)} sq ft
                        {data.additionBedrooms > 0 ? ` · ${data.additionBedrooms}bd` : ""}
                        {data.additionBathrooms > 0 ? ` · ${data.additionBathrooms}ba` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Client Info ── */}
              {(data.clientName || data.clientEmail || data.clientPhone) && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-canyon)] mb-2 px-0.5">Client</p>
                  <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
                    {data.clientName && (
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <User className="w-3.5 h-3.5 text-[color:var(--color-canyon)] flex-shrink-0" />
                        <span className="text-xs font-semibold text-[color:var(--color-charcoal)]">{data.clientName}</span>
                      </div>
                    )}
                    {data.clientPhone && (
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{data.clientPhone}</span>
                      </div>
                    )}
                    {data.clientEmail && (
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{data.clientEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
