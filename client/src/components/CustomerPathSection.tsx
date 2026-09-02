/**
 * CustomerPathSection
 * Three-path hero section at the top of the site.
 * Customers choose: Get a Brochure | Book an Appointment | Order Material
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, ShoppingCart, ArrowRight } from "lucide-react";
import { BrochureModal } from "./BrochureModal";
import { AppointmentModal } from "./AppointmentModal";
import { OrderMaterialModal } from "./OrderMaterialModal";
import type { CostBreakdown } from "@/hooks/useCalculator";
import type { SiteConfig } from "@/hooks/useConfig";

interface CustomerPathSectionProps {
  breakdown: CostBreakdown;
  sqft: number;
  productType: string;
  collectionName: string;
  config: SiteConfig;
  // Post-discount totals
  finalTotal: number;
  discountApplied: boolean;
  discountName: string;
  discountValue: number;
  discount2Applied: boolean;
  discount2Name: string;
  discount2Value: number;
}

const paths = [
  {
    id: "brochure",
    icon: BookOpen,
    title: "Get a Brochure",
    subtitle: "Learn about our products",
    description:
      "Receive our full product catalog and design guide delivered straight to your inbox. Perfect if you're still exploring options.",
    cta: "Send Me a Brochure",
    color: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    ctaClass:
      "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    id: "appointment",
    icon: CalendarDays,
    title: "Book an Appointment",
    subtitle: "Get a free on-site quote",
    description:
      "Schedule a time for one of our specialists to visit your property, take measurements, and provide a precise quote.",
    cta: "Schedule a Visit",
    color: "from-stone-50 to-slate-50",
    border: "border-stone-200",
    iconBg: "bg-stone-100",
    iconColor: "text-stone-700",
    ctaClass:
      "bg-stone-700 hover:bg-stone-800 text-white",
  },
  {
    id: "order",
    icon: ShoppingCart,
    title: "Order Material",
    subtitle: "Ready to get started?",
    description:
      "Use your calculator estimate to place your order. Sign the project agreement and pay a 50% deposit to lock in your materials.",
    cta: "Place Your Order",
    color: "from-orange-50 to-red-50",
    border: "border-canyon/30",
    iconBg: "bg-canyon/10",
    iconColor: "text-canyon",
    ctaClass:
      "bg-canyon hover:bg-canyon/90 text-white",
  },
];

export function CustomerPathSection({
  breakdown,
  sqft,
  productType,
  collectionName,
  config,
  finalTotal,
  discountApplied,
  discountName,
  discountValue,
  discount2Applied,
  discount2Name,
  discount2Value,
}: CustomerPathSectionProps) {
  const [activePath, setActivePath] = useState<string | null>(null);

  return (
    <>
      <section className="py-12 bg-gradient-to-b from-warm-cream to-white">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl text-charcoal mb-3">
              How Can We Help You?
            </h2>
            <p className="text-muted-foreground font-body max-w-xl mx-auto">
              Whether you're just exploring or ready to move forward, choose the
              path that fits where you are today.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {paths.map((path, i) => {
              const Icon = path.icon;
              return (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                  className={`rounded-2xl border-2 ${path.border} bg-gradient-to-br ${path.color} p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className={`w-12 h-12 rounded-xl ${path.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${path.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body mb-1">
                      {path.subtitle}
                    </p>
                    <h3 className="text-xl font-semibold text-charcoal mb-2">
                      {path.title}
                    </h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                      {path.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePath(path.id)}
                    className={`mt-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-body font-semibold text-sm transition-all ${path.ctaClass}`}
                  >
                    {path.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modals */}
      <BrochureModal
        open={activePath === "brochure"}
        onClose={() => setActivePath(null)}
      />
      <AppointmentModal
        open={activePath === "appointment"}
        onClose={() => setActivePath(null)}
        bookingUrl={(config as any)?.settings?.decking_appointment_url}
      />
      <OrderMaterialModal
        open={activePath === "order"}
        onClose={() => setActivePath(null)}
        breakdown={breakdown}
        sqft={sqft}
        productType={productType}
        collectionName={collectionName}
        config={config}
        finalTotal={finalTotal}
        discountApplied={discountApplied}
        discountName={discountName}
        discountValue={discountValue}
        discount2Applied={discount2Applied}
        discount2Name={discount2Name}
        discount2Value={discount2Value}
      />
    </>
  );
}
