import { handlePayPalWebhook } from "@/lib/payments/paypal";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const rawBody = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    await handlePayPalWebhook(rawBody, headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("PayPal webhook error:", message);

    if (message.includes("Invalid PayPal webhook signature")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ received: true, error: message });
  }

  return NextResponse.json({ received: true });
}
