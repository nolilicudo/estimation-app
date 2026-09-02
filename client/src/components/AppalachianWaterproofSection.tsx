/**
 * Appalachian Waterproof Add-on
 * Trex RainEscape under-deck drainage system with concealed gutter + optional soffit material.
 * Only shown when the Appalachian collection is selected.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Droplets, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { RainEscapeOption, SoffitMaterial } from "@/hooks/useConfig";
import type { CalculatorState } from "@/hooks/useCalculator";

interface AppalachianWaterproofSectionProps {
  state: CalculatorState;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  rainEscapeOptions: RainEscapeOption[];
  soffitMaterials: SoffitMaterial[];
  rainEscapeSubtotal: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function AppalachianWaterproofSection({
  state,
  updateField,
  rainEscapeOptions,
  soffitMaterials,
  rainEscapeSubtotal,
}: AppalachianWaterproofSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const selectedOption = rainEscapeOptions.find(r => r.id === state.rainEscapeOptionId) ?? rainEscapeOptions[0];
  const selectedSoffit = soffitMaterials.find(s => s.id === state.soffitMaterialId) ?? soffitMaterials[0];

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/40">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-600">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-charcoal">Waterproof Under-Deck System</h3>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                Appalachian Only
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Trex RainEscape drainage + concealed gutter + optional soffit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.rainEscapeEnabled && (
            <span className="text-sm font-semibold text-blue-700">
              +{formatCurrency(rainEscapeSubtotal)}
            </span>
          )}
          <Switch
            id="rain-escape-toggle"
            checked={state.rainEscapeEnabled}
            onCheckedChange={(v) => updateField("rainEscapeEnabled", v)}
          />
        </div>
      </div>

      {/* Expanded content */}
      {state.rainEscapeEnabled && (
        <div className="px-5 py-5 space-y-5">
          {/* System info */}
          {selectedOption && (
            <div className="bg-white rounded-md border border-blue-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-charcoal text-sm">{selectedOption.name}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                    {selectedOption.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">System</p>
                  <p className="text-sm font-semibold text-charcoal">
                    ${selectedOption.systemPricePerSqft.toFixed(2)}/sqft
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Labor</p>
                  <p className="text-sm font-semibold text-charcoal">
                    ${selectedOption.laborPricePerSqft.toFixed(2)}/sqft
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Gutter linear footage */}
          <div>
            <Label htmlFor="gutter-linear-ft" className="text-sm font-medium text-charcoal mb-1.5 block">
              Concealed Gutter — Linear Footage
            </Label>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                id="gutter-linear-ft"
                type="number"
                min={0}
                step={1}
                value={state.rainEscapeGutterLinearFt}
                onChange={(e) => updateField("rainEscapeGutterLinearFt", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-28 text-center"
              />
              <span className="text-sm text-muted-foreground font-body">linear feet</span>
              {selectedOption && (
                <span className="text-sm text-muted-foreground font-body">
                  = {formatCurrency(selectedOption.gutterPricePerLinearFt * state.rainEscapeGutterLinearFt)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Measure the perimeter edge where gutter channels will be installed.
            </p>
          </div>

          {/* Soffit toggle */}
          <div className="border-t border-blue-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label htmlFor="soffit-toggle" className="text-sm font-medium text-charcoal">
                  Add Soffit Material
                </Label>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  Finish the underside of the deck with a soffit material
                </p>
              </div>
              <Switch
                id="soffit-toggle"
                checked={state.soffitEnabled}
                onCheckedChange={(v) => updateField("soffitEnabled", v)}
              />
            </div>

            {state.soffitEnabled && (
              <div className="space-y-4 mt-3">
                {/* Soffit material selection */}
                <div>
                  <Label className="text-sm font-medium text-charcoal mb-2 block">
                    Soffit Material
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {soffitMaterials.map((soffit) => (
                      <button
                        key={soffit.id}
                        type="button"
                        onClick={() => updateField("soffitMaterialId", soffit.id)}
                        className={`text-left p-3 rounded-md border transition-all ${
                          state.soffitMaterialId === soffit.id
                            ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                            : "border-border bg-white hover:border-blue-200 hover:bg-blue-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-charcoal leading-tight">{soffit.name}</p>
                            <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed line-clamp-2">
                              {soffit.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-charcoal">${soffit.pricePerSqft.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">mat/sqft</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soffit sqft */}
                <div>
                  <Label htmlFor="soffit-sqft" className="text-sm font-medium text-charcoal mb-1.5 block">
                    Soffit Area (sqft)
                  </Label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input
                      id="soffit-sqft"
                      type="number"
                      min={0}
                      step={1}
                      value={state.soffitSqft}
                      onChange={(e) => updateField("soffitSqft", Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 text-center"
                    />
                    <span className="text-sm text-muted-foreground font-body">sqft</span>
                    {selectedSoffit && (
                      <span className="text-sm text-muted-foreground font-body">
                        = {formatCurrency((selectedSoffit.pricePerSqft + selectedSoffit.laborPricePerSqft) * state.soffitSqft)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cost breakdown toggle */}
          <div className="border-t border-blue-100 pt-3">
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"} cost breakdown
            </button>

            {expanded && selectedOption && (
              <div className="mt-3 bg-white rounded-md border border-blue-100 divide-y divide-blue-50">
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground font-body">RainEscape System ({state.totalSqft} sqft)</span>
                  <span className="font-medium text-charcoal">{formatCurrency(selectedOption.systemPricePerSqft * state.totalSqft)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground font-body">Concealed Gutter ({state.rainEscapeGutterLinearFt} LF)</span>
                  <span className="font-medium text-charcoal">{formatCurrency(selectedOption.gutterPricePerLinearFt * state.rainEscapeGutterLinearFt)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground font-body">Installation Labor ({state.totalSqft} sqft)</span>
                  <span className="font-medium text-charcoal">{formatCurrency(selectedOption.laborPricePerSqft * state.totalSqft)}</span>
                </div>
                {state.soffitEnabled && selectedSoffit && (
                  <>
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground font-body">Soffit Material: {selectedSoffit.name} ({state.soffitSqft} sqft)</span>
                      <span className="font-medium text-charcoal">{formatCurrency(selectedSoffit.pricePerSqft * state.soffitSqft)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground font-body">Soffit Labor ({state.soffitSqft} sqft)</span>
                      <span className="font-medium text-charcoal">{formatCurrency(selectedSoffit.laborPricePerSqft * state.soffitSqft)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between px-3 py-2.5 text-sm font-semibold bg-blue-50">
                  <span className="text-charcoal">Waterproof Add-on Total</span>
                  <span className="text-blue-700">{formatCurrency(rainEscapeSubtotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
