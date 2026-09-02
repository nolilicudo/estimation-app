import { motion } from "framer-motion";
import type { ProductType } from "@/hooks/useConfig";

const PRODUCTS: { id: ProductType; label: string; description: string; icon: string }[] = [
  {
    id: "tanzite",
    label: "Tanzite Stone",
    description: "Premium stone decking",
    icon: "🪨",
  },
  {
    id: "resin-rock",
    label: "Resin Rock",
    description: "Decorative resin stone",
    icon: "💎",
  },
  {
    id: "duradek",
    label: "Duradek / Tiledek",
    description: "Vinyl & tile waterproofing",
    icon: "🛡️",
  },
];

interface ProductToggleProps {
  selected: ProductType;
  onChange: (product: ProductType) => void;
  showDuradek?: boolean;
}

export function ProductToggle({ selected, onChange, showDuradek = true }: ProductToggleProps) {
  const visibleProducts = showDuradek ? PRODUCTS : PRODUCTS.filter((p) => p.id !== "duradek");
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border/60 p-2 sm:p-3">
      <div className={`grid gap-2 sm:gap-3 ${visibleProducts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {visibleProducts.map((product) => {
          const isActive = selected === product.id;
          return (
            <button
              key={product.id}
              onClick={() => onChange(product.id)}
              className={`relative rounded-lg px-3 py-3 sm:px-4 sm:py-4 text-left transition-all duration-200 border-2 ${
                isActive
                  ? "border-canyon bg-canyon/5 shadow-md"
                  : "border-transparent bg-sandstone/30 hover:bg-sandstone/60 hover:border-stone-medium/30"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="product-indicator"
                  className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-canyon"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-xl sm:text-2xl block mb-1">{product.icon}</span>
              <span
                className={`block text-sm sm:text-base font-semibold leading-tight ${
                  isActive ? "text-canyon" : "text-charcoal"
                }`}
              >
                {product.label}
              </span>
              <span className="block text-xs text-muted-foreground font-body mt-0.5 hidden sm:block">
                {product.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
