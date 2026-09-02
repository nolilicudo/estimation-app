/**
 * A Steel Jacket — Under-Deck Waterproof System
 * Steel panel waterproofing for the Appalachian collection.
 * Includes CMG Metals color picker and photo gallery.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronDown, ChevronUp, X, ZoomIn } from "lucide-react";
import { useState } from "react";
import type { SteelJacketOption } from "@/hooks/useConfig";
import type { CalculatorState } from "@/hooks/useCalculator";

interface SteelJacketSectionProps {
  state: CalculatorState;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  steelJacketOptions: SteelJacketOption[];
  steelJacketSubtotal: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// CMG Metals standard color palette
const CMG_COLORS = [
  // Dark / Neutral
  { name: "Deep Black", hex: "#1a1a1a" },
  { name: "Matte Black", hex: "#2b2b2b" },
  { name: "Charcoal Gray", hex: "#4a4a4a" },
  { name: "Musket Gray", hex: "#5c5c5c" },
  { name: "Slate Gray", hex: "#6b7280" },
  { name: "Weathered Zinc", hex: "#8a9090" },
  { name: "Silver", hex: "#a8a8a8" },
  { name: "Cityscape", hex: "#7a7a80" },
  { name: "Ash Gray", hex: "#9a9a9a" },
  // Bronze / Brown
  { name: "Extra Dark Bronze", hex: "#3b2a1a" },
  { name: "Dark Bronze", hex: "#4a3520" },
  { name: "Burnished Slate", hex: "#5a5048" },
  { name: "Medium Bronze", hex: "#6b4f2e" },
  { name: "Mansard Brown", hex: "#7a5c3a" },
  { name: "Copper Penny", hex: "#b87333" },
  // Red / Burgundy
  { name: "Burgundy", hex: "#6b1a1a" },
  { name: "Colonial Red", hex: "#8b2020" },
  { name: "Regal Red", hex: "#a02020" },
  { name: "Terra Cotta", hex: "#b05030" },
  // Green / Teal
  { name: "Hartford Green", hex: "#2d4a2d" },
  { name: "Classic Green", hex: "#3a5c3a" },
  { name: "Teal", hex: "#2d6b6b" },
  { name: "Hemlock Green", hex: "#4a6b4a" },
  { name: "Aged Copper", hex: "#6b9b8b" },
  // Blue
  { name: "Royal Blue", hex: "#1a3a6b" },
  { name: "Slate Blue", hex: "#4a5a7a" },
  // Tan / White / Cream
  { name: "Pebble Clay", hex: "#b0a898" },
  { name: "Sandstone", hex: "#c8b898" },
  { name: "Almond", hex: "#d4c8a8" },
  { name: "Stone White", hex: "#e8e4d8" },
  { name: "Bone White", hex: "#f0ece0" },
  { name: "Bright White", hex: "#f8f8f8" },
  { name: "Sierra Tan", hex: "#c8a878" },
  { name: "Antique Ivory", hex: "#e8d8b0" },
  { name: "Champagne", hex: "#e8d8b8" },
  // Natural Materials
  { name: "Dark Walnut", hex: "#3a2a18" },
  { name: "Chestnut", hex: "#6b3a20" },
  { name: "White Oak", hex: "#c8b888" },
  { name: "Driftwood Gray", hex: "#8a8880" },
  { name: "Rustic Rawhide", hex: "#b89868" },
  { name: "Western Rust", hex: "#8b4a28" },
  { name: "Black Ore", hex: "#2a2828" },
];

// Fallback gallery photos (CDN URLs from upload)
const FALLBACK_PHOTOS = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_01_underside_ceiling_51e76e8f.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_02_underside_wide_61591a06.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_03_exterior_white_de14ac68.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_04_exterior_mountain_view_58290df3.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_05_silver_panels_mountain_82b80726.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_06_silver_panels_valley_view_f95e71cd.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_07_gray_panels_hot_tub_07670699.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_08_white_panels_installation_38d6eb18.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_09_tan_panels_exterior_rocks_2f4bac34.jpeg",
];

const PHOTO_LABELS = [
  "Underside ceiling view",
  "Wide underside view",
  "White exterior panels",
  "Mountain view installation",
  "Silver panels, mountain backdrop",
  "Silver panels, valley view",
  "Gray panels with hot tub",
  "White panels installation",
  "Tan panels, rock landscape",
];

export function SteelJacketSection({
  state,
  updateField,
  steelJacketOptions,
  steelJacketSubtotal,
}: SteelJacketSectionProps) {
  const [costExpanded, setCostExpanded] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const selectedOption = steelJacketOptions.find(o => o.id === state.steelJacketOptionId) ?? steelJacketOptions[0];

  // Use photos from the selected option, or fall back to the CDN photos
  const galleryPhotos = selectedOption?.photoUrls?.length
    ? selectedOption.photoUrls
    : FALLBACK_PHOTOS;

  const handleToggle = (enabled: boolean) => {
    updateField("steelJacketEnabled", enabled);
    if (enabled && steelJacketOptions.length > 0 && state.steelJacketOptionId === null) {
      updateField("steelJacketOptionId", steelJacketOptions[0].id);
    }
  };

  const handleSelectPhoto = (url: string) => {
    updateField("steelJacketSelectedPhotoUrl", url);
  };

  const selectedColor = (state as any).steelJacketColor as string | undefined;
  const handleSelectColor = (colorName: string) => {
    updateField("steelJacketColor" as any, colorName);
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-charcoal">A Steel Jacket</h3>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                Steel Panel System
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Corrugated steel under-deck waterproofing panels
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.steelJacketEnabled && (
            <span className="text-sm font-semibold text-slate-700">
              +{formatCurrency(steelJacketSubtotal)}
            </span>
          )}
          <Switch
            id="steel-jacket-toggle"
            checked={state.steelJacketEnabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {/* Expanded content */}
      {state.steelJacketEnabled && (
        <div className="px-5 py-5 space-y-5">
          {/* Option selection (if multiple options) */}
          {steelJacketOptions.length > 1 && (
            <div>
              <Label className="text-sm font-medium text-charcoal mb-2 block">
                Select Package
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {steelJacketOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateField("steelJacketOptionId", opt.id)}
                    className={`text-left p-3 rounded-md border transition-all ${
                      state.steelJacketOptionId === opt.id
                        ? "border-slate-400 bg-slate-50 ring-1 ring-slate-300"
                        : "border-border bg-white hover:border-slate-200 hover:bg-slate-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal leading-tight">{opt.name}</p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed line-clamp-2">
                          {opt.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-charcoal">${opt.pricePerSqft.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">/sqft</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single option info */}
          {steelJacketOptions.length === 1 && selectedOption && (
            <div className="bg-white rounded-md border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-charcoal text-sm">{selectedOption.name}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">
                    {selectedOption.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-sm font-semibold text-charcoal">
                    ${selectedOption.pricePerSqft.toFixed(2)}/sqft
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CMG Metals Color Picker */}
          <div>
            <Label className="text-sm font-medium text-charcoal mb-1 block">
              Panel Color
              <span className="text-xs text-muted-foreground font-normal ml-2">
                CMG Metals — {CMG_COLORS.length} colors available
              </span>
            </Label>
            {selectedColor && (
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                  style={{ backgroundColor: CMG_COLORS.find(c => c.name === selectedColor)?.hex ?? "#888" }}
                />
                <span className="text-sm font-medium text-charcoal">{selectedColor}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 py-1">
              {CMG_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  title={color.name}
                  onClick={() => handleSelectColor(color.name)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                    selectedColor === color.name
                      ? "border-slate-700 ring-2 ring-slate-400 ring-offset-1 scale-110"
                      : "border-white shadow-sm hover:border-slate-300"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  aria-label={color.name}
                  aria-pressed={selectedColor === color.name}
                />
              ))}
            </div>
            {!selectedColor && (
              <p className="text-xs text-amber-600 mt-1.5 font-body">Select a panel color for your estimate</p>
            )}
          </div>

          {/* Photo Gallery */}
          <div>
            <Label className="text-sm font-medium text-charcoal mb-2 block">
              Example Installations
              <span className="text-xs text-muted-foreground font-normal ml-2">
                Click a photo to select it for your estimate
              </span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((url, idx) => (
                <div key={url} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleSelectPhoto(url)}
                    className={`w-full aspect-video rounded-md overflow-hidden border-2 transition-all ${
                      state.steelJacketSelectedPhotoUrl === url
                        ? "border-slate-500 ring-2 ring-slate-300"
                        : "border-transparent hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={url}
                      alt={PHOTO_LABELS[idx] ?? `Steel Jacket photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {state.steelJacketSelectedPhotoUrl === url && (
                      <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
                        <div className="bg-white rounded-full p-1">
                          <Shield className="w-3 h-3 text-slate-700" />
                        </div>
                      </div>
                    )}
                  </button>
                  {/* Zoom button */}
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(url)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View full size"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {state.steelJacketSelectedPhotoUrl && (
              <p className="text-xs text-slate-600 mt-2 font-body">
                ✓ Photo selected — will appear in your estimate
              </p>
            )}
          </div>

          {/* Cost breakdown toggle */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setCostExpanded(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              {costExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {costExpanded ? "Hide" : "Show"} cost breakdown
            </button>

            {costExpanded && selectedOption && (
              <div className="mt-3 bg-white rounded-md border border-slate-100 divide-y divide-slate-50">
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground font-body">
                    A Steel Jacket ({state.totalSqft} sqft × ${selectedOption.pricePerSqft.toFixed(2)}/sqft)
                  </span>
                  <span className="font-medium text-charcoal">{formatCurrency(steelJacketSubtotal)}</span>
                </div>
                <div className="flex justify-between px-3 py-2.5 text-sm font-semibold bg-slate-50">
                  <span className="text-charcoal">Steel Jacket Total</span>
                  <span className="text-slate-700">{formatCurrency(steelJacketSubtotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxPhoto}
              alt="A Steel Jacket installation"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
