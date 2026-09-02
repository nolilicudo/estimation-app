import { type Collection, type CollectionInfo } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";
import { Check, Droplets, EyeOff } from "lucide-react";

interface CollectionPickerProps {
  collection: Collection;
  onChange: (collection: Collection) => void;
  collections: CollectionInfo[];
}

export function CollectionPicker({ collection, onChange, collections: cols }: CollectionPickerProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cols.map((col) => {
        const isActive = collection === col.id;
        return (
          <button
            key={col.id}
            onClick={() => onChange(col.id)}
            className={cn(
              "relative text-left rounded-lg border-2 overflow-hidden transition-all duration-200",
              isActive
                ? "border-canyon shadow-md ring-1 ring-canyon/30"
                : "border-border hover:border-stone-medium hover:shadow-sm"
            )}
          >
            {/* Image */}
            <div className="relative h-36 sm:h-44 overflow-hidden">
              <img
                src={col.image}
                alt={col.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
              {isActive && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-canyon flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="text-lg font-body font-semibold text-charcoal mb-1">
                {col.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-3">
                {col.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {col.id === "rainier" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-body font-medium px-2 py-1 rounded bg-blue-50 text-blue-700">
                    <Droplets className="w-3 h-3" /> Waterproof
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-body font-medium px-2 py-1 rounded bg-amber-50 text-amber-700">
                    <EyeOff className="w-3 h-3" /> Hidden Fasteners
                  </span>
                )}
                <span className="text-xs font-body font-medium px-2 py-1 rounded bg-sandstone text-stone-dark">
                  {col.colors.length} Colors
                </span>
                <span className="text-xs font-body font-medium px-2 py-1 rounded bg-sandstone text-stone-dark">
                  From ${Math.min(...col.colors.map((c) => c.pricePerSqft)).toFixed(2)}/sqft
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
