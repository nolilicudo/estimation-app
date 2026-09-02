import { type EdgeOption } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";
import { Check, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

interface EdgeOptionsProps {
  edges: EdgeOption[];
  selectedEdge: string;
  onChange: (edgeId: string) => void;
}

export function EdgeOptions({ edges, selectedEdge, onChange }: EdgeOptionsProps) {
  // Auto-select if there's only one edge option
  useEffect(() => {
    if (edges.length === 1 && selectedEdge !== edges[0].id) {
      onChange(edges[0].id);
    }
  }, [edges, selectedEdge, onChange]);

  // Single option — show a clean confirmation card instead of a selectable list
  if (edges.length === 1) {
    const edge = edges[0];
    return (
      <div className="px-4 py-4 rounded-md border-2 border-canyon bg-canyon/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-canyon flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-body font-semibold text-charcoal text-sm">
              {edge.name}
            </p>
            <p className="font-body text-muted-foreground text-xs mt-0.5">
              {edge.pricePerLinearFt > 0
                ? `$${edge.pricePerLinearFt.toFixed(2)} per linear foot — included in your estimate`
                : "Included at no additional cost"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Multiple options — show selectable list
  return (
    <div className="space-y-3">
      {edges.map((edge) => {
        const isActive = edge.id === selectedEdge;
        return (
          <button
            key={edge.id}
            onClick={() => onChange(edge.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-md border-2 transition-all duration-200 flex items-center justify-between",
              isActive
                ? "border-canyon bg-canyon/5"
                : "border-border hover:border-stone-medium"
            )}
          >
            <div>
              <p className="font-body font-semibold text-charcoal text-sm">
                {edge.name}
              </p>
              <p className="font-body text-muted-foreground text-xs mt-0.5">
                {edge.pricePerLinearFt > 0
                  ? `$${edge.pricePerLinearFt.toFixed(2)} per linear foot`
                  : "No additional cost"}
              </p>
            </div>
            {isActive && (
              <div className="w-6 h-6 rounded-full bg-canyon flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
