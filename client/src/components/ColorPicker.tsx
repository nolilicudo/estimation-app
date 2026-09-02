import { type ColorOption } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";
import { Check, HelpCircle } from "lucide-react";

export const COLOR_TBD_ID = "__tbd__";

interface ColorPickerProps {
  colors: ColorOption[];
  selectedColor: string;
  onChange: (colorId: string) => void;
}

export function ColorPicker({ colors, selectedColor, onChange }: ColorPickerProps) {
  const isTbd = selectedColor === COLOR_TBD_ID;
  const active = isTbd ? null : (colors.find((c) => c.id === selectedColor) ?? colors[0]);

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {colors.map((color) => {
          const isActive = color.id === selectedColor;
          return (
            <button
              key={color.id}
              onClick={() => onChange(color.id)}
              className={cn(
                "group relative rounded-lg border-2 p-2 transition-all duration-200",
                isActive
                  ? "border-canyon shadow-md"
                  : "border-border hover:border-stone-medium hover:shadow-sm"
              )}
            >
              {/* Color swatch */}
              <div
                className="w-full aspect-square rounded-md mb-2 relative overflow-hidden"
                style={{ backgroundColor: color.hex }}
              >
                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-gradient-to-br from-white/30 via-transparent to-black/20" />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                      <Check className="w-4 h-4 text-canyon" />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs font-body font-medium text-charcoal text-center leading-tight">
                {color.name}
              </p>
              <p className="text-xs font-body text-muted-foreground text-center">
                ${color.pricePerSqft.toFixed(2)}/ft²
              </p>
            </button>
          );
        })}

        {/* Color To Be Determined option */}
        <button
          onClick={() => onChange(COLOR_TBD_ID)}
          className={cn(
            "group relative rounded-lg border-2 p-2 transition-all duration-200",
            isTbd
              ? "border-amber-500 shadow-md bg-amber-50"
              : "border-dashed border-border hover:border-amber-400 hover:bg-amber-50/40"
          )}
        >
          <div className="w-full aspect-square rounded-md mb-2 relative overflow-hidden bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
            <HelpCircle className={cn("w-6 h-6", isTbd ? "text-amber-600" : "text-stone-400")} />
            {isTbd && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                  <Check className="w-4 h-4 text-amber-600" />
                </div>
              </div>
            )}
          </div>
          <p className={cn("text-xs font-body font-medium text-center leading-tight", isTbd ? "text-amber-700" : "text-charcoal")}>
            Color TBD
          </p>
          <p className="text-xs font-body text-muted-foreground text-center">Pending</p>
        </button>
      </div>

      {/* Selected color detail */}
      {isTbd ? (
        <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md shrink-0 border border-amber-300 bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-body font-semibold text-amber-800 text-sm">Color To Be Determined</p>
            <p className="font-body text-amber-700 text-xs">
              Estimate is preliminary — priced using the collection average. Confirm color before finalizing.
            </p>
          </div>
        </div>
      ) : active ? (
        <div className="mt-4 p-3 rounded-md bg-sandstone/50 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-md shrink-0 border border-border"
            style={{ backgroundColor: active.hex }}
          />
          <div>
            <p className="font-body font-semibold text-charcoal text-sm">{active.name}</p>
            <p className="font-body text-muted-foreground text-sm">${active.pricePerSqft.toFixed(2)} per square foot</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
