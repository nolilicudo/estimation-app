/**
 * Stripe helpers for Design Your Price
 * Handles 50% deposit checkout sessions and balance payment sessions.
 */
import Stripe from "stripe";
import { ENV } from "./_core/env";

export function getStripe(): Stripe {
  if (!ENV.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-02-25.clover" });
}

export interface CreateDepositSessionParams {
  orderId: number;
  customerName: string;
  customerEmail: string;
  productDescription: string;
  depositAmountCents: number; // 50% of grand total in cents
  balanceAmountCents: number; // remaining 50% in cents
  origin: string; // frontend origin for redirect URLs
}

/**
 * Creates a Stripe Checkout Session for the 50% deposit.
 * Returns the session URL to redirect the customer to.
 */
export async function createDepositCheckoutSession(
  params: CreateDepositSessionParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.customerEmail,
    client_reference_id: params.orderId.toString(),
    metadata: {
      order_id: params.orderId.toString(),
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      payment_type: "deposit",
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${params.productDescription} -- 50% Deposit`,
            description:
              "50% deposit required to begin your order. The remaining balance will be collected upon delivery.",
          },
          unit_amount: params.depositAmountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}`,
    cancel_url: `${params.origin}?order_cancelled=1`,
    allow_promotion_codes: true,
  });

  return { url: session.url!, sessionId: session.id };
}

/**
 * Creates a Stripe Checkout Session for the remaining 50% balance (triggered by admin).
 */
export async function createBalanceCheckoutSession(params: {
  orderId: number;
  customerName: string;
  customerEmail: string;
  productDescription: string;
  balanceAmountCents: number;
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.customerEmail,
    client_reference_id: params.orderId.toString(),
    metadata: {
      order_id: params.orderId.toString(),
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      payment_type: "balance",
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${params.productDescription} -- Remaining Balance`,
            description: "Final balance payment due upon delivery of your order.",
          },
          unit_amount: params.balanceAmountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}&payment=balance`,
    cancel_url: `${params.origin}?balance_cancelled=1`,
  });

  return { url: session.url!, sessionId: session.id };
}
