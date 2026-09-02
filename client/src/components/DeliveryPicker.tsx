import { type DeliveryOption } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";
import { Check, Truck, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DeliveryPickerProps {
  options: DeliveryOption[];
  selectedOption: string;
  onChange: (optionId: string) => void;
  includePermit: boolean;
  onPermitChange: (v: boolean) => void;
  /** When true, permit is required because framing is selected — toggle is locked on */
  framingActive?: boolean;
}

export function DeliveryPicker({
  options,
  selectedOption,
  onChange,
  includePermit,
  onPermitChange,
  framingActive = false,
}: DeliveryPickerProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {options.map((opt) => {
          const isActive = opt.id === selectedOption;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-md border-2 transition-all duration-200 flex items-center gap-3",
                isActive
                  ? "border-canyon bg-canyon/5"
                  : "border-border hover:border-stone-medium"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isActive ? "bg-canyon" : "bg-sandstone"
                )}
              >
                {isActive ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Truck className="w-4 h-4 text-stone-dark" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-body font-semibold text-charcoal text-sm">
                    {opt.name}
                  </p>
                  <p className="font-body font-semibold text-charcoal text-sm">
                    {opt.price > 0 ? `$${opt.price.toFixed(0)}` : "Free"}
                  </p>
                </div>
                <p className="font-body text-muted-foreground text-xs mt-0.5">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permit option */}
      <div className={cn(
        "border-t border-border/40 pt-4",
        framingActive && "rounded-md border border-canyon/30 bg-canyon/5 px-4 py-3 mt-2"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-body font-semibold text-charcoal text-sm flex items-center gap-1.5">
              Include Building Permit Assistance
              {framingActive && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-canyon bg-canyon/10 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Required for framing
                </span>
              )}
            </p>
            <p className="font-body text-muted-foreground text-xs mt-0.5">
              {framingActive
                ? "Automatically included — structural framing requires a building permit."
                : "We handle the permit application process for your project ($250)"}
            </p>
          </div>
          <Switch
            checked={includePermit}
            onCheckedChange={framingActive ? undefined : onPermitChange}
            disabled={framingActive}
            className={framingActive ? "opacity-100 cursor-not-allowed" : ""}
          />
        </div>
      </div>
    </div>
  );
}
