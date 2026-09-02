import { type LaborTier } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";
import { Check, Wrench } from "lucide-react";

interface LaborPickerProps {
  tiers: LaborTier[];
  selectedTier: string;
  onChange: (tierId: string) => void;
}

export function LaborPicker({ tiers, selectedTier, onChange }: LaborPickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-body text-muted-foreground mb-1">
        Select the level of professional installation you need, or choose materials only for a DIY project.
      </p>
      {tiers.map((tier) => {
        const isActive = tier.id === selectedTier;
        return (
          <button
            key={tier.id}
            onClick={() => onChange(tier.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-md border-2 transition-all duration-200 flex items-center gap-3",
              isActive
                ? "border-canyon bg-canyon/5"
                : "border-border hover:border-stone-medium"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isActive ? "bg-canyon" : "bg-sandstone"
            )}>
              {isActive ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Wrench className="w-4 h-4 text-stone-dark" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-body font-semibold text-charcoal text-sm">
                  {tier.name}
                </p>
                <p className="font-body font-semibold text-charcoal text-sm">
                  {tier.pricePerSqft > 0 ? `$${tier.pricePerSqft.toFixed(2)}/ft²` : "—"}
                </p>
              </div>
              <p className="font-body text-muted-foreground text-xs mt-0.5">
                {tier.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
