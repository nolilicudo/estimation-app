/**
 * AppointmentModal
 * Embeds the Go High Level calendar booking widget in a large modal.
 * Shows a loading spinner while the iframe loads, then reveals the calendar.
 * The spinner is dismissed either by the iframe onload event or a 5-second
 * fallback timeout (GHL iframes sometimes suppress the onload event due to
 * cross-origin restrictions).
 */
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Loader2, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { useState as useCopyState } from "react";

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  bookingUrl?: string;
  variant?: "decking" | "design-package";
}

export function AppointmentModal({
  open,
  onClose,
  bookingUrl,
  variant = "decking",
}: AppointmentModalProps) {
  const isDesignPackage = variant === "design-package";
  const DEFAULT_URL =
    "https://api.leadconnectorhq.com/widget/booking/WfipIjVQBk9mvkKjZhTO";
  const resolvedUrl = bookingUrl || DEFAULT_URL;

  const [booked, setBooked] = useState(false);
  // Start as loading; cleared by onload OR a safety timeout
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useCopyState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(resolvedUrl).then(() => {
      setCopied(true);
      toast.success("Booking link copied!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setBooked(false);

      // Safety fallback: GHL iframes often block the onload event cross-origin.
      // After 5 seconds assume the calendar has rendered and hide the spinner.
      fallbackTimerRef.current = setTimeout(() => {
        setLoading(false);
      }, 5000);
    } else {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    }
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [open]);

  // Listen for GHL postMessage booking confirmation
  useEffect(() => {
    if (!open) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const confirmed =
          data?.event === "booking_confirmed" ||
          data?.event === "appointmentBooked" ||
          data?.type === "booking_confirmed" ||
          data?.type === "appointmentBooked" ||
          (typeof data?.url === "string" && data.url.includes("confirmed")) ||
          (typeof data?.url === "string" && data.url.includes("success")) ||
          data?.event === "form_submitted" ||
          data?.type === "form_submitted";
        if (confirmed) setBooked(true);
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/*
        max-w-4xl  → wider modal so the calendar fits without horizontal scroll
        h-[90vh]   → tall enough to show the full date picker + time slots
      */}
      <DialogContent className="max-w-4xl w-full p-0 flex flex-col h-[90vh]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              {booked ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <CalendarDays className="w-5 h-5 text-stone-700" />
              )}
            </div>
            <DialogTitle className="text-xl flex-1">
              {booked
                ? "Appointment Confirmed!"
                : isDesignPackage
                ? "Book a Design Consultation"
                : "Book a Free On-Site Quote"}
            </DialogTitle>
            {!booked && (
              <button
                onClick={handleCopyLink}
                title="Copy booking link"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors shrink-0"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" />Copy Link</>
                )}
              </button>
            )}
          </div>
          <DialogDescription>
            {booked
              ? isDesignPackage
                ? "We look forward to meeting with you. Check your email for a confirmation and calendar invite."
                : "We look forward to seeing you. Check your email for a confirmation and calendar invite."
              : isDesignPackage
              ? "Choose a time that works for you and one of our design specialists will walk through your project with you."
              : "Choose a time that works for you and one of our specialists will come to your property."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ───────────────────────────────────────────────── */}
        {booked ? (
          <div className="flex flex-col items-center justify-center gap-6 px-8 py-12 text-center flex-1">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2 max-w-sm">
              <p className="text-lg font-semibold font-heading text-charcoal">
                You're all set!
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isDesignPackage
                  ? "One of our design specialists will be in touch to confirm your consultation details."
                  : "One of our decking specialists will be in touch to confirm your appointment details."}
              </p>
            </div>
            <Button
              onClick={onClose}
              className="gap-2 bg-canyon hover:bg-canyon/90 text-white font-body"
              size="lg"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            {/* Loading spinner overlay */}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
                <Loader2 className="w-9 h-9 animate-spin text-canyon" />
                <p className="text-sm text-muted-foreground font-body">
                  Loading calendar…
                </p>
              </div>
            )}

            {/* GHL booking iframe — always mounted so it starts loading immediately */}
            <iframe
              ref={iframeRef}
              src={resolvedUrl}
              title="Book an Appointment"
              scrolling="yes"
              onLoad={() => {
                setLoading(false);
                if (fallbackTimerRef.current)
                  clearTimeout(fallbackTimerRef.current);
              }}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                opacity: loading ? 0 : 1,
                transition: "opacity 0.3s ease",
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
