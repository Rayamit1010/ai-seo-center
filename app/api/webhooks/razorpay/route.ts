import { handleRazorpayWebhook } from "@/lib/payments/razorpay";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  try {
    await handleRazorpayWebhook(rawBody, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Razorpay webhook error:", message);

    if (message.includes("Invalid Razorpay webhook signature")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ received: true, error: message });
  }

  return NextResponse.json({ received: true });
}
