/**
 * DesignPackageSection — calculator UI for design package pricing
 *
 * Shows a toggle to enable the design package, a project type selector,
 * sqft input (for addition / full home remodel), rendering counts
 * (for kitchen & bathroom), and a live line-item preview.
 */
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { DesignPackageItem } from "@/hooks/useConfig";

interface DesignPackageSectionProps {
  enabled: boolean;
  projectType: string;
  sqft: number;
  smallBathroomCount: number;
  largeBathroomCount: number;
  kitchenCount: number;
  exteriorCount: number;
  itemOverrides: Record<number, boolean>;
  designPackageItems: DesignPackageItem[];
  // Computed line items from the pricing engine
  lineItems: { id: number; name: string; cost: number; sellPrice: number; quantity: number; pricingType: string }[];
  totalCost: number;
  onToggle: (v: boolean) => void;
  onProjectTypeChange: (v: string) => void;
  onSqftChange: (v: number) => void;
  onSmallBathroomChange: (v: number) => void;
  onLargeBathroomChange: (v: number) => void;
  onKitchenChange: (v: number) => void;
  onExteriorChange: (v: number) => void;
  onItemOverrideChange: (id: number, active: boolean) => void;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  addition: "Addition",
  full_home_remodel: "Full Home Remodel",
  kitchen: "Kitchen Remodel",
  bathroom: "Bathroom Remodel",
};

const SQFT_BASED_TYPES = ["addition", "full_home_remodel"];
const RENDERING_BASED_TYPES = ["kitchen", "bathroom"];

export function DesignPackageSection({
  enabled,
  projectType,
  sqft,
  smallBathroomCount,
  largeBathroomCount,
  kitchenCount,
  exteriorCount,
  itemOverrides,
  designPackageItems,
  lineItems,
  totalCost,
  onToggle,
  onProjectTypeChange,
  onSqftChange,
  onSmallBathroomChange,
  onLargeBathroomChange,
  onKitchenChange,
  onExteriorChange,
  onItemOverrideChange,
}: DesignPackageSectionProps) {
  const isSqftBased = SQFT_BASED_TYPES.includes(projectType);
  const isRenderingBased = RENDERING_BASED_TYPES.includes(projectType);

  // Items applicable to this project type (for override display)
  const applicableItems = designPackageItems.filter(item => {
    if (!item.isActive) return false;
    const types = item.projectTypes.split(",").map(t => t.trim());
    return types.includes("all") || types.includes(projectType);
  });

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-charcoal">Include Design Package</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Architectural, engineering, renderings &amp; schematics
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled && (
        <div className="space-y-4 pt-1">
          {/* Project type */}
          <div>
            <Label className="text-xs font-medium text-charcoal mb-1.5 block">Project Type</Label>
            <Select value={projectType} onValueChange={onProjectTypeChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sqft input (additions & full home remodels) */}
          {isSqftBased && (
            <div>
              <Label className="text-xs font-medium text-charcoal mb-1.5 block">
                Project Square Footage
              </Label>
              <Input
                type="number"
                min={0}
                value={sqft || ""}
                onChange={e => onSqftChange(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 1500"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Used to calculate per-sqft items (architectural &amp; structural engineering)
              </p>
            </div>
          )}

          {/* Rendering counts (kitchen & bathroom remodels) */}
          {isRenderingBased && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-charcoal">3D Rendering Areas</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Small Bathrooms</Label>
                  <Input
                    type="number"
                    min={0}
                    value={smallBathroomCount || ""}
                    onChange={e => onSmallBathroomChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Large Bathrooms</Label>
                  <Input
                    type="number"
                    min={0}
                    value={largeBathroomCount || ""}
                    onChange={e => onLargeBathroomChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Kitchens</Label>
                  <Input
                    type="number"
                    min={0}
                    value={kitchenCount || ""}
                    onChange={e => onKitchenChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">Exterior Areas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={exteriorCount || ""}
                    onChange={e => onExteriorChange(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Per-item toggles */}
          {applicableItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-charcoal">Included Services</p>
              <div className="space-y-1.5">
                {applicableItems.map(item => {
                  const isOn = item.id in itemOverrides ? itemOverrides[item.id] : true;
                  const lineItem = lineItems.find(li => li.id === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-warm-cream/60 border border-border/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Switch
                          checked={isOn}
                          onCheckedChange={v => onItemOverrideChange(item.id, v)}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-charcoal truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isOn && lineItem ? (
                          <span className="text-xs font-semibold text-canyon">
                            ${lineItem.sellPrice.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Off</Badge>
                        )}
                        {item.pricingType === "sqft" && (
                          <p className="text-[10px] text-muted-foreground">
                            ${(item.costPerSqft * (1 + item.markupPct / 100)).toFixed(4)}/sqft
                          </p>
                        )}
                        {item.pricingType === "flat" && (
                          <p className="text-[10px] text-muted-foreground">
                            flat ${(item.flatCost * (1 + item.markupPct / 100)).toFixed(0)}
                          </p>
                        )}
                        {item.pricingType === "rendering" && (
                          <p className="text-[10px] text-muted-foreground">
                            ${(item.flatCost * (1 + item.markupPct / 100)).toFixed(0)}/ea
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total */}
          {lineItems.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm font-semibold text-charcoal">Design Package Total</span>
              <span className="text-base font-bold text-canyon">
                ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {lineItems.length === 0 && enabled && (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              No applicable design package items for this project type.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
