import { handleStripeWebhook } from "@/lib/payments/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  // Return 200 immediately; webhook processing is synchronous but non-blocking from caller POV
  try {
    await handleStripeWebhook(rawBody, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Stripe webhook error:", message);

    if (message.includes("Invalid Stripe webhook signature")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // Return 200 for all other errors to prevent Stripe from retrying events with application errors
    return NextResponse.json({ received: true, error: message });
  }

  return NextResponse.json({ received: true });
}
