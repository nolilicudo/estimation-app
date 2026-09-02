import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { type ProjectDetailOption } from "@/hooks/useConfig";

interface ProjectDetailsMultiSelectProps {
  options: ProjectDetailOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  className?: string;
}

export function ProjectDetailsMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select project details…",
  className = "",
}: ProjectDetailsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const remove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== id));
  };

  const activeOptions = options.filter((o) => o.isActive === 1);
  const selectedOptions = activeOptions.filter((o) => selected.includes(o.id));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
        className="min-h-[38px] w-full flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canyon/15 text-canyon text-xs font-medium"
            >
              {o.label}
              <button
                type="button"
                onClick={(e) => remove(o.id, e)}
                className="hover:text-canyon/70 transition-colors"
                aria-label={`Remove ${o.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={`ml-auto w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-56 overflow-y-auto">
          {activeOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No options available.</p>
          ) : (
            activeOptions.map((o) => {
              const isSelected = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors ${isSelected ? "font-medium" : ""}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-canyon border-canyon text-white" : "border-border"}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  {o.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
