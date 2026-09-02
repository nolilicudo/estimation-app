/**
 * OrderSuccess page
 * Shown after a successful Stripe deposit checkout.
 * Confirms the deposit and explains next steps.
 * NOTE: No navigation back to the calculator — customers should not
 * be able to return to the pricing tool from this confirmation page.
 */
import { useEffect } from "react";
import { CheckCircle, Phone, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function OrderSuccess() {
  const params = new URLSearchParams(window.location.search);
  const orderId = parseInt(params.get("order_id") || "0");
  const sessionId = params.get("session_id") || "";

  const confirmDeposit = trpc.orders.confirmDeposit.useMutation();

  useEffect(() => {
    if (orderId && sessionId) {
      confirmDeposit.mutate({ orderId, sessionId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, sessionId]);

  return (
    <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-3xl font-bold text-charcoal mb-2">Deposit Received!</h1>
          <p className="text-muted-foreground font-body">
            Thank you for your order. Your 50% deposit has been processed and your materials are now reserved.
          </p>
        </div>

        {/* Next steps */}
        <div className="rounded-2xl border bg-white p-6 text-left space-y-3 shadow-sm">
          <h2 className="font-semibold text-charcoal">What Happens Next</h2>
          <ol className="space-y-2 text-sm font-body text-muted-foreground list-decimal list-inside">
            <li>You'll receive a confirmation email with your signed contract and order details.</li>
            <li>Our team will contact you within 1–2 business days to confirm your delivery timeline.</li>
            <li>The remaining 50% balance will be collected upon delivery of your materials.</li>
          </ol>
        </div>

        {/* Contact card — no back-to-calculator link */}
        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-5 text-sm font-body text-amber-800 space-y-2">
          <p className="font-semibold">Questions? We're here to help.</p>
          <p className="flex items-center gap-2 justify-center">
            <Phone className="w-4 h-4 shrink-0" />
            <a href="tel:8017628267" className="hover:underline font-medium">801-762-8267</a>
          </p>
          <p className="flex items-center gap-2 justify-center">
            <Mail className="w-4 h-4 shrink-0" />
            <a href="mailto:tanner@designyourprice.com" className="hover:underline font-medium">tanner@designyourprice.com</a>
          </p>
        </div>

      </div>
    </div>
  );
}
