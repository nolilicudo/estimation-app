/**
 * AvailabilityCalendar — shows upcoming install slots to create urgency during in-home sales.
 * Fetches available slots from the server (admin-configurable).
 * Shown in the calculator below the labor picker.
 */

import { trpc } from "@/lib/trpc";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function AvailabilityCalendar() {
  const { data: slots, isLoading } = trpc.installSlots.getAvailable.useQuery();

  if (isLoading) return null;
  if (!slots || slots.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <CalendarDays className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-charcoal leading-tight">
            Available Install Dates
          </h3>
          <p className="text-xs text-amber-700/80 font-body mt-0.5">
            Reserve your spot — slots fill quickly
          </p>
        </div>
      </div>

      {/* Slots grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {slots.map((slot, idx) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
            className="flex items-center gap-3 rounded-lg bg-white/80 border border-amber-200/50 px-3.5 py-2.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal leading-tight truncate">
                {slot.label}
              </p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                {formatDateRange(slot.startDate, slot.endDate)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Urgency footer */}
      <div className="mt-4 flex items-center gap-2 text-xs text-amber-800/70 font-body">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Sign your contract today to hold your preferred start date.
        </span>
      </div>
    </motion.div>
  );
}

function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = start.toLocaleDateString("en-US", opts);
    const endStr = end.toLocaleDateString("en-US", opts);
    if (startStr === endStr) return startStr;
    return `${startStr} – ${endStr}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}
